import type { CharacterDef, CharacterStats, FighterStyle } from "./characters";
import { battlefieldForLevel } from "./battlefields";
import type { DifficultyId } from "@/lib/engine/difficulty";

/**
 * Monstres du mode Aventure. Ils réutilisent les modèles 3D existants (Mutant, Maw...)
 * avec une teinte, une taille et des stats propres. Tous les 10 niveaux : un boss.
 */
interface MonsterArchetype {
  name: string;
  model: string;
  tint?: string;
  scale: number;
  style: FighterStyle;
  color: string; // couleur des effets / de la balise sur la carte
  stats: CharacterStats; // stats de base (niveau ~0)
}

const M = "/models/";
const tough: CharacterStats = { hp: 300, attack: 21, defense: 14, special: 30, speed: 60 };
const quick: CharacterStats = { hp: 250, attack: 20, defense: 10, special: 30, speed: 85 };
const brute: CharacterStats = { hp: 360, attack: 25, defense: 18, special: 32, speed: 45 };

const POOLS: Record<string, { monsters: MonsterArchetype[]; boss: MonsterArchetype }> = {
  plaine: {
    monsters: [
      { name: "Mutant des plaines", model: M + "Mutant.glb", scale: 1, style: "aggressive", color: "#8fff5a", stats: tough },
      { name: "Spectre violet", model: M + "Eve.glb", tint: "#5a1aff", scale: 1.05, style: "balanced", color: "#a070ff", stats: quick },
      { name: "Goule toxique", model: M + "Mutant.glb", tint: "#2bff5a", scale: 1.05, style: "aggressive", color: "#2bff5a", stats: tough },
    ],
    boss: { name: "Maw le Dévoreur", model: M + "Maw.glb", scale: 1.25, style: "aggressive", color: "#8aff3c", stats: brute },
  },
  desert: {
    monsters: [
      { name: "Golem de sable", model: M + "Maw.glb", tint: "#d9a441", scale: 1.1, style: "defensive", color: "#ffc766", stats: brute },
      { name: "Ombre des dunes", model: M + "Erika.glb", tint: "#4a2a08", scale: 1, style: "aggressive", color: "#ff9a3c", stats: quick },
      { name: "Momie", model: M + "Media.glb", tint: "#e8d9b0", scale: 10.5 * 1.05, style: "balanced", color: "#f3e6c4", stats: tough },
    ],
    boss: { name: "Roi Golem", model: M + "Maw.glb", tint: "#ffcc33", scale: 1.3, style: "defensive", color: "#ffd23f", stats: brute },
  },
  toundra: {
    monsters: [
      { name: "Yéti", model: M + "Maw.glb", tint: "#d6f2ff", scale: 1.1, style: "aggressive", color: "#d6f2ff", stats: brute },
      { name: "Spectre de glace", model: M + "Eve.glb", tint: "#58c8ff", scale: 1.05, style: "balanced", color: "#58c8ff", stats: quick },
      { name: "Loup gris", model: M + "Mutant.glb", tint: "#9aa7b8", scale: 1.05, style: "aggressive", color: "#c6d2e0", stats: tough },
    ],
    boss: { name: "Yéti Alpha", model: M + "Maw.glb", tint: "#9fe6ff", scale: 1.3, style: "aggressive", color: "#7fd4ff", stats: brute },
  },
  ruines: {
    monsters: [
      { name: "Sentinelle", model: M + "Ely.glb", tint: "#00e5ff", scale: 1.05, style: "defensive", color: "#00e5ff", stats: tough },
      { name: "Ombre fantôme", model: M + "Erika.glb", tint: "#1a1a2e", scale: 1, style: "aggressive", color: "#8a8aff", stats: quick },
      { name: "Mutant radioactif", model: M + "Mutant.glb", tint: "#c6ff00", scale: 1.1, style: "aggressive", color: "#c6ff00", stats: brute },
    ],
    boss: { name: "Colosse d'acier", model: M + "Maw.glb", tint: "#8899aa", scale: 1.3, style: "defensive", color: "#b0c4de", stats: brute },
  },
  volcan: {
    monsters: [
      { name: "Démon de lave", model: M + "Mutant.glb", tint: "#ff3300", scale: 1.1, style: "aggressive", color: "#ff5a1f", stats: brute },
      { name: "Cendreux", model: M + "Maw.glb", tint: "#551a0a", scale: 1.1, style: "defensive", color: "#ff7a3c", stats: brute },
      { name: "Furie ardente", model: M + "Erika.glb", tint: "#ff6a00", scale: 1, style: "aggressive", color: "#ffa033", stats: quick },
    ],
    boss: { name: "Seigneur des Flammes", model: M + "Mutant.glb", tint: "#ff1a00", scale: 1.35, style: "aggressive", color: "#ff2a00", stats: brute },
  },
};

export interface LevelMonster {
  def: CharacterDef;
  level: number;
  isBoss: boolean;
  difficulty: DifficultyId;
  reward: number; // pièces gagnées au premier passage
}

export const isBossLevel = (level: number) => level > 0 && level % 10 === 0;

/** Difficulté de l'IA selon le niveau */
function difficultyFor(level: number): DifficultyId {
  if (level <= 9) return "tres-facile";
  if (level <= 22) return "facile";
  if (level <= 37) return "normal";
  if (level <= 49) return "difficile";
  return "legende"; // le boss final
}

/** Récompense (pièces) pour un niveau ; rejouer un niveau déjà gagné rapporte 40% */
export function rewardFor(level: number, alreadyCleared: boolean) {
  const base = (60 + level * 22) * (isBossLevel(level) ? 2.5 : 1);
  return Math.round(alreadyCleared ? base * 0.4 : base);
}

export function monsterForLevel(level: number, alreadyCleared = false): LevelMonster {
  const field = battlefieldForLevel(level);
  const pool = POOLS[field.id];
  const boss = isBossLevel(level);
  const arch = boss ? pool.boss : pool.monsters[level % pool.monsters.length];
  // Les stats grandissent avec le niveau (x0.7 au niveau 0, x1.9 au niveau 50)
  const k = 0.7 + level * 0.024;
  const hpBonus = boss ? 1.3 : 1;
  const s = arch.stats;
  return {
    level,
    isBoss: boss,
    difficulty: level === 0 ? "tres-facile" : difficultyFor(level),
    reward: rewardFor(level, alreadyCleared),
    def: {
      id: `monster-${level}`,
      name: arch.name,
      model: arch.model,
      style: arch.style,
      color: arch.color,
      tint: arch.tint,
      scale: arch.scale,
      tagline: "",
      stats: {
        hp: Math.round(s.hp * k * hpBonus),
        attack: Math.round(s.attack * k),
        defense: Math.round(s.defense * k),
        special: Math.round(s.special * k),
        speed: Math.min(95, Math.round(s.speed * (0.9 + level * 0.004))),
      },
    },
  };
}
