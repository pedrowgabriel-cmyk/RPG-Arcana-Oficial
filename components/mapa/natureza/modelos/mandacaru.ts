// Mandacaru (Cereus jamacaru): coluna de costelas fundas sobre um pé lenhoso
// cinza; os braços saem do tronco, deitam um palmo e sobem quase paralelos,
// formando o candelabro. Cada variação é um indivíduo: velho, moço, torto,
// com braço morto, com flor ou com fruto.

import { bolha, deformar, pecas, ruido3, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, Nivel } from "../tipos";
import { bezier, coluna, tremer, v3, type Lista, type V } from "./_deserto-comum";

const VERDE = "#728f68";
const VERDE_SECO = "#9c9862";
const PONTA = "#a9ba8c";
const PONTA_SECA = "#a39a6a";
const LENHO = "#8a7c6a";
const LENHO_MORTO = "#6a5f55";
const QUEIMADO = "#2b2522";
const FLOR = "#ece6d2";
const FRUTO = "#a13a58";

type Perfil = { altura: [number, number]; bracos: [number, number]; base: number; inclina: number; quebrado: boolean; flores: number; frutos: number };

const PERFIS: Perfil[] = [
  { altura: [5.6, 6.4], bracos: [5, 6], base: 0.2, inclina: 0.25, quebrado: false, flores: 3, frutos: 0 }, // velho candelabro
  { altura: [3.8, 4.5], bracos: [3, 4], base: 0.14, inclina: 0.15, quebrado: false, flores: 0, frutos: 3 }, // adulto com fruto
  { altura: [2.2, 2.8], bracos: [1, 2], base: 0.07, inclina: 0.12, quebrado: false, flores: 1, frutos: 0 }, // moço
  { altura: [4.4, 5.0], bracos: [3, 4], base: 0.17, inclina: 0.75, quebrado: false, flores: 0, frutos: 0 }, // torto, inclinado
  { altura: [4.8, 5.5], bracos: [3, 3], base: 0.26, inclina: 0.3, quebrado: true, flores: 1, frutos: 1 }, // com braço morto
];

function cubica(c: V[], t: number) {
  const u = 1 - t;
  return c[0]
    .clone()
    .multiplyScalar(u * u * u)
    .addScaledVector(c[1], 3 * u * u * t)
    .addScaledVector(c[2], 3 * u * t * t)
    .addScaledVector(c[3], t * t * t);
}

