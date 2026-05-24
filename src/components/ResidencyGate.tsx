import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import ResidencyChoice from "@/components/auth/ResidencyChoice";
import { toast } from "sonner";

/**
 * Однораз модалка для существующих юзеров без profiles.is_resident
 * (legacy-аккаунты до RES-фичи). Появляется при заходе на любую
 * клиентскую страницу. Не закрывается — резидентство обязательно для
 * отчётов ГСФР.
 *
 * Скрывается на /admin/*, /auth и для staff-ролей.
 */
export function ResidencyGate() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const location = useLocation();
  const queryClient = useQueryClient();

  const isAdminCtx =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/auth");
  const isStaff = role === "admin" || role === "operator_admin" || role === "staff";

  const shouldQuery = !!user && !isAdminCtx && !isStaff;

  const { data: isResident } = useQuery({
    queryKey: ["profile_is_resident", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_resident")
        .eq("user_id", user!.id)
        .single();
      return data?.is_resident as boolean | null | undefined;
    },
    enabled: shouldQuery,
  });

  const show = shouldQuery && isResident === null;

  if (!show) return null;

  const handleSubmit = async (value: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ is_resident: value })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Не удалось сохранить", { description: error.message });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile_is_resident", user.id] });
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Укажите ваше резидентство</DialogTitle>
          <DialogDescription>
            Это обязательно для дальнейшего использования сервиса —
            требование отчётности перед Госагентством финразведки КР.
          </DialogDescription>
        </DialogHeader>
        <ResidencyChoice onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  );
}
