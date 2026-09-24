"use client";

import { useRef } from "react";
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Character } from "./Character";
import { Effects } from "./Effects";
import { step } from "@/lib/engine/engine";
import { TIMING } from "@/lib/engine/constants";
import type { BattleEvent, BattleState } from "@/lib/engine/types";
import type { CharacterDef } from "@/data/characters";
import { createFx } from "@/lib/fx";
import { fxBus } from "@/lib/fxBus";

interface SimulationProps {
  a: CharacterDef;
  b: CharacterDef;
  battleRef: RefObject<BattleState>;
  speed?: number;
}

export function Simulation({ a, b, battleRef, speed = 1 }: SimulationProps) {
  const fx = useRef(createFx());
  const focus = useRef(new THREE.Vector3(0, 1.2, 0));
  const tmp = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const realDt = Math.min(delta, 0.05);
    const f = fx.current;
    let battle = battleRef.current;

    // Redémarrage du combat : le chrono remonte -> on remet les effets à zéro
    if (battle.timeRemaining > f.lastTime + 0.5) Object.assign(f, createFx());
    f.lastTime = battle.timeRemaining;

    // Impact ressenti : le temps se fige un court instant (hit stop), ralenti au K.O.
    let simDt = realDt * speed;
    if (f.hitStop > 0) {
      f.hitStop -= realDt;
      simDt = 0;
    } else if (f.slowmo > 0) {
      f.slowmo -= realDt;
      simDt *= 0.3;
    }
    f.timeScale = f.hitStop > 0 ? 0 : f.slowmo > 0 ? 0.3 : 1;

    // Avancement du moteur + traduction des événements en effets
    if (simDt > 0) {
      const next = step(battle, simDt);
      battleRef.current = next;
      battle = next;
      for (const e of next.events) {
        onEvent(e, f, cam, tmp.current);
      }
    }

    // --- Caméra dynamique -------------------------------------------------
    const fA = battle.fighterA;
    const fB = battle.fighterB;
    const mid = (fA.position + fB.position) / 2;
    const gap = fB.position - fA.position;

    let focusX = mid;
    let dist = 5 + gap * 0.55;
    let height = 1.55 + gap * 0.04;
    let fov = 45;

    // Gros plan pendant la charge du spécial
    const charger = [fA, fB].find(
      (fi) => fi.currentAction === "special" && fi.actionElapsed < TIMING.special.rushStart && fi.currentHp > 0
    );
    // Zoom sur le vaincu à la fin du combat
    const ko = battle.isFinished ? [fA, fB].find((fi) => fi.currentHp <= 0) : undefined;
    if (charger) {
      focusX = charger.position;
      dist = 3.4;
      height = 1.3;
      fov = 38;
    } else if (ko) {
      focusX = ko.position;
      dist = 4.2;
      height = 1.2;
      fov = 40;
    }

    const k = 1 - Math.exp(-realDt * (charger ? 9 : 5));
    focus.current.x += (focusX - focus.current.x) * k;
    cam.position.x += (focusX - 1.1 - cam.position.x) * k;
    cam.position.y += (height - cam.position.y) * k;
    cam.position.z += (dist - cam.position.z) * k;

    // Tremblement de caméra + petit zoom à l'impact
    cam.position.x += (Math.random() - 0.5) * f.shake;
    cam.position.y += (Math.random() - 0.5) * f.shake;
    f.shake *= Math.exp(-realDt * 9);
    f.kick *= Math.exp(-realDt * 7);
    cam.fov += (fov - f.kick * 3.5 - cam.fov) * (1 - Math.exp(-realDt * 10));
    cam.updateProjectionMatrix();
    cam.lookAt(focus.current.x, 1.2, 0);
  });

  return (
    <>
      {/* Combattant A */}
      <Character url={a.model} facing={1} getFighter={() => battleRef.current.fighterA} fx={fx} />

      {/* Combattant B */}
      <Character url={b.model} facing={-1} getFighter={() => battleRef.current.fighterB} fx={fx} />

      {/* Étincelles, ondes de choc, lignes de vitesse, auras */}
      <Effects battleRef={battleRef} />
    </>
  );
}

/** Convertit un événement du moteur en tremblement / gel / zoom, puis le diffuse aux effets 3D et au HUD */
function onEvent(
  e: BattleEvent,
  f: ReturnType<typeof createFx>,
  cam: THREE.PerspectiveCamera,
  v: THREE.Vector3
) {
  const level = e.power === "light" ? 0 : e.power === "heavy" ? 1 : 2;
  switch (e.type) {
    case "hit":
    case "special":
      f.shake = Math.max(f.shake, [0.06, 0.16, 0.32][level]);
      f.hitStop = Math.max(f.hitStop, [0.05, 0.09, 0.15][level] + (e.isCritical ? 0.04 : 0));
      f.kick = Math.max(f.kick, [0.4, 0.8, 1.4][level]);
      break;
    case "blocked":
      f.shake = Math.max(f.shake, 0.03);
      f.hitStop = Math.max(f.hitStop, 0.04);
      break;
    case "ko":
      f.shake = Math.max(f.shake, 0.5);
      f.hitStop = Math.max(f.hitStop, 0.3);
      f.slowmo = 1.8;
      f.kick = 2;
      break;
  }

  // Position à l'écran (en %) pour les textes flottants du HUD
  v.set(e.x, 1.6, 0.2).project(cam);
  fxBus.emit({ e, sx: (v.x * 0.5 + 0.5) * 100, sy: (1 - (v.y * 0.5 + 0.5)) * 100 });
}
