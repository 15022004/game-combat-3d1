import { ActionType, FighterState } from "./types";

export function decide(
  me: FighterState,
  foe: FighterState,
  dist: number,
  rng: () => number = Math.random
): ActionType {
  // Ne prend pas de nouvelle décision si le personnage est déjà engagé dans une action
  if (me.actionTimer > 0) return me.currentAction;

  const canSpecial = me.energy >= 50 && me.cooldowns.special <= 0;
  const canAttack = me.cooldowns.attack <= 0;
  const canDodge = me.cooldowns.dodge <= 0;

  // 1. Si les combattants sont hors de portée d'attaque (distance > 2 unités)
  if (dist > 2) {
    if (canSpecial && rng() < 0.3) return "special";
    return "approach";
  }

  // 2. Si au corps à corps (distance <= 2 unités)
  const roll = rng();

  switch (me.def.style) {
    case "aggressive":
      if (canSpecial && roll < 0.5) return "special";
      if (canAttack && roll < 0.85) return "attack";
      if (canDodge && roll < 0.95) return "dodge";
      return "block";

    case "defensive":
      if (foe.currentAction === "attack" || foe.currentAction === "special") {
        if (roll < 0.6) return "block";
        if (canDodge && roll < 0.85) return "dodge";
      }
      if (canSpecial && roll < 0.4) return "special";
      if (canAttack) return "attack";
      return "block";

    case "balanced":
    default:
      if (canSpecial && roll < 0.35) return "special";
      if (canAttack && roll < 0.7) return "attack";
      if (roll < 0.85) return "block";
      if (canDodge) return "dodge";
      return "idle";
  }
}