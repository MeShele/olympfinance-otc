import { useQuery } from "@tanstack/react-query";
import { fetchCoreRates, type CryptoRates } from "@/lib/core-api";

/**
 * Fetches exchange rates from Core API (Binance + NBKR).
 * Refreshes every 30 seconds.
 */
export function useCoreRates() {
  return useQuery<CryptoRates | null>({
    queryKey: ["core-rates"],
    queryFn: async () => {
      const result = await fetchCoreRates();
      if (result.error || !result.data) {
        console.warn("Core rates unavailable:", result.error);
        return null;
      }
      return result.data;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 2,
    retryDelay: 5000,
  });
}

/**
 * Get a specific crypto rate to USD from core API.
 * Falls back to local rate_to_usd if core API is unavailable.
 */
export function useCoreRate(currencyCode: string, localRate: number): number {
  const { data: coreRates } = useCoreRates();
  if (coreRates?.crypto?.[currencyCode]) {
    return coreRates.crypto[currencyCode];
  }
  return localRate;
}
