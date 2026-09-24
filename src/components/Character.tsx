"use client";
import { useRef } from "react";
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { useCharacterModel } from "@/lib/useCharacterModel";
import type { ActionType, FighterState } from "@/lib/engine/types";
import { getMove } from "@/lib/engine/moves";
import type { FxState } from "@/lib/fx";

interface ClipConfig {
  clip: string; // nom du clip dans anims.glb
  speed: number; // vitesse de lecture (négative = à l'envers)
  start?: number; // début de lecture (secondes)
  loop: boolean;
}

/** Animations des actions "de base". Attaques et spéciaux : voir lib/engine/moves.ts */
const CLIPS: Record<Exclude<ActionType, "attack" | "special">, ClipConfig> = {
  idle: { clip: "Idle", speed: 1, loop: true },
  approach: { clip: "Walking", speed: 1.5, loop: true },
  retreat: { clip: "Walking", speed: -1.2, loop: true }, // marche arrière
  dash: { clip: "Walking", speed: 3, loop: true },
  block: { clip: "Standing Block Idle", speed: 1, loop: true },
  dodge: { clip: "Dodging", speed: 2.2, loop: false },
  hit: { clip: "Hit Reaction", speed: 2.5, loop: false },
};
const DEATH: ClipConfig = { clip: "Standing React Death Right", speed: 1.3, loop: false };

function clipFor(f: FighterState): ClipConfig {
  if (f.currentAction === "attack" || f.currentAction === "special") {
    const m = getMove(f.moveId);
    return m ? { clip: m.clip, speed: m.speed, start: m.start, loop: false } : CLIPS.idle;
  }
  return CLIPS[f.currentAction];
}

function setMixerSpeed(mixer: THREE.AnimationMixer, speed: number) {
  mixer.timeScale = speed;
}

/** Lance un clip avec ses réglages (fonction externe : manipule directement l'objet three.js) */
function playClip(action: THREE.AnimationAction, cfg: ClipConfig) {
  action.reset();
  action.timeScale = cfg.speed;
  action.time = cfg.start ?? (cfg.speed < 0 ? action.getClip().duration : 0);
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
  scale?: number;
  tint?: string;
  /** 1 = regarde vers la droite (+x), -1 = regarde vers la gauche (-x) */
  facing: 1 | -1;
  getFighter: () => FighterState;
  fx: RefObject<FxState>;
}

export function Character({ url, scale = 1, tint, facing, getFighter, fx }: CharacterProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, clips } = useCharacterModel(url, tint);
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
    const key = dead ? "death" : `${f.currentAction}:${f.actionId}:${f.moveId ?? ""}`;
    if (key === lastKey.current) return;

    const cfg = dead ? DEATH : clipFor(f);
    const next = actions[cfg.clip];
    if (!next) return; // pas encore prêt : on réessaie à la frame suivante
    lastKey.current = key;

    if (lastAction.current && lastAction.current !== next) lastAction.current.fadeOut(0.1);
    playClip(next, cfg);
    lastAction.current = next;
  });

  return (
    <group ref={group} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

