// Testes de integração de DB: entrada/waitlist em partidas 'open' e 'preparing',
// balanceamento de times, promoção da fila de espera e edição de capacidade.
//
// Pré-requisitos:
//   - Supabase local rodando com as migrations aplicadas (supabase start / db reset)
//   - Variáveis de ambiente (ou defaults para localhost):
//       SUPABASE_URL        (default http://localhost:54321)
//       SUPABASE_SERVICE_KEY
//       SUPABASE_ANON_KEY   (opcional; usa SERVICE_KEY como fallback)
//
// Execução:
//   deno test --allow-net --allow-env supabase/tests/matches-join.test.ts
//
// Os testes criam as próprias fixtures (grupo, usuários, partidas) como usuários
// reais para exercitar as policies de RLS de verdade.

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const URL = Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? SERVICE_KEY;
const PASSWORD = 'senha-teste-123';
const TEST_PREFIX = 'inimigos-test';
const TEST_EMAIL = (slug: string) => `${TEST_PREFIX}-${slug}@example.com`;
const GROUP_ID = '10000000-0000-0000-0000-000000000001';
const GROUP_CODE = String(Math.floor(100000 + Math.random() * 900000));

const admin: SupabaseClient = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

interface FixtureUser {
  id: string;
  email: string;
  name: string;
}

let sportId: number;
let gameTypeId: number;
let organizer: FixtureUser;
let member1: FixtureUser;
let member2: FixtureUser;
let member3: FixtureUser;

const sessionCache = new Map<string, SupabaseClient>();

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

async function asUser(u: FixtureUser): Promise<SupabaseClient> {
  const cached = sessionCache.get(u.email);
  if (cached) return cached;
  const client: SupabaseClient = createClient(URL, ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: u.email,
    password: PASSWORD,
  });
  assert(!error, `login falhou para ${u.email}: ${error?.message}`);
  sessionCache.set(u.email, client);
  return client;
}

async function createUser(name: string, slug: string): Promise<FixtureUser> {
  const email = TEST_EMAIL(slug);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  assert(!error, `createUser ${email}: ${error?.message}`);
  return { id: data!.user!.id, email, name };
}

interface CreateMatchOpts {
  status: 'open' | 'preparing';
  maxPlayers: number;
  countA?: number;
  countB?: number;
}

async function createMatch(opts: CreateMatchOpts): Promise<string> {
  const { data: match, error } = await admin.from('matches').insert({
    organizer_id: organizer.id,
    group_id: GROUP_ID,
    game_type_id: gameTypeId,
    date_time: new Date(Date.now() + 86_400_000).toISOString(),
    location: 'Quadra teste',
    max_players: opts.maxPlayers,
    status: opts.status,
    team_a_name: 'Time A',
    team_b_name: 'Time B',
  }).select('id').single();
  assert(!error, `criar partida: ${error?.message}`);

  const rows: { match_id: string; guest_name: string; team: string; status: string }[] = [];
  for (let i = 0; i < (opts.countA ?? 0); i++) {
    rows.push({ match_id: match!.id, guest_name: `Convidado A ${i}`, team: 'A', status: 'confirmed' });
  }
  for (let i = 0; i < (opts.countB ?? 0); i++) {
    rows.push({ match_id: match!.id, guest_name: `Convidado B ${i}`, team: 'B', status: 'confirmed' });
  }
  if (rows.length > 0) {
    const { error: seedError } = await admin.from('match_players').insert(rows);
    assert(!seedError, `semear confirmados: ${seedError?.message}`);
  }
  return match!.id;
}

// Auto-inscrição do usuário via RLS (mesmo caminho do app: upsert com team 'A')
async function joinMatch(u: FixtureUser, matchId: string, status: string): Promise<unknown> {
  const client = await asUser(u);
  const { error } = await client.from('match_players').upsert(
    { match_id: matchId, status, team: 'A' },
    { onConflict: 'match_id,user_id' },
  );
  return error;
}

async function playerRow(u: FixtureUser, matchId: string) {
  const { data, error } = await admin
    .from('match_players').select('status, team').eq('match_id', matchId).eq('user_id', u.id).single();
  assert(!error, `ler linha de ${u.email}: ${error?.message}`);
  return data as { status: string; team: string };
}

