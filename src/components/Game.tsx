"use client";
import { useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import Arena from "./Arena";
import { HUD } from "./HUD";
import { Simulation } from "./Simulation";
import { Controls } from "./Controls";
import { CharacterSelect } from "./CharacterSelect";
import { AdventureMenu } from "./AdventureMenu";
import { AdventureScreen } from "./AdventureScreen";
import { loadProgress, saveProgress, type Progress } from "@/lib/progress";
import { CHARACTERS, getCharacter, type CharacterDef } from "@/data/characters";
import { createBattle } from "@/lib/engine/engine";
import { getDifficulty } from "@/lib/engine/difficulty";
import type { BattleState } from "@/lib/engine/types";
import { createInput } from "@/lib/input";
import { loadSettings, pickOpponent, saveSettings, type GameSettings } from "@/lib/settings";

interface Match {
  key: number;
  a: CharacterDef;
  b: CharacterDef;
  settings: GameSettings;
}

let matchCounter = 0;
function newMatch(s: GameSettings, previousOpponent?: string): Match {
  const a = getCharacter(s.playerId) ?? CHARACTERS[0];
  return { key: ++matchCounter, a, b: pickOpponent(s, previousOpponent), settings: s };
}

const battleFor = (m: Match) =>
  createBattle(m.a, m.b, {
    controlA: m.settings.mode === "versus" ? "player" : "bot",
    difficulty: m.settings.difficulty,
  });

type Screen =
  | { name: "hero" } // choix du héros (première visite ou changement)
  | { name: "menu" } // accueil du mode Aventure
  | { name: "level"; level: number; key: number } // exploration + combat d'un niveau
  | { name: "quickSetup" } // réglages du combat rapide
  | { name: "quick" }; // combat rapide

const DEFAULT_SETTINGS = (playerId: string): GameSettings => ({ playerId, opponentId: "random", difficulty: "normal", mode: "versus" });

/**
 * Le jeu : choix du héros (la première fois), menu Aventure (niveaux 0 à 50), exploration des
 * champs de bataille, et le combat rapide d'origine.
 * Chargé uniquement côté navigateur (voir app/battle/page.tsx) : on peut lire localStorage.
 */
export default function Game() {
  const [settings, setSettings] = useState<GameSettings | null>(() => loadSettings());
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>(() => (settings ? { name: "menu" } : { name: "hero" }));
  const [match, setMatch] = useState<Match | null>(null);

  const updateProgress = (p: Progress) => {
    saveProgress(p);
    setProgress(p);
  };
  const updateSettings = (s: GameSettings) => {
    saveSettings(s);
    setSettings(s);
  };
  const hero = getCharacter(settings?.playerId) ?? CHARACTERS[0];

  if (screen.name === "hero" || !settings) {
    return (
      <CharacterSelect
        heroOnly
        initial={settings}
        onCancel={settings ? () => setScreen({ name: "menu" }) : undefined}
        onConfirm={(s) => {
          updateSettings({ ...(settings ?? DEFAULT_SETTINGS(s.playerId)), playerId: s.playerId });
          setScreen({ name: "menu" });
        }}
      />
    );
  }

  if (screen.name === "level") {
    return (
      <AdventureScreen
        key={screen.key}
        level={screen.level}
        heroBase={hero}
        progress={progress}
        onProgress={updateProgress}
        onExit={() => setScreen({ name: "menu" })}
        onNextLevel={(level) => setScreen({ name: "level", level, key: Date.now() })}
      />
    );
  }

  if (screen.name === "quickSetup" || (screen.name === "quick" && !match)) {
    return (
      <CharacterSelect
        initial={settings}
        onCancel={() => setScreen({ name: "menu" })}
        onConfirm={(s) => {
          updateSettings(s);
          setMatch(newMatch(s));
          setScreen({ name: "quick" });
        }}
      />
    );
  }

  if (screen.name === "quick" && match) {
    return (
      <BattleScreen
        key={match.key}
        match={match}
        onNextOpponent={() => setMatch(newMatch(settings, match.b.id))}
        onChangeCharacter={() => setScreen({ name: "quickSetup" })}
        onMenu={() => setScreen({ name: "menu" })}
      />
    );
  }

  return (
    <AdventureMenu
      hero={hero}
      progress={progress}
      onProgress={updateProgress}
      onPlay={(level) => setScreen({ name: "level", level, key: Date.now() })}
      onChangeHero={() => setScreen({ name: "hero" })}
      onQuickFight={() => setScreen({ name: "quickSetup" })}
    />
  );
}

function BattleScreen({
  match,
  onNextOpponent,
  onChangeCharacter,
  onMenu,
}: {
  match: Match;
  onNextOpponent: () => void;
  onChangeCharacter: () => void;
  onMenu: () => void;
}) {
  const battleRef = useRef<BattleState>(battleFor(match));
  const inputRef = useRef(createInput());
  const versus = match.settings.mode === "versus";
  const { active, progress } = useProgress();

  return (
    <div style={{ position: "relative", width: "100vw", height: "100dvh", overflow: "hidden" }}>
      <Arena colorA={match.a.color} colorB={match.b.color}>
        <Simulation a={match.a} b={match.b} battleRef={battleRef} inputRef={versus ? inputRef : undefined} />
      </Arena>
      <HUD
        battleRef={battleRef}
        versus={versus}
        difficultyLabel={getDifficulty(match.settings.difficulty).label}
        onRestart={() => {
          battleRef.current = battleFor(match);
        }}
        onNextOpponent={onNextOpponent}
        onChangeCharacter={onChangeCharacter}
        topAction={{ label: "MENU", onClick: onMenu }}
      />
      {versus && <Controls inputRef={inputRef} battleRef={battleRef} color={match.a.color} />}
      {active && (
        <div
          style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", background: "rgba(7,8,15,0.85)", color: "#fff", gap: 12,
            fontFamily: "Impact, 'Arial Black', system-ui, sans-serif", fontStyle: "italic", letterSpacing: 2,
          }}
        >
          <div style={{ fontSize: 34 }}>
            <span style={{ color: match.a.color }}>{match.a.name}</span> VS{" "}
            <span style={{ color: match.b.color }}>{match.b.name}</span>
          </div>
          <div style={{ fontSize: 16, fontStyle: "normal", fontFamily: "system-ui" }}>Chargement… {Math.round(progress)}%</div>
        </div>
      )}
    </div>
  );
}
