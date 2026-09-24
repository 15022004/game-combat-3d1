import { CharacterDef } from "@/data/characters";
import { ActionType, BattleEvent, BattleState, FighterState, HitPower } from "./types";
import { decide } from "./ai";
import {
  ARENA_LIMIT,
  CONTACT_GAP,
  ENGAGE_RANGE,
  FRICTION,
  MELEE_RANGE,
  MIN_GAP,
  TIMING,
} from "./constants";

/** Actions qui relancent leur animation à chaque fois (ex : 2 attaques d'affilée) */
const RESTARTABLE = new Set<ActionType>(["attack", "special", "hit", "dodge", "dash"]);

/** Initialise un nouveau combat entre deux personnages */
export function createBattle(defA: CharacterDef, defB: CharacterDef): BattleState {
  const initFighter = (def: CharacterDef, pos: number): FighterState => ({
    def,
    position: pos,
    currentHp: def.stats.hp,
    maxHp: def.stats.hp,
    energy: 30,
    currentAction: "idle",
    actionTimer: 0,
    actionElapsed: 0,
    actionId: 0,
    strikesDone: 0,
    rushed: false,
    isBlocking: false,
    isDodging: false,
    velocity: 0,
    combo: 0,
    comboTimer: 0,
    counterWindow: 0,
    cooldowns: { attack: 0, special: 0, dodge: 0, dash: 0 },
  });

  return {
    fighterA: initFighter(defA, -3.5),
    fighterB: initFighter(defB, 3.5),
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
  isSpecial: boolean = false,
  multiplier: number = 1
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
  const rawDamage = basePower * critMultiplier * multiplier - defender.def.stats.defense * 0.3;
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

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function emit(
  state: BattleState,
  type: BattleEvent["type"],
  f: FighterState,
  foe: FighterState,
  extra: Partial<BattleEvent> & { message: string }
) {
  state.events.push({
    id: `${Date.now()}-${Math.random()}`,
    type,
    attackerId: f.def.id,
    defenderId: foe.def.id,
    x: f.position,
    dir: f.position < foe.position ? 1 : -1,
    power: "light",
    ...extra,
  });
}

/** Démarre une action (et relance l'animation si nécessaire) */
function startAction(f: FighterState, type: ActionType, duration: number) {
  if (type !== f.currentAction || RESTARTABLE.has(type)) f.actionId++;
  f.currentAction = type;
  f.actionTimer = duration;
  f.actionElapsed = 0;
  f.strikesDone = 0;
  f.rushed = false;
  f.isBlocking = type === "block";
  f.isDodging = type === "dodge";
}

/** Un coup part : on vérifie s'il touche, on applique dégâts, recul et étourdissement */
function strike(
  state: BattleState,
  f: FighterState,
  foe: FighterState,
  kind: "attack" | "special",
  index: number
) {
  const dist = Math.abs(f.position - foe.position);
  if (dist > ENGAGE_RANGE) return; // coup dans le vide

  const dir: 1 | -1 = f.position < foe.position ? 1 : -1;
  const isSpecial = kind === "special";
  const isFinisher = !isSpecial && f.combo >= 2; // le 3e coup d'un combo projette l'adversaire
  const power: HitPower = isSpecial ? (index < 2 ? "heavy" : "ultimate") : isFinisher ? "heavy" : "light";
  const mult = isSpecial ? TIMING.special.multipliers[index] : isFinisher ? 1.3 : 1;
  const x = foe.position - dir * 0.2;

  const hit = resolveHit(f, foe, isSpecial, mult);

  // Esquive réussie : le défenseur peut contre-attaquer
  if (hit.isDodged) {
    foe.counterWindow = 0.9;
    foe.cooldowns.attack = 0;
    f.combo = 0;
    emit(state, "dodged", f, foe, {
      x,
      dir,
      power,
      message: `${foe.def.name} esquive l'attaque !`,
    });
    return;
  }

  foe.currentHp = Math.max(0, foe.currentHp - hit.damage);

  if (hit.isBlocked) {
    // Blocage : pas d'étourdissement, mais les deux sont repoussés
    foe.velocity += dir * 3;
    f.velocity -= dir * 1.5;
    foe.energy = Math.min(100, foe.energy + 4);
    f.combo = 0;
    emit(state, "blocked", f, foe, {
      x,
      dir,
      power,
      damage: hit.damage,
      message: `${foe.def.name} bloque le coup de ${f.def.name}`,
    });
  } else {
    const comboCount = f.combo + 1;
    f.combo = isFinisher ? 0 : comboCount;
    f.comboTimer = 1.5;
    f.cooldowns.attack = 0; // permet d'enchaîner tout de suite
    f.energy = Math.min(100, f.energy + 6);
    foe.energy = Math.min(100, foe.energy + 4);
    foe.combo = 0;

    const knockback = isSpecial
      ? TIMING.special.knockback[index]
      : isFinisher
        ? 9
        : hit.isCrit
          ? 6
          : 4;
    foe.velocity += dir * knockback;

    const stagger = isSpecial
      ? TIMING.stagger.special
      : isFinisher
        ? TIMING.stagger.finisher
        : TIMING.stagger.light;
    startAction(foe, "hit", stagger);

    emit(state, isSpecial ? "special" : "hit", f, foe, {
      x,
      dir,
      power,
      damage: hit.damage,
      isCritical: hit.isCrit,
      combo: comboCount,
      message: isSpecial
        ? `SPECIAL ! ${f.def.name} inflige ${hit.damage} dégâts !`
        : `${f.def.name} inflige ${hit.damage} dégâts ${hit.isCrit ? "CRITIQUES !" : ""}`,
    });
  }

  // Coup fatal : l'adversaire est projeté
  if (foe.currentHp <= 0) {
    foe.velocity += dir * 8;
    emit(state, "ko", f, foe, {
      x,
      dir,
      power: "ultimate",
      message: `K.O. ! ${f.def.name} terrasse ${foe.def.name} !`,
    });
  }
}

/** Le personnage choisit et démarre sa prochaine action */
function beginAction(
  state: BattleState,
  f: FighterState,
  foe: FighterState,
  action: ActionType,
  dist: number
) {
  const dir = f.position < foe.position ? 1 : -1;

  switch (action) {
    case "attack":
      startAction(f, "attack", TIMING.attack.duration);
      f.cooldowns.attack = TIMING.attack.cooldown;
      // Petit pas en avant : au moment de l'impact, le poing touche vraiment le corps
      if (dist > CONTACT_GAP) f.velocity += dir * Math.min(7, (dist - CONTACT_GAP) * FRICTION);
      break;

    case "special":
      startAction(f, "special", TIMING.special.duration);
      f.cooldowns.special = TIMING.special.cooldown;
      f.energy -= TIMING.special.cost;
      emit(state, "charge", f, foe, {
        power: "ultimate",
        message: `${f.def.name} charge son attaque spéciale !`,
      });
      break;

    case "dash":
      startAction(f, "dash", TIMING.dash.duration);
      f.cooldowns.dash = TIMING.dash.cooldown;
      f.cooldowns.attack = 0; // on frappe dès l'arrivée
      emit(state, "dash", f, foe, { message: `${f.def.name} fonce sur son adversaire !` });
      break;

    case "dodge":
      startAction(f, "dodge", TIMING.dodge.duration);
      f.cooldowns.dodge = TIMING.dodge.cooldown;
      f.velocity -= dir * TIMING.dodge.backstep; // pas en arrière
      break;

    case "block":
      startAction(f, "block", TIMING.block.duration);
      break;

    case "approach":
      startAction(f, "approach", TIMING.approach.duration);
      break;

    default:
      startAction(f, "idle", TIMING.idle.duration);
  }
}

function updateFighter(state: BattleState, f: FighterState, foe: FighterState, dt: number) {
  // 1. Énergie, cooldowns, combo
  f.energy = Math.min(100, f.energy + 6 * dt);
  f.cooldowns.attack = Math.max(0, f.cooldowns.attack - dt);
  f.cooldowns.special = Math.max(0, f.cooldowns.special - dt);
  f.cooldowns.dodge = Math.max(0, f.cooldowns.dodge - dt);
  f.cooldowns.dash = Math.max(0, f.cooldowns.dash - dt);
  f.counterWindow = Math.max(0, f.counterWindow - dt);
  f.comboTimer = Math.max(0, f.comboTimer - dt);
  if (f.comboTimer === 0) f.combo = 0;

  // 2. Nouvelle action (IA) ou suite de l'action en cours
  if (f.actionTimer <= 0) {
    const dist = Math.abs(f.position - foe.position);
    beginAction(state, f, foe, decide(f, foe, dist), dist);
  } else {
    f.actionTimer -= dt;
    f.actionElapsed += dt;
  }

  // 3. Coups : ils partent à un moment précis de l'animation (le "hit frame")
  if (f.currentAction === "attack" && f.strikesDone === 0 && f.actionElapsed >= TIMING.attack.impact) {
    f.strikesDone = 1;
    strike(state, f, foe, "attack", 0);
  }
  if (f.currentAction === "special") {
    if (!f.rushed && f.actionElapsed >= TIMING.special.rushStart) {
      f.rushed = true;
      emit(state, "dash", f, foe, { power: "heavy", message: `${f.def.name} se rue sur sa cible !` });
    }
    while (
      f.currentAction === "special" &&
      f.strikesDone < TIMING.special.strikes.length &&
      f.actionElapsed >= TIMING.special.strikes[f.strikesDone]
    ) {
      const i = f.strikesDone;
      f.strikesDone++;
      strike(state, f, foe, "special", i);
    }
  }

  // 4. Déplacements
  const dir = f.position < foe.position ? 1 : -1;
  const gap = Math.abs(f.position - foe.position);
  let speed = 0;
  let stopAt = CONTACT_GAP;
  if (f.currentAction === "approach") {
    speed = (f.def.stats.speed / 20) * (gap > 3.5 ? 1.6 : 1);
    stopAt = MELEE_RANGE;
  } else if (f.currentAction === "dash") {
    speed = TIMING.dash.speed;
    stopAt = MELEE_RANGE;
  } else if (
    f.currentAction === "special" &&
    f.actionElapsed >= TIMING.special.rushStart &&
    f.actionElapsed < TIMING.special.rushEnd
  ) {
    speed = TIMING.special.rushSpeed;
    stopAt = CONTACT_GAP;
  } else if (
    f.currentAction === "special" &&
    f.actionElapsed >= TIMING.special.rushEnd &&
    f.strikesDone < TIMING.special.strikes.length
  ) {
    // Le combattant "colle" à sa cible entre deux coups du spécial, malgré le recul
    speed = 10;
    stopAt = CONTACT_GAP;
  }
  if (speed > 0 && gap > stopAt) f.position += dir * Math.min(speed * dt, gap - stopAt);

  // Recul (knockback) : s'amortit progressivement
  f.position += f.velocity * dt;
  f.velocity *= Math.exp(-FRICTION * dt);
}

/** Garde les combattants dans l'arène et empêche qu'ils se traversent */
function constrain(a: FighterState, b: FighterState) {
  a.position = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, a.position));
  b.position = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, b.position));

  const gap = b.position - a.position;
  if (gap < MIN_GAP) {
    const need = MIN_GAP - gap;
    let da = need / 2;
    let db = need / 2;
    if (a.position - da < -ARENA_LIMIT) {
      db += da - (a.position + ARENA_LIMIT);
      da = a.position + ARENA_LIMIT;
    }
    if (b.position + db > ARENA_LIMIT) {
      da += db - (ARENA_LIMIT - b.position);
      db = ARENA_LIMIT - b.position;
    }
    a.position -= da;
    b.position += db;
  }
}

