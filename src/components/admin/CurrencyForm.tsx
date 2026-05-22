import { useState, useMemo } from "react";
import { X, Save, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Currency, BankAccount } from "@/hooks/useCurrencies";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { parseNetworkWallets } from "./NetworkWalletField";
import { toast } from "sonner";

/** Parse the existing network field into an array */
const parseNetworkField = (network: string | null | undefined): string[] => {
  if (!network) return [];
  const trimmed = network.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch { /* fall through */ }
  }
  return trimmed.split(',').map(s => s.trim()).filter(Boolean);
};

/** Serialize network array back to JSON string for DB */
const serializeNetworks = (networks: string[]): string | null => {
  if (networks.length === 0) return null;
  return JSON.stringify(networks);
};

interface CurrencyFormProps {
  currency?: Currency | null;
  onSave: (data: Partial<Currency>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const CurrencyForm = ({ currency, onSave, onCancel, isLoading }: CurrencyFormProps) => {
  const { data: companySettings } = useCompanySettings();

  // Available networks = only those with a wallet configured in company settings
  const availableNetworks = useMemo(() => {
    if (!companySettings?.manual_wallet_address) return [];
    const wallets = parseNetworkWallets(companySettings.manual_wallet_address);
    return wallets
      .filter(w => w.network && w.address)
      .map(w => w.network);
  }, [companySettings?.manual_wallet_address]);

  const [formData, setFormData] = useState({
    code: currency?.code || "",
    name: currency?.name || "",
    icon: currency?.icon || "",
    type: currency?.type || "crypto" as "crypto" | "fiat",
    rate_to_usd: currency?.rate_to_usd?.toString() || "1",
    min_amount: currency?.min_amount?.toString() || "0",
    max_amount: currency?.max_amount?.toString() || "1000000",
    sort_order: currency?.sort_order?.toString() || "0",
    is_active: currency?.is_active ?? true,
  });

  const [networks, setNetworks] = useState<string[]>(
    parseNetworkField(currency?.network)
  );

  type BankEntry = { bank_name: string; account_number: string; swift: string; bik: string };
  const emptyBank = (): BankEntry => ({ bank_name: '', account_number: '', swift: '', bik: '' });

  const [bankAccounts, setBankAccounts] = useState<BankEntry[]>(() => {
    const ba = currency?.bank_accounts;
    if (!ba) return [];
    const result: BankEntry[] = [];
    if (ba.bank_name || ba.account_number) {
      result.push({ bank_name: ba.bank_name || '', account_number: ba.account_number || '', swift: ba.swift || '', bik: ba.bik || '' });
    }
    ba.extra_banks?.forEach(b => result.push({ bank_name: b.bank_name || '', account_number: b.account_number || '', swift: b.swift || '', bik: b.bik || '' }));
    return result;
  });

  const [foreignAccounts, setForeignAccounts] = useState<BankEntry[]>(() => {
    const ba = currency?.bank_accounts;
    if (!ba) return [];
    const result: BankEntry[] = [];
    if (ba.foreign && (ba.foreign.bank_name || ba.foreign.account_number)) {
      result.push({ bank_name: ba.foreign.bank_name || '', account_number: ba.foreign.account_number || '', swift: ba.foreign.swift || '', bik: ba.foreign.bik || '' });
    }
    ba.extra_foreign?.forEach(b => result.push({ bank_name: b.bank_name || '', account_number: b.account_number || '', swift: b.swift || '', bik: b.bik || '' }));
    return result;
  });

  const [eWallets, setEWallets] = useState<Array<{ system: string; number: string; bank: string }>>(() => {
    const ew = currency?.bank_accounts?.e_wallets;
    if (Array.isArray(ew) && ew.length > 0) {
      return ew.map(w => ({ system: w.system || '', number: w.number || '', bank: w.bank || '' }));
    }
    return [];
  });

  const addNetwork = (net: string) => {
    const trimmed = net.trim();
    if (trimmed && !networks.includes(trimmed)) {
      setNetworks([...networks, trimmed]);
    }
  };

  const removeNetwork = (net: string) => {
    setNetworks(networks.filter(n => n !== net));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filledBanks = bankAccounts.filter(b => b.bank_name || b.account_number);
    const filledForeign = foreignAccounts.filter(b => b.bank_name || b.account_number);
    const filledWallets = eWallets.filter(w => w.system || w.number);

    let bankAccountJson: any = null;
    if (formData.type === "fiat" && (filledBanks.length > 0 || filledForeign.length > 0 || filledWallets.length > 0)) {
      const toSave: any = {};
      if (filledBanks.length > 0) {
        const [first, ...rest] = filledBanks;
        toSave.bank_name = first.bank_name;
        toSave.account_number = first.account_number;
        if (first.swift) toSave.swift = first.swift;
        if (first.bik) toSave.bik = first.bik;
        if (rest.length > 0) toSave.extra_banks = rest;
      }
      if (filledForeign.length > 0) {
        const [first, ...rest] = filledForeign;
        toSave.foreign = first;
        if (rest.length > 0) toSave.extra_foreign = rest;
      }
      if (filledWallets.length > 0) {
        toSave.e_wallets = filledWallets.map(w => {
          const entry: any = { system: w.system, number: w.number };
          if (w.bank) entry.bank = w.bank;
          return entry;
        });
      }
      bankAccountJson = JSON.stringify(toSave);
    }

    const rate = parseFloat(formData.rate_to_usd);
    const min = parseFloat(formData.min_amount);
    const max = parseFloat(formData.max_amount);
    if (!rate || rate <= 0) { toast.error("Курс должен быть больше 0"); return; }
    if (min < 0 || max < 0) { toast.error("Суммы не могут быть отрицательными"); return; }
    if (min > max && max > 0) { toast.error("Мин. сумма не может быть больше макс."); return; }

    await onSave({
      code: formData.code.toUpperCase(),
      name: formData.name,
      icon: formData.icon,
      type: formData.type as "crypto" | "fiat",
      rate_to_usd: rate,
      min_amount: min,
      max_amount: max,
      sort_order: parseInt(formData.sort_order),
      is_active: formData.is_active,
      network: serializeNetworks(networks),
      bank_accounts: bankAccountJson,
    } as any);
  };

  return (
    <div className="glass-card rounded-xl p-6 border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          {currency ? "Редактировать валюту" : "Добавить валюту"}
        </h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="code">Код</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="BTC"
              className="bg-secondary/50"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="icon">Иконка</Label>
            <Input
              id="icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="₿"
              className="bg-secondary/50"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Название</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Bitcoin"
            className="bg-secondary/50"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Тип</Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as "crypto" | "fiat" })}
              className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm"
            >
              <option value="crypto">Криптовалюта</option>
              <option value="fiat">Фиат</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate_to_usd">Курс к USD</Label>
            <Input
              id="rate_to_usd"
              type="number"
              step="any"
              value={formData.rate_to_usd}
              onChange={(e) => setFormData({ ...formData, rate_to_usd: e.target.value })}
              className="bg-secondary/50"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min_amount">Мин. сумма</Label>
            <Input
              id="min_amount"
              type="number"
              step="any"
              value={formData.min_amount}
              onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
              className="bg-secondary/50"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_amount">Макс. сумма</Label>
            <Input
              id="max_amount"
              type="number"
              step="any"
              value={formData.max_amount}
              onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
              className="bg-secondary/50"
              required
            />
          </div>
        </div>

