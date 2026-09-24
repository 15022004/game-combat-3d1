/**
 * Les 5 champs de bataille du mode Aventure. Chaque champ couvre une tranche de niveaux
 * (0 à 50 au total) et possède son propre décor, ses couleurs et ses monstres.
 */

/** Une partie d'un élément de décor (rendu en InstancedMesh) */
export interface PropPart {
  geo: "cylinder" | "cone" | "box" | "sphere" | "dodeca" | "octa";
  args: number[]; // arguments de la géométrie three.js
  y: number; // hauteur du centre de la pièce
  color: string;
  emissive?: string;
  opacity?: number;
}

export interface PropKind {
  id: string;
  parts: PropPart[];
  count: number; // nombre d'éléments sur la carte
  radius: number; // rayon de collision (0 = on peut marcher dessus)
  scale: [number, number]; // échelle min / max
  color?: string; // couleur sur la mini-carte
}

export interface BattlefieldDef {
  id: string;
  name: string;
  description: string;
  levels: [number, number]; // premier et dernier niveau
  ground: string; // couleur du sol
  groundAlt: string; // seconde couleur (texture de bruit)
  sky: string; // fond + brouillard
  fogNear: number;
  fogFar: number;
  sun: string;
  sunIntensity: number;
  ambient: [string, string, number]; // ciel, sol, intensité
  accent: string; // couleur d'interface
  props: PropKind[];
}

const tree: PropKind = {
  id: "tree", count: 260, radius: 0.7, scale: [0.8, 1.5], color: "#1f6b2c",
  parts: [
    { geo: "cylinder", args: [0.18, 0.28, 2, 6], y: 1, color: "#6b4a2b" },
    { geo: "sphere", args: [1.4, 8, 6], y: 3, color: "#2f8f3a" },
  ],
};
const rock = (color: string, count = 160): PropKind => ({
  id: `rock-${color}`, count, radius: 1, scale: [0.6, 1.8], color,
  parts: [{ geo: "dodeca", args: [1, 0], y: 0.4, color }],
});
const bush: PropKind = {
  id: "bush", count: 220, radius: 0, scale: [0.6, 1.2], color: "#3fa34d",
  parts: [{ geo: "sphere", args: [0.6, 6, 5], y: 0.3, color: "#3fa34d" }],
};
const cactus: PropKind = {
  id: "cactus", count: 200, radius: 0.5, scale: [0.8, 1.6], color: "#3e7d3a",
  parts: [
    { geo: "cylinder", args: [0.28, 0.32, 3, 7], y: 1.5, color: "#4f8f45" },
    { geo: "cylinder", args: [0.18, 0.2, 1.2, 6], y: 2, color: "#4f8f45" },
  ],
};
const dune: PropKind = {
  id: "dune", count: 90, radius: 0, scale: [2, 5], color: "#e0b872",
  parts: [{ geo: "sphere", args: [2, 10, 6], y: -1.2, color: "#dcae63" }],
};
const pine: PropKind = {
  id: "pine", count: 260, radius: 0.6, scale: [0.8, 1.6], color: "#2d5a4a",
  parts: [
    { geo: "cylinder", args: [0.15, 0.22, 1.2, 6], y: 0.6, color: "#5a3f2a" },
    { geo: "cone", args: [1.3, 2.4, 7], y: 2, color: "#e8f3f5" },
    { geo: "cone", args: [0.95, 1.8, 7], y: 3.2, color: "#f4fbff" },
  ],
};
const ice: PropKind = {
  id: "ice", count: 140, radius: 0.6, scale: [0.7, 2], color: "#9fdcff",
  parts: [{ geo: "cone", args: [0.6, 3, 5], y: 1.5, color: "#a7e3ff", emissive: "#2a6f9a", opacity: 0.85 }],
};
const pillar: PropKind = {
  id: "pillar", count: 150, radius: 0.8, scale: [0.7, 1.4], color: "#777b88",
  parts: [{ geo: "box", args: [1.2, 5, 1.2], y: 2.5, color: "#8a8f9c" }],
};
const ruin: PropKind = {
  id: "ruin", count: 110, radius: 2.4, scale: [0.8, 1.5], color: "#5d6170",
  parts: [
    { geo: "box", args: [5, 3, 0.6], y: 1.5, color: "#6c7080" },
    { geo: "box", args: [0.6, 2, 3], y: 1, color: "#5b5f6e" },
  ],
};
const crate: PropKind = {
  id: "crate", count: 120, radius: 0.9, scale: [0.8, 1.3], color: "#8a6a3a",
  parts: [{ geo: "box", args: [1.3, 1.3, 1.3], y: 0.65, color: "#8e6d3e" }],
};
const lavaPool: PropKind = {
  id: "lava", count: 70, radius: 0, scale: [1.5, 4], color: "#ff4d00",
  parts: [{ geo: "cylinder", args: [1.5, 1.5, 0.05, 16], y: 0.03, color: "#ff5a00", emissive: "#ff3300" }],
};
const basalt: PropKind = {
  id: "basalt", count: 180, radius: 1, scale: [0.7, 2], color: "#2a1d1d",
  parts: [
    { geo: "octa", args: [1, 0], y: 0.8, color: "#2b2222" },
  ],
};
const crystal: PropKind = {
  id: "crystal", count: 60, radius: 0.5, scale: [0.6, 1.4], color: "#ff7a2a",
  parts: [{ geo: "octa", args: [0.5, 0], y: 1, color: "#ff7a2a", emissive: "#ff4400" }],
};

