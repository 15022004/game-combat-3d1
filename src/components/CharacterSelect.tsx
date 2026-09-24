"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import { CHARACTERS, getCharacter, type CharacterDef } from "@/data/characters";
import { DIFFICULTIES, type DifficultyId } from "@/lib/engine/difficulty";
import type { GameMode, GameSettings } from "@/lib/settings";
import { CharacterPreview } from "./CharacterPreview";

const FONT = "Impact, 'Arial Black', system-ui, sans-serif";
const STYLE_LABEL = { aggressive: "Agressif", defensive: "Défensif", balanced: "Équilibré" } as const;
const STAT_LABEL = [
  ["hp", "Vie", 400],
  ["attack", "Attaque", 30],
  ["defense", "Défense", 25],
  ["special", "Spécial", 36],
  ["speed", "Vitesse", 95],
] as const;

interface Props {
  initial: GameSettings | null;
  onConfirm: (s: GameSettings) => void;
  onCancel?: () => void;
}

export function CharacterSelect({ initial, onConfirm, onCancel }: Props) {
  const [playerId, setPlayerId] = useState(initial?.playerId ?? CHARACTERS[0].id);
  const [opponentId, setOpponentId] = useState<string>(initial?.opponentId ?? "random");
  const [difficulty, setDifficulty] = useState<DifficultyId>(initial?.difficulty ?? "normal");
  const [mode, setMode] = useState<GameMode>(initial?.mode ?? "versus");
  const player = getCharacter(playerId) ?? CHARACTERS[0];
  const diff = DIFFICULTIES.find((d) => d.id === difficulty)!;
  const opponent = opponentId === playerId ? "random" : opponentId;

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-[#07080f] text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row">
        {/* Colonne gauche : aperçu 3D du perso choisi */}
        <section className="flex flex-col lg:w-[42%]">
          <h1 style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 40, letterSpacing: 2, lineHeight: 1 }}>
            {initial ? "Changer de combattant" : "Choisis ton combattant"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Ton choix est mémorisé : la prochaine fois, tu arrives directement dans l&apos;arène.
          </p>
          <div
            className="relative mt-4 aspect-[4/5] w-full overflow-hidden"
            style={{ background: `radial-gradient(circle at 50% 40%, ${player.color}33, transparent 65%)`, border: `2px solid ${player.color}66` }}
          >
            <CharacterPreview def={player} />
            <div className="pointer-events-none absolute left-4 top-3">
              <div style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 44, color: player.color, textShadow: "3px 3px 0 #000" }}>
                {player.name}
              </div>
              <div className="text-sm text-zinc-300">{STYLE_LABEL[player.style]} · {player.tagline}</div>
            </div>
          </div>
          <Stats def={player} />
        </section>

        {/* Colonne droite : grille, adversaire, difficulté, mode */}
        <section className="flex flex-1 flex-col gap-6">
          <div>
            <Heading>Personnage</Heading>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {CHARACTERS.map((c) => (
                <Card key={c.id} def={c} active={c.id === playerId} onClick={() => setPlayerId(c.id)} />
              ))}
            </div>
          </div>

          <div>
            <Heading>Mode</Heading>
            <div className="flex flex-wrap gap-2">
              <Chip active={mode === "versus"} onClick={() => setMode("versus")}>Je joue contre un bot</Chip>
              <Chip active={mode === "spectator"} onClick={() => setMode("spectator")}>Spectateur (bot contre bot)</Chip>
            </div>
          </div>

          <div>
            <Heading>Adversaire</Heading>
            <div className="flex flex-wrap gap-2">
              <Chip active={opponent === "random"} onClick={() => setOpponentId("random")}>Aléatoire</Chip>
              {CHARACTERS.filter((c) => c.id !== playerId).map((c) => (
                <Chip key={c.id} active={opponent === c.id} color={c.color} onClick={() => setOpponentId(c.id)}>
                  {c.name}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <Heading>Difficulté du bot</Heading>
            <div className="grid grid-cols-5 gap-1">
              {DIFFICULTIES.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  style={{
                    fontFamily: FONT, fontStyle: "italic", fontSize: 15, letterSpacing: 1, padding: "10px 4px",
                    cursor: "pointer", color: d.id === difficulty ? "#07080f" : "#fff",
                    background: d.id === difficulty ? DIFF_COLORS[i] : "rgba(255,255,255,0.06)",
                    border: `2px solid ${DIFF_COLORS[i]}`, transform: "skewX(-8deg)",
                  }}
                >
                  {d.label}
                  <div style={{ marginTop: 4, letterSpacing: 2, fontSize: 11 }}>{"★".repeat(i + 1)}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-zinc-400">{diff.description}</p>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-3 pb-4">
            <button
              type="button"
              onClick={() => onConfirm({ playerId, opponentId: opponent, difficulty, mode })}
              style={{ ...bigBtn, background: player.color, color: "#07080f", borderColor: player.color }}
            >
              COMBATTRE
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel} style={bigBtn}>
                RETOUR
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const DIFF_COLORS = ["#5cffb0", "#a8e05f", "#ffd23f", "#ff8c42", "#ff3b3b"];

const bigBtn: CSSProperties = {
  fontFamily: FONT, fontStyle: "italic", fontSize: 26, letterSpacing: 3, padding: "12px 38px",
  cursor: "pointer", color: "#fff", background: "transparent", border: "3px solid #fff", transform: "skewX(-10deg)",
};

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-sm font-semibold text-zinc-300">{children}</h2>;
}

function Card({ def, active, onClick }: { def: CharacterDef; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-20 flex-col justify-end overflow-hidden p-2 text-left transition-transform hover:-translate-y-0.5"
      style={{
        background: active ? `linear-gradient(160deg, ${def.color}, ${def.color}33)` : `linear-gradient(160deg, ${def.color}33, #10111c)`,
        border: `2px solid ${active ? "#fff" : def.color + "88"}`,
        boxShadow: active ? `0 0 18px ${def.color}88` : "none",
        cursor: "pointer",
      }}
    >
      <span style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 22, letterSpacing: 1, textShadow: "2px 2px 0 #000" }}>
        {def.name}
      </span>
      <span className="text-[11px] text-zinc-200/80">{STYLE_LABEL[def.style]}</span>
    </button>
  );
}

function Chip({ children, active, color = "#ffffff", onClick }: { children: React.ReactNode; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 text-sm"
      style={{
        cursor: "pointer", border: `1px solid ${active ? color : "rgba(255,255,255,0.25)"}`,
        background: active ? `${color}33` : "transparent", color: "#fff",
      }}
    >
      {children}
    </button>
  );
}

function Stats({ def }: { def: CharacterDef }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-1.5">
      {STAT_LABEL.map(([key, label, max]) => (
        <div key={key} className="flex items-center gap-3 text-sm">
          <span className="w-16 text-zinc-400">{label}</span>
          <div className="h-2 flex-1 bg-white/10">
            <div style={{ width: `${Math.min(100, (def.stats[key] / max) * 100)}%`, height: "100%", background: def.color }} />
          </div>
          <span className="w-8 text-right tabular-nums text-zinc-300">{def.stats[key]}</span>
        </div>
      ))}
    </div>
  );
}
