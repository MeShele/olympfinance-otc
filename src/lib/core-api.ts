import { supabase } from "@/integrations/supabase/client";

/**
 * Core API Client — rates and order validation via the platform core gateway.
 */

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL || "";

const DEFAULT_CORE_API =
  "https://api.asystem.ai/functions/v1/core-gateway";

interface CoreAPIResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

async function callCoreAPI<T>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<CoreAPIResponse<T>> {
  try {
    const apiUrl = CORE_API_URL || DEFAULT_CORE_API;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { data: null, error: data.error || data.message || "Core API error" };
    }
    return { data: data as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

// =============================================
// PUBLIC API
// =============================================

export interface CryptoRates {
  crypto: Record<string, number>; // BTC: 97500, ETH: 3200, ...
  fiat: Record<string, number>; // USD: 89.5, EUR: 97.2, ...
  timestamp: number;
}

export interface OrderValidation {
  valid: boolean;
  error?: string;
  warning?: string;
  message?: string;
  timestamp?: number;
}

/**
 * Fetch exchange rates from core API.
 */
export async function fetchCoreRates(): Promise<CoreAPIResponse<CryptoRates>> {
  return callCoreAPI<CryptoRates>("rates");
}

/**
 * Validate an order via core API.
 * Sends ONLY amount and currency pair (NO personal data).
 */
export async function validateOrder(params: {
  from_currency: string;
  to_currency: string;
  amount: number;
  direction: "buy" | "sell" | "swap";
}): Promise<CoreAPIResponse<OrderValidation>> {
  return callCoreAPI<OrderValidation>("validate-order", params);
}
