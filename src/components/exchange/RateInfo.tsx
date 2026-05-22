import { Info } from "lucide-react";
import { Currency } from "@/hooks/useCurrencies";

interface RateInfoProps {
  fromCurrency?: Currency;
  toCurrency?: Currency;
  exchangeRate: number;
  feePercent: number;
  feeAmount: number;
  showFee: boolean;
}

const formatRate = (rate: number) => {
  if (!isFinite(rate)) return "—";
  if (rate < 0.0001) return rate.toFixed(8);
  if (rate < 0.01) return rate.toFixed(6);
  if (rate < 1) return rate.toFixed(4);
  if (rate < 100) return rate.toFixed(4);
  return rate.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumber = (num: number, currency: Currency | undefined) => {
  if (!currency || !isFinite(num)) return "0";
  if (currency.type === "crypto") {
    if (num < 0.0001) return num.toFixed(8);
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toFixed(4);
  }
  return num.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const RateInfo = ({ fromCurrency, toCurrency, exchangeRate, feePercent, feeAmount, showFee }: RateInfoProps) => {
  return (
    <div className="bg-secondary/30 rounded-xl p-4 mb-6 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Курс
        </span>
        <span className="font-medium">
          1 {toCurrency?.code} = {exchangeRate > 0 ? formatRate(1 / exchangeRate) : '—'} {fromCurrency?.code}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Комиссия сервиса</span>
        <span className="font-medium text-amber-400">{feePercent}%</span>
      </div>
      {showFee && fromCurrency && (
        <div className="flex justify-between text-sm pt-2 border-t border-border/50">
          <span className="text-muted-foreground">Сумма комиссии</span>
          <span className="font-medium">
            ~{formatNumber(feeAmount, fromCurrency)} {fromCurrency.code}
          </span>
        </div>
      )}
    </div>
  );
};

export default RateInfo;
