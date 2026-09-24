/** État partagé de l'exploration (lu / écrit à chaque frame, jamais pendant le rendu React) */
export interface ExploreState {
  player: { x: number; z: number; heading: number; moving: boolean; running: boolean };
  monster: { x: number; z: number; heading: number; moving: boolean; chasing: boolean; alive: boolean };
  camYaw: number; // angle de la caméra autour du joueur
  camPitch: number;
  encounter: boolean; // le combat a été déclenché
}

export interface ExploreInput {
  keys: { f: boolean; b: boolean; l: boolean; r: boolean; turnL: boolean; turnR: boolean };
  joy: { x: number; y: number }; // joystick tactile (-1..1), y > 0 = avancer
  run: boolean; // Maj maintenu ou bouton COURIR
}

export const createExploreState = (spawn: { x: number; z: number }, monster: { x: number; z: number }): ExploreState => ({
  player: { x: spawn.x, z: spawn.z, heading: Math.atan2(monster.x - spawn.x, monster.z - spawn.z), moving: false, running: false },
  monster: { x: monster.x, z: monster.z, heading: 0, moving: false, chasing: false, alive: true },
  // caméra derrière le joueur, tournée vers le monstre
  camYaw: Math.atan2(spawn.x - monster.x, spawn.z - monster.z),
  camPitch: 0.35,
  encounter: false,
});

export const createExploreInput = (): ExploreInput => ({
  keys: { f: false, b: false, l: false, r: false, turnL: false, turnR: false },
  joy: { x: 0, y: 0 },
  run: false,
});
