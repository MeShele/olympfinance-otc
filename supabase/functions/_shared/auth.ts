import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse } from './cors.ts'

/** Resolve the operator the user belongs to via their profile row. */
async function getOperatorIdForUser(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('operator_id')
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.operator_id as string | undefined) ?? null
}

/**
 * Authentication and role helpers for edge functions.
 *
 * Pattern: each helper returns either { ok: true, ... } or { ok: false, response }
 * so the caller can early-return the prepared Response.
 */

export interface UserOperatorContext {
  user: { id: string; email?: string | null }
  userId: string
  operatorId: string
}

export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

function createUserClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
}

/** Auth user + resolve operator_id via profile. Used by *-token edge functions. */
export async function requireUserAndOperator(
  req: Request,
): Promise<
  | { ok: true; ctx: UserOperatorContext }
  | { ok: false; response: Response }
> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: jsonResponse({ error: 'Unauthorized' }, 401) }
  }

  const supabaseUser = createUserClient(authHeader)
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return { ok: false, response: jsonResponse({ error: 'Unauthorized' }, 401) }
  }

  const operatorId = await getOperatorIdForUser(user.id)
  if (!operatorId) {
    return {
      ok: false,
      response: jsonResponse({ error: 'Operator not found for user' }, 400),
    }
  }

  return {
    ok: true,
    ctx: {
      user: { id: user.id, email: user.email ?? null },
      userId: user.id,
      operatorId,
    },
  }
}

/** Require admin or operator_admin role. Used by privileged admin endpoints. */
export async function requireAdminRole(
  req: Request,
): Promise<
  | { ok: true; userId: string; role: 'admin' | 'operator_admin' }
  | { ok: false; response: Response }
> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: jsonResponse({ error: 'Unauthorized' }, 401) }
  }

  const supabaseUser = createUserClient(authHeader)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) {
    return { ok: false, response: jsonResponse({ error: 'Unauthorized' }, 401) }
  }

  const admin = createAdminClient()
  const { data: roleRow } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (
    !roleRow ||
    (roleRow.role !== 'admin' && roleRow.role !== 'operator_admin')
  ) {
    return { ok: false, response: jsonResponse({ error: 'Forbidden' }, 403) }
  }

  return { ok: true, userId: user.id, role: roleRow.role }
}
