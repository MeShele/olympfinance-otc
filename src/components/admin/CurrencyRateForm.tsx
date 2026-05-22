import { useState } from "react";
import { Save, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Currency } from "@/hooks/useCurrencies";

interface CurrencyRateFormProps {
  currency: Currency;
  onSave: (data: { rate_to_usd: number; min_amount: number; max_amount: number }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const CurrencyRateForm = ({ currency, onSave, onCancel, isLoading }: CurrencyRateFormProps) => {
  const [formData, setFormData] = useState({
    rate_to_usd: currency.rate_to_usd?.toString() || "1",
    min_amount: currency.min_amount?.toString() || "0",
    max_amount: currency.max_amount?.toString() || "1000000",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      rate_to_usd: parseFloat(formData.rate_to_usd),
      min_amount: parseFloat(formData.min_amount),
      max_amount: parseFloat(formData.max_amount),
    });
  };

  return (
    <div className="glass-card rounded-xl p-6 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Курс: {currency.icon} {currency.code}
        </h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rate-usd">Курс к USD</Label>
          <Input
            id="rate-usd"
            type="number"
            step="any"
            value={formData.rate_to_usd}
            onChange={(e) => setFormData({ ...formData, rate_to_usd: e.target.value })}
            className="bg-secondary/50"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rate-min">Мин. сумма</Label>
            <Input
              id="rate-min"
              type="number"
              step="any"
              value={formData.min_amount}
              onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
              className="bg-secondary/50"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate-max">Макс. сумма</Label>
            <Input
              id="rate-max"
              type="number"
              step="any"
              value={formData.max_amount}
              onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
              className="bg-secondary/50"
              required
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
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

export default CurrencyRateForm;
