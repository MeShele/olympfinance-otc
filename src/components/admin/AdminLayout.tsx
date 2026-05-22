import { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { Loader2, ArrowLeft, PanelLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, useUserRole } from "@/hooks/useUserRole";
import { useStaffPermissions, StaffSection } from "@/hooks/useStaffPermissions";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Button } from "@/components/ui/button";

const BREADCRUMB_MAP: Record<string, string> = {
  "/admin": "Заявки",
  "/admin/currencies": "Курсы валют",
  "/admin/reports": "Отчёты",
  "/admin/compliance": "KYC верификация",
  "/admin/company": "О компании",
  "/admin/commission": "Комиссия",
  "/admin/legal": "Юр. страницы",
  "/admin/quiz": "Квиз",
  "/admin/staff-roles": "Роли",
  "/admin/staff": "Сотрудники",
  "/admin/content": "Контент сайта",
};

/**
 * If a staff user lands on /admin (= Заявки) without `orders.view`,
 * we'd show «Доступ запрещён» on the default index page even though
 * other sections are accessible — the page would feel broken.
 *
 * Pick the first section the user can actually open and bounce them
 * there. Compliance-officer staff jump straight to /compliance instead.
 */
const SECTION_FALLBACK_ROUTES: Array<{ section: StaffSection; route: string }> = [
  { section: "orders", route: "/admin" },
  { section: "currencies", route: "/admin/currencies" },
  { section: "reports", route: "/admin/reports" },
  { section: "compliance", route: "/admin/compliance" },
  { section: "company", route: "/admin/company" },
  { section: "commission", route: "/admin/commission" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { canAccessAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: role } = useUserRole();
  const { data: permissions, isLoading: permsLoading } = useStaffPermissions();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && user && !canAccessAdmin) {
      toast.error("Доступ запрещён", { description: "У вас нет прав администратора" });
      navigate("/");
    }
  }, [canAccessAdmin, roleLoading, user, navigate]);

  // Staff redirect: if a staff user with no orders.view lands on /admin,
  // bounce them to a page they can actually see. Operator-admin / admin
  // always have orders.view via the full-permissions short-circuit.
  useEffect(() => {
    if (authLoading || roleLoading || permsLoading) return;
    if (!user || !canAccessAdmin) return;
    if (role !== "staff") return;
    if (location.pathname !== "/admin") return;
    if (permissions?.orders?.view) return;

    // Pick the first /admin/* page they have view rights for.
    const fallback = SECTION_FALLBACK_ROUTES.find((s) => permissions?.[s.section]?.view);
    if (fallback) {
      navigate(fallback.route, { replace: true });
    }
  }, [
    authLoading,
    roleLoading,
    permsLoading,
    user,
    canAccessAdmin,
    role,
    permissions,
    location.pathname,
    navigate,
  ]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !canAccessAdmin) return null;

  const currentPage = BREADCRUMB_MAP[location.pathname] || "Панель управления";

  return (
    <div className="admin-panel">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background text-foreground">
          {/* Background Effects */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div
              className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.05) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            />
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
            <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
          </div>

          <AdminSidebar />

          <main className="flex-1 overflow-auto relative z-10">
            {/* Sticky Header */}
            <header className="h-14 md:h-16 flex items-center gap-4 border-b border-border px-4 md:px-6 sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

              {/* Breadcrumbs */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Админ</span>
                <span className="text-muted-foreground/50">/</span>
                <span className="text-foreground font-semibold">{currentPage}</span>
              </div>

              <div className="flex-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                На главную
              </Button>
            </header>

            {/* Page Content */}
            <div className="p-4 md:p-6 lg:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
