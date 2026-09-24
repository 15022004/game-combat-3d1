"use client";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export default function Arena({ children }: { children?: React.ReactNode }) {
  return (
    <Canvas shadows camera={{ position: [0, 3, 9], fov: 45 }}>
      <color attach="background" args={["#0d0f1a"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      {/* Sol de l'arène */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[8, 64]} />
        <meshStandardMaterial color="#2b2b3a" />
      </mesh>
      {/* Suspense : les modèles .glb se chargent de façon asynchrone */}
      <Suspense fallback={null}>{children}</Suspense>
      <OrbitControls />
    </Canvas>
  );
}
