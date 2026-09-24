import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

/**
 * Tous les personnages partagent UNE bibliothèque d'animations : public/models/anims.glb
 * (squelettes + clips, sans mesh ni texture, ~1.5 Mo). Elle a été générée à partir des
 * clips d'Ely (+ la marche de Kairo) avec scripts/build-anims.mjs.
 *
 * Pourquoi ? Dans les .glb d'origine, plusieurs personnages (Eve, Maw, Media, Mutant)
 * n'ont pas réellement exporté leurs animations, Maria a des clips sans nom
 * ("mixamo.com.004"...) et aucun n'a la marche. Avec une bibliothèque commune, chaque
 * personnage a tous les mouvements.
 *
 * Retarget : les squelettes Mixamo utilisent les mêmes noms d'os ("mixamorigHips"...).
 * three.js ajoute un suffixe "_1", "_2"... aux noms en double : on l'ignore pour
 * associer chaque piste d'animation à l'os du personnage.
 */

const isMesh = (o: THREE.Object3D) => (o as THREE.Mesh).isMesh === true;
const baseName = (name: string) => name.replace(/_\d+$/, "");

/** Clone le personnage et ne garde que le squelette relié au mesh */
export function prepareCharacter(scene: THREE.Object3D, tint?: string) {
  const clone = SkeletonUtils.clone(scene);

  let skinnedRoot: THREE.Object3D | null = null;
  for (const child of clone.children) {
    child.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinnedRoot = child;
    });
  }
  // Les squelettes vides (un par animation dans les exports Mixamo) ne servent plus
  if (skinnedRoot) clone.children.filter((c) => c !== skinnedRoot).forEach((c) => clone.remove(c));

  const tintColor = tint ? new THREE.Color(tint) : null;
  clone.traverse((o) => {
    if (isMesh(o)) {
      const mesh = o as THREE.Mesh;
      mesh.castShadow = true;
      mesh.frustumCulled = false; // un mesh animé peut sortir de sa boîte englobante d'origine
      // Teinte (monstres) : on clone les matériaux pour ne pas colorer le personnage d'origine
      if (tintColor) {
        const recolor = (m: THREE.Material) => {
          const c = m.clone() as THREE.MeshStandardMaterial;
          if (c.color) c.color.lerp(tintColor, 0.55);
          if (c.emissive) {
            c.emissive.copy(tintColor);
            c.emissiveIntensity = 0.25;
          }
          return c;
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(recolor) : recolor(mesh.material);
      }
    }
  });
  return clone;
}

/** Adapte les clips de la bibliothèque au squelette d'un personnage */
export function retargetClips(
  character: THREE.Object3D,
  library: THREE.Object3D,
  clips: THREE.AnimationClip[]
): THREE.AnimationClip[] {
  // Nom de base de l'os -> nom réel dans le personnage (+ position de repos du bassin)
  const bones = new Map<string, THREE.Object3D>();
  character.traverse((o) => {
    if (isMesh(o)) return;
    const key = baseName(o.name);
    if (!bones.has(key)) bones.set(key, o);
  });

  return clips
    .filter((clip) => clip.duration > 0.2) // ignore les "poses" d'une frame
    .map((clip) => {
      const tracks: THREE.KeyframeTrack[] = [];
      for (const track of clip.tracks) {
        const dot = track.name.lastIndexOf(".");
        const srcName = track.name.slice(0, dot);
        const prop = track.name.slice(dot + 1);
        const bone = bones.get(baseName(srcName));
        if (!bone) continue; // os absent chez ce personnage (doigts, etc.)
        const isHips = /Hips$/.test(baseName(srcName));
        if (prop === "scale") continue;
        if (prop === "position" && !isHips) continue; // on garde les proportions du personnage

        const t = track.clone();
        t.name = `${bone.name}.${prop}`;
        if (prop === "position") {
          const src = library.getObjectByName(srcName);
          fitHips(t, src?.position, bone.position);
        }
        tracks.push(t);
      }
      return new THREE.AnimationClip(clip.name, clip.duration, tracks);
    });
}

/**
 * Bassin (Hips) : le moteur de combat gère déjà la position du personnage, donc on fige les
 * déplacements horizontaux (axes X et Y locaux de l'armature) et on garde la hauteur (axe Z),
 * mise à l'échelle de ce personnage (ex : Media est modélisée 10x plus petite).
 */
function fitHips(track: THREE.KeyframeTrack, srcRest: THREE.Vector3 | undefined, rest: THREE.Vector3) {
  const v = track.values;
  const ratio = srcRest && Math.abs(srcRest.z) > 1e-6 ? rest.z / srcRest.z : 1;
  for (let i = 0; i < v.length; i += 3) {
    v[i] = rest.x;
    v[i + 1] = rest.y;
    v[i + 2] *= ratio;
  }
}
