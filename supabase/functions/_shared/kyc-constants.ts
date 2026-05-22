/**
 * Central registry of KYC-related constants shared across edge functions
 * and (via re-export in src/lib) the frontend.
 *
 * This kills scattered magic strings in 40+ locations.
 */

export const KYC_MODULES = {
  ASYSTEM: 'asystem-kyc',
  SUMSUB: 'sumsub-kyc',
  BIOMETRIC_VISION: 'biometric-vision',
  DIDIT: 'didit-kyc',
} as const

export type KycModuleId = typeof KYC_MODULES[keyof typeof KYC_MODULES]

/** Unified KYC statuses as stored in the `kyc_verifications.status` column. */
export const KYC_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type KycStatus = typeof KYC_STATUS[keyof typeof KYC_STATUS]

/** `kyc_verifications.verification_method` values — provider identifier. */
export const KYC_METHOD = {
  ASYSTEM: 'asystem',
  SUMSUB: 'sumsub',
  BIOMETRIC_VISION: 'biometric-vision',
  DIDIT: 'didit',
} as const

export type KycMethod = typeof KYC_METHOD[keyof typeof KYC_METHOD]

/**
 * External user ID prefix per provider.
 *
 * LOCKED for backward compatibility — keep `fiatex_` for SumSub/BV/internal
 * KYC. Existing external user IDs in those providers depend on this exact
 * prefix; changing it would orphan applicants. Didit uses its own prefix.
 */
export const KYC_EXTERNAL_ID_PREFIX: Record<KycMethod, string> = {
  [KYC_METHOD.SUMSUB]: 'fiatex_',
  [KYC_METHOD.BIOMETRIC_VISION]: 'fiatex_',
  [KYC_METHOD.DIDIT]: 'didit_',
  [KYC_METHOD.ASYSTEM]: 'fiatex_',
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
