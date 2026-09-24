"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BattlefieldDef, PropPart } from "@/data/battlefields";
import { WORLD_HALF, WORLD_SIZE, mulberry32, type WorldLayout } from "@/lib/world/generate";

/** Texture de sol : bruit de deux couleurs, répétée sur toute la carte */
function makeGroundTexture(a: string, b: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = a;
  g.fillRect(0, 0, 256, 256);
  const r = mulberry32(7);
  g.fillStyle = b;
  for (let i = 0; i < 1400; i++) {
    const s = 2 + r() * 10;
    g.globalAlpha = 0.15 + r() * 0.35;
    g.fillRect(r() * 256, r() * 256, s, s);
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(WORLD_SIZE / 8, WORLD_SIZE / 8);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeGeometry(p: PropPart): THREE.BufferGeometry {
  const a = p.args;
  switch (p.geo) {
    case "cylinder": return new THREE.CylinderGeometry(a[0], a[1], a[2], a[3]);
    case "cone": return new THREE.ConeGeometry(a[0], a[1], a[2]);
    case "box": return new THREE.BoxGeometry(a[0], a[1], a[2]);
    case "sphere": return new THREE.SphereGeometry(a[0], a[1], a[2]);
    case "dodeca": return new THREE.DodecahedronGeometry(a[0], a[1]);
    case "octa": return new THREE.OctahedronGeometry(a[0], a[1]);
  }
}

/** Tous les éléments de décor d'un même type en un seul appel de dessin (InstancedMesh) */
function PropInstances({ field, layout, kind }: { field: BattlefieldDef; layout: WorldLayout; kind: number }) {
  const def = field.props[kind];
  const items = useMemo(() => layout.props.filter((p) => p.kind === kind), [layout, kind]);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const parts = useMemo(
    () =>
      def.parts.map((p) => ({
        geometry: makeGeometry(p),
        material: new THREE.MeshStandardMaterial({
          color: p.color,
          emissive: p.emissive ?? "#000000",
          emissiveIntensity: p.emissive ? 1.2 : 0,
          roughness: 0.85,
          transparent: p.opacity !== undefined,
          opacity: p.opacity ?? 1,
          flatShading: true,
        }),
        y: p.y,
      })),
    [def]
  );

  useEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    parts.forEach((part, pi) => {
      const mesh = refs.current[pi];
      if (!mesh) return;
      items.forEach((it, i) => {
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, it.rot);
        pos.set(it.x, part.y * it.scale, it.z);
        scl.setScalar(it.scale);
        mesh.setMatrixAt(i, m.compose(pos, q, scl));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
    return () => parts.forEach((p) => { p.geometry.dispose(); p.material.dispose(); });
  }, [items, parts]);

  return (
    <>
      {parts.map((p, i) => (
        <instancedMesh
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          args={[p.geometry, p.material, items.length]}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

interface TerrainProps {
  field: BattlefieldDef;
  layout: WorldLayout;
  /** Position suivie par la lumière du soleil (pour que les ombres restent autour du joueur) */
  getFollow: () => { x: number; z: number };
}

export function Terrain({ field, layout, getFollow }: TerrainProps) {
  const ground = useMemo(() => makeGroundTexture(field.ground, field.groundAlt), [field]);
  const sun = useRef<THREE.DirectionalLight>(null);

  useEffect(() => () => ground.dispose(), [ground]);

  useFrame(() => {
    const s = sun.current;
    const p = getFollow();
    if (!s) return;
    s.position.set(p.x + 20, 40, p.z + 15);
    s.target.position.set(p.x, 0, p.z);
    s.target.updateMatrixWorld();
  });

  const wall = WORLD_HALF;
  return (
    <>
      <color attach="background" args={[field.sky]} />
      <fog attach="fog" args={[field.sky, field.fogNear, field.fogFar]} />
      <hemisphereLight args={field.ambient} />
      <directionalLight
        ref={sun}
        color={field.sun}
        intensity={field.sunIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={120}
      />

      {/* Sol */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[WORLD_SIZE + 80, WORLD_SIZE + 80]} />
        <meshStandardMaterial map={ground} roughness={1} />
      </mesh>

      {/* Décor */}
      {field.props.map((_, k) => (
        <PropInstances key={k} field={field} layout={layout} kind={k} />
      ))}

      {/* Limites de la zone (mur d'énergie, comme la zone d'un battle royale) */}
      {[
        [0, -wall, 0], [0, wall, 0], [-wall, 0, Math.PI / 2], [wall, 0, Math.PI / 2],
      ].map(([x, z, rot], i) => (
        <mesh key={i} position={[x, 6, z]} rotation-y={rot}>
          <planeGeometry args={[WORLD_SIZE, 12]} />
          <meshBasicMaterial color={field.accent} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
