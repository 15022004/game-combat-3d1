"use client";
import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import type { CharacterDef } from "@/data/characters";
import { battlefieldForLevel, MAX_LEVEL } from "@/data/battlefields";
import { monsterForLevel } from "@/data/monsters";
import { createBattle } from "@/lib/engine/engine";
import { getDifficulty } from "@/lib/engine/difficulty";
import type { BattleState } from "@/lib/engine/types";
import { createInput } from "@/lib/input";
import { upgradedHero, winLevel, type Progress } from "@/lib/progress";
import { generateWorld } from "@/lib/world/generate";
import { createExploreInput, createExploreState } from "@/lib/world/state";
import { Terrain } from "./world/Terrain";
import { Explorer } from "./world/Explorer";
import { MonsterRoamer } from "./world/MonsterRoamer";
import { Minimap } from "./world/Minimap";
import { ExploreControls } from "./world/ExploreControls";
import { Simulation } from "./Simulation";
import { HUD } from "./HUD";
import { Controls } from "./Controls";

const FONT = "Impact, 'Arial Black', system-ui, sans-serif";

type Phase = "explore" | "fight" | "won";

interface Props {
  level: number;
  heroBase: CharacterDef;
  progress: Progress;
  onProgress: (p: Progress) => void;
  onExit: () => void;
  onNextLevel: (level: number) => void;
}

/**
 * Un niveau du mode Aventure : on explore un grand champ de bataille à la recherche du monstre
 * (mini-carte + balise lumineuse), puis le combat se déroule sur place.
 */