const modelo: Modelo = {
  id: "mandacaru",
  nome: "Mandacaru",
  variacoes: PERFIS.length,
  altura: [2.2, 6.4],
  raio: 1.4,
  estados: ["seca", "queimada"],
  gerar(variacao, nivel: Nivel, estado) {
    const pf = PERFIS[variacao % PERFIS.length];
    const r = sorteio(4100 + variacao * 131);
    const H = pf.altura[0] + r() * (pf.altura[1] - pf.altura[0]);
    const R = Math.max(0.13, H * 0.046) * (estado.seca ? 0.9 : 1);
    const nBracos = pf.bracos[0] + Math.floor(r() * (pf.bracos[1] - pf.bracos[0] + 1));
    const angInclina = r() * Math.PI * 2;
    const lean = v3(Math.cos(angInclina) * pf.inclina, 0, Math.sin(angInclina) * pf.inclina);
    const ctrlTronco = [v3(0, 0, 0), v3(lean.x * 0.15, H * 0.33, lean.z * 0.15), v3(lean.x * 0.6, H * 0.66, lean.z * 0.6), v3(lean.x, H, lean.z)];
    const noTronco = (t: number) => cubica(ctrlTronco, t);

    const queimado = !!estado.queimada;
    const matVerde = queimado ? "carvao" : "cacto";
    const corVerde = queimado ? QUEIMADO : estado.seca ? VERDE_SECO : VERDE;
    const corPonta = queimado ? QUEIMADO : estado.seca ? PONTA_SECA : PONTA;
    const corLenho = queimado ? QUEIMADO : LENHO;
    const fundo = estado.seca ? 0.34 : 0.24;
    const lista: Lista = [];

    // Braços: altura de saída, direção, quanto deita e até onde sobe.
    type Braco = { S: V; dir: V; out: number; topo: number; raio: number; morto: boolean };
    const bracos: Braco[] = [];
    const giro0 = r() * Math.PI * 2;
    for (let i = 0; i < nBracos; i++) {
      const t0 = Math.max(pf.base + 0.06, 0.2) + (i / Math.max(1, nBracos)) * 0.38 + r() * 0.1;
      const ang = giro0 + i * 2.4 + (r() - 0.5) * 0.7; // ângulo dourado: nunca simétrico
      const dir = v3(Math.cos(ang), 0, Math.sin(ang));
      const S = noTronco(Math.min(0.7, t0)).addScaledVector(dir, R * 0.2);
      const out = (0.3 + r() * 0.45) * (H / 5) + R;
      const topo = Math.max(S.y + out + 0.5, H * (i % 2 ? 0.5 + r() * 0.25 : 0.72 + r() * 0.26));
      bracos.push({ S, dir, out, topo, raio: R * (0.68 + r() * 0.16), morto: pf.quebrado && i === 1 });
    }

    // Longe: tronco e até quatro braços em tubos de quatro lados.
    if (nivel === 2) {
      lista.push({ material: matVerde, geometria: tingir(tubo([v3(0, 0, 0), noTronco(1)], [R * 1.2, R * 0.9], 4), corVerde, 0.1, variacao, 0.3, H * 0.3) });
      for (const b of bracos.filter((x) => !x.morto).slice(0, 4)) {
        const E = b.S.clone().addScaledVector(b.dir, b.out).setY(b.S.y + b.out * 0.5);
        const T = E.clone().setY(b.topo);
        lista.push({ material: matVerde, geometria: tingir(tubo([b.S, E, T], [b.raio, b.raio, b.raio * 0.8], 4), corVerde, 0.1, variacao) });
      }
      return pecas(lista);
    }

    const cheio = nivel === 0;
    const op = (seed: number) => ({
      costelas: cheio ? 6 : 3,
      fundo: cheio ? fundo : fundo * 0.9,
      domo: cheio ? 3 : 1,
      cor: corVerde,
      variacao: 0.16,
      seed,
      sombra: 0.35,
      alturaDaSombra: H * 0.4,
      sulco: queimado ? 0.1 : 0.28,
      corPonta,
      ponta: 0.1,
      torcao: cheio ? 0.015 : 0,
    });

    // Pé lenhoso: casca cinza-parda, nodoso, alargando no chão.
    const alturaPe = Math.max(0.18, H * pf.base);
    const nPe = cheio ? 5 : 2;
    const pe: V[] = [];
    const raiosPe: number[] = [];
    for (let i = 0; i <= nPe; i++) {
      const t = (i / nPe) * (alturaPe / H + 0.03);
      pe.push(noTronco(t));
      raiosPe.push(R * (1.12 + 0.45 * Math.pow(1 - i / nPe, 3)));
    }
    pe[0].y = -0.05;
    const gPe = tubo(pe, raiosPe, cheio ? 9 : 5);
    deformar(gPe, (v) => {
      const n = ruido3(v.x * 9, v.y * 3, v.z * 9, variacao) - 0.5;
      v.x *= 1 + n * 0.22;
      v.z *= 1 + n * 0.22;
    });
    lista.push({ material: queimado ? "carvao" : "casca", geometria: tingir(gPe, corLenho, 0.22, variacao + 3, 0.45, alturaPe) });

    // Tronco verde: nasce dentro do pé e afina pouco; estrangulamentos de crescimento.
    const nTronco = cheio ? 14 : 6;
    const tInicio = (alturaPe * 0.8) / H;
    const estrangula = [0.35 + r() * 0.2, 0.7 + r() * 0.15];
    const tronco: V[] = [];
    const raiosTronco: number[] = [];
    for (let i = 0; i <= nTronco; i++) {
      const t = tInicio + (1 - tInicio) * (i / nTronco);
      tronco.push(noTronco(t));
      const dip = cheio ? estrangula.reduce((s, e) => s - 0.1 * Math.exp(-Math.pow((t - e) / 0.035, 2)), 1) : 1;
      raiosTronco.push(R * (1.04 - 0.16 * (i / nTronco)) * dip);
    }
    lista.push({ material: matVerde, geometria: coluna(tremer(tronco, 0.03, r, true), raiosTronco, op(variacao)) });

    const pontas: { p: V; raio: number }[] = [];
    const up = v3(0, 1, 0);
    for (const [i, b] of bracos.entries()) {
      const E = b.S.clone().addScaledVector(b.dir, b.out).addScaledVector(up, b.out * 0.85);
      const cotovelo = bezier(
        [b.S, b.S.clone().addScaledVector(b.dir, b.out * 0.8).addScaledVector(up, b.out * 0.06), b.S.clone().addScaledVector(b.dir, b.out).addScaledVector(up, b.out * 0.35), E],
        cheio ? 7 : 3,
      );
      if (b.morto) {
        // Braço morto: só o lenho, toco quebrado com a ponta aberta.
        const toco = cotovelo.concat([E.clone().addScaledVector(up, 0.35 + r() * 0.3).add(v3((r() - 0.5) * 0.1, 0, (r() - 0.5) * 0.1))]);
        const g = tubo(toco, toco.map((_, k) => b.raio * (0.7 - (k / toco.length) * 0.2)), cheio ? 6 : 4);
        deformar(g, (v) => {
          v.addScaledVector(b.dir, (ruido3(v.x * 12, v.y * 12, v.z * 12, 9) - 0.5) * 0.03);
        });
        lista.push({ material: queimado ? "carvao" : "casca", geometria: tingir(g, queimado ? QUEIMADO : LENHO_MORTO, 0.25, variacao + 11, 0.2, H) });
        continue;
      }
      const flare = 0.05 + r() * 0.15;
      const T = E.clone().addScaledVector(b.dir, flare).add(v3((r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.15)).setY(b.topo);
      const subida = bezier([E, E.clone().lerp(T, 0.5).addScaledVector(b.dir, -flare * 0.4), T], cheio ? 6 : 2).slice(1);
      const pts = tremer(cotovelo.concat(subida), 0.025, r, true);
      const dipT = 0.55 + r() * 0.3;
      const raios = pts.map((_, k) => {
        const t = k / (pts.length - 1);
        const junta = 0.72 + 0.28 * Math.min(1, t * 5); // estreita onde sai do tronco
        const dip = cheio ? 1 - 0.09 * Math.exp(-Math.pow((t - dipT) / 0.05, 2)) : 1;
        return b.raio * junta * dip * (1 - 0.1 * t);
      });
      lista.push({ material: matVerde, geometria: coluna(pts, raios, op(variacao * 7 + i)) });
      pontas.push({ p: pts[pts.length - 1], raio: raios[raios.length - 1] });
    }
    pontas.push({ p: tronco[tronco.length - 1], raio: raiosTronco[raiosTronco.length - 1] });

    // Flor branca de funil e fruto magenta, presos ao lado da ponta.
    if (cheio && !queimado && !estado.seca) {
      const enfeites = [...Array(pf.flores).fill("flor"), ...Array(pf.frutos).fill("fruto")] as ("flor" | "fruto")[];
      enfeites.forEach((tipo, k) => {
        const pt = pontas[(k * 2 + variacao) % pontas.length];
        const a = r() * Math.PI * 2;
        const lado = v3(Math.cos(a), 0, Math.sin(a));
        const base = pt.p.clone().addScaledVector(lado, pt.raio * 0.85).setY(pt.p.y - 0.12 - r() * 0.35);
        if (tipo === "flor") {
          const eixo = lado.clone().multiplyScalar(0.6).add(up).normalize();
          const funil = [base, base.clone().addScaledVector(eixo, 0.1), base.clone().addScaledVector(eixo, 0.18)];
          lista.push({ material: "cacto", geometria: tingir(tubo(funil, [0.022, 0.03, 0.05], 5), "#7c8456", 0.1, k) });
          const petala = bolha(0.075, 0, 0.3, k + variacao, 0.4).translate(funil[2].x, funil[2].y + 0.01, funil[2].z);
          lista.push({ material: "petala", geometria: tingir(petala, FLOR, 0.08, k) });
        } else {
          const fruto = bolha(0.045, 1, 0.08, k, 1.45).translate(base.x, base.y, base.z);
          lista.push({ material: "cogumelo", geometria: tingir(fruto, FRUTO, 0.15, k) });
        }
      });
    }
    return pecas(lista);
  },
};

export default modelo;
