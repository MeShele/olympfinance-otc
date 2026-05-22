import { Link, useLocation } from "react-router-dom";
import {
  FileText,
  Home,
  Settings,
  User,
  Shield,
  LogOut,
  ArrowLeftRight,
  HelpCircle,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBrandingContext, useThemeLogo } from "@/contexts/BrandingContext";

const mainMenuItems = [
  { title: "Главная", url: "/", icon: Home },
  { title: "Мои заявки", url: "/orders", icon: FileText },
  { title: "Документы", url: "/documents", icon: FolderOpen },
  { title: "Обмен", url: "/#exchange", icon: ArrowLeftRight },
];

const supportMenuItems = [
  { title: "Профиль", url: "/profile", icon: User },
  { title: "Помощь", url: "/help", icon: HelpCircle },
  { title: "Настройки", url: "/settings", icon: Settings },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { canAccessAdmin } = useIsAdmin();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const branding = useBrandingContext();
  const logoUrl = useThemeLogo();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card/80 backdrop-blur-xl">
      {/* Header */}
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoUrl} alt={branding.company_name} className="h-9 w-auto" />
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Main Content */}
      <SidebarContent>
        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>Меню</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Menu */}
        {canAccessAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Администрирование</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin")}
                    tooltip="Админ панель"
                  >
                    <Link to="/admin">
                      <Shield className="w-4 h-4" />
                      <span>Админ панель</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Support Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>Поддержка</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Info */}
      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-4" />
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <Avatar className="w-9 h-9 flex-shrink-0 ring-2 ring-blue-500/20">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                {canAccessAdmin ? "Администратор" : "Пользователь"}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-8 w-8"
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="mt-2 w-full"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
