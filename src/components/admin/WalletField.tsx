import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export interface WalletEntry {
  number: string;
  currency: string;
  system: string;
  bank: string;
}

export const emptyWallet: WalletEntry = { number: "", currency: "", system: "", bank: "" };

interface WalletFieldProps {
  label: string;
  values: WalletEntry[];
  onChange: (values: WalletEntry[]) => void;
}

const WalletField = ({ label, values, onChange }: WalletFieldProps) => {
  const update = (index: number, field: keyof WalletEntry, value: string) => {
    const updated = [...values];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const add = () => onChange([...values, { ...emptyWallet }]);

  const remove = (index: number) => {
    const updated = values.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated : [{ ...emptyWallet }]);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      {values.map((entry, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
          <div>
            {index === 0 && <span className="text-xs text-muted-foreground">№ кошелька</span>}
            <Input
              value={entry.number}
              onChange={(e) => update(index, "number", e.target.value)}
              placeholder="Номер кошелька"
            />
          </div>
          <div>
            {index === 0 && <span className="text-xs text-muted-foreground">Валюта</span>}
            <Input
              value={entry.currency}
              onChange={(e) => update(index, "currency", e.target.value)}
              placeholder="KGS, USD…"
            />
          </div>
          <div>
            {index === 0 && <span className="text-xs text-muted-foreground">Система эл. денег</span>}
            <Input
              value={entry.system}
              onChange={(e) => update(index, "system", e.target.value)}
              placeholder="О!Деньги, Элсом…"
            />
          </div>
          <div>
            {index === 0 && <span className="text-xs text-muted-foreground">Реквизиты банка</span>}
            <Input
              value={entry.bank}
              onChange={(e) => update(index, "bank", e.target.value)}
              placeholder="Банк, БИК…"
            />
          </div>
          <div>
            {index === 0 && <span className="text-xs text-muted-foreground opacity-0">—</span>}
            {values.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
        <Plus className="w-4 h-4" />
        Добавить ещё
      </Button>
    </div>
  );
};

export default WalletField;
