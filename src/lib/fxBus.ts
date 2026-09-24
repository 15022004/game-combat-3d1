import type { BattleEvent } from "@/lib/engine/types";

/** Événement de combat + position à l'écran (en %) pour les effets 2D du HUD */
export interface FxPayload {
  e: BattleEvent;
  sx: number;
  sy: number;
}

type Listener = (p: FxPayload) => void;
const listeners = new Set<Listener>();

/** Petit bus d'événements : le moteur -> Simulation -> effets 3D + HUD */
export const fxBus = {
  emit(p: FxPayload) {
    listeners.forEach((l) => l(p));
  },
  on(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
