# Battle Arena

Jeu de combat 3D dans le navigateur (Next.js + React Three Fiber).

```bash
npm install
npm run dev   # http://localhost:3000
```

## Le jeu

- **Première visite** : écran de sélection (personnage, adversaire, mode, difficulté). Les choix sont
  mémorisés dans le navigateur ; ensuite on arrive directement dans l'arène. Le bouton
  **CHANGER DE PERSO** (en haut, et à la fin du combat) ramène à la sélection.
- **Modes** : joueur contre bot, ou spectateur (bot contre bot).
- **5 difficultés** : Très facile, Facile, Normal, Difficile, Légende (`src/lib/engine/difficulty.ts`).
- **Mouvements aléatoires** : chaque bouton tire un mouvement au hasard dans sa catégorie
  (`src/lib/engine/moves.ts`) — poings (Direct, Rafale, Genou volant), pieds (Salto frappé, Vrille,
  Coup de pied sauté), spéciaux (Danse du cyclone, Tornade inversée, Boule de feu).

## Commandes

| Action | Clavier | Écran tactile |
| --- | --- | --- |
| Avancer / reculer | D / Q (AZERTY) ou flèches | ▶ / ◀ |
| Garde (maintenir) | S ou ↓ | GARDE |
| Poing / Pied / Spécial | J / K / L | POING / PIED / SPÉCIAL |
| Esquive / Dash | Espace / Maj | ESQUIVE / DASH |

Le spécial coûte 50 d'énergie (barre sous la vie).

## Personnages et animations

- Personnages : `src/data/characters.ts` (stats, couleur, style de l'IA, `scale`).
- Toutes les animations viennent d'une bibliothèque commune : `public/models/anims.glb`
  (générée par `scripts/build-anims.mjs`), adaptée à chaque squelette par `src/lib/prepareModel.ts`.
- Les modèles de `public/models` ont été allégés (`scripts/optimize-models.mjs`) : mesh + squelette
  seulement, textures en WebP 1024 px.
