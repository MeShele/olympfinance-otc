import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralised "do we need to gate behind quiz right now?" logic.
 *
 * Условия:
 *   - модуль включён у оператора (company_settings.quiz_enabled)
 *   - юзер залогинен
 *   - НЕ /admin/* и НЕ /auth (там свой контекст, не пускаем модалку)
 *   - роль не admin / operator_admin / staff (сотрудники не сдают
 *     клиентский квиз)
 *   - profiles.quiz_passed = false
 *
 * Возвращает:
 *   - requireQuiz: показать гейт сейчас (banner + блок submit ордера)
 *   - passed:      юзер уже сдавал
 *   - enabled:     модуль квиза включён администратором
 */
export function useQuizGate() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const { data: settings } = useCompanySettings();
  const location = useLocation();

  const enabled = settings?.quiz_enabled ?? true;
  const isAdminCtx =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/auth");
  const isStaff = role === "admin" || role === "operator_admin" || role === "staff";

  const shouldQuery = !!user && enabled && !isAdminCtx && !isStaff;

  const { data: passed } = useQuery({
    queryKey: ["quiz_passed", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("quiz_passed")
        .eq("user_id", user!.id)
        .single();
      return data?.quiz_passed ?? false;
    },
    enabled: shouldQuery,
  });

  return {
    requireQuiz: shouldQuery && passed === false,
    passed: passed === true,
    enabled,
  };
}
