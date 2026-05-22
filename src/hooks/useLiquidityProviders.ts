import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOperatorId } from "@/hooks/useOperatorId";

export interface LiquidityProvider {
  id: string;
  operator_id: string;
  name: string;
  inn: string;
  residency: string;
  wallet: string;
  is_default: boolean;
}

export const useLiquidityProviders = () => {
  const operatorId = useOperatorId();
  return useQuery({
    queryKey: ["liquidity-providers", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidity_providers")
        .select("*")
        .eq("operator_id", operatorId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as LiquidityProvider[];
    },
  });
};

export const useDefaultLiquidityProvider = () => {
  const operatorId = useOperatorId();
  return useQuery({
    queryKey: ["liquidity-provider-default", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidity_providers")
        .select("*")
        .eq("operator_id", operatorId)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as LiquidityProvider | null;
    },
  });
};

export const useSaveLiquidityProvider = () => {
  const qc = useQueryClient();
  const operatorId = useOperatorId();

  return useMutation({
    mutationFn: async (provider: Partial<LiquidityProvider> & { id?: string }) => {
      if (provider.id) {
        const { error } = await supabase
          .from("liquidity_providers")
          .update({
            name: provider.name,
            inn: provider.inn,
            residency: provider.residency,
            wallet: provider.wallet,
            is_default: provider.is_default,
          } as any)
          .eq("id", provider.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("liquidity_providers")
          .insert({
            operator_id: operatorId,
            name: provider.name,
            inn: provider.inn,
            residency: provider.residency,
            wallet: provider.wallet,
            is_default: provider.is_default ?? false,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liquidity-providers"] });
      qc.invalidateQueries({ queryKey: ["liquidity-provider-default"] });
      toast.success("Сохранено");
    },
    onError: (e: unknown) => {
      toast.error("Ошибка", { description: e instanceof Error ? e.message : "Неизвестная ошибка" });
    },
  });
};

export const useDeleteLiquidityProvider = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("liquidity_providers")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liquidity-providers"] });
      qc.invalidateQueries({ queryKey: ["liquidity-provider-default"] });
      toast.success("Удалено");
    },
    onError: (e: unknown) => {
      toast.error("Ошибка", { description: e instanceof Error ? e.message : "Неизвестная ошибка" });
    },
  });
};

export const useSetDefaultProvider = () => {
  const qc = useQueryClient();
  const operatorId = useOperatorId();

  return useMutation({
    mutationFn: async (id: string) => {
      // Unset all defaults for this operator
      await supabase
        .from("liquidity_providers")
        .update({ is_default: false } as any)
        .eq("operator_id", operatorId);
      // Set the new default
      const { error } = await supabase
        .from("liquidity_providers")
        .update({ is_default: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liquidity-providers"] });
      qc.invalidateQueries({ queryKey: ["liquidity-provider-default"] });
      toast.success("По умолчанию обновлён");
    },
    onError: (e: unknown) => {
      toast.error("Ошибка", { description: e instanceof Error ? e.message : "Неизвестная ошибка" });
    },
  });
};
