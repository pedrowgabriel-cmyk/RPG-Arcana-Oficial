// Araucária (pinheiro-do-paraná): tronco reto, alto e nu, com tocos dos galhos
// que caíram; no alto, andares de galhos que saem quase na horizontal e sobem
// na ponta como candelabro, cada um com um tufo escuro. A copa fecha em taça:
// os galhos de baixo vão mais longe e as pontas chegam todas perto da mesma altura.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, caminho, nevar, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo } from "../tipos";
import { CIMA, bezier, cone, inclinar, luzDeCima, polvilhar, quad, tom, type Lista } from "./_frio-comum";

const CASCA = "#5e4f44";
const CASCA_MORTA = "#77695e";
const QUEIMADA = "#25201d";
const TUFO = "#3b4f30";
const TUFO_SECO = "#8a6a3e";
const MASSA = "#243020";
const MASSA_SECA = "#5a4428";
const NEVE = "#eef2f5";

const modelo: Modelo = {
  id: "araucaria",
  nome: "Araucária",
  variacoes: 5,
  altura: [15, 24],
  raio: 6,
  estados: ["neve", "seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(8300 + variacao * 173);
    const H = 15 + r() * 9;
    const neve = Math.max(0, Math.min(1, estado.neve ?? 0));
    const seca = !!estado.seca && !estado.queimada;
    const queimada = !!estado.queimada;
    const angVento = r() * Math.PI * 2;
    const vento = new THREE.Vector3(Math.cos(angVento), 0, Math.sin(angVento));
    const incl = 0.01 + r() * 0.025;
    const rT = H * 0.022 + 0.08;
    const yC = H * (0.6 + r() * 0.12);
    const Rmax = H * (0.25 + r() * 0.08);
    const yTopo = H * (0.93 + r() * 0.05);
    const corCasca = queimada ? new THREE.Color(QUEIMADA) : tom(CASCA, r);
    const corTufo = seca ? tom(TUFO_SECO, r, 0.03) : tom(TUFO, r, 0.03, 0.08, 0.06);
    const corMassa = seca ? MASSA_SECA : MASSA;
    const madeira = queimada ? "carvao" : "casca";
    const lista: Lista = [];

    if (nivel === 2) {
      const pe = tubo([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, yC + 1, 0)], [rT * 1.2, rT * 0.7], 4);
      lista.push({ material: madeira, geometria: tingir(pe, corCasca, 0.1, variacao) });
      if (queimada) {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + r();
          const ponta = new THREE.Vector3(Math.cos(a) * Rmax * 0.8, yTopo, Math.sin(a) * Rmax * 0.8);
          lista.push({ material: "carvao", geometria: tingir(tubo([new THREE.Vector3(0, yC, 0), ponta], [rT * 0.4, 0.05], 3), QUEIMADA, 0.1, variacao) });
        }
      } else {
        // Taça: tronco de cone invertido, largo em cima.
        const taca = cone(Rmax * 0.4, Rmax * 1.05, yC + (yTopo - yC) * 0.35, yTopo + 0.6, 7, 1, 0.12, variacao);
        lista.push({ material: "musgo", geometria: polvilhar(luzDeCima(tingir(taca, corTufo.clone().multiplyScalar(0.7), 0.12, variacao), 0.4), neve, 0.6) });
      }
      for (const p of lista) inclinar(p.geometria, vento, incl, H);
      return pecas(lista);
    }

    const perto = nivel === 0;

    // Tronco: reto como coluna, alarga no pé, segue fino até o topo.
    const tronco = caminho(new THREE.Vector3(0, 0, 0), new THREE.Vector3((r() - 0.5) * 0.4, yTopo - 0.3, (r() - 0.5) * 0.4), perto ? 9 : 3, 0.18, r);
    const raios = tronco.map((_, i) => {
      const t = i / (tronco.length - 1);
      return rT * (i === 0 ? 1.4 : 1) * (1 - 0.65 * t);
    });
    const troncoGeo = tingir(tubo(tronco, raios, perto ? 8 : 5, true), corCasca, 0.2, variacao, 0.35, 2.5);
    lista.push({ material: madeira, geometria: troncoGeo });
    const eixoEm = (y: number) => {
      const t = Math.min(1, y / (yTopo - 0.3));
      const k = Math.min(tronco.length - 2, Math.floor(t * (tronco.length - 1)));
      return tronco[k].clone().lerp(tronco[k + 1], t * (tronco.length - 1) - k);
    };

    // Tocos dos galhos que caíram, e às vezes um galho morto pendurado.
    if (perto) {
      const tocos = 5 + Math.floor(r() * 4);
      for (let i = 0; i < tocos; i++) {
        const y = H * 0.25 + r() * (yC - H * 0.25 - 0.5);
        const a = r() * Math.PI * 2;
        const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        const pendurado = i === 0 && r() < 0.6;
        const comp = pendurado ? 2 + r() * 2 : 0.15 + r() * 0.35;
        const base = eixoEm(y).addScaledVector(d, rT * 0.6);
        const ponta = base.clone().addScaledVector(d, comp * (pendurado ? 0.6 : 1)).addScaledVector(CIMA, -comp * (pendurado ? 0.75 : 0.15));
        lista.push({ material: madeira, geometria: tingir(tubo([base, ponta], [0.04 + rT * 0.15, pendurado ? 0.02 : 0.03], 3, true), queimada ? QUEIMADA : CASCA_MORTA, 0.15, variacao + i, 0.2, 2) });
      }
    }

    // Tufo: massa escura com cartões de agulha em roseta virados para cima e para fora.
    const tufo = (T: THREE.Vector3, rt: number, cheio: boolean, seed: number) => {
      if (perto && cheio) {
        const m = bolha(rt * 0.72, 0, 0.3, seed, 0.55).translate(T.x, T.y, T.z);
        lista.push({ material: "musgo", geometria: polvilhar(luzDeCima(tingir(m, corMassa, 0.15, seed), 0.45), neve, 0.6) });
      } else if (!perto) {
        const m = bolha(rt * 0.85, 0, 0.3, seed, 0.6).translate(T.x, T.y, T.z);
        lista.push({ material: "musgo", geometria: polvilhar(luzDeCima(tingir(m, corTufo.clone().multiplyScalar(0.8), 0.15, seed), 0.45), neve) });
      }
      const folhas: THREE.BufferGeometry[] = [];
      const n = perto ? (cheio ? 5 : 3) : 1;
      const g0 = r() * Math.PI * 2;
      for (let k = 0; k < n; k++) {
        if (seca && r() < 0.45) continue;
        const a = g0 + (k / n) * Math.PI * 2 + (r() - 0.5) * 0.6;
        const rad = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        const tan = rad.clone().cross(CIMA);
        const c = T.clone().addScaledVector(rad, rt * 0.45).addScaledVector(CIMA, rt * 0.1);
        folhas.push(quad(c, rad.clone().multiplyScalar(rt * 0.55).addScaledVector(CIMA, rt * 0.35), tan.multiplyScalar(rt * 0.38), ATLAS.agulha, rad.clone().multiplyScalar(0.6).addScaledVector(CIMA, 0.8)));
      }
      if (!seca || r() < 0.5) {
        const a = r() * Math.PI;
        folhas.push(quad(T.clone().addScaledVector(CIMA, rt * 0.3), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(rt * 0.7), new THREE.Vector3(-Math.sin(a), 0.15, Math.cos(a)).multiplyScalar(rt * 0.7), ATLAS.agulha, CIMA));
      }
      for (const f of folhas) lista.push({ material: "folhagem", geometria: polvilhar(tingir(f, corTufo, 0.22, seed + 5, 0.25, H), neve, 0.5) });
      // Neve assentada em cima do tufo.
      if (perto && cheio && neve > 0.02) {
        const s = bolha(rt * (0.5 + 0.35 * neve), 0, 0.35, seed + 9, 0.12 + 0.2 * neve).translate(T.x, T.y + rt * 0.3, T.z);
        lista.push({ material: "neve", geometria: tingir(s, NEVE, 0.05, seed) });
      }
    };

    // Andares de galho em candelabro.
    const andares = perto ? 4 : 3;
    for (let i = 0; i < andares; i++) {
      const s = andares > 1 ? i / (andares - 1) : 0;
      const y = yC + (H * 0.9 - yC) * Math.pow(s, 0.9);
      const n = perto ? 5 + Math.floor(r() * 2) : 4;
      const giro = r() * Math.PI * 2;
      for (let j = 0; j < n; j++) {
        if (r() < 0.12) continue;
        const a = giro + (j / n) * Math.PI * 2 + (r() - 0.5) * 0.5;
        const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        let alcance = Rmax * (1 - 0.6 * s) * (0.8 + r() * 0.35);
        const quebrado = i === 0 && variacao % 2 === 1 && j === 0;
        if (quebrado) alcance *= 0.4;
        const base = eixoEm(y).addScaledVector(d, rT * 0.4);
        const sobe = Math.max(0.6, yTopo - y - alcance * 0.12 - r() * 0.9);
        const ponta = base.clone().addScaledVector(d, alcance).addScaledVector(CIMA, quebrado ? 0.2 : sobe);
        const ctrl = base.clone().addScaledVector(d, alcance * 0.78).addScaledVector(CIMA, quebrado ? 0.1 : sobe * 0.06);
        const pts = bezier(base, ctrl, ponta, perto ? 4 : 2);
        const lado = d.clone().cross(CIMA);
        pts.forEach((p, k) => {
          if (k && k < pts.length - 1) p.addScaledVector(lado, (r() - 0.5) * 0.35).addScaledVector(CIMA, (r() - 0.5) * 0.2);
        });
        const rb = rT * (0.42 - 0.14 * s);
        const g = tingir(tubo(pts, pts.map((_, k) => rb * (1 - (k / pts.length) * 0.75)), perto ? 4 : 3, true), quebrado ? CASCA_MORTA : corCasca, 0.18, variacao + j, 0.2, 2);
        lista.push({ material: madeira, geometria: g });
        if (perto && neve > 0) lista.push({ material: "neve", geometria: tingir(nevar(g, neve * 0.8, 0.04 + 0.04 * neve), NEVE, 0.05, variacao) });

        if (queimada) {
          // Restam gravetos tortos onde era o tufo.
          if (perto && !quebrado) {
            for (let k = 0; k < 3; k++) {
              const fim = ponta.clone().add(new THREE.Vector3((r() - 0.5) * 1.6, 0.4 + r() * 0.8, (r() - 0.5) * 1.6));
              lista.push({ material: "carvao", geometria: tingir(tubo([ponta, fim], [rb * 0.25, 0.01], 3), QUEIMADA, 0.1, variacao) });
            }
          }
          continue;
        }
        if (quebrado) continue;
        const rt = H * 0.05 + 0.35 + alcance * 0.05;
        tufo(ponta.clone().addScaledVector(CIMA, 0.25), rt, true, variacao * 31 + i * 7 + j);
        // Ramos pendentes ao longo da parte que sobe do galho.
        if (perto && alcance > 4) tufo(pts[pts.length - 2].clone().addScaledVector(CIMA, 0.2), rt * 0.65, false, variacao * 31 + i * 7 + j + 100);
      }
    }
    // Ponta do tronco também termina em tufo.
    if (!queimada) tufo(new THREE.Vector3(tronco[tronco.length - 1].x, yTopo, tronco[tronco.length - 1].z), H * 0.04 + 0.3, true, variacao * 7 + 3);

    for (const p of lista) inclinar(p.geometria, vento, incl, H);
    return pecas(lista);
  },
};

export default modelo;
