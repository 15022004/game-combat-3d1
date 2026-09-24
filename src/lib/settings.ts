import { CHARACTERS, getCharacter } from "@/data/characters";
import type { DifficultyId } from "@/lib/engine/difficulty";
import { DIFFICULTIES } from "@/lib/engine/difficulty";

export type GameMode = "versus" | "spectator";

/** Choix du joueur, mémorisés dans le navigateur (localStorage) */
export interface GameSettings {
  playerId: string;
  /** "random" = un adversaire différent tiré au hasard à chaque combat */
  opponentId: string | "random";
  difficulty: DifficultyId;
  mode: GameMode;
}

const KEY = "battle-arena:settings";

export function loadSettings(): GameSettings | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<GameSettings>;
    if (!getCharacter(s.playerId)) return null;
    return {
      playerId: s.playerId!,
      opponentId: s.opponentId && (s.opponentId === "random" || getCharacter(s.opponentId)) ? s.opponentId : "random",
      difficulty: DIFFICULTIES.some((d) => d.id === s.difficulty) ? s.difficulty! : "normal",
      mode: s.mode === "spectator" ? "spectator" : "versus",
    };
  } catch {
    return null; // navigation privée, données corrompues...
  }
}

export function saveSettings(s: GameSettings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* stockage indisponible : les choix ne seront simplement pas retenus */
  }
}

/** Choisit l'adversaire : celui demandé, ou un autre personnage au hasard */
export function pickOpponent(s: GameSettings, previousId?: string) {
  const fixed = s.opponentId !== "random" ? getCharacter(s.opponentId) : undefined;
  if (fixed && fixed.id !== s.playerId) return fixed;
  const pool = CHARACTERS.filter((c) => c.id !== s.playerId);
  const fresh = pool.filter((c) => c.id !== previousId);
  const list = fresh.length > 0 ? fresh : pool;
  return list[Math.floor(Math.random() * list.length)];
}
