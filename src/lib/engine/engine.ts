import type { CharacterDef } from "@/data/characters";
import type { PlayerInput } from "@/lib/input";
import type { ActionType, BattleEvent, BattleState, Controller, Decision, FighterState, HitPower } from "./types";
import { botReact, decideBot, decidePlayer, isInterruptible } from "./ai";
import { ARENA_LIMIT, CONTACT_GAP, FRICTION, MATCH_TIME, MELEE_RANGE, MIN_GAP, TIMING } from "./constants";
import { MOVES, SPECIAL_COST, getMove, type MoveDef } from "./moves";
import { getDifficulty, type DifficultyDef, type DifficultyId } from "./difficulty";

/** Actions qui relancent leur animation à chaque fois (ex : 2 attaques d'affilée) */
const RESTARTABLE = new Set<ActionType>(["attack", "special", "hit", "dodge", "dash"]);

export interface BattleOptions {
  /** Qui contrôle le combattant A (à gauche) : le joueur ou un bot */
  controlA: Controller;
  difficulty: DifficultyId;
}

/** Initialise un nouveau combat entre deux personnages */
export function createBattle(defA: CharacterDef, defB: CharacterDef, opts: BattleOptions): BattleState {
  const initFighter = (def: CharacterDef, pos: number, controller: Controller): FighterState => ({
    def,
    controller,
    position: pos,
    currentHp: def.stats.hp,
    maxHp: def.stats.hp,
    energy: 30,
    currentAction: "idle",
    moveId: null,
    lastMoveId: null,
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
    thinkTimer: 0.8, // petit temps avant que le bot ne bouge au début du match
    seenFoeActionId: -1,
    cooldowns: { attack: 0, special: 0, dodge: 0, dash: 0 },
  });

  return {
    fighterA: initFighter(defA, -3.5, opts.controlA),
    fighterB: initFighter(defB, 3.5, "bot"),
    difficulty: opts.difficulty,
    projectiles: [],
    nextProjectileId: 1,
    timeRemaining: MATCH_TIME,
    isFinished: false,
    winnerId: null,
    events: [],
  };
}

