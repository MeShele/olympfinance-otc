/**
 * Shared CORS and JSON response helpers for all edge functions.
 */

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'

export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-payload-digest, x-sumsub-payload-digest, x-signature, x-signature-v2, x-timestamp',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function handleOptions(): Response {
  return new Response('ok', { headers: corsHeaders })
}
