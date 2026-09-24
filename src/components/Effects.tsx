"use client";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { fxBus, type FxPayload } from "@/lib/fxBus";
import { chargeWindow } from "@/lib/engine/engine";
import type { BattleState } from "@/lib/engine/types";

/** Un effet temporaire (étincelle, onde de choc, lignes de vitesse...) */
interface Puff {
  obj: THREE.Object3D;
  age: number;
  life: number;
  delay: number;
  billboard?: boolean; // toujours face à la caméra
  spin?: number; // rotation sur lui-même
  update: (k: number, dt: number) => void; // k = progression de 0 à 1
}

/** Étoile d'impact façon manga (halo + pointes) */
function makeStarTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const glow = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.35, "rgba(255,255,255,0.45)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#fff";
  g.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 124 : 26;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  return new THREE.CanvasTexture(c);
}

/** Dégradé vertical pour l'aura (transparent en haut et en bas) */
function makeAuraTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.9)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function Effects({ battleRef }: { battleRef: RefObject<BattleState> }) {
  const root = useRef<THREE.Group>(null);
  const puffs = useRef<Puff[]>([]);
  const auras = useRef<{ group: THREE.Group; light: THREE.PointLight; mat: THREE.MeshBasicMaterial; level: number }[]>([]);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const parent = root.current;
    if (!parent) return;

    // Ressources partagées
    const starTex = makeStarTexture();
    const auraTex = makeAuraTexture();
    const quad = new THREE.PlaneGeometry(1, 1);
    const ring = new THREE.RingGeometry(0.86, 1, 56);
    const spark = new THREE.BoxGeometry(0.025, 0.025, 0.4);
    const line = new THREE.PlaneGeometry(1, 0.035);
    const auraGeo = new THREE.CylinderGeometry(0.5, 0.7, 2.7, 28, 1, true);

    const mat = (color: THREE.ColorRepresentation, map?: THREE.Texture, depthTest = true) =>
      new THREE.MeshBasicMaterial({
        color,
        map,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest,
        side: THREE.DoubleSide,
      });

    const add = (p: Puff) => {
      p.obj.visible = p.delay <= 0;
      parent.add(p.obj);
      puffs.current.push(p);
    };
    const colorOf = (id: string) => {
      const b = battleRef.current;
      return [b.fighterA, b.fighterB].find((f) => f.def.id === id)?.def.color ?? "#ffffff";
    };

    // --- Effets élémentaires ---------------------------------------------
    const burst = (x: number, y: number, size: number, color: string) => {
      const m = new THREE.Mesh(quad, mat(color, starTex, false));
      m.renderOrder = 20;
      m.position.set(x, y, 0.25);
      add({
        obj: m, age: 0, life: 0.24, delay: 0, billboard: true, spin: rand(-0.5, 0.5),
        update: (k) => {
          m.scale.setScalar(size * (0.3 + 0.7 * Math.min(1, k * 3.5)));
          (m.material as THREE.MeshBasicMaterial).opacity = 1 - k * k;
        },
      });
    };
    const shock = (x: number, y: number, size: number, color: string, life = 0.35, delay = 0, ground = false) => {
      const m = new THREE.Mesh(ring, mat(color, undefined, !ground));
      m.position.set(x, y, 0.2);
      if (ground) m.rotation.x = -Math.PI / 2;
      m.renderOrder = 19;
      add({
        obj: m, age: 0, life, delay, billboard: !ground,
        update: (k) => {
          m.scale.setScalar(size * (0.15 + 0.85 * Math.sqrt(k)));
          (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
        },
      });
    };
    const sparks = (x: number, y: number, dir: number, count: number, color: string) => {
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(spark, mat(i % 3 === 0 ? "#ffffff" : color));
        m.position.set(x, y, 0.2);
        const v = new THREE.Vector3(dir * rand(2, 9), rand(-1, 5), rand(-3, 3));
        add({
          obj: m, age: 0, life: rand(0.35, 0.7), delay: 0,
          update: (k, dt) => {
            m.position.addScaledVector(v, dt);
            v.y -= 9 * dt;
            m.lookAt(m.position.clone().add(v));
            m.scale.set(1, 1, 1 - k);
            (m.material as THREE.MeshBasicMaterial).opacity = 1 - k;
          },
        });
      }
    };
    const risingSparks = (x: number, count: number, color: string) => {
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(spark, mat(color));
        m.position.set(x + rand(-0.6, 0.6), rand(0, 0.6), rand(-0.4, 0.4));
        const v = new THREE.Vector3(rand(-0.3, 0.3), rand(2, 5), 0);
        add({
          obj: m, age: 0, life: rand(0.5, 0.9), delay: rand(0, 0.3),
          update: (k, dt) => {
            m.position.addScaledVector(v, dt);
            m.lookAt(m.position.clone().add(v));
            (m.material as THREE.MeshBasicMaterial).opacity = 1 - k;
          },
        });
      }
    };
    const speedLines = (x: number, dir: number, count: number, color: string) => {
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(line, mat(i % 2 ? "#ffffff" : color));
        const len = rand(1.4, 3.2);
        m.position.set(x - dir * len * 0.4, rand(0.3, 2), rand(-0.6, 0.9));
        add({
          obj: m, age: 0, life: 0.3, delay: 0,
          update: (k, dt) => {
            m.scale.x = len * (1 - k * 0.5);
            m.position.x -= dir * 4 * dt;
            (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
          },
        });
      }
    };

    // --- Réaction aux événements du combat -------------------------------
    const off = fxBus.on(({ e }: FxPayload) => {
      const color = colorOf(e.attackerId);
      const y = 1.25 + rand(-0.1, 0.25);
      const size = e.power === "light" ? 1.8 : e.power === "heavy" ? 2.7 : 3.8;

      switch (e.type) {
        case "hit":
        case "special":
          burst(e.x, y, size + (e.isCritical ? 0.8 : 0), e.isCritical ? "#ffe066" : "#ffffff");
          shock(e.x, y, size * 1.1, color);
          sparks(e.x, y, e.dir, e.power === "light" ? 10 : e.power === "heavy" ? 18 : 32, color);
          if (e.power !== "light") shock(e.x, 0.03, size * 1.4, color, 0.5, 0, true);
          break;
        case "blocked":
          burst(e.x, y, 1.3, "#9fd8ff");
          shock(e.x, y, 1.6, "#9fd8ff", 0.3);
          sparks(e.x, y, -e.dir, 6, "#9fd8ff");
          break;
        case "dodged":
          speedLines(e.x, e.dir, 5, "#ffffff");
          shock(e.x, 1.1, 1.4, "#ffffff", 0.3);
          break;
        case "dash":
          speedLines(e.x, e.dir, e.power === "heavy" ? 12 : 8, color);
          shock(e.x, 0.05, 1.6, color, 0.35, 0, true);
          break;
        case "charge":
          // Trois anneaux qui se contractent vers le combattant + étincelles qui montent
          for (let i = 0; i < 3; i++) {
            const m = new THREE.Mesh(ring, mat(color));
            const cx = e.x;
            m.position.set(cx, 1.2, 0.2);
            add({
              obj: m, age: 0, life: 0.45, delay: i * 0.13, billboard: true,
              update: (k) => {
                m.scale.setScalar(3.2 * (1 - k) + 0.3);
                (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(k * Math.PI) * 0.9;
              },
            });
          }
          risingSparks(e.x, 22, color);
          break;
        case "fireball":
          burst(e.x + e.dir * 0.6, 1.3, 2.2, color);
          shock(e.x + e.dir * 0.6, 1.3, 2, color, 0.3);
          speedLines(e.x, e.dir, 8, color);
          break;
        case "ko":
          burst(e.x, 1.3, 6.5, "#ffffff");
          shock(e.x, 1.3, 7, "#ffffff", 0.6);
          shock(e.x, 0.03, 8, color, 0.9, 0, true);
          sparks(e.x, 1.3, e.dir, 40, color);
          break;
      }
    });

    // --- Auras de charge (une par combattant) ----------------------------
    const b = battleRef.current;
    const made = [b.fighterA, b.fighterB].map((f) => {
      const group = new THREE.Group();
      const m = new THREE.MeshBasicMaterial({
        color: f.def.color, alphaMap: auraTex, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, opacity: 0,
      });
      const inner = new THREE.Mesh(auraGeo, m);
      inner.position.y = 1.3;
      const outer = new THREE.Mesh(auraGeo, m);
      outer.position.y = 1.3;
      outer.scale.set(1.35, 1.1, 1.35);
      const light = new THREE.PointLight(f.def.color, 0, 7, 2);
      light.position.y = 1.3;
      group.add(inner, outer, light);
      group.visible = false;
      parent.add(group);
      return { group, light, mat: m, level: 0 };
    });
    auras.current = made;

    const list = puffs.current;
    return () => {
      off();
      list.forEach((p) => {
        parent.remove(p.obj);
        ((p.obj as THREE.Mesh).material as THREE.Material)?.dispose();
      });
      list.length = 0;
      made.forEach((a) => {
        parent.remove(a.group);
        a.mat.dispose();
        a.light.dispose();
      });
      [starTex, auraTex, quad, ring, spark, line, auraGeo].forEach((r) => r.dispose());
    };
  }, [battleRef]);

  const parentQ = useRef(new THREE.Quaternion());

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const parent = root.current;
    if (!parent) return;
    // Les effets "billboard" font face à la caméra, même si le combat est tourné dans le monde
    const invParent = parent.getWorldQuaternion(parentQ.current).invert();

    // Mise à jour des effets temporaires
    const list = puffs.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (p.delay > 0) {
        p.delay -= dt;
        if (p.delay <= 0) p.obj.visible = true;
        continue;
      }
      p.age += dt;
      const k = Math.min(1, p.age / p.life);
      p.update(k, dt);
      if (p.billboard) {
        p.obj.quaternion.copy(invParent).multiply(camera.quaternion);
        if (p.spin) p.obj.rotateZ(p.spin * p.age * 6);
      }
      if (k >= 1) {
        parent.remove(p.obj);
        ((p.obj as THREE.Mesh).material as THREE.Material)?.dispose();
        list.splice(i, 1);
      }
    }

    // Auras : visibles pendant la charge du spécial
    const b = battleRef.current;
    [b.fighterA, b.fighterB].forEach((f, i) => {
      const a = auras.current[i];
      if (!a) return;
      const charge = chargeWindow(f);
      const on = charge > 0 && f.actionElapsed < charge + 0.3 && f.currentHp > 0;
      a.level += ((on ? 1 : 0) - a.level) * Math.min(1, dt * 12);
      a.group.visible = a.level > 0.02;
      a.group.position.x = f.position;
      a.group.rotation.y += dt * 6;
      const pulse = 0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 40);
      a.mat.opacity = 0.75 * a.level * pulse;
      a.light.intensity = 25 * a.level;
    });
  });

  return <group ref={root} />;
}
