import { useState } from "react";
import { Loader2, RefreshCw, Banknote, Bitcoin, Edit, Check, X, Coins, ArrowLeftRight, ListPlus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAllCurrencies } from "@/hooks/useAllCurrencies";
import { Currency } from "@/hooks/useCurrencies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CurrencyRateForm from "@/components/admin/CurrencyRateForm";
import CurrencyPairRateForm from "@/components/admin/CurrencyPairRateForm";
import { RequirePermission } from "@/components/admin/RequirePermission";
import CurrencyDefinitionsManager from "@/components/admin/CurrencyDefinitionsManager";
import CurrencyIcon from "@/components/ui/CurrencyIcon";

const formatNumber = (num: number) => {
  if (num < 0.0001) return num.toFixed(8);
  if (num < 1) return num.toFixed(4);
  return num.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
};

export default function AdminCurrencies() {
  const { data: currencies = [], isLoading, refetch } = useAllCurrencies();
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [pairRateFiat, setPairRateFiat] = useState<Currency | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [topTab, setTopTab] = useState<"list" | "rates">("list");
  const [ratesTab, setRatesTab] = useState<"fiat" | "crypto">("fiat");

  const fiatCurrencies = currencies.filter((c) => c.type === "fiat");
  const cryptoCurrencies = currencies.filter((c) => c.type === "crypto");

  const handleSaveRate = async (data: { rate_to_usd: number; min_amount: number; max_amount: number }) => {
    if (!editingCurrency) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("currencies")
        .update(data)
        .eq("id", editingCurrency.id);
      if (error) throw error;
      toast.success("Курс обновлён");
      setEditingCurrency(null);
      refetch();
    } catch (error: any) {
      toast.error("Ошибка", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const renderTable = (items: Currency[], showPairRateButton = false) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Валюта</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Тип</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Курс USD</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Мин</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Макс</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Статус</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((currency) => (
            <tr key={currency.id} className="border-b border-border hover:bg-muted/50 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <CurrencyIcon currency={currency} size="md" />
                  <div>
                    <div className="font-semibold">{currency.code}</div>
                    <div className="text-sm text-muted-foreground">{currency.name}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                  currency.type === "crypto"
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                }`}>
                  {currency.type === "crypto" ? "Крипто" : "Фиат"}
                </span>
              </td>
              <td className="py-3 px-4 text-right font-mono">
                {formatNumber(currency.rate_to_usd)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm">
                {formatNumber(currency.min_amount)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm">
                {formatNumber(currency.max_amount)}
              </td>
              <td className="py-3 px-4 text-center">
                {currency.is_active ? (
                  <Check className="w-5 h-5 text-green-400 mx-auto" />
                ) : (
                  <X className="w-5 h-5 text-destructive mx-auto" />
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingCurrency(currency)}
                    className="h-8 w-8"
                    title="Редактировать курс"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {showPairRateButton && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPairRateFiat(currency)}
                      className="h-8 w-8"
                      title="Курсы пар"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <RequirePermission section="currencies">
      <Tabs value={topTab} onValueChange={(v) => setTopTab(v as "list" | "rates")}>
        <TabsList className="mb-6">
          <TabsTrigger value="list" className="gap-2">
            <ListPlus className="w-4 h-4" />
            Список валют
          </TabsTrigger>
          <TabsTrigger value="rates" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Курсы и лимиты
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <CurrencyDefinitionsManager />
        </TabsContent>

        <TabsContent value="rates">
          <div className="admin-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Курсы валют</h2>
                  <p className="text-sm text-muted-foreground">Курсы, комиссии и лимиты</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="border-border text-foreground hover:text-foreground hover:bg-muted"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Обновить
              </Button>
            </div>

            {editingCurrency && (
              <div className="mb-6">
                <CurrencyRateForm
                  currency={editingCurrency}
                  onSave={handleSaveRate}
                  onCancel={() => setEditingCurrency(null)}
                  isLoading={isSaving}
                />
              </div>
            )}

            {pairRateFiat && (
              <div className="mb-6">
                <CurrencyPairRateForm
                  fiatCurrency={pairRateFiat}
                  cryptoCurrencies={cryptoCurrencies}
                  onClose={() => setPairRateFiat(null)}
                />
              </div>
            )}

            <Tabs value={ratesTab} onValueChange={(v) => setRatesTab(v as "fiat" | "crypto")}>
              <TabsList className="mb-4">
                <TabsTrigger value="fiat" className="gap-2">
                  <Banknote className="w-4 h-4" />
                  Фиат ({fiatCurrencies.length})
                </TabsTrigger>
                <TabsTrigger value="crypto" className="gap-2">
                  <Bitcoin className="w-4 h-4" />
                  Крипто ({cryptoCurrencies.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fiat">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : fiatCurrencies.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Нет фиатных валют. Добавь их во вкладке «Список валют».
                  </div>
                ) : (
                  renderTable(fiatCurrencies, true)
                )}
              </TabsContent>

              <TabsContent value="crypto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : cryptoCurrencies.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Нет криптовалют. Добавь их во вкладке «Список валют».
                  </div>
                ) : (
                  renderTable(cryptoCurrencies)
                )}
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </RequirePermission>
  );
}
