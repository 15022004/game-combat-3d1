"use client";
import { useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { prepareModel } from "@/lib/prepareModel";
import type { ActionType, FighterState } from "@/lib/engine/types";
import type { FxState } from "@/lib/fx";

interface ClipConfig {
  clip: string; // nom du clip dans le .glb (attention à la casse : "Block")
  speed: number; // vitesse de lecture
  start?: number; // début de lecture (secondes) : on saute la préparation du coup
  loop: boolean;
}

/**
 * Réglages calés sur l'analyse des clips Mixamo :
 * - punch : le poing touche à ~1.15 s dans le clip -> on démarre à 0.6 s à vitesse x1.3,
 *   l'impact tombe à 0.42 s, exactement le "hit frame" du moteur (TIMING.attack.impact)
 * - special : coups de pied à 2.15 s, 3.3 s et 3.85 s dans le clip -> vitesse x2
 *   = impacts à 1.08 s, 1.65 s et 1.93 s (TIMING.special.strikes)
 */
const CLIPS: Record<ActionType, ClipConfig> = {
  idle: { clip: "idle", speed: 1, loop: true },
  approach: { clip: "walk", speed: 1.5, loop: true },
  dash: { clip: "walk", speed: 3, loop: true },
  attack: { clip: "punch", speed: 1.3, start: 0.6, loop: false },
  special: { clip: "special", speed: 2, loop: false },
  block: { clip: "Block", speed: 1, loop: true },
  dodge: { clip: "dodge", speed: 2.2, loop: false },
  hit: { clip: "hit", speed: 2.5, loop: false },
};
const DEATH: ClipConfig = { clip: "death", speed: 1.3, loop: false };

function setMixerSpeed(mixer: THREE.AnimationMixer, speed: number) {
  mixer.timeScale = speed;
}

/** Lance un clip avec ses réglages (fonction externe : manipule directement l'objet three.js) */
function playClip(action: THREE.AnimationAction, cfg: ClipConfig) {
  action.reset();
  action.time = cfg.start ?? 0;
  action.timeScale = cfg.speed;
  if (cfg.loop) {
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
  } else {
    action.setLoop(THREE.LoopOnce, 1); // garde la dernière pose jusqu'à l'action suivante
    action.clampWhenFinished = true;
  }
  action.fadeIn(0.1).play();
}

interface CharacterProps {
  url: string;
  /** 1 = regarde vers la droite (+x), -1 = regarde vers la gauche (-x) */
  facing: 1 | -1;
  getFighter: () => FighterState;
  fx: RefObject<FxState>;
}

export function Character({ url, facing, getFighter, fx }: CharacterProps) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(url);
  // Clone du modèle + rattachement des animations au squelette visible
  // (les .glb Mixamo contiennent un squelette séparé par animation, voir prepareModel.ts)
  const { scene, clips } = useMemo(
    () => prepareModel(gltf.scene, gltf.animations),
    [gltf.scene, gltf.animations]
  );
  const { actions, mixer } = useAnimations(clips, group);
  const lastKey = useRef("");
  const lastAction = useRef<THREE.AnimationAction | null>(null);

  useFrame(() => {
    if (!group.current) return;
    const f = getFighter();
    group.current.position.x = f.position;
    group.current.rotation.y = facing === 1 ? Math.PI / 2 : -Math.PI / 2;

    // Gel à l'impact (hit stop) et ralenti du K.O.
    setMixerSpeed(mixer, fx.current.timeScale);

    // On (re)lance une animation quand l'action change ou qu'elle redémarre (actionId)
    const dead = f.currentHp <= 0;
    const key = dead ? "death" : `${f.currentAction}:${f.actionId}`;
    if (key === lastKey.current) return;

    const cfg = dead ? DEATH : CLIPS[f.currentAction];
    const next = actions[cfg.clip];
    if (!next) return; // pas encore prêt : on réessaie à la frame suivante
    lastKey.current = key;

    if (lastAction.current && lastAction.current !== next) lastAction.current.fadeOut(0.1);
    playClip(next, cfg);
    lastAction.current = next;
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}
