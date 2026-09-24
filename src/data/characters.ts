export type FighterStyle = "aggressive" | "defensive" | "balanced";

export interface CharacterStats {
  hp: number; // Points de vie
  attack: number; // Puissance de l'attaque normale
  defense: number; // Réduit les dégâts reçus (defense * 0.3)
  special: number; // Puissance de l'attaque spéciale (x1.5 dans le moteur)
  speed: number; // Vitesse de déplacement (speed / 20 unités par seconde)
}

export interface CharacterDef {
  id: string;
  name: string;
  model: string; // Chemin du fichier .glb dans /public
  style: FighterStyle; // Style utilisé par l'IA (voir lib/engine/ai.ts)
  stats: CharacterStats;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "kairo",
    name: "Kairo",
    model: "/models/kairo.glb",
    style: "aggressive",
    stats: { hp: 200, attack: 22, defense: 10, special: 30, speed: 70 },
  },
  {
    id: "razen",
    name: "Razen",
    model: "/models/razen.glb",
    style: "defensive",
    stats: { hp: 220, attack: 18, defense: 20, special: 28, speed: 60 },
  },
];
