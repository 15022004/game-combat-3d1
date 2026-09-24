export type FighterStyle = "aggressive" | "defensive" | "balanced";

export interface CharacterStats {
  hp: number; // Points de vie
  attack: number; // Puissance des coups de poing / pied
  defense: number; // Réduit les dégâts reçus (defense * 0.3)
  special: number; // Puissance des attaques spéciales (x1.5 dans le moteur)
  speed: number; // Vitesse de déplacement (speed / 20 unités par seconde)
}

export interface CharacterDef {
  id: string;
  name: string;
  model: string; // Chemin du fichier .glb dans /public
  style: FighterStyle; // Style utilisé par l'IA (voir lib/engine/ai.ts)
  color: string; // Couleur de l'aura et des effets (hex)
  /** Mise à l'échelle du modèle (certains .glb ne sont pas exportés à taille humaine) */
  scale?: number;
  /** Teinte appliquée au modèle (utilisée pour les monstres) */
  tint?: string;
  tagline: string; // Petite phrase affichée dans l'écran de sélection
  stats: CharacterStats;
}

/**
 * Tous les personnages partagent la même bibliothèque d'animations (public/models/anims.glb),
 * donc chacun peut faire tous les mouvements (voir lib/engine/moves.ts).
 */
export const CHARACTERS: CharacterDef[] = [
  {
    id: "kairo",
    name: "Kairo",
    model: "/models/kairo.glb",
    style: "aggressive",
    color: "#ff5a2a",
    tagline: "Fonce toujours, ne recule jamais.",
    stats: { hp: 300, attack: 22, defense: 10, special: 30, speed: 70 },
  },
  {
    id: "razen",
    name: "Razen",
    model: "/models/razen.glb",
    style: "defensive",
    color: "#3ec5ff",
    tagline: "Une garde de fer, des contres glacials.",
    stats: { hp: 320, attack: 20, defense: 20, special: 28, speed: 60 },
  },
  {
    id: "ely",
    name: "Ely",
    model: "/models/Ely.glb",
    style: "balanced",
    color: "#c77dff",
    tagline: "Technique pure, aucun coup gaspillé.",
    stats: { hp: 290, attack: 21, defense: 14, special: 31, speed: 76 },
  },
  {
    id: "erika",
    name: "Erika",
    model: "/models/Erika.glb",
    style: "aggressive",
    color: "#ff4d8d",
    tagline: "Rapide, précise, sans pitié.",
    stats: { hp: 280, attack: 24, defense: 10, special: 32, speed: 80 },
  },
  {
    id: "eve",
    name: "Eve",
    model: "/models/Eve.glb",
    style: "balanced",
    color: "#5cffb0",
    tagline: "Petite, insaisissable, redoutable.",
    stats: { hp: 260, attack: 19, defense: 12, special: 31, speed: 90 },
  },
  {
    id: "maria",
    name: "Maria",
    model: "/models/Maria.glb",
    style: "defensive",
    color: "#ffd23f",
    tagline: "Patiente comme une lame au fourreau.",
    stats: { hp: 310, attack: 20, defense: 18, special: 29, speed: 65 },
  },
  {
    id: "maw",
    name: "Maw",
    model: "/models/Maw.glb",
    style: "aggressive",
    color: "#8aff3c",
    tagline: "Une montagne de muscles affamée.",
    stats: { hp: 380, attack: 27, defense: 22, special: 34, speed: 45 },
  },
  {
    id: "media",
    name: "Media",
    model: "/models/Media.glb",
    style: "balanced",
    color: "#f4a261",
    scale: 10.5, // le modèle d'origine ne mesure que 17 cm
    tagline: "Calme en apparence, tempête au contact.",
    stats: { hp: 300, attack: 21, defense: 15, special: 30, speed: 70 },
  },
  {
    id: "mutant",
    name: "Mutant",
    model: "/models/Mutant.glb",
    style: "aggressive",
    color: "#e63946",
    tagline: "Force brute, rage incontrôlable.",
    stats: { hp: 360, attack: 28, defense: 16, special: 33, speed: 55 },
  },
];

export const getCharacter = (id: string | null | undefined) => CHARACTERS.find((c) => c.id === id);
