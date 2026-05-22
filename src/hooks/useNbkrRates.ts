import { useQuery } from "@tanstack/react-query";
import { invokeEdgeFunction } from "@/lib/edgeInvoke";

export interface NbkrRate {
  code: string;
  nominal: number;
  rateToKgs: number;
}

export interface NbkrRatesResponse {
  success: boolean;
  date: string;
  rates: NbkrRate[];
  usdToKgs: number | null;
}

export const useNbkrRates = () => {
  return useQuery({
    queryKey: ["nbkr-rates"],
    queryFn: async (): Promise<NbkrRatesResponse> => {
      const data = await invokeEdgeFunction<NbkrRatesResponse>("nbkr-rates", {});
      if (!data?.success) {
        throw new Error("Не удалось получить курсы НБКР");
      }
      return data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (rates update daily)
    refetchOnWindowFocus: false,
  });
};

/**
 * Convert an amount to KGS using NBKR rates.
 * For fiat: use direct rate from NBKR.
 * For crypto: convert via USD (amount × cryptoRateToUsd × usdToKgs).
 */
export const convertToKgs = (
  amount: number,
  currency: string,
  rates: NbkrRate[],
  usdToKgs: number | null,
  cryptoRateToUsd?: number
): number | null => {
  const code = currency.toUpperCase();

  if (code === "KGS") return amount;

  // Direct fiat rate
  const directRate = rates.find((r) => r.code === code);
  if (directRate) {
    return amount * (directRate.rateToKgs / directRate.nominal);
  }

  // Crypto via USD
  if (cryptoRateToUsd && usdToKgs) {
    return amount * cryptoRateToUsd * usdToKgs;
  }

  return null;
};