/** Exécute une frame de mise à jour du combat (appelé 60 fois par seconde) */
export function step(state: BattleState, dt: number): BattleState {
  // Copie pour l'immutabilité
  const nextState: BattleState = {
    ...state,
    fighterA: { ...state.fighterA, cooldowns: { ...state.fighterA.cooldowns } },
    fighterB: { ...state.fighterB, cooldowns: { ...state.fighterB.cooldowns } },
    events: [],
  };
  const a = nextState.fighterA;
  const b = nextState.fighterB;

  // Combat terminé : seul le recul continue (le K.O. est projeté au sol)
  if (state.isFinished) {
    for (const f of [a, b]) {
      f.position += f.velocity * dt;
      f.velocity *= Math.exp(-FRICTION * dt);
    }
    constrain(a, b);
    return nextState;
  }

  // Chronomètre
  nextState.timeRemaining = Math.max(0, nextState.timeRemaining - dt);
  if (nextState.timeRemaining === 0) {
    nextState.isFinished = true;
    if (a.currentHp > b.currentHp) nextState.winnerId = a.def.id;
    else if (b.currentHp > a.currentHp) nextState.winnerId = b.def.id;
    return nextState;
  }

  updateFighter(nextState, a, b, dt);
  updateFighter(nextState, b, a, dt);
  constrain(a, b);

  // Conditions de victoire
  if (a.currentHp <= 0 || b.currentHp <= 0) {
    nextState.isFinished = true;
    if (a.currentHp <= 0 && b.currentHp <= 0) {
      nextState.winnerId = null; // Égalité
    } else {
      nextState.winnerId = a.currentHp > 0 ? a.def.id : b.def.id;
      const winner = a.currentHp > 0 ? a : b;
      const loser = a.currentHp > 0 ? b : a;
      emit(nextState, "victory", winner, loser, {
        power: "ultimate",
        message: `${winner.def.name} remporte le combat !`,
      });
    }
  }

  return nextState;
}
