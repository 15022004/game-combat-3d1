import type { Decision, FighterState } from "./types";
import type { PlayerInput } from "@/lib/input";
import { ENGAGE_RANGE } from "./constants";
import { MOVES, SPECIAL_COST, getMove, pickMove } from "./moves";
import type { DifficultyDef } from "./difficulty";

const FREE_ACTIONS = new Set(["idle", "approach", "retreat", "block"]);

/** Le personnage peut-il être interrompu pour une nouvelle action ? */
export const isInterruptible = (f: FighterState) => f.actionTimer <= 0 || FREE_ACTIONS.has(f.currentAction);

const canSpecial = (f: FighterState) => f.energy >= SPECIAL_COST && f.cooldowns.special <= 0;

// ---------------------------------------------------------------------------
// Joueur : traduit les boutons en action (le mouvement exact est tiré au hasard)
// ---------------------------------------------------------------------------
export function decidePlayer(me: FighterState, input: PlayerInput): Decision | null {
  const cmd = input.queued;
  if (cmd) {
    let d: Decision | null = null;
    if ((cmd === "punch" || cmd === "kick") && me.cooldowns.attack <= 0) {
      d = { action: "attack", moveId: pickMove(cmd, me.lastMoveId).id };
    } else if (cmd === "special" && canSpecial(me)) {
      d = { action: "special", moveId: pickMove("special", me.lastMoveId).id };
    } else if (cmd === "dodge" && me.cooldowns.dodge <= 0) {
      d = { action: "dodge" };
    } else if (cmd === "dash" && me.cooldowns.dash <= 0) {
      d = { action: "dash" };
    }
    if (d) {
      input.queued = null;
      return d;
    }
  }
  // Pas de nouvelle commande : on ne coupe que les actions "libres"
  if (me.actionTimer > 0 && !FREE_ACTIONS.has(me.currentAction)) return null;
  if (input.block) return { action: "block" };
  // Le joueur est toujours à gauche : droite = avancer, gauche = reculer
  const forward = input.right;
  const backward = input.left;
  if (forward && !backward) return { action: "approach" };
  if (backward && !forward) return { action: "retreat" };
  return { action: "idle" };
}

// ---------------------------------------------------------------------------
// Bot : réagit aux attaques selon la difficulté, puis décide avec un peu de hasard
// ---------------------------------------------------------------------------

/** Réaction immédiate à une attaque adverse (parade / esquive), sans attendre le temps de réaction */
export function botReact(
  me: FighterState,
  foe: FighterState,
  dist: number,
  diff: DifficultyDef,
  rng: () => number = Math.random
): Decision | null {
  const threatening = foe.currentAction === "attack" || foe.currentAction === "special";
  if (!threatening || foe.actionId === me.seenFoeActionId) return null;
  const move = getMove(foe.moveId);
  if (!move) return null;
  // On ne réagit qu'une fois par attaque, et seulement si elle peut nous atteindre
  const incoming = move.projectile || move.rush || dist <= move.reach + 0.4;
  if (!incoming || !isInterruptible(me)) return null;
  me.seenFoeActionId = foe.actionId;
  if (rng() >= diff.defense) return null;
  // Esquive si possible (surtout contre les spéciaux), sinon parade
  const preferDodge = move.kind === "special" ? 0.6 : 0.35;
  if (me.cooldowns.dodge <= 0 && rng() < preferDodge && !move.projectile) return { action: "dodge" };
  // Garde tenue jusqu'au dernier impact de l'attaque (ou l'arrivée de la boule de feu)
  const until = move.projectile
    ? move.strikes[0] - foe.actionElapsed + dist / 9 + 0.2
    : move.strikes[move.strikes.length - 1] - foe.actionElapsed + 0.15;
  return { action: "block", duration: Math.min(2.5, Math.max(0.2, until)) };
}

export function decideBot(
  me: FighterState,
  foe: FighterState,
  dist: number,
  diff: DifficultyDef,
  rng: () => number = Math.random
): Decision {
  const special = canSpecial(me);
  const canAttack = me.cooldowns.attack <= 0;
  const canDash = me.cooldowns.dash <= 0;
  const foeStaggered = foe.currentAction === "hit";
  const style = me.def.style;
  const roll = rng();

  // Hésitation : plus la difficulté est basse, plus le bot reste planté
  if (rng() < diff.hesitation) return { action: dist > ENGAGE_RANGE ? "approach" : "idle" };

  const specialMove = (filterRanged?: boolean) =>
    pickMove("special", me.lastMoveId, rng, filterRanged === undefined ? undefined : (m) => !!m.projectile === filterRanged);

  // 1. Loin de l'adversaire
  if (dist > ENGAGE_RANGE) {
    // Boule de feu à distance
    if (special && dist > 3 && rng() < diff.special * 0.6) return { action: "special", moveId: MOVES.fireball.id };
    // Spécial avec ruée à moyenne distance
    if (special && dist <= 5 && rng() < diff.special * (style === "aggressive" ? 1 : 0.6))
      return { action: "special", moveId: specialMove(false).id };
    // Coup avec élan (salto, genou volant...) quand on arrive à portée
    if (canAttack && dist < 3 && rng() < diff.aggression * 0.35) {
      const kind = rng() < 0.5 ? "kick" : "punch";
      const m = pickMove(kind, me.lastMoveId, rng, (mv) => !!mv.rush);
      if (m.rush) return { action: "attack", moveId: m.id };
    }
    const dashChance = style === "aggressive" ? 0.55 : style === "balanced" ? 0.35 : 0.2;
    if (canDash && dist > 3.5 && rng() < dashChance * diff.aggression) return { action: "dash" };
    return { action: "approach" };
  }

  // 2. Au corps à corps
  // Contre-attaque juste après une esquive réussie
  if (me.counterWindow > 0 && canAttack && roll < 0.5 + diff.aggression * 0.45)
    return { action: "attack", moveId: pickMove("punch", me.lastMoveId, rng).id };
  // L'adversaire est sonné : on enchaîne
  if (foeStaggered) {
    if (special && roll < diff.special * 0.6) return { action: "special", moveId: specialMove(false).id };
    if (canAttack && roll < diff.aggression) return { action: "attack", moveId: randomAttack(me, rng).id };
  }

  const aggr = diff.aggression * (style === "aggressive" ? 1.1 : style === "defensive" ? 0.85 : 1);
  if (special && roll < diff.special * 0.45) return { action: "special", moveId: specialMove(false).id };
  if (canAttack && roll < aggr) return { action: "attack", moveId: randomAttack(me, rng).id };

  // Mouvements aléatoires : pas en arrière, garde, feinte...
  const r = rng();
  if (style === "defensive") return r < 0.5 ? { action: "block" } : r < 0.8 ? { action: "retreat" } : { action: "idle" };
  if (style === "aggressive") return r < 0.4 ? { action: "idle" } : r < 0.7 ? { action: "block" } : { action: "retreat" };
  return r < 0.35 ? { action: "block" } : r < 0.7 ? { action: "retreat" } : { action: "idle" };
}

function randomAttack(me: FighterState, rng: () => number) {
  return pickMove(rng() < 0.55 ? "punch" : "kick", me.lastMoveId, rng);
}
