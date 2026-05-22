import { ReactNode } from "react";
import { Loader2, ShieldX } from "lucide-react";
import { useStaffPermissions, StaffSection } from "@/hooks/useStaffPermissions";

interface RequirePermissionProps {
  section: StaffSection;
  children: ReactNode;
}

export function RequirePermission({ section, children }: RequirePermissionProps) {
  const { data: permissions, isLoading } = useStaffPermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions?.[section]?.view) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <ShieldX className="w-12 h-12" />
        <h2 className="text-lg font-semibold">Доступ запрещён</h2>
        <p className="text-sm">У вас нет прав для просмотра этого раздела.</p>
      </div>
    );
  }

  return <>{children}</>;
}