export const BATTLEFIELDS: BattlefieldDef[] = [
  {
    id: "plaine", name: "Plaine d'Émeraude", levels: [0, 10],
    description: "Prairies et forêts paisibles… en apparence.",
    ground: "#4d8a3c", groundAlt: "#3c7230", sky: "#9fd3ff", fogNear: 40, fogFar: 170,
    sun: "#fff4d6", sunIntensity: 2, ambient: ["#cfe8ff", "#3a5a2a", 1], accent: "#5cffb0",
    props: [tree, rock("#8d8a82"), bush],
  },
  {
    id: "desert", name: "Désert Écarlate", levels: [11, 20],
    description: "Sable brûlant, cactus et tempêtes de poussière.",
    ground: "#d9a660", groundAlt: "#c48b45", sky: "#f6c98c", fogNear: 30, fogFar: 150,
    sun: "#ffe0a8", sunIntensity: 2.4, ambient: ["#ffe6c0", "#8a5a2a", 0.9], accent: "#ffb347",
    props: [cactus, rock("#b0703f"), dune],
  },
  {
    id: "toundra", name: "Toundra de Givre", levels: [21, 30],
    description: "Blizzard permanent et pics de glace tranchants.",
    ground: "#e6eef5", groundAlt: "#c9d8e6", sky: "#c7d9ea", fogNear: 20, fogFar: 120,
    sun: "#e8f2ff", sunIntensity: 1.6, ambient: ["#e4f0ff", "#7d8fa3", 1.1], accent: "#7fd4ff",
    props: [pine, ice, rock("#9aa7b5", 100)],
  },
  {
    id: "ruines", name: "Cité en Ruines", levels: [31, 40],
    description: "Une ville abandonnée où rôdent des machines.",
    ground: "#5c5f66", groundAlt: "#4a4d54", sky: "#8c929e", fogNear: 25, fogFar: 130,
    sun: "#fff0dd", sunIntensity: 1.5, ambient: ["#c0c6d4", "#3a3c42", 0.9], accent: "#b0c4de",
    props: [pillar, ruin, crate],
  },
  {
    id: "volcan", name: "Volcan Noir", levels: [41, 50],
    description: "Rivières de lave et démons de feu. L'épreuve finale.",
    ground: "#2a2020", groundAlt: "#1c1414", sky: "#3a1410", fogNear: 20, fogFar: 110,
    sun: "#ff9a66", sunIntensity: 1.8, ambient: ["#ff8a5c", "#2a0a05", 0.8], accent: "#ff5a2a",
    props: [basalt, lavaPool, crystal],
  },
];

export const MAX_LEVEL = 50;

export const battlefieldForLevel = (level: number) =>
  BATTLEFIELDS.find((b) => level >= b.levels[0] && level <= b.levels[1]) ?? BATTLEFIELDS[0];
