import { supabase } from "@/integrations/supabase/client";
import { generateOrderPDFBlob } from "./previewGenerator";
import type { OrderData, CompanyData } from "./types";

interface SavedDocument {
  id: string;
  storage_path: string;
  file_name: string;
}

/**
 * Generate a PDF and save it to Supabase Storage + documents table.
 * Returns the saved document record.
 */
export const generateAndSaveOrderPDF = async (
  order: OrderData,
  company: CompanyData,
  operatorId: string,
  userId: string | null,
  isAdmin: boolean = false
): Promise<SavedDocument> => {
  // Generate PDF blob
  const { blob, fileName } = await generateOrderPDFBlob(order, company, isAdmin);

  // Storage path: operator_id/order_id/filename
  const storagePath = `${operatorId}/${order.id}/${fileName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("order-documents")
    .upload(storagePath, blob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // Insert document record
  const { data, error: insertError } = await supabase
    .from("documents")
    .insert({
      operator_id: operatorId,
      order_id: order.id,
      user_id: userId,
      type: "order_pdf" as const,
      file_name: fileName,
      storage_path: storagePath,
      file_size: blob.size,
      metadata: {
        orderNumber: order.orderNumber,
        fromCurrency: order.fromCurrency,
        toCurrency: order.toCurrency,
        isAdmin,
      },
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return data as SavedDocument;
};

/**
 * Get a signed URL for downloading a document from storage.
 */
export const getDocumentDownloadUrl = async (
  storagePath: string
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from("order-documents")
    .createSignedUrl(storagePath, 3600);

  if (error) throw error;
  return data.signedUrl;
};