async function cleanup() {
  try { await admin.from('matches').delete().eq('group_id', GROUP_ID); } catch { /* ignora */ }
  try { await admin.from('group_members').delete().eq('group_id', GROUP_ID); } catch { /* ignora */ }
  try { await admin.from('groups').delete().eq('id', GROUP_ID); } catch { /* ignora */ }

  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const au of (authUsers?.users ?? [])) {
    if (au.email?.startsWith(TEST_PREFIX)) {
      try { await admin.auth.admin.deleteUser(au.id); } catch { /* ignora */ }
    }
  }
  try { await admin.from('users').delete().like('email', `${TEST_PREFIX}%`); } catch { /* ignora */ }

  try { await admin.from('game_types').delete().eq('name', `Esporte Teste ${TEST_PREFIX}`); } catch { /* ignora */ }
  try { await admin.from('sports').delete().eq('name', `Esporte Teste ${TEST_PREFIX}`); } catch { /* ignora */ }
}

// ────────────────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────────────────

Deno.test('fixtures: limpa e cria esporte, game type, grupo e usuários', async () => {
  await cleanup();

  const { data: sport } = await admin
    .from('sports').insert({ name: `Esporte Teste ${TEST_PREFIX}` }).select('id').single();
  assert(sport, 'criar esporte: sem retorno');
  sportId = sport.id as number;

  const { data: gt } = await admin
    .from('game_types').insert({
      sport_id: sportId,
      name: 'Fut Teste',
      default_max_players: 14,
      default_max_waitlist: 0,
    }).select('id').single();
  assert(gt, 'criar game type: sem retorno');
  gameTypeId = gt.id as number;

  const { error: groupError } = await admin.from('groups').insert({
    id: GROUP_ID,
    name: 'Grupo Teste Inimigos',
    code: GROUP_CODE,
  });
  assert(!groupError, `criar grupo: ${groupError?.message}`);

  organizer = await createUser('Organizador Teste', 'organizer');
  member1 = await createUser('Membro Um', 'member1');
  member2 = await createUser('Membro Dois', 'member2');
  member3 = await createUser('Membro Tres', 'member3');

  const { error: membersError } = await admin.from('group_members').insert([
    { group_id: GROUP_ID, user_id: organizer.id, role: 'admin', status: 'approved' },
    { group_id: GROUP_ID, user_id: member1.id, role: 'member', status: 'approved' },
    { group_id: GROUP_ID, user_id: member2.id, role: 'member', status: 'approved' },
    { group_id: GROUP_ID, user_id: member3.id, role: 'member', status: 'approved' },
  ]);
  assert(!membersError, `criar membros: ${membersError?.message}`);
});

// ────────────────────────────────────────────────────────────────────────────
// Entrada em 'open'
// ────────────────────────────────────────────────────────────────────────────

Deno.test('open + vaga: usuário entra como confirmed', async () => {
  const matchId = await createMatch({ status: 'open', maxPlayers: 12, countA: 5, countB: 5 });

  const error = await joinMatch(member1, matchId, 'confirmed');
  assertEquals(error, null);

  const row = await playerRow(member1, matchId);
  assertEquals(row.status, 'confirmed');
});

Deno.test('open + cheia: usuário cai na waitlist (sem limite)', async () => {
  const matchId = await createMatch({ status: 'open', maxPlayers: 12, countA: 6, countB: 6 });

  const error = await joinMatch(member1, matchId, 'confirmed');
  assertEquals(error, null);

  const row = await playerRow(member1, matchId);
  assertEquals(row.status, 'waitlist');
});

// ────────────────────────────────────────────────────────────────────────────
// Entrada em 'preparing' (o bug reportado)
// ────────────────────────────────────────────────────────────────────────────

Deno.test('preparing + vaga: usuário entra como confirmed no time com menos jogadores', async () => {
  const matchId = await createMatch({ status: 'preparing', maxPlayers: 12, countA: 6, countB: 5 });

  const error = await joinMatch(member1, matchId, 'confirmed');
  assertEquals(error, null);

  const row = await playerRow(member1, matchId);
  assertEquals(row.status, 'confirmed');
  assertEquals(row.team, 'B');
});

