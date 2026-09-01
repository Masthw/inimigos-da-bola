import { authenticate, corsHeaders, FunctionError, isGlobalAdmin, isGroupAdmin, jsonResponse } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const headers = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const { adminClient, authenticatedClient, userId } = await authenticate(req);

    const { matchId, groupId } = await req.json().catch(() => ({}));

    if (!matchId) {
      throw new FunctionError(400, 'matchId é obrigatório');
    }

    let matchGroupId: string | null = null;
    const { data: matchRow } = await authenticatedClient
      .from('matches')
      .select('group_id')
      .eq('id', matchId)
      .single();
    matchGroupId = matchRow?.group_id ?? null;

    const callerIsAdmin = await isGlobalAdmin(authenticatedClient, adminClient, userId);
    if (!callerIsAdmin && (!matchGroupId || !(await isGroupAdmin(authenticatedClient, matchGroupId)))) {
      throw new FunctionError(403, 'Apenas administradores podem executar esta acao');
    }

    const { data, error } = await adminClient.rpc('tally_match_votes', {
      p_match_id: matchId,
      p_group_id: groupId ?? null,
    });

    if (error) {
      if (error.code === '42501') {
        throw new FunctionError(403, 'Partida não pertence ao grupo informado');
      }
      throw error;
    }

    return jsonResponse(data ?? { success: true }, 200, headers);
  } catch (error) {
    if (error instanceof FunctionError) {
      return jsonResponse({ error: error.message }, error.status, headers);
    }
    console.error('tally-match-votes:', error);
    return jsonResponse(
      { error: 'Erro interno ao encerrar a partida. Tente novamente ou contate o suporte.' },
      500,
      headers,
    );
  }
});
