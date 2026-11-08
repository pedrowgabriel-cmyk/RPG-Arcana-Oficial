// Árvore do cerrado (pequi, barbatimão, pau-terra, lixeira): baixa e torta,
// tronco de casca grossa e cortiçosa, clara e rachada, que já passou por muito
// fogo; galhos em zigue-zague que se abrem para os lados e uma copa rala de
// folha coriácea verde-oliva, em tufos nas pontas, com o céu aparecendo no meio.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, caminho, cartao, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial, Nivel } from "../tipos";
import { enrugar, ocluir, reamostrar } from "./_quentes";

const CASCA = "#b3a386";
const CASCA_ESCURA = "#8c7c64";
const QUEIMADA = "#2a2420";
const FOLHA = "#7c8a4c";
const FOLHA_SECA = "#a8884a";
const FOLHA_CHAMUSCADA = "#6a4a2c";

type Galho = { pontos: THREE.Vector3[]; raios: number[]; ponta: THREE.Vector3; ordem: number };
type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

/** Galho em zigue-zague: muda de rumo em cotovelos, como galho que perdeu a ponta e rebrotou de lado. */
function zigue(de: THREE.Vector3, rumo: number, subida: number, comp: number, cotovelos: number, r: () => number) {
  const pts = [de.clone()];
  let a = rumo;
  let s = subida;
  const passo = comp / cotovelos;
  for (let i = 0; i < cotovelos; i++) {
    a += (r() - 0.5) * 1.3;
    s = Math.max(-0.15, Math.min(1.1, s + (r() - 0.5) * 0.7));
    const ult = pts[pts.length - 1];
    pts.push(ult.clone().add(new THREE.Vector3(Math.cos(a) * Math.cos(s), Math.sin(s), Math.sin(a) * Math.cos(s)).multiplyScalar(passo * (0.7 + r() * 0.6))));
  }
  return pts;
}

function esqueleto(r: () => number, altura: number, nivel: Nivel) {
  const galhos: Galho[] = [];
  const raioTronco = altura * (0.055 + r() * 0.02);
  // Tronco curto e inclinado, que às vezes bifurca baixo.
  const incl = r() * Math.PI * 2;
  const alturaDoFuste = altura * (0.3 + r() * 0.2);
  const fim = new THREE.Vector3(Math.cos(incl) * altura * (0.08 + r() * 0.12), alturaDoFuste, Math.sin(incl) * altura * (0.08 + r() * 0.12));
  const fuste = caminho(new THREE.Vector3(0, 0, 0), fim, nivel === 0 ? 6 : 3, altura * 0.12, r);
  galhos.push({ pontos: fuste, raios: fuste.map((_, i) => raioTronco * (1.35 - (i / (fuste.length - 1)) * 0.5) * (i === 0 ? 1.15 : 1)), ponta: fim, ordem: 0 });

  const principais = nivel === 0 ? 3 + Math.floor(r() * 3) : 3;
  for (let i = 0; i < principais; i++) {
    const rumo = (i / principais) * Math.PI * 2 + (r() - 0.5) * 0.9;
    const comp = altura * (0.4 + r() * 0.3);
    const pts = zigue(fim, rumo, 0.35 + r() * 0.5, comp, nivel === 0 ? 4 : 2, r);
    const r0 = raioTronco * (0.55 + r() * 0.2);
    galhos.push({ pontos: pts, raios: pts.map((_, k) => r0 * (1 - (k / pts.length) * 0.75)), ponta: pts[pts.length - 1], ordem: 1 });
    if (nivel > 0) continue;
    // Raminhos tortos saindo dos cotovelos.
    for (let s = 1; s < pts.length - 1; s++) {
      if (r() < 0.3) continue;
      const sub = zigue(pts[s], rumo + (r() - 0.5) * 2.2, 0.2 + r() * 0.6, altura * (0.12 + r() * 0.14), 2, r);
      galhos.push({ pontos: sub, raios: sub.map((_, k) => r0 * 0.38 * (1 - (k / sub.length) * 0.75)), ponta: sub[sub.length - 1], ordem: 2 });
    }
  }
  return { galhos, raioTronco };
}

