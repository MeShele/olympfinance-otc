import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Check } from "lucide-react";

interface ResidencyChoiceProps {
  onSubmit: (isResident: boolean) => Promise<void> | void;
  isLoading?: boolean;
  /** показать кнопку «Пропустить» (не для регистрации, для админских правок) */
  allowSkip?: boolean;
  onSkip?: () => void;
}

/**
 * 2 радио-карточки «Резидент КР / Нерезидент» + кнопка «Продолжить».
 * Используется и в форме регистрации (Auth.tsx), и в ResidencyGate
 * (модалка для старых юзеров без is_resident).
 */
export default function ResidencyChoice({ onSubmit, isLoading, allowSkip, onSkip }: ResidencyChoiceProps) {
  const [choice, setChoice] = useState<"resident" | "non_resident" | null>(null);

  const handleSubmit = () => {
    if (choice === null) return;
    onSubmit(choice === "resident");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Это требуется для отчётности перед Госагентством финразведки КР.
          Налоговый резидент — тот, кто провёл в КР более 183 дней за год.
        </p>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => setChoice("resident")}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            choice === "resident"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Я резидент Кыргызстана</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Гражданин КР или иностранец с ВНЖ / 183+ дней в КР
              </div>
            </div>
            {choice === "resident" && <Check className="w-5 h-5 text-primary" />}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setChoice("non_resident")}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            choice === "non_resident"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Я нерезидент</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Гражданин другой страны, без долгосрочного пребывания в КР
              </div>
            </div>
            {choice === "non_resident" && <Check className="w-5 h-5 text-primary" />}
          </div>
        </button>
      </div>

      <Button
        variant="gradient"
        className="w-full"
        onClick={handleSubmit}
        disabled={choice === null || isLoading}
      >
        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Продолжить
      </Button>

      {allowSkip && (
        <Button variant="ghost" className="w-full" onClick={onSkip} disabled={isLoading}>
          Пропустить
        </Button>
      )}
    </div>
  );
}
