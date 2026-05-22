import { supabase } from "@/integrations/supabase/client";
import { mergePaymentIntoNotes } from "./orderUtils";

interface BuyOrderParams {
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
}

export async function executeBuyOrder(params: BuyOrderParams) {
  // Get per-currency bank account BEFORE creating the order
  let bankDetailsStr = '';
  const { data: currencyData } = await supabase
    .from('currencies')
    .select('bank_accounts')
    .eq('code', params.fromCurrency)
    .eq('operator_id', params.operatorId)
    .eq('is_active', true)
    .maybeSingle();

  if (currencyData?.bank_accounts) {
    try {
      const account = JSON.parse(currencyData.bank_accounts);

      if (account && !Array.isArray(account) && typeof account === 'object') {
        const parts: string[] = [];
        const addBank = (b: any, label?: string) => {
          if (label) { parts.push(''); parts.push(label); }
          if (b.bank_name) parts.push(`Банк: ${b.bank_name}`);
          if (b.account_number) parts.push(`Счёт: ${b.account_number}`);
          if (b.swift) parts.push(`SWIFT: ${b.swift}`);
          if (b.bik) parts.push(`БИК: ${b.bik}`);
        };

        // Primary + extra local accounts
        if (account.bank_name || account.account_number) addBank(account);
        if (Array.isArray(account.extra_banks)) {
          account.extra_banks.forEach((b: any) => addBank(b));
        }

        // Primary + extra foreign accounts
        if (account.foreign && (account.foreign.bank_name || account.foreign.account_number)) {
          addBank(account.foreign, 'Счёт за границей:');
        }
        if (Array.isArray(account.extra_foreign)) {
          account.extra_foreign.forEach((b: any, i: number) => addBank(b, i === 0 && !account.foreign ? 'Счёт за границей:' : undefined));
        }

        // E-wallets
        if (Array.isArray(account.e_wallets) && account.e_wallets.length > 0) {
          parts.push('');
          parts.push('Электронные кошельки:');
          account.e_wallets.forEach((w: any) => {
            const line = w.bank ? `${w.system}: ${w.number} (${w.bank})` : `${w.system}: ${w.number}`;
            parts.push(line);
          });
        }

        bankDetailsStr = parts.join('\n');
      } else if (Array.isArray(account) && account.length > 0) {
        // Legacy array format — take first entry
        const a = account[0];
        const parts: string[] = [];
        if (a.bank_name) parts.push(`Банк: ${a.bank_name}`);
        if (a.account_number) parts.push(`Счёт: ${a.account_number}`);
        if (a.swift) parts.push(`SWIFT: ${a.swift}`);
        if (a.bik) parts.push(`БИК: ${a.bik}`);
        if (a.holder_name) parts.push(`Получатель: ${a.holder_name}`);
        bankDetailsStr = parts.join('\n');
      }
    } catch { /* ignore parse errors */ }
  }

  // Build notes with payment info BEFORE insert (users have no UPDATE RLS policy)
  const paymentData = {
    type: 'fiat' as const,
    bank_details: bankDetailsStr || 'Реквизиты будут предоставлены оператором',
    amount: params.fromAmount,
    currency: params.fromCurrency,
    expires_at: params.expiresAt,
  };
  const notesWithPayment = mergePaymentIntoNotes(params.notes, paymentData);

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
      notes: notesWithPayment,
      status: 'awaiting_payment',
      fee: params.feeAmount,
      network: params.network || null,
      amount_kgs: params.amountKgs,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    orderId: order.id,
    paymentInfo: {
      id: order.id,
      walletAddress: '',
      network: '',
      amount: params.fromAmount,
      currency: params.fromCurrency,
      expiresAt: params.expiresAt,
      bankDetails: bankDetailsStr || 'Реквизиты будут предоставлены оператором.\nОжидайте сообщения от администратора.',
      paymentType: 'fiat' as const,
    },
  };
}
