import { Edit, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Currency } from "@/hooks/useCurrencies";

interface CurrencyTableProps {
  currencies: Currency[];
  onEdit?: (currency: Currency) => void;
  onDelete?: (currency: Currency) => void;
}

const CurrencyTable = ({ currencies, onEdit, onDelete }: CurrencyTableProps) => {
  const formatNumber = (num: number) => {
    if (num < 0.0001) return num.toFixed(8);
    if (num < 1) return num.toFixed(4);
    return num.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Валюта</th>
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Тип</th>
            <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Курс USD</th>
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Сеть</th>
            <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Мин</th>
            <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Макс</th>
            <th className="text-center py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Статус</th>
            <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-medium text-muted-foreground">Действия</th>
          </tr>
        </thead>
        <tbody>
          {currencies.map((currency) => (
            <tr key={currency.id} className="border-b border-border hover:bg-muted transition-colors">
              <td className="py-4 px-5">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{currency.icon}</span>
                  <div>
                    <div className="font-semibold">{currency.code}</div>
                    <div className="text-sm text-muted-foreground">{currency.name}</div>
                  </div>
                </div>
              </td>
              <td className="py-4 px-5">
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
              <td className="py-3 px-4 text-left text-sm text-muted-foreground">
                {currency.networks && currency.networks.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {currency.networks.map(net => (
                      <span key={net} className="px-1.5 py-0.5 rounded bg-secondary text-xs">
                        {net}
                      </span>
                    ))}
                  </div>
                ) : '—'}
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
              <td className="py-4 px-5">
                <div className="flex items-center justify-end gap-2">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(currency)}
                      className="h-8 w-8 hover:text-primary"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(currency)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
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
};

export default CurrencyTable;
