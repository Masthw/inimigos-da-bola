// Testes das decisões de presença — regressão do bug "não consigo entrar em
// partida 'preparing' (nem com vaga, nem na espera)".

import { describe, expect, it } from "vitest";
import {
  confirmButtonState,
  confirmTargetStatus,
  isFull,
  isPlayableStatus,
  type MatchAttendanceInfo,
} from "./matchAttendance";

function match(
  status: MatchAttendanceInfo["status"],
  confirmedCount: number,
  maxPlayers: number,
): MatchAttendanceInfo {
  return { status, confirmedCount, maxPlayers };
}

describe("isPlayableStatus", () => {
  it("aceita open, preparing e in_progress", () => {
    expect(isPlayableStatus("open")).toBe(true);
    expect(isPlayableStatus("preparing")).toBe(true);
    expect(isPlayableStatus("in_progress")).toBe(true);
  });

  it("recusa finished, voting e cancelled", () => {
    expect(isPlayableStatus("finished")).toBe(false);
    expect(isPlayableStatus("voting")).toBe(false);
    expect(isPlayableStatus("cancelled")).toBe(false);
  });
});

describe("confirmTargetStatus", () => {
  it("open com vaga → confirmed", () => {
    expect(confirmTargetStatus(match("open", 10, 12))).toBe("confirmed");
  });

  it("open cheia → waitlist (sem limite de espera)", () => {
    expect(confirmTargetStatus(match("open", 12, 12))).toBe("waitlist");
    // acima da capacidade (estado transitório) também cai na espera
    expect(confirmTargetStatus(match("open", 13, 12))).toBe("waitlist");
  });

  it("preparing com vaga → confirmed (time é balanceado pelo servidor)", () => {
    expect(confirmTargetStatus(match("preparing", 11, 14))).toBe("confirmed");
  });

  it("preparing cheia → waitlist", () => {
    expect(confirmTargetStatus(match("preparing", 14, 14))).toBe("waitlist");
  });

  it("in_progress → waitlist mesmo com vaga", () => {
    expect(confirmTargetStatus(match("in_progress", 9, 12))).toBe("waitlist");
    expect(confirmTargetStatus(match("in_progress", 12, 12))).toBe("waitlist");
  });
});

describe("isFull", () => {
  it("considera cheia quando confirmados >= capacidade", () => {
    expect(isFull(match("open", 12, 12))).toBe(true);
    expect(isFull(match("preparing", 13, 12))).toBe(true);
    expect(isFull(match("open", 11, 12))).toBe(false);
  });
});

describe("confirmButtonState", () => {
  it("com vaga mostra EU VOU! habilitado", () => {
    const state = confirmButtonState(match("open", 5, 12), false);
    expect(state.label).toBe("EU VOU!");
    expect(state.icon).toBe("check_circle");
    expect(state.disabled).toBe(false);
    expect(state.waiting).toBe(false);
  });

  it("cheia mostra ENTRAR NA ESPERA habilitado (espera ilimitada)", () => {
    const state = confirmButtonState(match("preparing", 12, 12), false);
    expect(state.label).toBe("ENTRAR NA ESPERA");
    expect(state.icon).toBe("schedule");
    expect(state.disabled).toBe(false);
    expect(state.waiting).toBe(true);
  });

  it("em preparing ainda entra na espera quando cheia (bug antigo)", () => {
    expect(confirmButtonState(match("preparing", 11, 12), false).disabled).toBe(false);
    expect(confirmButtonState(match("preparing", 12, 12), false).disabled).toBe(false);
  });

  it("só fica desabilitado enquanto envia", () => {
    const busy = confirmButtonState(match("open", 12, 12), true);
    expect(busy.disabled).toBe(true);
    expect(busy.label).toBe("ENVIANDO...");
  });
});