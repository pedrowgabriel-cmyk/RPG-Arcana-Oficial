"use client";

// O Oeste Selvagem — recriação vetorial do mapa oficial de Sacramento,
// interativa estilo Google Maps: arrastar, zoom no cursor, pinça, busca com
// voo até o lugar, camadas ligáveis e pinos do Juiz (lugares da campanha).
// Toda a geografia é gerada proceduralmente de listas de pontos + seed
// (costas, florestas, estradas, ferrovias com travessas, hachuras e ondas),
// na identidade Arcana: o mapa é pergaminho, o chrome é vidro.

import { useCallback, useEffect, useRef, useState } from "react";
import { SACRAMENTO_PLACES } from "@/lib/rulesets/sacramento/places";
import {
  CITIES,
  DECOR_LABELS,
  EAST_COAST,
  FOREST_BLOBS,
  HILL_DEFS,
  ISLAND_DEF,
  LAKE_DEFS,
  RAILS,
  REGION_PLACES,
  RIDGES,
  RIVER_DEFS,
  ROADS,
  WEST_COAST,
  type Pt,
} from "@/lib/mapa/geografia";

const W = 1000;
const H = 736;
const MIN_W = 220; // zoom máximo ~4,5×


/* ─── Geometria procedural ───
   Nada aqui é "perfeito" de propósito: bordas, ruas e vegetação passam por
   ruído fractal determinístico (PRNG mulberry32 + duas oitavas de
   deslocamento) — a mesma seed gera sempre o mesmo Oeste. */

/** PRNG determinístico e barato. */
function mulberry32(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reamostra a polilinha em passos ~step (mantém extremos). */
function resample(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]];
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const seg = Math.hypot(x2 - x1, y2 - y1);
    if (seg === 0) continue;
    let t = step - carry;
    while (t < seg) {
      out.push([x1 + ((x2 - x1) * t) / seg, y1 + ((y2 - y1) * t) / seg]);
      t += step;
    }
    carry = (carry + seg) % step;
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Ruído fractal: oitavas de reamostragem + deslocamento normal aleatório. */
function roughen(
  pts: Pt[],
  seed: number,
  passes: { step: number; amp: number }[],
): Pt[] {
  const r = mulberry32(seed * 2654435761);
  let cur = pts;
  for (const pass of passes) {
    cur = resample(cur, pass.step);
    const ns = normalsOf(cur);
    cur = cur.map((p, i) =>
      i === 0 || i === cur.length - 1
        ? p
        : ([
            p[0] + ns[i][0] * (r() - 0.5) * 2 * pass.amp,
            p[1] + ns[i][1] * (r() - 0.5) * 2 * pass.amp,
          ] as const),
    );
  }
  return cur;
}

/** Mancha orgânica com raio função do ângulo (permite teste de contenção). */
function makeBlob(cx: number, cy: number, rx: number, ry: number, seed: number, n = 26) {
  const r = mulberry32(seed * 97 + 3);
  const ph1 = r() * 6.283;
  const ph2 = r() * 6.283;
  const ph3 = r() * 6.283;
  const jit = (a: number) =>
    0.8 + 0.13 * Math.sin(a * 3 + ph1) + 0.08 * Math.sin(a * 5 + ph2) + 0.05 * Math.sin(a * 9 + ph3);
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const j = jit(a) + (r() - 0.5) * 0.07;
    return [cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j] as const;
  });
  const mid = (i: number) =>
    [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2] as const;
  let d = `M${mid(n - 1)[0].toFixed(1)},${mid(n - 1)[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    d += ` Q${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${mid(i)[0].toFixed(1)},${mid(i)[1].toFixed(1)}`;
  }
  d += " Z";
  const inside = (x: number, y: number, margin = 0) => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return Math.hypot(dx, dy) < jit(Math.atan2(dy, dx)) - margin;
  };
  return { path: d, inside };
}

/** Polilinha suavizada (quadráticas pelos pontos médios), aberta. */
function smoothOpen(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0]},${pts[i][1]} ${mx.toFixed(1)},${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last[0]},${last[1]}`;
  return d;
}

/** Normais unitárias por ponto (média dos segmentos vizinhos), rotação +90°. */
function normalsOf(pts: Pt[]): Pt[] {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    return [-ty / len, tx / len] as const;
  });
}

/** Desloca a polilinha ao longo das normais (sign escolhe o lado). */
function offsetPolyline(pts: Pt[], dist: number, sign: 1 | -1): Pt[] {
  const ns = normalsOf(pts);
  return pts.map((p, i) => [p[0] + ns[i][0] * dist * sign, p[1] + ns[i][1] * dist * sign] as const);
}

/** Hachuras de costa: traços curtos irregulares apontando para a água. */
function hachures(pts: Pt[], sign: 1 | -1, seed: number): string {
  const ns = normalsOf(pts);
  const r = mulberry32(seed * 811 + 13);
  return pts
    .map((p, i) => {
      const len = 4.5 + r() * 4.5;
      const rot = (r() - 0.5) * 0.5;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const nx = ns[i][0] * cos - ns[i][1] * sin;
      const ny = ns[i][0] * sin + ns[i][1] * cos;
      return `M${p[0].toFixed(1)},${p[1].toFixed(1)} l${(nx * len * sign).toFixed(1)},${(ny * len * sign).toFixed(1)}`;
    })
    .join(" ");
}

