/**
 * Catalogue des mouvements. Les temps (strikes, rush...) sont en secondes de jeu, depuis le
 * début de l'action. Ils ont été calés sur les clips de public/models/anims.glb :
 * temps_jeu = (temps_dans_le_clip - start) / speed
 * (ex : Cross Punch, poing en extension à 1.17 s dans le clip -> (1.17 - 0.6) / 1.3 = 0.44 s)
 */
export type MoveKind = "punch" | "kick" | "special";

export interface MoveDef {
  id: string;
  name: string; // Nom affiché à l'écran
  kind: MoveKind;
  clip: string; // Nom du clip dans anims.glb
  speed: number; // Vitesse de lecture du clip
  start: number; // Début de lecture dans le clip (on saute la préparation)
  duration: number; // Durée totale de l'action
  strikes: number[]; // Moments des impacts
  multipliers: number[]; // Multiplicateur de dégâts de chaque impact
  knockback: number[]; // Recul infligé par chaque impact
  reach: number; // Portée maximale d'un impact (centre à centre)
  cooldown: number;
  /** Ruée vers l'adversaire (début, fin) : le personnage se colle à sa cible */
  rush?: [number, number];
  rushSpeed?: number;
  /** Specials : durée de la charge (aura + gros plan caméra) */
  charge?: number;
  /** L'impact lance une boule d'énergie au lieu de frapper au corps à corps */
  projectile?: boolean;
}

export const SPECIAL_COST = 50;
export const SPECIAL_COOLDOWN = 6;

export const MOVES: Record<string, MoveDef> = {
  // --- Poings -------------------------------------------------------------
  jab: {
    id: "jab", name: "Direct", kind: "punch", clip: "Cross Punch", speed: 1.3, start: 0.6,
    duration: 0.8, strikes: [0.44], multipliers: [1], knockback: [4], reach: 1.6, cooldown: 0.9,
  },
  rafale: {
    id: "rafale", name: "Rafale", kind: "punch", clip: "Fist Fight A", speed: 1.6, start: 1,
    duration: 2, strikes: [0.375, 1.1, 1.7], multipliers: [0.45, 0.45, 0.75], knockback: [1.5, 1.5, 9],
    reach: 1.7, cooldown: 1.6,
  },
  genou: {
    id: "genou", name: "Genou volant", kind: "punch", clip: "Flying Knee Punch Combo", speed: 1.4, start: 0.3,
    duration: 1.55, strikes: [0.76, 0.95], multipliers: [0.55, 0.8], knockback: [2, 9], reach: 1.7,
    cooldown: 1.6, rush: [0.25, 0.7], rushSpeed: 12,
  },
  // --- Pieds --------------------------------------------------------------
  flipKick: {
    id: "flipKick", name: "Salto frappé", kind: "kick", clip: "Flip Kick", speed: 1.4, start: 0.4,
    duration: 1.45, strikes: [0.69], multipliers: [1.4], knockback: [10], reach: 1.9, cooldown: 1.5,
    rush: [0.2, 0.6], rushSpeed: 12,
  },
  spinKick: {
    id: "spinKick", name: "Vrille", kind: "kick", clip: "Spin Flip Kick", speed: 1.5, start: 0.6,
    duration: 1.6, strikes: [0.49, 0.91], multipliers: [0.6, 0.9], knockback: [2, 9], reach: 1.9,
    cooldown: 1.5, rush: [0.1, 0.45], rushSpeed: 10,
  },
  dropKick: {
    id: "dropKick", name: "Coup de pied sauté", kind: "kick", clip: "Drop Kick", speed: 1.4, start: 0.5,
    duration: 1.7, strikes: [0.66], multipliers: [1.5], knockback: [12], reach: 1.9, cooldown: 1.8,
    rush: [0.3, 0.6], rushSpeed: 10,
  },
  // --- Attaques spéciales (coûtent 50 d'énergie) ----------------------------
  capoeira: {
    id: "capoeira", name: "Danse du cyclone", kind: "special", clip: "Capoeira", speed: 2, start: 0,
    duration: 2.5, strikes: [1.08, 1.65, 1.93], multipliers: [0.3, 0.3, 0.6], knockback: [1.5, 1.5, 16],
    reach: 1.8, cooldown: SPECIAL_COOLDOWN, rush: [0.45, 0.75], rushSpeed: 20, charge: 0.45,
  },
  tornade: {
    id: "tornade", name: "Tornade inversée", kind: "special", clip: "Inverted Double Kick To Kip Up",
    speed: 1.4, start: 0, duration: 2.3, strikes: [0.76, 1.57], multipliers: [0.5, 0.75],
    knockback: [3, 15], reach: 1.9, cooldown: SPECIAL_COOLDOWN, rush: [0.35, 0.65], rushSpeed: 18, charge: 0.35,
  },
  fireball: {
    id: "fireball", name: "Boule de feu", kind: "special", clip: "Fireball", speed: 1.4, start: 0.6,
    duration: 1.8, strikes: [1.24], multipliers: [0.9], knockback: [12], reach: 99,
    cooldown: SPECIAL_COOLDOWN, charge: 1.24, projectile: true,
  },
};

export const MOVES_BY_KIND: Record<MoveKind, MoveDef[]> = {
  punch: Object.values(MOVES).filter((m) => m.kind === "punch"),
  kick: Object.values(MOVES).filter((m) => m.kind === "kick"),
  special: Object.values(MOVES).filter((m) => m.kind === "special"),
};

/** Tire un mouvement au hasard dans une catégorie, en évitant de répéter le précédent */
export function pickMove(
  kind: MoveKind,
  lastId: string | null,
  rng: () => number = Math.random,
  filter?: (m: MoveDef) => boolean
): MoveDef {
  let pool = MOVES_BY_KIND[kind].filter((m) => !filter || filter(m));
  if (pool.length === 0) pool = MOVES_BY_KIND[kind];
  const fresh = pool.filter((m) => m.id !== lastId);
  const list = fresh.length > 0 ? fresh : pool;
  return list[Math.floor(rng() * list.length)];
}

export const getMove = (id: string | null | undefined) => (id ? MOVES[id] : undefined);
