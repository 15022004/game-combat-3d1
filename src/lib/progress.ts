import type { CharacterDef, CharacterStats } from "@/data/characters";
import { MAX_LEVEL } from "@/data/battlefields";

/** Progression du mode Aventure (sauvegardée dans le navigateur) */
export type StatKey = keyof CharacterStats;

export interface Progress {
  money: number;
  unlocked: number; // plus haut niveau accessible (0 à 50)
  cleared: number[]; // niveaux déjà gagnés
  upgrades: Record<StatKey, number>; // niveau d'amélioration de chaque stat
}

const KEY = "battle-arena:progress";
export const MAX_UPGRADE = 20;
/** Chaque amélioration ajoute 10% à la stat de base */
export const UPGRADE_STEP = 0.1;

export const STAT_NAMES: Record<StatKey, string> = {
  hp: "Vie",
  attack: "Attaque",
  defense: "Défense",
  special: "Spécial",
  speed: "Vitesse",
};

export const emptyProgress = (): Progress => ({
  money: 0,
  unlocked: 0,
  cleared: [],
  upgrades: { hp: 0, attack: 0, defense: 0, special: 0, speed: 0 },
});

export function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const p = JSON.parse(raw) as Partial<Progress>;
    const base = emptyProgress();
    return {
      money: Math.max(0, Number(p.money) || 0),
      unlocked: Math.min(MAX_LEVEL, Math.max(0, Number(p.unlocked) || 0)),
      cleared: Array.isArray(p.cleared) ? p.cleared.filter((n) => Number.isInteger(n)) : [],
      upgrades: { ...base.upgrades, ...(p.upgrades ?? {}) },
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* stockage indisponible */
  }
}

export const upgradeCost = (level: number) => Math.round(100 * Math.pow(1.25, level));

/** Le héros avec ses améliorations achetées */
export function upgradedHero(def: CharacterDef, p: Progress): CharacterDef {
  const up = (k: StatKey) => Math.round(def.stats[k] * (1 + UPGRADE_STEP * p.upgrades[k]));
  return {
    ...def,
    stats: {
      hp: up("hp"),
      attack: up("attack"),
      defense: up("defense"),
      special: up("special"),
      speed: Math.min(120, up("speed")),
    },
  };
}

/** Enregistre une victoire : pièces + niveau suivant débloqué */
export function winLevel(p: Progress, level: number, reward: number): Progress {
  return {
    ...p,
    money: p.money + reward,
    unlocked: Math.min(MAX_LEVEL, Math.max(p.unlocked, level + 1)),
    cleared: p.cleared.includes(level) ? p.cleared : [...p.cleared, level],
  };
}
