import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorId } from "./useOperatorId";
import { toast } from "sonner";
import { StaffPermissions, noPermissions } from "./useStaffPermissions";

export interface StaffRole {
  id: string;
  operator_id: string;
  name: string;
  description: string;
  permissions: StaffPermissions;
  created_at: string;
  updated_at: string;
}

export const useStaffRoles = () => {
  const operatorId = useOperatorId();

  const query = useQuery({
    queryKey: ["staff-roles", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_roles")
        .select("*")
        .eq("operator_id", operatorId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map((r) => ({
        ...r,
        permissions: (r.permissions as any as StaffPermissions) || noPermissions,
      })) as StaffRole[];
    },
    enabled: !!operatorId,
  });

  return query;
};

export const useCreateStaffRole = () => {
  const queryClient = useQueryClient();
  const operatorId = useOperatorId();

  return useMutation({
    mutationFn: async (data: { name: string; description: string; permissions: StaffPermissions }) => {
      const { error } = await supabase
        .from("staff_roles")
        .insert({
          operator_id: operatorId,
          name: data.name,
          description: data.description,
          permissions: data.permissions as any,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
      toast.success("Роль создана");
    },
    onError: (error: any) => {
      toast.error("Ошибка", { description: error.message });
    },
  });
};

export const useUpdateStaffRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; permissions?: StaffPermissions }) => {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.permissions !== undefined) updateData.permissions = data.permissions;

      const { error } = await supabase
        .from("staff_roles")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
      toast.success("Роль обновлена");
    },
    onError: (error: any) => {
      toast.error("Ошибка", { description: error.message });
    },
  });
};

export const useDeleteStaffRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_roles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
      toast.success("Роль удалена");
    },
    onError: (error: any) => {
      toast.error("Ошибка", { description: error.message });
    },
  });
};