/** Travessas de ferrovia: tique perpendicular a cada `gap` de comprimento. */
function railTicks(pts: Pt[], gap = 13, half = 3.6): string {
  let d = "";
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const seg = Math.hypot(x2 - x1, y2 - y1);
    if (seg === 0) continue;
    const tx = (x2 - x1) / seg;
    const ty = (y2 - y1) / seg;
    let t = gap - acc;
    while (t < seg) {
      const px = x1 + tx * t;
      const py = y1 + ty * t;
      d += `M${(px - ty * half).toFixed(1)},${(py + tx * half).toFixed(1)} L${(px + ty * half).toFixed(1)},${(py - tx * half).toFixed(1)} `;
      t += gap;
    }
    acc = (acc + seg) % gap;
  }
  return d;
}

/* ─── Geografia (leitura do mapa impresso) ─── */

// Costas com ruído fractal — o mar ocupa o oeste, o SUL inteiro (como no
// PDF oficial) e a Baía de BH a leste; a costa oeste+sul é uma cadeia só.
const WEST_R = roughen(WEST_COAST, 71, [{ step: 34, amp: 6 }, { step: 12, amp: 2.2 }]);
const EAST_R = roughen(EAST_COAST, 72, [{ step: 34, amp: 6 }, { step: 12, amp: 2.2 }]);
const WEST_WATER = `${smoothOpen(WEST_R)} L755,736 L0,736 Z`;
const EAST_WATER = `${smoothOpen(EAST_R)} L1000,736 L1000,320 Z`;
const WEST_MID = resample(WEST_R, 24).slice(1, -1);
const EAST_MID = resample(EAST_R, 24).slice(1, -1);
const ISLAND = makeBlob(ISLAND_DEF.cx, ISLAND_DEF.cy, ISLAND_DEF.rx, ISLAND_DEF.ry, ISLAND_DEF.seed).path;
// Três corpos d'água interiores (PDF): Águas de Pólvora, lago de Maria da
// Fé e o lago do Zói de Deus.
const LAKES = LAKE_DEFS.map((l) => makeBlob(l.cx, l.cy, l.rx, l.ry, l.seed).path);

// Rede de rios e riachos (PDF): veias finas por toda a terra, afuniladas.
const RIVERS_RENDER = RIVER_DEFS.map((def) => {
  const rp = roughen(def.pts, def.seed, [{ step: 26, amp: 4.5 }, { step: 10, amp: 1.6 }]);
  const k = Math.floor(rp.length / 3);
  return [
    { d: smoothOpen(rp.slice(0, k + 1)), w: def.taper[0] },
    { d: smoothOpen(rp.slice(k, 2 * k + 1)), w: def.taper[1] },
    { d: smoothOpen(rp.slice(2 * k)), w: def.taper[2] },
  ];
});

// Florestas: massa + árvores individuais (posição, tamanho e espécie
// sorteados por seed; orla esparsa; pintadas de trás para a frente).
// Massas de floresta lidas do PDF (10 manchas, das grandes às capoeiras).
type Tree = { x: number; y: number; s: number; k: 0 | 1 };
const FOREST_DATA = FOREST_BLOBS.map((b) => {
  const blob = makeBlob(b.cx, b.cy, b.rx, b.ry, b.seed);
  const r = mulberry32(b.seed * 131 + 7);
  const trees: Tree[] = [];
  for (let gy = b.cy - b.ry - 8; gy <= b.cy + b.ry + 8; gy += 12) {
    for (let gx = b.cx - b.rx - 8; gx <= b.cx + b.rx + 8; gx += 13) {
      const x = gx + (r() - 0.5) * 9;
      const y = gy + (r() - 0.5) * 8;
      const core = blob.inside(x, y, 0.1);
      const rim = blob.inside(x, y, -0.06);
      if (!rim) continue;
      if (!core && r() < 0.65) continue;
      if (r() < 0.14) continue;
      trees.push({ x, y, s: 2.4 + r() * 2.1, k: r() < 0.22 ? 1 : 0 });
    }
  }
  trees.sort((a, bb) => a.y - bb.y);
  return { tint: blob.path, trees };
});

// A Serra da Saudade DESCE para sudeste (conferido no PDF oficial).

// Picos individuais: tamanho variável (maiores no centro da cadeia), posição
// com jitter, contrafortes menores e neve nas cadeias do norte.
type Peak = { x: number; y: number; s: number; snow: boolean };
const PEAKS: Peak[] = RIDGES.flatMap((rg, idx) => {
  const r = mulberry32(idx * 17 + 5);
  const snowRidge = idx === 2 || idx === 3;
  const main: Peak[] = Array.from({ length: rg.n }, (_, i) => {
    const t = rg.n === 1 ? 0.5 : i / (rg.n - 1);
    const profile = 0.62 + 0.55 * Math.sin(Math.PI * t);
    return {
      x: rg.x1 + (rg.x2 - rg.x1) * t + (r() - 0.5) * 10,
      y: rg.y1 + (rg.y2 - rg.y1) * t + (r() - 0.5) * 10 + (i % 2 ? 3 : -3),
      s: (8 + r() * 4.5) * profile,
      snow: snowRidge && r() > 0.3,
    };
  });
  const foothills: Peak[] = Array.from({ length: Math.max(2, Math.round(rg.n / 2)) }, () => ({
    x: rg.x1 + (rg.x2 - rg.x1) * r() + (r() - 0.5) * 30,
    y: rg.y1 + (rg.y2 - rg.y1) * r() + 8 + r() * 12,
    s: 3.5 + r() * 2.5,
    snow: false,
  }));
  return [...main, ...foothills];
}).sort((a, b) => a.y - b.y);

// Manchas de envelhecimento do papel (terra e água).
const STAINS = [
  makeBlob(320, 120, 90, 60, 31).path,
  makeBlob(700, 620, 110, 70, 33).path,
  makeBlob(180, 540, 70, 50, 35).path,
  makeBlob(560, 60, 60, 40, 37).path,
];
const WATER_STAINS = [makeBlob(50, 480, 38, 90, 39).path, makeBlob(930, 440, 55, 75, 43).path];

