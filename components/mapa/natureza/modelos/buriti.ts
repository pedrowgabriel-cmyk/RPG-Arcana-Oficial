// Buriti: a palmeira das veredas. Estipe reto, alto e liso, cinza claro com
// anéis largos; copa redonda de folhas em leque (costapalmadas) plissadas em
// sanfona na ponta de pecíolos longos, saia de leques mortos pendurados e
// cachos compridos de fruto escamoso cor de ferrugem. Marca de água no sertão.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial } from "../tipos";
import { estipe, leque, ocluir } from "./_quentes";

const ESTIPE = "#a8a090";
const QUEIMADO = "#2a2420";
const FOLHA = "#6c8846";
const FOLHA_VELHA = "#8f8c4c";
const FOLHA_SECA = "#a98e56";
const FOLHA_MORTA = "#77623f";
const FOLHA_TORRADA = "#3a3028";
const PECIOLO = "#7d7a4e";
const FRUTO = "#6e3a22";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

const modelo: Modelo = {
  id: "buriti",
  nome: "Buriti",
  variacoes: 4,
  altura: [12, 20],
  raio: 3.5,
  estados: ["seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(6700 + variacao * 151);
    const altura = 12 + r() * 8;
    const raio = 0.22 + r() * 0.07;
    const queimada = !!estado.queimada;
    const seca = !!estado.seca;
    const lista: Lista = [];

    // Estipe reto como coluna; só um desvio mínimo para não ser régua.
    const desvio = new THREE.Vector3((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5);
    const controle = [0, 0.35, 0.7, 1].map((t, i) =>
      new THREE.Vector3(0, altura * t, 0).addScaledVector(desvio, t + (i === 1 ? (r() - 0.5) * 0.4 : 0)),
    );
    const topo = controle[3].clone();
    // Engrossa no pé e dá uma barriga leve no meio (buriti velho).
    const perfil = (t: number) => raio * (1 + 0.45 * Math.exp((-t * altura) / 0.7) + 0.1 * Math.sin(t * Math.PI * 0.9) - 0.15 * t);

    const ouro = 2.39996;
    const giro0 = r() * Math.PI * 2;

    if (nivel === 2) {
      const pe = tubo([new THREE.Vector3(0, 0, 0), topo], [raio * 1.2, raio * 0.9], 4);
      lista.push({ material: "casca-clara", geometria: tingir(pe, queimada ? QUEIMADO : ESTIPE, 0.1, variacao) });
      const n = queimada ? 3 : 5;
      for (let i = 0; i < n; i++) {
        const a = giro0 + i * ouro;
        const fora = new THREE.Vector3(Math.cos(a), queimada ? -1.2 : 0.5 - (i / n) * 0.9, Math.sin(a));
        const c = topo.clone().addScaledVector(fora.clone().normalize(), 1.6);
        const g = leque({ centro: c, fora, raio: queimada ? 1.2 : 2.8, abertura: 3.4, segsAng: 3, segsRaio: 1, plissado: 0, queda: 0.2, rolar: r() - 0.5, quadro: ATLAS.capim });
        lista.push({ material: "folhagem", geometria: tingir(g, queimada ? FOLHA_TORRADA : seca ? FOLHA_SECA : FOLHA, 0.1, variacao) });
      }
      return pecas(lista);
    }

    const tronco = estipe(controle, perfil, nivel === 0 ? 0.5 : 2.5, nivel === 0 ? 6 : 5, queimada ? QUEIMADO : ESTIPE, variacao, queimada ? 0.1 : 0.22);
    lista.push({ material: queimada ? "carvao" : "casca-clara", geometria: tronco.geometria });

    // Colo: as bainhas das folhas abraçando o topo do estipe.
    const cap = bolha(raio * 1.5, nivel === 0 ? 1 : 0, 0.2, variacao, 1.4).translate(topo.x, topo.y, topo.z);
    lista.push({ material: queimada ? "carvao" : "casca", geometria: tingir(cap, queimada ? QUEIMADO : "#6c6444", 0.2, variacao) });

    // Leques vivos: pecíolo longo e arqueado, leque plissado na ponta.
    const total = queimada ? (nivel === 0 ? 4 : 2) : nivel === 0 ? (seca ? 11 : 15 + Math.floor(r() * 4)) : 9;
    for (let i = 0; i < total; i++) {
      const idade = queimada ? 1 : i / Math.max(1, total - 1);
      const a = giro0 + i * ouro + (r() - 0.5) * 0.3;
      const elev = queimada ? -0.9 : 1.2 - idade * 1.3 + (r() - 0.5) * 0.2;
      const compP = (queimada ? 1 : 2.4 + r() * 1.2) * (1 - idade * 0.2);
      const saida = new THREE.Vector3(Math.cos(a) * Math.cos(elev), Math.sin(elev), Math.sin(a) * Math.cos(elev));
      const de = topo.clone().add(new THREE.Vector3(0, 0.3 - idade * 0.4, 0));
      // O pecíolo arqueia: o meio sobe um pouco mais do que a reta.
      const fim = de.clone().addScaledVector(saida, compP).add(new THREE.Vector3(0, -compP * 0.12 * idade, 0));
      const meio = de.clone().lerp(fim, 0.5).add(new THREE.Vector3(0, compP * 0.08, 0));
      const pec = tubo(nivel === 0 ? [de, meio, fim] : [de, fim], nivel === 0 ? [0.07, 0.05, 0.035] : [0.06, 0.035], 3);
      lista.push({ material: queimada ? "carvao" : "casca-clara", geometria: tingir(pec, queimada ? QUEIMADO : PECIOLO, 0.15, i) });

      const fora = fim.clone().sub(meio).normalize().add(new THREE.Vector3(0, 0.25, 0));
      const g = leque({
        centro: fim,
        fora,
        raio: (queimada ? 0.9 : 2.2 + r() * 0.7) * (1 - idade * 0.15),
        abertura: queimada ? 1.6 : seca ? 2.8 : 3.3 + r() * 0.5,
        segsAng: nivel === 0 ? 10 : 4,
        segsRaio: nivel === 0 ? 3 : 1,
        plissado: nivel === 0 ? 0.07 : 0,
        queda: (seca || queimada ? 0.65 : 0.35) + idade * 0.3 + r() * 0.15,
        rolar: (r() - 0.5) * 1.4,
        quadro: ATLAS.capim,
      });
      const cor = queimada ? FOLHA_TORRADA : seca ? (idade > 0.5 ? FOLHA_MORTA : FOLHA_SECA) : idade > 0.8 ? FOLHA_VELHA : FOLHA;
      tingir(g, cor, 0.22, variacao * 13 + i, 0.35, topo.y + 2);
      lista.push({ material: "folhagem", geometria: ocluir(g, topo, 2.4, 0.45) });
    }

    // Saia de leques mortos: dobrados, pendurados de cabeça para baixo junto ao estipe.
    const mortas = queimada ? 0 : nivel === 0 ? (seca ? 7 : 3 + Math.floor(r() * 4)) : seca ? 3 : 2;
    for (let i = 0; i < mortas; i++) {
      const a = r() * Math.PI * 2;
      const c = topo.clone().add(new THREE.Vector3(Math.cos(a) * (raio + 0.25), -0.6 - r() * 0.6, Math.sin(a) * (raio + 0.25)));
      const g = leque({
        centro: c,
        fora: new THREE.Vector3(Math.cos(a) * 0.25, -1, Math.sin(a) * 0.25),
        raio: 1.3 + r() * 0.5,
        abertura: 1 + r() * 0.5,
        segsAng: nivel === 0 ? 5 : 2,
        segsRaio: nivel === 0 ? 2 : 1,
        plissado: nivel === 0 ? 0.06 : 0,
        queda: 0,
        rolar: Math.PI / 2 + (r() - 0.5) * 0.6,
        quadro: ATLAS.capim,
      });
      lista.push({ material: "folhagem", geometria: tingir(g, FOLHA_MORTA, 0.25, i + 90, 0.25, altura) });
    }

    // Cachos de fruto: ráquis comprida pendendo da copa, com o coquinho escamoso em penca.
    if (!queimada && nivel === 0) {
      const cachos = seca ? 1 : 2 + Math.floor(r() * 2);
      for (let k = 0; k < cachos; k++) {
        const a = r() * Math.PI * 2;
        const de = topo.clone().add(new THREE.Vector3(Math.cos(a) * raio, -0.2, Math.sin(a) * raio));
        const meio = de.clone().add(new THREE.Vector3(Math.cos(a) * 0.9, 0.1, Math.sin(a) * 0.9));
        const fim = meio.clone().add(new THREE.Vector3(Math.cos(a) * 0.4, -1.6 - r() * 0.6, Math.sin(a) * 0.4));
        lista.push({ material: "casca", geometria: tingir(tubo([de, meio, fim], [0.05, 0.04, 0.025], 3), "#6a5a3a", 0.15, k) });
        for (let j = 0; j < 5; j++) {
          const c = meio.clone().lerp(fim, 0.25 + j * 0.16).add(new THREE.Vector3((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25));
          const penca = bolha(0.2 + r() * 0.07, 0, 0.3, variacao * 3 + k * 5 + j, 1.5).translate(c.x, c.y, c.z);
          lista.push({ material: "casca", geometria: tingir(penca, FRUTO, 0.25, j + k * 9) });
        }
      }
    }
    return pecas(lista);
  },
};

export default modelo;
