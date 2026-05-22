import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";

export type StaffSection =
  | "orders"
  | "currencies"
  | "reports"
  | "compliance"
  | "compliance_data"
  | "compliance_workspace"
  | "company"
  | "commission";
export type StaffAction = "view" | "edit" | "create" | "delete";

export interface SectionPermissions {
  view: boolean;
  edit: boolean;
  create: boolean;
  delete: boolean;
}

export type StaffPermissions = Record<StaffSection, SectionPermissions>;

const ALL_SECTIONS: StaffSection[] = [
  "orders",
  "currencies",
  "reports",
  "compliance",
  "compliance_data",
  "compliance_workspace",
  "company",
  "commission",
];

/**
 * `compliance_workspace` is the gate to the dedicated compliance-officer
 * dashboard at /compliance — separate from the operator admin's KYC list
 * at /admin/compliance. Used to drive post-login redirect for users whose
 * job is exclusively compliance review (per ГСФР TZ).
 */
export const COMPLIANCE_WORKSPACE_SECTION: StaffSection = "compliance_workspace";

const allTrue: SectionPermissions = { view: true, edit: true, create: true, delete: true };
const allFalse: SectionPermissions = { view: false, edit: false, create: false, delete: false };

const fullPermissions: StaffPermissions = Object.fromEntries(
  ALL_SECTIONS.map(s => [s, { ...allTrue }])
) as StaffPermissions;

const noPermissions: StaffPermissions = Object.fromEntries(
  ALL_SECTIONS.map(s => [s, { ...allFalse }])
) as StaffPermissions;

export const useStaffPermissions = () => {
  const { user } = useAuth();
  const { data: role } = useUserRole();

  return useQuery({
    queryKey: ["staff-permissions", user?.id, role],
    queryFn: async (): Promise<StaffPermissions> => {
      // operator_admin and admin get full access
      if (role === "operator_admin" || role === "admin") {
        return fullPermissions;
      }

      // staff — fetch permissions from staff_members JOIN staff_roles
      if (role === "staff" && user) {
        const { data, error } = await supabase
          .from("staff_members")
          .select("staff_roles(permissions)")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (error || !data) return noPermissions;

        const raw = (data as { staff_roles: { permissions: Record<string, Record<string, boolean>> } | null } | null)
          ?.staff_roles?.permissions;
        if (!raw || typeof raw !== "object") return noPermissions;

        // Merge with defaults to ensure all sections exist
        const result = { ...noPermissions };
        for (const section of ALL_SECTIONS) {
          if (raw[section] && typeof raw[section] === "object") {
            result[section] = {
              view: !!raw[section].view,
              edit: !!raw[section].edit,
              create: !!raw[section].create,
              delete: !!raw[section].delete,
            };
          }
        }
        return result;
      }

      return noPermissions;
    },
    enabled: !!user && !!role,
    staleTime: 1000 * 60 * 5,
  });
};

export const useHasPermission = (section: StaffSection, action: StaffAction): boolean => {
  const { data: permissions } = useStaffPermissions();
  return permissions?.[section]?.[action] ?? false;
};

export { ALL_SECTIONS, fullPermissions, noPermissions };
