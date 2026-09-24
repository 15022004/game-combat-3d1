/** État "cinématique" partagé entre la simulation, la caméra et les personnages */
export interface FxState {
  /** Temps de gel (secondes) : le jeu se fige une fraction de seconde à l'impact */
  hitStop: number;
  /** Temps de ralenti (secondes) : utilisé pour le K.O. */
  slowmo: number;
  /** Intensité du tremblement de caméra */
  shake: number;
  /** Petit "coup de zoom" à l'impact */
  kick: number;
  /** Vitesse de lecture des animations (0 = figé, 0.3 = ralenti, 1 = normal) */
  timeScale: number;
  /** Dernier chrono vu : sert à détecter un redémarrage du combat */
  lastTime: number;
}

export const createFx = (): FxState => ({
  hitStop: 0,
  slowmo: 0,
  shake: 0,
  kick: 0,
  timeScale: 1,
  lastTime: 90,
});
