import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type QuizQuestion = Tables<"quiz_questions">;
export type QuizQuestionInsert = TablesInsert<"quiz_questions">;
export type QuizQuestionUpdate = TablesUpdate<"quiz_questions">;

export interface QuizOption {
  id: string;
  text: string;
}

/** Публичный — загружает только активные вопросы (для CryptoQuiz при регистрации) */
export const useQuizQuestions = (operatorId?: string) => {
  return useQuery({
    queryKey: ["quiz-questions-public", operatorId],
    queryFn: async () => {
      let query = supabase
        .from("quiz_questions")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (operatorId) {
        query = query.eq("operator_id", operatorId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as QuizQuestion[];
    },
  });
};

/** Админский — все вопросы оператора, включая неактивные */
export const useAdminQuizQuestions = (operatorId?: string) => {
  return useQuery({
    queryKey: ["quiz-questions-admin", operatorId],
    queryFn: async () => {
      if (!operatorId) return [];
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("operator_id", operatorId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as QuizQuestion[];
    },
    enabled: !!operatorId,
  });
};

/** Upsert: создать или обновить вопрос */
export const useSaveQuizQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (question: QuizQuestionInsert & { id?: string }) => {
      if (question.id) {
        const { id, ...rest } = question;
        const { error } = await supabase
          .from("quiz_questions")
          .update({ ...rest, updated_at: new Date().toISOString() } as QuizQuestionUpdate)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("quiz_questions")
          .insert(question as QuizQuestionInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-public"] });
      toast.success("Вопрос сохранён");
    },
    onError: (error: any) => {
      toast.error("Ошибка сохранения", { description: error.message });
    },
  });
};

/** Удалить вопрос */
export const useDeleteQuizQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-public"] });
      toast.success("Вопрос удалён");
    },
    onError: (error: any) => {
      toast.error("Ошибка удаления", { description: error.message });
    },
  });
};
