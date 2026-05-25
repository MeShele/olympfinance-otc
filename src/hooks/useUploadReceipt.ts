import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOperatorId } from "@/hooks/useOperatorId";

const BUCKET = "order-documents";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * Загружает чек оплаты (PDF/PNG/JPG) клиента в order-documents bucket
 * и пишет публичный signed URL в orders.receipt_url.
 *
 * Path: receipts/{operator_id}/{user_id}/{order_id}/{timestamp}-{name}
 */
export const useUploadReceipt = () => {
  const { user } = useAuth();
  const operatorId = useOperatorId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, file }: { orderId: string; file: File }) => {
      if (!user?.id) throw new Error("Необходима авторизация");
      if (!ALLOWED.includes(file.type)) {
        throw new Error("Принимаются только JPG, PNG, WEBP или PDF");
      }
      if (file.size > MAX_SIZE) {
        throw new Error(`Файл слишком большой (макс. 5 МБ)`);
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
      const path = `receipts/${operatorId}/${user.id}/${orderId}/${Date.now()}-${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, cacheControl: "0" });
      if (uploadErr) throw uploadErr;

      // Signed URL на год — клиент сам получает доступ через storage policy,
      // админ — через тот же путь (storage policy operator_id check).
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 365 * 24 * 60 * 60);
      if (signErr) throw signErr;

      const receiptUrl = signed?.signedUrl ?? path;

      const { error: updErr } = await supabase
        .from("orders")
        .update({ receipt_url: receiptUrl })
        .eq("id", orderId);
      if (updErr) throw updErr;

      return { path, receiptUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};
