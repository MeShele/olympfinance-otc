/**
 * Single-tenant constants for Olymp Finance OTC edge functions.
 * Override at deploy time via the `PLATFORM_BASE_DOMAIN` env var.
 */

export const PLATFORM_BASE_DOMAIN =
  Deno.env.get('PLATFORM_BASE_DOMAIN') ?? 'olympfinance.kg'

export const PLATFORM_ADMIN_HOST = PLATFORM_BASE_DOMAIN
export const PLATFORM_SUPPORT_EMAIL =
  Deno.env.get('PLATFORM_SUPPORT_EMAIL') ?? `support@${PLATFORM_BASE_DOMAIN}`
export const PLATFORM_INSTALLER_BASE = `https://${PLATFORM_BASE_DOMAIN}`
