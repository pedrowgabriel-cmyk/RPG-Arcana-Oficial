// Arbusto de campo de altitude (candeia nova, alecrim-do-campo): baixo, denso,
// galhos tortos que saem do pé e deitam para sotavento. O lado do vento é podado
// e achatado, com gravetos secos espetados; o outro lado fica cheio.
// Três tipos: moita redonda, almofada rente ao chão e arbustinho de galhos à mostra.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, caminho, deformar, nevar, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo } from "../tipos";
import { CIMA, inclinar, luzDeCima, polvilhar, quad, tom, type Lista } from "./_frio-comum";

const CASCA = "#4f4136";
const CASCA_MORTA = "#7d746a";
const QUEIMADA = "#24201d";
const FOLHA = ["#4b5434", "#545a36", "#66704a"];
const FOLHA_SECA = "#8c7a4c";
const NEVE = "#eef2f5";

const modelo: Modelo = {
  id: "arbusto-altitude",
  nome: "Arbusto de altitude",
  variacoes: 6,
  altura: [0.5, 1.9],
  raio: 1.4,
  estados: ["neve", "seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(9100 + variacao * 211);
    const tipo = variacao % 3;
    const H = tipo === 1 ? 0.45 + r() * 0.3 : tipo === 0 ? 0.85 + r() * 0.45 : 1.25 + r() * 0.6;
    const W = tipo === 1 ? 1.0 + r() * 0.5 : 0.65 + r() * 0.35;
    const neve = Math.max(0, Math.min(1, estado.neve ?? 0));
    const seca = !!estado.seca && !estado.queimada;
    const queimada = !!estado.queimada;
    const angVento = r() * Math.PI * 2;
    const vento = new THREE.Vector3(Math.cos(angVento), 0, Math.sin(angVento));
    const incl = 0.12 + r() * 0.12;
    const corFolha = seca ? tom(FOLHA_SECA, r, 0.03) : tom(FOLHA[tipo], r, 0.03, 0.08, 0.06);
    const corCasca = queimada ? new THREE.Color(QUEIMADA) : tom(CASCA, r);
    const madeira = queimada ? "carvao" : "casca";
    const lista: Lista = [];

    if (nivel === 2) {
      if (queimada) {
        for (let i = 0; i < 3; i++) {
          const a = r() * Math.PI * 2;
          const ponta = new THREE.Vector3(Math.cos(a) * W * 0.6, H * 0.9, Math.sin(a) * W * 0.6);
          lista.push({ material: "carvao", geometria: tingir(tubo([new THREE.Vector3(0, 0, 0), ponta], [0.05, 0.015], 3), QUEIMADA, 0.1, variacao) });
        }
      } else {
        const m = bolha(W * 0.9, 1, 0.3, variacao, (H * 0.6) / W).translate(vento.x * W * 0.2, H * 0.45, vento.z * W * 0.2);
        deformar(m, (v) => void (v.y = Math.max(0.02, v.y)));
        lista.push({ material: "musgo", geometria: polvilhar(luzDeCima(tingir(m, corFolha.clone().multiplyScalar(0.8), 0.15, variacao, 0.4, H), 0.4), neve, 0.6) });
      }
      return pecas(lista);
    }

    const perto = nivel === 0;
    const hastes = perto ? (tipo === 2 ? 5 : 4) + Math.floor(r() * 3) : 3;
    const pontas: { p: THREE.Vector3; rm: number; seed: number }[] = [];
    for (let j = 0; j < hastes; j++) {
      const a = (j / hastes) * Math.PI * 2 + (r() - 0.5) * 0.9;
      const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const base = d.clone().multiplyScalar(0.05 + r() * 0.1);
      const d2 = d.clone().addScaledVector(vento, 0.7).normalize();
      const alcance = W * (0.3 + r() * 0.5);
      const alto = H * (tipo === 2 ? 0.6 + r() * 0.3 : 0.45 + r() * 0.3);
      const ponta = base.clone().addScaledVector(d2, alcance).setY(alto);
      const pts = caminho(base, ponta, perto ? 4 : 2, 0.35 * (H + 0.3), r);
      const r0 = 0.03 + H * 0.02;
      const g = tingir(tubo(pts, pts.map((_, k) => r0 * (1 - (k / pts.length) * 0.7)), perto ? 5 : 3, true), corCasca, 0.18, variacao + j, 0.3, H);
      lista.push({ material: madeira, geometria: g });
      if (queimada && perto && neve > 0) lista.push({ material: "neve", geometria: tingir(nevar(g, neve, 0.02), NEVE, 0.05, variacao) });
      const rm = (W * 0.4 + H * 0.22) * (0.7 + r() * 0.4) * (tipo === 2 ? 0.75 : 1);
      pontas.push({ p: ponta, rm, seed: variacao * 17 + j });
    }

    for (const { p, rm, seed } of pontas) {
      if (queimada) {
        // Sem folha: gravetos carbonizados abrem em leque na ponta de cada haste.
        if (!perto) continue;
        for (let k = 0; k < 4; k++) {
          const fim = p.clone().add(new THREE.Vector3((r() - 0.5) * rm * 1.6, rm * (0.3 + r() * 0.6), (r() - 0.5) * rm * 1.6));
          lista.push({ material: "carvao", geometria: tingir(tubo(caminho(p, fim, 2, rm * 0.3, r), [0.018, 0.012, 0.005], 3, true), QUEIMADA, 0.1, seed) });
        }
        continue;
      }
      if (seca && r() < 0.3) continue;
      // Massa de folha: lado do vento achatado, nunca abaixo do chão.
      const centro = p.clone().addScaledVector(CIMA, rm * 0.1);
      const m = bolha(rm, 1, 0.35, seed, tipo === 1 ? 0.5 : 0.65);
      deformar(m, (v) => {
        const w = v.x * vento.x + v.z * vento.z;
        if (w < 0) v.addScaledVector(vento, -w * 0.4);
        v.add(centro);
        v.y = Math.max(0.03, v.y);
      });
      tingir(m, corFolha.clone().multiplyScalar(0.85), 0.25, seed, 0.5, H);
      luzDeCima(m, 0.45);
      lista.push({ material: "musgo", geometria: perto ? m : polvilhar(m, neve, 0.6) });
      if (perto && neve > 0.02) lista.push({ material: "neve", geometria: tingir(nevar(m, neve, 0.03 + 0.06 * neve), NEVE, 0.05, seed) });

      // Cartões de folha miúda quebram o contorno da bolha.
      const n = perto ? (seca ? 2 : 4) : 1;
      for (let k = 0; k < n; k++) {
        const dir = new THREE.Vector3(r() - 0.5, 0.35 + r() * 0.6, r() - 0.5).normalize();
        const tan = dir.clone().cross(CIMA);
        if (tan.lengthSq() < 0.01) tan.set(1, 0, 0);
        tan.normalize();
        const outro = dir.clone().cross(tan).normalize();
        const c = centro.clone().addScaledVector(dir, rm * 0.75);
        c.y = Math.max(rm * 0.4, c.y);
        const f = quad(c, tan.multiplyScalar(rm * 0.5), outro.multiplyScalar(rm * 0.45), ATLAS.larga, dir);
        lista.push({ material: "folhagem", geometria: polvilhar(tingir(f, corFolha, 0.22, seed + 3, 0.4, H), neve, 0.5) });
      }

      // Gravetos secos espetados para o lado do vento.
      if (perto && r() < 0.7) {
        const fim = centro.clone().addScaledVector(vento, -rm * (1.1 + r() * 0.4)).addScaledVector(CIMA, rm * (0.2 + r() * 0.4));
        lista.push({ material: "casca", geometria: tingir(tubo(caminho(centro, fim, 2, rm * 0.2, r), [0.016, 0.01, 0.004], 3, true), CASCA_MORTA, 0.15, seed) });
      }
    }

    // A inclinação de vento não move o pé: só o que está alto.
    for (const p of lista) inclinar(p.geometria, vento, incl, Math.max(H, 0.5), 1.3);
    return pecas(lista);
  },
};

export default modelo;
