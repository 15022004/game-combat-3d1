"use client";
import { useRef } from "react";
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BattleState } from "@/lib/engine/types";

const MAX = 4;

/** Boules de feu : une sphère lumineuse + un halo + une lumière, aux couleurs du lanceur */
export function Projectiles({ battleRef }: { battleRef: RefObject<BattleState> }) {
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame((state) => {
    const b = battleRef.current;
    for (let i = 0; i < MAX; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const p = b.projectiles[i];
      g.visible = !!p;
      if (!p) continue;
      const owner = p.owner === "A" ? b.fighterA : b.fighterB;
      g.position.set(p.x, 1.3, 0);
      const pulse = 1 + 0.15 * Math.sin(state.clock.elapsedTime * 30 + i);
      g.scale.setScalar(pulse);
      const [core, halo, light] = g.children as [THREE.Mesh, THREE.Mesh, THREE.PointLight];
      (halo.material as THREE.MeshBasicMaterial).color.set(owner.def.color);
      light.color.set(owner.def.color);
      halo.rotation.z += 0.3;
      core.scale.x = 1.4; // légèrement étirée dans le sens du mouvement
    }
  });

  return (
    <>
      {Array.from({ length: MAX }, (_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} visible={false}>
          <mesh>
            <sphereGeometry args={[0.2, 20, 20]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.38, 20, 20]} />
            <meshBasicMaterial transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <pointLight intensity={30} distance={6} />
        </group>
      ))}
    </>
  );
}
