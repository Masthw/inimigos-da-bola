# Testes de banco (Deno + Supabase local)

Testes de integração que exercitam RLS, triggers e RPCs de verdade contra o
Supabase local. Os testes criam as próprias fixtures (usuários, grupo, partidas)
pelas APIs reais, então qualquer falha de policy/trigger aparece aqui.

## Como rodar

```bash
# 1. Stack local com as migrations aplicadas
supabase start

# 2. Pegar as chaves do ambiente
#    (anote SERVICE_ROLE_KEY e ANON_KEY do output de `supabase status -o env`)

# 3. Rodar a suíte
SUPABASE_URL=http://localhost:54321 \
SUPABASE_SERVICE_KEY=<service_role_key> \
SUPABASE_ANON_KEY=<anon_key> \
corepack pnpm test:db
```

O script `test:db` do `package.json` já passa `--config supabase/tests/deno.json`
(lockfile desligado; import do supabase-js via esm.sh).

Variáveis de ambiente: `SUPABASE_URL` (default `http://localhost:54321`),
`SUPABASE_SERVICE_KEY` (obrigatória) e `SUPABASE_ANON_KEY` (opcional; usa a
service key como fallback).

## Limitação conhecida: banco local iniciado do zero

As migrations `20260824143246_fase1_fluxo_de_votacao.sql` e
`20260824145505_awards_game_types_junction.sql` têm timestamp ANTERIOR ao da
`20260824172525_remote_schema.sql`, mas dependem de tabelas (`match_votes`,
`awards`, `game_types`) que a `remote_schema` cria. Em produção elas foram
aplicadas em ordem histórica sobre um banco já existente, então nunca quebraram.

Consequência: um `supabase start` em **ambiente totalmente limpo** (sem o volume
do banco) falha nessas duas migrations — ex.:

```
ERROR: relation "public.match_votes" does not exist (SQLSTATE 42P01)
```

Isso é **pré-existente** e independente das migrations novas deste repo. Quem
trabalha com um stack local já inicializado (ou `supabase db pull` do remoto +
`supabase db push` só das migrations novas) não é afetado.

Caso precise recriar o banco local do zero, bootstrap alternativo **sem alterar
as migrations antigas** (ordem histórica real):

```bash
cd supabase/migrations
mv 20260824143246_fase1_fluxo_de_votacao.sql /tmp/
mv 20260824145505_awards_game_types_junction.sql /tmp/
cp /tmp/20260824143246_fase1_fluxo_de_votacao.sql 20260824172600_tmp_fase1_bootstrap.sql
cp /tmp/20260824145505_awards_game_types_junction.sql 20260824173000_tmp_junction_bootstrap.sql
supabase start
# remove as cópias temporárias e devolve as originais:
rm 20260824172600_tmp_fase1_bootstrap.sql 20260824173000_tmp_junction_bootstrap.sql
mv /tmp/20260824143246_fase1_fluxo_de_votacao.sql .
mv /tmp/20260824145505_awards_game_types_junction.sql .
```

Isso aplica as duas migrations com o conteúdo original logo após a
`remote_schema`, reproduzindo a ordem em que foram aplicadas em produção.