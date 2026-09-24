"use client";
import type { RefObject } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CharacterDef } from "@/data/characters";
import { collide, type WorldLayout } from "@/lib/world/generate";
import type { ExploreState } from "@/lib/world/state";
import { WalkingModel } from "./WalkingModel";

/** Distance à laquelle le monstre repère le joueur et à laquelle le combat commence */
export const AGGRO_RANGE = 20;
export const ENCOUNTER_RANGE = 3.2;

/**
 * Le monstre erre autour de son repaire. S'il repère le joueur, il le poursuit ;
 * au contact, onEncounter() lance le combat.
 */
export function MonsterRoamer({
  monster, layout, stateRef, onEncounter,
}: {
  monster: CharacterDef;
  layout: WorldLayout;
  stateRef: RefObject<ExploreState>;
  onEncounter: () => void;
}) {
  const target = useRef({ x: layout.monsterSpawn.x, z: layout.monsterSpawn.z, wait: 1 });
  const beacon = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = stateRef.current;
    const m = s.monster;
    const p = s.player;
    if (s.encounter || !m.alive) return;

    const dist = Math.hypot(p.x - m.x, p.z - m.z);
    m.chasing = dist < AGGRO_RANGE;
    let gx: number, gz: number, speed: number;
    if (m.chasing) {
      gx = p.x; gz = p.z; speed = 3.6;
    } else {
      // Errance : un point au hasard autour du repaire, une pause, puis un autre
      const t = target.current;
      if (Math.hypot(t.x - m.x, t.z - m.z) < 0.6) {
        t.wait -= dt;
        if (t.wait <= 0) {
          const a = Math.random() * Math.PI * 2;
          const r = 3 + Math.random() * 11;
          t.x = layout.monsterSpawn.x + Math.cos(a) * r;
          t.z = layout.monsterSpawn.z + Math.sin(a) * r;
          t.wait = 1 + Math.random() * 2.5;
        }
      }
      gx = t.x; gz = t.z; speed = 1.8;
    }
    const dx = gx - m.x, dz = gz - m.z;
    const d = Math.hypot(dx, dz);
    m.moving = d > 0.6;
    if (m.moving) {
      m.x += (dx / d) * speed * dt;
      m.z += (dz / d) * speed * dt;
      m.heading = Math.atan2(dx, dz);
      collide(m, layout.colliders, 0.6);
    }

    if (dist < ENCOUNTER_RANGE) {
      s.encounter = true;
      onEncounter();
    }

    // Balise lumineuse au-dessus du monstre (visible de loin)
    const b = beacon.current;
    if (b) {
      b.position.set(m.x, 0, m.z);
      b.scale.x = b.scale.z = 1 + 0.15 * Math.sin(state.clock.elapsedTime * 4);
    }
  });

  return (
    <>
      <WalkingModel
        url={monster.model}
        tint={monster.tint}
        scale={monster.scale}
        getPose={() => ({ ...stateRef.current.monster, running: stateRef.current.monster.chasing })}
      />
      <group ref={beacon}>
        <mesh position-y={30}>
          <cylinderGeometry args={[0.35, 0.8, 60, 12, 1, true]} />
          <meshBasicMaterial color={monster.color} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} fog={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.05}>
          <ringGeometry args={[1.4, 1.7, 32]} />
          <meshBasicMaterial color={monster.color} transparent opacity={0.8} />
        </mesh>
      </group>
    </>
  );
}
