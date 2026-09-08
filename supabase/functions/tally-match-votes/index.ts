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
    const { data: matchRow, error: matchRowError } = await adminClient
      .from('matches')
      .select('group_id, organizer_id')
      .eq('id', matchId)
      .single();

    if (matchRowError || !matchRow) {
      throw new FunctionError(404, 'Partida não encontrada');
    }

    matchGroupId = matchRow.group_id ?? null;

    const isOrganizer = matchRow.organizer_id === userId;
    const callerIsAdmin = await isGlobalAdmin(authenticatedClient, adminClient, userId);
    const isGroupAdm = matchGroupId ? await isGroupAdmin(authenticatedClient, matchGroupId) : false;

    if (!callerIsAdmin && !isGroupAdm && !isOrganizer) {
      throw new FunctionError(403, 'Apenas administradores ou o organizador podem encerrar a votação');
    }

    const { data, error } = await adminClient.rpc('tally_match_votes', {
      p_match_id: matchId,
      p_group_id: groupId ?? matchGroupId ?? null,
    });

    if (error) {
      console.error('RPC tally_match_votes error:', error);
      if (error.code === '42501') {
        throw new FunctionError(403, 'Partida não pertence ao grupo informado');
      }
      throw new FunctionError(400, `Erro ao processar votação: ${error.message}`);
    }

    return jsonResponse(data ?? { success: true }, 200, headers);
  } catch (error) {
    if (error instanceof FunctionError) {
      return jsonResponse({ error: error.message }, error.status, headers);
    }
    console.error('tally-match-votes:', error);
    const detailMsg = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
    return jsonResponse(
      { error: `Erro ao encerrar a partida: ${detailMsg}` },
      500,
      headers,
    );
  }
});
