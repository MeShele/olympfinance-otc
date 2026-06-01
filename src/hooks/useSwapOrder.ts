import { supabase } from "@/integrations/supabase/client";
import { mergePaymentIntoNotes, requiresMemo, generateMemo } from "./orderUtils";
import { extractPaymentMethod } from "@/utils/orderNotes";

interface SwapOrderParams {
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
  network: string | null;
  amountKgs: number;
  expiresAt: string;
  companySettings: { bank_details?: string; manual_wallet_address?: string } | null;
}

export async function executeSwapOrder(params: SwapOrderParams) {
  const network = params.network || 'TRC20';
  let walletAddress = '';
  let qrUrl: string | undefined;
  try {
    const wallets = JSON.parse(params.companySettings?.manual_wallet_address || '[]');
    const match = wallets.find((w: { network: string; address: string; qr_url?: string }) =>
      w.network.toUpperCase() === network.toUpperCase()
    );
    const chosen = match || (wallets.length > 0 ? wallets[0] : null);
    walletAddress = chosen?.address || '';
    qrUrl = chosen?.qr_url || undefined;
  } catch {
    walletAddress = '';
  }

  // memo для memo-сетей (TON и др.) — уникальный на ордер для атрибуции.
  const memo = requiresMemo(network) ? generateMemo() : undefined;

  // Build notes with payment info BEFORE insert (users have no UPDATE RLS policy)
  let finalNotes = params.notes;
  if (walletAddress) {
    const paymentData = {
      type: 'crypto' as const,
      wallet_address: walletAddress,
      network,
      qr_url: qrUrl,
      memo,
      amount: params.fromAmount,
      currency: params.fromCurrency,
      expires_at: params.expiresAt,
    };
    finalNotes = mergePaymentIntoNotes(params.notes, paymentData);
  }

  const { data: order, error } = await supabase
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
      notes: finalNotes,
      status: 'awaiting_payment',
      fee: params.feeAmount,
      network: params.network || null,
      amount_kgs: params.amountKgs,
      payment_method: extractPaymentMethod(params.notes) ?? 'cashless',
    })
    .select()
    .single();

  if (error) throw error;

  if (walletAddress) {
    return {
      orderId: order.id,
      paymentInfo: {
        id: order.id,
        walletAddress,
        network,
        amount: params.fromAmount,
        currency: params.fromCurrency,
        expiresAt: params.expiresAt,
        paymentType: 'crypto' as const,
        qrCode: qrUrl,
        memo,
      },
    };
  }

  return { orderId: order.id };
}
