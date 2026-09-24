import { CharacterDef } from "@/data/characters";

export type ActionType = "idle" | "approach" | "attack" | "special" | "block" | "dodge";

export interface FighterState {
  def: CharacterDef;
  position: number; // Position sur un axe 1D (ex: de -10 à 10)
  currentHp: number;
  maxHp: number;
  energy: number; // Énergie/Mana pour l'attaque spéciale (0 - 100)
  currentAction: ActionType;
  actionTimer: number; // Temps restant pour accomplir l'action en cours (secondes)
  isBlocking: boolean;
  isDodging: boolean;
  cooldowns: {
    attack: number;
    special: number;
    dodge: number;
  };
}

export type BattleEventType = "hit" | "blocked" | "dodged" | "special" | "victory";

export interface BattleEvent {
  id: string;
  type: BattleEventType;
  attackerId: string;
  defenderId: string;
  damage?: number;
  isCritical?: boolean;
  message: string;
}

export interface BattleState {
  fighterA: FighterState;
  fighterB: FighterState;
  timeRemaining: number; // Chronomètre du match (ex: 90s)
  isFinished: boolean;
  winnerId: string | null;
  events: BattleEvent[];
}