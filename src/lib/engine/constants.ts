/** Réglages du combat : tout se règle ici (distances, durées, dégâts...) */

/** Distance (centre à centre) à laquelle un combattant s'arrête en marchant */
export const MELEE_RANGE = 1.05;
/** Distance à partir de laquelle l'IA considère qu'elle est au corps à corps */
export const ENGAGE_RANGE = 1.6;
/** Distance visée au moment de l'impact : les poings touchent vraiment le corps */
export const CONTACT_GAP = 0.8;
/** Les deux combattants ne peuvent jamais se traverser */
export const MIN_GAP = 0.75;
/** Limite de l'arène (de -6.4 à +6.4) */
export const ARENA_LIMIT = 6.4;
/** Frottement du recul : déplacement total d'une impulsion = vitesse / FRICTION */
export const FRICTION = 6;
/** Durée d'un match */
export const MATCH_TIME = 90;

export const TIMING = {
  dash: { duration: 0.35, cooldown: 3, speed: 13 },
  dodge: { duration: 0.45, cooldown: 1.4, backstep: 7 },
  block: { duration: 0.2 },
  approach: { duration: 0.1 },
  retreat: { duration: 0.1 },
  idle: { duration: 0.1 },
  /** Durée de l'étourdissement quand on reçoit un coup */
  stagger: { light: 0.85, finisher: 1.1, special: 0.8 },
  /** Boule de feu */
  projectile: { speed: 9, life: 2.2, radius: 0.5 },
} as const;
