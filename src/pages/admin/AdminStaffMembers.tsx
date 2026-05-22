import { useState } from "react";
import { Loader2, Plus, UserCog, X, Save, Power, PowerOff, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStaffMembers, useCreateStaffMember, useUpdateStaffMember, StaffMember } from "@/hooks/useStaffMembers";
import { useStaffRoles, StaffRole } from "@/hooks/useStaffRoles";

interface AddStaffFormProps {
  onCancel: () => void;
}

function AddStaffForm({ onCancel }: AddStaffFormProps) {
  const { data: roles = [] } = useStaffRoles();
  const createMember = useCreateStaffMember();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [staffRoleId, setStaffRoleId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMember.mutate(
      { email, password, displayName, staffRoleId },
      { onSuccess: () => onCancel() }
    );
  };

  return (
    <div className="admin-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Добавить сотрудника</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="staff-password">Пароль</Label>
            <Input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              minLength={6}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="staff-name">Имя</Label>
            <Input
              id="staff-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Иван Иванов"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="staff-role">Роль</Label>
            <select
              id="staff-role"
              value={staffRoleId}
              onChange={(e) => setStaffRoleId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm mt-1"
            >
              <option value="">Выберите роль...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {roles.length === 0 && (
          <p className="text-sm text-amber-400">
            Сначала создайте хотя бы одну роль в разделе «Роли».
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Отмена
          </Button>
          <Button
            type="submit"
            variant="gradient"
            className="flex-1"
            disabled={createMember.isPending || !staffRoleId || roles.length === 0}
          >
            {createMember.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Создать
          </Button>
        </div>
      </form>
    </div>
  );
}

interface EditStaffFormProps {
  member: StaffMember;
  roles: StaffRole[];
  onCancel: () => void;
}

function EditStaffForm({ member, roles, onCancel }: EditStaffFormProps) {
  const updateMember = useUpdateStaffMember();
  const [displayName, setDisplayName] = useState(member.display_name);
  const [staffRoleId, setStaffRoleId] = useState(member.staff_role_id);
  const [isActive, setIsActive] = useState(member.is_active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMember.mutate(
      { id: member.id, display_name: displayName, staff_role_id: staffRoleId, is_active: isActive },
      { onSuccess: () => onCancel() }
    );
  };

  return (
    <div className="admin-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Редактировать сотрудника</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="edit-name">Имя</Label>
            <Input
              id="edit-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Иван Иванов"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="edit-role">Роль</Label>
            <select
              id="edit-role"
              value={staffRoleId}
              onChange={(e) => setStaffRoleId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm mt-1"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">Активен</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Отмена
          </Button>
          <Button
            type="submit"
            variant="gradient"
            className="flex-1"
            disabled={updateMember.isPending}
          >
            {updateMember.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Сохранить
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AdminStaffMembers() {
  const { data: members = [], isLoading } = useStaffMembers();
  const { data: roles = [] } = useStaffRoles();
  const updateMember = useUpdateStaffMember();
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);

  const toggleActive = (member: StaffMember) => {
    updateMember.mutate({ id: member.id, is_active: !member.is_active });
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
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <UserCog className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Сотрудники</h2>
            <p className="text-sm text-muted-foreground">Управление персоналом</p>
          </div>
        </div>
        <Button
          variant="gradient"
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      {showForm && <AddStaffForm onCancel={() => setShowForm(false)} />}
      {editingMember && (
        <EditStaffForm
          member={editingMember}
          roles={roles}
          onCancel={() => setEditingMember(null)}
        />
      )}

      {members.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
            <UserCog className="w-7 h-7 text-muted-foreground/60" />
          </div>
          <p className="text-muted-foreground font-medium">Нет сотрудников</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Добавьте первого сотрудника</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Имя</th>
                <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Роль</th>
                <th className="text-center py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Статус</th>
                <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Дата</th>
                <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-border hover:bg-muted transition-colors">
                  <td className="py-4 px-5">
                    <div className="font-medium">{member.display_name}</div>
                  </td>
                  <td className="py-4 px-5 text-sm">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {member.role_name}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${
                      member.is_active
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {member.is_active ? "Активен" : "Отключён"}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-sm text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-primary"
                        onClick={() => { setEditingMember(member); setShowForm(false); }}
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleActive(member)}
                        title={member.is_active ? "Отключить" : "Включить"}
                      >
                        {member.is_active ? (
                          <PowerOff className="w-4 h-4 text-destructive" />
                        ) : (
                          <Power className="w-4 h-4 text-green-400" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
