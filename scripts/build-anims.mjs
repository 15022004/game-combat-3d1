// Usage (une seule fois, avec les .glb ORIGINAUX qui contiennent les animations) :
//   npm i -D @gltf-transform/core @gltf-transform/functions
//   node scripts/build-anims.mjs public/models
// Construit public/models/anims.glb : uniquement les squelettes + animations (aucun mesh ni texture)
import { NodeIO } from '@gltf-transform/core';
import { mergeDocuments, prune, dedup, resample } from '@gltf-transform/functions';
const [,, dir] = process.argv;
const io = new NodeIO();

/** Garde seulement les animations demandées, renommées d'après leur squelette source */
async function extract(file, keep /* Map rootName -> newName */) {
  const doc = await io.read(`${dir}/${file}`);
  const root = doc.getRoot();
  const topOf = (n) => { let p = n; while (p.getParentNode && p.getParentNode()) p = p.getParentNode(); return p; };
  root.listNodes().forEach((n) => { n.setMesh(null); n.setSkin(null); });
  root.listMeshes().forEach((m) => m.dispose());
  root.listSkins().forEach((s) => s.dispose());
  root.listMaterials().forEach((m) => m.dispose());
  root.listTextures().forEach((t) => t.dispose());
  for (const anim of root.listAnimations()) {
    const ch = anim.listChannels()[0];
    const top = ch ? topOf(ch.getTargetNode()) : null;
    const name = top && keep.get(top.getName());
    if (!name) { anim.listChannels().forEach(c => c.dispose()); anim.listSamplers().forEach(s => s.dispose()); anim.dispose(); continue; }
    anim.setName(name);
    top.setName(name);
    // On ne garde que les rotations + la position du bassin (le reste écraserait les proportions du perso)
    for (const c of anim.listChannels()) {
      const path = c.getTargetPath();
      const bone = c.getTargetNode().getName();
      if (path === 'scale' || (path === 'translation' && !/Hips$/.test(bone))) { c.getSampler().dispose(); c.dispose(); }
    }
  }
  // Supprime les squelettes non utilisés
  const scene = root.listScenes()[0];
  for (const n of scene.listChildren()) if (![...keep.values()].includes(n.getName())) { n.listChildren(); scene.removeChild(n); }
  await doc.transform(prune(), dedup(), resample());
  return doc;
}

const ely = [
  'Capoeira','Cross Punch','Dodging','Drop Kick','Fireball','Fist Fight A','Flip Kick',
  'Flying Knee Punch Combo','Hit Reaction','Idle','Inverted Double Kick To Kip Up',
  'Spin Flip Kick','Standing Block Idle','Standing React Death Right',
];
const a = await extract('Ely.glb', new Map(ely.map((n) => [n, n])));
const b = await extract('kairo.glb', new Map([['walk', 'Walking']]));
mergeDocuments(a, b);
// une seule scène
const r = a.getRoot(); const [s0, ...rest] = r.listScenes();
rest.forEach((s) => { s.listChildren().forEach((c) => { s.removeChild(c); s0.addChild(c); }); s.dispose(); });
a.getRoot().listBuffers().slice(1).forEach(buf => { r.listAccessors().forEach(acc => acc.getBuffer() === buf && acc.setBuffer(r.listBuffers()[0])); buf.dispose(); });
await a.transform(prune());
await io.write(`${dir}/anims.glb`, a);
console.log(r.listAnimations().map((x) => x.getName()), r.listScenes().length);
