import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Download, Loader2, FileText, AlertCircle } from "lucide-react";
import { setMonth, setYear } from "date-fns";
import { generateFinnadzorReport } from "@/utils/reports/finnadzorReport";
import { generateCoverLetter } from "@/utils/reports/coverLetterGenerator";
import { useReportData } from "@/hooks/useReportData";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useComplianceData } from "@/hooks/useComplianceData";
import { useOperatorId } from "@/hooks/useOperatorId";
import { useDefaultLiquidityProvider } from "@/hooks/useLiquidityProviders";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Currency {
  code: string;
  type: string;
  bank_accounts?: any;
}

interface ReportGeneratorProps {
  currencies: Currency[];
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const ReportGenerator = ({ currencies }: ReportGeneratorProps) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [outgoingNumber, setOutgoingNumber] = useState('');
  const [outgoingDay, setOutgoingDay] = useState('');
  const { data: orders = [] } = useReportData();
  const { data: companySettings } = useCompanySettings();
  const { data: complianceData } = useComplianceData(selectedYear, selectedMonth);
  const { data: defaultLP } = useDefaultLiquidityProvider();
  const operatorId = useOperatorId();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const selectedDate = setYear(setMonth(new Date(), selectedMonth), selectedYear);
  const periodOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return (
      order.status === 'completed' &&
      orderDate.getMonth() === selectedMonth &&
      orderDate.getFullYear() === selectedYear
    );
  });

  const currencyMap = currencies.map(c => ({ code: c.code, type: c.type as 'fiat' | 'crypto', bank_accounts: c.bank_accounts || null }));

  const getType = (from: string, to: string) => {
    const fromType = currencyMap.find(c => c.code === from)?.type;
    const toType = currencyMap.find(c => c.code === to)?.type;
    if (fromType === 'crypto' && toType === 'fiat') return 'sell';
    if (fromType === 'fiat' && toType === 'crypto') return 'buy';
    return 'exchange';
  };

  const sellCount = periodOrders.filter(o => getType(o.from_currency, o.to_currency) === 'sell').length;
  const buyCount = periodOrders.filter(o => getType(o.from_currency, o.to_currency) === 'buy').length;
  const exchangeCount = periodOrders.filter(o => getType(o.from_currency, o.to_currency) === 'exchange').length;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Fetch total clients and KYC count for App 2/о
      const [profilesRes, kycRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("operator_id", operatorId),
        supabase.from("kyc_verifications").select("id", { count: "exact", head: true }).eq("status", "approved").eq("operator_id", operatorId),
      ]);

      await generateFinnadzorReport(
        orders,
        currencyMap,
        selectedDate,
        companySettings,
        profilesRes.count || 0,
        kycRes.count || 0,
        complianceData,
        defaultLP || undefined
      );
      toast.success("Готово", { description: "Отчёт (Приложения 1/о-6/о) скачан" });
    } catch (error: any) {
      toast.error("Ошибка", { description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateLetter = async () => {
    if (!companySettings) {
      toast.error("Заполните реквизиты", { description: "Перейдите во вкладку «Настройки» и заполните данные компании" });
      return;
    }
    setIsGeneratingLetter(true);
    try {
      await generateCoverLetter(companySettings, selectedDate, {
        outgoingNumber: outgoingNumber || undefined,
        outgoingDay: outgoingDay || undefined,
      });
      toast.success("Готово", { description: "Сопроводительное письмо скачано" });
    } catch (error: any) {
      toast.error("Ошибка", { description: error.message });
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Формирование отчётов</h3>
          <p className="text-sm text-muted-foreground">Отчёты для Финнадзора</p>
        </div>
      </div>

      {!companySettings && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">
            Реквизиты компании не заполнены. Перейдите во вкладку «Настройки» для заполнения.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Месяц</label>
          <Select
            value={selectedMonth.toString()}
            onValueChange={(v) => setSelectedMonth(parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите месяц" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, idx) => (
                <SelectItem key={idx} value={idx.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Год</label>
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите год" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Исх. №</label>
          <Input
            placeholder="Номер документа"
            value={outgoingNumber}
            onChange={(e) => setOutgoingNumber(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Дата отправки (день)</label>
          <Input
            placeholder="напр. 15"
            value={outgoingDay}
            onChange={(e) => setOutgoingDay(e.target.value)}
          />
        </div>
      </div>

      {/* Preview stats */}
      <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
        <p className="text-sm text-muted-foreground mb-3">
          Данные за {MONTHS[selectedMonth].toLowerCase()} {selectedYear}:
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-orange-400">{sellCount}</div>
            <div className="text-xs text-muted-foreground">Продажа ВА</div>
            <div className="text-xs text-muted-foreground">(Прил. 4/о)</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{buyCount}</div>
            <div className="text-xs text-muted-foreground">Покупка ВА</div>
            <div className="text-xs text-muted-foreground">(Прил. 5/о)</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{exchangeCount}</div>
            <div className="text-xs text-muted-foreground">Обмен ВА</div>
            <div className="text-xs text-muted-foreground">(Прил. 6/о)</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/50 text-center">
          <span className="text-sm text-muted-foreground">
            Всего завершённых операций: <strong className="text-foreground">{periodOrders.length}</strong>
          </span>
        </div>
      </div>

      {/* Generate buttons */}
      <div className="space-y-3">
        <Button
          variant="gradient"
          className="w-full"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Формирование...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Скачать отчёт (Приложения 1/о-6/о)
            </>
          )}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGenerateLetter}
          disabled={isGeneratingLetter || !companySettings}
        >
          {isGeneratingLetter ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Формирование...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Скачать сопроводительное письмо (PDF)
            </>
          )}
        </Button>
      </div>

      {periodOrders.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Нет завершённых операций за выбранный период — будет сформирован нулевой отчёт
        </p>
      )}
    </div>
  );
};

export default ReportGenerator;
