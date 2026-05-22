import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Percent } from "lucide-react";
import { useCompanySettings, useSaveCompanySettings } from "@/hooks/useCompanySettings";
import { useOperatorId } from "@/hooks/useOperatorId";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/RequirePermission";

export default function AdminCommission() {
  const operatorId = useOperatorId();
  const { data: settings, isLoading } = useCompanySettings(operatorId);
  const { mutate: save, isPending: isSaving } = useSaveCompanySettings();
  const [feePercent, setFeePercent] = useState(2.5);

  useEffect(() => {
    if (settings) {
      setFeePercent(settings.fee_percent);
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feePercent < 0 || feePercent > 100) {
      toast.error("Комиссия должна быть от 0 до 100%");
      return;
    }
    save({ settings: { fee_percent: feePercent }, operatorId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RequirePermission section="commission">
    <div className="admin-card max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Percent className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Комиссия за обмен</h3>
            <p className="text-sm text-muted-foreground">Глобальная комиссия для всех операций</p>
          </div>
        </div>

        <div>
          <Label htmlFor="fee_percent" className="text-sm font-medium">
            Комиссия (%)
          </Label>
          <Input
            id="fee_percent"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={feePercent}
            onChange={(e) => setFeePercent(Number(e.target.value))}
            className="mt-1 max-w-[200px]"
            placeholder="2.5"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Текущая комиссия: <span className="font-semibold text-primary">{feePercent}%</span>
          </p>
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
              Сохранить
            </>
          )}
        </Button>
      </form>
    </div>
    </RequirePermission>
  );
}