// Colinas topográficas: anéis de curva de nível aninhados por todo o mapa
// (o PDF é coberto deles). Cada colina gera 3 anéis concêntricos.
const HILLS = HILL_DEFS.map((h) => [
  makeBlob(h.cx, h.cy, h.r, h.r * 0.68, h.seed).path,
  makeBlob(h.cx + 3, h.cy + 2, h.r * 0.64, h.r * 0.43, h.seed + 1).path,
  makeBlob(h.cx + 5, h.cy + 3, h.r * 0.34, h.r * 0.23, h.seed + 2).path,
]);

// Malha viária lida do PDF — três classes: estrada principal (dupla linha),
// caminho secundário (linha simples) e trilha (pontilhada / traço-ponto).

// Ferrovias: polilinhas (o traçado reto+curvas leves é próprio de trilho).

// Traçado final das estradas: ruído fractal leve (nunca senoide regular).
const ROAD_PATHS = ROADS.map((r) => ({
  kind: r.kind,
  d: smoothOpen(
    roughen(
      r.pts,
      r.seed * 7 + 29,
      r.kind === "trail" || r.kind === "mix"
        ? [{ step: 26, amp: 3 }, { step: 10, amp: 1.2 }]
        : [{ step: 24, amp: 2.6 }, { step: 9, amp: 1.1 }],
    ),
  ),
}));




// Busca: tudo que é lugar canônico navegável no mapa.
const SEARCHABLE: { id: string; nome: string; x: number; y: number; tipo: string }[] = [
  ...CITIES.map((c) => ({ id: c.id, nome: c.nome, x: c.x, y: c.y, tipo: "Cidade" })),
  ...REGION_PLACES.map((r) => ({
    id: r.id,
    nome: r.nome.replace("\n", " "),
    x: r.x,
    y: r.y,
    tipo: "Região",
  })),
];

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/* ─── Componente ─── */

export type MapPin = { id: string; nome: string; x: number; y: number; descricao?: string };

type Props = {
  addedIds: Set<string>;
  busyId: string | null;
  onAdd: (canonId: string) => void;
  /** Pinos do Juiz (lugares da campanha posicionados no mapa). */
  pins?: MapPin[];
  /** Nome do lugar aguardando posicionamento (modo "clique para fixar"). */
  placingLabel?: string | null;
  onPlacePin?: (x: number, y: number) => void;
  onCancelPlacing?: () => void;
  onRemovePin?: (pinId: string) => void;
};

