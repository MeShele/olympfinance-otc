import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffPermissions, COMPLIANCE_WORKSPACE_SECTION } from "@/hooks/useStaffPermissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBrandingContext, useThemeLogo } from "@/contexts/BrandingContext";

type AppRole = "admin" | "operator_admin" | "staff" | string | null | undefined;

/**
 * Where to send a freshly-authenticated user.
 *
 * Priority:
 *   1. admin / operator_admin → full admin panel.
 *   2. staff with compliance_workspace.view → dedicated compliance dashboard.
 *      Even if they also have orders/currencies/etc., compliance takes
 *      precedence — that's their job, the operator can drop /admin/* perms
 *      from the role if it's noisy.
 *   3. any other staff (only non-compliance perms) → /admin (the sidebar
 *      auto-filters to what they actually can do).
 *   4. nobody fits → public site (and AdminLogin signs them out).
 */
const resolveLandingPath = (
  role: AppRole,
  hasComplianceWorkspace: boolean,
): string => {
  if (role === "admin" || role === "operator_admin") return "/admin";
  if (role === "staff" && hasComplianceWorkspace) return "/compliance";
  if (role === "staff") return "/admin";
  return "/";
};

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { data: permissions, isLoading: permsLoading } = useStaffPermissions();
  const navigate = useNavigate();
  const branding = useBrandingContext();
  const logoUrl = useThemeLogo();

  const hasComplianceWorkspace = !!permissions?.[COMPLIANCE_WORKSPACE_SECTION]?.view;
  const canEnter =
    role === "admin" ||
    role === "operator_admin" ||
    role === "staff";

  useEffect(() => {
    if (authLoading || roleLoading || permsLoading) return;
    if (!user) return;
    if (canEnter) {
      navigate(resolveLandingPath(role, hasComplianceWorkspace));
      return;
    }
    // Authenticated but no admin / no compliance access — sign out so the
    // user doesn't get stuck on a login form they can't pass. They probably
    // belong to the public side of the site (or were never granted a role).
    void supabase.auth.signOut().then(() => {
      toast.error("Доступ закрыт", {
        description:
          "Этот аккаунт не привязан ни к одной роли в админке. Обратитесь к владельцу обменника.",
      });
    });
  }, [user, authLoading, roleLoading, permsLoading, role, canEnter, hasComplianceWorkspace, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Ошибка", { description: "Введите email и пароль" });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast.error("Ошибка входа", { description: "Неверный email или пароль" });
        return;
      }

      // Don't navigate eagerly — the effect above resolves the landing path
      // once the role + permissions queries settle, otherwise compliance-only
      // users would briefly see the admin guard kick them out.
      toast.success("Успешный вход", { description: "Загружаем рабочее место..." });
    } catch {
      toast.error("Ошибка", { description: "Произошла непредвиденная ошибка" });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <Button variant="ghost" className="mb-6" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          На главную
        </Button>

        <div className="glass-panel rounded-2xl p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <img src={logoUrl} alt={branding.company_name} className="h-14 w-auto" />
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">Панель администратора</h1>
          <p className="text-muted-foreground text-center mb-8">Введите данные для входа</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="mt-1"
                autoComplete="username"
              />
            </div>

            <div>
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="mt-1"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" variant="gradient" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Вход...
                </>
              ) : (
                "Войти"
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Lock className="w-4 h-4" />
            SSL защита
          </span>
          <span>&bull;</span>
          <span>256-bit шифрование</span>
        </div>
      </div>
    </div>
  );
}
