import { Link, useLocation } from "react-router-dom";
import {
  FileText,
  Coins,
  FileSpreadsheet,
  Building2,
  Percent,
  Users,
  UserCog,
  KeyRound,
  Scale,
  HelpCircle,
  Type,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useStaffPermissions, StaffSection } from "@/hooks/useStaffPermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useThemeLogo } from "@/contexts/BrandingContext";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  section: StaffSection;
}

const operationsItems: MenuItem[] = [
  { title: "Заявки", url: "/admin", icon: FileText, section: "orders" },
  { title: "Курсы валют", url: "/admin/currencies", icon: Coins, section: "currencies" },
  { title: "Отчёты", url: "/admin/reports", icon: FileSpreadsheet, section: "reports" },
  { title: "Данные для отчётов", url: "/admin/compliance-data", icon: FileSpreadsheet, section: "reports" },
];

const complianceItems: MenuItem[] = [
  { title: "KYC верификация", url: "/admin/compliance", icon: Users, section: "compliance" },
];

const settingsItems: MenuItem[] = [
  { title: "О компании", url: "/admin/company", icon: Building2, section: "company" },
  { title: "Комиссия", url: "/admin/commission", icon: Percent, section: "commission" },
  { title: "Юр. страницы", url: "/admin/legal", icon: Scale, section: "company" },
  { title: "Квиз и настройки", url: "/admin/quiz", icon: HelpCircle, section: "company" },
  { title: "Контент сайта", url: "/admin/content", icon: Type, section: "company" },
];

const managementItems = [
  { title: "Роли", url: "/admin/staff-roles", icon: KeyRound },
  { title: "Сотрудники", url: "/admin/staff", icon: UserCog },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { data: permissions } = useStaffPermissions();
  const { data: role } = useUserRole();
  const { user } = useAuth();
  const logoUrl = useThemeLogo();

  const isOperatorAdmin = role === "operator_admin" || role === "admin";

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const filterByPermission = (items: MenuItem[]) => {
    if (!permissions) return [];
    return items.filter((item) => permissions[item.section]?.view);
  };

  const visibleOperations = filterByPermission(operationsItems);
  const visibleCompliance = filterByPermission(complianceItems);
  const visibleSettings = filterByPermission(settingsItems);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const renderSection = (label: string, items: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[]) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-1">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const active = isActive(item.url);
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.title}
                    className={
                      active
                        ? "bg-primary/10 text-foreground border-l-2 border-l-primary rounded-none rounded-r-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted border-l-2 border-l-transparent"
                    }
                  >
                    <Link to={item.url}>
                      <item.icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-card/50 backdrop-blur-xl"
    >
      {/* Logo */}
      <SidebarHeader className="p-4 pb-2">
        <Link to="/admin" className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Admin"
            className={`flex-shrink-0 transition-all ${isCollapsed ? "h-7 w-7" : "h-9 w-auto"}`}
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground leading-tight">Панель</span>
              <span className="text-[10px] text-muted-foreground leading-tight">управления</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarSeparator className="bg-border mx-3" />

      <SidebarContent className="px-1 py-2">
        {renderSection("Операции", visibleOperations)}
        {renderSection("Комплайнс", visibleCompliance)}
        {renderSection("Настройки", visibleSettings)}
        {isOperatorAdmin && renderSection("Управление", managementItems)}
      </SidebarContent>

      {/* User mini-profile at bottom */}
      <SidebarFooter className="border-t border-border p-3">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{user?.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{role || "admin"}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
