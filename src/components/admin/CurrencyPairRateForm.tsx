import { useState, useMemo } from "react";
import { Save, Loader2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Currency } from "@/hooks/useCurrencies";
import {
  useAllPairRates,
  useUpsertPairRate,
  useDeletePairRate,
  CurrencyPairRate,
} from "@/hooks/useCurrencyPairRates";
import { toast } from "sonner";

interface CurrencyPairRateFormProps {
  fiatCurrency: Currency;
  cryptoCurrencies: Currency[];
  onClose: () => void;
}

interface LocalEdit {
  buy_rate: string;
  sell_rate: string;
}

const CurrencyPairRateForm = ({
  fiatCurrency,
  cryptoCurrencies,
  onClose,
}: CurrencyPairRateFormProps) => {
  const { data: allRates = [] } = useAllPairRates();
  const upsertMutation = useUpsertPairRate();
  const deleteMutation = useDeletePairRate();

  const existingRates = useMemo(() => {
    const map = new Map<string, CurrencyPairRate>();
    for (const r of allRates) {
      if (r.fiat_currency_id === fiatCurrency.id) {
        map.set(r.crypto_currency_id, r);
      }
    }
    return map;
  }, [allRates, fiatCurrency.id]);

  // Only store user edits; unedited fields use server value as fallback
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<LocalEdit>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const getBuyRate = (cryptoId: string): string => {
    const edit = localEdits[cryptoId];
    if (edit && "buy_rate" in edit) return edit.buy_rate!;
    const existing = existingRates.get(cryptoId);
    return existing?.buy_rate != null ? existing.buy_rate.toString() : "";
  };

  const getSellRate = (cryptoId: string): string => {
    const edit = localEdits[cryptoId];
    if (edit && "sell_rate" in edit) return edit.sell_rate!;
    const existing = existingRates.get(cryptoId);
    return existing?.sell_rate != null ? existing.sell_rate.toString() : "";
  };

  const setField = (cryptoId: string, field: keyof LocalEdit, value: string) => {
    setLocalEdits((prev) => ({
      ...prev,
      [cryptoId]: { ...prev[cryptoId], [field]: value },
    }));
  };

  const handleSave = async (cryptoId: string) => {
    const buyStr = getBuyRate(cryptoId);
    const sellStr = getSellRate(cryptoId);
    const buyVal = buyStr ? parseFloat(buyStr) : null;
    const sellVal = sellStr ? parseFloat(sellStr) : null;

    if (!buyVal && !sellVal) {
      toast.error("Введите хотя бы один курс (покупка или продажа)");
      return;
    }

    setSavingId(cryptoId);
    try {
      await upsertMutation.mutateAsync({
        fiat_currency_id: fiatCurrency.id,
        crypto_currency_id: cryptoId,
        buy_rate: buyVal && buyVal > 0 ? buyVal : null,
        sell_rate: sellVal && sellVal > 0 ? sellVal : null,
      });
      setLocalEdits((prev) => {
        const next = { ...prev };
        delete next[cryptoId];
        return next;
      });
      toast.success("Курсы пары сохранены");
    } catch (err: any) {
      toast.error("Ошибка", { description: err.message });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (cryptoId: string) => {
    const existing = existingRates.get(cryptoId);
    if (!existing) return;

    setSavingId(cryptoId);
    try {
      await deleteMutation.mutateAsync(existing.id);
      setLocalEdits((prev) => {
        const next = { ...prev };
        delete next[cryptoId];
        return next;
      });
      toast.success("Курсы пары удалены (будет использован кросс-курс)");
    } catch (err: any) {
      toast.error("Ошибка", { description: err.message });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Курсы пар: {fiatCurrency.icon} {fiatCurrency.code}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Укажите курс покупки и продажи «1 крипто = ? {fiatCurrency.code}».
        Пустое поле = используется кросс-курс через USD.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Крипто</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">
                Покупка
              </th>
              <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">
                Продажа
              </th>
              <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">Действия</th>
            </tr>
          </thead>
          <tbody>
            {cryptoCurrencies.map((crypto) => {
              const buyRate = getBuyRate(crypto.id);
              const sellRate = getSellRate(crypto.id);
              const isSaving = savingId === crypto.id;
              const hasExisting = existingRates.has(crypto.id);

              return (
                <tr key={crypto.id} className="border-b border-border/30">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{crypto.icon}</span>
                      <span className="font-medium">{crypto.code}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Кросс-курс"
                      value={buyRate}
                      onChange={(e) => setField(crypto.id, "buy_rate", e.target.value)}
                      className="bg-secondary/50 w-32"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Кросс-курс"
                      value={sellRate}
                      onChange={(e) => setField(crypto.id, "sell_rate", e.target.value)}
                      className="bg-secondary/50 w-32"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isSaving || (!buyRate && !sellRate)}
                        onClick={() => handleSave(crypto.id)}
                        title="Сохранить"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                      {hasExisting && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={isSaving}
                          onClick={() => handleDelete(crypto.id)}
                          title="Удалить (вернуть кросс-курс)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CurrencyPairRateForm;
