import { useState } from "react";
import { Loader2, Save, Trash2, Plus, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOperatorId } from "@/hooks/useOperatorId";
import {
  useAdminQuizQuestions,
  useSaveQuizQuestion,
  useDeleteQuizQuestion,
  type QuizOption,
} from "@/hooks/useQuizQuestions";
import { RequirePermission } from "@/components/admin/RequirePermission";

const OPTION_IDS = ["a", "b", "c", "d"] as const;

interface QuestionForm {
  id?: string;
  question: string;
  options: QuizOption[];
  correct_answer: string;
  sort_order: number;
  is_active: boolean;
  isNew?: boolean;
}

const emptyQuestion = (): QuestionForm => ({
  question: "",
  options: OPTION_IDS.map((id) => ({ id, text: "" })),
  correct_answer: "a",
  sort_order: 0,
  is_active: true,
  isNew: true,
});

export default function AdminQuizQuestions() {
  const operatorId = useOperatorId();
  const { data: questions, isLoading } = useAdminQuizQuestions(operatorId);
  const { mutate: saveQuestion, isPending: isSaving } = useSaveQuizQuestion();
  const { mutate: deleteQuestion, isPending: isDeleting } = useDeleteQuizQuestion();
  const [newQuestions, setNewQuestions] = useState<QuestionForm[]>([]);

  const handleAddNew = () => {
    const maxSort = Math.max(0, ...(questions ?? []).map((q) => q.sort_order));
    setNewQuestions((prev) => [
      ...prev,
      { ...emptyQuestion(), sort_order: maxSort + prev.length + 1 },
    ]);
  };

  const handleSave = (form: QuestionForm) => {
    const payload = {
      ...(form.id ? { id: form.id } : {}),
      operator_id: operatorId,
      question: form.question,
      options: form.options as any,
      correct_answer: form.correct_answer,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };
    saveQuestion(payload, {
      onSuccess: () => {
        if (form.isNew) {
          setNewQuestions((prev) => prev.filter((q) => q !== form));
        }
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteQuestion(id);
  };

  const handleRemoveNew = (form: QuestionForm) => {
    setNewQuestions((prev) => prev.filter((q) => q !== form));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const existingForms: QuestionForm[] = (questions ?? []).map((q) => ({
    id: q.id,
    question: q.question,
    options: (q.options as QuizOption[]) ?? OPTION_IDS.map((id) => ({ id, text: "" })),
    correct_answer: q.correct_answer,
    sort_order: q.sort_order,
    is_active: q.is_active,
  }));

  const allForms = [...existingForms, ...newQuestions];

  return (
    <RequirePermission section="company">
    <div className="max-w-3xl">
      <div className="admin-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Вопросы квиза</h3>
              <p className="text-sm text-muted-foreground">Тесты для пользователей</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-1" />
            Добавить вопрос
          </Button>
        </div>

        {allForms.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            Нет вопросов. Нажмите «Добавить вопрос», чтобы создать первый.
          </p>
        )}

        <div className="space-y-6">
          {allForms.map((form, idx) => (
            <QuestionCard
              key={form.id ?? `new-${idx}`}
              form={form}
              index={idx}
              isSaving={isSaving}
              isDeleting={isDeleting}
              onSave={handleSave}
              onDelete={form.id ? () => handleDelete(form.id!) : () => handleRemoveNew(form)}
            />
          ))}
        </div>
      </div>
    </div>
    </RequirePermission>
  );
}

function QuestionCard({
  form: initialForm,
  index,
  isSaving,
  isDeleting,
  onSave,
  onDelete,
}: {
  form: QuestionForm;
  index: number;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (form: QuestionForm) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<QuestionForm>(initialForm);

  const updateOption = (optionId: string, text: string) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
    }));
  };

  return (
    <div className="p-4 rounded-xl border border-border bg-muted/50 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Вопрос #{index + 1}
          {form.isNew && (
            <span className="ml-2 text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">
              новый
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor={`sort-${index}`} className="text-xs text-muted-foreground">
              Порядок
            </Label>
            <Input
              id={`sort-${index}`}
              type="number"
              className="w-20 h-8 text-sm"
              value={form.sort_order}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`active-${index}`} className="text-xs text-muted-foreground">
              Активен
            </Label>
            <Switch
              id={`active-${index}`}
              checked={form.is_active}
              onCheckedChange={(v) => setForm((prev) => ({ ...prev, is_active: v }))}
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor={`q-${index}`}>Текст вопроса</Label>
        <Input
          id={`q-${index}`}
          value={form.question}
          onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
          placeholder="Введите вопрос..."
          className="mt-1"
        />
      </div>

      <div className="grid gap-3">
        <Label>Варианты ответов</Label>
        {OPTION_IDS.map((optId) => {
          const opt = form.options.find((o) => o.id === optId);
          return (
            <div key={optId} className="flex items-center gap-2">
              <span className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full bg-violet-500/10 text-violet-400 shrink-0">
                {optId.toUpperCase()}
              </span>
              <Input
                value={opt?.text ?? ""}
                onChange={(e) => updateOption(optId, e.target.value)}
                placeholder={`Вариант ${optId.toUpperCase()}`}
                className="flex-1"
              />
            </div>
          );
        })}
      </div>

      <div>
        <Label>Правильный ответ</Label>
        <Select
          value={form.correct_answer}
          onValueChange={(v) => setForm((prev) => ({ ...prev, correct_answer: v }))}
        >
          <SelectTrigger className="mt-1 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTION_IDS.map((optId) => (
              <SelectItem key={optId} value={optId}>
                {optId.toUpperCase()} — {form.options.find((o) => o.id === optId)?.text || "..."}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="gradient"
          size="sm"
          className="flex-1"
          disabled={isSaving || !form.question.trim() || form.options.filter((o) => o.text.trim()).length < 2 || !form.options.find((o) => o.id === form.correct_answer)?.text.trim()}
          onClick={() => onSave(form)}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Сохранить
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={isDeleting}
          onClick={onDelete}
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