export function AdventureScreen({ level, heroBase, progress, onProgress, onExit, onNextLevel }: Props) {
  const field = battlefieldForLevel(level);
  // Figés au début du niveau (la récompense ne change pas si la progression change entre-temps)
  const [setup] = useState(() => {
    const lm = monsterForLevel(level, progress.cleared.includes(level));
    const layout = generateWorld(field, level);
    return { lm, layout, hero: upgradedHero(heroBase, progress) };
  });
  const { lm, layout, hero } = setup;
  const monster = lm.def;

  const stateRef = useRef(createExploreState(layout.playerSpawn, layout.monsterSpawn));
  const exploreInput = useRef(createExploreInput());
  const fightInput = useRef(createInput());
  const battleRef = useRef<BattleState>(createBattle(hero, monster, { controlA: "player", difficulty: lm.difficulty }));
  const [phase, setPhase] = useState<Phase>("explore");
  const [frame, setFrame] = useState<{ x: number; z: number; angle: number } | null>(null);
  const [fightKey, setFightKey] = useState(0);
  const [earned, setEarned] = useState(0);
  const { active, progress: loading } = useProgress();

  const newFight = (gap: number) => {
    battleRef.current = createBattle(hero, monster, { controlA: "player", difficulty: lm.difficulty, startGap: gap });
    fightInput.current = createInput();
  };

  // Le monstre nous a trouvés (ou l'inverse) : le combat démarre à l'endroit exact de la rencontre
  const onEncounter = () => {
    const { player: p, monster: m } = stateRef.current;
    const dx = m.x - p.x;
    const dz = m.z - p.z;
    newFight(Math.hypot(dx, dz));
    setFrame({ x: (p.x + m.x) / 2, z: (p.z + m.z) / 2, angle: Math.atan2(-dz, dx) });
    setPhase("fight");
  };

  const claim = () => {
    onProgress(winLevel(progress, level, lm.reward));
    setEarned(lm.reward);
    setPhase("won");
  };

  const retry = () => {
    newFight(4);
    setFightKey((k) => k + 1);
  };

  const diff = getDifficulty(lm.difficulty);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100dvh", overflow: "hidden", background: field.sky }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 55, near: 0.1, far: 400, position: [layout.playerSpawn.x, 6, layout.playerSpawn.z + 8] }}
      >
        <Terrain field={field} layout={layout} getFollow={() => stateRef.current.player} />
        <Suspense fallback={null}>
          {phase === "explore" && (
            <>
              <Explorer hero={hero} layout={layout} stateRef={stateRef} inputRef={exploreInput} />
              <MonsterRoamer monster={monster} layout={layout} stateRef={stateRef} onEncounter={onEncounter} />
            </>
          )}
          {phase !== "explore" && frame && (
            <Simulation
              key={fightKey}
              a={hero}
              b={monster}
              battleRef={battleRef}
              inputRef={fightInput}
              frame={frame}
              showZone
            />
          )}
        </Suspense>
      </Canvas>

      {/* --- Exploration --- */}
      {phase === "explore" && (
        <>
          <ExploreControls inputRef={exploreInput} stateRef={stateRef} />
          <div style={{ position: "absolute", top: 12, left: 14, pointerEvents: "none", color: "#fff", textShadow: "2px 2px 0 #000" }}>
            <div style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 15, letterSpacing: 1, color: field.accent }}>{field.name}</div>
            <div style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 30, letterSpacing: 2, lineHeight: 1.05 }}>
              NIVEAU {level}{lm.isBoss && <span style={{ color: "#ff4d4d" }}> · BOSS</span>}
            </div>
            <div style={{ fontSize: 14, fontFamily: "system-ui", marginTop: 4 }}>
              Objectif : trouve et bats <b style={{ color: monster.color }}>{monster.name}</b>
            </div>
            <div style={{ fontSize: 14, fontFamily: "system-ui", marginTop: 2 }}>💰 {progress.money} · Récompense : {lm.reward}</div>
            <button onClick={onExit} style={{ ...smallBtn, marginTop: 8 }}>QUITTER</button>
          </div>
          <Minimap field={field} layout={layout} stateRef={stateRef} monsterColor={monster.color} />
          <div key={level} style={{ position: "absolute", top: "30%", left: 0, right: 0, textAlign: "center", pointerEvents: "none",
            fontFamily: FONT, fontStyle: "italic", color: "#fff", textShadow: "4px 4px 0 #000", animation: "introFade 3s both" }}>
            <div style={{ fontSize: 58, letterSpacing: 4 }}>NIVEAU {level}</div>
            <div style={{ fontSize: 24, letterSpacing: 2, color: field.accent }}>{field.name}</div>
          </div>
        </>
      )}

      {/* --- Combat --- */}
      {phase === "fight" && (
        <>
          <HUD
            key={fightKey}
            battleRef={battleRef}
            versus
            difficultyLabel={diff.label}
            tagB={`${lm.isBoss ? "BOSS · " : ""}NIV. ${level}`}
            topAction={{ label: "QUITTER", onClick: onExit }}
            endActions={(outcome) =>
              outcome === "win"
                ? [{ label: `RÉCUPÉRER ${lm.reward} 💰`, onClick: claim }]
                : [{ label: "RÉESSAYER", onClick: retry }, { label: "CARTE DES NIVEAUX", onClick: onExit }]
            }
          />
          <Controls key={`c${fightKey}`} inputRef={fightInput} battleRef={battleRef} color={hero.color} />
          <div key={`b${fightKey}`} style={{ position: "absolute", top: "38%", left: 0, right: 0, textAlign: "center", pointerEvents: "none",
            fontFamily: FONT, fontStyle: "italic", fontSize: 80, letterSpacing: 6, color: "#ff3b3b", textShadow: "5px 5px 0 #000",
            animation: "introFade 1.6s both" }}>
            COMBAT !
          </div>
        </>
      )}

      {/* --- Victoire --- */}
      {phase === "won" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 14, background: "rgba(0,0,0,0.55)", color: "#fff", textAlign: "center", padding: 20 }}>
          <div style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 54, letterSpacing: 3, color: field.accent, textShadow: "4px 4px 0 #000" }}>
            {level === MAX_LEVEL ? "CAMPAGNE TERMINÉE !" : `NIVEAU ${level} TERMINÉ !`}
          </div>
          <div style={{ fontSize: 18, fontFamily: "system-ui" }}>
            {monster.name} est vaincu{lm.isBoss ? " — boss abattu !" : "."}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 40, color: "#ffd23f", textShadow: "3px 3px 0 #000" }}>+{earned} 💰</div>
          <div style={{ fontSize: 15, fontFamily: "system-ui", opacity: 0.85 }}>Total : {progress.money} pièces</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            {level < MAX_LEVEL && <button onClick={() => onNextLevel(level + 1)} style={bigBtn}>NIVEAU SUIVANT</button>}
            <button onClick={onExit} style={bigBtn}>CARTE DES NIVEAUX</button>
          </div>
        </div>
      )}

      {active && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(7,8,15,0.88)", color: "#fff", gap: 10, fontFamily: FONT, fontStyle: "italic", letterSpacing: 2 }}>
          <div style={{ fontSize: 34, color: field.accent }}>{field.name}</div>
          <div style={{ fontSize: 16, fontStyle: "normal", fontFamily: "system-ui" }}>Chargement… {Math.round(loading)}%</div>
        </div>
      )}
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  pointerEvents: "auto", padding: "5px 12px", fontFamily: FONT, fontSize: 13, letterSpacing: 1, cursor: "pointer",
  color: "#fff", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.7)", transform: "skewX(-10deg)",
};
const bigBtn: React.CSSProperties = {
  padding: "12px 28px", fontFamily: FONT, fontSize: 22, letterSpacing: 2, cursor: "pointer", color: "#fff",
  background: "rgba(0,0,0,0.6)", border: "2px solid #fff", transform: "skewX(-10deg)",
};
