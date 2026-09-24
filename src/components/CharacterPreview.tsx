"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { CharacterDef } from "@/data/characters";
import { prepareCharacter, retargetClips } from "@/lib/prepareModel";
import { MOVES } from "@/lib/engine/moves";
import { ANIMS_URL } from "./Character";

/** Démo : le personnage enchaîne des mouvements au hasard entre deux temps de repos */
const DEMO = Object.values(MOVES);

function Model({ def }: { def: CharacterDef }) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(def.model);
  const lib = useGLTF(ANIMS_URL);
  const { scene, clips } = useMemo(() => {
    const character = prepareCharacter(gltf.scene);
    return { scene: character, clips: retargetClips(character, lib.scene, lib.animations) };
  }, [gltf.scene, lib.scene, lib.animations]);
  const { actions } = useAnimations(clips, group);

  useEffect(() => {
    const idle = actions["Idle"];
    if (!idle) return;
    idle.reset().fadeIn(0.2).play();
    let current: THREE.AnimationAction = idle;
    let timer: ReturnType<typeof setTimeout>;
    const next = (showMove: boolean) => {
      const move = DEMO[Math.floor(Math.random() * DEMO.length)];
      const target = showMove ? actions[move.clip] : idle;
      if (!target) return;
      current.fadeOut(0.25);
      target.reset();
      target.timeScale = showMove ? move.speed * 0.8 : 1;
      target.setLoop(showMove ? THREE.LoopOnce : THREE.LoopRepeat, showMove ? 1 : Infinity);
      target.clampWhenFinished = true;
      target.fadeIn(0.25).play();
      current = target;
      const wait = showMove ? (target.getClip().duration / target.timeScale) * 1000 - 200 : 1600;
      timer = setTimeout(() => next(!showMove), Math.max(600, wait));
    };
    timer = setTimeout(() => next(true), 1200);
    return () => {
      clearTimeout(timer);
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [actions]);

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.35;
  });

  return (
    <group ref={group} scale={def.scale ?? 1}>
      <primitive object={scene} />
    </group>
  );
}

export function CharacterPreview({ def }: { def: CharacterDef }) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.3, 4.2], fov: 38 }}>
      <hemisphereLight args={["#bcd0ff", "#1a1226", 1]} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} castShadow />
      <pointLight position={[-2.5, 2, -1.5]} color={def.color} intensity={30} distance={10} />
      <pointLight position={[2.5, 1, -1.5]} color={def.color} intensity={18} distance={10} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[1.6, 48]} />
        <meshStandardMaterial color="#1b1c2b" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005}>
        <ringGeometry args={[1.5, 1.6, 48]} />
        <meshBasicMaterial color={def.color} />
      </mesh>
      <Suspense
        fallback={
          <Html center style={{ color: "#fff", fontFamily: "system-ui", fontSize: 14, whiteSpace: "nowrap" }}>
            Chargement du modèle…
          </Html>
        }
      >
        <Model key={def.id} def={def} />
      </Suspense>
      <CameraAim />
    </Canvas>
  );
}

function CameraAim() {
  useFrame(({ camera }) => camera.lookAt(0, 0.95, 0));
  return null;
}
