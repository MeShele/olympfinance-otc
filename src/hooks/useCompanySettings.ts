import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useOperatorContext } from "@/contexts/OperatorContext";

export interface CompanySettings {
  id: string;
  company_name: string;
  legal_address: string;
  inn: string;
  okpo: string;
  license_number: string;
  license_date: string;
  tax_office: string;
  phone: string;
  email: string;
  website: string;
  director_name: string;
  director_short: string;
  director_phone: string;
  accountant_name: string;
  accountant_phone: string;
  bank_details: string;
  foreign_accounts: string;
  wallets: string;
  founders: string;
  beneficiaries: string;
  branches: string;
  subsidiaries: string;
  charter_capital: number;
  operator_wallet_address: string;
  fee_percent: number;
  liquidity_provider_name: string;
  liquidity_provider_inn: string;
  liquidity_provider_residency: string;
  liquidity_provider_wallet: string;
  acquiring_enabled: boolean;
  manual_wallet_address: string;
  sumsub_enabled: boolean;
  logo_url: string;
  tagline: string;
  primary_color: string;
  accent_color: string;
  social_telegram: string;
  social_twitter: string;
  social_instagram: string;
  logo_dark_url: string;
  favicon_url: string;
  theme_preset: string;
  background_color: string | null;
  card_color: string | null;
  border_radius: string | null;
}

export const useCompanySettings = (operatorIdOverride?: string) => {
  const { operatorId: contextOperatorId } = useOperatorContext();
  const operatorId = operatorIdOverride || contextOperatorId;
  return useQuery({
    queryKey: ["company-settings", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("operator_id", operatorId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CompanySettings | null;
    },
  });
};

export const useSaveCompanySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ settings, operatorId }: { settings: Partial<CompanySettings>; operatorId: string }) => {
      // Check if settings exist for this operator
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .eq("operator_id", operatorId)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("company_settings")
          .update(settings as TablesUpdate<"company_settings">)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_settings")
          .insert({ ...settings, operator_id: operatorId } as TablesInsert<"company_settings">);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      toast.success("Сохранено", { description: "Настройки компании обновлены" });
    },
    onError: (error: any) => {
      toast.error("Ошибка", { description: error.message });
    },
  });
};
