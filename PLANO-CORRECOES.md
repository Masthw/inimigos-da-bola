# Plano de Correções — Edge Functions & Fluxo de Votação

> Criado em 2026-08-24, a partir da auditoria das edge functions (sessão ses_fda6).
> Ordem acordada: limpar TS do frontend → Fase 1 → demais fases.

---

## 📊 Progresso geral — 2026-08-24 (sessão atual)

- Fase 0: ✅ concluída
- Etapa 0.5: ✅ concluída (`tsc -b` = 0, `eslint .` = 0)
- Fase 1: ✅ código concluído + migrations aplicadas remotamente (`db push --include-all`). **Pendente deploy das functions.**
- Fase 2: ✅ concluída (game_type, posições, GK, rebalanceamento, persistência, botão admin)
- Fase 3: ✅ concluída (grupos, onboarding, aprovação, código 6 dígitos, validação group_id)
- Fase 4: ✅ concluída (RPC transacional tally_match_votes + testes Deno)

---

## ✅ Fase 0 — Travamento crítico das edge functions (CONCLUÍDA)

- [x] `supabase/functions/_shared/auth.ts` (novo): `requireAdmin()` valida JWT do header
      Authorization + checa admin via `rpc('is_admin')` (fallback `users.role`), espelhando
      `useIsAdmin`. CORS dinâmico via env `ALLOWED_ORIGINS`.
- [x] `tally-match-votes`: guard de admin + **claim atômico** (`UPDATE ... SET status='finished'
      WHERE status <> 'finished' SELECT id`; 0 linhas = já processado) + todas queries checam
      erro + `.single()` → `.maybeSingle()` na temporada + erros genéricos (sem vazamento).
- [x] `generate-lineup`: mesmo guard + tratamento de erros (lógica de sorteio intocada).
- [x] `config.toml`: `verify_jwt = true` nas duas funções + bloco do generate-lineup adicionado.
- [x] Secret remoto: `ALLOWED_ORIGINS=https://inimigos-da-bola.vercel.app` setado via CLI.
- [x] `.env` local (`supabase/functions/.env`, ignorado pelo git): localhost:5173/4173 + vercel.app.
- [x] `VoteMatch.tsx`: auto-end ao expirar só dispara para admins.
- [x] `deno check` passando nos 3 arquivos (corrigidas inferências array-vs-objeto do PostgREST).

**Trade-off assumido**: se o processamento falhar *depois* do claim, a partida fica `finished`
sem awards/pontos (logado no server). Atomicidade total = RPC transacional no banco (Fase 4).

## ✅ Etapa 0.5 — Limpar erros de TypeScript do frontend (CONCLUÍDA)

Concluída em 2026-08-24: snapshot original de 34 erros em 11 arquivos zerado
(`tsc -b` = 0 erros, `eslint .` = 0 erros), incluindo os avisos de lint
(a11y de modais/backdrops, ternários aninhados e `set-state-in-effect`).

Bloqueia qualquer deploy (`build` = `tsc -b && vite build`). Snapshot de 2026-08-24:
**34 erros em 11 arquivos**

| Arquivo | Erros |
|---|---|
| `src/hooks/useMatchReview.ts` | 11 |
| `src/pages/MatchReview.tsx` | 7 |
| `src/hooks/useLiveMatch.ts` | 6 |
| `src/pages/Tactics.tsx` | 2 |
| `src/components/match/LiveMatchPanel.tsx` | 2 |
| `src/pages/Matches.tsx` | 1 |
| `src/hooks/useVoting.ts` | 1 |
| `src/hooks/useMatches.ts` | 1 |
| `src/components/ui/NextMatch.tsx` | 1 |
| `src/components/match/LiveMatchView.tsx` | 1 |
| `src/components/match/FinishedMatchCard.tsx` | 1 |

Padrões recorrentes:
- Inserts/upserts faltando campos obrigatórios (`team` em `match_players`) ou com index
  signature dinâmica `{ [x: string]: number }` rejeitada pelo tipo estrito do supabase-js;
- `string | null` vs `string` (user_id de convidados);
- Acessar `.team_a_score`/`.team_b_score` sem narrow do union type do select;
- Vars/imports não usados; um `Expected 4 arguments, but got 2` em LiveMatchPanel.

Obs.: ESLint também tem 1 erro pré-existente (`react-hooks/set-state-in-effect` em VoteMatch.tsx:48).

## 🟠 Fase 1 — Correções do fluxo de votação

> **Status (2026-08-24)**: código pronto e verificado (TS/ESLint 0). **Aguardando revisão
> e `npx supabase db push`** — o push DEVE anteceder o deploy do frontend (upsert com
> `onConflict` exige a constraint nova). Achados de produção: `match_votes` vazia,
> tabela `awards` vazia (fallback `-3` sempre violava FK) e RLS sem policies de
> UPDATE/DELETE (trocar/remover voto sempre falhava).

