import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      if (!data || data.length === 0) return null;

      // Prioritize admin > operator_admin > staff > user
      const roles = data.map(d => d.role);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("operator_admin")) return "operator_admin";
      if (roles.includes("staff")) return "staff";
      return roles[0];
    },
    enabled: !!user,
  });
};

export const useIsAdmin = () => {
  const { data: role, isLoading } = useUserRole();
  return {
    isAdmin: role === "admin" || role === "operator_admin",
    canAccessAdmin: role === "admin" || role === "operator_admin" || role === "staff",
    isLoading,
  };
};
