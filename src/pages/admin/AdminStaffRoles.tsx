import { useState, useMemo } from "react";
import { Loader2, Plus, Edit, Trash2, Save, X, KeyRound, HelpCircle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStaffRoles, useCreateStaffRole, useUpdateStaffRole, useDeleteStaffRole, StaffRole } from "@/hooks/useStaffRoles";
import { StaffPermissions, StaffSection, ALL_SECTIONS, noPermissions } from "@/hooks/useStaffPermissions";
import {
  ROLE_PRESETS,
  SECTION_GROUPS,
  SECTION_LABELS,
  SECTION_DESCRIPTIONS,
  LEVEL_LABELS,
  LEVEL_ORDER,
  PermissionLevel,
  sectionPermsFromLevel,
  levelFromSectionPerms,
} from "@/lib/staffRolePresets";

const ACTION_LABELS = {
  view: "Просмотр",
  edit: "Редактирование",
  create: "Создание",
  delete: "Удаление",
} as const;

const emptyPermissions = (): StaffPermissions => {
  return Object.fromEntries(
    ALL_SECTIONS.map((s) => [s, { view: false, edit: false, create: false, delete: false }]),
  ) as StaffPermissions;
};

interface RoleFormProps {
  initial?: StaffRole;
  onSave: (data: { name: string; description: string; permissions: StaffPermissions }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function RoleForm({ initial, onSave, onCancel, isLoading }: RoleFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [permissions, setPermissions] = useState<StaffPermissions>(
    initial?.permissions || emptyPermissions(),
  );
  const [advancedMode, setAdvancedMode] = useState(false);

  const sectionLevels = useMemo(
    () => Object.fromEntries(
      ALL_SECTIONS.map((s) => [s, levelFromSectionPerms(permissions[s])]),
    ) as Record<StaffSection, PermissionLevel>,
    [permissions],
  );

  const setSectionLevel = (section: StaffSection, level: PermissionLevel) => {
    setPermissions((prev) => ({
      ...prev,
      [section]: sectionPermsFromLevel(level),
    }));
  };

  const togglePermission = (section: StaffSection, action: keyof typeof ACTION_LABELS) => {
    setPermissions((prev) => {
      const next = { ...prev[section], [action]: !prev[section][action] };
      // Cascade: removing «view» also removes everything else (no point being able
      // to edit something you can't see). Granting any higher action implies «view».
      if (action === "view" && !next.view) {
        next.edit = false;
        next.create = false;
        next.delete = false;
      } else if (action !== "view" && next[action]) {
        next.view = true;
      }
      return { ...prev, [section]: next };
    });
  };

  const applyPreset = (presetPermissions: StaffPermissions) => {
    setPermissions(presetPermissions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description, permissions });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="admin-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {initial ? "Редактировать роль" : "Новая роль"}
          </h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Presets */}
          {!initial && (
            <div>
              <Label className="mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Готовые шаблоны
              </Label>
              <div className="flex flex-wrap gap-2">
                {ROLE_PRESETS.map((preset) => (
                  <Tooltip key={preset.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          applyPreset(preset.permissions);
                          if (!name) setName(preset.name);
                          if (!description) setDescription(preset.description);
                        }}
                        className="px-3 py-1.5 text-sm rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-border transition-colors"
                      >
                        {preset.name}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-xs">{preset.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Один клик заполняет матрицу ниже. После этого можно поменять любой раздел вручную.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="role-name">Название</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Менеджер заявок"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="role-desc">Описание</Label>
              <Textarea
                id="role-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Кому даётся эта роль и зачем"
                rows={1}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Доступ к разделам</Label>
              <button
                type="button"
                onClick={() => setAdvancedMode((v) => !v)}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                {advancedMode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {advancedMode ? "Простой режим" : "Расширенно (поэлементно)"}
              </button>
            </div>

            {!advancedMode ? (
              <div className="space-y-5">
                {SECTION_GROUPS.map((group) => (
                  <div key={group.key}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                      {group.label}
                    </div>
                    <div className="space-y-1.5">
                      {group.sections.map((section) => (
                        <div
                          key={section}
                          className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="text-sm truncate">{SECTION_LABELS[section]}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="text-xs">{SECTION_DESCRIPTIONS[section]}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Select
                            value={sectionLevels[section]}
                            onValueChange={(v) => setSectionLevel(section, v as PermissionLevel)}
                          >
                            <SelectTrigger className="w-44 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LEVEL_ORDER.map((level) => (
                                <SelectItem key={level} value={level} className="text-xs">
                                  {LEVEL_LABELS[level]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Секция</th>
                      {Object.entries(ACTION_LABELS).map(([key, label]) => (
                        <th key={key} className="text-center py-2 px-3 font-medium text-muted-foreground">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SECTION_GROUPS.map((group) => (
                      <>
                        <tr key={`group-${group.key}`}>
                          <td colSpan={5} className="pt-4 pb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                            {group.label}
                          </td>
                        </tr>
                        {group.sections.map((section) => (
                          <tr key={section} className="border-b border-border/30 hover:bg-secondary/20">
                            <td className="py-2 px-3 font-medium">
                              <div className="flex items-center gap-2">
                                {SECTION_LABELS[section]}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    <p className="text-xs">{SECTION_DESCRIPTIONS[section]}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                            {(Object.keys(ACTION_LABELS) as Array<keyof typeof ACTION_LABELS>).map((action) => (
                              <td key={action} className="text-center py-2 px-3">
                                <input
                                  type="checkbox"
                                  checked={permissions[section]?.[action] || false}
                                  onChange={() => togglePermission(section, action)}
                                  className="w-4 h-4 rounded border-border cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Просмотр снимается каскадно — без него остальные действия теряют смысл и тоже отключаются.
                  Любое действие выше «Просмотра» автоматически включает его.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" variant="gradient" className="flex-1" disabled={isLoading || !name.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Сохранить
            </Button>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}

export default function AdminStaffRoles() {
  const { data: roles = [], isLoading } = useStaffRoles();
  const createRole = useCreateStaffRole();
  const updateRole = useUpdateStaffRole();
  const deleteRole = useDeleteStaffRole();
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);

  const handleCreate = (data: { name: string; description: string; permissions: StaffPermissions }) => {
    createRole.mutate(data, {
      onSuccess: () => {
        setShowForm(false);
      },
    });
  };

  const handleUpdate = (data: { name: string; description: string; permissions: StaffPermissions }) => {
    if (!editingRole) return;
    updateRole.mutate({ id: editingRole.id, ...data }, {
      onSuccess: () => {
        setEditingRole(null);
        setShowForm(false);
      },
    });
  };

  const handleDelete = (role: StaffRole) => {
    if (!confirm(`Удалить роль "${role.name}"? Сотрудники с этой ролью потеряют доступ.`)) return;
    deleteRole.mutate(role.id);
  };

  const countPermissions = (perms: StaffPermissions): number => {
    return ALL_SECTIONS.reduce((acc, s) => {
      const sp = perms[s];
      return acc + (sp ? Object.values(sp).filter(Boolean).length : 0);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="admin-card max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Роли сотрудников</h2>
            <p className="text-sm text-muted-foreground">Управление ролями и правами доступа</p>
          </div>
        </div>
        <Button
          variant="gradient"
          onClick={() => { setEditingRole(null); setShowForm(true); }}
          disabled={showForm}
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать роль
        </Button>
      </div>

      {showForm && (
        <RoleForm
          initial={editingRole || undefined}
          onSave={editingRole ? handleUpdate : handleCreate}
          onCancel={() => { setShowForm(false); setEditingRole(null); }}
          isLoading={createRole.isPending || updateRole.isPending}
        />
      )}

      {roles.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-7 h-7 text-muted-foreground/60" />
          </div>
          <p className="text-muted-foreground font-medium">Нет созданных ролей</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Создайте первую роль для сотрудников</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors"
            >
              <div>
                <div className="font-medium">{role.name}</div>
                {role.description && (
                  <div className="text-sm text-muted-foreground mt-0.5">{role.description}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  Прав: {countPermissions(role.permissions)} из {ALL_SECTIONS.length * 4}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:text-primary"
                  onClick={() => { setEditingRole(role); setShowForm(true); }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(role)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