Deno.test('preparing + cheia: usuário cai na waitlist', async () => {
  const matchId = await createMatch({ status: 'preparing', maxPlayers: 12, countA: 6, countB: 6 });

  const error = await joinMatch(member1, matchId, 'confirmed');
  assertEquals(error, null);

  const row = await playerRow(member1, matchId);
  assertEquals(row.status, 'waitlist');
});

Deno.test('membro comum não consegue inscrever outro usuário (trigger força auth.uid())', async () => {
  const matchId = await createMatch({ status: 'open', maxPlayers: 12, countA: 5, countB: 5 });

  const client = await asUser(member1);
  const { error } = await client.from('match_players').insert({
    match_id: matchId,
    user_id: member2.id, // tenta inscrever OUTRO usuário
    status: 'confirmed',
    team: 'A',
  });
  assertEquals(error, null);

  // O sanitize_match_player_insert (ramo de jogador comum) força
  // user_id := auth.uid(): a linha criada é do member1, não do member2.
  const { data: m2rows } = await admin.from('match_players')
    .select('id').eq('match_id', matchId).eq('user_id', member2.id);
  assertEquals(m2rows?.length ?? 0, 0, 'member2 não deve ganhar linha de inscrição');

  const row = await playerRow(member1, matchId);
  assertEquals(row.status, 'confirmed');
});

// ────────────────────────────────────────────────────────────────────────────
// Criador adiciona membro / convidado em 'preparing'
// ────────────────────────────────────────────────────────────────────────────

Deno.test('preparing: criador adiciona membro com vaga → confirmed no time menor', async () => {
  const matchId = await createMatch({ status: 'preparing', maxPlayers: 12, countA: 6, countB: 5 });

  const org = await asUser(organizer);
  const { error } = await org.from('match_players').insert({
    match_id: matchId,
    user_id: member1.id,
    status: 'confirmed',
    team: 'A',
  });
  assertEquals(error, null);

  const row = await playerRow(member1, matchId);
  assertEquals(row.status, 'confirmed');
  assertEquals(row.team, 'B');
});

Deno.test('preparing: criador adiciona membro cheio → waitlist explícita', async () => {
  const matchId = await createMatch({ status: 'preparing', maxPlayers: 12, countA: 6, countB: 6 });

  const org = await asUser(organizer);
  const { error } = await org.from('match_players').insert({
    match_id: matchId,
    user_id: member1.id,
    status: 'waitlist',
    team: 'A',
  });
  assertEquals(error, null);

  const row = await playerRow(member1, matchId);
  assertEquals(row.status, 'waitlist');
});

Deno.test('preparing: convidado mantém o time escolhido pelo criador', async () => {
  const matchId = await createMatch({ status: 'preparing', maxPlayers: 12, countA: 6, countB: 5 });

  const org = await asUser(organizer);
  const { error } = await org.from('match_players').insert({
    match_id: matchId,
    guest_name: 'Convidado X',
    status: 'confirmed',
    team: 'B',
    is_sub: false,
  });
  assertEquals(error, null);

  const { data: guest } = await admin
    .from('match_players').select('team, status, guest_name')
    .eq('match_id', matchId).eq('guest_name', 'Convidado X').single();
  assertEquals(guest?.team, 'B');
  assertEquals(guest?.status, 'confirmed');
});

// ────────────────────────────────────────────────────────────────────────────
// Desistência + promoção da fila em 'preparing'
// ────────────────────────────────────────────────────────────────────────────

