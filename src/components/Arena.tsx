"use client";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";

interface ArenaProps {
  children?: React.ReactNode;
  colorA?: string;
  colorB?: string;
}

export default function Arena({ children, colorA = "#ff5a2a", colorB = "#3ec5ff" }: ArenaProps) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 3, 9], fov: 45, near: 0.1, far: 80 }}>
      <color attach="background" args={["#0a0c18"]} />
      <fog attach="fog" args={["#0a0c18", 12, 34]} />

      {/* Lumière principale + lumières de contour aux couleurs des deux combattants */}
      <hemisphereLight args={["#8fa8ff", "#1a1226", 0.8]} />
      <directionalLight
        position={[4, 9, 6]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <pointLight position={[-6, 2.5, -2]} color={colorA} intensity={45} distance={16} />
      <pointLight position={[6, 2.5, -2]} color={colorB} intensity={45} distance={16} />

      {/* Sol de l'arène + anneau lumineux */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <circleGeometry args={[40, 48]} />
        <meshStandardMaterial color="#0d0f1c" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[8, 64]} />
        <meshStandardMaterial color="#2b2b3a" roughness={0.8} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <ringGeometry args={[7.7, 8, 64]} />
        <meshBasicMaterial color="#9fb4ff" />
      </mesh>

      {/* Suspense : les modèles .glb se chargent de façon asynchrone */}
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}
