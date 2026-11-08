// Palmeira nativa (jerivá, macaúba): estipe cinzento quase reto, anelado pelas
// cicatrizes das folhas, com tocos de bainha velha logo abaixo da copa; copa
// de frondes plumosas arqueadas, as novas em pé e as velhas caídas, e um cacho
// de coquinho alaranjado pendurado. É a palmeira de beira de estrada e de pasto.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial } from "../tipos";
import { estipe, fronde, ocluir } from "./_quentes";

const ESTIPE = "#8d8576";
const QUEIMADO = "#2c2622";
const FOLHA = "#6f8a4a";
const FOLHA_VELHA = "#93894e";
const FOLHA_SECA = "#a88c55";
const FOLHA_MORTA = "#6e5a40";
const FOLHA_TORRADA = "#3a3028";
const COQUINHO = "#b0702e";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

const modelo: Modelo = {
  id: "palmeira",
  nome: "Palmeira nativa (jerivá, macaúba)",
  variacoes: 5,
  altura: [8, 14],
  raio: 2.5,
  estados: ["seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(4100 + variacao * 131);
    const altura = 8 + r() * 6;
    const raio = 0.17 + r() * 0.07;
    const queimada = !!estado.queimada;
    const seca = !!estado.seca;
    const lista: Lista = [];

    // Estipe: quase reto, com uma barriga leve e a ponta um pouco fora do eixo.
    const inclina = new THREE.Vector3((r() - 0.5) * 0.9, 0, (r() - 0.5) * 0.9);
    const controle = [0, 0.3, 0.6, 1].map((t, i) =>
      new THREE.Vector3(0, altura * t, 0).addScaledVector(inclina, t * t + (i === 2 ? (r() - 0.5) * 0.3 : 0)),
    );
    const topo = controle[3].clone();
    const perfil = (t: number) => raio * (1 + 0.55 * Math.exp((-t * altura) / 0.5) + 0.08 * Math.sin(t * Math.PI) - 0.12 * t);

    if (nivel === 2) {
      const pe = tubo([new THREE.Vector3(0, 0, 0), topo], [raio * 1.2, raio * 0.9], 4);
      lista.push({ material: "casca-clara", geometria: tingir(pe, queimada ? QUEIMADO : ESTIPE, 0.1, variacao) });
      const n = queimada ? 3 : 6;
      for (let i = 0; i < n; i++) {
        const f = fronde({ base: topo, ang: (i / n) * Math.PI * 2 + r(), elev: queimada ? -0.6 : 0.6, comp: queimada ? 1.8 : 3.6, larg: 1.4, queda: queimada ? 0.6 : 1.6, segs: 2, dobra: 0, quadro: ATLAS.fronde });
        lista.push({ material: "folhagem", geometria: tingir(f.geometria, queimada ? FOLHA_TORRADA : seca ? FOLHA_SECA : FOLHA, 0.1, variacao) });
      }
      return pecas(lista);
    }

    const tronco = estipe(controle, perfil, nivel === 0 ? 0.3 : 1.2, nivel === 0 ? 8 : 5, queimada ? QUEIMADO : ESTIPE, variacao, queimada ? 0.15 : 0.32);
    lista.push({ material: queimada ? "carvao" : "casca-clara", geometria: tronco.geometria });

    // Tocos de bainha velha em volta do topo do estipe (a "saia" da macaúba).
    const tocos = nivel === 0 ? 7 + Math.floor(r() * 5) : 0;
    for (let i = 0; i < tocos; i++) {
      const a = r() * Math.PI * 2;
      const y = -0.2 - r() * 1.1;
      const de = topo.clone().add(new THREE.Vector3(Math.cos(a) * raio * 0.7, y, Math.sin(a) * raio * 0.7));
      const ate = de.clone().add(new THREE.Vector3(Math.cos(a) * (0.2 + r() * 0.25), 0.15 + r() * 0.25, Math.sin(a) * (0.2 + r() * 0.25)));
      const t = tubo([de, ate], [raio * 0.38, raio * 0.12], 4, true);
      lista.push({ material: queimada ? "carvao" : "casca", geometria: tingir(t, queimada ? QUEIMADO : "#6e604a", 0.25, variacao + i) });
    }

    // Capitel: o volume de bainhas novas de onde saem as frondes.
    const cap = bolha(raio * 1.35, nivel === 0 ? 1 : 0, 0.18, variacao, 1.5).translate(topo.x, topo.y + 0.15, topo.z);
    lista.push({ material: queimada ? "carvao" : "casca", geometria: tingir(cap, queimada ? QUEIMADO : "#6d6a48", 0.15, variacao, 0) });

    // Frondes: das novas (em pé) às velhas (caídas), em espiral de filotaxia.
    // Queimada: sobra um punhado de frondes torradas, encolhidas e penduradas.
    const total = queimada ? (nivel === 0 ? 5 : 3) : nivel === 0 ? (seca ? 11 : 15 + Math.floor(r() * 5)) : 8;
    const ouro = 2.39996;
    const giro0 = r() * Math.PI * 2;
    for (let i = 0; i < total; i++) {
      const idade = queimada ? 1 : i / Math.max(1, total - 1); // 0 = nova, 1 = velha
      const comp = (3 + r() * 1.3) * (0.75 + 0.35 * Math.sin(Math.PI * (0.25 + idade * 0.6))) * (queimada ? 0.55 : 1);
      const f = fronde({
        base: topo.clone().add(new THREE.Vector3(0, 0.25 - idade * 0.35, 0)),
        ang: giro0 + i * ouro + (r() - 0.5) * 0.3,
        elev: (queimada ? -0.2 : 1.25 - idade * 1.1) + (r() - 0.5) * 0.2,
        comp,
        larg: (1.25 + r() * 0.4) * (queimada ? 0.6 : 1),
        queda: (seca || queimada ? 1.5 : 0.9) + idade * 1.1 + r() * 0.4,
        segs: nivel === 0 ? 7 : 3,
        dobra: nivel === 0 ? -0.35 + idade * 0.55 : 0,
        torcao: (r() - 0.5) * 0.9,
        rasgo: queimada ? 1 : idade * 0.5 + (seca ? 0.4 : 0),
        quadro: ATLAS.fronde,
      });
      const cor = queimada ? FOLHA_TORRADA : seca ? (idade > 0.6 ? FOLHA_MORTA : FOLHA_SECA) : idade > 0.75 ? FOLHA_VELHA : FOLHA;
      const g = tingir(f.geometria, cor, 0.2, variacao * 7 + i, 0.4, topo.y + 1.5);
      lista.push({ material: "folhagem", geometria: ocluir(g, topo, 1.6, 0.4) });
      // Raque visível: a nervura de baixo, cor de palha.
      if (nivel === 0 && i % 2 === 0) {
        const raque = tubo(f.nervura.slice(0, 4), [0.045, 0.035, 0.025, 0.018], 3);
        lista.push({ material: queimada ? "carvao" : "casca-clara", geometria: tingir(raque, queimada ? QUEIMADO : "#8c845c", 0.15, i) });
      }
    }

    // Frondes mortas penduradas rente ao estipe (seca tem mais).
    const mortas = queimada ? 0 : nivel === 0 ? (seca ? 4 : Math.floor(r() * 3)) : 0;
    for (let i = 0; i < mortas; i++) {
      const f = fronde({ base: topo.clone().add(new THREE.Vector3(0, -0.2, 0)), ang: r() * Math.PI * 2, elev: -1.15, comp: 2.2 + r(), larg: 0.7, queda: 0.3, segs: 4, dobra: 0.5, torcao: r() - 0.5, rasgo: 0.7, quadro: ATLAS.fronde });
      lista.push({ material: "folhagem", geometria: tingir(f.geometria, FOLHA_MORTA, 0.25, i + 50, 0.3, altura) });
    }

    // Cacho de coquinho: pedúnculo e pencas penduradas embaixo da copa.
    if (nivel === 0 && !queimada && r() > 0.25) {
      const a = r() * Math.PI * 2;
      const pe = topo.clone().add(new THREE.Vector3(Math.cos(a) * 0.35, -0.3, Math.sin(a) * 0.35));
      const fim = pe.clone().add(new THREE.Vector3(Math.cos(a) * 0.6, -0.9, Math.sin(a) * 0.6));
      lista.push({ material: "casca", geometria: tingir(tubo([pe, fim], [0.05, 0.03], 4), "#7a6a42", 0.1, variacao) });
      for (let k = 0; k < 5; k++) {
        const c = pe.clone().lerp(fim, 0.35 + k * 0.15).add(new THREE.Vector3((r() - 0.5) * 0.3, -0.12, (r() - 0.5) * 0.3));
        const penca = bolha(0.17 + r() * 0.06, 1, 0.35, variacao + k, 1.4).translate(c.x, c.y, c.z);
        lista.push({ material: "casca", geometria: tingir(penca, seca ? "#7a5530" : COQUINHO, 0.3, variacao + k * 3) });
      }
    }
    return pecas(lista);
  },
};

export default modelo;
