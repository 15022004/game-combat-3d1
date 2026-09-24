import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

/**
 * Les fichiers .glb (kairo / razen) exportés depuis Mixamo contiennent 9 squelettes
 * séparés : "Armature" (le seul relié au mesh) + "block", "death", "dodge", "hit",
 * "idle", "punch", "special", "walk" (des squelettes vides qui ne servent qu'à
 * porter chaque animation).
 *
 * Problème : chaque clip anime SON propre squelette, jamais celui du personnage
 * visible -> le personnage reste figé.
 *
 * Solution : on clone le modèle, on retrouve le squelette relié au mesh, puis on
 * "retarget" chaque clip vers ce squelette (mêmes os, autres noms) et on supprime
 * les squelettes inutiles.
 */

const isMesh = (o: THREE.Object3D) => (o as THREE.Mesh).isMesh === true;

/** Liste des os d'un squelette dans l'ordre de parcours (meshes exclus) */
function bonesOf(root: THREE.Object3D): THREE.Object3D[] {
  const list: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!isMesh(o)) list.push(o);
  });
  return list;
}

export function prepareModel(scene: THREE.Object3D, clips: THREE.AnimationClip[]) {
  const clone = SkeletonUtils.clone(scene);

  // 1. Le squelette "visible" est celui qui contient le SkinnedMesh
  let skinnedRoot: THREE.Object3D | null = null;
  for (const child of clone.children) {
    child.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinnedRoot = child;
    });
  }
  if (!skinnedRoot) return { scene: clone, clips };
  const target: THREE.Object3D = skinnedRoot;
  const targetBones = bonesOf(target);

  // 2. Table de correspondance : nom d'un os d'un squelette source -> nom de l'os équivalent
  const mapBySource = new Map<THREE.Object3D, Map<string, string>>();
  const otherRoots = clone.children.filter((c) => c !== target);
  for (const src of otherRoots) {
    const srcBones = bonesOf(src);
    if (srcBones.length !== targetBones.length) continue; // structure différente : on ignore
    const map = new Map<string, string>();
    srcBones.forEach((b, i) => map.set(b.name, targetBones[i].name));
    mapBySource.set(src, map);
  }

  // 3. Retarget de chaque clip
  const topLevelOf = (name: string): THREE.Object3D | null => {
    let node = clone.getObjectByName(name) ?? null;
    while (node && node.parent && node.parent !== clone) node = node.parent;
    return node;
  };

  const newClips = clips.map((clip) => {
    const first = clip.tracks[0];
    if (!first) return clip;
    const firstNode = first.name.slice(0, first.name.lastIndexOf("."));
    const srcRoot = topLevelOf(firstNode);
    if (!srcRoot || srcRoot === target) return stripRootMotion(clip);
    const map = mapBySource.get(srcRoot);
    if (!map) return clip;

    const tracks = clip.tracks.map((track) => {
      const dot = track.name.lastIndexOf(".");
      const mapped = map.get(track.name.slice(0, dot));
      const t = track.clone();
      if (mapped) t.name = mapped + track.name.slice(dot);
      return t;
    });
    return stripRootMotion(new THREE.AnimationClip(clip.name, clip.duration, tracks));
  });

  // 4. On retire les squelettes vides (ils n'ont plus d'utilité)
  otherRoots.forEach((r) => clone.remove(r));

  // 5. Ombres + pas de "culling" (un mesh animé peut sortir de sa boîte englobante d'origine)
  clone.traverse((o) => {
    if (isMesh(o)) {
      o.castShadow = true;
      o.frustumCulled = false;
    }
  });

  return { scene: clone, clips: newClips };
}

/**
 * Mixamo déplace le bassin (Hips) dans certains clips (walk, dodge, special, death...).
 * Le moteur de combat gère déjà la position : on garde la hauteur (axe Z local de
 * l'armature) et on fige les déplacements horizontaux pour que le personnage reste "sur place".
 */
function stripRootMotion(clip: THREE.AnimationClip): THREE.AnimationClip {
  clip.tracks.forEach((track) => {
    if (!/Hips(_\d+)?\.position$/.test(track.name)) return;
    const v = track.values;
    const x0 = v[0];
    const y0 = v[1];
    for (let i = 0; i < v.length; i += 3) {
      v[i] = x0;
      v[i + 1] = y0;
    }
  });
  return clip;
}
