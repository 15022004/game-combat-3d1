"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { BattlefieldDef } from "@/data/battlefields";
import { WORLD_HALF, WORLD_SIZE, type WorldLayout } from "@/lib/world/generate";
import type { ExploreState } from "@/lib/world/state";

const FONT = "Impact, 'Arial Black', system-ui, sans-serif";
const PX = 3; // pixels par unité sur l'image de la carte complète
const VIEW = 45; // rayon (en unités) visible sur la mini-carte

/** Image de la carte (sol + décor), dessinée une seule fois */
function renderMapImage(field: BattlefieldDef, layout: WorldLayout) {
  const c = document.createElement("canvas");
  c.width = c.height = WORLD_SIZE * PX;
  const g = c.getContext("2d")!;
  g.fillStyle = field.ground;
  g.fillRect(0, 0, c.width, c.height);
  for (const p of layout.props) {
    const kind = field.props[p.kind];
    g.fillStyle = kind.color ?? "#000";
    g.globalAlpha = kind.radius > 0 ? 0.9 : 0.45;
    const r = Math.max(1.2, (kind.radius > 0 ? p.radius : p.scale) * PX);
    g.beginPath();
    g.arc((p.x + WORLD_HALF) * PX, (p.z + WORLD_HALF) * PX, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  g.strokeStyle = field.accent;
  g.lineWidth = 6;
  g.strokeRect(3, 3, c.width - 6, c.height - 6);
  return c;
}

function drawArrow(g: CanvasRenderingContext2D, x: number, y: number, heading: number, size: number, color: string) {
  g.save();
  g.translate(x, y);
  g.rotate(-heading + Math.PI); // cap du monde -> rotation canvas (z vers le bas)
  g.beginPath();
  g.moveTo(0, -size);
  g.lineTo(size * 0.7, size * 0.8);
  g.lineTo(0, size * 0.4);
  g.lineTo(-size * 0.7, size * 0.8);
  g.closePath();
  g.fillStyle = color;
  g.strokeStyle = "#000";
  g.lineWidth = 2;
  g.fill();
  g.stroke();
  g.restore();
}

function drawMonster(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, t: number) {
  g.beginPath();
  g.arc(x, y, r * (1.6 + 0.4 * Math.sin(t * 6)), 0, Math.PI * 2);
  g.fillStyle = color + "55";
  g.fill();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = "#ff2a2a";
  g.strokeStyle = "#fff";
  g.lineWidth = 2;
  g.fill();
  g.stroke();
}

export function Minimap({
  field, layout, stateRef, monsterColor,
}: {
  field: BattlefieldDef;
  layout: WorldLayout;
  stateRef: RefObject<ExploreState>;
  monsterColor: string;
}) {
  const mini = useRef<HTMLCanvasElement>(null);
  const big = useRef<HTMLCanvasElement>(null);
  const distEl = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const image = useMemo(() => renderMapImage(field, layout), [field, layout]);

  // Touche M : carte complète
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyM" && !e.repeat) setOpen((o) => !o);
      if (e.code === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let raf = 0;
    const draw = (time: number) => {
      raf = requestAnimationFrame(draw);
      const s = stateRef.current;
      const t = time / 1000;
      const p = s.player;
      const m = s.monster;
      const dist = Math.hypot(m.x - p.x, m.z - p.z);
      if (distEl.current) {
        distEl.current.textContent = m.chasing ? `⚠ Il t'a repéré ! (${Math.round(dist)} m)` : `Monstre : ${Math.round(dist)} m`;
        distEl.current.style.color = m.chasing ? "#ff5a5a" : "#fff";
      }

      // --- Mini-carte (centrée sur le joueur, nord en haut)
      const c = mini.current;
      const g = c?.getContext("2d");
      if (c && g) {
        const W = c.width;
        const scale = W / 2 / VIEW; // px par unité
        g.clearRect(0, 0, W, W);
        g.save();
        g.beginPath();
        g.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2);
        g.clip();
        g.fillStyle = "#000";
        g.fillRect(0, 0, W, W);
        const sx = (p.x + WORLD_HALF) * PX - VIEW * PX;
        const sy = (p.z + WORLD_HALF) * PX - VIEW * PX;
        g.drawImage(image, sx, sy, VIEW * 2 * PX, VIEW * 2 * PX, 0, 0, W, W);
        // cône de vision de la caméra
        g.save();
        g.translate(W / 2, W / 2);
        g.rotate(-s.camYaw);
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, W * 0.45, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
        g.closePath();
        g.fillStyle = "rgba(255,255,255,0.12)";
        g.fill();
        g.restore();
        // monstre (sur le bord si trop loin)
        let mx = (m.x - p.x) * scale;
        let my = (m.z - p.z) * scale;
        const edge = W / 2 - 12;
        const far = Math.hypot(mx, my) > edge;
        if (far) {
          const k = edge / Math.hypot(mx, my);
          mx *= k;
          my *= k;
        }
        drawMonster(g, W / 2 + mx, W / 2 + my, far ? 5 : 6, monsterColor, t);
        drawArrow(g, W / 2, W / 2, p.heading, 9, "#ffffff");
        g.restore();
        g.strokeStyle = field.accent;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2);
        g.stroke();
      }

      // --- Carte complète
      const bc = big.current;
      const bg = bc?.getContext("2d");
      if (bc && bg) {
        const W = bc.width;
        const k = W / WORLD_SIZE;
        bg.drawImage(image, 0, 0, W, W);
        drawMonster(bg, (m.x + WORLD_HALF) * k, (m.z + WORLD_HALF) * k, 7, monsterColor, t);
        drawArrow(bg, (p.x + WORLD_HALF) * k, (p.z + WORLD_HALF) * k, p.heading, 11, "#ffffff");
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [stateRef, image, field, monsterColor]);

  return (
    <>
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <canvas
          ref={mini}
          width={170}
          height={170}
          onClick={() => setOpen(true)}
          title="Carte (M)"
          style={{ width: "clamp(110px, 22vw, 170px)", height: "clamp(110px, 22vw, 170px)", cursor: "pointer", pointerEvents: "auto" }}
        />
        <div ref={distEl} style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 14, letterSpacing: 1, textShadow: "2px 2px 0 #000" }} />
        <button onClick={() => setOpen(true)} style={mapBtn}>CARTE (M)</button>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "auto", zIndex: 20 }}
        >
          <div style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 30, letterSpacing: 2, color: field.accent, textShadow: "3px 3px 0 #000" }}>
            {field.name}
          </div>
          <canvas ref={big} width={640} height={640} style={{ width: "min(84vmin, 640px)", height: "min(84vmin, 640px)", border: `3px solid ${field.accent}` }} />
          <div style={{ color: "#ddd", fontSize: 14, fontFamily: "system-ui" }}>
            Flèche blanche : toi · Point rouge : le monstre · Touche pour fermer
          </div>
        </div>
      )}
    </>
  );
}

const mapBtn: React.CSSProperties = {
  pointerEvents: "auto", padding: "4px 12px", fontFamily: FONT, fontSize: 13, letterSpacing: 1, cursor: "pointer",
  color: "#fff", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.7)", transform: "skewX(-10deg)",
};
