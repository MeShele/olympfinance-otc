/**
 * Single-tenant constants for the Olymp Finance OTC build.
 *
 * Override `PLATFORM_BASE_DOMAIN` at build time via the
 * `VITE_PLATFORM_BASE_DOMAIN` env var if the production apex changes.
 */

export const PLATFORM_BASE_DOMAIN: string =
  (import.meta.env.VITE_PLATFORM_BASE_DOMAIN as string | undefined) ?? 'olympfinance.kg'

/** Admin panel host. Single-tenant, so it's the same apex. */
export const PLATFORM_ADMIN_HOST = PLATFORM_BASE_DOMAIN

/** Support email shown on legal / help pages. */
export const PLATFORM_SUPPORT_EMAIL =
  (import.meta.env.VITE_PLATFORM_SUPPORT_EMAIL as string | undefined) ??
  `support@${PLATFORM_BASE_DOMAIN}`

/** Public site root used in installer / share links. */
export const PLATFORM_INSTALLER_BASE = `https://${PLATFORM_BASE_DOMAIN}`
