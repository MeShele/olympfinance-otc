import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from "@supabase/supabase-js";

/**
 * Wrapper around `supabase.functions.invoke()` that turns the framework's
 * generic «Edge Function returned a non-2xx status code» / «Failed to send
 * a request to the Edge Function» into a concrete, user-readable message.
 *
 * Resolution order for the thrown message:
 *  1. JSON body `{ error: "…" }` returned by the edge function on 4xx/5xx
 *  2. Body text if it isn't JSON
 *  3. Mapping for known framework error classes (auth refused, network down,
 *     boot crash) → friendly Russian copy
 *  4. The original error.message as last resort
 *
 * On 2xx the function also unwraps an in-band `{ error: "…" }` payload so
 * legacy edge functions that return 200 + error stay diagnosable.
 *
 * Returns the decoded data when successful, throws a plain `Error` with a
 * concrete `message` otherwise — callers (toasts, mutations) just print
 * `err.message`.
 */

export class EdgeFunctionError extends Error {
  public readonly status: number | null;
  public readonly functionName: string;
  public readonly raw: unknown;

  constructor(message: string, opts: {
    functionName: string;
    status?: number | null;
    raw?: unknown;
  }) {
    super(message);
    this.name = "EdgeFunctionError";
    this.functionName = opts.functionName;
    this.status = opts.status ?? null;
    this.raw = opts.raw;
  }
}

interface InvokeOptions {
  /** Treat 200 with `{ ok: false }` as failure even if no `error` key. */
  treatOkFalseAsError?: boolean;
}

async function readErrorMessageFromResponse(
  response: Response | undefined,
): Promise<string | null> {
  if (!response || typeof response.text !== "function") return null;
  let text: string;
  try {
    text = await response.text();
  } catch {
    return null;
  }
  if (!text) return null;
  try {
    const body = JSON.parse(text) as { error?: unknown; message?: unknown };
    if (typeof body.error === "string" && body.error) return body.error;
    if (typeof body.message === "string" && body.message) return body.message;
  } catch {
    // Body wasn't JSON — fall through.
  }
  // Some Supabase boot-time errors come as `{"code":"BOOT_ERROR","message":"…"}`
  // already handled by the JSON branch. As a safety net:
  return text.length > 200 ? null : text.trim();
}

function friendlyFromFrameworkError(error: unknown, functionName: string): string {
  if (error instanceof FunctionsFetchError) {
    return `Сервер «${functionName}» сейчас недоступен. Попробуйте через минуту или сообщите в поддержку.`;
  }
  if (error instanceof FunctionsRelayError) {
    return `Не удалось обратиться к серверу «${functionName}». Проверьте интернет-соединение.`;
  }
  if (error instanceof FunctionsHttpError) {
    // Should have been handled by readErrorMessageFromResponse already.
    return `Сервер «${functionName}» вернул ошибку.`;
  }
  if (error instanceof Error && error.message) return error.message;
  return `Не удалось выполнить операцию (${functionName}).`;
}

export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>,
  opts: InvokeOptions = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body,
  });

  if (error) {
    let message: string | null = null;

    // FunctionsHttpError carries the actual Response on `.context`.
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      message = await readErrorMessageFromResponse(ctx);
    }

    if (!message) {
      message = friendlyFromFrameworkError(error, functionName);
    }

    throw new EdgeFunctionError(message, {
      functionName,
      status: ctx?.status ?? null,
      raw: error,
    });
  }

  // Some legacy functions return 200 with `{ error: "…" }`. Unwrap them.
  if (data && typeof data === "object") {
    const inBand = (data as { error?: unknown; ok?: unknown }).error;
    if (typeof inBand === "string" && inBand) {
      throw new EdgeFunctionError(inBand, { functionName, status: 200, raw: data });
    }
    if (opts.treatOkFalseAsError && (data as { ok?: unknown }).ok === false) {
      throw new EdgeFunctionError(
        `Сервер «${functionName}» вернул отказ.`,
        { functionName, status: 200, raw: data },
      );
    }
  }

  return data as T;
}
