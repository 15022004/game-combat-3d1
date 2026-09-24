"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { useCharacterModel } from "@/lib/useCharacterModel";

interface Pose {
  x: number;
  z: number;
  heading: number;
  moving: boolean;
  running?: boolean;
}

/** Change d'animation (fonction externe : manipule directement les objets three.js) */
function switchClip(prev: THREE.AnimationAction | null | undefined, next: THREE.AnimationAction, speed: number) {
  if (prev && prev !== next) prev.fadeOut(0.2);
  if (prev !== next) next.reset().fadeIn(0.2).play();
  next.setLoop(THREE.LoopRepeat, Infinity);
  next.timeScale = speed;
}

function turnTowards(g: THREE.Object3D, heading: number) {
  const d = Math.atan2(Math.sin(heading - g.rotation.y), Math.cos(heading - g.rotation.y));
  g.rotation.y += d * 0.25;
}

/** Personnage qui se promène : Idle à l'arrêt, marche / course en mouvement */
export function WalkingModel({ url, tint, scale = 1, getPose }: { url: string; tint?: string; scale?: number; getPose: () => Pose }) {
  const group = useRef<THREE.Group>(null);
  const { scene, clips } = useCharacterModel(url, tint);
  const { actions } = useAnimations(clips, group);
  const current = useRef<string>("");

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const p = getPose();
    g.position.set(p.x, 0, p.z);
    turnTowards(g, p.heading); // rotation douce vers la direction de déplacement

    const want = p.moving ? (p.running ? "run" : "walk") : "idle";
    if (want === current.current) return;
    const clip = want === "idle" ? actions["Idle"] : actions["Walking"];
    if (!clip) return;
    const prev = current.current === "idle" ? actions["Idle"] : actions["Walking"];
    current.current = want;
    switchClip(prev, clip, want === "run" ? 2.2 : want === "walk" ? 1.3 : 1);
  });

  return (
    <group ref={group} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}
