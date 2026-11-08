// Arbusto espinhento de caatinga (jurema-preta, catingueira na seca): vários
// caules cinza saem rente ao chão, galhos em zigue-zague que abrem em leque,
// garrancho fino nas pontas e quase nenhuma folha.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { cartao, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, Nivel } from "../tipos";
import { degradeEmV, v3, type Lista, type V } from "./_deserto-comum";

const CASCA = "#958a7d";
const QUEIMADO = "#2a2522";
const GARRANCHO = "#a59b8b";
const GARRANCHO_SECO = "#b0a28c";
const FOLHA = "#7f8a5a";

type Perfil = { altura: [number, number]; caules: [number, number]; abre: [number, number] };
const PERFIS: Perfil[] = [
  { altura: [1.8, 2.3], caules: [4, 5], abre: [0.5, 0.9] }, // vaso, galhos em leque
  { altura: [1.1, 1.4], caules: [5, 6], abre: [0.85, 1.25] }, // baixo e esparramado
  { altura: [2.3, 2.8], caules: [3, 4], abre: [0.4, 0.7] }, // alto, puxado para um lado
  { altura: [0.9, 1.2], caules: [3, 4], abre: [0.55, 0.95] }, // pequeno
];

type Galho = { pontos: V[]; raios: number[]; ordem: number };

function esqueleto(r: () => number, pf: Perfil, H: number, nivel: Nivel, variacao: number) {
  const galhos: Galho[] = [];
  const maxOrdem = nivel === 0 ? 3 : 1;
  const puxa = variacao === 2 ? v3(0.35, 0, 0.1) : v3(0, 0, 0);
  const ramo = (de: V, dir: V, comp: number, raio: number, ordem: number) => {
    const passos = [4, 3, 2, 1][ordem];
    const pts = [de.clone()];
    const d = dir.clone();
    for (let i = 0; i < passos; i++) {
      // Zigue-zague: cada nó muda de rumo, sempre tendendo a subir e abrir.
      d.applyAxisAngle(v3(0, 1, 0), (r() - 0.5) * 1.1);
      d.add(v3((r() - 0.5) * 0.7, 0.04, (r() - 0.5) * 0.7)).add(puxa.clone().multiplyScalar(0.3)).normalize();
      pts.push(pts[i].clone().addScaledVector(d, comp / passos));
    }
    galhos.push({ pontos: pts, raios: pts.map((_, k) => raio * (1 - (k / pts.length) * 0.65)), ordem });
    if (ordem >= maxOrdem) return;
    const filhos = ordem === 2 ? 2 : 2 + Math.floor(r() * 2);
    for (let f = 0; f < filhos; f++) {
      const k = 1 + Math.floor(r() * (pts.length - 1));
      const base = pts[Math.min(k, pts.length - 1)];
      const ref = pts[pts.length - 1].clone().sub(pts[0]).normalize();
      const nd = ref.clone().applyAxisAngle(v3(0, 1, 0), (r() - 0.5) * 2.4).add(v3((r() - 0.5) * 0.8, -0.05, (r() - 0.5) * 0.8)).normalize();
      ramo(base, nd, comp * (ordem === 2 ? 0.7 + r() * 0.3 : 0.5 + r() * 0.25), raio * 0.5, ordem + 1);
    }
  };
  const n = pf.caules[0] + Math.floor(r() * (pf.caules[1] - pf.caules[0] + 1));
  const a0 = r() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + i * 2.4 + (r() - 0.5) * 0.5;
    const incl = pf.abre[0] + r() * (pf.abre[1] - pf.abre[0]);
    const dir = v3(Math.cos(a) * Math.sin(incl), Math.cos(incl), Math.sin(a) * Math.sin(incl)).add(puxa).normalize();
    const de = v3(Math.cos(a) * 0.06 * r(), -0.04, Math.sin(a) * 0.06 * r());
    ramo(de, dir, H * (0.55 + r() * 0.25), 0.03 + r() * 0.025 + H * 0.006, 0);
  }
  return galhos;
}

