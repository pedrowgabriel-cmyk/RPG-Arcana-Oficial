// Nuvens que aparecem conforme o zoom abre. Duas camadas: a regional anda junto
// com a câmera e some de longe; a do continente é fixa no mapa e fica rala.

import * as THREE from "three";
import { ALTURA_MAPA, LARGURA_MAPA, METROS_POR_UNIDADE_DO_MAPA } from "@/lib/mapa/lugares";
import type { Ponto } from "@/lib/mapa/tipos";

const LADO_REGIONAL = 70_000;
const POR_REGIAO = 54;
const POR_CONTINENTE = 110;
const ALTITUDE_REGIONAL = 3200;
const ALTITUDE_CONTINENTE = 26_000;

function prng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function texturaDeNuvem(seed: number) {
  const lado = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = lado;
  const c = canvas.getContext("2d")!;
  const r = prng(seed);
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.pow(r(), 0.7) * lado * 0.3;
    const [x, y] = [lado / 2 + Math.cos(a) * d * 1.25, lado / 2 + Math.sin(a) * d * 0.72];
    const raio = lado * (0.09 + r() * 0.13);
    const g = c.createRadialGradient(x, y, 0, x, y, raio);
    g.addColorStop(0, "rgba(255,255,255,0.3)");
    g.addColorStop(0.6, "rgba(245,248,250,0.1)");
    g.addColorStop(1, "rgba(235,240,245,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, lado, lado);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type Puff = { sprite: THREE.Sprite; x: number; z: number };

export class Nuvens {
  grupo = new THREE.Group();
  visivel = false;
  private regional: Puff[] = [];
  private continental: Puff[] = [];
  private matRegional: THREE.SpriteMaterial[];
  private matContinente: THREE.SpriteMaterial[];
  private vento = 0;
  private distancia = 0;
  private alvo = new THREE.Vector3();
  private origem: Ponto = { x: 0, z: 0 };

  constructor() {
    const texturas = [texturaDeNuvem(5), texturaDeNuvem(17), texturaDeNuvem(29)];
    const material = (map: THREE.Texture) => new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false, fog: false, opacity: 0 });
    this.matRegional = texturas.map(material);
    this.matContinente = texturas.map(material);
    const r = prng(41);

    for (let i = 0; i < POR_REGIAO; i++) {
      const sprite = new THREE.Sprite(this.matRegional[i % 3]);
      const e = 5000 + r() * 11000;
      sprite.scale.set(e * 1.6, e, 1);
      sprite.renderOrder = 20;
      this.regional.push({ sprite, x: r() * LADO_REGIONAL, z: r() * LADO_REGIONAL });
      this.grupo.add(sprite);
    }
    const [lx, lz] = [LARGURA_MAPA * METROS_POR_UNIDADE_DO_MAPA, ALTURA_MAPA * METROS_POR_UNIDADE_DO_MAPA];
    for (let i = 0; i < POR_CONTINENTE; i++) {
      const sprite = new THREE.Sprite(this.matContinente[i % 3]);
      const e = 50_000 + r() * 130_000;
      sprite.scale.set(e * 1.7, e, 1);
      sprite.renderOrder = 20;
      this.continental.push({ sprite, x: (r() - 0.5) * lx * 1.15, z: (r() - 0.5) * lz * 1.15 });
      this.grupo.add(sprite);
    }
  }

  ajustar(distancia: number, alvo: THREE.Vector3, origem: Ponto) {
    this.distancia = distancia;
    this.alvo.copy(alvo);
    this.origem = origem;
    const perto = THREE.MathUtils.smoothstep(distancia, 2800, 11_000) * (1 - THREE.MathUtils.smoothstep(distancia, 70_000, 170_000));
    const longe = THREE.MathUtils.smoothstep(distancia, 60_000, 170_000) * (1 - 0.45 * THREE.MathUtils.smoothstep(distancia, 400_000, 1_200_000));
    for (const m of this.matRegional) m.opacity = perto * 0.6;
    for (const m of this.matContinente) m.opacity = longe * 0.8;
    this.visivel = perto + longe > 0.01;
    this.grupo.visible = this.visivel;
    if (this.visivel) this.posicionar();
  }

  soprar(metros: number) {
    this.vento += metros * 40;
    this.posicionar();
  }

  private posicionar() {
    const metade = LADO_REGIONAL / 2;
    const dobrar = (v: number) => ((v % LADO_REGIONAL) + LADO_REGIONAL) % LADO_REGIONAL;
    for (const p of this.regional) {
      const x = dobrar(p.x + this.vento - this.alvo.x) - metade;
      const z = dobrar(p.z - this.alvo.z) - metade;
      p.sprite.position.set(this.alvo.x + x, this.alvo.y + ALTITUDE_REGIONAL, this.alvo.z + z);
    }
    for (const p of this.continental) {
      p.sprite.position.set(p.x + this.vento - this.origem.x, ALTITUDE_CONTINENTE, p.z - this.origem.z);
    }
  }
}
