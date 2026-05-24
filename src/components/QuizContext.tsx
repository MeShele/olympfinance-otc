import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { QuizModal } from "./QuizModal";

interface QuizContextValue {
  openQuiz: () => void;
}

const QuizContext = createContext<QuizContextValue>({ openQuiz: () => {} });

/**
 * Wraps the app and exposes `useQuizModal().openQuiz()` for components
 * that want to trigger the quiz on demand (Header banner, ExchangeWidget
 * pre-submit). The modal lives here so its open-state is shared.
 */
export function QuizProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openQuiz = useCallback(() => setOpen(true), []);
  const closeQuiz = useCallback(() => setOpen(false), []);

  return (
    <QuizContext.Provider value={{ openQuiz }}>
      {children}
      <QuizModal open={open} onClose={closeQuiz} onPassed={closeQuiz} />
    </QuizContext.Provider>
  );
}

export const useQuizModal = () => useContext(QuizContext);
