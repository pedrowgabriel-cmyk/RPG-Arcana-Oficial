// Céu do mapa: nuvens em três camadas (cúmulos baixos, médias e cirros altos),
// chuva e relâmpagos. O tempo vem do Juiz (lib/mapa/clima.ts) e muda aos poucos.
// Cada nuvem tem um limiar: quanto mais coberto o céu, mais delas aparecem.

import * as THREE from "three";
import { CLIMA_PADRAO, aproximarClima, tempoEm, tufoes, type Clima, type Tempo } from "@/lib/mapa/clima";
import { ALTURA_MAPA, LARGURA_MAPA, METROS_POR_UNIDADE_DO_MAPA } from "@/lib/mapa/lugares";
import type { Ponto } from "@/lib/mapa/tipos";

const M = METROS_POR_UNIDADE_DO_MAPA;
const MAPA_X = LARGURA_MAPA * M * 1.3;
const MAPA_Z = ALTURA_MAPA * M * 1.3;

type Camada = {
  quantas: number;
  altura: [number, number];
  tamanho: [number, number];
  achatar: number;
  velocidade: number;
  /** Distância da câmera em que a camada entra (de, até). */
  aparece: [number, number];
  opacidade: number;
  cirro: boolean;
  /** Lado do quadro que acompanha a câmera; sem ele a camada cobre o mapa inteiro. */
  quadro?: number;
};

// As três primeiras andam com a câmera (densidade igual em qualquer lugar); a última cobre o mapa visto de longe.
const CAMADAS: Camada[] = [
  { quantas: 150, altura: [950, 1250], tamanho: [420, 1300], achatar: 0.62, velocidade: 1, aparece: [1300, 3800], opacidade: 0.92, cirro: false, quadro: 11_000 },
  { quantas: 80, altura: [1700, 2150], tamanho: [900, 2300], achatar: 0.55, velocidade: 1.6, aparece: [2400, 6500], opacidade: 0.78, cirro: false, quadro: 22_000 },
  { quantas: 45, altura: [3300, 3700], tamanho: [2600, 6500], achatar: 0.24, velocidade: 2.7, aparece: [4500, 13000], opacidade: 0.5, cirro: true, quadro: 48_000 },
  { quantas: 120, altura: [1300, 1900], tamanho: [2600, 6200], achatar: 0.5, velocidade: 1.2, aparece: [16_000, 40_000], opacidade: 0.8, cirro: false },
];

const CORTINAS = 60;
const GOTAS = 1600;
const CAIXA_DA_CHUVA = 170;
/** Velocidade visual do vento em m/s: exagerada, senão nada se mexe vendo de cima. */
const VENTO_BASE = 22;
const VENTO_FORTE = 260;
/** Quanto maior, mais rápido o céu alcança o que o Juiz pediu. */
const RESPOSTA_DO_CEU = 0.6;

function prng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cúmulo: bolhas com o topo claro e a base mais escura, como nuvem vista de lado. */
function texturaDeCumulo(seed: number) {
  const lado = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = lado;
  const c = canvas.getContext("2d")!;
  const r = prng(seed);
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.pow(r(), 0.75) * lado * 0.3;
    const [x, y] = [lado / 2 + Math.cos(a) * d * 1.3, lado / 2 + Math.sin(a) * d * 0.6 - lado * 0.04];
    const raio = lado * (0.08 + r() * 0.13);
    const luz = Math.round(255 - Math.max(0, (y - lado * 0.42) * 0.9));
    const g = c.createRadialGradient(x, y - raio * 0.3, 0, x, y, raio);
    g.addColorStop(0, `rgba(${luz},${luz},${Math.min(255, luz + 6)},0.32)`);
    g.addColorStop(0.65, `rgba(${luz - 14},${luz - 12},${luz - 4},0.12)`);
    g.addColorStop(1, "rgba(220,226,232,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, lado, lado);
  }
  return new THREE.CanvasTexture(canvas);
}

