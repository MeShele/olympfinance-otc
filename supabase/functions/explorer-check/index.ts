// Edge function: проверка tx-hash в публичных blockchain-эксплорерах.
// Поддерживает TRC20 (Tronscan), ERC20 (Etherscan), BTC (Blockstream).
// Используется в админке для проверки выплаты или входящего платежа.
//
// Запрос:
//   POST { network: 'TRC20'|'ERC20'|'BTC'|...|, tx_hash: string }
// Ответ:
//   { confirmed, confirmations, from?, to?, amount?, symbol?, timestamp?, raw? }
//   при ошибке: { error: string, hint?: string }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NormalizedResult {
  confirmed: boolean;
  confirmations: number;
  from?: string;
  to?: string;
  amount?: string;
  symbol?: string;
  timestamp?: number;
  raw?: unknown;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function checkTron(hash: string): Promise<NormalizedResult> {
  const url = `https://apilist.tronscanapi.com/api/transaction-info?hash=${encodeURIComponent(hash)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Tronscan ${r.status}`);
  const data = await r.json();
  if (!data || data.message === "not found") {
    throw new Error("Транзакция не найдена в Tron");
  }
  return {
    confirmed: !!data.confirmed,
    confirmations: data.confirmations ?? (data.confirmed ? 1 : 0),
    from: data.ownerAddress ?? data.contractData?.owner_address,
    to: data.toAddress ?? data.contractData?.to_address,
    amount: data.contractData?.amount?.toString(),
    symbol: data.tokenInfo?.tokenAbbr ?? "TRX",
    timestamp: data.timestamp ? Math.floor(data.timestamp / 1000) : undefined,
    raw: data,
  };
}

async function checkEth(hash: string, isErc20: boolean): Promise<NormalizedResult> {
  const apiKey = Deno.env.get("ETHERSCAN_API_KEY") ?? "";
  const base = "https://api.etherscan.io/api";
  const statusUrl = `${base}?module=transaction&action=gettxreceiptstatus&txhash=${hash}&apikey=${apiKey}`;
  const txUrl = `${base}?module=proxy&action=eth_getTransactionByHash&txhash=${hash}&apikey=${apiKey}`;
  const blockUrl = `${base}?module=proxy&action=eth_blockNumber&apikey=${apiKey}`;

  const [statusRes, txRes, blockRes] = await Promise.all([fetch(statusUrl), fetch(txUrl), fetch(blockUrl)]);
  if (!txRes.ok) throw new Error(`Etherscan ${txRes.status}`);

  const statusData = await statusRes.json();
  const txData = await txRes.json();
  const blockData = await blockRes.json();

  const tx = txData.result;
  if (!tx || tx === null) throw new Error("Транзакция не найдена в Ethereum");

  const txBlock = tx.blockNumber ? parseInt(tx.blockNumber, 16) : null;
  const currentBlock = blockData.result ? parseInt(blockData.result, 16) : null;
  const confirmations = txBlock && currentBlock ? Math.max(0, currentBlock - txBlock) : 0;
  const confirmed = statusData.result?.status === "1" && confirmations > 0;

  return {
    confirmed,
    confirmations,
    from: tx.from,
    to: tx.to,
    amount: tx.value ? BigInt(tx.value).toString() : undefined,
    symbol: isErc20 ? "USDT/USDC (ERC20)" : "ETH",
    raw: { status: statusData, tx, currentBlock },
  };
}

async function checkBtc(hash: string): Promise<NormalizedResult> {
  const r = await fetch(`https://blockstream.info/api/tx/${encodeURIComponent(hash)}`);
  if (!r.ok) throw new Error("Транзакция не найдена в Bitcoin");
  const data = await r.json();
  const tipR = await fetch("https://blockstream.info/api/blocks/tip/height");
  const tipHeight = tipR.ok ? parseInt(await tipR.text(), 10) : 0;
  const txHeight = data.status?.block_height ?? 0;
  const confirmations = data.status?.confirmed && txHeight ? Math.max(0, tipHeight - txHeight + 1) : 0;

  return {
    confirmed: !!data.status?.confirmed,
    confirmations,
    from: data.vin?.[0]?.prevout?.scriptpubkey_address,
    to: data.vout?.[0]?.scriptpubkey_address,
    amount: data.vout?.[0]?.value?.toString(),
    symbol: "BTC",
    timestamp: data.status?.block_time,
    raw: data,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let body: { network?: string; tx_hash?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const network = (body.network ?? "").toUpperCase().trim();
  const hash = (body.tx_hash ?? "").trim();
  if (!network || !hash) return json(400, { error: "network и tx_hash обязательны" });

  try {
    let result: NormalizedResult;
    if (network === "TRC20" || network === "TRON") {
      result = await checkTron(hash);
    } else if (network === "ERC20" || network === "ETHEREUM" || network === "ETH") {
      result = await checkEth(hash, network === "ERC20");
    } else if (network === "BTC" || network === "BITCOIN") {
      result = await checkBtc(hash);
    } else {
      return json(400, {
        error: `Сеть ${network} не поддерживается`,
        hint: "Поддерживаются: TRC20, ERC20, BTC",
      });
    }
    return json(200, result);
  } catch (e) {
    return json(404, { error: (e as Error).message });
  }
});
