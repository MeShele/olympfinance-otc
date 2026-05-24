import {
  StaffPermissions,
  StaffSection,
  SectionPermissions,
  ALL_SECTIONS,
} from "@/hooks/useStaffPermissions";

/**
 * Role-design helpers for the staff-roles form.
 *
 * The DB stores permissions as a 4-action matrix (view/edit/create/delete)
 * per section. For the average operator that surface is too granular —
 * 9 sections × 4 actions = 36 checkboxes per role. This module exposes:
 *
 *   - PermissionLevel: 4 simple steps (none → view → edit → full) that map
 *     to the underlying 4-action matrix with a sane cascade. Edit ⊃ view.
 *     Full ⊃ create + delete + edit + view.
 *   - levelFromSectionPerms / sectionPermsFromLevel: bidirectional mapping.
 *   - SECTION_GROUPS: visual grouping for the form (Операции / Комплайнс
 *     / Настройки / Управление).
 *   - SECTION_DESCRIPTIONS: tooltip copy explaining what each section
 *     unlocks for the staff member.
 *   - ROLE_PRESETS: 5 ready-made role templates that fill the matrix in
 *     one click.
 */

export type PermissionLevel = "none" | "view" | "edit" | "full";

export const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: "Нет доступа",
  view: "Просмотр",
  edit: "Редактирование",
  full: "Полный доступ",
};

export const LEVEL_ORDER: PermissionLevel[] = ["none", "view", "edit", "full"];

const allFalse: SectionPermissions = { view: false, edit: false, create: false, delete: false };

export function sectionPermsFromLevel(level: PermissionLevel): SectionPermissions {
  switch (level) {
    case "view":
      return { view: true, edit: false, create: false, delete: false };
    case "edit":
      return { view: true, edit: true, create: false, delete: false };
    case "full":
      return { view: true, edit: true, create: true, delete: true };
    default:
      return { ...allFalse };
  }
}

/**
 * Best-effort reverse mapping. Levels are coarser than the underlying
 * matrix, so any combination that doesn't map cleanly is reported as the
 * highest matching tier (so the form preselects «Полный доступ» when the
 * stored matrix happens to grant create + delete without edit, etc.).
 */
export function levelFromSectionPerms(perms: SectionPermissions | undefined): PermissionLevel {
  if (!perms || !perms.view) return "none";
  if (perms.create || perms.delete) return "full";
  if (perms.edit) return "edit";
  return "view";
}

// -----------------------------------------------------------------------------
// Section grouping + descriptions
// -----------------------------------------------------------------------------

export interface SectionGroup {
  key: string;
  label: string;
  sections: StaffSection[];
}

export const SECTION_GROUPS: SectionGroup[] = [
  {
    key: "operations",
    label: "Операции",
    sections: ["orders", "currencies", "reports"],
  },
  {
    key: "compliance",
    label: "Комплайнс",
    sections: ["compliance"],
  },
  {
    key: "settings",
    label: "Настройки",
    sections: ["company", "commission"],
  },
];

export const SECTION_LABELS: Record<StaffSection, string> = {
  orders: "Заявки",
  currencies: "Валюты",
  reports: "Отчёты",
  compliance: "Онбординг / KYC",
  company: "О компании",
  commission: "Комиссия",
};

export const SECTION_DESCRIPTIONS: Record<StaffSection, string> = {
  orders: "Заявки клиентов на обмен. Просмотр истории, изменение статуса, обработка платежей.",
  currencies: "Список валют, курсы, лимиты, кошельки приёма. Обновление курсов и пар.",
  reports: "Финансовые отчёты для Финнадзора и внутренней аналитики. Экспорт в Excel/PDF.",
  compliance: "Список клиентов с их KYC-статусом. Ручное одобрение или отклонение онбординга.",
  company: "Реквизиты компании, юр. страницы, контент сайта, модули, статус лицензии.",
  commission: "Размер комиссии оператора. Влияет на расчёт курсов в виджете обмена.",
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export function emptyStaffPermissions(): StaffPermissions {
  return Object.fromEntries(
    ALL_SECTIONS.map((s) => [s, { ...allFalse }]),
  ) as StaffPermissions;
}

export function buildPermissions(
  byLevel: Partial<Record<StaffSection, PermissionLevel>>,
): StaffPermissions {
  const result = emptyStaffPermissions();
  for (const section of ALL_SECTIONS) {
    const level = byLevel[section] ?? "none";
    result[section] = sectionPermsFromLevel(level);
  }
  return result;
}

// -----------------------------------------------------------------------------
// Presets
// -----------------------------------------------------------------------------

export interface RolePreset {
  id: string;
  name: string;
  description: string;
  permissions: StaffPermissions;
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: "manager",
    name: "Менеджер заявок",
    description: "Обработка заявок и работа с курсами. Без доступа к комплайнсу и настройкам.",
    permissions: buildPermissions({
      orders: "full",
      currencies: "edit",
      reports: "view",
    }),
  },
  {
    id: "accountant",
    name: "Бухгалтер",
    description: "Отчётность, комиссия, реквизиты компании. Без операционных данных и комплайнса.",
    permissions: buildPermissions({
      reports: "full",
      commission: "edit",
      company: "edit",
    }),
  },
  {
    id: "compliance_officer",
    name: "Комплайнс-офицер",
    description: "Одобрение KYC клиентов. Изолировано от операций и финансов.",
    permissions: buildPermissions({
      compliance: "full",
    }),
  },
  {
    id: "head_cashier",
    name: "Главный кассир",
    description: "Полный доступ ко всему, кроме управления ролями и сотрудниками.",
    permissions: buildPermissions({
      orders: "full",
      currencies: "full",
      reports: "full",
      compliance: "full",
      company: "full",
      commission: "full",
    }),
  },
  {
    id: "auditor",
    name: "Аудитор",
    description: "Только просмотр всех разделов. Аудитор / внешний наблюдатель.",
    permissions: buildPermissions({
      orders: "view",
      currencies: "view",
      reports: "view",
      compliance: "view",
      company: "view",
      commission: "view",
    }),
  },
];
