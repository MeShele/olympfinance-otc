import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useOperatorId } from "./useOperatorId";

export interface ComplianceData {
  id: string;
  report_year: number;
  report_month: number;
  total_assets: number;
  total_equity: number;
  total_liabilities: number;
  net_profit: number;
  taxes_paid: number;
  aml_rejections: number;
  suspicious_reports: number;
  gsfr_reports: number;
  state_registration_changes: string;
  reorganization_info: string;
}

export const useComplianceData = (year: number, month: number) => {
  const operatorId = useOperatorId();
  return useQuery({
    queryKey: ["compliance-data", operatorId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_data")
        .select("*")
        .eq("operator_id", operatorId)
        .eq("report_year", year)
        .eq("report_month", month)
        .maybeSingle();

      if (error) throw error;
      return data as ComplianceData | null;
    },
  });
};

export const useComplianceDataList = () => {
  const operatorId = useOperatorId();
  return useQuery({
    queryKey: ["compliance-data-list", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_data")
        .select("*")
        .eq("operator_id", operatorId)
        .order("report_year", { ascending: false })
        .order("report_month", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ComplianceData[];
    },
  });
};

export const useSaveComplianceData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, operatorId }: { data: Omit<ComplianceData, "id">; operatorId: string }) => {
      const { data: existing } = await supabase
        .from("compliance_data")
        .select("id")
        .eq("operator_id", operatorId)
        .eq("report_year", data.report_year)
        .eq("report_month", data.report_month)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("compliance_data")
          .update(data as TablesUpdate<"compliance_data">)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("compliance_data")
          .insert({ ...data, operator_id: operatorId } as TablesInsert<"compliance_data">);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-data"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-data-list"] });
      toast.success("Сохранено", { description: "Данные комплайнс обновлены" });
    },
    onError: (error: any) => {
      toast.error("Ошибка", { description: error.message });
    },
  });
};
