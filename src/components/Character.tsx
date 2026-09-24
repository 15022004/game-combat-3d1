"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { prepareModel } from "@/lib/prepareModel";
import type { ActionType, FighterState } from "@/lib/engine/types";

// Noms des clips tels qu'ils existent dans les fichiers .glb (attention à la casse : "Block")
const CLIP: Record<ActionType, string> = {
  idle: "idle",
  approach: "walk",
  attack: "punch",
  special: "special",
  block: "Block",
  dodge: "dodge",
};

// Vitesse de lecture : les clips Mixamo sont plus longs que les actions du moteur (0.4 à 0.8 s)
const SPEED: Record<string, number> = { punch: 2, special: 1.5, dodge: 2 };

interface CharacterProps {
  url: string;
  /** 1 = regarde vers la droite (+x), -1 = regarde vers la gauche (-x) */
  facing: 1 | -1;
  getFighter: () => FighterState;
}

export function Character({ url, facing, getFighter }: CharacterProps) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(url);
  // Clone du modèle + rattachement des animations au squelette visible
  // (les .glb Mixamo contiennent un squelette séparé par animation, voir prepareModel.ts)
  const { scene, clips } = useMemo(
    () => prepareModel(gltf.scene, gltf.animations),
    [gltf.scene, gltf.animations]
  );
  const { actions } = useAnimations(clips, group);
  const current = useRef("");

  useFrame(() => {
    if (!group.current) return;
    const f = getFighter();
    group.current.position.x = f.position;
    group.current.rotation.y = facing === 1 ? Math.PI / 2 : -Math.PI / 2;

    const clip = f.currentHp <= 0 ? "death" : CLIP[f.currentAction];
    if (clip !== current.current && actions[clip]) {
      actions[current.current]?.fadeOut(0.15);
      const next = actions[clip]!.reset().fadeIn(0.15).play();
      next.timeScale = SPEED[clip] ?? 1;
      if (clip === "death") {
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
      } else {
        next.setLoop(THREE.LoopRepeat, Infinity);
        next.clampWhenFinished = false;
      }
      current.current = clip;
    }
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}
