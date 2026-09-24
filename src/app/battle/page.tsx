"use client";
import dynamic from "next/dynamic";

// Le jeu lit les choix sauvegardés (localStorage) et utilise WebGL : rendu uniquement dans le navigateur
const Game = dynamic(() => import("@/components/Game"), {
  ssr: false,
  loading: () => <div style={{ width: "100vw", height: "100vh", background: "#07080f" }} />,
});

export default function BattlePage() {
  return <Game />;
}
