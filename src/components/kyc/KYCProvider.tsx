/**
 * Single-tenant build only ships the in-house Olymp Finance KYC. This thin
 * re-export keeps import sites working unchanged in case a different
 * provider is wired in later.
 */
export { default } from "./OlympFinanceKYC";
