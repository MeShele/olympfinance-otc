import { supabase } from "@/integrations/supabase/client";
import { generateOrderNumber } from "@/utils/orderDocument";
import { generateAndSaveOrderPDF, getDocumentDownloadUrl } from "@/utils/pdf/documentService";
import type { CompanyData, KycData, OrderData } from "@/utils/pdf/types";
import { parseBankInfo, parsePaymentInfo, formatPaymentMethod } from "@/utils/orderNotes";
import type { Order } from "@/hooks/useOrders";

const CRYPTO_CODES = ["BTC", "ETH", "USDT", "USDC", "TON", "SOL"];
const FIAT_CODES = ["USD", "EUR", "RUB", "KZT", "KGS"];

const isSell = (o: Order) =>
  CRYPTO_CODES.includes(o.from_currency) && FIAT_CODES.includes(o.to_currency);

/**
 * Собирает orderData для PDF-генератора из БД-ордера + связанного KYC.
 * Используется и при ручном download, и при автосохранении после completed.
 */
async function buildOrderData(order: Order): Promise<OrderData> {
  const orderNumber = generateOrderNumber(order.id, order.created_at);
  const paymentInfo = parsePaymentInfo(order.notes);
  const bankInfo = parseBankInfo(order.notes);
  const operatorWallet = paymentInfo?.wallet_address || "";
  const sell = isSell(order);

  let bankAccountInfo: string | undefined;
  if (!sell && order.notes) {
    try {
      const parsed = JSON.parse(order.notes);
      if (parsed?.payment?.bank_details) bankAccountInfo = parsed.payment.bank_details;
    } catch { /* ignore */ }
  }

  let kyc: KycData | undefined;
  if (order.user_id) {
    const { data: kycRow } = await supabase
      .from("kyc_verifications")
      .select("document_number, document_type, document_country, ocr_data, verification_method, verified_at")
      .eq("user_id", order.user_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (kycRow) {
      const ocr = (kycRow.ocr_data ?? {}) as Record<string, unknown>;
      const pick = (k: string) =>
        typeof ocr[k] === "string" && (ocr[k] as string).trim() ? (ocr[k] as string) : undefined;
      const first = pick("first_name");
      const last = pick("last_name");
      const middle = pick("patronymic") ?? pick("middle_name");
      kyc = {
        fullName: pick("full_name") ?? ([last, first, middle].filter(Boolean).join(" ") || undefined),
        firstName: first, lastName: last, middleName: middle,
        dateOfBirth: pick("date_of_birth"),
        country: pick("country") ?? (kycRow.document_country ?? undefined),
        documentType: pick("document_type") ?? (kycRow.document_type ?? undefined),
        documentNumber: pick("document_number") ?? (kycRow.document_number ?? undefined),
        documentSeries: pick("document_series"),
        personalNumber: pick("personal_number") ?? pick("pin"),
        issuedDate: pick("issued_date") ?? pick("date_of_issue"),
        expiryDate: pick("expired_date") ?? pick("date_of_expiry"),
        authority: pick("authority") ?? pick("issued_by"),
        address: pick("address"),
        verificationMethod: kycRow.verification_method ?? undefined,
        verifiedAt: kycRow.verified_at ?? undefined,
      };
    }
  }

  return {
    id: order.id,
    orderNumber,
    createdAt: order.created_at,
    clientName: kyc?.fullName || order.contact_info || "Клиент",
    clientContact: order.contact_info || "",
    fromAmount: order.from_amount,
    fromCurrency: order.from_currency,
    toAmount: order.to_amount,
    toCurrency: order.to_currency,
    rate: order.rate,
    walletAddress: sell ? "" : (order.wallet_address || ""),
    operatorWallet,
    status: order.status,
    fee: (order as { fee?: number }).fee ?? undefined,
    cardNumber: sell ? (order.wallet_address || "") : undefined,
    bankName: bankInfo?.bank_name,
    recipientName: bankInfo?.recipient_name || kyc?.fullName || (sell ? (order.contact_info || "Клиент") : undefined),
    senderWallet: bankInfo?.sender_wallet,
    networkName: order.network || undefined,
    bankAccountInfo,
    paymentMethod: formatPaymentMethod(order),
    kyc,
  };
}

/**
 * Скачивает PDF заявки: пробует достать из storage, иначе генерирует на лету.
 * Используется и таблицей (/admin/orders таб «Таблица»), и канбаном.
 */
export async function downloadOrderPDF(
  order: Order,
  company: CompanyData,
  operatorId: string,
): Promise<void> {
  // 1. Существующий PDF из storage
  try {
    const { data: existingDoc } = await supabase
      .from("documents")
      .select("storage_path, file_name")
      .eq("order_id", order.id)
      .eq("type", "order_pdf")
      .limit(1)
      .maybeSingle();

    if (existingDoc) {
      const url = await getDocumentDownloadUrl(existingDoc.storage_path);
      triggerBrowserDownload(url, existingDoc.file_name);
      return;
    }
  } catch {
    /* fall through */
  }

  // 2. Generate fresh
  const orderData = await buildOrderData(order);

  try {
    const savedDoc = await generateAndSaveOrderPDF(orderData, company, operatorId, order.user_id, true);
    const url = await getDocumentDownloadUrl(savedDoc.storage_path);
    triggerBrowserDownload(url, savedDoc.file_name);
  } catch {
    const { generateOrderPDF } = await import("@/utils/pdf/generator");
    await generateOrderPDF(orderData, company, true);
  }
}

/**
 * Best-effort автосохранение PDF в storage + запись в documents.
 * Вызывается в админке сразу после mark_order_completed, чтобы клиент при
 * заходе на /orders сразу видел готовый файл (а не ждал генерации on-the-fly).
 *
 * Возвращает true при успехе, false при ошибке. Не бросает — основной flow
 * (payout) не должен ломаться из-за PDF.
 */
export async function saveOrderPdfToStorage(
  order: Order,
  company: CompanyData,
  operatorId: string,
): Promise<boolean> {
  try {
    // Если уже есть — skip (не пересохраняем)
    const { data: existingDoc } = await supabase
      .from("documents")
      .select("id")
      .eq("order_id", order.id)
      .eq("type", "order_pdf")
      .limit(1)
      .maybeSingle();
    if (existingDoc) return true;

    const orderData = await buildOrderData(order);
    await generateAndSaveOrderPDF(orderData, company, operatorId, order.user_id, true);
    return true;
  } catch (err) {
    console.error("[saveOrderPdfToStorage] failed:", err);
    return false;
  }
}

function triggerBrowserDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
