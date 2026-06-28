/**
 * Нормализация страны/гражданства для резидентства KG (ГСФР — резидент/нерезидент КР).
 *
 * Фронтовый аналог `supabase/functions/_shared/country.ts` (edge/Deno во фронт НЕ импортируется —
 * Vite vs Deno-рантайм), поэтому единый источник токенов держим здесь.
 *
 * Провайдеры KYC пишут страну в РАЗНЫХ форматах (asystem→'KGZ', Biometric Vision→'KG',
 * Didit→'Kyrgyzstan'/код). Прямое сравнение `=== 'KGZ'` ошибочно относило бы KG-резидента с
 * 'KG'/'Kyrgyzstan' к нерезидентам и (в отчётах) недо/пере-репортило бы ГСФР.
 */

const KG_SYNONYMS = new Set([
  "KG", "KGZ", "417", // ISO-2 / ISO-3 / ISO-numeric
  "KYRGYZSTAN", "KYRGYZ", "KYRGYZREPUBLIC", "KYRGYZSTANREPUBLIC",
  "КЫРГЫЗСТАН", "КЫРГЫЗ", "КЫРГЫЗСКАЯ", "КЫРГЫЗСКАЯРЕСПУБЛИКА",
  "КИРГИЗИЯ", "КИРГИЗСКАЯ", "КИРГИЗСТАН", "КЫРГЫЗРЕСПУБЛИКАСЫ",
]);

/**
 * Нормализованный признак резидентства KG из сырого значения страны/гражданства.
 *   true  — распознан как KG
 *   false — распознан как валидная НЕ-KG страна
 *   null  — пусто/не распознано (вызывающий НЕ дефолтит в резидента)
 */
export function isKgResident(raw: string | null | undefined): boolean | null {
  if (raw == null) return null;
  const s = String(raw).toUpperCase().replace(/[\s._-]+/g, "");
  if (!s) return null;
  if (KG_SYNONYMS.has(s)) return true;
  if (/^[A-ZА-ЯЁ]{2,40}$/.test(s) || /^\d{3}$/.test(s)) return false;
  return null;
}

/**
 * Бейдж «non-KG»: true только когда страна ЯВНО распознана как не-KG.
 * null/мусор → false (без бейджа).
 */
export function isNonKgCountry(raw: unknown): boolean {
  return isKgResident(raw as string | null | undefined) === false;
}
