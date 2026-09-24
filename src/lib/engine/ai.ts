import { ActionType, FighterState } from "./types";
import { ENGAGE_RANGE } from "./constants";

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
  const canDash = me.cooldowns.dash <= 0;
  const foeThreat =
    foe.currentAction === "attack" || foe.currentAction === "special" || foe.currentAction === "dash";
  const foeStaggered = foe.currentAction === "hit";
  const style = me.def.style;
  const roll = rng();

  // 1. Loin de l'adversaire : ruée spéciale, dash ou course
  if (dist > ENGAGE_RANGE) {
    if (canSpecial && dist <= 6 && roll < (style === "aggressive" ? 0.4 : 0.22)) return "special";
    // Un style défensif se protège quand l'adversaire fonce sur lui
    if (style === "defensive" && (foe.currentAction === "special" || foe.currentAction === "dash")) {
      if (rng() < 0.5) return "block";
    }
    const dashChance = style === "aggressive" ? 0.6 : style === "balanced" ? 0.4 : 0.2;
    if (canDash && dist > 3.5 && rng() < dashChance) return "dash";
    return "approach";
  }

  // 2. Au corps à corps
  // Contre-attaque juste après une esquive réussie
  if (me.counterWindow > 0 && canAttack && roll < 0.85) return "attack";
  // L'adversaire est sonné : on enchaîne (combo)
  if (foeStaggered) {
    if (canSpecial && roll < 0.25) return "special";
    if (canAttack && roll < 0.85) return "attack";
  }

  switch (style) {
    case "aggressive":
      if (canSpecial && roll < 0.35) return "special";
      if (canAttack && roll < 0.9) return "attack";
      if (foeThreat && canDodge && rng() < 0.5) return "dodge";
      return rng() < 0.5 ? "block" : "idle";

    case "defensive": {
      if (foeThreat) {
        const r = rng();
        if (r < 0.55) return "block";
        if (canDodge && r < 0.8) return "dodge";
      }
      if (canSpecial && roll < 0.3) return "special";
      if (canAttack && roll < 0.75) return "attack";
      return "block";
    }

    case "balanced":
    default:
      if (foeThreat && rng() < 0.4) return canDodge ? "dodge" : "block";
      if (canSpecial && roll < 0.3) return "special";
      if (canAttack && roll < 0.75) return "attack";
      return roll < 0.9 ? "block" : "idle";
  }
}