const modelo: Modelo = {
  id: "arvore-cerrado",
  nome: "Árvore do cerrado (pequi, barbatimão)",
  variacoes: 6,
  altura: [3.5, 7],
  raio: 3,
  estados: ["seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(7700 + variacao * 89);
    const altura = 3.5 + r() * 3.5;
    const queimada = !!estado.queimada;
    const seca = !!estado.seca;
    const lista: Lista = [];

    if (nivel === 2) {
      const ang = r() * Math.PI * 2;
      const topo = new THREE.Vector3(Math.cos(ang) * 0.4, altura * 0.6, Math.sin(ang) * 0.4);
      const pe = tubo([new THREE.Vector3(0, 0, 0), topo], [altura * 0.07, altura * 0.05], 4);
      lista.push({ material: "casca-clara", geometria: tingir(pe, queimada ? QUEIMADA : CASCA, 0.1, variacao) });
      if (!queimada) {
        // Copa rala: duas massas baixas e largas, desencontradas.
        for (let i = 0; i < 2; i++) {
          const m = bolha(altura * (0.24 - i * 0.05), 0, 0.3, variacao + i, 0.45).translate(topo.x + (i ? 1 : -0.6) * altura * 0.18, altura * (0.66 - i * 0.06), topo.z + (i ? -0.5 : 0.4) * altura * 0.14);
          lista.push({ material: "musgo", geometria: tingir(m, seca ? FOLHA_SECA : FOLHA, 0.12, variacao) });
        }
      }
      return pecas(lista);
    }

    const { galhos } = esqueleto(r, altura, nivel);
    for (const g of galhos) {
      const fino = g.raios[0] < 0.06;
      // Tronco e galhos grossos: curva suave e anéis curtos, para a casca enrugar sem facetar.
      let pts = g.pontos;
      let raios = g.raios;
      if (nivel === 0 && g.ordem < 2) {
        pts = reamostrar(g.pontos, 0.22);
        raios = pts.map((_, k) => {
          const f = (k / (pts.length - 1)) * (g.raios.length - 1);
          const i = Math.min(g.raios.length - 2, Math.floor(f));
          return g.raios[i] + (g.raios[i + 1] - g.raios[i]) * (f - i);
        });
      }
      const t = tubo(pts, raios, fino ? 4 : nivel === 0 ? 9 : 5, g.ordem === 2 || fino);
      // Casca cortiçosa: o tronco e os galhos grossos ganham rugas.
      if (nivel === 0 && g.ordem < 2) enrugar(t, g.raios[0] * 0.07, 14, variacao + g.ordem);
      tingir(t, queimada ? QUEIMADA : g.ordem === 0 ? CASCA : CASCA_ESCURA, 0.28, variacao * 3, queimada ? 0.2 : 0.4, 1.2);
      lista.push({ material: queimada ? "carvao" : "casca-clara", geometria: t });
    }

    // Tufos de folha só nas pontas: copa rala, céu passando entre os tufos.
    const tufos = galhos.filter((g) => g.ordem > 0);
    const porPonta = queimada ? (nivel === 0 ? 1 : 0) : nivel === 0 ? (seca ? 2 : 7) : 2;
    const tam = altura * (nivel === 0 ? 0.2 : 0.32);
    const centroCopa = new THREE.Vector3(0, altura * 0.7, 0);
    for (const g of tufos) {
      // Queimada: só alguns galhos guardam folha chamuscada.
      if (queimada && r() > 0.35) continue;
      for (let i = 0; i < porPonta; i++) {
        const c = g.ponta.clone().add(new THREE.Vector3((r() - 0.5) * tam * 0.9, (r() - 0.2) * tam * 0.5, (r() - 0.5) * tam * 0.9));
        const normal = new THREE.Vector3((r() - 0.5) * 0.8, 0.8 + r() * 0.5, (r() - 0.5) * 0.8).normalize();
        const f = cartao(c, tam * (0.8 + r() * 0.5), tam * (0.7 + r() * 0.4), normal, r() * Math.PI * 2, ATLAS.larga);
        tingir(f, queimada ? FOLHA_CHAMUSCADA : seca ? FOLHA_SECA : FOLHA, 0.25, variacao + 7, 0.45, altura);
        lista.push({ material: "folhagem", geometria: ocluir(f, centroCopa, altura * 0.3, 0.2) });
      }
    }
    // Pequi/frutinho: umas poucas bolinhas verdes penduradas nas pontas.
    if (nivel === 0 && !queimada && !seca && r() > 0.5) {
      for (const g of tufos.slice(0, 4)) {
        const c = g.ponta.clone().add(new THREE.Vector3(0, -0.15, 0));
        lista.push({ material: "casca", geometria: tingir(bolha(0.06, 0, 0.15, variacao).translate(c.x, c.y, c.z), "#76803c", 0.1, 1) });
      }
    }
    return pecas(lista);
  },
};

export default modelo;
