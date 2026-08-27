import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function rpc(name: string, params: Record<string, unknown>) {
  return await supabase.rpc(name, params as Record<string, string | number | boolean | null>);
}

Deno.test('tally_match_votes: idempotência', async () => {
  const { data: result1, error: err1 } = await rpc('tally_match_votes', {
    p_match_id: '00000000-0000-0000-0000-000000000001',
    p_group_id: null,
  });
  assertEquals(err1, null);
  assertEquals(result1.success, true);
  assertEquals(result1.already_processed, false);

  const { data: result2, error: err2 } = await rpc('tally_match_votes', {
    p_match_id: '00000000-0000-0000-0000-000000000001',
    p_group_id: null,
  });
  assertEquals(err2, null);
  assertEquals(result2.success, true);
  assertEquals(result2.already_processed, true);
});

Deno.test('tally_match_votes: grupo inválido retorna erro', async () => {
  const { error } = await rpc('tally_match_votes', {
    p_match_id: '00000000-0000-0000-0000-000000000001',
    p_group_id: '00000000-0000-0000-0000-000000000099',
  });
  assertEquals(error?.code, '42501');
});

Deno.test('tally_match_votes: partida inexistente retorna erro', async () => {
  const { error } = await rpc('tally_match_votes', {
    p_match_id: '00000000-0000-0000-0000-000000000099',
    p_group_id: null,
  });
  assertEquals(error?.code, 'P0002');
});
