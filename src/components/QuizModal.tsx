import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import CryptoQuiz from "@/components/auth/CryptoQuiz";

interface QuizModalProps {
  open: boolean;
  onClose: () => void;
  onPassed?: () => void;
}

/**
 * Закрываемая модалка квиза.
 *
 * В отличие от прошлого QuizGate, Esc и click-outside РАБОТАЮТ — клиент
 * может отменить. Hard-block "обмен невозможен пока не пройдёшь" живёт
 * не здесь, а в ExchangeWidget (pre-submit гейт через useQuizGate).
 */
export function QuizModal({ open, onClose, onPassed }: QuizModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleComplete = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ quiz_passed: true })
        .eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["quiz_passed", user.id] });
    }
    onPassed?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Проверка знаний</DialogTitle>
        </DialogHeader>
        <CryptoQuiz onComplete={handleComplete} onBack={onClose} />
      </DialogContent>
    </Dialog>
  );
}
