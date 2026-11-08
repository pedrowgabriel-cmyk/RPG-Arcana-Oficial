// Coqueiro: estipe curvo e inclinado (cresce atrás da luz e do vento), com o pé
// inchado em bulbo de raiz e anéis apagados; copa redonda de frondes longas que
// pendem em V invertido, cachos de coco verde e seco no colo das folhas e
// frondes mortas penduradas. É o coqueiro de quintal de fazenda e de beira de rio.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial } from "../tipos";
import { estipe, fronde, ocluir } from "./_quentes";

const ESTIPE = "#857a68";
const QUEIMADO = "#2a2420";
const FOLHA = "#7a8f4c";
const FOLHA_VELHA = "#9a9150";
const FOLHA_SECA = "#ad9158";
const FOLHA_MORTA = "#74603f";
const FOLHA_TORRADA = "#3a3028";
const COCO_VERDE = "#6f7a36";
const COCO_SECO = "#7a5a34";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

const modelo: Modelo = {
  id: "coqueiro",
  nome: "Coqueiro",
  variacoes: 5,
  altura: [8, 15],
  raio: 3,
  estados: ["seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(5300 + variacao * 173);
    const altura = 8 + r() * 7;
    const raio = 0.15 + r() * 0.05;
    const queimada = !!estado.queimada;
    const seca = !!estado.seca;
    const lista: Lista = [];

    // Curva: sai inclinado do chão e vai endireitando para o céu, às vezes com
    // uma segunda dobra no meio.
    const az = r() * Math.PI * 2;
    const lean = altura * (0.18 + r() * 0.22);
    const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    const ondula = (r() - 0.5) * 0.35;
    const controle = [0, 0.2, 0.45, 0.7, 1].map((t) => {
      const desvio = lean * (1 - Math.pow(1 - t, 1.8)) + ondula * Math.sin(t * Math.PI * 2) * altura * 0.1;
      return new THREE.Vector3(0, altura * t * (1 - 0.04 * t), 0).addScaledVector(dir, desvio);
    });
    const topo = controle[4].clone();
    const perfil = (t: number) => raio * (1 + 0.9 * Math.exp((-t * altura) / 0.55) - 0.25 * t);

    if (nivel === 2) {
      const pe = tubo([controle[0], controle[2], topo], [raio * 1.4, raio, raio * 0.85], 4);
      lista.push({ material: "casca-clara", geometria: tingir(pe, queimada ? QUEIMADO : ESTIPE, 0.1, variacao) });
      const n = queimada ? 3 : 6;
      for (let i = 0; i < n; i++) {
        const f = fronde({ base: topo, ang: (i / n) * Math.PI * 2 + r(), elev: queimada ? -0.7 : 0.35, comp: queimada ? 2 : 4.2, larg: 1.3, queda: queimada ? 0.5 : 1.7, segs: 2, dobra: 0, quadro: ATLAS.fronde });
        lista.push({ material: "folhagem", geometria: tingir(f.geometria, queimada ? FOLHA_TORRADA : seca ? FOLHA_SECA : FOLHA, 0.1, variacao) });
      }
      return pecas(lista);
    }

    const tronco = estipe(controle, perfil, nivel === 0 ? 0.3 : 1.2, nivel === 0 ? 7 : 5, queimada ? QUEIMADO : ESTIPE, variacao, queimada ? 0.12 : 0.22);
    lista.push({ material: queimada ? "carvao" : "casca-clara", geometria: tronco.geometria });

    // Raízes à mostra no pé: um tufo de cordões curtos entrando na terra.
    if (nivel === 0) {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + r() * 0.4;
        const de = new THREE.Vector3(Math.cos(a) * raio * 1.3, 0.25 + r() * 0.15, Math.sin(a) * raio * 1.3);
        const ate = new THREE.Vector3(Math.cos(a) * (raio * 2.2 + r() * 0.15), -0.05, Math.sin(a) * (raio * 2.2 + r() * 0.15));
        lista.push({ material: queimada ? "carvao" : "casca", geometria: tingir(tubo([de, ate], [0.035, 0.025], 3), queimada ? QUEIMADO : "#5e5242", 0.2, i) });
      }
    }

    // Colo da copa: bainhas fibrosas marrons.
    const cap = bolha(raio * 1.5, nivel === 0 ? 1 : 0, 0.25, variacao, 1.2).translate(topo.x, topo.y + 0.05, topo.z);
    lista.push({ material: queimada ? "carvao" : "casca", geometria: tingir(cap, queimada ? QUEIMADO : "#6a5a3e", 0.2, variacao) });

    // Frondes longas em V invertido; a copa é quase uma esfera.
    const total = queimada ? (nivel === 0 ? 5 : 3) : nivel === 0 ? (seca ? 13 : 18 + Math.floor(r() * 6)) : 9;
    const ouro = 2.39996;
    const giro0 = r() * Math.PI * 2;
    // O vento dominante penteia a copa para o lado da inclinação.
    const vento = dir.clone().multiplyScalar(0.25);
    for (let i = 0; i < total; i++) {
      const idade = queimada ? 1 : i / Math.max(1, total - 1);
      const ang = giro0 + i * ouro + (r() - 0.5) * 0.35;
      const pente = vento.x * Math.cos(ang) + vento.z * Math.sin(ang);
      const f = fronde({
        base: topo.clone().add(new THREE.Vector3(0, 0.2 - idade * 0.3, 0)),
        ang,
        elev: (queimada ? -0.3 : 1.1 - idade * 1.2) + (r() - 0.5) * 0.25 - pente,
        comp: (3.8 + r() * 1.4) * (queimada ? 0.5 : 1) * (0.8 + 0.25 * Math.sin(Math.PI * (0.2 + idade * 0.7))),
        larg: (1.35 + r() * 0.35) * (queimada ? 0.6 : 1),
        queda: (seca || queimada ? 1.7 : 1.15) + idade * 1.2 + r() * 0.4 + pente,
        segs: nivel === 0 ? 8 : 3,
        dobra: nivel === 0 ? 0.55 + r() * 0.3 : 0,
        torcao: (r() - 0.5) * 0.7,
        rasgo: queimada ? 1 : idade * 0.4 + (seca ? 0.5 : 0) + (r() > 0.8 ? 0.4 : 0),
        quadro: ATLAS.fronde,
      });
      const cor = queimada ? FOLHA_TORRADA : seca ? (idade > 0.55 ? FOLHA_MORTA : FOLHA_SECA) : idade > 0.8 ? FOLHA_VELHA : FOLHA;
      const g = tingir(f.geometria, cor, 0.22, variacao * 11 + i, 0.35, topo.y + 1.5);
      lista.push({ material: "folhagem", geometria: ocluir(g, topo, 1.8, 0.45) });
      if (nivel === 0 && i % 2 === 1) {
        const raque = tubo(f.nervura.slice(0, 5), [0.05, 0.04, 0.03, 0.022, 0.015], 3);
        lista.push({ material: queimada ? "carvao" : "casca-clara", geometria: tingir(raque, queimada ? QUEIMADO : "#958a5e", 0.15, i) });
      }
    }

    // Frondes mortas penduradas coladas no estipe.
    const mortas = queimada ? 0 : nivel === 0 ? (seca ? 5 : 1 + Math.floor(r() * 3)) : seca ? 2 : 0;
    for (let i = 0; i < mortas; i++) {
      const f = fronde({ base: topo.clone().add(new THREE.Vector3(0, -0.15, 0)), ang: r() * Math.PI * 2, elev: -1.25, comp: 2.6 + r() * 1.2, larg: 0.6, queda: 0.2, segs: nivel === 0 ? 4 : 2, dobra: 0.7, torcao: r() - 0.5, rasgo: 0.8, quadro: ATLAS.fronde });
      lista.push({ material: "folhagem", geometria: tingir(f.geometria, FOLHA_MORTA, 0.25, i + 70, 0.3, altura) });
    }

    // Cachos de coco no colo: dois ou três, verdes e já secos misturados.
    if (!queimada && nivel === 0) {
      const cachos = 2 + Math.floor(r() * 2);
      for (let k = 0; k < cachos; k++) {
        const a = r() * Math.PI * 2;
        const c0 = topo.clone().add(new THREE.Vector3(Math.cos(a) * raio * 1.6, -0.35 - r() * 0.2, Math.sin(a) * raio * 1.6));
        const n = 3 + Math.floor(r() * 4);
        for (let j = 0; j < n; j++) {
          const b = a + (r() - 0.5) * 1.2;
          const d = 0.12 + r() * 0.2;
          const c = c0.clone().add(new THREE.Vector3(Math.cos(b) * d, -r() * 0.3, Math.sin(b) * d));
          const coco = bolha(0.13 + r() * 0.03, 0, 0.12, variacao * 5 + k * 7 + j, 1.15).translate(c.x, c.y, c.z);
          const velho = seca || r() > 0.7;
          lista.push({ material: "casca", geometria: tingir(coco, velho ? COCO_SECO : COCO_VERDE, 0.18, j + k * 3) });
        }
      }
    }
    return pecas(lista);
  },
};

export default modelo;
