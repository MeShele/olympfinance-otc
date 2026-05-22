import { useRef, useState, useEffect } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { Currency } from "@/hooks/useCurrencies";
import CurrencyIcon from "@/components/ui/CurrencyIcon";

interface AmountInputProps {
  label: string;
  amount: string;
  onAmountChange: (value: string) => void;
  currencies: Currency[];
  selectedCode: string;
  onCurrencyChange: (code: string) => void;
  validation?: { valid: boolean; message: string };
  showRange?: boolean;
  currency?: Currency;
}

const AmountInput = ({
  label,
  amount,
  onAmountChange,
  currencies,
  selectedCode,
  onCurrencyChange,
  validation,
  showRange,
  currency,
}: AmountInputProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = currencies.find(c => c.code === selectedCode) || (currencies.length > 0 ? currencies[0] : null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasError = validation && !validation.valid && validation.message;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm text-muted-foreground">{label}</label>
        {showRange && currency && (
          <span className="text-xs text-muted-foreground">
            {currency.min_amount.toLocaleString()} – {currency.max_amount.toLocaleString()} {currency.code}
          </span>
        )}
      </div>
      <div className={`bg-secondary/50 rounded-xl p-4 border transition-colors ${
        hasError
          ? "border-destructive/50"
          : "border-border/50 hover:border-primary/30"
      }`}>
        <div className="flex items-center gap-4">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="flex-1 bg-transparent text-2xl font-semibold focus:outline-none text-foreground min-w-0"
            placeholder="0"
          />
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 bg-background/80 hover:bg-background px-4 py-2 rounded-xl transition-colors border border-border/50"
            >
              <CurrencyIcon currency={selected} />
              <span className="font-semibold">{selected?.code}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 min-w-[220px] overflow-hidden">
                <div className="max-h-[280px] overflow-y-auto">
                  {currencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        onCurrencyChange(c.code);
                        setShowDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 transition-colors ${
                        c.code === selectedCode ? 'bg-secondary' : ''
                      }`}
                    >
                      <CurrencyIcon currency={c} />
                      <div className="text-left flex-1">
                        <span className="font-medium block">{c.code}</span>
                        <span className="text-xs text-muted-foreground">{c.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {hasError && (
          <div className="flex items-center gap-1.5 mt-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {validation!.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AmountInput;