Deno.test('preparing: desistir promove o 1º da fila para o time menor', async () => {
  const matchId = await createMatch({ status: 'preparing', maxPlayers: 12, countA: 6, countB: 5 });
  await joinMatch(member1, matchId, 'confirmed');
  await joinMatch(member2, matchId, 'waitlist');

  // member1 (time B) desiste sozinho
  const c1 = await asUser(member1);
  const { error: desistError } = await c1
    .from('match_players').update({ status: 'cancelled' })
    .eq('match_id', matchId).eq('user_id', member1.id);
  assertEquals(desistError, null);

  // promoção manual (mesmo caminho do app após desistência)
  const c2 = await asUser(member2);
  const { data: promo, error: promoError } = await c2.rpc('promote_waitlist_player', {
    p_match_id: matchId,
  });
  assertEquals(promoError, null);
  assertEquals(promo.promoted, true);

  const row = await playerRow(member2, matchId);
  assertEquals(row.status, 'confirmed');
  assertEquals(row.team, 'B');

  const row1 = await playerRow(member1, matchId);
  assertEquals(row1.status, 'cancelled');
});

Deno.test('promote recusa partida fora de open/preparing', async () => {
  const matchId = await createMatch({ status: 'preparing', maxPlayers: 12, countA: 6, countB: 5 });
  await admin.from('matches').update({ status: 'in_progress' }).eq('id', matchId);

  const client = await asUser(member1);
  const { data } = await client.rpc('promote_waitlist_player', { p_match_id: matchId });
  assertEquals(data.promoted, false);
  assertEquals(data.reason, 'partida nao aceita alteracoes');
});

// ────────────────────────────────────────────────────────────────────────────
// update_match_capacity
// ────────────────────────────────────────────────────────────────────────────

Deno.test('update_match_capacity: 11 confirmados + 3 na espera → 14, promove 3, times 7v7', async () => {
  const matchId = await createMatch({ status: 'preparing', maxPlayers: 12, countA: 6, countB: 5 });
  await joinMatch(member1, matchId, 'waitlist');
  await joinMatch(member2, matchId, 'waitlist');
  await joinMatch(member3, matchId, 'waitlist');

  const org = await asUser(organizer);
  const { data: res, error } = await org.rpc('update_match_capacity', {
    p_match_id: matchId,
    p_max_players: 14,
  });
  assertEquals(error, null);
  assertEquals(res.ok, true);
  assertEquals(res.maxPlayers, 14);
  assertEquals(res.promotedCount, 3);

  const { data: match } = await admin.from('matches').select('max_players').eq('id', matchId).single();
  assertEquals(match?.max_players, 14);

  const { data: rows } = await admin
    .from('match_players').select('status, team').eq('match_id', matchId);
  const confirmed = (rows ?? []).filter((r) => r.status === 'confirmed');
  assertEquals(confirmed.length, 14);
  assertEquals(confirmed.filter((r) => r.team === 'A').length, 7);
  assertEquals(confirmed.filter((r) => r.team === 'B').length, 7);

  const row1 = await playerRow(member1, matchId);
  assertEquals(row1.status, 'confirmed');
});

Deno.test('update_match_capacity: membro comum não tem permissão', async () => {
  const matchId = await createMatch({ status: 'preparing', maxPlayers: 12, countA: 6, countB: 5 });

  const client = await asUser(member1);
  const { data } = await client.rpc('update_match_capacity', {
    p_match_id: matchId,
    p_max_players: 14,
  });
  assertEquals(data.ok, false);
  assertEquals(data.reason, 'sem permissao');
});

Deno.test('update_match_capacity: recusa reduzir abaixo dos confirmados', async () => {
  const matchId = await createMatch({ status: 'preparing', maxPlayers: 12, countA: 6, countB: 5 });
  await joinMatch(member1, matchId, 'confirmed');

  const org = await asUser(organizer);
  const { data } = await org.rpc('update_match_capacity', {
    p_match_id: matchId,
    p_max_players: 10,
  });
  assertEquals(data.ok, false);
  assertEquals(data.reason, 'capacidade menor que confirmados');
});

Deno.test('update_match_capacity: recusa partida fora de open/preparing', async () => {
  const matchId = await createMatch({ status: 'preparing', maxPlayers: 12, countA: 6, countB: 5 });
  await admin.from('matches').update({ status: 'in_progress' }).eq('id', matchId);

  const org = await asUser(organizer);
  const { data } = await org.rpc('update_match_capacity', {
    p_match_id: matchId,
    p_max_players: 14,
  });
  assertEquals(data.ok, false);
  assertEquals(data.reason, 'partida nao aceita alteracoes');
});