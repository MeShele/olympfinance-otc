import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorId } from "./useOperatorId";

export interface Order {
  id: string;
  user_id: string | null;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  rate: number;
  status: string;
  wallet_address: string | null;
  contact_info: string | null;
  notes: string | null;
  payment_method?: string | null;
  receipt_url?: string | null;
  network: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_full_name?: string;
}

export const useOrders = () => {
  const operatorId = useOperatorId();
  return useQuery({
    queryKey: ["orders", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("operator_id", operatorId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles for all orders
      const userIds = [...new Set(data.filter(o => o.user_id).map(o => o.user_id!))];
      let profileMap = new Map<string, { email: string; full_name: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", userIds);
        if (profiles) {
          profileMap = new Map(profiles.map(p => [p.user_id, p]));
        }
      }

      return data.map((o) => {
        const profile = o.user_id ? profileMap.get(o.user_id) : undefined;
        return {
          ...o,
          from_amount: Number(o.from_amount),
          to_amount: Number(o.to_amount),
          rate: Number(o.rate),
          user_email: profile?.email,
          user_full_name: profile?.full_name,
        };
      }) as Order[];
    },
    staleTime: 30_000, // 30 seconds before considering data stale
    refetchOnWindowFocus: true,
  });
};

export const useUpdateOrderStatus = () => {
  const operatorId = useOperatorId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Не удалось обновить статус. Недостаточно прав или заявка не найдена.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", operatorId] });
      queryClient.invalidateQueries({ queryKey: ["user-orders"] });
    },
  });
};

export const useConfirmPayment = () => {
  const operatorId = useOperatorId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc('confirm_order_payment', { _order_id: orderId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", operatorId] });
    },
  });
};

export const useMarkOrderCompleted = () => {
  const operatorId = useOperatorId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, txHash }: { id: string; txHash?: string }) => {
      const { error } = await supabase.rpc("mark_order_completed" as never, {
        p_order_id: id,
        p_payout_tx_hash: txHash?.trim() || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", operatorId] });
      queryClient.invalidateQueries({ queryKey: ["user-orders"] });
    },
  });
};

export const useDeleteOrder = () => {
  const operatorId = useOperatorId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id)
        .eq("operator_id", operatorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", operatorId] });
    },
  });
};
