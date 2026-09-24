"use client";
import { useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import Arena from "./Arena";
import { HUD } from "./HUD";
import { Simulation } from "./Simulation";
import { Controls } from "./Controls";
import { CharacterSelect } from "./CharacterSelect";
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

/**
 * Le jeu : écran de sélection (la première fois, ou sur demande) puis l'arène.
 * Chargé uniquement côté navigateur (voir app/battle/page.tsx) : on peut lire localStorage.
 */
export default function Game() {
  const [settings, setSettings] = useState<GameSettings | null>(() => loadSettings());
  const [match, setMatch] = useState<Match | null>(() => (settings ? newMatch(settings) : null));
  const [selecting, setSelecting] = useState(() => settings === null);

  if (selecting || !match || !settings) {
    return (
      <CharacterSelect
        initial={settings}
        onCancel={settings && match ? () => setSelecting(false) : undefined}
        onConfirm={(s) => {
          saveSettings(s);
          setSettings(s);
          setMatch(newMatch(s));
          setSelecting(false);
        }}
      />
    );
  }

  return (
    <BattleScreen
      key={match.key}
      match={match}
      onNextOpponent={() => setMatch(newMatch(settings, match.b.id))}
      onChangeCharacter={() => setSelecting(true)}
    />
  );
}

function BattleScreen({
  match,
  onNextOpponent,
  onChangeCharacter,
}: {
  match: Match;
  onNextOpponent: () => void;
  onChangeCharacter: () => void;
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
