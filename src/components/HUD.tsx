"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import type { BattleState, FighterState } from "@/lib/engine/types";
import { fxBus } from "@/lib/fxBus";

interface HUDProps {
  battleRef: RefObject<BattleState>;
  onRestart?: () => void;
  onNextOpponent?: () => void;
  onChangeCharacter?: () => void;
  /** Boutons de fin de combat personnalisés (mode Aventure) */
  endActions?: (outcome: "win" | "lose" | "draw") => { label: string; onClick: () => void }[];
  /** Étiquette à côté du nom du combattant B (défaut : BOT · difficulté) */
  tagB?: string;
  /** Bouton sous le chrono (défaut : CHANGER DE PERSO) */
  topAction?: { label: string; onClick: () => void };
  /** Délai d'apparition de l'écran de fin (s) */
  endDelay?: number;
  /** Mode joueur contre bot : affiche "VOUS", "VICTOIRE" / "DÉFAITE" */
  versus: boolean;
  difficultyLabel: string;
}

const FONT = "Impact, 'Arial Black', system-ui, sans-serif";

/** Barre de vie / énergie d'un combattant (façon jeu de combat) */
function Panel({ f, side, tag }: { f: FighterState; side: "left" | "right"; tag: string }) {
  const hp = Math.max(0, (f.currentHp / f.maxHp) * 100);
  const energy = Math.min(100, f.energy);
  const right = side === "right";
  const slant = right ? "skewX(12deg)" : "skewX(-12deg)";
  const track: CSSProperties = {
    position: "relative",
    height: 22,
    background: "rgba(0,0,0,0.65)",
    border: "2px solid rgba(255,255,255,0.85)",
    transform: slant,
    overflow: "hidden",
    display: "flex",
    justifyContent: right ? "flex-end" : "flex-start",
  };
  const fill = (w: number, color: string, transition: string): CSSProperties => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    [right ? "right" : "left"]: 0,
    width: `${w}%`,
    background: color,
    transition,
  });

  return (
    <div style={{ width: "38%", textAlign: right ? "right" : "left" }}>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 26,
          letterSpacing: 2,
          textTransform: "uppercase",
          fontStyle: "italic",
          color: f.def.color,
          textShadow: "2px 2px 0 #000, 0 0 12px rgba(0,0,0,0.8)",
        }}
      >
        {f.def.name}
        <span style={{ fontSize: 13, marginLeft: 8, marginRight: 8, letterSpacing: 1, color: "#fff", opacity: 0.8, fontStyle: "normal" }}>
          {tag}
        </span>
      </div>
      <div style={track}>
        {/* Barre "fantôme" : montre les dégâts qui viennent d'être pris */}
        <div style={fill(hp, "#ffd166", "width 0.7s ease-out 0.35s")} />
        <div style={fill(hp, `linear-gradient(90deg, ${f.def.color}, #fff6)`, "width 0.12s linear")} />
      </div>
      <div style={{ ...track, height: 9, marginTop: 5, width: "70%", marginLeft: right ? "auto" : 0 }}>
        <div
          style={fill(
            energy,
            energy >= 50 ? "linear-gradient(90deg,#ffe066,#fff)" : "#4b8bff",
            "width 0.15s linear"
          )}
        />
      </div>
    </div>
  );
}

