import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TablesInsert } from "@/integrations/supabase/types";
import { useOperatorId } from "./useOperatorId";

export interface LegalPage {
  id: string;
  operator_id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  updated_at: string;
}

export const useLegalPages = (operatorId?: string) => {
  return useQuery({
    queryKey: ["legal-pages", operatorId],
    queryFn: async () => {
      if (!operatorId) return [];
      const { data, error } = await supabase
        .from("legal_pages")
        .select("*")
        .eq("operator_id", operatorId)
        .order("slug");
      if (error) throw error;
      return (data ?? []) as LegalPage[];
    },
    enabled: !!operatorId,
  });
};

export const useLegalPage = (slug?: string) => {
  const operatorId = useOperatorId();

  return useQuery({
    queryKey: ["legal-page", slug, operatorId],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("legal_pages")
        .select("*")
        .eq("operator_id", operatorId)
        .eq("slug", slug)
        .eq("is_published", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as LegalPage | null;
    },
    enabled: !!slug,
  });
};

export const useSaveLegalPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (page: { operator_id: string; slug: string; title: string; content: string; is_published: boolean }) => {
      const { data: existing } = await supabase
        .from("legal_pages")
        .select("id")
        .eq("operator_id", page.operator_id)
        .eq("slug", page.slug)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("legal_pages")
          .update({ title: page.title, content: page.content, is_published: page.is_published, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("legal_pages")
          .insert(page as TablesInsert<"legal_pages">);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-pages"] });
      queryClient.invalidateQueries({ queryKey: ["legal-page"] });
      toast.success("Сохранено");
    },
    onError: (error: any) => {
      toast.error("Ошибка", { description: error.message });
    },
  });
};