/** Cirro: fiapos compridos e finos. */
function texturaDeCirro(seed: number) {
  const [w, h] = [512, 128];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;
  const r = prng(seed);
  c.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const y = h / 2 + (r() - 0.5) * h * 0.6;
    const x = r() * w * 0.4;
    c.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`;
    c.lineWidth = 2 + r() * 9;
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x + w * 0.2, y - 10 * r(), x + w * 0.35, y + 12 * r(), x + w * (0.4 + r() * 0.2), y);
    c.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

/** Cortina de chuva vista de longe: faixas verticais que somem embaixo. */
function texturaDeCortina() {
  const [w, h] = [128, 256];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;
  const r = prng(3);
  for (let i = 0; i < 90; i++) {
    const x = w * (0.15 + r() * 0.7);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(150,160,172,0.22)");
    g.addColorStop(1, "rgba(150,160,172,0)");
    c.strokeStyle = g;
    c.lineWidth = 1 + r() * 3;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x - 8, h * (0.6 + r() * 0.4));
    c.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

type Puff = {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  camada: number;
  x: number;
  z: number;
  y: number;
  largura: number;
  limiar: number;
  fase: number;
  peso: number;
  chuva: number;
};

/** Tempo no lugar da câmera, para a luz e a neblina da cena. */
export type CeuLocal = Tempo & { relampago: number };

const embrulhar = (v: number, l: number) => ((((v + l / 2) % l) + l) % l) - l / 2;

export class Nuvens {
  grupo = new THREE.Group();
  ativo = false;
  private puffs: Puff[] = [];
  private cortinas: THREE.Sprite[] = [];
  private gotas: THREE.LineSegments;
  private posGotas = new Float32Array(GOTAS * 6);
  private deriva = CAMADAS.map(() => ({ x: 0, z: 0 }));
  private giros = new Map<string, number>();
  private exibido: Clima = CLIMA_PADRAO;
  private pedido: Clima = CLIMA_PADRAO;
  private relampago = 0;
  private tempo = 0;
  private r = prng(77);

  constructor() {
    const cumulos = [texturaDeCumulo(5), texturaDeCumulo(17), texturaDeCumulo(29), texturaDeCumulo(41)];
    const cirros = [texturaDeCirro(7), texturaDeCirro(19)];
    for (const t of [...cumulos, ...cirros]) t.colorSpace = THREE.SRGBColorSpace;
    const r = prng(41);

    CAMADAS.forEach((c, camada) => {
      for (let i = 0; i < c.quantas; i++) {
        const material = new THREE.SpriteMaterial({
          map: c.cirro ? cirros[i % 2] : cumulos[i % 4],
          transparent: true,
          depthWrite: false,
          fog: false,
          opacity: 0,
        });
        const sprite = new THREE.Sprite(material);
        sprite.renderOrder = 20 + camada;
        this.puffs.push({
          sprite,
          material,
          camada,
          x: (r() - 0.5) * (c.quadro ?? MAPA_X),
          z: (r() - 0.5) * (c.quadro ?? MAPA_Z),
          y: c.altura[0] + r() * (c.altura[1] - c.altura[0]),
          largura: c.tamanho[0] + r() * (c.tamanho[1] - c.tamanho[0]),
          limiar: r(),
          fase: r() * Math.PI * 2,
          peso: 0,
          chuva: 0,
        });
        this.grupo.add(sprite);
      }
    });

    const cortina = texturaDeCortina();
    for (let i = 0; i < CORTINAS; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cortina, transparent: true, depthWrite: false, opacity: 0 }));
      s.renderOrder = 19;
      this.cortinas.push(s);
      this.grupo.add(s);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.posGotas, 3).setUsage(THREE.DynamicDrawUsage));
    this.gotas = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: "#c9d3dc", transparent: true, opacity: 0.55, fog: false }));
    this.gotas.frustumCulled = false;
    for (let i = 0; i < GOTAS; i++) this.posGotas[i * 6 + 1] = -1e6;
    this.grupo.add(this.gotas);
  }

  /** O que o Juiz pediu. O céu chega lá aos poucos. */
  definir(clima: Clima) {
    this.pedido = clima;
  }

  atualizar(dt: number, distancia: number, alvo: THREE.Vector3, origem: Ponto): CeuLocal {
    this.tempo += dt;
    this.exibido = aproximarClima(this.exibido, this.pedido, 1 - Math.exp(-dt * RESPOSTA_DO_CEU));
    const clima = this.exibido;
    const local = tempoEm(clima, (alvo.x + origem.x) / M + LARGURA_MAPA / 2, (alvo.z + origem.z) / M + ALTURA_MAPA / 2);

    const rumo = (clima.ventoDirecao * Math.PI) / 180;
    const [vx, vz] = [Math.sin(rumo), -Math.cos(rumo)];
    const velocidade = VENTO_BASE + VENTO_FORTE * clima.geral.vento;
    CAMADAS.forEach((c, i) => {
      this.deriva[i].x += vx * velocidade * c.velocidade * dt;
      this.deriva[i].z += vz * velocidade * c.velocidade * dt;
    });

    const centros = tufoes(clima).map((t) => {
      const giro = (this.giros.get(t.id) ?? 0) + dt * (0.04 + 0.16 * t.forca);
      this.giros.set(t.id, giro);
      return { x: (t.mx - LARGURA_MAPA / 2) * M, z: (t.my - ALTURA_MAPA / 2) * M, raio: t.raio * M, giro, forca: t.forca };
    });

    const entrada = CAMADAS.map((c) => THREE.MathUtils.smoothstep(distancia, c.aparece[0], c.aparece[1]));
    let algum = false;
    for (const p of this.puffs) {
      const c = CAMADAS[p.camada];
      if (!entrada[p.camada]) {
        p.sprite.visible = false;
        p.peso = 0;
        continue;
      }
      // Posição presa ao mundo; o quadro só decide qual cópia dela fica perto da câmera.
      const [lx, lz] = c.quadro ? [c.quadro, c.quadro] : [MAPA_X, MAPA_Z];
      const [cx, cz] = c.quadro ? [alvo.x + origem.x, alvo.z + origem.z] : [0, 0];
      let x = cx + embrulhar(p.x + this.deriva[p.camada].x - cx, lx);
      let z = cz + embrulhar(p.z + this.deriva[p.camada].z - cz, lz);
      const borda = c.quadro ? 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(x - cx), Math.abs(z - cz)), c.quadro * 0.36, c.quadro * 0.5) : 1;
      for (const t of centros) {
        const d = Math.hypot(x - t.x, z - t.z);
        if (d > t.raio) continue;
        // Espiral: gira mais rápido perto do olho e puxa para dentro.
        const perto = 1 - d / t.raio;
        const ang = t.giro * (0.6 + perto * 2.4) * (c.cirro ? 0.5 : 1);
        const [s, co] = [Math.sin(ang), Math.cos(ang)];
        const [dx, dz] = [x - t.x, z - t.z];
        const encolhe = 1 - 0.25 * perto * t.forca;
        x = t.x + (dx * co - dz * s) * encolhe;
        z = t.z + (dx * s + dz * co) * encolhe;
      }
      const tempo = tempoEm(clima, x / M + LARGURA_MAPA / 2, z / M + ALTURA_MAPA / 2);
      const cobertura = c.cirro ? 0.25 + tempo.nuvens * 0.6 - tempo.tempestade * 0.4 : tempo.nuvens;
      p.peso = THREE.MathUtils.smoothstep(cobertura, p.limiar - 0.12, p.limiar + 0.08);
      p.chuva = tempo.chuva;
      const opacidade = p.peso * c.opacidade * entrada[p.camada] * borda;
      p.sprite.visible = opacidade > 0.01;
      if (!p.sprite.visible) continue;
      algum = true;
      const escuro = c.cirro ? tempo.tempestade * 0.3 : Math.min(0.82, tempo.tempestade * 0.75 + tempo.chuva * 0.35);
      const luz = 1 - escuro * 0.68 + this.relampago * 0.5;
      p.material.color.setRGB(luz, luz * 1.01, luz * 1.04);
      p.material.opacity = opacidade;
      const respira = 1 + 0.06 * Math.sin(p.fase + this.tempo * 0.25);
      // A camada larga cresce com a distância, senão vira pontinho no zoom máximo.
      const longe = c.quadro ? 1 : 1 + THREE.MathUtils.smoothstep(distancia, 40_000, 110_000) * 1.6;
      const tamanho = p.largura * respira * longe * (1 + tempo.tempestade * 0.35);
      p.sprite.scale.set(tamanho, tamanho * c.achatar, 1);
      p.sprite.position.set(x - origem.x, p.y, z - origem.z);
    }

    // Cortinas presas às primeiras nuvens baixas que estão chovendo.
    const deLonge = THREE.MathUtils.smoothstep(distancia, 1800, 4500);
    for (let i = 0; i < CORTINAS; i++) {
      const p = this.puffs[i];
      const s = this.cortinas[i];
      const forca = p.sprite.visible ? p.peso * THREE.MathUtils.smoothstep(p.chuva, 0.2, 0.7) * deLonge : 0;
      s.visible = forca > 0.02;
      if (!s.visible) continue;
      (s.material as THREE.SpriteMaterial).opacity = forca * 0.6;
      s.scale.set(p.largura * 0.55, p.y, 1);
      s.position.set(p.sprite.position.x, p.y / 2, p.sprite.position.z);
    }

    const pingos = distancia < 2600 ? Math.floor(local.chuva * GOTAS) : 0;
    this.chover(dt, pingos, alvo, vx * (3 + 14 * local.vento), vz * (3 + 14 * local.vento));

    if (local.tempestade > 0.4 && this.r() < dt * local.tempestade * 0.45) this.relampago = 1;
    this.relampago *= Math.exp(-dt * 7);

    this.ativo = algum || pingos > 0 || this.relampago > 0.02;
    return { ...local, relampago: this.relampago };
  }

  private chover(dt: number, quantas: number, alvo: THREE.Vector3, vx: number, vz: number) {
    this.gotas.visible = quantas > 0;
    if (!quantas) return;
    const a = this.posGotas;
    const queda = 26;
    for (let i = 0; i < quantas; i++) {
      const k = i * 6;
      if (a[k + 1] < alvo.y - 10 || Math.abs(a[k] - alvo.x) > CAIXA_DA_CHUVA || Math.abs(a[k + 2] - alvo.z) > CAIXA_DA_CHUVA) {
        a[k] = alvo.x + (this.r() - 0.5) * CAIXA_DA_CHUVA * 2;
        a[k + 1] = alvo.y + 20 + this.r() * 140;
        a[k + 2] = alvo.z + (this.r() - 0.5) * CAIXA_DA_CHUVA * 2;
      } else {
        a[k] += vx * dt;
        a[k + 1] -= queda * dt;
        a[k + 2] += vz * dt;
      }
      a[k + 3] = a[k] - vx * 0.12;
      a[k + 4] = a[k + 1] + 3.2;
      a[k + 5] = a[k + 2] - vz * 0.12;
    }
    this.gotas.geometry.setDrawRange(0, quantas * 2);
    (this.gotas.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
