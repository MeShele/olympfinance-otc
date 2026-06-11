// Edge-runtime main-роутер (канонический supabase/edge-runtime паттерн).
// Принимает все запросы на :9000, достаёт имя функции из первого сегмента пути
// (/functions/v1 уже срезан Kong'ом → путь вида /<fn>/...), и поднимает
// per-function воркер из /home/deno/functions/<fn>/index.ts.
//
// Наши функции лежат в ../../../supabase/functions (маунт :ro в compose).

const FUNCTIONS_DIR = "/home/deno/functions";
const JWT_SECRET = Deno.env.get("SUPABASE_INTERNAL_JWT_SECRET") ?? Deno.env.get("JWT_SECRET") ?? "";
const VERIFY_JWT = (Deno.env.get("VERIFY_JWT") ?? "false") === "true";

Deno.serve({ port: 9000 }, async (req: Request) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const functionName = segments[0];

  if (!functionName) {
    return new Response(
      JSON.stringify({ error: "missing function name" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const servicePath = `${FUNCTIONS_DIR}/${functionName}`;

  try {
    // Проверяем, что функция существует (есть index.ts).
    await Deno.stat(`${servicePath}/index.ts`);
  } catch {
    return new Response(
      JSON.stringify({ error: `function '${functionName}' not found` }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const memoryLimitMb = 256;
  const workerTimeoutMs = 400_000;
  const noModuleCache = false;
  const importMapPath = null;
  const envVars = Object.entries(Deno.env.toObject());

  try {
    // @ts-ignore EdgeRuntime — глобал, доступный в supabase/edge-runtime
    const worker = await EdgeRuntime.userWorkers.create({
      servicePath,
      memoryLimitMb,
      workerTimeoutMs,
      noModuleCache,
      importMapPath,
      envVars,
      forceCreate: false,
      cpuTimeSoftLimitMs: 60_000,
      cpuTimeHardLimitMs: 120_000,
      decoratorType: "tc39",
      verifyJwt: VERIFY_JWT,
      jwtSecret: JWT_SECRET,
    });
    return await worker.fetch(req);
  } catch (e) {
    console.error(`[edge main] '${functionName}' failed:`, e);
    return new Response(
      JSON.stringify({ error: "function boot error", detail: String(e?.message ?? e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
