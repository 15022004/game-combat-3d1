"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { CharacterDef } from "@/data/characters";
import { BATTLEFIELDS, MAX_LEVEL } from "@/data/battlefields";
import { monsterForLevel } from "@/data/monsters";
import { getDifficulty } from "@/lib/engine/difficulty";
import {
  MAX_UPGRADE, STAT_NAMES, upgradeCost, upgradedHero, emptyProgress, type Progress, type StatKey,
} from "@/lib/progress";
import { CharacterPreview } from "./CharacterPreview";

const FONT = "Impact, 'Arial Black', system-ui, sans-serif";

interface Props {
  hero: CharacterDef;
  progress: Progress;
  onProgress: (p: Progress) => void;
  onPlay: (level: number) => void;
  onChangeHero: () => void;
  onQuickFight: () => void;
}

/** Écran d'accueil du mode Aventure : niveaux 0 à 50, argent, améliorations */
export function AdventureMenu({ hero, progress, onProgress, onPlay, onChangeHero, onQuickFight }: Props) {
  const [selected, setSelected] = useState(() => Math.min(progress.unlocked, MAX_LEVEL));
  const [tab, setTab] = useState<"levels" | "shop">("levels");
  const lm = monsterForLevel(selected, progress.cleared.includes(selected));
  const up = upgradedHero(hero, progress);

  const buy = (k: StatKey) => {
    const lvl = progress.upgrades[k];
    const cost = upgradeCost(lvl);
    if (lvl >= MAX_UPGRADE || progress.money < cost) return;
    onProgress({ ...progress, money: progress.money - cost, upgrades: { ...progress.upgrades, [k]: lvl + 1 } });
  };

  const reset = () => {
    if (window.confirm("Effacer toute la progression (niveaux, pièces, améliorations) ?")) {
      onProgress(emptyProgress());
      setSelected(0);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-[#07080f] text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5">
        {/* En-tête : héros, argent, navigation */}
        <header className="flex flex-wrap items-center gap-4">
          <div className="h-24 w-20 shrink-0 overflow-hidden" style={{ border: `2px solid ${hero.color}88`, background: `${hero.color}22` }}>
            <CharacterPreview def={hero} />
          </div>
          <div className="flex-1">
            <div style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 38, letterSpacing: 2, lineHeight: 1 }}>Aventure</div>
            <div className="mt-1 text-sm text-zinc-300">
              Héros : <b style={{ color: hero.color }}>{hero.name}</b> · Niveau atteint : {progress.unlocked} / {MAX_LEVEL}
            </div>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 30, color: "#ffd23f", textShadow: "2px 2px 0 #000" }}>💰 {progress.money}</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onChangeHero} style={navBtn}>CHANGER DE HÉROS</button>
            <button onClick={onQuickFight} style={navBtn}>COMBAT RAPIDE</button>
          </div>
        </header>

        <div className="flex gap-2">
          <Tab active={tab === "levels"} onClick={() => setTab("levels")}>Niveaux</Tab>
          <Tab active={tab === "shop"} onClick={() => setTab("shop")}>Améliorations</Tab>
        </div>

        {tab === "levels" && (
          <div className="flex flex-col gap-5 lg:flex-row">
            {/* Champs de bataille et niveaux */}
            <div className="flex flex-1 flex-col gap-4">
              {BATTLEFIELDS.map((f) => {
                const locked = progress.unlocked < f.levels[0];
                return (
                  <section key={f.id} className="p-3" style={{ background: `linear-gradient(120deg, ${f.ground}55, ${f.sky}22)`, border: `1px solid ${f.accent}55`, opacity: locked ? 0.55 : 1 }}>
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <h2 style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 24, letterSpacing: 1, color: f.accent, textShadow: "2px 2px 0 #000" }}>{f.name}</h2>
                      <span className="text-xs text-zinc-300">Niveaux {f.levels[0]}–{f.levels[1]} · {f.description}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Array.from({ length: f.levels[1] - f.levels[0] + 1 }, (_, i) => f.levels[0] + i).map((lvl) => (
                        <LevelButton
                          key={lvl}
                          level={lvl}
                          locked={lvl > progress.unlocked}
                          cleared={progress.cleared.includes(lvl)}
                          current={lvl === progress.unlocked}
                          active={lvl === selected}
                          accent={f.accent}
                          onClick={() => setSelected(lvl)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Détail du niveau choisi */}
            <aside className="flex flex-col gap-3 p-4 lg:sticky lg:top-4 lg:w-80 lg:self-start" style={{ background: "#10121d", border: `2px solid ${lm.def.color}66` }}>
              <div style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 34, letterSpacing: 2 }}>
                NIVEAU {selected}{lm.isBoss && <span style={{ color: "#ff4d4d" }}> · BOSS</span>}
              </div>
              <div className="text-sm text-zinc-300">Monstre : <b style={{ color: lm.def.color }}>{lm.def.name}</b></div>
              <div className="grid grid-cols-2 gap-1 text-sm text-zinc-300">
                <span>Vie : {lm.def.stats.hp}</span>
                <span>Attaque : {lm.def.stats.attack}</span>
                <span>Défense : {lm.def.stats.defense}</span>
                <span>IA : {getDifficulty(lm.difficulty).label}</span>
              </div>
              <div className="text-sm">
                Récompense : <b className="text-[#ffd23f]">{lm.reward} 💰</b>
                {progress.cleared.includes(selected) && <span className="text-zinc-400"> (déjà gagné : 40%)</span>}
              </div>
              <div className="text-xs text-zinc-400">Ton héros : vie {up.stats.hp} · attaque {up.stats.attack} · défense {up.stats.defense}</div>
              <button
                onClick={() => onPlay(selected)}
                disabled={selected > progress.unlocked}
                style={{ ...playBtn, background: hero.color, opacity: selected > progress.unlocked ? 0.4 : 1 }}
              >
                {selected > progress.unlocked ? "VERROUILLÉ" : "JOUER"}
              </button>
            </aside>
          </div>
        )}

        {tab === "shop" && (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-zinc-400">
              Chaque amélioration ajoute 10% à la stat de base de {hero.name} (max {MAX_UPGRADE}). Les monstres deviennent
              beaucoup plus forts dans les derniers niveaux : améliore-toi régulièrement !
            </p>
            {(Object.keys(STAT_NAMES) as StatKey[]).map((k) => {
              const lvl = progress.upgrades[k];
              const cost = upgradeCost(lvl);
              const maxed = lvl >= MAX_UPGRADE;
              const can = !maxed && progress.money >= cost;
              return (
                <div key={k} className="flex flex-wrap items-center gap-3 p-3" style={{ background: "#10121d", border: "1px solid #ffffff22" }}>
                  <span className="w-20 font-semibold">{STAT_NAMES[k]}</span>
                  <span className="w-28 text-sm text-zinc-300">{hero.stats[k]} → <b style={{ color: hero.color }}>{up.stats[k]}</b></span>
                  <div className="flex flex-1 gap-0.5">
                    {Array.from({ length: MAX_UPGRADE }, (_, i) => (
                      <div key={i} className="h-3 flex-1" style={{ background: i < lvl ? hero.color : "#ffffff18" }} />
                    ))}
                  </div>
                  <button onClick={() => buy(k)} disabled={!can} style={{ ...navBtn, opacity: can ? 1 : 0.4, minWidth: 130 }}>
                    {maxed ? "MAX" : `+1 · ${cost} 💰`}
                  </button>
                </div>
              );
            })}
            <button onClick={reset} className="self-start text-xs text-zinc-500 underline">Réinitialiser la progression</button>
          </section>
        )}
      </div>
    </div>
  );
}

