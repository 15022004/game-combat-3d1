/** Réglages du combat : tout se règle ici (distances, durées, dégâts...) */

/** Distance (centre à centre) à laquelle un combattant s'arrête pour frapper */
export const MELEE_RANGE = 1.05;
/** Distance maximale pour déclencher / réussir un coup au corps à corps */
export const ENGAGE_RANGE = 1.6;
/** Distance visée au moment de l'impact : les poings touchent vraiment le corps */
export const CONTACT_GAP = 0.8;
/** Les deux combattants ne peuvent jamais se traverser */
export const MIN_GAP = 0.75;
/** Limite de l'arène (de -6.4 à +6.4) */
export const ARENA_LIMIT = 6.4;
/** Frottement du recul : déplacement total d'une impulsion = vitesse / FRICTION */
export const FRICTION = 6;

export const TIMING = {
  attack: { duration: 0.8, impact: 0.42, cooldown: 0.95 },
  /** Le spécial : charge -> ruée -> 3 coups (2 rapides + 1 coup final qui projette) */
  special: {
    duration: 2.5,
    rushStart: 0.45,
    rushEnd: 0.75,
    rushSpeed: 20,
    strikes: [1.08, 1.65, 1.93],
    multipliers: [0.3, 0.3, 0.6],
    knockback: [1.5, 1.5, 16],
    cooldown: 6,
    cost: 50,
  },
  dash: { duration: 0.35, cooldown: 4, speed: 13 },
  dodge: { duration: 0.45, cooldown: 1.8, backstep: 7 },
  block: { duration: 0.45 },
  approach: { duration: 0.1 },
  idle: { duration: 0.15 },
  /** Durée de l'étourdissement quand on reçoit un coup */
  stagger: { light: 0.85, finisher: 1.1, special: 0.8 },
} as const;
