import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeInvoke";
import { useAuth } from "./useAuth";

export type KYCStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'expired';

export interface KYCVerification {
  id: string;
  user_id: string;
  status: KYCStatus;
  applicant_id: string | null;
  external_user_id: string | null;
  document_type: string | null;
  document_country: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface KYCResponse {
  success: boolean;
  verification: KYCVerification | null;
  isVerified?: boolean;
  pendingReview?: boolean;
  sdkUrl?: string;
  message?: string;
  error?: string;
}

interface KYCStatusResult {
  verification: KYCVerification | null;
  isVerified: boolean;
}

export const useKYC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query KYC status directly from DB (no edge function needed for reads)
  const { data: kycStatus, isLoading, refetch } = useQuery({
    queryKey: ['kyc-status', user?.id],
    queryFn: async (): Promise<KYCStatusResult> => {
      if (!user?.id) return { verification: null, isVerified: false };

      // 1. Check profile is_verified (fast path)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.is_verified) {
        // Already verified — fetch verification record for details
        const { data: verification } = await supabase
          .from('kyc_verifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          verification: verification as KYCVerification | null,
          isVerified: true,
        };
      }

      // 2. Check kyc_verifications — prefer approved, then pending, then latest
      const { data: allVerifications } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const records = allVerifications ?? [];
      const verification = records.find(v => v.status === 'approved')
        || records.find(v => v.status === 'pending' || v.status === 'in_progress')
        || records[0] || null;

      return {
        verification: verification as KYCVerification | null,
        isVerified: verification?.status === 'approved',
      };
    },
    enabled: !!user,
    staleTime: 1000 * 30,
    refetchInterval: (query) => {
      const status = query.state.data?.verification?.status;
      // Refetch every 15s while KYC is pending/in_progress (waiting for admin review)
      if (status === 'pending' || status === 'in_progress') return 1000 * 15;
      return false;
    },
  });

  const initKYCMutation = useMutation({
    mutationFn: async (): Promise<KYCResponse> => {
      return await invokeEdgeFunction<KYCResponse>('kyc-sandbox', { action: 'init' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-status'] });
    },
  });

  const completeKYCMutation = useMutation({
    mutationFn: async (params: {
      documentType?: string;
      documentCountry?: string;
      documentNumber?: string;
      fullName?: string;
      phone?: string;
      documentFile?: File;
      selfieFile?: File;
    }): Promise<KYCResponse> => {
      let documentUrl: string | undefined;
      let selfieUrl: string | undefined;

      // Upload files to Supabase Storage
      if (params.documentFile && user) {
        const ext = params.documentFile.name.split('.').pop();
        const path = `${user.id}/document_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('kyc-documents')
          .upload(path, params.documentFile, { upsert: true });
        if (upErr) throw new Error(`Ошибка загрузки документа: ${upErr.message}`);
        documentUrl = path;
      }

      if (params.selfieFile && user) {
        const ext = params.selfieFile.name.split('.').pop();
        const path = `${user.id}/selfie_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('kyc-documents')
          .upload(path, params.selfieFile, { upsert: true });
        if (upErr) throw new Error(`Ошибка загрузки селфи: ${upErr.message}`);
        selfieUrl = path;
      }

      return await invokeEdgeFunction<KYCResponse>('kyc-sandbox', {
        action: 'complete',
        documentType: params.documentType,
        documentCountry: params.documentCountry,
        documentNumber: params.documentNumber,
        fullName: params.fullName,
        phone: params.phone,
        documentUrl,
        selfieUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-status'] });
    },
  });

  return {
    kycStatus: kycStatus?.verification ?? null,
    isVerified: kycStatus?.isVerified ?? false,
    isLoading,
    refetch,
    initKYC: initKYCMutation.mutateAsync,
    completeKYC: completeKYCMutation.mutateAsync,
    isInitializing: initKYCMutation.isPending,
    isCompleting: completeKYCMutation.isPending,
  };
};
