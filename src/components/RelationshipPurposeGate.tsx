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
import RelationshipPurposeChoice, { type RelationshipPurpose } from "@/components/auth/RelationshipPurposeChoice";
import { toast } from "sonner";

/**
 * Гейт для legacy-юзеров без profiles.relationship_purpose.
 *
 * Поднимается ПОСЛЕ ResidencyGate (тот же паттерн). Hard-block — закон
 * КР № 87/2018 ст. 21.1.2 требует фиксировать цель деловых отношений
 * для каждого клиента.
 */
export function RelationshipPurposeGate() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const location = useLocation();
  const queryClient = useQueryClient();

  const isAdminCtx =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/auth");
  const isStaff = role === "admin" || role === "operator_admin" || role === "staff";
  const shouldQuery = !!user && !isAdminCtx && !isStaff;

  // Резидентство должно быть указано первым (ResidencyGate срабатывает
  // раньше). Если is_resident=null — этот гейт молчит, чтобы не показывать
  // 2 модалки одновременно.
  const { data: profile } = useQuery({
    queryKey: ["profile_purpose_gate", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_resident, relationship_purpose")
        .eq("user_id", user!.id)
        .single();
      return data as { is_resident: boolean | null; relationship_purpose: string | null } | null;
    },
    enabled: shouldQuery,
  });

  const show =
    shouldQuery &&
    profile?.is_resident !== null &&
    profile?.is_resident !== undefined &&
    profile?.relationship_purpose == null;

  if (!show) return null;

  const handleSubmit = async (purpose: RelationshipPurpose) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ relationship_purpose: purpose })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Не удалось сохранить", { description: error.message });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile_purpose_gate", user.id] });
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Укажите цель использования</DialogTitle>
          <DialogDescription>
            Обязательное требование закона КР № 87/2018 (ст. 21.1.2).
            Выберите ближайший по смыслу вариант — это можно изменить
            позже через поддержку.
          </DialogDescription>
        </DialogHeader>
        <RelationshipPurposeChoice onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  );
}
