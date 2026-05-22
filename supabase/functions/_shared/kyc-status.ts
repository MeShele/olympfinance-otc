import { createAdminClient } from './auth.ts'
import {
  KYC_STATUS,
  KycMethod,
  KycModuleId,
  KycStatus,
} from './kyc-constants.ts'

/**
 * Parameters for upserting a kyc_verifications row + syncing profile.is_verified.
 * All four providers converge on this schema — any provider-specific blobs go
 * into `extraFields` (ocr_data, face_match_score, document_*, risk_*, etc.).
 */
export interface KycUpsertParams {
  userId: string
  operatorId: string
  method: KycMethod
  status: KycStatus
  applicantId: string
  externalUserId: string
  rejectionReason?: string | null
  verifiedAt?: Date | null
  extraFields?: Record<string, unknown>
}

/**
 * Insert-or-update `kyc_verifications` for a user and sync `profiles.is_verified`.
 * Idempotent — safe to call from webhooks that may be retried.
 */
export async function upsertKycVerification(
  params: KycUpsertParams,
): Promise<void> {
  const admin = createAdminClient()

  const row: Record<string, unknown> = {
    user_id: params.userId,
    operator_id: params.operatorId,
    status: params.status,
    applicant_id: params.applicantId,
    external_user_id: params.externalUserId,
    verification_method: params.method,
    rejection_reason: params.rejectionReason ?? null,
    verified_at: params.verifiedAt ? params.verifiedAt.toISOString() : null,
    ...(params.extraFields ?? {}),
  }

  const { error: insertErr } = await admin
    .from('kyc_verifications')
    .insert(row)

  if (insertErr) {
    // Row exists (unique user_id) — update in place.
    const { error: updateErr } = await admin
      .from('kyc_verifications')
      .update(row)
      .eq('user_id', params.userId)
    if (updateErr) {
      console.error(
        `[kyc-status] update failed for user ${params.userId}:`,
        updateErr,
      )
    }
  }

  const isVerified = params.status === KYC_STATUS.APPROVED
  await admin
    .from('profiles')
    .update({ is_verified: isVerified })
    .eq('user_id', params.userId)
}

/**
 * For webhook handlers: resolve operator_id via profile. Single-tenant
 * OTC: no module gating, every active operator is assumed to allow
 * every KYC provider it has integrated.
 */
export async function resolveWebhookOperator(
  userId: string,
  _moduleId: KycModuleId,
): Promise<
  | { ok: true; operatorId: string }
  | { ok: false; reason: string }
> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('operator_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!profile?.operator_id) {
    return { ok: false, reason: 'profile not found' }
  }

  return { ok: true, operatorId: profile.operator_id }
}
