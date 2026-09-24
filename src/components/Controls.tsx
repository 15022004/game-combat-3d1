"use client";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import type { BattleState } from "@/lib/engine/types";
import { press, type PlayerCommand, type PlayerInput } from "@/lib/input";
import { SPECIAL_COST } from "@/lib/engine/moves";

const FONT = "Impact, 'Arial Black', system-ui, sans-serif";

/**
 * Touches (e.code = position physique : marche aussi bien en AZERTY qu'en QWERTY)
 * - Q / A (selon clavier) ou ← : reculer      - D ou → : avancer
 * - S ou ↓ (maintenu) : garde                 - J : poing   K : pied   L : spécial
 * - Espace : esquive                          - Maj : dash
 */
const HOLD: Record<string, "left" | "right" | "block"> = {
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  ArrowDown: "block", KeyS: "block",
};
const TAP: Record<string, PlayerCommand> = {
  KeyJ: "punch", KeyK: "kick", KeyL: "special", KeyU: "special",
  Space: "dodge", ShiftLeft: "dash", ShiftRight: "dash",
};

interface ControlsProps {
  inputRef: RefObject<PlayerInput>;
  battleRef: RefObject<BattleState>;
  color: string;
}

export function Controls({ inputRef, battleRef, color }: ControlsProps) {
  const [ready, setReady] = useState({ special: false, attack: true, dodge: true, dash: true, over: false });
  // Taille des boutons adaptée aux petits écrans (téléphone en portrait)
  const [k, setK] = useState(() => Math.max(0.62, Math.min(1, window.innerWidth / 600)));

  useEffect(() => {
    const onResize = () => setK(Math.max(0.62, Math.min(1, window.innerWidth / 600)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Clavier
  useEffect(() => {
    const input = inputRef.current;
    const down = (e: KeyboardEvent) => {
      const hold = HOLD[e.code];
      const tap = TAP[e.code];
      if (!hold && !tap) return;
      e.preventDefault(); // évite le défilement de la page (espace, flèches)
      if (hold) input[hold] = true;
      if (tap && !e.repeat) press(input, tap);
    };
    const up = (e: KeyboardEvent) => {
      const hold = HOLD[e.code];
      if (hold) input[hold] = false;
    };
    const reset = () => {
      input.left = input.right = input.block = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
      reset();
    };
  }, [inputRef]);

  // État des boutons (énergie, cooldowns) rafraîchi 10 fois par seconde
  useEffect(() => {
    const id = setInterval(() => {
      const f = battleRef.current.fighterA;
      setReady({
        special: f.energy >= SPECIAL_COST && f.cooldowns.special <= 0,
        attack: f.cooldowns.attack <= 0,
        dodge: f.cooldowns.dodge <= 0,
        dash: f.cooldowns.dash <= 0,
        over: battleRef.current.isFinished,
      });
    }, 100);
    return () => clearInterval(id);
  }, [battleRef]);

  if (ready.over) return null;

  // Gestionnaires d'événements (la commande est lue dans data-hold / data-cmd du bouton)
  const onHoldDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const key = e.currentTarget.dataset.hold as "left" | "right" | "block";
    inputRef.current[key] = true;
  };
  const onHoldUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const key = e.currentTarget.dataset.hold as "left" | "right" | "block";
    inputRef.current[key] = false;
  };
  const onTap = (e: React.PointerEvent<HTMLButtonElement>) => {
    press(inputRef.current, e.currentTarget.dataset.cmd as PlayerCommand);
  };
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 12px 14px", display: "flex",
        justifyContent: "space-between", alignItems: "flex-end", pointerEvents: "none", userSelect: "none",
        WebkitUserSelect: "none", touchAction: "none" }}
    >
      {/* Déplacements + garde */}
      <div style={{ display: "flex", gap: 8 * k, alignItems: "flex-end" }}>
        <Btn size={68 * k} hint="Q / ←" data-hold="left" onPointerDown={onHoldDown} onPointerUp={onHoldUp} onPointerCancel={onHoldUp} onLostPointerCapture={onHoldUp}>◀</Btn>
        <Btn size={68 * k} hint="D / →" data-hold="right" onPointerDown={onHoldDown} onPointerUp={onHoldUp} onPointerCancel={onHoldUp} onLostPointerCapture={onHoldUp}>▶</Btn>
        <Btn size={62 * k} hint="S / ↓" tone="#9fd8ff" data-hold="block" onPointerDown={onHoldDown} onPointerUp={onHoldUp} onPointerCancel={onHoldUp} onLostPointerCapture={onHoldUp}>GARDE</Btn>
      </div>

      {/* Attaques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: 8 * k, alignItems: "end" }}>
        <Btn size={56 * k} hint="Espace" disabled={!ready.dodge} data-cmd="dodge" onPointerDown={onTap}>ESQUIVE</Btn>
        <Btn size={56 * k} hint="Maj" disabled={!ready.dash} data-cmd="dash" onPointerDown={onTap}>DASH</Btn>
        <Btn size={74 * k} hint="L" tone={color} glow={ready.special} disabled={!ready.special} data-cmd="special" onPointerDown={onTap}>SPÉCIAL</Btn>
        <Btn size={74 * k} hint="J" disabled={!ready.attack} data-cmd="punch" onPointerDown={onTap}>POING</Btn>
        <Btn size={74 * k} hint="K" disabled={!ready.attack} data-cmd="kick" onPointerDown={onTap}>PIED</Btn>
        <div />
      </div>
    </div>
  );
}

interface BtnProps {
  children: ReactNode;
  size: number;
  hint?: string;
  tone?: string;
  glow?: boolean;
  disabled?: boolean;
  "data-hold"?: string;
  "data-cmd"?: string;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onLostPointerCapture?: (e: React.PointerEvent<HTMLButtonElement>) => void;
}

function Btn({ children, size, hint, tone = "#ffffff", glow, disabled, ...handlers }: BtnProps) {
  const style: CSSProperties = {
    width: size, height: size, borderRadius: "50%", pointerEvents: "auto", cursor: "pointer",
    fontFamily: FONT, fontStyle: "italic", fontSize: size > 58 ? 15 : size > 46 ? 12 : 10, letterSpacing: 1,
    color: "#fff", background: glow ? `radial-gradient(circle, ${tone}cc, ${tone}44 70%)` : "rgba(0,0,0,0.55)",
    border: `3px solid ${tone}`, boxShadow: glow ? `0 0 22px ${tone}` : "0 4px 0 rgba(0,0,0,0.6)",
    opacity: disabled ? 0.45 : 1, transition: "opacity 0.1s, box-shadow 0.2s",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    textShadow: "2px 2px 0 #000", touchAction: "none",
  };
  return (
    <button type="button" style={style} {...handlers}>
      <span>{children}</span>
      {hint && <span style={{ fontSize: 10, fontStyle: "normal", opacity: 0.6, marginTop: 2, fontFamily: "system-ui" }}>{hint}</span>}
    </button>
  );
}
