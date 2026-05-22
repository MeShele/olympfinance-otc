import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { fetchAmountKgs } from "./orderUtils";
import { executeBuyOrder } from "./useBuyOrder";
import { executeSellOrder } from "./useSellOrder";
import { executeSwapOrder } from "./useSwapOrder";

interface PaymentInfo {
  id: string;
  walletAddress: string;
  network: string;
  amount: number;
  currency: string;
  expiresAt: string;
  qrCode?: string;
  paymentUrl?: string;
  /** For fiat payments — structured bank details */
  bankDetails?: string;
  /** 'crypto' = send to wallet, 'fiat' = send to bank */
  paymentType?: 'crypto' | 'fiat';
}

interface CreateOrderParams {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  walletAddress: string;
  contactInfo: string;
  notes?: string;
  direction?: 'buy' | 'sell' | 'swap';
  feePercent?: number;
  network?: string | null;
  cryptoRateToUsd?: number;
}

interface CreateOrderResult {
  orderId: string;
  paymentInfo?: PaymentInfo;
  isPendingPayment?: boolean;
}

export const useCreateOrder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateOrderParams): Promise<CreateOrderResult> => {
      if (!user?.id) {
        throw new Error('Необходимо авторизоваться для создания заявки');
      }

      // Get user's operator_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('operator_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!profile?.operator_id) throw new Error('Оператор не найден');
      const operatorId = profile.operator_id;
      // Calculate fee amount
      const feePercent = params.feePercent ?? 2.5;
      const feeAmount = params.fromAmount * (feePercent / 100);

      // Determine the crypto currency and its USD rate for KGS conversion
      let cryptoAmount = params.fromAmount;
      let cryptoCurrency = params.fromCurrency;
      let cryptoRateToUsd = params.cryptoRateToUsd;

      if (params.direction === 'buy') {
        cryptoAmount = params.toAmount;
        cryptoCurrency = params.toCurrency;
        cryptoRateToUsd = undefined;
      } else if (params.direction === 'sell') {
        cryptoAmount = params.fromAmount;
        cryptoCurrency = params.fromCurrency;
      } else if (params.direction === 'swap') {
        cryptoAmount = params.fromAmount;
        cryptoCurrency = params.fromCurrency;
      }

      // Fetch KGS equivalent
      const amountKgs = await fetchAmountKgs(cryptoAmount, cryptoCurrency, cryptoRateToUsd);

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const commonParams = {
        userId: user.id,
        operatorId,
        fromAmount: params.fromAmount,
        fromCurrency: params.fromCurrency,
        toAmount: params.toAmount,
        toCurrency: params.toCurrency,
        rate: params.rate,
        walletAddress: params.walletAddress,
        contactInfo: params.contactInfo,
        notes: params.notes,
        feeAmount,
        amountKgs,
        expiresAt,
      };

      // SELL path
      if (params.direction === 'sell') {
        return executeSellOrder({
          ...commonParams,
          network: params.network || 'TRC20',
          hasAcquiringModule: false,
        });
      }

      // BUY path
      if (params.direction === 'buy') {
        return executeBuyOrder({
          ...commonParams,
          network: params.network || null,
        });
      }

      // SWAP path
      // Fetch company settings for wallet lookup
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('bank_details, manual_wallet_address')
        .eq('operator_id', operatorId)
        .limit(1)
        .maybeSingle();

      if (params.direction === 'swap') {
        return executeSwapOrder({
          ...commonParams,
          network: params.network || null,
          companySettings,
        });
      }

      // Default: create order without payment info
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          operator_id: operatorId,
          from_amount: params.fromAmount,
          from_currency: params.fromCurrency,
          to_amount: params.toAmount,
          to_currency: params.toCurrency,
          rate: params.rate,
          wallet_address: params.walletAddress,
          contact_info: params.contactInfo,
          notes: params.notes,
          status: 'awaiting_payment',
          fee: feeAmount,
          network: params.network || null,
          amount_kgs: amountKgs,
        })
        .select()
        .single();

      if (error) throw error;

      return { orderId: order.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
    },
  });
};
