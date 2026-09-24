"use client";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ExploreInput, ExploreState } from "@/lib/world/state";

const FONT = "Impact, 'Arial Black', system-ui, sans-serif";

/**
 * Commandes d'exploration :
 * - Clavier : Z Q S D (AZERTY) / W A S D (QWERTY) ou ↑ ↓ pour marcher, ← → pour tourner la caméra,
 *   Maj pour courir.
 * - Souris / doigt : glisser sur l'écran pour tourner la caméra.
 * - Tactile : joystick en bas à gauche, bouton COURIR à droite.
 */
const KEYS: Record<string, keyof ExploreInput["keys"]> = {
  KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", KeyD: "r",
  ArrowLeft: "turnL", ArrowRight: "turnR",
};

export function ExploreControls({ inputRef, stateRef }: { inputRef: RefObject<ExploreInput>; stateRef: RefObject<ExploreState> }) {
  const [run, setRun] = useState(false);
  const knob = useRef<HTMLDivElement>(null);
  const joyId = useRef<number | null>(null);
  const joyCenter = useRef({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [k] = useState(() => Math.max(0.7, Math.min(1, window.innerWidth / 600)));

  useEffect(() => {
    const inp = inputRef.current;
    const down = (e: KeyboardEvent) => {
      const key = KEYS[e.code];
      if (key) { inp.keys[key] = true; e.preventDefault(); }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") inp.run = true;
    };
    const up = (e: KeyboardEvent) => {
      const key = KEYS[e.code];
      if (key) inp.keys[key] = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") inp.run = false;
    };
    const reset = () => {
      Object.keys(inp.keys).forEach((key) => { inp.keys[key as keyof ExploreInput["keys"]] = false; });
      inp.run = false;
      inp.joy.x = inp.joy.y = 0;
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

  // --- Glisser pour tourner la caméra
  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const s = stateRef.current;
    s.camYaw -= (e.clientX - d.x) * 0.006;
    s.camPitch = Math.max(0.08, Math.min(1.1, s.camPitch + (e.clientY - d.y) * 0.004));
    d.x = e.clientX;
    d.y = e.clientY;
  };
  const onDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  // --- Joystick
  const R = 55 * k;
  const onJoyStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    joyId.current = e.pointerId;
    const r = e.currentTarget.getBoundingClientRect();
    joyCenter.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    onJoyMove(e);
  };
  const onJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyId.current !== e.pointerId) return;
    let dx = e.clientX - joyCenter.current.x;
    let dy = e.clientY - joyCenter.current.y;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    inputRef.current.joy.x = dx / R;
    inputRef.current.joy.y = -dy / R;
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const onJoyEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyId.current !== e.pointerId) return;
    joyId.current = null;
    inputRef.current.joy.x = inputRef.current.joy.y = 0;
    if (knob.current) knob.current.style.transform = "translate(0px, 0px)";
  };

  const onRun = () => {
    const next = !run;
    setRun(next);
    inputRef.current.run = next;
  };

  return (
    <div
      onPointerDown={onDragStart}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      onContextMenu={(e) => e.preventDefault()}
      style={{ position: "absolute", inset: 0, touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
    >
      {/* Joystick */}
      <div
        onPointerDown={onJoyStart}
        onPointerMove={onJoyMove}
        onPointerUp={onJoyEnd}
        onPointerCancel={onJoyEnd}
        style={{ position: "absolute", left: 24, bottom: 24, width: R * 2 + 30, height: R * 2 + 30, borderRadius: "50%",
          background: "rgba(0,0,0,0.3)", border: "3px solid rgba(255,255,255,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", touchAction: "none" }}
      >
        <div ref={knob} style={{ width: 56 * k, height: 56 * k, borderRadius: "50%", background: "rgba(255,255,255,0.85)", boxShadow: "0 3px 0 rgba(0,0,0,0.5)" }} />
      </div>

      {/* Courir */}
      <button
        type="button"
        onPointerDown={(e) => { e.stopPropagation(); onRun(); }}
        style={{ position: "absolute", right: 28, bottom: 36, width: 86 * k, height: 86 * k, borderRadius: "50%",
          fontFamily: FONT, fontStyle: "italic", fontSize: 15, letterSpacing: 1, color: "#fff", cursor: "pointer",
          background: run ? "rgba(255,210,63,0.75)" : "rgba(0,0,0,0.5)", border: "3px solid #ffd23f",
          textShadow: "2px 2px 0 #000", touchAction: "none" }}
      >
        COURIR
        <div style={{ fontSize: 10, fontStyle: "normal", opacity: 0.7, fontFamily: "system-ui" }}>Maj</div>
      </button>

      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", color: "#fff", opacity: 0.75,
        fontSize: 12, fontFamily: "system-ui", textShadow: "1px 1px 2px #000", whiteSpace: "nowrap", pointerEvents: "none" }}>
        ZQSD / flèches pour marcher · glisser pour tourner la caméra · M pour la carte
      </div>
    </div>
  );
}
