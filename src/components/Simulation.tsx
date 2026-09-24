"use client";

import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Character } from "./Character";
import { step } from "@/lib/engine/engine";
import type { BattleState } from "@/lib/engine/types";
import type { CharacterDef } from "@/data/characters";

interface SimulationProps {
  a: CharacterDef;
  b: CharacterDef;
  battleRef: RefObject<BattleState>;
  speed?: number;
}

export function Simulation({ a, b, battleRef, speed = 1 }: SimulationProps) {
  useFrame((state, delta) => {
    if (!battleRef.current || battleRef.current.isFinished) return;

    // 1. Calcul du delta-time sécurisé pour éviter les sauts d'animation
    const dt = Math.min(delta, 0.05) * speed;

    // 2. Avancement de la simulation du moteur de combat à 60 fps
    // Remarque : step modifie directement la référence ou retourne un nouvel état
    const nextState = step(battleRef.current, dt);
    battleRef.current = nextState;

    // 3. Gestion dynamique de la caméra 3D
    const fA = battleRef.current.fighterA;
    const fB = battleRef.current.fighterB;

    // Point central entre les deux combattants
    const midX = (fA.position + fB.position) / 2;
    // Distance entre les deux combattants
    const gap = Math.abs(fA.position - fB.position);

    // Smooth Interpolation (Lerp) pour la position X et Z de la caméra
    state.camera.position.x += (midX - state.camera.position.x) * 0.05;
    state.camera.position.z += (7 + gap * 0.6 - state.camera.position.z) * 0.05;
    
    // La caméra fixe le centre du combat légèrement au-dessus du sol (Y = 1.2)
    state.camera.lookAt(midX, 1.2, 0);
  });

  return (
    <>
      {/* Combattant A */}
      <Character
        url={a.model}
        facing={1}
        getFighter={() => battleRef.current.fighterA}
      />

      {/* Combattant B */}
      <Character
        url={b.model}
        facing={-1}
        getFighter={() => battleRef.current.fighterB}
      />
    </>
  );
}