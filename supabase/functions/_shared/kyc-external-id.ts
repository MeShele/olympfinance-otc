import {
  KYC_EXTERNAL_ID_PREFIX,
  KycMethod,
  UUID_REGEX,
} from './kyc-constants.ts'

/** Format `external_user_id` for outbound calls to a provider. */
export function formatExternalUserId(
  method: KycMethod,
  userId: string,
): string {
  return `${KYC_EXTERNAL_ID_PREFIX[method]}${userId}`
}

/**
 * Extract Supabase user UUID from an incoming external_user_id string.
 * Strips any known provider prefix and validates the UUID shape.
 * Returns null for malformed or unknown input — caller decides whether
 * to 401, 200-ack, or log and skip.
 */
export function parseExternalUserId(
  externalUserId: string | null | undefined,
): string | null {
  if (!externalUserId) return null

  let stripped = externalUserId
  for (const prefix of Object.values(KYC_EXTERNAL_ID_PREFIX)) {
    if (externalUserId.startsWith(prefix)) {
      stripped = externalUserId.slice(prefix.length)
      break
    }
  }

  if (!UUID_REGEX.test(stripped)) return null
  return stripped
}
