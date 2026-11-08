// Xique-xique (Pilosocereus gounellei): cacto baixo de caatinga. Os ramos
// saem de um pé curto, deitam no chão em gomos, serpenteiam e levantam a
// ponta em curva; dos ramos deitados nascem outros que sobem. A ponta nova
// é coberta de lã esbranquiçada. Mais largo que alto.

import { pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, Nivel } from "../tipos";
import { bezier, coluna, tremer, v3, type Lista, type OpcoesColuna, type V } from "./_deserto-comum";

const VERDE = "#7f9a86";
const SECO = "#a39668";
const LA = "#d8d3bc";
const LA_SECA = "#bdb18e";
const QUEIMADO = "#2b2522";

type Perfil = { ramos: [number, number]; alcance: [number, number]; sobe: [number, number]; brota: number };
const PERFIS: Perfil[] = [
  { ramos: [7, 8], alcance: [0.45, 0.9], sobe: [0.2, 0.6], brota: 0.5 }, // touceira cheia
  { ramos: [5, 6], alcance: [0.25, 0.55], sobe: [0.4, 0.95], brota: 0.4 }, // de pé, mais alto
  { ramos: [8, 9], alcance: [0.6, 1.2], sobe: [0.04, 0.3], brota: 0.3 }, // esparramado rente ao chão
  { ramos: [3, 4], alcance: [0.25, 0.5], sobe: [0.15, 0.45], brota: 0.3 }, // novo
];

const modelo: Modelo = {
  id: "xique-xique",
  nome: "Xique-xique",
  variacoes: PERFIS.length,
  altura: [0.4, 1.2],
  raio: 1.3,
  estados: ["seca", "queimada"],
  gerar(variacao, nivel: Nivel, estado) {
    const pf = PERFIS[variacao % PERFIS.length];
    const r = sorteio(5200 + variacao * 173);
    const n = pf.ramos[0] + Math.floor(r() * (pf.ramos[1] - pf.ramos[0] + 1));
    const queimado = !!estado.queimada;
    const mat = queimado ? "carvao" : "cacto";
    const cor = queimado ? QUEIMADO : estado.seca ? SECO : VERDE;
    const la = queimado ? QUEIMADO : estado.seca ? LA_SECA : LA;
    const lista: Lista = [];
    const cheio = nivel === 0;

    type Ramo = { a: number; L: number; h: number; raio: number };
    const ramos: Ramo[] = [];
    const a0 = r() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const central = i === 0 && variacao !== 2; // um ramo do meio sobe logo
      ramos.push({
        a: a0 + i * 2.4 + (r() - 0.5) * 0.6,
        L: central ? 0.06 : pf.alcance[0] + r() * (pf.alcance[1] - pf.alcance[0]),
        h: central ? pf.sobe[1] * (0.9 + r() * 0.3) : pf.sobe[0] + r() * (pf.sobe[1] - pf.sobe[0]),
        raio: (0.06 + r() * 0.025) * (estado.seca ? 0.88 : 1),
      });
    }

    // Longe: raios deitados e duas pontas de pé, tubos de três lados.
    if (nivel === 2) {
      for (const b of ramos.slice(0, 6)) {
        const fim = v3(Math.cos(b.a) * b.L, b.raio, Math.sin(b.a) * b.L);
        const pts = b.h > 0.3 ? [v3(0, b.raio, 0), fim, fim.clone().setY(b.h)] : [v3(0, b.raio, 0), fim];
        lista.push({ material: mat, geometria: tingir(tubo(pts, pts.map(() => b.raio * 1.3), 3), cor, 0.1, variacao, 0.3, 0.3) });
      }
      return pecas(lista);
    }

    const op = (seed: number): OpcoesColuna => ({
      costelas: cheio ? 6 : 3,
      fundo: estado.seca ? 0.3 : 0.2,
      domo: cheio ? 2 : 1,
      cor,
      variacao: 0.18,
      seed,
      sombra: 0.4,
      alturaDaSombra: 0.4,
      sulco: queimado ? 0.1 : 0.24,
      corPonta: la,
      ponta: 0.14,
      torcao: cheio ? 0.2 : 0,
    });
    // Gomos: o ramo estreita onde emenda cada crescimento.
    const raiosGomos = (pts: V[], raio: number, gomos: number) =>
      pts.map((_, k) => {
        const t = k / (pts.length - 1);
        let f = 1 - 0.1 * t;
        if (cheio) for (let g = 1; g <= gomos; g++) f -= 0.14 * Math.exp(-Math.pow((t - g / (gomos + 1)) / 0.07, 2));
        return raio * f;
      });

    // Pé: toco curto e grosso de onde os ramos partem.
    const pe = [v3(0, -0.05, 0), v3(0.02, 0.08, 0), v3(0.03, 0.16, 0.01)];
    lista.push({ material: mat, geometria: coluna(pe, [0.13, 0.12, 0.1], { ...op(variacao + 90), domo: cheio ? 2 : 1, corPonta: undefined }) });

    const usar = cheio ? ramos : ramos.slice(0, 6);
    usar.forEach((b, i) => {
      const dir = v3(Math.cos(b.a), 0, Math.sin(b.a));
      const lado = v3(-dir.z, 0, dir.x);
      const curva = (r() - 0.5) * 0.6 * b.L;
      const y = b.raio * 0.8;
      const P0 = dir.clone().multiplyScalar(0.04).setY(b.raio * 0.6);
      const P1 = dir.clone().multiplyScalar(b.L * 0.55).addScaledVector(lado, curva).setY(y);
      const P2 = dir.clone().multiplyScalar(b.L).addScaledVector(lado, curva * 0.3).setY(y + 0.02);
      const P3 = dir.clone().multiplyScalar(b.L + 0.06 + b.h * 0.2).addScaledVector(lado, -curva * 0.2).setY(y + b.h);
      const pts = tremer(bezier([P0, P1, P2, P3], cheio ? 6 : 4), 0.025, r, true);
      lista.push({ material: mat, geometria: coluna(pts, raiosGomos(pts, b.raio, 2), op(variacao * 11 + i)) });

      // Brotação: do ramo deitado, um outro levanta quase reto.
      if (cheio && b.L > 0.3 && r() < pf.brota) {
        const de = pts[2 + Math.floor(r() * 2)].clone();
        const sai = lado.clone().multiplyScalar(r() < 0.5 ? 1 : -1);
        const alto = 0.25 + r() * (pf.sobe[1] * 0.8);
        const ctrl = [de, de.clone().addScaledVector(sai, 0.12).setY(de.y + 0.03), de.clone().addScaledVector(sai, 0.16).setY(de.y + alto)];
        const p2 = bezier(ctrl, 3);
        lista.push({ material: mat, geometria: coluna(p2, raiosGomos(p2, b.raio * 0.85, 1), op(variacao * 13 + i + 50)) });
      }
    });
    return pecas(lista);
  },
};

export default modelo;