function LevelButton({ level, locked, cleared, current, active, accent, onClick }: {
  level: number; locked: boolean; cleared: boolean; current: boolean; active: boolean; accent: string; onClick: () => void;
}) {
  const boss = level > 0 && level % 10 === 0;
  return (
    <button
      onClick={onClick}
      title={boss ? "Boss" : undefined}
      style={{
        width: boss ? 58 : 44, height: 44, fontFamily: FONT, fontSize: 17, cursor: "pointer",
        color: locked ? "#777" : active ? "#07080f" : "#fff",
        background: active ? accent : cleared ? `${accent}33` : "rgba(0,0,0,0.45)",
        border: `2px solid ${current ? "#fff" : boss ? "#ff4d4d" : locked ? "#333" : accent + "99"}`,
        boxShadow: current ? `0 0 12px ${accent}` : "none", transform: "skewX(-8deg)",
      }}
    >
      {locked ? "🔒" : `${boss ? "👑" : ""}${level}${cleared ? "✓" : ""}`}
    </button>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="px-4 py-2 text-sm font-semibold"
      style={{ cursor: "pointer", borderBottom: `3px solid ${active ? "#fff" : "transparent"}`, color: active ? "#fff" : "#999" }}>
      {children}
    </button>
  );
}

const navBtn: CSSProperties = {
  padding: "8px 14px", fontFamily: FONT, fontSize: 14, letterSpacing: 1, cursor: "pointer", color: "#fff",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.6)", transform: "skewX(-8deg)",
};
const playBtn: CSSProperties = {
  marginTop: 6, padding: "12px", fontFamily: FONT, fontStyle: "italic", fontSize: 26, letterSpacing: 3,
  cursor: "pointer", color: "#07080f", border: "none", transform: "skewX(-8deg)",
};
