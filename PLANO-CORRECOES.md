# Plano de Correções — Edge Functions & Fluxo de Votação

> Criado em 2026-08-24, a partir da auditoria das edge functions (sessão ses_fda6).
> Ordem acordada: limpar TS do frontend → Fase 1 → demais fases.

---

## 📊 Progresso geral — 2026-08-24 (sessão atual)

- Fase 0: ✅ concluída
- Etapa 0.5: ✅ concluída (`tsc -b` = 0, `eslint .` = 0)
- Fase 1: ✅ código concluído + migrations aplicadas remotamente (`db push --include-all`). **Pendente deploy das functions.**
- Fase 2: ✅ concluída (game_type, posições, GK, rebalanceamento, persistência, botão admin)
- Fase 3: 🟡 parcial — escopo por grupo implementado nos hooks principais; UI de grupos pendente
- Fase 4: ⏳ não iniciada

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

## ⚪ Fase 4 — Higiene permanente

10. Baseline de migrations — **✅ FEITA em 2026-08-24** (`supabase/migrations/20260824172525_remote_schema.sql`
    via `db pull`; CLI linkado ao projeto `muulctiwnhasitajaam`). Faltam: policies novas versionadas
    daqui pra frente e auditoria do RLS existente (todo write direto do client depende delas).
11. RPC transacional para o tally (eliminar trade-off do claim-first da Fase 0).
12. Testes Deno pro tally (idempotência, empates, regra dos 50%).

---

## 📌 Pendências operacionais

- [ ] `supabase functions deploy` das duas funções (Fase 0 só vale em prod depois disso)
- [ ] Adicionar domínio custom ao secret quando confirmado:
      `npx supabase secrets set ALLOWED_ORIGINS=https://inimigos-da-bola.vercel.app,https://seudominio.com`
- [ ] Comportamento novo em prod: votação expirada só encerra quando um admin abrir a página/clique "Encerrar"

## Como retomar numa sessão futura

1. Ler este arquivo.
2. Checar `npx tsc -b --pretty false 2>&1 | grep -c "error TS"` — se > 0, Etapa 0.5 pendente.
3. Se 0, seguir para Fase 1 (itens 1–2 acima).

---

## 🎯 Próximos passos (ordem sugerida)

1. **Fechar Fase 3 — Grupos**
   - `useVoting.ts`, `useLiveMatch.ts`, `useMatchReview.ts`: adicionar `groupId` como param opcional; quando fornecido, validar que `match.group_id === groupId` antes de allow writes
   - `Tactics.tsx`: usar `useNextMatch(activeGroupId)` explicitamente (hoje usa sem filtro)
   - Edge functions: receber `groupId` no body + checar `match.group_id === groupId` no início
   - UI: tela de onboarding pós-login (se `group_members` vazio → mostrar criar/entrar)
   - UI: selector de grupo no header/sidebar

2. **Fase 4 — Higiene permanente**
   - RPC transacional para `tally-match-votes` (eliminar trade-off do claim-first)
   - Testes Deno pro tally (idempotência, empates, regra dos 50%)

3. **Pendências operacionais**
   - `supabase functions deploy` das duas funções (Fase 0 só vale em prod depois disso)
   - `ALLOWED_ORIGINS` com domínio custom quando confirmado
