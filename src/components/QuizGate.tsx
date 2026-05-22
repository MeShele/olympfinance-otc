import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CryptoQuiz from "@/components/auth/CryptoQuiz";

/**
 * Global quiz gate — shows quiz modal immediately after first login
 * (email confirmation redirect). Blocks interaction until quiz is passed.
 * Always enabled in OTC; the modular toggle from the platform was dropped.
 */
export function QuizGate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: quizPassed } = useQuery({
    queryKey: ["quiz_passed", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("quiz_passed")
        .eq("user_id", user!.id)
        .single();
      return data?.quiz_passed ?? false;
    },
    enabled: !!user,
  });

  const showQuiz = !!user && quizPassed === false;

  if (!showQuiz) return null;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Проверка знаний</DialogTitle>
        </DialogHeader>
        <CryptoQuiz
          onComplete={async () => {
            if (user) {
              await supabase
                .from("profiles")
                .update({ quiz_passed: true })
                .eq("user_id", user.id);
              queryClient.invalidateQueries({ queryKey: ["quiz_passed", user.id] });
            }
          }}
          onBack={() => {}}
        />
      </DialogContent>
    </Dialog>
  );
}
