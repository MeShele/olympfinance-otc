import { useEffect, useState } from "react";
import { Loader2, Save, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequirePermission } from "@/components/admin/RequirePermission";
import {
  useComplianceData,
  useSaveComplianceData,
  type ComplianceData,
} from "@/hooks/useComplianceData";
import { useOperatorId } from "@/hooks/useOperatorId";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const emptyForm = (year: number, month: number): Omit<ComplianceData, "id"> => ({
  report_year: year,
  report_month: month,
  total_assets: 0,
  total_equity: 0,
  total_liabilities: 0,
  net_profit: 0,
  taxes_paid: 0,
  aml_rejections: 0,
  suspicious_reports: 0,
  gsfr_reports: 0,
  state_registration_changes: "",
  reorganization_info: "",
});

const NUMBER_FIELDS: Array<{ key: keyof ComplianceData; label: string; hint?: string; group: "finance" | "counters" }> = [
  { key: "total_assets", label: "Совокупные активы (сом)", group: "finance" },
  { key: "total_equity", label: "Собственный капитал (сом)", group: "finance" },
  { key: "total_liabilities", label: "Обязательства (сом)", group: "finance" },
  { key: "net_profit", label: "Чистая прибыль за месяц (сом)", group: "finance" },
  { key: "taxes_paid", label: "Уплаченные налоги (сом)", group: "finance" },
  { key: "aml_rejections", label: "AML-отказы (шт.)", group: "counters", hint: "Заявки отклонённые по AML-проверке" },
  { key: "suspicious_reports", label: "Подозрительные операции (шт.)", group: "counters" },
  { key: "gsfr_reports", label: "Сообщений в ГСФР (шт.)", group: "counters" },
];

export default function AdminComplianceData() {
  const operatorId = useOperatorId();
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const { data: existing, isLoading } = useComplianceData(year, month);
  const { mutateAsync: save, isPending: isSaving } = useSaveComplianceData();

  const [form, setForm] = useState<Omit<ComplianceData, "id">>(() => emptyForm(year, month));

  useEffect(() => {
    if (existing) {
      const { id: _id, ...rest } = existing;
      setForm(rest);
    } else {
      setForm(emptyForm(year, month));
    }
  }, [existing, year, month]);

  const handleChange = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save({ data: { ...form, report_year: year, report_month: month }, operatorId });
  };

  const yearOptions = [today.getFullYear(), today.getFullYear() - 1, today.getFullYear() - 2];

  return (
    <RequirePermission section="reports">
      <div className="max-w-3xl space-y-6">
        <div className="admin-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Данные для отчётов ГСФР</h3>
              <p className="text-sm text-muted-foreground">
                Финпоказатели и compliance-счётчики идут в Приложения 1/о и 2/о
              </p>
            </div>
          </div>

          {/* Selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <Label>Месяц</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Год</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Финпоказатели */}
              <div>
                <h4 className="font-semibold mb-3 text-sm">Финансовые показатели (Приложение 2/о)</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {NUMBER_FIELDS.filter((f) => f.group === "finance").map((f) => (
                    <div key={f.key}>
                      <Label htmlFor={f.key}>{f.label}</Label>
                      <Input
                        id={f.key}
                        type="number"
                        step="0.01"
                        value={(form[f.key] as number) ?? 0}
                        onChange={(e) => handleChange(f.key, Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance-счётчики */}
              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold mb-3 text-sm">Compliance-счётчики (Приложение 2/о)</h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  {NUMBER_FIELDS.filter((f) => f.group === "counters").map((f) => (
                    <div key={f.key}>
                      <Label htmlFor={f.key}>{f.label}</Label>
                      <Input
                        id={f.key}
                        type="number"
                        min="0"
                        step="1"
                        value={(form[f.key] as number) ?? 0}
                        onChange={(e) => handleChange(f.key, Number(e.target.value))}
                        className="mt-1"
                      />
                      {f.hint && <p className="text-xs text-muted-foreground mt-1">{f.hint}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Корп. события */}
              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold mb-3 text-sm">Корпоративные события (Приложение 1/о)</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="state_registration_changes">Госрегистрация изменений</Label>
                    <Textarea
                      id="state_registration_changes"
                      rows={2}
                      value={form.state_registration_changes ?? ""}
                      onChange={(e) => handleChange("state_registration_changes", e.target.value)}
                      placeholder="Описание изменений за месяц или «не было»"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reorganization_info">Реорганизация</Label>
                    <Textarea
                      id="reorganization_info"
                      rows={2}
                      value={form.reorganization_info ?? ""}
                      onChange={(e) => handleChange("reorganization_info", e.target.value)}
                      placeholder="Описание или «не было»"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" variant="gradient" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохранение...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Сохранить</>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </RequirePermission>
  );
}