        {formData.type === "crypto" && (
          <div className="space-y-2">
            <Label>Поддерживаемые сети</Label>
            {networks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {networks.map((net) => (
                  <Badge key={net} variant="secondary" className="gap-1 pr-1">
                    {net}
                    <button
                      type="button"
                      onClick={() => removeNetwork(net)}
                      className="ml-1 p-0.5 rounded hover:bg-destructive/20 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {availableNetworks.filter(n => !networks.includes(n)).length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {availableNetworks.filter(n => !networks.includes(n)).map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => addNetwork(net)}
                    className="text-xs px-2 py-1 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + {net}
                  </button>
                ))}
              </div>
            ) : availableNetworks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Сначала добавьте кошельки в разделе «Информация о компании» → «Кошелёк для приёма платежей»
              </p>
            ) : null}
          </div>
        )}

        {formData.type === "fiat" && (
          <div className="space-y-3">
            {bankAccounts.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <Label>Банковские счета</Label>
                  <button type="button" onClick={() => setBankAccounts([])} className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1">
                    <X className="w-3 h-3" /> Убрать все
                  </button>
                </div>
                {bankAccounts.map((ba, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border/50 bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Счёт {idx + 1}</span>
                      <button type="button" onClick={() => setBankAccounts(bankAccounts.filter((_, i) => i !== idx))} className="text-xs text-destructive hover:text-destructive/80">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input value={ba.bank_name} onChange={(e) => { const u = [...bankAccounts]; u[idx] = { ...u[idx], bank_name: e.target.value }; setBankAccounts(u); }} placeholder="Название банка" className="bg-background/50" />
                    <Input value={ba.account_number} onChange={(e) => { const u = [...bankAccounts]; u[idx] = { ...u[idx], account_number: e.target.value }; setBankAccounts(u); }} placeholder="Номер счёта / IBAN" className="bg-background/50" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={ba.swift} onChange={(e) => { const u = [...bankAccounts]; u[idx] = { ...u[idx], swift: e.target.value }; setBankAccounts(u); }} placeholder="SWIFT" className="bg-background/50" />
                      <Input value={ba.bik} onChange={(e) => { const u = [...bankAccounts]; u[idx] = { ...u[idx], bik: e.target.value }; setBankAccounts(u); }} placeholder="БИК" className="bg-background/50" />
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setBankAccounts([...bankAccounts, emptyBank()])}>
                  <Plus className="w-4 h-4 mr-1" /> Ещё счёт
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setBankAccounts([emptyBank()])}>
                <Plus className="w-4 h-4 mr-1" /> Добавить банковский счёт
              </Button>
            )}

            {foreignAccounts.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Счета за границей</Label>
                  <button type="button" onClick={() => setForeignAccounts([])} className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1">
                    <X className="w-3 h-3" /> Убрать все
                  </button>
                </div>
                {foreignAccounts.map((fa, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-dashed border-border/50 bg-secondary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Счёт {idx + 1}</span>
                      <button type="button" onClick={() => setForeignAccounts(foreignAccounts.filter((_, i) => i !== idx))} className="text-xs text-destructive hover:text-destructive/80">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input value={fa.bank_name} onChange={(e) => { const u = [...foreignAccounts]; u[idx] = { ...u[idx], bank_name: e.target.value }; setForeignAccounts(u); }} placeholder="Название банка" className="bg-background/50" />
                    <Input value={fa.account_number} onChange={(e) => { const u = [...foreignAccounts]; u[idx] = { ...u[idx], account_number: e.target.value }; setForeignAccounts(u); }} placeholder="Номер счёта / IBAN" className="bg-background/50" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={fa.swift} onChange={(e) => { const u = [...foreignAccounts]; u[idx] = { ...u[idx], swift: e.target.value }; setForeignAccounts(u); }} placeholder="SWIFT" className="bg-background/50" />
                      <Input value={fa.bik} onChange={(e) => { const u = [...foreignAccounts]; u[idx] = { ...u[idx], bik: e.target.value }; setForeignAccounts(u); }} placeholder="БИК" className="bg-background/50" />
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setForeignAccounts([...foreignAccounts, emptyBank()])}>
                  <Plus className="w-4 h-4 mr-1" /> Ещё счёт
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setForeignAccounts([emptyBank()])}>
                <Plus className="w-4 h-4 mr-1" /> Добавить счёт за границей
              </Button>
            )}

            {eWallets.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Электронные кошельки</Label>
                  <button type="button" onClick={() => setEWallets([])} className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1">
                    <X className="w-3 h-3" /> Убрать все
                  </button>
                </div>
                {eWallets.map((ew, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-dashed border-border/50 bg-secondary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Кошелёк {idx + 1}</span>
                      <button type="button" onClick={() => setEWallets(eWallets.filter((_, i) => i !== idx))} className="text-xs text-destructive hover:text-destructive/80">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input value={ew.system} onChange={(e) => { const u = [...eWallets]; u[idx] = { ...u[idx], system: e.target.value }; setEWallets(u); }} placeholder="Система (Элсом, О!Деньги...)" className="bg-background/50" />
                    <Input value={ew.number} onChange={(e) => { const u = [...eWallets]; u[idx] = { ...u[idx], number: e.target.value }; setEWallets(u); }} placeholder="Номер кошелька" className="bg-background/50" />
                    <Input value={ew.bank} onChange={(e) => { const u = [...eWallets]; u[idx] = { ...u[idx], bank: e.target.value }; setEWallets(u); }} placeholder="Банк (опционально)" className="bg-background/50" />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setEWallets([...eWallets, { system: '', number: '', bank: '' }])}>
                  <Plus className="w-4 h-4 mr-1" /> Ещё кошелёк
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setEWallets([{ system: '', number: '', bank: '' }])}>
                <Plus className="w-4 h-4 mr-1" /> Добавить электронный кошелёк
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sort_order">Порядок сортировки</Label>
            <Input
              id="sort_order"
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
              className="bg-secondary/50"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Статус</Label>
            <div className="flex items-center gap-3 h-10">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Активна</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Отмена
          </Button>
          <Button type="submit" variant="gradient" className="flex-1" disabled={isLoading}>
            {isLoading ? (
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
};

export default CurrencyForm;
