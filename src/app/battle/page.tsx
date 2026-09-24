"use client";
import { useRef } from "react";
import Arena from "@/components/Arena";
import { HUD } from "@/components/HUD";
import { Simulation } from "@/components/Simulation";
import { CHARACTERS } from "@/data/characters";
import { createBattle } from "@/lib/engine/engine";
import type { BattleState } from "@/lib/engine/types";

const [A, B] = CHARACTERS;

export default function BattlePage() {
  const battleRef = useRef<BattleState>(createBattle(A, B));

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Arena colorA={A.color} colorB={B.color}>
        <Simulation a={A} b={B} battleRef={battleRef} />
      </Arena>
      <HUD battleRef={battleRef} onRestart={() => { battleRef.current = createBattle(A, B); }} />
    </div>
  );
}
