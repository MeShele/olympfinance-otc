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
