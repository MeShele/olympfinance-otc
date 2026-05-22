import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Currency, parseBankAccount } from "./useCurrencies";
import { useOperatorId } from "./useOperatorId";

/** Parse the `network` column into an array of network codes */
const parseNetworks = (network: string | null): string[] => {
  if (!network) return [];
  const trimmed = network.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch { /* fall through */ }
  }
  return trimmed.split(',').map(s => s.trim()).filter(Boolean);
};

// Hook for admin to get ALL currencies (including inactive) for current operator
export const useAllCurrencies = () => {
  const operatorId = useOperatorId();
  return useQuery({
    queryKey: ["currencies-all", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currencies")
        .select("*")
        .eq("operator_id", operatorId)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return data.map((c) => ({
        ...c,
        type: c.type as "fiat" | "crypto",
        rate_to_usd: Number(c.rate_to_usd),
        min_amount: Number(c.min_amount),
        max_amount: Number(c.max_amount),
        fee_percent: Number(c.fee_percent ?? 2.5),
        network: c.network || null,
        networks: parseNetworks(c.network),
        bank_accounts: parseBankAccount(c.bank_accounts),
      })) as Currency[];
    },
    staleTime: 1000 * 60 * 5,
  });
};
