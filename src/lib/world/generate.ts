import type { BattlefieldDef } from "@/data/battlefields";

/** Taille du champ de bataille : un carré de WORLD_SIZE x WORLD_SIZE (centré sur 0) */
export const WORLD_SIZE = 260;
export const WORLD_HALF = WORLD_SIZE / 2;

export interface PlacedProp {
  kind: number; // index dans field.props
  x: number;
  z: number;
  scale: number;
  rot: number;
  radius: number; // rayon de collision (déjà multiplié par l'échelle)
}

export interface WorldLayout {
  props: PlacedProp[];
  colliders: PlacedProp[]; // éléments solides uniquement
  playerSpawn: { x: number; z: number };
  monsterSpawn: { x: number; z: number };
}

/** Générateur pseudo-aléatoire reproductible (même graine = même carte) */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/**
 * Le décor dépend du champ de bataille (toujours la même carte pour un champ),
 * la position du joueur et du monstre dépend du niveau.
 */
export function generateWorld(field: BattlefieldDef, level: number): WorldLayout {
  // 1. Départ du joueur et repaire du monstre (loin l'un de l'autre)
  const lr = mulberry32(hash(`${field.id}-${level}`));
  const edge = WORLD_HALF - 20;
  const angle = lr() * Math.PI * 2;
  const playerSpawn = { x: Math.cos(angle) * edge * 0.75, z: Math.sin(angle) * edge * 0.75 };
  const monsterAngle = angle + Math.PI + (lr() - 0.5) * 1.6;
  const monsterDist = edge * (0.35 + lr() * 0.5);
  const monsterSpawn = { x: Math.cos(monsterAngle) * monsterDist, z: Math.sin(monsterAngle) * monsterDist };

  // 2. Décor
  const r = mulberry32(hash(field.id));
  const props: PlacedProp[] = [];
  field.props.forEach((kind, k) => {
    for (let i = 0; i < kind.count; i++) {
      const x = (r() * 2 - 1) * (WORLD_HALF - 4);
      const z = (r() * 2 - 1) * (WORLD_HALF - 4);
      const scale = kind.scale[0] + r() * (kind.scale[1] - kind.scale[0]);
      const rot = r() * Math.PI * 2;
      // Clairières : rien autour du départ et du repaire (place pour le combat)
      const clearP = Math.hypot(x - playerSpawn.x, z - playerSpawn.z) < 8;
      const clearM = Math.hypot(x - monsterSpawn.x, z - monsterSpawn.z) < 16;
      if (clearP || clearM) continue;
      props.push({ kind: k, x, z, scale, rot, radius: kind.radius * scale });
    }
  });
  return { props, colliders: props.filter((p) => p.radius > 0), playerSpawn, monsterSpawn };
}

/** Repousse un point hors des obstacles et des limites de la carte */
export function collide(pos: { x: number; z: number }, colliders: PlacedProp[], bodyRadius = 0.5) {
  for (const c of colliders) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const min = c.radius + bodyRadius;
    if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
    const d = Math.hypot(dx, dz);
    if (d < min && d > 1e-4) {
      pos.x = c.x + (dx / d) * min;
      pos.z = c.z + (dz / d) * min;
    }
  }
  const lim = WORLD_HALF - 2;
  pos.x = Math.max(-lim, Math.min(lim, pos.x));
  pos.z = Math.max(-lim, Math.min(lim, pos.z));
}
