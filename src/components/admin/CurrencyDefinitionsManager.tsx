import { useState } from "react";
import { Loader2, RefreshCw, Banknote, Bitcoin, Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAllCurrencies } from "@/hooks/useAllCurrencies";
import { Currency } from "@/hooks/useCurrencies";
import { useOperatorId } from "@/hooks/useOperatorId";
import { useHasPermission } from "@/hooks/useStaffPermissions";
import CurrencyDefinitionForm from "./CurrencyDefinitionForm";
import CurrencyTable from "./CurrencyTable";

/**
 * Add / edit / delete currencies (the "definitions" — code, name,
 * icon, type, networks, bank accounts). Rate / commission / limit
 * editing lives on a different tab — see AdminCurrencies.
 */
export default function CurrencyDefinitionsManager() {
  const operatorId = useOperatorId();
  const { data: currencies = [], isLoading, refetch } = useAllCurrencies();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState<"fiat" | "crypto">("fiat");

  const canCreate = useHasPermission("currencies", "create");
  const canEdit = useHasPermission("currencies", "edit");
  const canDelete = useHasPermission("currencies", "delete");

  const fiat = currencies.filter((c) => c.type === "fiat");
  const crypto = currencies.filter((c) => c.type === "crypto");

  const handleSave = async (data: Partial<Currency>) => {
    setIsSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("currencies")
          .update(data as any)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Валюта обновлена");
      } else {
        const { error } = await supabase
          .from("currencies")
          .insert({ ...data, operator_id: operatorId } as any);
        if (error) throw error;
        toast.success("Валюта добавлена");
      }
      setShowForm(false);
      setEditing(null);
      refetch();
    } catch (e: any) {
      toast.error("Ошибка", { description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (c: Currency) => {
    setEditing(c);
    setShowForm(true);
  };

  const handleDelete = async (c: Currency) => {
    if (!confirm(`Удалить валюту ${c.code}?`)) return;
    try {
      const { error } = await supabase.from("currencies").delete().eq("id", c.id);
      if (error) throw error;
      toast.success("Валюта удалена");
      refetch();
    } catch (e: any) {
      toast.error("Ошибка", { description: e.message });
    }
  };

  return (
    <div className="admin-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Список валют</h3>
            <p className="text-sm text-muted-foreground">Добавление, редактирование, удаление валют</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          {canCreate && (
            <Button
              variant="gradient"
              size="sm"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <CurrencyDefinitionForm
            currency={editing}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            isLoading={isSaving}
          />
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "fiat" | "crypto")}>
        <TabsList className="mb-4">
          <TabsTrigger value="fiat" className="gap-2">
            <Banknote className="w-4 h-4" />
            Фиат ({fiat.length})
          </TabsTrigger>
          <TabsTrigger value="crypto" className="gap-2">
            <Bitcoin className="w-4 h-4" />
            Крипто ({crypto.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fiat">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : fiat.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Нет фиатных валют.</div>
          ) : (
            <CurrencyTable
              currencies={fiat}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDelete : undefined}
            />
          )}
        </TabsContent>

        <TabsContent value="crypto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : crypto.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Нет криптовалют.</div>
          ) : (
            <CurrencyTable
              currencies={crypto}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDelete : undefined}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
