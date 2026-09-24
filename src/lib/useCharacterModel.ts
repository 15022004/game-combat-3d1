"use client";
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { prepareCharacter, retargetClips } from "./prepareModel";

/** Bibliothèque d'animations partagée par tous les personnages */
export const ANIMS_URL = "/models/anims.glb";

/** Charge un personnage (+ teinte éventuelle) et lui adapte toutes les animations */
export function useCharacterModel(url: string, tint?: string) {
  const gltf = useGLTF(url);
  const lib = useGLTF(ANIMS_URL);
  return useMemo(() => {
    const scene = prepareCharacter(gltf.scene, tint);
    return { scene, clips: retargetClips(scene, lib.scene, lib.animations) };
  }, [gltf.scene, lib.scene, lib.animations, tint]);
}

useGLTF.preload(ANIMS_URL);
