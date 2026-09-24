"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
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

interface CharacterProps {
  url: string;
  /** 1 = regarde vers la droite (+x), -1 = regarde vers la gauche (-x) */
  facing: 1 | -1;
  getFighter: () => FighterState;
}

export function Character({ url, facing, getFighter }: CharacterProps) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(url);
  // Clone du modèle : les deux combattants peuvent partager le même fichier .glb
  const scene = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, group);
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