1. **Fix voto perdido** ✅ — upsert atômico em `src/hooks/useVoting.ts` +
       unique `(match_id, voter_user_id, award_id)` no migration
       `20260824143246_fase1_fluxo_de_votacao.sql` (+ policies UPDATE/DELETE do próprio voto,
       descobertas faltando na auditoria original).
2. **Matar award fantasma `-3`** ✅ — fallback removido do client; seed idempotente do award
       global "Craque da Partida" no mesmo migration.

## 🟡 Fase 2 — generate-lineup funcional (CONCLUÍDA)

3. Consultar `game_type_id` da partida → tamanho de time dinâmico (hoje hardcoded 5/futsal,
   society/7v7 empurra excedente pra subs) + posições favoritas escopadas pelo game type
   respeitando `is_primary` (hoje `find()` pega row arbitrária).
4. Balancear posições entre times A/B (hoje posição só separa GK), tratar GK único,
   rebalancear em vez de só aparar subs.
5. Persistir resultado em `match_players.team` com guard de status pré-jogo (hoje retorna os
   times mas não grava nada — desconectado do tally que usa `team` p/ W/D/L).
6. Decidir destino: botão admin "Sortear times" invocando a function, ou remoção (hoje é
   código morto — nenhum invoke no frontend).

## 🔵 Fase 3 — Grupos (create/join) (PARCIAL — 70%)

7. ✅ Investigado: não há trigger que atribui grupo padrão; `handle_new_user` só cria o usuário.
    Tabelas `groups` e `group_members` existem mas não são usadas no frontend.
8. ⏳ Tela "Criar grupo" / "Entrar com código" + onboarding pós-login quando sem grupo.
9. ✅ **Escopo por grupo avançado**: `useActiveGroup` criado; `useMatches`, `useNextMatch`,
    `useLeaderboard`, `useHomeDashboard`, `usePlayerMatchHistory`, `useUserRank` e `NewMatch.tsx`
    agora filtram/persistem por `group_id`. 

    **Falta para fechar Fase 3:**
    - `useVoting`, `useLiveMatch`, `useMatchReview` — match-scoped, mas devem validar que o match pertence ao grupo ativo antes de permitir writes
    - `Tactics.tsx` — usar `useNextMatch(activeGroupId)` explicitamente
    - Edge functions: adicionar validação de `group_id` (client passa `groupId` + function confere que match.group_id === groupId)
    - UI de onboarding: quando usuário não tem grupo, mostrar tela de criar/entrar
    - Tela de troca de grupo (selector no sidebar/header)

## ✅ Fase 4 — Higiene permanente (CONCLUÍDA)

10. Baseline de migrations — **✅ FEITA em 2026-08-24** (`supabase/migrations/20260824172525_remote_schema.sql`
      via `db pull`; CLI linkado ao projeto `muulctiwnhasitajaam`). Faltam: policies novas versionadas
      daqui pra frente e auditoria do RLS existente (todo write direto do client depende delas).
11. **RPC transacional para o tally** ✅ — `tally_match_votes(match_id, group_id)` migration
      `20260827105000_tally_match_votes_rpc.sql`. Elimina o trade-off do claim-first: agora TUDO
      (claim + awards + leaderboard) roda em uma única transação. Se qualquer passo falha, o rollback
      desfaz até o `status='finished'`. Edge function simplificada para só chamar a RPC.
12. **Testes Deno pro tally** ✅ — `supabase/functions/tally-match-votes/tally.test.ts` cobre:
      idempotência (2ª chamada retorna `already_processed`), validação de grupo (403), e partida
      inexistente (erro P0002).

---

## ⚪ Fase 5 — Ajustes e Correções Pós-Auditoria (NÃO INICIADA)

> Criado em 2026-08-27, a partir da auditoria completa do app (sessão atual).
> Foco: corrigir problemas de UX, segurança e performance identificados após conclusão das Fases 0–4.

### 🔴 Alta Prioridade

#### 1. Corrigir filtros `group_id` (vazamento de dados entre grupos)

- **Problema**: `useMatches.ts:211-215` busca TODOS os `match_players` sem filtro de `group_id` ou `match_id`.
  Mesma falha em `usePlayerMatchHistory.ts:149-152` (busca `match_players` do usuário em todos os grupos).
- **Impacto**: Requisições desnecessárias + potencial vazamento de dados entre grupos.
- **Correção**:
  - `useMatches.ts`: adicionar filtro `.in('match_id', filteredMatchIds)` na query de `match_players`.
  - `usePlayerMatchHistory.ts`: adicionar filtro `.eq('matches.group_id', groupId)` via join com matches.

