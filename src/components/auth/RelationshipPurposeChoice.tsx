import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Target, Check } from "lucide-react";

export type RelationshipPurpose =
  | "personal_use"
  | "investment"
  | "business"
  | "savings"
  | "other";

const OPTIONS: Array<{ value: RelationshipPurpose; title: string; subtitle: string }> = [
  {
    value: "personal_use",
    title: "Личное использование",
    subtitle: "Покупка/продажа криптовалюты для себя, мелкие платежи",
  },
  {
    value: "investment",
    title: "Инвестиции",
    subtitle: "Спекулятивные сделки, портфельные вложения",
  },
  {
    value: "business",
    title: "Бизнес-операции",
    subtitle: "Закупки/выручка ИП или юр.лица",
  },
  {
    value: "savings",
    title: "Сбережения",
    subtitle: "Защита от инфляции, долгосрочное хранение",
  },
  {
    value: "other",
    title: "Иное",
    subtitle: "Опишет менеджер при необходимости",
  },
];

interface RelationshipPurposeChoiceProps {
  onSubmit: (purpose: RelationshipPurpose) => Promise<void> | void;
  isLoading?: boolean;
}

/**
 * Радио-карточки «Цель деловых отношений» — обязательный реквизит по
 * ст. 21.1.2 закона КР № 87/2018 «О ПОД/ФТ».
 *
 * Используется и в Auth-flow (новый клиент), и в RelationshipPurposeGate
 * (legacy-юзеры без relationship_purpose).
 */
export default function RelationshipPurposeChoice({
  onSubmit,
  isLoading,
}: RelationshipPurposeChoiceProps) {
  const [choice, setChoice] = useState<RelationshipPurpose | null>(null);

  const handleSubmit = () => {
    if (!choice) return;
    onSubmit(choice);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Target className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Закон КР № 87/2018 (ст. 21.1.2) требует фиксировать цель деловых
          отношений с обменником. Выберите ближайший по смыслу вариант.
        </p>
      </div>

      <div className="grid gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setChoice(opt.value)}
            className={`text-left p-3 rounded-xl border-2 transition-all ${
              choice === opt.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold text-sm">{opt.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.subtitle}</div>
              </div>
              {choice === opt.value && <Check className="w-5 h-5 text-primary shrink-0" />}
            </div>
          </button>
        ))}
      </div>

      <Button
        variant="gradient"
        className="w-full"
        onClick={handleSubmit}
        disabled={choice === null || isLoading}
      >
        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Завершить
      </Button>
    </div>
  );
}
