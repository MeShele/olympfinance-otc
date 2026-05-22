import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Star, Save, Users } from "lucide-react";
import {
  useLiquidityProviders,
  useSaveLiquidityProvider,
  useDeleteLiquidityProvider,
  useSetDefaultProvider,
  LiquidityProvider,
} from "@/hooks/useLiquidityProviders";

const emptyProvider = { name: "", inn: "", residency: "резидент КР", wallet: "" };

const LiquidityProvidersSection = () => {
  const { data: providers = [], isLoading } = useLiquidityProviders();
  const { mutate: save, isPending: isSaving } = useSaveLiquidityProvider();
  const { mutate: remove } = useDeleteLiquidityProvider();
  const { mutate: setDefault } = useSetDefaultProvider();
  const [editing, setEditing] = useState<Partial<LiquidityProvider> | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleSave = () => {
    if (!editing) return;
    save(
      { ...editing, is_default: providers.length === 0 ? true : editing.is_default ?? false },
      { onSuccess: () => setEditing(null) }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Поставщики ликвидности</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing({ ...emptyProvider })}
          disabled={!!editing}
        >
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Поставщик «по умолчанию» используется в отчётах Финнадзора (Приложение 6/о).
      </p>

      {/* Existing providers */}
      {providers.map((p) => (
        <div
          key={p.id}
          className="border border-border/50 rounded-lg p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{p.name || "—"}</span>
              {p.is_default && (
                <Badge variant="secondary" className="text-xs">По умолчанию</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!p.is_default && (
                <Button size="sm" variant="ghost" onClick={() => setDefault(p.id)} title="Сделать по умолчанию">
                  <Star className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(p)}
                disabled={!!editing}
              >
                Изменить
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => remove(p.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>ИНН: {p.inn || "—"}</span>
            <span>Резидентство: {p.residency}</span>
            <span className="col-span-2 truncate">Кошелёк: {p.wallet || "—"}</span>
          </div>
        </div>
      ))}

      {providers.length === 0 && !editing && (
        <p className="text-sm text-muted-foreground italic">Нет поставщиков. Нажмите «Добавить».</p>
      )}

      {/* Edit / Add form */}
      {editing && (
        <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-muted/30">
          <h4 className="text-sm font-semibold">{editing.id ? "Редактирование" : "Новый поставщик"}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-sm">Название</Label>
              <Input
                value={editing.name || ""}
                onChange={(e) => setEditing((p) => ({ ...p!, name: e.target.value }))}
                placeholder="ОсОО «Ликвид»"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">ИНН</Label>
              <Input
                value={editing.inn || ""}
                onChange={(e) => setEditing((p) => ({ ...p!, inn: e.target.value }))}
                placeholder="01234567890123"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Резидентство</Label>
              <Input
                value={editing.residency || ""}
                onChange={(e) => setEditing((p) => ({ ...p!, residency: e.target.value }))}
                placeholder="резидент КР"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Кошелёк</Label>
              <Input
                value={editing.wallet || ""}
                onChange={(e) => setEditing((p) => ({ ...p!, wallet: e.target.value }))}
                placeholder="T..."
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Сохранить
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
              Отмена
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityProvidersSection;