export function WorldMap({
  addedIds,
  busyId,
  onAdd,
  pins = [],
  placingLabel = null,
  onPlacePin,
  onCancelPlacing,
  onRemovePin,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, w: W });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [layers, setLayers] = useState({ labels: true, roads: true, terrain: true });
  const [layersOpen, setLayersOpen] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragState = useRef({ moved: false, lastDist: 0 });
  const animRef = useRef<number | null>(null);

  const z = W / view.w;
  const vh = view.w * (H / W);

  const clampView = useCallback((x: number, y: number, w: number) => {
    const cw = Math.min(W, Math.max(MIN_W, w));
    const ch = cw * (H / W);
    return {
      x: Math.min(W - cw, Math.max(0, x)),
      y: Math.min(H - ch, Math.max(0, y)),
      w: cw,
    };
  }, []);

  const stopAnim = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = null;
  }, []);

  const resetView = useCallback(() => {
    stopAnim();
    setView({ x: 0, y: 0, w: W });
  }, [stopAnim]);

  /** Voo suave até centrar (cx,cy) com largura de vista targetW. */
  const flyTo = useCallback(
    (cx: number, cy: number, targetW: number) => {
      stopAnim();
      const from = { ...view };
      const to = clampView(cx - targetW / 2, cy - (targetW * (H / W)) / 2, targetW);
      const t0 = performance.now();
      const dur = 480;
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const k = ease(t);
        setView({
          x: from.x + (to.x - from.x) * k,
          y: from.y + (to.y - from.y) * k,
          w: from.w + (to.w - from.w) * k,
        });
        if (t < 1) animRef.current = requestAnimationFrame(step);
      };
      animRef.current = requestAnimationFrame(step);
    },
    [view, clampView, stopAnim],
  );

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      stopAnim();
      setView((v) => {
        const rect = containerRef.current!.getBoundingClientRect();
        const px = (clientX - rect.left) / rect.width;
        const py = (clientY - rect.top) / rect.height;
        const nw = Math.min(W, Math.max(MIN_W, v.w * factor));
        const mx = v.x + px * v.w;
        const my = v.y + py * v.w * (H / W);
        return clampView(mx - px * nw, my - py * nw * (H / W), nw);
      });
    },
    [clampView, stopAnim],
  );

  const zoomCenter = useCallback(
    (factor: number) => {
      const r = containerRef.current!.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
    },
    [zoomAt],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.18 : 1 / 1.18);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    stopAnim();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragState.current.moved = false;
    dragState.current.lastDist = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (dragState.current.lastDist > 0) {
        zoomAt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, dragState.current.lastDist / dist);
      }
      dragState.current.lastDist = dist;
      dragState.current.moved = true;
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragState.current.moved = true;
    const rect = containerRef.current!.getBoundingClientRect();
    setView((v) =>
      clampView(v.x - (dx / rect.width) * v.w, v.y - (dy / rect.height) * v.w * (H / W), v.w),
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    dragState.current.lastDist = 0;
  };

  const toMapCoords = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      mx: view.x + ((clientX - rect.left) / rect.width) * view.w,
      my: view.y + ((clientY - rect.top) / rect.height) * vh,
    };
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (dragState.current.moved) return;
    if (placingLabel && onPlacePin) {
      const { mx, my } = toMapCoords(e.clientX, e.clientY);
      onPlacePin(Math.round(mx), Math.round(my));
    }
  };

  const select = (id: string) => {
    if (dragState.current.moved || placingLabel) return;
    setSelectedPinId(null);
    setSelectedId((cur) => (cur === id ? null : id));
  };

  const selectPin = (id: string) => {
    if (dragState.current.moved || placingLabel) return;
    setSelectedId(null);
    setSelectedPinId((cur) => (cur === id ? null : id));
  };

  const selected = selectedId ? SACRAMENTO_PLACES.find((p) => p.id === selectedId) : null;
  const selectedPin = selectedPinId ? pins.find((p) => p.id === selectedPinId) : null;

  const results = query.trim()
    ? SEARCHABLE.filter((s) => norm(s.nome).includes(norm(query))).slice(0, 6)
    : [];

  const citySize = 13 / z;
  const regionSize = 12 / z;
  const pinScale = 1 / Math.pow(z, 0.8);

  return (
    <div
      ref={containerRef}
      className="relative h-[440px] overflow-hidden rounded-2xl border border-arcana-gold/25 select-none md:h-[540px]"
      style={{
        touchAction: "none",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 30px rgba(0,0,0,0.45)",
        cursor: placingLabel ? "crosshair" : undefined,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => zoomAt(e.clientX, e.clientY, 1 / 1.6)}
    >
      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${vh}`}
        className={placingLabel ? "h-full w-full" : "h-full w-full cursor-grab active:cursor-grabbing"}
        role="img"
        aria-label="Mapa do Oeste Selvagem"
        onClick={handleMapClick}
      >
        <defs>
          <radialGradient id="wm-parch" cx="50%" cy="35%" r="90%">
            <stop offset="0%" stopColor="#efdfbf" />
            <stop offset="70%" stopColor="#e3d0a7" />
            <stop offset="100%" stopColor="#d2bc8e" />
          </radialGradient>
          <radialGradient id="wm-snow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e9eef0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#e9eef0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wm-red" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c26a3f" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#c26a3f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wm-green" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8f9663" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#8f9663" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wm-shade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3c2c18" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#3c2c18" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wm-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff6df" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fff6df" stopOpacity="0" />
          </radialGradient>
          <pattern id="wm-waterlines" width="34" height="12" patternUnits="userSpaceOnUse">
            <path d="M0,6 q4,-2.5 8,0 t8,0 t8,0 t8,0" fill="none" stroke="#7f97a2" strokeWidth="0.8" strokeOpacity="0.5" />
          </pattern>
        </defs>

        {/* Pergaminho + manchas de envelhecimento */}
        <rect x="0" y="0" width={W} height={H} fill="url(#wm-parch)" />
        <g fill="#7a6544">
          {STAINS.map((d, i) => (
            <path key={i} d={d} fillOpacity={i % 2 ? 0.05 : 0.07} />
          ))}
        </g>

        {/* Tintas climáticas: neve ao norte, ravina vermelha ao sul, verde nas matas */}
        {layers.terrain && (
          <g>
            <ellipse cx="620" cy="60" rx="300" ry="120" fill="url(#wm-snow)" />
            <ellipse cx="160" cy="620" rx="230" ry="140" fill="url(#wm-red)" />
            <ellipse cx="240" cy="220" rx="300" ry="210" fill="url(#wm-green)" />
            <ellipse cx="600" cy="330" rx="260" ry="160" fill="url(#wm-green)" />
          </g>
        )}

        {/* Água */}
        <g>
          <path d={WEST_WATER} fill="#9fb2ba" />
          <path d={EAST_WATER} fill="#9fb2ba" />
          <path d={WEST_WATER} fill="url(#wm-waterlines)" />
          <path d={EAST_WATER} fill="url(#wm-waterlines)" />
          <g fill="#47606c">
            {WATER_STAINS.map((d, i) => (
              <path key={i} d={d} fillOpacity="0.1" />
            ))}
          </g>
          {LAKES.map((d, i) => (
            <g key={i}>
              <path d={d} fill="#9fb2ba" />
              <path d={d} fill="url(#wm-waterlines)" />
              <path d={d} fill="none" stroke="#4a3a26" strokeOpacity="0.55" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </g>

        {/* Ilha (terra sobre a água) */}
        <path d={ISLAND} fill="url(#wm-parch)" stroke="#4a3a26" strokeWidth="1.2" />

        {/* Costa: banda rasa, linha, hachuras irregulares e ondas de margem */}
        <g fill="none">
          <path d={smoothOpen(offsetPolyline(WEST_MID, 4, -1))} stroke="#8ba3ae" strokeOpacity="0.5" strokeWidth="6" />
          <path d={smoothOpen(offsetPolyline(EAST_MID, 4, -1))} stroke="#8ba3ae" strokeOpacity="0.5" strokeWidth="6" />
          <path d={smoothOpen(WEST_R)} stroke="#4a3a26" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <path d={smoothOpen(EAST_R)} stroke="#4a3a26" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <path d={hachures(WEST_MID, -1, 51)} stroke="#4a3a26" strokeOpacity="0.38" strokeWidth="0.85" vectorEffect="non-scaling-stroke" />
          <path d={hachures(EAST_MID, -1, 53)} stroke="#4a3a26" strokeOpacity="0.38" strokeWidth="0.85" vectorEffect="non-scaling-stroke" />
          <path d={smoothOpen(offsetPolyline(WEST_MID, 12, -1))} stroke="#7f97a2" strokeOpacity="0.5" strokeWidth="0.9" strokeDasharray="9 7" vectorEffect="non-scaling-stroke" />
          <path d={smoothOpen(offsetPolyline(WEST_MID, 22, -1))} stroke="#7f97a2" strokeOpacity="0.28" strokeWidth="0.9" strokeDasharray="6 9" vectorEffect="non-scaling-stroke" />
          <path d={smoothOpen(offsetPolyline(EAST_MID, 12, -1))} stroke="#7f97a2" strokeOpacity="0.5" strokeWidth="0.9" strokeDasharray="9 7" vectorEffect="non-scaling-stroke" />
          <path d={smoothOpen(offsetPolyline(EAST_MID, 22, -1))} stroke="#7f97a2" strokeOpacity="0.28" strokeWidth="0.9" strokeDasharray="6 9" vectorEffect="non-scaling-stroke" />
        </g>

        {/* Rios afunilados (escalam com o zoom, como terreno) */}
        <g fill="none" stroke="#8aa2ad" strokeLinecap="round">
          {RIVERS_RENDER.map((segs, i) =>
            segs.map((s, si) => <path key={`${i}-${si}`} d={s.d} strokeWidth={s.w} />),
          )}
        </g>

        {layers.terrain && (
          <g>
            {/* Colinas: anéis de curva de nível aninhados */}
            <g fill="none" stroke="#8a7350" strokeWidth="0.8">
              {HILLS.map((rings, i) => (
                <g key={i}>
                  <path d={rings[0]} strokeOpacity="0.18" />
                  <path d={rings[1]} strokeOpacity="0.22" />
                  <path d={rings[2]} strokeOpacity="0.26" />
                </g>
              ))}
            </g>

            {/* Relevo sombreado: sombra a SE, luz a NO de cada serra */}
            {RIDGES.map((r, i) => {
              const cx = (r.x1 + r.x2) / 2;
              const cy = (r.y1 + r.y2) / 2;
              const len = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
              const ang = (Math.atan2(r.y2 - r.y1, r.x2 - r.x1) * 180) / Math.PI;
              return (
                <g key={`sh-${i}`}>
                  <ellipse
                    cx={cx + 7} cy={cy + 8} rx={len / 2 + 18} ry={20}
                    fill="url(#wm-shade)"
                    transform={`rotate(${ang} ${cx + 7} ${cy + 8})`}
                  />
                  <ellipse
                    cx={cx - 6} cy={cy - 8} rx={len / 2 + 10} ry={14}
                    fill="url(#wm-glow)"
                    transform={`rotate(${ang} ${cx - 6} ${cy - 8})`}
                  />
                </g>
              );
            })}

            {/* Florestas: sombra da massa, tinta e árvores individuais */}
            {FOREST_DATA.map((f, i) => (
              <g key={i}>
                <path d={f.tint} transform="translate(3 4)" fill="#5c5f42" fillOpacity="0.2" />
                <path d={f.tint} fill="#a9a781" fillOpacity="0.3" />
                {f.trees.map((t, ti) =>
                  t.k === 1 ? (
                    <g key={ti} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)})`}>
                      <ellipse cx={t.s * 0.4} cy={t.s * 0.55} rx={t.s * 0.9} ry={t.s * 0.5} fill="#565d3b" opacity="0.26" />
                      <path
                        d={`M0,${(-t.s * 1.6).toFixed(1)} L${(t.s * 0.75).toFixed(1)},${(t.s * 0.35).toFixed(1)} L${(-t.s * 0.75).toFixed(1)},${(t.s * 0.35).toFixed(1)} Z`}
                        fill="#7f8c5b"
                        stroke="#465030"
                        strokeWidth="0.6"
                      />
                      <path d={`M0,${(t.s * 0.35).toFixed(1)} v${(t.s * 0.5).toFixed(1)}`} stroke="#465030" strokeWidth="0.7" />
                    </g>
                  ) : (
                    <g key={ti} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)})`}>
                      <ellipse cx={t.s * 0.4} cy={t.s * 0.5} rx={t.s * 1.05} ry={t.s * 0.6} fill="#565d3b" opacity="0.26" />
                      <path d={`M0,${t.s.toFixed(1)} v${(t.s * 0.45).toFixed(1)}`} stroke="#465030" strokeWidth="0.7" />
                      <circle r={t.s} fill="#99a36f" stroke="#4f5836" strokeWidth="0.6" />
                      <circle cx={t.s * 0.5} cy={-t.s * 0.35} r={t.s * 0.55} fill="#a4ad7a" stroke="#4f5836" strokeWidth="0.5" />
                    </g>
                  ),
                )}
              </g>
            ))}

            {/* Cordilheiras: picos com face iluminada e face hachurada */}
            <g strokeLinejoin="round" strokeLinecap="round">
              {PEAKS.map((p, i) => (
                <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
                  <path
                    d={`M${-p.s},${(p.s * 0.6).toFixed(1)} L0,${-p.s} L${p.s},${(p.s * 0.6).toFixed(1)}`}
                    fill="#e9dab4"
                    fillOpacity="0.6"
                    stroke="#4a3a26"
                    strokeWidth="1.3"
                  />
                  <path
                    d={`M0,${-p.s} L${p.s},${(p.s * 0.6).toFixed(1)} L${(p.s * 0.3).toFixed(1)},${(p.s * 0.52).toFixed(1)} Z`}
                    fill="#4a3a26"
                    fillOpacity="0.22"
                    stroke="none"
                  />
                  <path
                    d={`M${(p.s * 0.16).toFixed(1)},${(-p.s * 0.2).toFixed(1)} L${(p.s * 0.5).toFixed(1)},${(p.s * 0.28).toFixed(1)} M${(p.s * 0.02).toFixed(1)},${(p.s * 0.12).toFixed(1)} L${(p.s * 0.26).toFixed(1)},${(p.s * 0.45).toFixed(1)}`}
                    fill="none"
                    stroke="#4a3a26"
                    strokeOpacity="0.4"
                    strokeWidth="0.7"
                  />
                  {p.snow && (
                    <path
                      d={`M${(-p.s * 0.26).toFixed(1)},${(-p.s * 0.42).toFixed(1)} L0,${-p.s} L${(p.s * 0.26).toFixed(1)},${(-p.s * 0.42).toFixed(1)} L${(p.s * 0.1).toFixed(1)},${(-p.s * 0.3).toFixed(1)} L${(-p.s * 0.1).toFixed(1)},${(-p.s * 0.33).toFixed(1)} Z`}
                      fill="#f3f5f1"
                      stroke="none"
                    />
                  )}
                </g>
              ))}
            </g>
          </g>
        )}

        {/* Estradas e ferrovias — dupla linha gravada + travessas */}
        {layers.roads && (
          <g fill="none" strokeLinecap="round">
            {ROAD_PATHS.map((r, i) => {
              if (r.kind === "trail")
                return (
                  <path key={i} d={r.d} stroke="#3a2c1a" strokeOpacity="0.6" strokeWidth="1.3" strokeDasharray="1 6" vectorEffect="non-scaling-stroke" />
                );
              if (r.kind === "mix")
                return (
                  <path key={i} d={r.d} stroke="#3a2c1a" strokeOpacity="0.65" strokeWidth="1.3" strokeDasharray="9 4 1.5 4" vectorEffect="non-scaling-stroke" />
                );
              if (r.kind === "sec")
                return (
                  <path key={i} d={r.d} stroke="#3a2c1a" strokeOpacity="0.6" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                );
              return (
                <g key={i}>
                  <path d={r.d} stroke="#3a2c1a" strokeOpacity="0.75" strokeWidth="2.6" vectorEffect="non-scaling-stroke" />
                  <path d={r.d} stroke="#d8c496" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
            {RAILS.map((r, i) => (
              <g key={`rail-${i}`} stroke="#2b1e12">
                <path d={smoothOpen(r)} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <path d={railTicks(r)} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </g>
        )}

        {/* Rótulos decorativos */}
        {layers.labels && (
          <g
            aria-hidden
            fontFamily="var(--font-crimson), serif"
            fontStyle="italic"
            fill="#5c4a33"
            textAnchor="middle"
            stroke="#e8d6ae"
            strokeWidth={regionSize / 5}
            paintOrder="stroke"
          >
            {DECOR_LABELS.map((l) => (
              <text
                key={l.nome}
                x={l.x}
                y={l.y}
                fontSize={regionSize}
                transform={l.rotate ? `rotate(${l.rotate} ${l.x} ${l.y})` : undefined}
              >
                {l.nome.split("\n").map((line, i) => (
                  <tspan key={i} x={l.x} dy={i === 0 ? 0 : regionSize * 1.05}>
                    {line}
                  </tspan>
                ))}
              </text>
            ))}
          </g>
        )}

        {/* Regiões clicáveis */}
        <g fontFamily="var(--font-crimson), serif" fontStyle="italic" textAnchor="middle">
          {REGION_PLACES.map((r) => {
            const isSel = selectedId === r.id;
            return (
              <text
                key={r.id}
                x={r.x}
                y={r.y}
                fontSize={regionSize * 1.08}
                fontWeight={isSel ? 700 : 500}
                fill={isSel ? "#8a5a12" : "#4a3a26"}
                stroke="#e8d6ae"
                strokeWidth={regionSize / 5}
                paintOrder="stroke"
                transform={r.rotate ? `rotate(${r.rotate} ${r.x} ${r.y})` : undefined}
                className="cursor-pointer"
                onClick={() => select(r.id)}
              >
                {r.nome.split("\n").map((line, i) => (
                  <tspan key={i} x={r.x} dy={i === 0 ? 0 : regionSize * 1.1}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}
        </g>

        {/* Cidades */}
        <g fontFamily="var(--font-cinzel), serif">
          {CITIES.map((c) => {
            const isSel = selectedId === c.id;
            const added = addedIds.has(c.id);
            const r = 5.5 / Math.pow(z, 0.75);
            const lx = c.anchor === "right" ? c.x + r + 4 / z : c.x - r - 4 / z;
            const isBH = c.id === "belo-horizonte";
            return (
              <g key={c.id} className="cursor-pointer" onClick={() => select(c.id)}>
                {isSel && <circle cx={c.x} cy={c.y} r={r * 2.4} fill="#d1ab55" fillOpacity="0.35" />}
                {isBH ? (
                  /* Distintivo de xerife da capital, como no mapa oficial */
                  <g transform={`translate(${c.x} ${c.y}) scale(${(r / 5.5) * 1.15})`}>
                    <circle r={9} fill="#f2e6cf" stroke="#2b1e12" strokeWidth={1.4} />
                    {Array.from({ length: 6 }, (_, k) => {
                      const a = (k * Math.PI) / 3 - Math.PI / 2;
                      return (
                        <circle
                          key={k}
                          cx={Math.cos(a) * 9}
                          cy={Math.sin(a) * 9}
                          r={1.9}
                          fill={isSel ? "#c9a23f" : "#2b1e12"}
                        />
                      );
                    })}
                    <circle r={6.4} fill="none" stroke="#2b1e12" strokeWidth={0.9} />
                    <text
                      y={2.6}
                      textAnchor="middle"
                      fontSize={6.4}
                      fontWeight={900}
                      fill={isSel ? "#8a5a12" : "#2b1e12"}
                      stroke="none"
                    >
                      BH
                    </text>
                  </g>
                ) : (
                  <circle
                    cx={c.x} cy={c.y} r={r}
                    fill={isSel ? "#c9a23f" : added ? "#8a5a12" : "#f2e6cf"}
                    stroke="#2b1e12" strokeWidth={1.6} vectorEffect="non-scaling-stroke"
                  />
                )}
                <text
                  x={lx} y={c.y + citySize * 0.35}
                  fontSize={citySize} fontWeight={700}
                  textAnchor={c.anchor === "right" ? "start" : "end"}
                  fill={isSel ? "#8a5a12" : "#2b1e12"}
                  stroke="#ead9b8" strokeWidth={citySize / 5} paintOrder="stroke"
                  style={{ letterSpacing: "0.04em" }}
                >
                  {c.nome}
                </text>
              </g>
            );
          })}
        </g>

        {/* Pinos do Juiz */}
        <g fontFamily="var(--font-cinzel), serif">
          {pins.map((p) => {
            const isSel = selectedPinId === p.id;
            const s = pinScale;
            return (
              <g
                key={p.id}
                className="cursor-pointer"
                onClick={() => selectPin(p.id)}
                transform={`translate(${p.x} ${p.y}) scale(${s})`}
              >
                {isSel && <circle cy={-11} r={16} fill="#d1ab55" fillOpacity="0.3" />}
                <path
                  d="M0,0 C-7,-9 -9,-13 -9,-17 A9,9 0 1 1 9,-17 C9,-13 7,-9 0,0 Z"
                  fill={isSel ? "#c9a23f" : "#8a5a12"}
                  stroke="#2b1e12"
                  strokeWidth="1.4"
                />
                <circle cy={-16.5} r={3.4} fill="#f2e6cf" stroke="#2b1e12" strokeWidth="1" />
              </g>
            );
          })}
          {pins.map((p) => (
            <text
              key={`lbl-${p.id}`}
              x={p.x}
              y={p.y + citySize * 1.1}
              fontSize={citySize * 0.92}
              fontWeight={700}
              textAnchor="middle"
              fill="#6e4a10"
              stroke="#ead9b8"
              strokeWidth={citySize / 5}
              paintOrder="stroke"
              className="cursor-pointer"
              onClick={() => selectPin(p.id)}
            >
              {p.nome}
            </text>
          ))}
        </g>

        {/* Rosa dos ventos de 16 pontas (como no mapa oficial) */}
        <g transform="translate(716 585)" aria-hidden>
          {Array.from({ length: 8 }, (_, k) => (
            <path
              key={`m-${k}`}
              d="M0,-30 L5,-7 L0,-11 L-5,-7 Z"
              transform={`rotate(${k * 45 + 22.5})`}
              fill="#2b1e12"
              fillOpacity="0.55"
            />
          ))}
          <path d="M0,-72 L10,-10 L0,-18 L-10,-10 Z" fill="#2b1e12" />
          <path d="M0,72 L10,10 L0,18 L-10,10 Z" fill="#2b1e12" fillOpacity="0.9" />
          <path d="M-64,0 L-10,-10 L-18,0 L-10,10 Z" fill="#2b1e12" fillOpacity="0.9" />
          <path d="M64,0 L10,-10 L18,0 L10,10 Z" fill="#2b1e12" fillOpacity="0.9" />
          {Array.from({ length: 4 }, (_, k) => (
            <path
              key={`d-${k}`}
              d="M0,-44 L7,-9 L0,-14 L-7,-9 Z"
              transform={`rotate(${k * 90 + 45})`}
              fill="#2b1e12"
              fillOpacity="0.75"
            />
          ))}
          <circle r="9" fill="#ead9b8" stroke="#2b1e12" strokeWidth="2.2" />
          <circle r="4" fill="none" stroke="#2b1e12" strokeWidth="1.2" />
          <text y="-78" textAnchor="middle" fontFamily="var(--font-cinzel), serif" fontWeight={900} fontSize="15" fill="#2b1e12">N</text>
        </g>

        {/* Cartucho do título */}
        <g transform="translate(878 646) rotate(-2)" aria-hidden>
          <path
            d="M-118,-34 C-80,-44 -20,-40 30,-42 C80,-44 112,-36 118,-24 C124,-10 114,8 118,22 C110,36 60,40 10,42 C-46,44 -100,40 -114,30 C-124,18 -112,2 -120,-12 Z"
            fill="#f4ead2" stroke="#b39b6e" strokeWidth="1.5"
          />
          <text textAnchor="middle" fontFamily="var(--font-cinzel), serif" fontWeight={900} fill="#241a10">
            <tspan x="0" y="-6" fontSize="26" style={{ letterSpacing: "0.06em" }}>O OESTE</tspan>
            <tspan x="0" y="24" fontSize="26" style={{ letterSpacing: "0.06em" }}>SELVAGEM</tspan>
          </text>
        </g>

        {/* Moldura cartográfica dupla */}
        <g fill="none" stroke="#4a3a26" pointerEvents="none">
          <rect x="4" y="4" width={W - 8} height={H - 8} strokeWidth="2.2" strokeOpacity="0.7" />
          <rect x="11" y="11" width={W - 22} height={H - 22} strokeWidth="0.8" strokeOpacity="0.5" />
        </g>
      </svg>

      {/* Grão de papel (estático, barato) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 180 180\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: "180px 180px",
        }}
      />
      {/* Vinheta de borda queimada */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 60px rgba(90,64,30,0.35)" }}
      />

      {/* Busca */}
      <div className="absolute left-3 top-3 w-[min(15rem,60%)]">
        <div className="arcana-glass rounded-xl">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            placeholder="Buscar lugar..."
            className="w-full bg-transparent px-3 py-2 font-crimson text-sm text-arcana-text outline-none placeholder:text-arcana-text-dim"
          />
        </div>
        {searchOpen && results.length > 0 && (
          <div className="arcana-glass mt-1.5 overflow-hidden rounded-xl">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  flyTo(r.x, r.y, 380);
                  setSelectedPinId(null);
                  setSelectedId(r.id);
                  setQuery("");
                  setSearchOpen(false);
                }}
                className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-arcana-gold/10"
              >
                <span className="truncate font-crimson text-sm text-arcana-text">{r.nome}</span>
                <span className="shrink-0 font-cinzel text-[9px] uppercase tracking-[0.2em] text-arcana-text-dim">
                  {r.tipo}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom + camadas */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
        <button
          type="button"
          title="Aproximar"
          onClick={() => zoomCenter(1 / 1.35)}
          className="arcana-glass flex h-9 w-9 items-center justify-center rounded-xl font-cinzel text-sm text-arcana-text transition-colors hover:text-arcana-gold"
        >
          +
        </button>
        <button
          type="button"
          title="Afastar"
          onClick={() => zoomCenter(1.35)}
          className="arcana-glass flex h-9 w-9 items-center justify-center rounded-xl font-cinzel text-sm text-arcana-text transition-colors hover:text-arcana-gold"
        >
          −
        </button>
        <button
          type="button"
          title="Ver o mapa inteiro"
          onClick={resetView}
          className="arcana-glass flex h-9 w-9 items-center justify-center rounded-xl font-cinzel text-sm text-arcana-text transition-colors hover:text-arcana-gold"
        >
          ⌂
        </button>
        <button
          type="button"
          onClick={() => setLayersOpen((v) => !v)}
          aria-expanded={layersOpen}
          title="Camadas"
          className={[
            "arcana-glass flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
            layersOpen ? "text-arcana-gold" : "text-arcana-text hover:text-arcana-gold",
          ].join(" ")}
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M12 3 3 8l9 5 9-5-9-5z" />
            <path d="M3 12.5 12 17.5l9-5" />
          </svg>
        </button>
        {layersOpen && (
          <div className="arcana-glass w-44 rounded-xl p-2">
            {(
              [
                ["labels", "Rótulos do mundo"],
                ["roads", "Estradas & ferrovias"],
                ["terrain", "Terreno & relevo"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-arcana-gold/10"
              >
                <span className="font-crimson text-[13px] text-arcana-text">{label}</span>
                <span
                  className={[
                    "h-3 w-3 rotate-45 rounded-[2px] border transition-colors",
                    layers[key] ? "border-arcana-gold-bright bg-arcana-gold" : "border-arcana-border",
                  ].join(" ")}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modo posicionar pino */}
      {placingLabel && (
        <div className="arcana-glass absolute left-1/2 top-3 flex max-w-[85%] -translate-x-1/2 items-center gap-3 rounded-full px-4 py-2">
          <span className="truncate font-crimson text-sm text-arcana-text">
            Clique no mapa para posicionar <strong className="text-arcana-gold-bright">{placingLabel}</strong>
          </span>
          {onCancelPlacing && (
            <button
              type="button"
              onClick={onCancelPlacing}
              className="shrink-0 font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-text-dim hover:text-arcana-gold"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* Carta do lugar canônico */}
      {selected && (
        <div className="arcana-glass absolute bottom-3 left-3 w-[min(21rem,calc(100%-1.5rem))] rounded-2xl p-3.5">
          <div className="flex items-start gap-3">
            {selected.imagem && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.imagem}
                alt={selected.nome}
                className="h-16 w-24 shrink-0 rounded-xl border border-arcana-border object-cover"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-cinzel text-sm font-bold uppercase tracking-[0.12em] text-arcana-gold-bright">
                  {selected.nome}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Fechar"
                  className="shrink-0 font-cinzel text-xs text-arcana-text-dim hover:text-arcana-gold"
                >
                  ✕
                </button>
              </div>
              <p className="mt-0.5 line-clamp-2 font-crimson text-[13px] leading-snug text-arcana-text-dim">
                {selected.caracteristicas}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="font-crimson text-[11px] italic text-arcana-text-dim">
              pp. {selected.paginas[0]}–{selected.paginas[1]}
            </span>
            {addedIds.has(selected.id) ? (
              <span className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-gold">
                ✓ Na campanha
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onAdd(selected.id)}
                disabled={busyId === selected.id}
                className="arcana-btn-primary arcana-btn-sm"
              >
                {busyId === selected.id ? "Adicionando..." : "Adicionar"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Carta do pino do Juiz */}
      {selectedPin && (
        <div className="arcana-glass absolute bottom-3 left-3 w-[min(21rem,calc(100%-1.5rem))] rounded-2xl p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-cinzel text-sm font-bold uppercase tracking-[0.12em] text-arcana-gold-bright">
              📍 {selectedPin.nome}
            </p>
            <button
              type="button"
              onClick={() => setSelectedPinId(null)}
              aria-label="Fechar"
              className="shrink-0 font-cinzel text-xs text-arcana-text-dim hover:text-arcana-gold"
            >
              ✕
            </button>
          </div>
          {selectedPin.descricao && (
            <p className="mt-1 line-clamp-2 font-crimson text-[13px] leading-snug text-arcana-text-dim">
              {selectedPin.descricao}
            </p>
          )}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="font-cinzel text-[9px] uppercase tracking-[0.2em] text-arcana-text-dim">
              Lugar da campanha
            </span>
            {onRemovePin && (
              <button
                type="button"
                onClick={() => {
                  onRemovePin(selectedPin.id);
                  setSelectedPinId(null);
                }}
                className="arcana-btn-danger arcana-btn-sm"
              >
                Remover pino
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
