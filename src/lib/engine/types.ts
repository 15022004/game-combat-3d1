import { CharacterDef } from "@/data/characters";

export type ActionType =
  | "idle"
  | "approach"
  | "dash"
  | "attack"
  | "special"
  | "block"
  | "dodge"
  | "hit";

export interface FighterState {
  def: CharacterDef;
  position: number; // Position sur un axe 1D (de -6.4 à 6.4)
  currentHp: number;
  maxHp: number;
  energy: number; // Énergie pour l'attaque spéciale (0 - 100)
  currentAction: ActionType;
  actionTimer: number; // Temps restant de l'action en cours (secondes)
  actionElapsed: number; // Temps écoulé depuis le début de l'action
  actionId: number; // Change à chaque (re)démarrage d'une action -> relance l'animation
  strikesDone: number; // Coups déjà portés dans l'action en cours
  rushed: boolean; // La ruée du spécial a démarré
  isBlocking: boolean;
  isDodging: boolean;
  velocity: number; // Vitesse de recul (knockback), s'amortit toute seule
  combo: number; // Nombre de coups enchaînés
  comboTimer: number; // Le combo retombe à 0 si ce timer arrive à 0
  counterWindow: number; // Fenêtre de contre-attaque après une esquive réussie
  cooldowns: {
    attack: number;
    special: number;
    dodge: number;
    dash: number;
  };
}

export type BattleEventType =
  | "hit"
  | "blocked"
  | "dodged"
  | "special"
  | "dash"
  | "charge"
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
  timeRemaining: number; // Chronomètre du match (ex: 90s)
  isFinished: boolean;
  winnerId: string | null;
  events: BattleEvent[];
}
