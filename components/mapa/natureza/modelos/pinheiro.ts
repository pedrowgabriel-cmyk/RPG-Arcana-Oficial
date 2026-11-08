// Pinheiro de serra (conífera): tronco reto que afina até a ponta, galhos em
// andares que pendem nas pontas, copa em cone irregular. Alguns indivíduos
// cresceram no vento da crista: tortos, com a copa em bandeira para sotavento.
// Neve assenta em lajes por cima de cada galho.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { caminho, nevar, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo } from "../tipos";
import { CIMA, cone, escurecerDentro, inclinar, laje, polvilhar, quad, tom, type Lista } from "./_frio-comum";

const CASCA = "#5b4a3d";
const CASCA_MORTA = "#7a7068";
const QUEIMADA = "#26211e";
const AGULHA = "#435638";
const AGULHA_SECA = "#8f6538";
const MIOLO = "#253020";
const MIOLO_SECO = "#4a3622";

const modelo: Modelo = {
  id: "pinheiro",
  nome: "Pinheiro de serra (conífera)",
  variacoes: 6,
  altura: [8, 16],
  raio: 3,
  estados: ["neve", "seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(7100 + variacao * 131);
    const H = 8 + r() * 8;
    const torto = variacao % 3 === 2;
    const angVento = r() * Math.PI * 2;
    const vento = new THREE.Vector3(Math.cos(angVento), 0, Math.sin(angVento));
    const incl = torto ? 0.13 + r() * 0.07 : 0.01 + r() * 0.03;
    const neve = Math.max(0, Math.min(1, estado.neve ?? 0));
    const seca = !!estado.seca && !estado.queimada;
    const queimada = !!estado.queimada;
    const y0 = H * (0.2 + r() * 0.14) * (torto ? 1.25 : 1);
    const Lmax = H * (0.22 + r() * 0.07) * (torto ? 1.1 : 1);
    const rT = H * 0.018 + 0.07;
    const corCasca = queimada ? new THREE.Color(QUEIMADA) : tom(CASCA, r);
    const corAgulha = seca ? tom(AGULHA_SECA, r, 0.03) : tom(AGULHA, r, 0.03, 0.08, 0.06);
    const corMiolo = seca ? MIOLO_SECO : MIOLO;
    // Raio da copa em cada altura: cone com barriga e ponta fina.
    const raioCopa = (y: number) => {
      const t = Math.min(1, Math.max(0, (y - y0) / (H - y0)));
      return Lmax * Math.pow(1 - t, 0.8) * (0.85 + 0.25 * Math.sin(t * Math.PI));
    };
    const lista: Lista = [];
    const madeira = queimada ? "carvao" : "casca";

    if (nivel === 2) {
      const pe = tubo([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, queimada ? H * 0.95 : y0 + 0.5, 0)], [rT * 1.2, queimada ? 0.04 : rT * 0.8], 4);
      lista.push({ material: madeira, geometria: tingir(pe, corCasca, 0.1, variacao) });
      if (!queimada) {
        // Três cones empilhados: o recorte em andares aparece até de longe.
        for (let i = 0; i < 3; i++) {
          const yb = y0 + (H - y0) * i * 0.3;
          const yt = Math.min(H, yb + (H - y0) * (0.5 - i * 0.05));
          const c = cone(raioCopa(yb) * 0.95, 0, yb, yt, 6, 1, 0.15, variacao + i);
          lista.push({ material: "musgo", geometria: polvilhar(tingir(c, corAgulha.clone().multiplyScalar(0.75), 0.12, variacao, 0.3, H), neve, 0.55) });
        }
      }
      for (const p of lista) inclinar(p.geometria, vento, incl, H);
      return pecas(lista);
    }

    const perto = nivel === 0;

    // Tronco: quase reto, alarga no pé, afina até virar a guia.
    const tronco = caminho(new THREE.Vector3(0, 0, 0), new THREE.Vector3((r() - 0.5) * 0.3, H * 0.985, (r() - 0.5) * 0.3), perto ? 8 : 3, 0.25, r);
    const raiosTronco = tronco.map((_, i) => {
      const t = i / (tronco.length - 1);
      return rT * (i === 0 ? 1.45 : 1) * (1 - 0.88 * t) + 0.015;
    });
    const troncoGeo = tingir(tubo(tronco, raiosTronco, perto ? 8 : 5, true), corCasca, 0.18, variacao, 0.35, 2);
    lista.push({ material: madeira, geometria: troncoGeo });
    if (perto && neve > 0) lista.push({ material: "neve", geometria: tingir(nevar(troncoGeo, neve * 0.6, 0.03), "#e9eef2", 0.05, variacao) });

    // Miolo: massa escura que não deixa ver o outro lado entre os andares.
    if (!queimada) {
      const miolo = cone(raioCopa(y0) * 0.55, 0.05, y0 + 0.3, H * 0.96, 7, perto ? 3 : 1, 0.25, variacao + 3);
      tingir(miolo, corMiolo, 0.15, variacao + 2, 0.35, H * 0.6);
      lista.push({ material: "musgo", geometria: polvilhar(miolo, neve, 0.7) });
    }

    // Tocos de galho morto abaixo da copa: pinheiro de serra perde os galhos de baixo.
    if (perto) {
      const tocos = 3 + Math.floor(r() * 4);
      for (let i = 0; i < tocos; i++) {
        const y = 0.9 + r() * (y0 - 1);
        const a = r() * Math.PI * 2;
        const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        const comp = 0.2 + r() * (i === 0 && torto ? 1.6 : 0.7);
        const base = d.clone().multiplyScalar(rT * 0.7).setY(y);
        const ponta = base.clone().addScaledVector(d, comp).addScaledVector(CIMA, -comp * (0.1 + r() * 0.3));
        const g = tubo([base, ponta], [0.035 + rT * 0.12, 0.01], 3, true);
        lista.push({ material: madeira, geometria: tingir(g, queimada ? QUEIMADA : CASCA_MORTA, 0.15, variacao + i, 0.2, 2) });
      }
    }

    // Andares de galho.
    const andares: number[] = [];
    for (let y = y0; y < H * 0.93; y += (H / (perto ? 11 : 7)) * (0.7 + r() * 0.6)) andares.push(y);
    for (const y of andares) {
      const t = (y - y0) / (H - y0);
      const quantos = perto ? 4 + Math.floor(r() * 3) : 3 + (r() < 0.5 ? 1 : 0);
      const giro = r() * Math.PI * 2;
      for (let j = 0; j < quantos; j++) {
        if (r() < 0.13) continue;
        const a = giro + (j / quantos) * Math.PI * 2 + (r() - 0.5) * 0.7;
        const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        let L = raioCopa(y) * (0.72 + r() * 0.5) + 0.25;
        if (torto) {
          const w = d.dot(vento);
          L *= w < 0 ? 1 + w * 0.8 : 1 + w * 0.4;
        }
        if (L < 0.3) continue;
        const elev = -0.22 + t * 0.5 + (r() - 0.5) * 0.18;
        const base = d.clone().multiplyScalar(rT * (1 - t) * 0.8).setY(y);
        const ponta = base.clone().addScaledVector(d, L * Math.cos(elev)).addScaledVector(CIMA, L * Math.sin(elev) - L * 0.14 * (1 - t));
        const lado = d.clone().cross(CIMA).normalize();
        const meio = base.clone().lerp(ponta, 0.5).addScaledVector(CIMA, L * 0.07).addScaledVector(lado, (r() - 0.5) * L * 0.15);
        const pts = [base, meio, ponta];
        const rb = Math.max(0.025, rT * (1 - t) * 0.32);
        if (perto || queimada) {
          const g = tingir(tubo(pts, [rb, rb * 0.55, rb * 0.15], perto ? 4 : 3, true), corCasca, 0.15, variacao, 0.3, 2);
          lista.push({ material: madeira, geometria: g });
          if (queimada && perto && neve > 0) lista.push({ material: "neve", geometria: tingir(nevar(g, neve, 0.03), "#e9eef2", 0.05, variacao) });
        }
        if (queimada) continue;

        // Folhagem: esteira deitada sobre o galho + cartão em pé + leque na ponta.
        const dirG = ponta.clone().sub(base);
        const centro = base.clone().lerp(ponta, 0.56).addScaledVector(CIMA, 0.06);
        const luz = d.clone().multiplyScalar(0.5).addScaledVector(CIMA, 0.85);
        const folhas: THREE.BufferGeometry[] = [];
        const larg = L * (0.3 + r() * 0.08);
        if (!seca || r() < 0.55)
          folhas.push(quad(centro, dirG.clone().multiplyScalar(0.55), lado.clone().multiplyScalar(larg).addScaledVector(CIMA, (r() - 0.5) * L * 0.25), ATLAS.agulha, luz));
        if (!seca || r() < 0.4) folhas.push(quad(centro.clone().addScaledVector(CIMA, -0.05), dirG.clone().multiplyScalar(0.5), CIMA.clone().multiplyScalar(L * 0.2), ATLAS.agulha, luz));
        if (perto && (!seca || r() < 0.4)) {
          const ladoG = (r() < 0.5 ? 1 : -1) * (0.35 + r() * 0.3);
          const dPonta = dirG.clone().applyAxisAngle(CIMA, ladoG).multiplyScalar(0.3);
          const lPonta = lado.clone().applyAxisAngle(CIMA, ladoG).multiplyScalar(L * 0.2).addScaledVector(CIMA, 0.1 * L);
          folhas.push(quad(base.clone().lerp(ponta, 0.82), dPonta, lPonta, ATLAS.agulha, luz));
        }
        for (const f of folhas) {
          tingir(f, corAgulha, 0.24, variacao + 7, 0.4, H * 0.9);
          escurecerDentro(f, (yy) => raioCopa(yy) + 0.2, 0.45);
          lista.push({ material: "folhagem", geometria: polvilhar(f, neve, 0.55) });
        }

        // Neve assentada sobre o galho, mais larga e grossa quanto mais neve.
        if (neve > 0.02) {
          const w = L * 0.27 * (0.35 + 0.65 * neve) * (seca ? 0.6 : 1);
          const sobe = CIMA.clone().multiplyScalar(0.07);
          const lp = perto
            ? [base.clone().lerp(ponta, 0.1), base.clone().lerp(ponta, 0.4), base.clone().lerp(ponta, 0.7), ponta.clone()]
            : [base.clone().lerp(ponta, 0.1), base.clone().lerp(ponta, 0.55), ponta.clone()];
          lp.forEach((p, i) => p.add(sobe).addScaledVector(CIMA, i === 1 || (perto && i === 2) ? L * 0.04 : 0));
          const ls = perto ? [w * 0.25, w, w * 0.8, 0.02] : [w * 0.3, w, 0.02];
          const s = laje(lp, ls, 0.04 + 0.13 * neve, variacao * 13 + j);
          lista.push({ material: "neve", geometria: tingir(s, "#eef2f5", 0.06, variacao, 0.15, H) });
        }
      }
    }

    // Guia: a ponta fina que todo pinheiro tem.
    if (!queimada && perto) {
      const topo = new THREE.Vector3(0, H * 0.97, 0);
      for (const eixo of [new THREE.Vector3(1, 0, 0.3), new THREE.Vector3(-0.3, 0, 1)]) {
        const f = quad(topo, CIMA.clone().multiplyScalar(0.7), eixo.normalize().multiplyScalar(0.35), ATLAS.agulha, eixo.clone().add(CIMA));
        lista.push({ material: "folhagem", geometria: polvilhar(tingir(f, corAgulha, 0.2, variacao + 9, 0.3, H), neve, 0.4) });
      }
    }

    for (const p of lista) inclinar(p.geometria, vento, incl, H);
    return pecas(lista);
  },
};

export default modelo;
