import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorId } from "./useOperatorId";
import { Currency } from "./useCurrencies";

export interface CurrencyPairRate {
  id: string;
  fiat_currency_id: string;
  crypto_currency_id: string;
  buy_rate: number | null;
  sell_rate: number | null;
  operator_id: string;
}

export interface PairRateEntry {
  buy_rate: number | null;
  sell_rate: number | null;
}

export type PairRateMap = Map<string, PairRateEntry>;

const pairKey = (fiatId: string, cryptoId: string) => `${fiatId}:${cryptoId}`;

/** All pair rates for admin management */
export const useAllPairRates = () => {
  const operatorId = useOperatorId();

  return useQuery({
    queryKey: ["currency-pair-rates", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currency_pair_rates")
        .select("*")
        .eq("operator_id", operatorId);

      if (error) throw error;

      return (data ?? []).map((r) => ({
        ...r,
        buy_rate: r.buy_rate != null ? Number(r.buy_rate) : null,
        sell_rate: r.sell_rate != null ? Number(r.sell_rate) : null,
      })) as CurrencyPairRate[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

/** Pair rates as a Map for the calculator */
export const usePairRatesForCalculator = () => {
  const { data: rates = [] } = useAllPairRates();

  const map: PairRateMap = new Map();
  for (const r of rates) {
    map.set(pairKey(r.fiat_currency_id, r.crypto_currency_id), {
      buy_rate: r.buy_rate,
      sell_rate: r.sell_rate,
    });
  }
  return map;
};

/** Upsert a pair rate */
export const useUpsertPairRate = () => {
  const operatorId = useOperatorId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      fiat_currency_id: string;
      crypto_currency_id: string;
      buy_rate: number | null;
      sell_rate: number | null;
    }) => {
      const { data, error } = await supabase
        .from("currency_pair_rates")
        .upsert(
          {
            fiat_currency_id: params.fiat_currency_id,
            crypto_currency_id: params.crypto_currency_id,
            buy_rate: params.buy_rate,
            sell_rate: params.sell_rate,
            operator_id: operatorId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "fiat_currency_id,crypto_currency_id,operator_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currency-pair-rates", operatorId] });
    },
  });
};

/** Delete a pair rate (return to fallback cross-rate) */
export const useDeletePairRate = () => {
  const operatorId = useOperatorId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("currency_pair_rates")
        .delete()
        .eq("id", id)
        .eq("operator_id", operatorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currency-pair-rates", operatorId] });
    },
  });
};

/**
 * Compute the exchange rate for a currency pair.
 *
 * - BUY (fiat→crypto): uses buy_rate → exchangeRate = 1 / buy_rate
 * - SELL (crypto→fiat): uses sell_rate → exchangeRate = sell_rate
 * - SWAP (crypto→crypto): cross-rate via rate_to_usd
 * - Fallback: cross-rate via rate_to_usd if no pair rate found
 */
export function computeExchangeRate(
  direction: "buy" | "sell" | "swap",
  fromCurrency: Currency | undefined,
  toCurrency: Currency | undefined,
  pairRates: PairRateMap
): number {
  if (!fromCurrency || !toCurrency) return 0;

  // SWAP: always cross-rate via rate_to_usd
  if (direction === "swap") {
    return toCurrency.rate_to_usd === 0
      ? 0
      : fromCurrency.rate_to_usd / toCurrency.rate_to_usd;
  }

  // Determine fiat and crypto currencies
  const fiat = direction === "buy" ? fromCurrency : toCurrency;
  const crypto = direction === "buy" ? toCurrency : fromCurrency;

  const key = pairKey(fiat.id, crypto.id);
  const pair = pairRates.get(key);

  if (pair) {
    if (direction === "buy" && pair.buy_rate && pair.buy_rate > 0) {
      // buy_rate = price of 1 crypto in fiat when buying
      // exchangeRate = how much crypto per 1 fiat
      return 1 / pair.buy_rate;
    }
    if (direction === "sell" && pair.sell_rate && pair.sell_rate > 0) {
      // sell_rate = price of 1 crypto in fiat when selling
      // exchangeRate = how much fiat per 1 crypto
      return pair.sell_rate;
    }
  }

  // Fallback: cross-rate via rate_to_usd
  return toCurrency.rate_to_usd === 0
    ? 0
    : fromCurrency.rate_to_usd / toCurrency.rate_to_usd;
}