/** Gère les calculs de dégâts, blocages, esquives et coups critiques */
export function resolveHit(
  attacker: FighterState,
  defender: FighterState,
  move: MoveDef,
  multiplier: number,
  damageScale: number
): { damage: number; isBlocked: boolean; isDodged: boolean; isCrit: boolean } {
  if (defender.isDodging) return { damage: 0, isBlocked: false, isDodged: true, isCrit: false };

  // Coup critique (15% de chance)
  const isCrit = Math.random() < 0.15;
  const basePower = move.kind === "special" ? attacker.def.stats.special * 1.5 : attacker.def.stats.attack;
  const rawDamage = basePower * (isCrit ? 1.5 : 1) * multiplier * damageScale - defender.def.stats.defense * 0.3;
  let finalDamage = Math.max(4, rawDamage);

  let isBlocked = false;
  if (defender.isBlocking) {
    isBlocked = true;
    finalDamage *= 0.3; // la garde réduit les dégâts de 70%
  }
  return { damage: Math.round(finalDamage), isBlocked, isDodged: false, isCrit };
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
function startAction(f: FighterState, type: ActionType, duration: number, moveId: string | null = null) {
  if (type !== f.currentAction || RESTARTABLE.has(type)) f.actionId++;
  f.currentAction = type;
  f.moveId = moveId;
  f.actionTimer = duration;
  f.actionElapsed = 0;
  f.strikesDone = 0;
  f.rushed = false;
  f.isBlocking = type === "block";
  f.isDodging = type === "dodge";
}

/** Multiplicateur de dégâts du bot selon la difficulté (uniquement contre le joueur) */
const damageScaleOf = (f: FighterState, foe: FighterState, diff: DifficultyDef) =>
  f.controller === "bot" && foe.controller === "player" ? diff.damage : 1;

/** Applique un coup qui atteint sa cible : dégâts, recul, étourdissement, effets */
function applyHit(
  state: BattleState,
  f: FighterState,
  foe: FighterState,
  move: MoveDef,
  index: number,
  diff: DifficultyDef,
  dir: 1 | -1,
  x: number
): "dodged" | "blocked" | "hit" {
  const isSpecial = move.kind === "special";
  const last = index === move.strikes.length - 1;
  const single = move.strikes.length === 1;
  // Le 3e coup simple d'affilée devient un coup final qui projette l'adversaire
  const isFinisher = !isSpecial && single && f.combo >= 2;
  const power: HitPower = isSpecial
    ? last ? "ultimate" : "heavy"
    : isFinisher || (!single && last) || move.multipliers[index] >= 1.4 ? "heavy" : "light";
  const mult = move.multipliers[index] * (isFinisher ? 1.3 : 1);

  const hit = resolveHit(f, foe, move, mult, damageScaleOf(f, foe, diff));

  // Esquive réussie : le défenseur peut contre-attaquer
  if (hit.isDodged) {
    foe.counterWindow = 0.9;
    foe.cooldowns.attack = 0;
    f.combo = 0;
    emit(state, "dodged", f, foe, { x, dir, power, message: `${foe.def.name} esquive l'attaque !` });
    return "dodged";
  }

  foe.currentHp = Math.max(0, foe.currentHp - hit.damage);

  if (hit.isBlocked) {
    foe.velocity += dir * (isSpecial ? 5 : 3);
    f.velocity -= dir * 1.5;
    foe.energy = Math.min(100, foe.energy + 4);
    f.combo = 0;
    emit(state, "blocked", f, foe, {
      x, dir, power, damage: hit.damage,
      message: `${foe.def.name} bloque le coup de ${f.def.name}`,
    });
  } else {
    const comboCount = f.combo + 1;
    f.combo = isFinisher ? 0 : comboCount;
    f.comboTimer = 1.5;
    if (move.kind !== "special" && last) f.cooldowns.attack = Math.min(f.cooldowns.attack, 0.15); // enchaînement
    f.energy = Math.min(100, f.energy + 6);
    foe.energy = Math.min(100, foe.energy + 4);
    foe.combo = 0;

    const knockback = isFinisher ? 9 : hit.isCrit ? Math.max(6, move.knockback[index]) : move.knockback[index];
    foe.velocity += dir * knockback;

    const stagger = isSpecial
      ? TIMING.stagger.special
      : power === "heavy" ? TIMING.stagger.finisher : TIMING.stagger.light;
    startAction(foe, "hit", stagger);

    emit(state, isSpecial ? "special" : "hit", f, foe, {
      x, dir, power, damage: hit.damage, isCritical: hit.isCrit, combo: comboCount, label: move.name,
      message: isSpecial
        ? `${move.name.toUpperCase()} ! ${f.def.name} inflige ${hit.damage} dégâts !`
        : `${f.def.name} inflige ${hit.damage} dégâts ${hit.isCrit ? "CRITIQUES !" : ""}`,
    });
  }

  // Coup fatal : l'adversaire est projeté
  if (foe.currentHp <= 0) {
    foe.velocity += dir * 8;
    emit(state, "ko", f, foe, { x, dir, power: "ultimate", message: `K.O. ! ${f.def.name} terrasse ${foe.def.name} !` });
  }
  return hit.isBlocked ? "blocked" : "hit";
}

/** Un coup au corps à corps part : il touche seulement si l'adversaire est à portée */
function strike(state: BattleState, f: FighterState, foe: FighterState, move: MoveDef, index: number, diff: DifficultyDef) {
  const dist = Math.abs(f.position - foe.position);
  if (dist > move.reach) return; // coup dans le vide
  const dir: 1 | -1 = f.position < foe.position ? 1 : -1;
  applyHit(state, f, foe, move, index, diff, dir, foe.position - dir * 0.2);
}

/** Lance une boule d'énergie */
function launchProjectile(state: BattleState, f: FighterState, foe: FighterState, move: MoveDef) {
  const dir: 1 | -1 = f.position < foe.position ? 1 : -1;
  state.projectiles.push({
    id: state.nextProjectileId++,
    owner: f === state.fighterA ? "A" : "B",
    x: f.position + dir * 0.6,
    dir,
    life: TIMING.projectile.life,
    moveId: move.id,
  });
  emit(state, "fireball", f, foe, { power: "heavy", label: move.name, message: `${f.def.name} lance une boule de feu !` });
}

/** Démarre l'action choisie par le joueur ou le bot */
function beginAction(state: BattleState, f: FighterState, foe: FighterState, d: Decision) {
  const dir = f.position < foe.position ? 1 : -1;
  const dist = Math.abs(f.position - foe.position);
  const move = getMove(d.moveId);

  switch (d.action) {
    case "attack": {
      if (!move) return startAction(f, "idle", TIMING.idle.duration);
      startAction(f, "attack", move.duration, move.id);
      f.lastMoveId = move.id;
      f.cooldowns.attack = move.cooldown;
      // Petit pas en avant (coups sans élan) : au moment de l'impact, le poing touche vraiment le corps
      if (!move.rush && dist > CONTACT_GAP && dist < move.reach + 0.6)
        f.velocity += dir * Math.min(7, (dist - CONTACT_GAP) * FRICTION);
      emit(state, "move", f, foe, { label: move.name, message: `${f.def.name} : ${move.name}` });
      break;
    }
    case "special": {
      if (!move) return startAction(f, "idle", TIMING.idle.duration);
      startAction(f, "special", move.duration, move.id);
      f.lastMoveId = move.id;
      f.cooldowns.special = move.cooldown;
      f.energy -= SPECIAL_COST;
      emit(state, "charge", f, foe, {
        power: "ultimate", label: move.name,
        message: `${f.def.name} prépare ${move.name} !`,
      });
      break;
    }
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
      startAction(f, "block", d.duration ?? TIMING.block.duration);
      break;
    case "approach":
      startAction(f, "approach", TIMING.approach.duration);
      break;
    case "retreat":
      startAction(f, "retreat", TIMING.retreat.duration);
      break;
    default:
      startAction(f, "idle", TIMING.idle.duration);
  }
}

/** Choisit la prochaine action (joueur ou bot). Renvoie null si le personnage continue son action */
function think(f: FighterState, foe: FighterState, dt: number, diff: DifficultyDef, input?: PlayerInput): Decision | null {
  const dist = Math.abs(f.position - foe.position);

  if (f.controller === "player" && input) {
    if (input.queued) {
      input.queuedTtl -= dt;
      if (input.queuedTtl <= 0) input.queued = null;
    }
    return isInterruptible(f) ? decidePlayer(f, input) : null;
  }

  // Bot
  f.thinkTimer = Math.max(0, f.thinkTimer - dt);
  const reaction = botReact(f, foe, dist, diff);
  if (reaction) return reaction;
  if (f.actionTimer > 0) return null;

  if (f.thinkTimer > 0) {
    // En attendant sa prochaine décision, le bot continue simplement ce qu'il faisait
    const nearWall = Math.abs(f.position) > ARENA_LIMIT - 0.5;
    if (f.currentAction === "approach" && dist > MELEE_RANGE + 0.05) return { action: "approach" };
    if (f.currentAction === "retreat" && !nearWall) return { action: "retreat" };
    if (f.currentAction === "block") return { action: "block" };
    return { action: "idle" };
  }
  f.thinkTimer = diff.reaction * (0.6 + Math.random() * 0.8);
  return decideBot(f, foe, dist, diff);
}

function updateFighter(state: BattleState, f: FighterState, foe: FighterState, dt: number, diff: DifficultyDef, input?: PlayerInput) {
  // 1. Énergie, cooldowns, combo
  f.energy = Math.min(100, f.energy + 6 * dt);
  f.cooldowns.attack = Math.max(0, f.cooldowns.attack - dt);
  f.cooldowns.special = Math.max(0, f.cooldowns.special - dt);
  f.cooldowns.dodge = Math.max(0, f.cooldowns.dodge - dt);
  f.cooldowns.dash = Math.max(0, f.cooldowns.dash - dt);
  f.counterWindow = Math.max(0, f.counterWindow - dt);
  f.comboTimer = Math.max(0, f.comboTimer - dt);
  if (f.comboTimer === 0) f.combo = 0;

  // 2. Nouvelle action (joueur / bot) ou suite de l'action en cours
  const decision = think(f, foe, dt, diff, input);
  if (decision) beginAction(state, f, foe, decision);
  else {
    f.actionTimer -= dt;
    f.actionElapsed += dt;
  }

  // 3. Coups : ils partent à un moment précis de l'animation (le "hit frame")
  const action = f.currentAction;
  const move = action === "attack" || action === "special" ? getMove(f.moveId) : undefined;
  if (move) {
    if (move.rush && !f.rushed && f.actionElapsed >= move.rush[0]) {
      f.rushed = true;
      if (move.kind === "special")
        emit(state, "dash", f, foe, { power: "heavy", message: `${f.def.name} se rue sur sa cible !` });
    }
    while (
      f.currentAction === action &&
      f.strikesDone < move.strikes.length &&
      f.actionElapsed >= move.strikes[f.strikesDone]
    ) {
      const i = f.strikesDone++;
      if (move.projectile) launchProjectile(state, f, foe, move);
      else strike(state, f, foe, move, i, diff);
    }
  }

  // 4. Déplacements
  const dir = f.position < foe.position ? 1 : -1;
  const gap = Math.abs(f.position - foe.position);
  const walk = f.def.stats.speed / 20;
  let speed = 0;
  let stopAt = CONTACT_GAP;
  if (f.currentAction === "approach") {
    speed = walk * (gap > 3.5 ? 1.6 : 1);
    stopAt = MELEE_RANGE;
  } else if (f.currentAction === "retreat") {
    f.position -= dir * walk * 0.75 * dt;
  } else if (f.currentAction === "dash") {
    speed = TIMING.dash.speed;
    stopAt = MELEE_RANGE;
  } else if (move && f.currentAction === action && !move.projectile) {
    const t = f.actionElapsed;
    const unfinished = f.strikesDone < move.strikes.length;
    if (move.rush && t >= move.rush[0] && t < move.rush[1]) {
      speed = move.rushSpeed ?? 12; // ruée
    } else if (unfinished && (move.rush ? t >= move.rush[1] : f.strikesDone > 0)) {
      speed = 10; // le combattant "colle" à sa cible entre deux coups, malgré le recul
    }
  }
  if (speed > 0 && gap > stopAt) f.position += dir * Math.min(speed * dt, gap - stopAt);

  // Recul (knockback) : s'amortit progressivement
  f.position += f.velocity * dt;
  f.velocity *= Math.exp(-FRICTION * dt);
}

/** Boules de feu : avancent, touchent ou disparaissent */
function updateProjectiles(state: BattleState, dt: number, diff: DifficultyDef) {
  const { radius, speed } = TIMING.projectile;
  state.projectiles = state.projectiles.filter((p) => {
    p.x += p.dir * speed * dt;
    p.life -= dt;
    const attacker = p.owner === "A" ? state.fighterA : state.fighterB;
    const target = p.owner === "A" ? state.fighterB : state.fighterA;
    if (!p.spent && target.currentHp > 0 && Math.abs(p.x - target.position) < radius) {
      const result = applyHit(state, attacker, target, MOVES[p.moveId], 0, diff, p.dir, p.x);
      if (result !== "dodged") return false; // la boule explose
      p.spent = true; // esquivée : elle continue sa route sans toucher
    }
    return p.life > 0 && Math.abs(p.x) < ARENA_LIMIT + 3;
  });
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
export function step(state: BattleState, dt: number, input?: PlayerInput): BattleState {
  // Copie pour l'immutabilité
  const nextState: BattleState = {
    ...state,
    fighterA: { ...state.fighterA, cooldowns: { ...state.fighterA.cooldowns } },
    fighterB: { ...state.fighterB, cooldowns: { ...state.fighterB.cooldowns } },
    projectiles: state.projectiles.map((p) => ({ ...p })),
    events: [],
  };
  const a = nextState.fighterA;
  const b = nextState.fighterB;
  const diff = getDifficulty(state.difficulty);

  // Combat terminé : seul le recul continue (le K.O. est projeté au sol)
  if (state.isFinished) {
    for (const f of [a, b]) {
      f.position += f.velocity * dt;
      f.velocity *= Math.exp(-FRICTION * dt);
    }
    nextState.projectiles = [];
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

  updateFighter(nextState, a, b, dt, diff, input);
  updateFighter(nextState, b, a, dt, diff, input);
  updateProjectiles(nextState, dt, diff);
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
      emit(nextState, "victory", winner, loser, { power: "ultimate", message: `${winner.def.name} remporte le combat !` });
    }
  }

  return nextState;
}

/** Durée de la charge d'un spécial en cours (aura + gros plan caméra), 0 sinon */
export function chargeWindow(f: FighterState): number {
  if (f.currentAction !== "special") return 0;
  return getMove(f.moveId)?.charge ?? 0;
}
