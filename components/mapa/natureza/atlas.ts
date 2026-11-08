// Atlas de folhagem pintado por código: quatro quadros com recorte transparente,
// usados em cartões de folha. Depois a textura feita fora entra no mesmo lugar.

import * as THREE from "three";

export type Quadro = { u0: number; v0: number; u1: number; v1: number };

/** Regiões do atlas, em UV (v cresce para cima). */
export const ATLAS: Record<"larga" | "agulha" | "fronde" | "capim", Quadro> = {
  larga: { u0: 0, v0: 0.5, u1: 0.5, v1: 1 },
  agulha: { u0: 0.5, v0: 0.5, u1: 1, v1: 1 },
  fronde: { u0: 0, v0: 0, u1: 0.5, v1: 0.5 },
  capim: { u0: 0.5, v0: 0, u1: 1, v1: 0.5 },
};

const LADO = 1024;

function sorteio(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Folha quase cinza clara: quem dá o verde, o seco ou o outono é o `tingir` do modelo. */
function tom(r: () => number, luz = 0) {
  const l = Math.min(255, 196 + r() * 50 + luz);
  return `rgb(${Math.round(l * 0.96)},${Math.round(l)},${Math.round(l * 0.9)})`;
}

function folhaLarga(c: CanvasRenderingContext2D, x: number, y: number, tam: number, ang: number, cor: string) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.fillStyle = cor;
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(tam * 0.45, -tam * 0.35, 0, -tam);
  c.quadraticCurveTo(-tam * 0.45, -tam * 0.35, 0, 0);
  c.fill();
  c.strokeStyle = "rgba(40,50,30,0.35)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -tam * 0.92);
  c.stroke();
  c.restore();
}

function pintar() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = LADO;
  const c = canvas.getContext("2d")!;
  const m = LADO / 2;
  const r = sorteio(9);

  // Larga: ramo com dezenas de folhas em volta de um centro.
  for (let i = 0; i < 520; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * m * 0.42;
    const [x, y] = [m / 2 + Math.cos(a) * d, m / 2 + Math.sin(a) * d];
    folhaLarga(c, x, y, 18 + r() * 22, a + Math.PI / 2 + (r() - 0.5), tom(r, (1 - d / (m * 0.42)) * 20));
  }

  // Agulha: galho de pinheiro, eixo com agulhas em leque.
  c.save();
  c.translate(m, 0);
  for (let g = 0; g < 7; g++) {
    const [bx, by] = [m * (0.2 + r() * 0.6), m * (0.15 + g * 0.11)];
    const comp = m * (0.25 + r() * 0.2);
    const ang = (r() - 0.5) * 0.8;
    for (let k = 0; k < 90; k++) {
      const t = k / 90;
      const [px, py] = [bx + Math.cos(ang) * comp * (t - 0.5), by + Math.sin(ang) * comp * (t - 0.5)];
      c.strokeStyle = tom(r, -30);
      c.lineWidth = 2;
      for (const lado of [-1, 1]) {
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + Math.cos(ang + lado * 1.1) * (14 + r() * 10) * (1 - Math.abs(t - 0.5)), py + Math.sin(ang + lado * 1.1) * (14 + r() * 10));
        c.stroke();
      }
    }
  }
  c.restore();

  // Fronde: folha de palmeira, nervura curva com folíolos dos dois lados.
  c.save();
  c.translate(0, m);
  for (let k = 0; k < 120; k++) {
    const t = k / 120;
    const [px, py] = [m * 0.08 + t * m * 0.84, m * 0.5 + Math.sin(t * Math.PI) * -m * 0.08];
    const comp = Math.sin(t * Math.PI) * m * 0.32 + 6;
    c.strokeStyle = tom(r, -10);
    c.lineWidth = 3;
    for (const lado of [-1, 1]) {
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + comp * 0.35, py + lado * comp);
      c.stroke();
    }
  }
  c.strokeStyle = "rgb(120,110,70)";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(m * 0.08, m * 0.5);
  c.quadraticCurveTo(m * 0.5, m * 0.38, m * 0.92, m * 0.5);
  c.stroke();
  c.restore();

  // Capim: touceira de lâminas subindo da base.
  c.save();
  c.translate(m, m);
  for (let k = 0; k < 260; k++) {
    const bx = m * (0.3 + r() * 0.4);
    const alt = m * (0.45 + r() * 0.5);
    const curva = (r() - 0.5) * m * 0.5;
    c.strokeStyle = tom(r, 10);
    c.lineWidth = 2 + r() * 3;
    c.beginPath();
    c.moveTo(bx, m);
    c.quadraticCurveTo(bx + curva * 0.3, m - alt * 0.6, bx + curva, m - alt);
    c.stroke();
  }
  c.restore();

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

let textura: THREE.Texture | null = null;

export function texturaDoAtlas() {
  textura ??= pintar();
  return textura;
}
