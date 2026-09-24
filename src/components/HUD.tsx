"use client";
import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type { BattleState } from "@/lib/engine/types";

interface HUDProps {
  battleRef: RefObject<BattleState>;
  onRestart: () => void;
}

export function HUD({ battleRef, onRestart }: HUDProps) {
  // Copie de l'état du combat rafraîchie 10 fois par seconde (on ne lit jamais la ref pendant le rendu)
  const [snap, setSnap] = useState<BattleState | null>(null);

  useEffect(() => {
    const id = setInterval(() => setSnap(battleRef.current), 100);
    return () => clearInterval(id);
  }, [battleRef]);

  if (!snap) return null;

  const { fighterA, fighterB } = snap;
  const winner = [fighterA, fighterB].find((f) => f.def.id === snap.winnerId);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", color: "#fff", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          {fighterA.def.name} : {Math.max(0, Math.round(fighterA.currentHp))} HP
        </div>
        <div>{Math.ceil(snap.timeRemaining)}s</div>
        <div>
          {fighterB.def.name} : {Math.max(0, Math.round(fighterB.currentHp))} HP
        </div>
      </div>
      {snap.isFinished && (
        <div style={{ pointerEvents: "auto", textAlign: "center", marginTop: 100 }}>
          <h1>{winner ? `VICTOIRE DE ${winner.def.name.toUpperCase()}` : "ÉGALITÉ"}</h1>
          <button onClick={onRestart} style={{ padding: "10px 20px", cursor: "pointer" }}>
            Rejouer
          </button>
        </div>
      )}
    </div>
  );
}
