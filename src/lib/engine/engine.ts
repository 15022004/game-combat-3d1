import { CharacterDef } from "@/data/characters";
import { BattleState, FighterState } from "./types";
import { decide } from "./ai";

/** Initialise un nouveau combat entre deux personnages */
export function createBattle(defA: CharacterDef, defB: CharacterDef): BattleState {
  const initFighter = (def: CharacterDef, pos: number): FighterState => ({
    def,
    position: pos,
    currentHp: def.stats.hp,
    maxHp: def.stats.hp,
    energy: 20,
    currentAction: "idle",
    actionTimer: 0,
    isBlocking: false,
    isDodging: false,
    cooldowns: { attack: 0, special: 0, dodge: 0 },
  });

  return {
    fighterA: initFighter(defA, -4),
    fighterB: initFighter(defB, 4),
    timeRemaining: 90,
    isFinished: false,
    winnerId: null,
    events: [],
  };
}

/** Gère les calculs de dégâts, blocages, esquives et coups critiques */
export function resolveHit(
  attacker: FighterState,
  defender: FighterState,
  isSpecial: boolean = false
): { damage: number; isBlocked: boolean; isDodged: boolean; isCrit: boolean } {
  // Gestion de l'esquive
  if (defender.isDodging) {
    return { damage: 0, isBlocked: false, isDodged: true, isCrit: false };
  }

  // Calcul du coup critique (15% de chance de base)
  const isCrit = Math.random() < 0.15;
  const basePower = isSpecial ? attacker.def.stats.special * 1.5 : attacker.def.stats.attack;
  const critMultiplier = isCrit ? 1.5 : 1.0;

  // Calcul de réduction par la défense
  const rawDamage = basePower * critMultiplier - defender.def.stats.defense * 0.3;
  let finalDamage = Math.max(5, rawDamage); // Minimum 5 dégâts garantis

  // Si le défenseur bloque
  let isBlocked = false;
  if (defender.isBlocking) {
    isBlocked = true;
    finalDamage *= 0.3; // Réduction de 70% des dégâts
  }

  return {
    damage: Math.round(finalDamage),
    isBlocked,
    isDodged: false,
    isCrit,
  };
}

/** Exécute une frame de mise à jour du combat (appelé 60 fois par seconde) */
export function step(state: BattleState, dt: number): BattleState {
  if (state.isFinished) return state;

  // Copie profonde basique pour l'immutabilité
  const nextState: BattleState = {
    ...state,
    fighterA: { ...state.fighterA, cooldowns: { ...state.fighterA.cooldowns } },
    fighterB: { ...state.fighterB, cooldowns: { ...state.fighterB.cooldowns } },
    events: [],
  };

  // Mise à jour du chronomètre
  nextState.timeRemaining = Math.max(0, nextState.timeRemaining - dt);
  if (nextState.timeRemaining === 0) {
    nextState.isFinished = true;
    if (nextState.fighterA.currentHp > nextState.fighterB.currentHp) {
      nextState.winnerId = nextState.fighterA.def.id;
    } else if (nextState.fighterB.currentHp > nextState.fighterA.currentHp) {
      nextState.winnerId = nextState.fighterB.def.id;
    }
    return nextState;
  }

  const distance = Math.abs(nextState.fighterA.position - nextState.fighterB.position);

  // Mettre à jour les deux combattants
  [nextState.fighterA, nextState.fighterB].forEach((fighter, idx) => {
    const foe = idx === 0 ? nextState.fighterB : nextState.fighterA;

    // 1. Régénération progressive de l'énergie
    fighter.energy = Math.min(100, fighter.energy + 5 * dt);

    // 2. Décrémentation des cooldowns
    fighter.cooldowns.attack = Math.max(0, fighter.cooldowns.attack - dt);
    fighter.cooldowns.special = Math.max(0, fighter.cooldowns.special - dt);
    fighter.cooldowns.dodge = Math.max(0, fighter.cooldowns.dodge - dt);

    // 3. Prise de décision par l'IA si aucune action en cours
    if (fighter.actionTimer <= 0) {
      const chosenAction = decide(fighter, foe, distance);
      fighter.currentAction = chosenAction;
      fighter.isBlocking = chosenAction === "block";
      fighter.isDodging = chosenAction === "dodge";

      // Configuration des temps d'action et déclenchement des effets
      if (chosenAction === "approach") {
        fighter.actionTimer = 0.1;
      } else if (chosenAction === "attack") {
        fighter.actionTimer = 0.5; // Animation de 0.5s
        fighter.cooldowns.attack = 1.0;

        // Attaque appliquée si l'ennemi est à portée (<= 2 unités)
        if (distance <= 2) {
          const hit = resolveHit(fighter, foe);
          foe.currentHp = Math.max(0, foe.currentHp - hit.damage);

          nextState.events.push({
            id: `${Date.now()}-${Math.random()}`,
            type: hit.isDodged ? "dodged" : hit.isBlocked ? "blocked" : "hit",
            attackerId: fighter.def.id,
            defenderId: foe.def.id,
            damage: hit.damage,
            isCritical: hit.isCrit,
            message: hit.isDodged
              ? `${foe.def.name} esquive l'attaque !`
              : `${fighter.def.name} inflige ${hit.damage} dégâts ${hit.isCrit ? "CRITIQUES !" : ""}`,
          });
        }
      } else if (chosenAction === "special") {
        fighter.actionTimer = 0.8;
        fighter.cooldowns.special = 4.0;
        fighter.energy -= 50;

        if (distance <= 3) {
          const hit = resolveHit(fighter, foe, true);
          foe.currentHp = Math.max(0, foe.currentHp - hit.damage);

          nextState.events.push({
            id: `${Date.now()}-${Math.random()}`,
            type: "special",
            attackerId: fighter.def.id,
            defenderId: foe.def.id,
            damage: hit.damage,
            isCritical: hit.isCrit,
            message: `SPECIAL ! ${fighter.def.name} inflige ${hit.damage} dégâts !`,
          });
        }
      } else if (chosenAction === "dodge") {
        fighter.actionTimer = 0.4;
        fighter.cooldowns.dodge = 2.0;
      } else if (chosenAction === "block") {
        fighter.actionTimer = 0.3;
      } else {
        fighter.actionTimer = 0.1; // Idle
      }
    } else {
      fighter.actionTimer -= dt;
    }

    // 4. Déplacement continu pendant l'action "approach" (distance minimale de 1 unité)
    if (fighter.currentAction === "approach" && Math.abs(fighter.position - foe.position) > 1) {
      const dir = fighter.position < foe.position ? 1 : -1;
      fighter.position += dir * (fighter.def.stats.speed / 20) * dt;
    }
  });

  // Vérification des conditions de victoire
  if (nextState.fighterA.currentHp <= 0 || nextState.fighterB.currentHp <= 0) {
    nextState.isFinished = true;
    if (nextState.fighterA.currentHp <= 0 && nextState.fighterB.currentHp <= 0) {
      nextState.winnerId = null; // Égalité
    } else {
      nextState.winnerId =
        nextState.fighterA.currentHp > 0 ? nextState.fighterA.def.id : nextState.fighterB.def.id;
    }
  }

  return nextState;
}