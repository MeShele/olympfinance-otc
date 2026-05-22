import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const NBKR_URL = 'https://www.nbkr.kg/XML/daily.xml';

interface CurrencyRate {
  code: string;
  nominal: number;
  value: number;
}

/**
 * Parse NBKR XML response to extract currency rates.
 * XML format:
 * <CurrencyRates>
 *   <Currency ISOCode="USD">
 *     <Nominal>1</Nominal>
 *     <Value>87,4500</Value>
 *   </Currency>
 * </CurrencyRates>
 */
function parseNbkrXml(xml: string): { date: string; rates: CurrencyRate[] } {
  const rates: CurrencyRate[] = [];

  // Extract date from the root element
  const dateMatch = xml.match(/date="([^"]+)"/i);
  const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('ru-RU');

  // Extract each currency block
  const currencyRegex = /<currency\s+isocode="([^"]+)"[^>]*>\s*<nominal>(\d+)<\/nominal>\s*<value>([\d,]+)<\/value>\s*<\/currency>/gi;
  let match;

  while ((match = currencyRegex.exec(xml)) !== null) {
    const code = match[1].toUpperCase();
    const nominal = parseInt(match[2], 10);
    // NBKR uses comma as decimal separator
    const value = parseFloat(match[3].replace(',', '.'));

    if (!isNaN(value) && !isNaN(nominal)) {
      rates.push({ code, nominal, value });
    }
  }

  return { date, rates };
}

/**
 * Convert any amount to KGS using NBKR rates.
 * For fiat currencies: use direct NBKR rate.
 * For crypto currencies: convert via USD rate (crypto → USD → KGS).
 */
function convertToKgs(
  amount: number,
  currency: string,
  rates: CurrencyRate[],
  cryptoRateToUsd?: number
): number | null {
  const currencyUpper = currency.toUpperCase();

  // If already KGS, return as-is
  if (currencyUpper === 'KGS') return amount;

  // Check if it's a fiat currency with a direct NBKR rate
  const directRate = rates.find(r => r.code === currencyUpper);
  if (directRate) {
    // Rate is: 1 nominal of foreign currency = value KGS
    return amount * (directRate.value / directRate.nominal);
  }

  // For crypto or other currencies without direct rate: use USD as intermediary
  if (cryptoRateToUsd !== undefined && cryptoRateToUsd > 0) {
    const usdRate = rates.find(r => r.code === 'USD');
    if (usdRate) {
      const amountInUsd = amount * cryptoRateToUsd;
      return amountInUsd * (usdRate.value / usdRate.nominal);
    }
  }

  return null;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let action = url.searchParams.get('action');

    // Parse body if present (POST requests)
    let body: any = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
      // Allow action to be specified in body as well
      if (!action && body.action) {
        action = body.action;
      }
      // Auto-detect convert action if amount and currency are in body
      if (!action && body.amount && body.currency) {
        action = 'convert';
      }
    }

    // Fetch rates from NBKR
    console.log('Fetching rates from NBKR...');
    const response = await fetch(NBKR_URL);
    if (!response.ok) {
      throw new Error(`NBKR API returned status ${response.status}`);
    }

    const xml = await response.text();
    const { date, rates } = parseNbkrXml(xml);

    console.log(`Parsed ${rates.length} rates for date ${date}`);
    rates.forEach(r => console.log(`  ${r.code}: ${r.value} KGS per ${r.nominal}`));

    // Action: just return rates
    if (!action || action === 'rates') {
      return new Response(
        JSON.stringify({
          success: true,
          date,
          rates: rates.map(r => ({
            code: r.code,
            nominal: r.nominal,
            rateToKgs: r.value,
          })),
          usdToKgs: rates.find(r => r.code === 'USD')?.value || null,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Action: convert amount to KGS
    if (action === 'convert') {
      const { amount, currency, cryptoRateToUsd } = body;

      if (!amount || !currency) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing amount or currency' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const kgsAmount = convertToKgs(
        parseFloat(amount),
        currency,
        rates,
        cryptoRateToUsd ? parseFloat(cryptoRateToUsd) : undefined
      );

      console.log(`Convert ${amount} ${currency} → ${kgsAmount} KGS (cryptoRateToUsd: ${cryptoRateToUsd})`);

      return new Response(
        JSON.stringify({
          success: true,
          date,
          amount: parseFloat(amount),
          currency,
          amountKgs: kgsAmount !== null ? Math.round(kgsAmount * 100) / 100 : null,
          usdToKgs: rates.find(r => r.code === 'USD')?.value || null,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in nbkr-rates:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