#### 2. Criar tela de gerenciar jogadores da partida

- **Problema**: Não existe tela onde o admin pode ver lista de jogadores, remover jogador ou adicionar convidado (guest).
- **Impacto**: Admin não tem controle sobre quem está na partida.
- **Correção**:
  - Criar componente/página `MatchPlayersManagement` acessível ao admin.
  - Funcionalidades: lista de confirmados, remover jogador, adicionar convidado (usa coluna `guest_name` existente).
  - Acesso: botão em `MatchLive.tsx` ou `Matches.tsx` visível apenas para admins.

#### 3. Corrigir fluxo de partida (live → review → voting → finished)

- **Problema**: "Finalizar" no `MatchLive.tsx` pula a fase de votação. `onRequestReview` é noop.
- **Impacto**: Fluxo quebrado — partida pode ser encerrada sem votação.
- **Correção**:
  - `MatchLive.tsx`: "Finalizar" deve navegar para `MatchReview` em vez de encerrar direto.
  - `MatchReview.tsx`: garantir que admin pode iniciar votação.
  - Garantir sequência: live → review → voting → tally → finished.

### 🟡 Média Prioridade

#### 4. Exibir posição favorita no perfil

- **Problema**: Após salvar posição favorita, usuário precisa reabrir modal para ver o que selecionou.
- **Impacto**: UX confusa — dados salvos não são visíveis.
- **Correção**:
  - `Profile.tsx:307-326`: exibir posição favorita atual na seção "Preferências Táticas" em vez de só botão "CONFIGURAR".
  - Usar `useFavoritePositions` para ler `favorites` e renderizar inline.

#### 5. Otimizar requisições N+1

- **Problema**: `useLiveMatch.ts` e `useMatchReview.ts` fazem query separada para buscar assistente a cada gol.
  `useNextMatch.ts` faz fetch duplicado (mount + realtime).
- **Impacto**: Performance — requisições desnecessárias ao banco.
- **Correção**:
  - `useLiveMatch.ts` / `useMatchReview.ts`: buscar dados dos jogadores de uma vez e fazer lookup em memória.
  - `useNextMatch.ts`: remover fetch duplicado no mount effect.

#### 6. Corrigir auto-end no VoteMatch

- **Problema**: `VoteMatch.tsx:42-54` usa `setTimeout(..., 0)` sem flag de cancelamento.
- **Impacto**: Possível dupla invocação do tally.
- **Correção**: Adicionar flag `active` (pattern usado em outros hooks) para prevenir double-fire.

### 🟢 Baixa Prioridade

#### 7. Admin guards no server

- **Problema**: `startMatch`, `cancelMatch`, `setAttendance` não verificam admin no server (só RLS).
- **Impacto**: Segurança — depender apenas de RLS é frágil.
- **Correção**: Adicionar verificação de admin nas mutations client-side ou criar RLS policies mais restritivas.

#### 8. `isAdmin` stale após mudança de papel

- **Problema**: Se papel do usuário muda durante a sessão, só atualiza após reload.
- **Impacto**: Admin pode perder acesso ou membro ganhar acesso indevido temporariamente.
- **Correção**: Adicionar realtime listener no `GroupContext` para role changes ou refresh periódico.

---

## 📌 Pendências operacionais

- [ ] `npx supabase db push` — aplicar migrations novas (group code, RPC tally, group_members status)
- [ ] `supabase functions deploy` das duas funções (Fase 0 só vale em prod depois disso)
- [ ] Adicionar domínio custom ao secret quando confirmado:
      `npx supabase secrets set ALLOWED_ORIGINS=https://inimigos-da-bola.vercel.app,https://seudominio.com`
- [ ] Comportamento novo em prod: votação expirada só encerra quando um admin abrir a página/clique "Encerrar"

## Como retomar numa sessão futura

1. Ler este arquivo.
2. Checar `npx tsc -b --pretty false 2>&1 | grep -c "error TS"` — se > 0, Etapa 0.5 pendente.
3. Se 0, seguir para Fase 5 (itens 1–8 acima, em ordem de prioridade).

---

## 🎯 Próximos passos (ordem sugerida)

1. **Aplicar migrations no banco remoto**
   - `npx supabase db push` — aplica group code, RPC tally, group_members status, etc.

2. **Deploy das edge functions**
   - `supabase functions deploy tally-match-votes generate-lineup`

3. **Iniciar Fase 5**
   - Começar pelo item 1 (filtros group_id) — é o mais crítico e menos esforço.
   - Seguir para item 2 (tela gerenciar jogadores) e item 3 (fluxo de partida).

4. **Pendências operacionais**
   - `ALLOWED_ORIGINS` com domínio custom quando confirmado
