import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuizQuestions, type QuizOption } from "@/hooks/useQuizQuestions";
import { useOperatorId } from "@/hooks/useOperatorId";

interface Question {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
}

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: "1",
    question: "Что такое блокчейн?",
    options: [
      { id: "a", text: "Централизованная база данных банка" },
      { id: "b", text: "Распределённый реестр транзакций" },
      { id: "c", text: "Программа для майнинга" },
      { id: "d", text: "Криптовалютная биржа" },
    ],
    correctAnswer: "b",
  },
  {
    id: "2",
    question: "Что такое приватный ключ криптокошелька?",
    options: [
      { id: "a", text: "Публичный адрес для получения криптовалюты" },
      { id: "b", text: "Пароль от биржевого аккаунта" },
      { id: "c", text: "Секретный код для доступа к вашим средствам" },
      { id: "d", text: "Номер транзакции в сети" },
    ],
    correctAnswer: "c",
  },
  {
    id: "3",
    question: "Можно ли отменить подтверждённую транзакцию в блокчейне?",
    options: [
      { id: "a", text: "Да, в течение 24 часов" },
      { id: "b", text: "Да, через службу поддержки" },
      { id: "c", text: "Нет, транзакции необратимы" },
      { id: "d", text: "Да, за дополнительную комиссию" },
    ],
    correctAnswer: "c",
  },
  {
    id: "4",
    question: "Что произойдёт, если вы потеряете приватный ключ?",
    options: [
      { id: "a", text: "Можно восстановить через email" },
      { id: "b", text: "Банк вернёт средства" },
      { id: "c", text: "Доступ к средствам будет потерян навсегда" },
      { id: "d", text: "Ничего страшного, ключ можно сгенерировать заново" },
    ],
    correctAnswer: "c",
  },
];

interface CryptoQuizProps {
  onComplete: () => void;
  onBack: () => void;
}

const CryptoQuiz = ({ onComplete, onBack }: CryptoQuizProps) => {
  const operatorId = useOperatorId();
  const { data: dbQuestions, isLoading } = useQuizQuestions(operatorId);

  const questions: Question[] = useMemo(() => {
    if (!dbQuestions || dbQuestions.length === 0) return FALLBACK_QUESTIONS;
    return dbQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      options: (q.options as QuizOption[]) ?? [],
      correctAnswer: q.correct_answer,
    }));
  }, [dbQuestions]);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);

  const totalQuestions = questions.length;
  const passThreshold = totalQuestions;
  const question = questions[currentQuestion];
  const isCorrect = question ? selectedAnswer === question.correctAnswer : false;
  const correctAnswers = Object.entries(answers).filter(
    ([qIdx, ans]) => questions[parseInt(qIdx)]?.correctAnswer === ans
  ).length;
  const passed = correctAnswers >= passThreshold;

  const handleAnswer = () => {
    setIsAnswered(true);
    setAnswers(prev => ({ ...prev, [currentQuestion]: selectedAnswer }));
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer("");
      setIsAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer("");
    setAnswers({});
    setShowResult(false);
    setIsAnswered(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
            passed ? "bg-green-500/10" : "bg-destructive/10"
          )}>
            {passed ? (
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            ) : (
              <XCircle className="w-10 h-10 text-destructive" />
            )}
          </div>

          <h3 className="text-xl font-bold mb-2">
            {passed ? "Тест пройден!" : "Тест не пройден"}
          </h3>

          <p className="text-muted-foreground mb-4">
            Правильных ответов: {correctAnswers} из {totalQuestions}
          </p>

          {passed ? (
            <p className="text-sm text-muted-foreground mb-6">
              Вы продемонстрировали базовые знания о криптовалютах.
              Теперь можете продолжить регистрацию.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mb-6">
              Для регистрации необходимо ответить правильно минимум на {passThreshold} вопросов.
              Рекомендуем изучить основы криптовалют и попробовать снова.
            </p>
          )}
        </div>

        {passed ? (
          <Button variant="gradient" className="w-full" onClick={onComplete}>
            Продолжить регистрацию
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <div className="space-y-3">
            <Button variant="gradient" className="w-full" onClick={handleRetry}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Пройти тест заново
            </Button>
            <Button variant="ghost" className="w-full" onClick={onBack}>
              Вернуться
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          Вопрос {currentQuestion + 1} из {totalQuestions}
        </span>
        <span>{Math.round(((currentQuestion + 1) / totalQuestions) * 100)}%</span>
      </div>

      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentQuestion + (isAnswered ? 1 : 0)) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="py-4">
        <h3 className="text-lg font-semibold mb-6">{question.question}</h3>

        <RadioGroup
          key={question.id}
          value={selectedAnswer}
          onValueChange={setSelectedAnswer}
          disabled={isAnswered}
          className="space-y-3"
        >
          {question.options.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrectOption = option.id === question.correctAnswer;
            const optionUid = `${question.id}-${option.id}`;

            return (
              <div
                key={option.id}
                className={cn(
                  "flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer",
                  isAnswered && isCorrectOption && "border-green-500 bg-green-500/10",
                  isAnswered && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                  !isAnswered && isSelected && "border-primary bg-primary/5",
                  !isAnswered && !isSelected && "border-border hover:border-primary/50"
                )}
                onClick={() => !isAnswered && setSelectedAnswer(option.id)}
              >
                <RadioGroupItem value={option.id} id={optionUid} />
                <Label
                  htmlFor={optionUid}
                  className="flex-1 cursor-pointer text-sm"
                >
                  {option.text}
                </Label>
                {isAnswered && isCorrectOption && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {!isAnswered ? (
          <Button
            variant="gradient"
            className="w-full"
            onClick={handleAnswer}
            disabled={!selectedAnswer}
          >
            Ответить
          </Button>
        ) : (
          <Button variant="gradient" className="w-full" onClick={handleNext}>
            {currentQuestion < totalQuestions - 1 ? "Следующий вопрос" : "Показать результат"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {currentQuestion === 0 && !isAnswered && (
          <Button variant="ghost" className="w-full" onClick={onBack}>
            Назад
          </Button>
        )}
      </div>
    </div>
  );
};

export default CryptoQuiz;
