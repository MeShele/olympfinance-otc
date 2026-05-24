import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorId } from "./useOperatorId";

export interface EnrichedOrder {
  id: string;
  user_id: string | null;
  created_at: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  rate: number;
  fee: number;
  tx_hash: string | null;
  network: string | null;
  amount_kgs: number;
  wallet_address: string | null;
  contact_info: string | null;
  status: string;
  notes: string | null;
  profiles: {
    full_name: string | null;
    email: string;
    is_verified: boolean;
  } | null;
  kyc_country: string | null;
  document_number: string | null;
  kyc_full_name: string | null;
  /** Резидентство клиента: явно указанное в profiles, fallback на kyc_country=='KGZ'. */
  is_resident: boolean | null;
  /** Метод расчёта (Приложения 4/о, 5/о колонка 9): cash | cashless | null. */
  payment_method: string | null;
  /** Цель деловых отношений (ст. 21.1.2): personal_use, investment, ... */
  relationship_purpose: string | null;
}

export const useReportData = () => {
  const operatorId = useOperatorId();
  return useQuery({
    queryKey: ["report-data", operatorId],
    queryFn: async () => {
      const [ordersRes, profilesRes, kycRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("operator_id", operatorId)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("user_id, full_name, email, is_verified, is_resident, relationship_purpose")
          .eq("operator_id", operatorId),
        supabase
          .from("kyc_verifications")
          .select("user_id, document_country, document_number, ocr_data, status")
          .eq("operator_id", operatorId),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (kycRes.error) throw kycRes.error;

      const orders = ordersRes.data;
      const profiles = profilesRes.data;
      const kycData = kycRes.data;

      // Build lookup maps for O(1) access instead of O(n) .find()
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);
      const kycMap = new Map(kycData?.map((k) => [k.user_id, k]) ?? []);

      // Merge data for each order — O(n) total
      const enrichedOrders: EnrichedOrder[] = orders.map((order) => {
        const profile = order.user_id ? profileMap.get(order.user_id) : undefined;
        const kyc = order.user_id ? kycMap.get(order.user_id) : undefined;

        // Extract full name from KYC ocr_data if available
        const ocrData = kyc?.ocr_data as Record<string, any> | null;
        const kycFullName = ocrData
          ? [ocrData.last_name, ocrData.first_name, ocrData.patronymic].filter(Boolean).join(' ') || ocrData.full_name || null
          : null;

        // Use KYC-verified status for is_verified
        const isKycApproved = kyc?.status === 'approved';

        return {
          ...order,
          from_amount: Number(order.from_amount),
          to_amount: Number(order.to_amount),
          rate: Number(order.rate),
          fee: Number(order.fee ?? 0),
          amount_kgs: Number(order.amount_kgs ?? 0),
          tx_hash: order.tx_hash ?? null,
          network: order.network ?? null,
          profiles: profile
            ? { full_name: profile.full_name || kycFullName, email: profile.email, is_verified: profile.is_verified || isKycApproved }
            : null,
          kyc_country: kyc?.document_country || null,
          document_number: kyc?.document_number || null,
          kyc_full_name: kycFullName,
          is_resident: (profile as { is_resident?: boolean | null })?.is_resident ?? null,
          payment_method: (order as { payment_method?: string | null }).payment_method ?? null,
          relationship_purpose: (profile as { relationship_purpose?: string | null })?.relationship_purpose ?? null,
        };
      });

      return enrichedOrders;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};
