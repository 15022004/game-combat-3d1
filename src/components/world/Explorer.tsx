"use client";
import type { RefObject } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CharacterDef } from "@/data/characters";
import { collide, type WorldLayout } from "@/lib/world/generate";
import type { ExploreInput, ExploreState } from "@/lib/world/state";
import { WalkingModel } from "./WalkingModel";

const CAM_DIST = 7;

/** Le héros en exploration : déplacement relatif à la caméra, collisions, caméra à la 3e personne */
export function Explorer({
  hero, layout, stateRef, inputRef,
}: {
  hero: CharacterDef;
  layout: WorldLayout;
  stateRef: RefObject<ExploreState>;
  inputRef: RefObject<ExploreInput>;
}) {
  const look = useRef(new THREE.Vector3());
  const camWant = useRef(new THREE.Vector3());

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = stateRef.current;
    const inp = inputRef.current;
    const p = s.player;

    // Rotation de la caméra au clavier (flèches gauche / droite)
    if (inp.keys.turnL) s.camYaw += dt * 2.2;
    if (inp.keys.turnR) s.camYaw -= dt * 2.2;

    // Direction voulue (relative à la caméra)
    let mx = inp.joy.x + (inp.keys.r ? 1 : 0) - (inp.keys.l ? 1 : 0);
    let my = inp.joy.y + (inp.keys.f ? 1 : 0) - (inp.keys.b ? 1 : 0);
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    p.moving = len > 0.15 && !s.encounter;
    p.running = p.moving && (inp.run || Math.hypot(inp.joy.x, inp.joy.y) > 0.92);

    if (p.moving) {
      const fx = -Math.sin(s.camYaw), fz = -Math.cos(s.camYaw); // devant
      const rx = Math.cos(s.camYaw), rz = -Math.sin(s.camYaw); // à droite
      const dx = fx * my + rx * mx;
      const dz = fz * my + rz * mx;
      const speed = (p.running ? 9 : 4.5) * (0.75 + hero.stats.speed / 280);
      p.x += dx * speed * dt;
      p.z += dz * speed * dt;
      p.heading = Math.atan2(dx, dz);
      collide(p, layout.colliders, 0.5);
    }

    // Caméra derrière le joueur
    const h = 2.2 + Math.sin(s.camPitch) * CAM_DIST;
    const flat = Math.cos(s.camPitch) * CAM_DIST;
    camWant.current.set(p.x + Math.sin(s.camYaw) * flat, h, p.z + Math.cos(s.camYaw) * flat);
    const k = 1 - Math.exp(-dt * 8);
    camera.position.lerp(camWant.current, k);
    look.current.set(p.x, 1.5, p.z);
    camera.lookAt(look.current);
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - 55) > 0.1) {
      cam.fov += (55 - cam.fov) * k;
      cam.updateProjectionMatrix();
    }
  });

  return <WalkingModel url={hero.model} tint={hero.tint} scale={hero.scale} getPose={() => stateRef.current.player} />;
}
