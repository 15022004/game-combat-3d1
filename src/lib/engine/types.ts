import type { CharacterDef } from "@/data/characters";
import type { DifficultyId } from "./difficulty";

export type ActionType =
  | "idle"
  | "approach"
  | "retreat"
  | "dash"
  | "attack" // poing ou pied (voir moveId)
  | "special" // attaque spéciale (voir moveId)
  | "block"
  | "dodge"
  | "hit";

/** Ce qu'un contrôleur (joueur ou bot) demande de faire */
export interface Decision {
  action: ActionType;
  moveId?: string;
  /** Durée imposée (ex : garde tenue jusqu'à la fin de l'attaque adverse) */
  duration?: number;
}

export type Controller = "player" | "bot";

export interface FighterState {
  def: CharacterDef;
  controller: Controller;
  position: number; // Position sur un axe 1D (de -6.4 à 6.4)
  currentHp: number;
  maxHp: number;
  energy: number; // Énergie pour l'attaque spéciale (0 - 100)
  currentAction: ActionType;
  moveId: string | null; // Mouvement en cours (attack / special)
  lastMoveId: string | null; // Pour ne pas tirer deux fois le même mouvement
  actionTimer: number; // Temps restant de l'action en cours (secondes)
  actionElapsed: number; // Temps écoulé depuis le début de l'action
  actionId: number; // Change à chaque (re)démarrage d'une action -> relance l'animation
  strikesDone: number; // Coups déjà portés dans l'action en cours
  rushed: boolean; // La ruée a démarré
  isBlocking: boolean;
  isDodging: boolean;
  velocity: number; // Vitesse de recul (knockback), s'amortit toute seule
  combo: number; // Nombre de coups enchaînés
  comboTimer: number; // Le combo retombe à 0 si ce timer arrive à 0
  counterWindow: number; // Fenêtre de contre-attaque après une esquive réussie
  /** Bot : temps avant la prochaine décision (temps de réaction) */
  thinkTimer: number;
  /** Bot : dernière attaque adverse à laquelle il a déjà réagi */
  seenFoeActionId: number;
  cooldowns: {
    attack: number;
    special: number;
    dodge: number;
    dash: number;
  };
}

export interface Projectile {
  id: number;
  owner: "A" | "B";
  x: number;
  dir: 1 | -1;
  life: number;
  moveId: string;
  /** Esquivée : continue sa course sans plus rien toucher */
  spent?: boolean;
}

export type BattleEventType =
  | "hit"
  | "blocked"
  | "dodged"
  | "special"
  | "dash"
  | "charge"
  | "move"
  | "fireball"
  | "ko"
  | "victory";

export type HitPower = "light" | "heavy" | "ultimate";

export interface BattleEvent {
  id: string;
  type: BattleEventType;
  attackerId: string;
  defenderId: string;
  damage?: number;
  isCritical?: boolean;
  message: string;
  /** Nom du mouvement (affiché par le HUD) */
  label?: string;
  /** Position (axe x) où l'événement se produit : sert aux effets visuels */
  x: number;
  /** Sens du coup : 1 = vers la droite, -1 = vers la gauche */
  dir: 1 | -1;
  power: HitPower;
  combo?: number;
}

export interface BattleState {
  fighterA: FighterState;
  fighterB: FighterState;
  difficulty: DifficultyId;
  projectiles: Projectile[];
  nextProjectileId: number;
  timeRemaining: number; // Chronomètre du match (ex: 90s)
  isFinished: boolean;
  winnerId: string | null;
  events: BattleEvent[];
}
