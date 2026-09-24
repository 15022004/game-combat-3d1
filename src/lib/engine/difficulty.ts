/** Les 5 niveaux de difficulté du bot */
export type DifficultyId = "tres-facile" | "facile" | "normal" | "difficile" | "legende";

export interface DifficultyDef {
  id: DifficultyId;
  label: string;
  description: string;
  /** Temps de réaction moyen (s) entre deux décisions */
  reaction: number;
  /** Probabilité d'attaquer quand il le peut */
  aggression: number;
  /** Probabilité de parer / esquiver une attaque qui arrive */
  defense: number;
  /** Envie d'utiliser une attaque spéciale quand l'énergie est pleine */
  special: number;
  /** Multiplicateur des dégâts infligés par le bot */
  damage: number;
  /** Probabilité de rester sans rien faire (hésitation) */
  hesitation: number;
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "tres-facile", label: "Très facile", description: "Lent, hésitant, ne se protège presque jamais.",
    reaction: 0.95, aggression: 0.35, defense: 0.08, special: 0.12, damage: 0.55, hesitation: 0.45,
  },
  {
    id: "facile", label: "Facile", description: "Réagit tard et frappe sans trop de conviction.",
    reaction: 0.62, aggression: 0.5, defense: 0.22, special: 0.22, damage: 0.75, hesitation: 0.28,
  },
  {
    id: "normal", label: "Normal", description: "Un vrai combat : il attaque et se défend.",
    reaction: 0.38, aggression: 0.68, defense: 0.42, special: 0.35, damage: 1, hesitation: 0.12,
  },
  {
    id: "difficile", label: "Difficile", description: "Réflexes rapides, pare souvent, punit les erreurs.",
    reaction: 0.2, aggression: 0.8, defense: 0.62, special: 0.5, damage: 1.15, hesitation: 0.05,
  },
  {
    id: "legende", label: "Légende", description: "Presque parfait. Bonne chance.",
    reaction: 0.08, aggression: 0.92, defense: 0.82, special: 0.7, damage: 1.35, hesitation: 0,
  },
];

export const getDifficulty = (id: string | null | undefined) =>
  DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[2];
