import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, ShieldCheck, TrendingUp, AlertTriangle, FileCheck } from "lucide-react";
import { useComplianceData, useSaveComplianceData, ComplianceData } from "@/hooks/useComplianceData";
import { useOperatorId } from "@/hooks/useOperatorId";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

const defaultForm: Omit<ComplianceData, "id"> = {
  report_year: currentYear,
  report_month: currentMonth,
  total_assets: 0,
  total_equity: 0,
  total_liabilities: 0,
  net_profit: 0,
  taxes_paid: 0,
  aml_rejections: 0,
  suspicious_reports: 0,
  gsfr_reports: 0,
  state_registration_changes: "-",
  reorganization_info: "-",
};

const ComplianceForm = () => {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const { data: existing, isLoading } = useComplianceData(year, month);
  const { mutate: save, isPending: isSaving } = useSaveComplianceData();
  const operatorId = useOperatorId();
  const [form, setForm] = useState<Omit<ComplianceData, "id">>(defaultForm);

  useEffect(() => {
    if (existing) {
      const { id, ...rest } = existing;
      setForm(rest);
    } else {
      setForm({ ...defaultForm, report_year: year, report_month: month });
    }
  }, [existing, year, month]);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save({ data: { ...form, report_year: year, report_month: month }, operatorId });
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Данные комплайнс</h3>
          <p className="text-sm text-muted-foreground">Финансовые показатели и данные ПОД/ФТ для отчётов</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="w-40">
          <Label className="text-sm font-medium">Год</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Label className="text-sm font-medium">Месяц</Label>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary mt-8" />}
        {!isLoading && existing && (
          <div className="mt-8 flex items-center gap-1 text-sm text-emerald-500">
            <FileCheck className="w-4 h-4" />
            Данные заполнены
          </div>
        )}
      </div>

      {/* Financial indicators - Appendix 2/o section 1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <TrendingUp className="w-4 h-4" />
          Финансовые показатели (Прил. 2/о, раздел 1)
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-sm">1.1 Совокупные активы (сом)</Label>
            <Input
              type="number"
              value={form.total_assets}
              onChange={(e) => handleChange("total_assets", Number(e.target.value))}
              className="mt-1"
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-sm">1.2 Собственный капитал (сом)</Label>
            <Input
              type="number"
              value={form.total_equity}
              onChange={(e) => handleChange("total_equity", Number(e.target.value))}
              className="mt-1"
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-sm">1.3 Обязательства (сом)</Label>
            <Input
              type="number"
              value={form.total_liabilities}
              onChange={(e) => handleChange("total_liabilities", Number(e.target.value))}
              className="mt-1"
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-sm">1.4 Чистая прибыль (сом)</Label>
            <Input
              type="number"
              value={form.net_profit}
              onChange={(e) => handleChange("net_profit", Number(e.target.value))}
              className="mt-1"
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-sm">1.5 Уплаченные налоги (сом)</Label>
            <Input
              type="number"
              value={form.taxes_paid}
              onChange={(e) => handleChange("taxes_paid", Number(e.target.value))}
              className="mt-1"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* AML indicators - Appendix 2/o section 5 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <AlertTriangle className="w-4 h-4" />
          ПОД/ФТ показатели (Прил. 2/о, раздел 5)
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-sm">5.2 Отказы по ПОД/ФТ</Label>
            <Input
              type="number"
              value={form.aml_rejections}
              onChange={(e) => handleChange("aml_rejections", Number(e.target.value))}
              className="mt-1"
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-sm">5.3 Подозрительные операции</Label>
            <Input
              type="number"
              value={form.suspicious_reports}
              onChange={(e) => handleChange("suspicious_reports", Number(e.target.value))}
              className="mt-1"
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-sm">5.4 Отчёты в ГСФР</Label>
            <Input
              type="number"
              value={form.gsfr_reports}
              onChange={(e) => handleChange("gsfr_reports", Number(e.target.value))}
              className="mt-1"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Appendix 1/o items 16-17 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <FileCheck className="w-4 h-4" />
          Регистрационные данные (Прил. 1/о)
        </div>
        <div className="grid gap-3">
          <div>
            <Label className="text-sm">16. Дата гос. регистрации изменений</Label>
            <Input
              value={form.state_registration_changes}
              onChange={(e) => handleChange("state_registration_changes", e.target.value)}
              className="mt-1"
              placeholder="-"
            />
          </div>
          <div>
            <Label className="text-sm">17. Сведения о реорганизации</Label>
            <Textarea
              value={form.reorganization_info}
              onChange={(e) => handleChange("reorganization_info", e.target.value)}
              className="mt-1"
              placeholder="-"
              rows={2}
            />
          </div>
        </div>
      </div>

      <Button type="submit" variant="gradient" className="w-full" disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Сохранение...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Сохранить данные за {MONTHS[month - 1]} {year}
          </>
        )}
      </Button>
    </form>
  );
};

export default ComplianceForm;
