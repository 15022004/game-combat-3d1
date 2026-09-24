/** Commandes du joueur : écrites par les boutons / le clavier, lues par le moteur à chaque frame */
export type PlayerCommand = "punch" | "kick" | "special" | "dodge" | "dash";

export interface PlayerInput {
  left: boolean; // maintenu
  right: boolean; // maintenu
  block: boolean; // maintenu
  /** Dernière commande appuyée (mise en mémoire un court instant si le perso est occupé) */
  queued: PlayerCommand | null;
  queuedTtl: number;
}

export const createInput = (): PlayerInput => ({
  left: false,
  right: false,
  block: false,
  queued: null,
  queuedTtl: 0,
});

/** Durée pendant laquelle une commande reste en mémoire (buffer, comme dans les jeux de combat) */
export const INPUT_BUFFER = 0.35;

export function press(input: PlayerInput, cmd: PlayerCommand) {
  input.queued = cmd;
  input.queuedTtl = INPUT_BUFFER;
}
