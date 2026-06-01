import { invokeEdgeFunction } from "@/lib/edgeInvoke";

/** Fetch KGS equivalent from NBKR rates edge function (with timeout). Falls
 *  back to 0 on any failure — this is a non-blocking enrichment, the order
 *  flow can proceed without it. */
export const fetchAmountKgs = async (
  amount: number,
  currency: string,
  cryptoRateToUsd?: number
): Promise<number> => {
  try {
    const data = await Promise.race([
      invokeEdgeFunction<{ success?: boolean; amountKgs?: number }>("nbkr-rates", {
        amount,
        currency,
        cryptoRateToUsd,
      }),
      new Promise<{ success: false }>((resolve) =>
        setTimeout(() => resolve({ success: false }), 8000),
      ),
    ]);

    if (!data?.success) {
      return 0;
    }

    return (data as { amountKgs?: number }).amountKgs ?? 0;
  } catch (err) {
    console.warn("Error fetching NBKR rates:", err);
    return 0;
  }
};

/**
 * Сети с поддержкой memo/destination-tag. На общем (статическом) депозит-адресе
 * уникальный memo на ордер даёт чистую атрибуцию «кто заплатил» — оператор
 * сверяет поступление по memo. Не-memo сети (BTC/ETH/USDT…) атрибутируются по
 * адресу-отправителю + сумме + ручному подтверждению. Расширяемо: XRP/XLM/EOS/ATOM
 * по мере добавления этих сетей в каталог.
 */
export const MEMO_NETWORKS = new Set(["TON"]);

export const requiresMemo = (network?: string | null): boolean =>
  !!network && MEMO_NETWORKS.has(network.toUpperCase());

/**
 * Короткий числовой memo, уникальный на ордер (digits из случайного UUID).
 * Числовой, потому что memo-цепочки (TON comment, XRP destination-tag) ждут
 * целое/строку без спецсимволов.
 */
export const generateMemo = (): string => {
  const digits = crypto.randomUUID().replace(/\D/g, "");
  return (digits.slice(0, 9) || "0").padStart(6, "0");
};

/** Merge payment data into existing notes JSON */
export const mergePaymentIntoNotes = (
  existingNotes: string | undefined,
  payment: Record<string, unknown>
): string => {
  let base: Record<string, unknown> = {};
  if (existingNotes) {
    try {
      base = JSON.parse(existingNotes);
    } catch {
      // If notes is plain text, preserve it under user_notes
      base = { user_notes: existingNotes };
    }
  }
  return JSON.stringify({ ...base, payment });
};
