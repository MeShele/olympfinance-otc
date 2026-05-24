import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeInvoke";
import { mergePaymentIntoNotes } from "./orderUtils";
import { extractPaymentMethod } from "@/utils/orderNotes";

interface SellOrderParams {
  userId: string;
  operatorId: string;
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  walletAddress: string;
  contactInfo: string;
  notes?: string;
  feeAmount: number;
  network: string;
  amountKgs: number;
  expiresAt: string;
}

export async function executeSellOrder(params: SellOrderParams & { hasAcquiringModule?: boolean }) {
  // Fetch manual wallet config (always needed for fallback)
  const { data: companySettings } = await supabase
    .from('company_settings')
    .select('manual_wallet_address')
    .eq('operator_id', params.operatorId)
    .limit(1)
    .maybeSingle();

  // Use module system for acquiring check, fallback to manual
  const acquiringEnabled = params.hasAcquiringModule ?? false;

  const { data: pendingPayment, error: pendingError } = await supabase
    .from('pending_payments')
    .insert({
      user_id: params.userId,
      operator_id: params.operatorId,
      from_amount: params.fromAmount,
      from_currency: params.fromCurrency,
      to_amount: params.toAmount,
      to_currency: params.toCurrency,
      rate: params.rate,
      wallet_address: params.walletAddress,
      contact_info: params.contactInfo,
      payment_id: crypto.randomUUID(),
      status: 'pending',
      network: params.network,
    })
    .select()
    .single();

  if (pendingError) throw pendingError;

  if (!acquiringEnabled) {
    return executeManualSell(params, companySettings, pendingPayment);
  }

  return executeAcquiringSell(params, pendingPayment);
}

async function executeManualSell(
  params: SellOrderParams,
  companySettings: any,
  pendingPayment: any,
) {
  let walletAddress = '';
  let qrUrl: string | undefined;
  try {
    const wallets = JSON.parse(companySettings?.manual_wallet_address || '[]');
    const match = wallets.find((w: { network: string; address: string; qr_url?: string }) =>
      w.network.toUpperCase() === params.network.toUpperCase()
    );
    const chosen = match || (wallets.length > 0 ? wallets[0] : null);
    walletAddress = chosen?.address || '';
    qrUrl = chosen?.qr_url || undefined;
  } catch {
    walletAddress = '';
  }

  if (!walletAddress) {
    await supabase.from('pending_payments').delete().eq('id', pendingPayment.id);
    throw new Error('Кошелёк для приёма платежей не настроен. Обратитесь к оператору.');
  }

  // Update status to awaiting_payment
  await supabase
    .from('pending_payments')
    .update({ status: 'awaiting_payment' })
    .eq('id', pendingPayment.id);

  const paymentData = {
    type: 'crypto' as const,
    wallet_address: walletAddress,
    network: params.network,
    qr_url: qrUrl,
    amount: params.fromAmount,
    currency: params.fromCurrency,
    expires_at: params.expiresAt,
  };

  const notesWithPayment = mergePaymentIntoNotes(params.notes, paymentData);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: params.userId,
      operator_id: params.operatorId,
      from_amount: params.fromAmount,
      from_currency: params.fromCurrency,
      to_amount: params.toAmount,
      to_currency: params.toCurrency,
      rate: params.rate,
      wallet_address: params.walletAddress,
      contact_info: params.contactInfo,
      notes: notesWithPayment,
      status: 'awaiting_payment',
      fee: params.feeAmount,
      network: params.network,
      amount_kgs: params.amountKgs,
      payment_method: extractPaymentMethod(params.notes) ?? 'cashless',
    })
    .select('id')
    .single();

  if (orderError) throw orderError;

  return {
    orderId: order.id,
    paymentInfo: {
      id: order.id,
      walletAddress,
      network: params.network,
      amount: params.fromAmount,
      currency: params.fromCurrency,
      expiresAt: params.expiresAt,
      qrCode: qrUrl,
    },
    isPendingPayment: true,
  };
}

async function executeAcquiringSell(params: SellOrderParams, pendingPayment: any) {
  await supabase
    .from('orders')
    .insert({
      user_id: params.userId,
      operator_id: params.operatorId,
      from_amount: params.fromAmount,
      from_currency: params.fromCurrency,
      to_amount: params.toAmount,
      to_currency: params.toCurrency,
      rate: params.rate,
      wallet_address: params.walletAddress,
      contact_info: params.contactInfo,
      notes: params.notes,
      status: 'awaiting_payment',
      fee: params.feeAmount,
      network: params.network,
      amount_kgs: params.amountKgs,
      payment_method: extractPaymentMethod(params.notes) ?? 'cashless',
    });

  try {
    const paymentData = await invokeEdgeFunction<{ success?: boolean; payment?: unknown }>('crypto-payment', {
      action: 'create-pending-payment',
      pendingPaymentId: pendingPayment.id,
      amount: params.fromAmount,
      currency: params.fromCurrency,
      network: params.network,
      walletAddress: params.walletAddress,
      contactInfo: params.contactInfo,
      toAmount: params.toAmount,
      toCurrency: params.toCurrency,
      rate: params.rate,
    });

    if (paymentData?.success && paymentData?.payment) {
      return {
        orderId: pendingPayment.id,
        paymentInfo: paymentData.payment,
        isPendingPayment: true,
      };
    }

    throw new Error('Не удалось получить данные платежа');
  } catch (err) {
    console.error('Error invoking crypto-payment:', err);
    await supabase.from('pending_payments').delete().eq('id', pendingPayment.id);
    throw err;
  }
}