const modelo: Modelo = {
  id: "arbusto-seco",
  nome: "Arbusto seco",
  variacoes: PERFIS.length,
  altura: [0.9, 2.9],
  raio: 1.4,
  estados: ["seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const pf = PERFIS[variacao % PERFIS.length];
    const r = sorteio(6300 + variacao * 151);
    const H = pf.altura[0] + r() * (pf.altura[1] - pf.altura[0]);
    const queimado = !!estado.queimada;
    const corCasca = queimado ? QUEIMADO : CASCA;
    const corGarrancho = queimado ? QUEIMADO : estado.seca ? GARRANCHO_SECO : GARRANCHO;
    const matCasca = queimado ? "carvao" : "casca-clara";
    const lista: Lista = [];

    if (nivel === 2) {
      lista.push({ material: matCasca, geometria: tingir(tubo([v3(0, 0, 0), v3(0, H * 0.4, 0)], [0.05, 0.03], 3), corCasca, 0.1, variacao) });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + r() * 0.4;
        const c = cartao(v3(0, H * 0.58, 0), H * 1.25, H * 0.95, v3(Math.cos(a), 0, Math.sin(a)), Math.PI, ATLAS.agulha);
        lista.push({ material: "folhagem", geometria: tingir(c, corGarrancho, 0.15, variacao, 0.4, H) });
      }
      return pecas(lista);
    }

    const galhos = esqueleto(r, pf, H, nivel, variacao);
    for (const g of galhos) {
      const lados = nivel === 0 ? [5, 4, 3, 3][g.ordem] : 3;
      const geo = tingir(tubo(g.pontos, g.raios, lados, g.ordem > 0), corCasca, 0.2, variacao + g.ordem, 0.4, H * 0.5);
      lista.push({ material: matCasca, geometria: degradeEmV(geo, H * 0.4, -0.15) });
    }

    // Garrancho fino: cartões de galharia nas pontas; folhinha miúda só fora da seca.
    const pontas = galhos.filter((g) => g.ordem === (nivel === 0 ? 3 : 1));
    const porPonta = nivel === 0 ? 0 : 2;
    const tam = H * (nivel === 0 ? 0.22 : 0.42);
    for (const g of pontas) {
      const p = g.pontos[g.pontos.length - 1];
      const meio = g.pontos[Math.floor(g.pontos.length / 2)];
      for (let i = 0; i < porPonta; i++) {
        const c = p.clone().lerp(meio, r() * 0.6).add(v3((r() - 0.5) * tam * 0.4, (r() - 0.3) * tam * 0.3, (r() - 0.5) * tam * 0.4));
        const normal = new THREE.Vector3(r() - 0.5, 0.25 + r() * 0.4, r() - 0.5).normalize();
        const geo = cartao(c, tam * (0.8 + r() * 0.5), tam * (0.7 + r() * 0.4), normal, r() * Math.PI * 2, ATLAS.agulha);
        lista.push({ material: "folhagem", geometria: tingir(geo, corGarrancho, 0.2, variacao + 5, 0.35, H) });
      }
      if (!estado.seca && !queimado && nivel === 0 && r() < 0.18) {
        const c = p.clone().add(v3((r() - 0.5) * 0.2, 0.05, (r() - 0.5) * 0.2));
        const normal = new THREE.Vector3((r() - 0.5) * 0.3, 1, (r() - 0.5) * 0.3).normalize(); // de frente para o sol: não escurece
        const geo = cartao(c, tam * 0.55, tam * 0.5, normal, r() * Math.PI * 2, ATLAS.larga);
        lista.push({ material: "folhagem", geometria: tingir(geo, FOLHA, 0.2, variacao + 9, 0.3, H) });
      }
    }
    return pecas(lista);
  },
};

export default modelo;
