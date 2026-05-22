import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorId } from "./useOperatorId";

export interface BankAccount {
  bank_name: string;
  account_number: string;
  swift?: string;
  bik?: string;
  extra_banks?: Array<{ bank_name: string; account_number: string; swift?: string; bik?: string }>;
  foreign?: {
    bank_name: string;
    account_number: string;
    swift?: string;
    bik?: string;
  };
  extra_foreign?: Array<{ bank_name: string; account_number: string; swift?: string; bik?: string }>;
  e_wallets?: Array<{ system: string; number: string; bank?: string }>;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  icon: string;
  type: "fiat" | "crypto";
  rate_to_usd: number;
  min_amount: number;
  max_amount: number;
  is_active: boolean;
  sort_order: number;
  fee_percent: number;
  network: string | null;
  networks: string[];
  bank_accounts: BankAccount | null;
}

/** Parse the `network` column into an array of network codes */
export const parseNetworks = (network: string | null): string[] => {
  if (!network) return [];
  const trimmed = network.trim();
  if (!trimmed) return [];
  // JSON array format: ["TRC20","ERC20"]
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch { /* fall through */ }
  }
  // Legacy single value or comma-separated
  return trimmed.split(',').map(s => s.trim()).filter(Boolean);
};

/** Parse the `bank_accounts` column (JSON string) into a single BankAccount object */
export const parseBankAccount = (value: string | null): BankAccount | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    // New format: single object {bank_name, account_number, swift, bik}
    if (parsed && !Array.isArray(parsed) && typeof parsed === "object") {
      if (parsed.bank_name || parsed.account_number) return parsed as BankAccount;
    }
    // Legacy format: array — take first element
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      return {
        bank_name: first.bank_name || "",
        account_number: first.account_number || "",
        swift: first.swift || "",
        bik: first.bik || "",
      };
    }
  } catch { /* ignore */ }
  return null;
};

export const useCurrencies = () => {
  const operatorId = useOperatorId();

  return useQuery({
    queryKey: ["currencies", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currencies")
        .select("*")
        .eq("operator_id", operatorId)
        .eq("is_active", true)
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
