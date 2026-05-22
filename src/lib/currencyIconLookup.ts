/**
 * Auto-resolve a currency icon URL by its 3-letter code.
 *
 *  - Crypto: query CoinGecko `/search` and take the best ticker match.
 *    Free tier, no API key, CORS-enabled. ~30 req/min/IP, which is
 *    plenty for an admin clicking «Авто» a few times.
 *  - Fiat: ISO 4217 → ISO 3166-1 alpha-2 → `flagcdn.com` PNG. No
 *    network call needed for the lookup itself, only the image fetch.
 *
 *  Returned URL is a stable third-party CDN. Operator can override it
 *  manually after the fact (the field stays editable).
 */

/** ISO 4217 currency code → ISO 3166-1 alpha-2 country (lowercase for flagcdn). */
const FIAT_TO_COUNTRY: Record<string, string> = {
  KGS: "kg", USD: "us", EUR: "eu", RUB: "ru", KZT: "kz", UZS: "uz",
  TJS: "tj", TMT: "tm", AZN: "az", AMD: "am", GEL: "ge", BYN: "by",
  UAH: "ua", MDL: "md", CNY: "cn", JPY: "jp", KRW: "kr", INR: "in",
  TRY: "tr", AED: "ae", SAR: "sa", QAR: "qa", ILS: "il", HKD: "hk",
  SGD: "sg", THB: "th", VND: "vn", IDR: "id", MYR: "my", PHP: "ph",
  GBP: "gb", CHF: "ch", PLN: "pl", CZK: "cz", SEK: "se", NOK: "no",
  DKK: "dk", HUF: "hu", RON: "ro", BGN: "bg", CAD: "ca", AUD: "au",
  NZD: "nz", MXN: "mx", BRL: "br", ARS: "ar", ZAR: "za", EGP: "eg",
};

/** Default flagcdn size — w160 is sharp at 32px display. */
const FLAGCDN_BASE = "https://flagcdn.com/w160";

export const lookupFiatIcon = (code: string): string | null => {
  const cc = FIAT_TO_COUNTRY[code.toUpperCase()];
  if (!cc) return null;
  return `${FLAGCDN_BASE}/${cc}.png`;
};

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank?: number | null;
  large?: string;
  thumb?: string;
}

interface CoinGeckoSearchResponse {
  coins?: CoinGeckoCoin[];
}

/** Probe a URL by loading it as an image — bypasses CORS since `<img>`
 *  doesn't enforce it. Resolves true on `onload`, false on `onerror`. */
const imageExists = (url: string): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof Image === "undefined") return resolve(false);
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src = url;
  });

export const lookupCryptoIcon = async (code: string): Promise<string | null> => {
  const q = code.trim();
  if (!q) return null;

  // 1. CoinCap CDN: direct URL by lowercase ticker. Covers the top ~200
  // coins (BTC/ETH/USDT/SOL/...) and never falls for mem-token name
  // collisions. Probe via <img> load to avoid the CORS preflight.
  if (/^[a-z0-9]{1,8}$/i.test(q)) {
    const coincapUrl = `https://assets.coincap.io/assets/icons/${q.toLowerCase()}@2x.png`;
    if (await imageExists(coincapUrl)) return coincapUrl;
  }

  // 2. CoinGecko search fallback. Rank-sort the candidates so a query
  // like "solana" picks Solana (rank ~5) instead of «Solana Crash
  // Bandicoot Inu» (no rank). Coins without a market_cap_rank fall to
  // the end.
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = (await res.json()) as CoinGeckoSearchResponse;
  const coins = data.coins ?? [];
  if (coins.length === 0) return null;

  const wanted = q.toUpperCase();
  const byRank = (a: CoinGeckoCoin, b: CoinGeckoCoin) =>
    (a.market_cap_rank ?? Number.MAX_SAFE_INTEGER) -
    (b.market_cap_rank ?? Number.MAX_SAFE_INTEGER);

  // Prefer exact symbol match; if none, fall back to any name match.
  const exactSymbol = coins.filter((c) => c.symbol?.toUpperCase() === wanted);
  const pick = (exactSymbol.length > 0 ? exactSymbol : coins).sort(byRank)[0];

  return pick.large ?? pick.thumb ?? null;
};

export const lookupCurrencyIcon = async (
  code: string,
  type: "fiat" | "crypto"
): Promise<string | null> => {
  if (type === "fiat") return lookupFiatIcon(code);
  return lookupCryptoIcon(code);
};
