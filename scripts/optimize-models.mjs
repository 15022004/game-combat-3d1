// Usage : npm i -D @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions sharp
//   node scripts/optimize-models.mjs dossier_originaux public/models Ely.glb Erika.glb ...
// (à lancer APRÈS build-anims.mjs : les animations des modèles sont retirées)
// Allège les modèles : garde uniquement le mesh + son squelette, textures en WebP (max 1024 px)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
const [,, inDir, outDir, ...names] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const n of names) {
  const doc = await io.read(`${inDir}/${n}`);
  const root = doc.getRoot();
  root.listAnimations().forEach((a) => { a.listChannels().forEach(c => c.dispose()); a.listSamplers().forEach(s => s.dispose()); a.dispose(); });
  const scene = root.listScenes()[0];
  const hasSkin = (node) => { let found = false; node.traverse((x) => { if (x.getMesh()) found = true; }); return found; };
  for (const c of scene.listChildren()) if (!hasSkin(c)) { c.traverse(x => x !== c && x.dispose()); c.dispose(); }
  root.listSkins().forEach((s) => { if (!s.listParents().some(p => p.propertyType === 'Node')) s.dispose(); });
  await doc.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }));
  await io.write(`${outDir}/${n}`, doc);
}
