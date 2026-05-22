import type { CompanySettings } from "@/hooks/useCompanySettings";
import type { CompanyData } from "./types";

export const buildCompanyData = (s: CompanySettings): CompanyData => ({
  companyName: s.company_name || "Оператор",
  inn: s.inn || "",
  okpo: s.okpo || "",
  legalAddress: s.legal_address || "",
  website: s.website || "",
  directorShort: s.director_short || "",
  feePercent: s.fee_percent ?? 0,
  // Per-tenant брендинг чека: логотип/контакты/директор для header/footer.
  logoUrl: s.logo_url || s.logo_dark_url || null,
  phone: s.phone || null,
  email: s.email || null,
  directorName: s.director_name || null,
});