export function HUD({
  battleRef, onRestart, onNextOpponent, onChangeCharacter, endActions, topAction, endDelay = 2.4, versus, difficultyLabel, tagB,
}: HUDProps) {
  // Copie de l'état du combat rafraîchie 20 fois par seconde (on ne lit jamais la ref pendant le rendu)
  const [snap, setSnap] = useState<BattleState | null>(null);
  const [combo, setCombo] = useState<{ side: "left" | "right"; n: number; color: string; key: number } | null>(null);
  const layer = useRef<HTMLDivElement>(null);
  const flashEl = useRef<HTMLDivElement>(null);
  const linesEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setSnap(battleRef.current), 50);
    return () => clearInterval(id);
  }, [battleRef]);

  // Effets 2D déclenchés par les événements du combat (textes flottants, flash, lignes de vitesse)
  useEffect(() => {
    let comboTimer: ReturnType<typeof setTimeout> | undefined;

    const pop = (text: string, sx: number, sy: number, color: string, size: number, rise = 160) => {
      const host = layer.current;
      if (!host) return;
      const el = document.createElement("div");
      el.textContent = text;
      Object.assign(el.style, {
        position: "absolute",
        left: `${sx}%`,
        top: `${sy}%`,
        fontFamily: FONT,
        fontStyle: "italic",
        fontSize: `${size}px`,
        color,
        whiteSpace: "nowrap",
        textShadow: "3px 3px 0 #000, 0 0 10px rgba(0,0,0,0.9)",
        pointerEvents: "none",
      });
      host.appendChild(el);
      el.animate(
        [
          { transform: "translate(-50%,-50%) scale(0.3)", opacity: 0 },
          { transform: "translate(-50%,-70%) scale(1.3)", opacity: 1, offset: 0.18 },
          { transform: `translate(-50%,-${rise}%) scale(1)`, opacity: 0 },
        ],
        { duration: 950, easing: "ease-out" }
      ).onfinish = () => el.remove();
    };

    const banner = (text: string, color: string, size = 96, duration = 1100) => {
      const host = layer.current;
      if (!host) return;
      const el = document.createElement("div");
      el.textContent = text;
      Object.assign(el.style, {
        position: "absolute",
        left: "50%",
        top: "34%",
        fontFamily: FONT,
        fontStyle: "italic",
        fontSize: `${size}px`,
        letterSpacing: "6px",
        color,
        whiteSpace: "nowrap",
        textShadow: "5px 5px 0 #000, 0 0 30px rgba(0,0,0,0.9)",
        pointerEvents: "none",
      });
      host.appendChild(el);
      el.animate(
        [
          { transform: "translate(-50%,-50%) scale(2.6) skewX(-10deg)", opacity: 0 },
          { transform: "translate(-50%,-50%) scale(1) skewX(-10deg)", opacity: 1, offset: 0.12 },
          { transform: "translate(-50%,-50%) scale(1.06) skewX(-10deg)", opacity: 1, offset: 0.8 },
          { transform: "translate(-50%,-50%) scale(1.15) skewX(-10deg)", opacity: 0 },
        ],
        { duration, easing: "ease-out" }
      ).onfinish = () => el.remove();
    };

    const flash = (opacity: number, ms: number) => {
      flashEl.current?.animate([{ opacity }, { opacity: 0 }], { duration: ms, easing: "ease-out" });
    };
    const lines = (opacity: number, ms: number) => {
      linesEl.current?.animate(
        [
          { opacity: 0, transform: "scale(1.4) rotate(0deg)" },
          { opacity, transform: "scale(1.1) rotate(2deg)", offset: 0.2 },
          { opacity: 0, transform: "scale(1) rotate(4deg)" },
        ],
        { duration: ms, easing: "ease-out" }
      );
    };

    const off = fxBus.on(({ e, sx, sy }) => {
      const b = battleRef.current;
      const attacker = [b.fighterA, b.fighterB].find((f) => f.def.id === e.attackerId);
      const color = attacker?.def.color ?? "#fff";
      const side = attacker === b.fighterA ? "left" : "right";

      switch (e.type) {
        case "hit":
          pop(`${e.damage}`, sx, sy, e.isCritical ? "#ffe066" : "#ffffff", e.isCritical ? 64 : 42);
          if (e.isCritical) pop("CRITIQUE !", sx, sy - 9, "#ff5a5a", 34);
          if (e.power === "heavy") flash(0.25, 180);
          if ((e.combo ?? 0) >= 2 || e.power === "heavy") {
            setCombo({ side, n: e.combo ?? 1, color, key: Date.now() });
            clearTimeout(comboTimer);
            comboTimer = setTimeout(() => setCombo(null), 1700);
          }
          break;
        case "special":
          pop(`${e.damage}`, sx, sy, color, e.power === "ultimate" ? 84 : 58, 190);
          flash(e.power === "ultimate" ? 0.65 : 0.3, e.power === "ultimate" ? 320 : 200);
          if (e.power === "ultimate") lines(0.7, 600);
          break;
        case "move":
          if (e.label) pop(e.label, sx, sy - 14, color, 24, 110);
          break;
        case "charge":
          banner(e.label ? `${e.label.toUpperCase()} !` : "SPÉCIAL !", color, 72, 1000);
          lines(0.85, 950);
          break;
        case "dash":
          if (e.power === "heavy") lines(0.5, 450);
          break;
        case "blocked":
          pop("BLOQUÉ", sx, sy, "#9fd8ff", 34, 130);
          break;
        case "dodged":
          pop("ESQUIVE", sx, sy, "#ffffff", 34, 130);
          break;
        case "ko":
          flash(0.95, 700);
          lines(0.9, 1200);
          banner("K.O. !", "#ff3b3b", 150, 2000);
          break;
      }
    });
    return () => {
      off();
      clearTimeout(comboTimer);
    };
  }, [battleRef]);

  if (!snap) return null;

  const { fighterA, fighterB } = snap;
  const winner = [fighterA, fighterB].find((f) => f.def.id === snap.winnerId);
  const low = snap.timeRemaining <= 10;
  const endText = !winner
    ? "ÉGALITÉ"
    : versus
      ? winner === fighterA ? "VICTOIRE !" : "DÉFAITE…"
      : `VICTOIRE DE ${winner.def.name.toUpperCase()}`;
  const endColor = !winner ? "#fff" : versus && winner !== fighterA ? "#ff4d4d" : winner.def.color;
  const botTag = tagB ?? `BOT · ${difficultyLabel.toUpperCase()}`;
  const outcome = !winner ? "draw" : winner === fighterA ? "win" : "lose";

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", color: "#fff", overflow: "hidden" }}>
      {/* Lignes de vitesse (spécial, K.O.) et flash blanc (impacts) */}
      <div
        ref={linesEl}
        style={{
          position: "absolute",
          inset: "-20%",
          opacity: 0,
          background:
            "repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg 3.2deg, rgba(255,255,255,0.75) 3.2deg 3.9deg, transparent 3.9deg 7.4deg)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, transparent 32%, #000 78%)",
          maskImage: "radial-gradient(circle at 50% 50%, transparent 32%, #000 78%)",
        }}
      />
      <div ref={flashEl} style={{ position: "absolute", inset: 0, opacity: 0, background: "#fff" }} />

      {/* Barres de vie + chrono */}
      <div style={{ position: "absolute", left: 24, right: 24, top: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Panel f={fighterA} side="left" tag={versus ? "VOUS" : "BOT"} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 46,
              lineHeight: 1,
              marginTop: 6,
              color: low ? "#ff5a5a" : "#fff",
              textShadow: "3px 3px 0 #000",
            }}
          >
            {Math.ceil(snap.timeRemaining)}
          </div>
          {(topAction || onChangeCharacter) && (
            <button onClick={topAction?.onClick ?? onChangeCharacter} style={smallBtn}>
              {topAction?.label ?? "CHANGER DE PERSO"}
            </button>
          )}
        </div>
        <Panel f={fighterB} side="right" tag={botTag} />
      </div>

      {/* Compteur de combo */}
      {combo && (
        <div
          key={combo.key}
          style={{
            position: "absolute",
            top: 120,
            [combo.side]: 28,
            fontFamily: FONT,
            fontStyle: "italic",
            fontSize: 54,
            color: combo.color,
            textShadow: "3px 3px 0 #000",
            animation: "hudFade 0.15s both",
          }}
        >
          {combo.n} {combo.n > 1 ? "HITS" : "HIT"}
        </div>
      )}

      {/* Textes flottants (dégâts, bannières) */}
      <div ref={layer} style={{ position: "absolute", inset: 0 }} />

      {/* Écran de fin (apparaît après le ralenti du K.O.) */}
      {snap.isFinished && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 70,
            textAlign: "center",
            pointerEvents: "auto",
            animation: `hudFade 0.7s ${endDelay}s both`,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontStyle: "italic",
              fontSize: 64,
              letterSpacing: 4,
              color: endColor,
              textShadow: "4px 4px 0 #000, 0 0 30px rgba(0,0,0,0.8)",
            }}
          >
            {endText}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
            {(endActions?.(outcome) ?? [
              { label: "REJOUER", onClick: onRestart },
              { label: "NOUVEL ADVERSAIRE", onClick: onNextOpponent },
              { label: "CHANGER DE PERSO", onClick: onChangeCharacter },
            ]).map((a) => (
              <button key={a.label} onClick={a.onClick} style={endBtn}>{a.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const endBtn: CSSProperties = {
  padding: "12px 26px",
  fontFamily: FONT,
  fontSize: 20,
  letterSpacing: 2,
  cursor: "pointer",
  color: "#fff",
  background: "rgba(0,0,0,0.6)",
  border: "2px solid #fff",
  transform: "skewX(-10deg)",
};

const smallBtn: CSSProperties = {
  pointerEvents: "auto",
  padding: "4px 10px",
  fontFamily: FONT,
  fontSize: 12,
  letterSpacing: 1,
  cursor: "pointer",
  color: "#fff",
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(255,255,255,0.7)",
  transform: "skewX(-10deg)",
  whiteSpace: "nowrap",
};
