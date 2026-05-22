import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOperatorId } from "@/hooks/useOperatorId";

export interface Document {
  id: string;
  operator_id: string;
  order_id: string | null;
  user_id: string | null;
  type: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface DocumentFilters {
  type?: string;
  orderId?: string;
  userId?: string;
}

export const useDocuments = (filters?: DocumentFilters) => {
  const operatorId = useOperatorId();
  return useQuery({
    queryKey: ["documents", operatorId, filters],
    queryFn: async () => {
      let query = supabase.from("documents").select("*").eq("operator_id", operatorId).order("created_at", { ascending: false });

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }
      if (filters?.orderId) {
        query = query.eq("order_id", filters.orderId);
      }
      if (filters?.userId) {
        query = query.eq("user_id", filters.userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
  });
};

export const useUserDocuments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
    enabled: !!user,
  });
};

interface UploadDocumentParams {
  blob: Blob;
  fileName: string;
  storagePath: string;
  operatorId: string;
  orderId?: string;
  userId?: string;
  type: "order_pdf" | "finnadzor_report" | "cover_letter";
  metadata?: Record<string, unknown>;
}

export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UploadDocumentParams) => {
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("order-documents")
        .upload(params.storagePath, params.blob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Insert document record
      const { data, error: insertError } = await supabase
        .from("documents")
        .insert({
          operator_id: params.operatorId,
          order_id: params.orderId || null,
          user_id: params.userId || null,
          type: params.type,
          file_name: params.fileName,
          storage_path: params.storagePath,
          file_size: params.blob.size,
          metadata: params.metadata || {},
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["user-documents"] });
    },
  });
};

export const useDocumentUrl = (storagePath: string | null) => {
  return useQuery({
    queryKey: ["document-url", storagePath],
    queryFn: async () => {
      if (!storagePath) return null;

      const { data, error } = await supabase.storage
        .from("order-documents")
        .createSignedUrl(storagePath, 3600); // 1 hour

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!storagePath,
    staleTime: 30 * 60 * 1000, // Cache for 30 min
  });
};
