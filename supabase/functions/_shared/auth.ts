import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class FunctionError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const BASE_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ALLOWED_ORIGINS env var: lista de origens separadas por vírgula.
// Sem a variável configurada, mantém comportamento permissivo (com warning).
export function corsHeaders(req: Request): Record<string, string> {
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    console.warn('ALLOWED_ORIGINS nao configurado - CORS liberado para qualquer origem');
    return { ...BASE_CORS_HEADERS, 'Access-Control-Allow-Origin': '*' };
  }

  const origin = req.headers.get('Origin') ?? '';
  if (!allowedOrigins.includes(origin)) {
    return BASE_CORS_HEADERS;
  }
  return { ...BASE_CORS_HEADERS, 'Access-Control-Allow-Origin': origin };
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...extraHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function getEnvOrThrow(): { supabaseUrl: string; anonKey: string; serviceRoleKey: string } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new FunctionError(500, 'Configuracao do servidor incompleta');
  }

  return { supabaseUrl, anonKey, serviceRoleKey };
}

// Valida o JWT do chamador e anexa o caller. Retorna o client autenticado (RLS
// avalia como o usuário real) e o client service_role. Não aplica verificação
// de role aqui — cada função decide a política.
export async function authenticate(
  req: Request,
): Promise<{ userId: string; authenticatedClient: SupabaseClient; adminClient: SupabaseClient }> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!jwt) {
    throw new FunctionError(401, 'Autenticacao necessaria');
  }

  const { supabaseUrl, anonKey, serviceRoleKey } = getEnvOrThrow();

  const authenticatedClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await authenticatedClient.auth.getUser(jwt);
  if (userError || !userData?.user) {
    throw new FunctionError(401, 'Sessao invalida ou expirada');
  }
  const userId = userData.user.id;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  return { userId, authenticatedClient, adminClient };
}

// TRUE se o usuário (userId) for admin global.
export async function isGlobalAdmin(
  authenticatedClient: SupabaseClient,
  adminClient: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: rpcResult, error: rpcError } = await authenticatedClient.rpc('is_admin');
  if (!rpcError && typeof rpcResult === 'boolean') return rpcResult;

  const { data: profile } = await adminClient.from('users').select('role').eq('id', userId)
    .maybeSingle();
  return profile?.role === 'admin';
}

// TRUE se o usuário do JWT for admin do grupo informado.
export async function isGroupAdmin(
  authenticatedClient: SupabaseClient,
  groupId: string,
): Promise<boolean> {
  const { data, error } = await authenticatedClient.rpc('is_group_admin', { p_group_id: groupId });
  return !error && data === true;
}
