// Decisões de presença compartilhadas pelas páginas de partidas.
//
// Fonte única para:
//   - em quais status dá para entrar (guardas de "playable");
//   - para qual status o clique em confirmar leva (confirmed x waitlist);
//   - estado do botão de confirmação (rótulo, ícone, disabled).
//
// Regras de produto:
//   - Partidas 'open' e 'preparing' aceitam confirmação; 'preparing' também
//     aceita quem ainda não estava (time é balanceado pelo servidor).
//   - Partida cheia => quem confirma entra na lista de espera (SEM limite;
//     antigo max_waitlist foi removido da UI e do banco como enforce).
//   - Partida 'in_progress' => entrar só como waitlist.
//   - O servidor (trigger sanitize_match_player_insert) decide o time em
//     'preparing': membro confirmado vai para o time com menos jogadores.

export type MatchStatus =
  | "open"
  | "preparing"
  | "in_progress"
  | "finished"
  | "voting"
  | "cancelled";

export type PlayerStatus = "confirmed" | "waitlist" | "cancelled";

export interface MatchAttendanceInfo {
  status: MatchStatus;
  confirmedCount: number;
  maxPlayers: number;
}

export function isFull(match: MatchAttendanceInfo): boolean {
  return match.confirmedCount >= match.maxPlayers;
}

/** Status em que o jogador ainda pode confirmar presença ou entrar na espera. */
export function isPlayableStatus(status: MatchStatus): boolean {
  return status === "open" || status === "preparing" || status === "in_progress";
}

/**
 * Status que o usuário recebe ao clicar em confirmar:
 * - 'in_progress': sempre waitlist (a partida já começou);
 * - cheia (open/preparing): waitlist, sem limite;
 * - com vaga: confirmed (em 'preparing' o servidor balanceia o time).
 */
export function confirmTargetStatus(match: MatchAttendanceInfo): PlayerStatus {
  if (match.status === "in_progress") return "waitlist";
  return isFull(match) ? "waitlist" : "confirmed";
}

export interface ConfirmButtonState {
  icon: string;
  label: string;
  waiting: boolean;
  disabled: boolean;
}

/** Estado do botão principal de presença (o botão nunca é bloqueado por
 *  "fila cheia" — a espera é ilimitada; só o envio em andamento desabilita). */
export function confirmButtonState(
  match: MatchAttendanceInfo,
  busy: boolean,
): ConfirmButtonState {
  const waiting = isFull(match) || match.status === "in_progress";
  if (busy) {
    return { icon: "pending", label: "ENVIANDO...", waiting, disabled: true };
  }
  if (waiting) {
    return {
      icon: "schedule",
      label: isFull(match) ? "ENTRAR NA ESPERA" : "CONFIRMAR",
      waiting,
      disabled: false,
    };
  }
  return { icon: "check_circle", label: "EU VOU!", waiting, disabled: false };
}