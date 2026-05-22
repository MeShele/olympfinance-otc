import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeInvoke";
import { useOperatorId } from "./useOperatorId";
import { toast } from "sonner";

export interface StaffMember {
  id: string;
  user_id: string;
  operator_id: string;
  staff_role_id: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
  role_name?: string;
}

export const useStaffMembers = () => {
  const operatorId = useOperatorId();

  return useQuery({
    queryKey: ["staff-members", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_members")
        .select("*, staff_roles(name)")
        .eq("operator_id", operatorId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map((m) => ({
        ...m,
        role_name: (m as any).staff_roles?.name || "—",
      })) as StaffMember[];
    },
    enabled: !!operatorId,
  });
};

export const useCreateStaffMember = () => {
  const queryClient = useQueryClient();
  const operatorId = useOperatorId();

  return useMutation({
    mutationFn: async (data: { email: string; password: string; displayName: string; staffRoleId: string }) => {
      return await invokeEdgeFunction<{ success?: boolean; userId?: string }>("create-staff-member", {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        staffRoleId: data.staffRoleId,
        operatorId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      toast.success("Сотрудник создан");
    },
    onError: (error: any) => {
      toast.error("Ошибка", { description: error.message });
    },
  });
};

export const useUpdateStaffMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; staff_role_id?: string; is_active?: boolean; display_name?: string }) => {
      const { error } = await supabase
        .from("staff_members")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      toast.success("Сотрудник обновлён");
    },
    onError: (error: any) => {
      toast.error("Ошибка", { description: error.message });
    },
  });
};
