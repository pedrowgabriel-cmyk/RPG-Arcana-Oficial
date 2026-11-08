// Boca de gruta: encosta de pedra com uma abertura escura e funda, beiço de
// rocha por cima, chão escuro entrando, pedras caídas na entrada.

import * as THREE from "three";
import { pecas, ruido3, sorteio, tingir } from "../ferramentas";
import type { Modelo } from "../tipos";
import { COR, acabar, comNeve, malha, musgo, pintar, rocha, suave, tampa, type Lista } from "./_pedra-comum";

const LARGURA = 16;
const FUNDO = 8;

const modelo: Modelo = {
  id: "gruta",
  nome: "Boca de gruta",
  variacoes: 4,
  altura: [6, 9.5],
  raio: 8,
  estados: ["neve"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(7700 + variacao * 89);
    const sv = variacao * 23 + 11;
    const H = 6 + r() * 3.5;
    const xm = (r() - 0.5) * 2.4;
    const wm = 1.6 + r() * 0.9;
    const hm = 2.5 + r() * 1.1;
    const fundoBoca = 7;
    const [nx, nf, nt] = nivel === 0 ? [26, 16, 5] : nivel === 1 ? [12, 8, 3] : [4, 3, 2];

    const topo = (x: number) => {
      const u = Math.min(1, (2 * x) / LARGURA) ** 2;
      return 0.5 + (H - 0.5) * Math.pow(Math.max(0, 1 - u), 1.1) * (1 + (ruido3(x * 0.25, 0, 0, sv) - 0.5) * 0.25);
    };
    const face = (x: number, y: number) => {
      let z = -y * 0.42 + (ruido3(x * 0.3, y * 0.3, 0, sv + 1) - 0.5) * (nivel === 2 ? 0 : 1.6);
      const ey = y + (ruido3(x * 0.15, 0, 3, sv) - 0.5) * 2.5;
      z -= 0.22 * (1 - suave(0, 0.35, (ey % 2.3) / 2.3)); // estratos leves e tortos
      if (y < 1.5) z += 1.2 * (1 - y / 1.5) ** 2;
      return z;
    };
    const boca = (x: number, y: number) => {
      if (y < -0.01) return 0;
      const q = (((x - xm) / wm) ** 2 + (y / hm) ** 2) * (1 + (ruido3(x * 0.8, y * 0.8, 0, sv + 2) - 0.5) * 0.45);
      return q < 1 ? fundoBoca * Math.pow(1 - q, 0.45) : 0;
    };
    const ponto = (i: number, j: number) => {
      const s = (i / nx) * 2 - 1;
      const x = (Math.sign(s) * Math.abs(s) ** 1.35 * LARGURA) / 2;
      const ht = topo(x);
      if (j <= nf) {
        const y = (ht * j) / nf;
        return new THREE.Vector3(x, y, face(x, y) - (nivel === 2 ? 0 : boca(x, y)));
      }
      const zc = face(x, ht);
      if (j <= nf + nt) {
        const t = (j - nf) / nt;
        return new THREE.Vector3(x, ht * (1 - 0.85 * t * t) + (ruido3(x * 0.3, t * 2, 1, sv) - 0.5) * 0.6 * (1 - t), zc - t * FUNDO);
      }
      return new THREE.Vector3(x, 0, zc - FUNDO - 1);
    };
    const fundura = (p: THREE.Vector3) => Math.max(0, face(p.x, p.y) - p.z);
    const { geometrias, tampas } = malha(nx, nf + nt + 1, ponto, 2, (a, b, c) => (nivel < 2 && Math.max(fundura(a), fundura(b), fundura(c)) > 0.6 && Math.max(a.y, b.y, c.y) < hm + 0.5 ? 1 : 0));
    const opc = { alturaSombra: 2, sombra: 0.4, liquen: 0.4, escorrido: 0.5 };
    const encosta = pintar(geometrias[0], COR.gnaisse, sv, opc);
    const lista: Lista = [{ material: "pedra", geometria: encosta }];
    tampas.forEach((perfil, k) => lista.push({ material: "pedra", geometria: pintar(tampa(perfil, k ? 1 : -1), COR.gnaisse, sv, opc) }));

    // Dentro: escurece com a fundura até quase preto.
    const dentro = geometrias[1];
    if (nivel === 2) {
      const pos: number[] = [];
      const zf = face(xm, 0) + 0.35;
      for (let k = 0; k < 6; k++) {
        const [a0, a1] = [(k / 6) * Math.PI, ((k + 1) / 6) * Math.PI];
        pos.push(xm, 0.05, zf, xm + Math.cos(a0) * wm, Math.sin(a0) * hm, zf - Math.sin(a0) * hm * 0.42, xm + Math.cos(a1) * wm, Math.sin(a1) * hm, zf - Math.sin(a1) * hm * 0.42);
      }
      dentro.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      dentro.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
      dentro.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(pos.length).fill(1), 3));
      dentro.computeVertexNormals();
      // Vira para a frente se saiu ao contrário.
      if (dentro.attributes.normal.getZ(0) < 0) {
        for (let k = 0; k < pos.length; k += 9) for (let m = 0; m < 3; m++) [pos[k + 3 + m], pos[k + 6 + m]] = [pos[k + 6 + m], pos[k + 3 + m]];
        dentro.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        dentro.computeVertexNormals();
      }
    }
    if (dentro.attributes.position.count) {
      tingir(dentro, COR.escura, 0.1, sv);
      const p = dentro.attributes.position;
      const cor = dentro.attributes.color as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        const k = nivel === 2 ? 0.25 : 0.7 - 0.62 * Math.min(1, fundura(v.fromBufferAttribute(p, i)) / (fundoBoca * 0.5));
        cor.setXYZ(i, cor.getX(i) * k, cor.getY(i) * k, cor.getZ(i) * k);
      }
      lista.push({ material: "pedra-escura", geometria: dentro });
    }

    if (nivel < 2) {
      // Pedras caídas do beiço: duas grandes de lado, miúdas na soleira.
      const n = nivel === 0 ? 6 : 2;
      for (let k = 0; k < n; k++) {
        const grande = k < 2;
        const s = grande ? 0.7 + r() * 0.6 : 0.2 + r() * 0.3;
        const lado = k % 2 ? 1 : -1;
        const x = grande ? xm + lado * (wm + s * 0.6 + r() * 0.8) : xm + (r() - 0.5) * wm * 2.4;
        const zf = face(x, 0) + (grande ? 0.3 : 0.6 + r() * 1.8);
        const b = rocha({ raio: [s, s * 0.7, s * 0.85], detalhe: nivel === 0 ? (grande ? 2 : 1) : 0, seed: sv + k * 7, rug: 0.1, cortes: 4, forca: 0.85 });
        b.rotateY(r() * 3).translate(x, s * 0.5, zf);
        lista.push({ material: "pedra", geometria: pintar(acabar(b, 2), COR.gnaisse, sv + 60 + k, { alturaSombra: s, sombra: 0.35 }) });
      }
    }
    if (nivel === 0 && (estado.neve ?? 0) < 0.4) lista.push({ material: "musgo", geometria: musgo(encosta, sv, 0.45, H * 0.8, COR.musgo, 0.35) });
    for (const p of lista) p.geometria.translate(0, 0, FUNDO / 2 - 1);
    return pecas(comNeve(lista, estado.neve, nivel, variacao, 0.08));
  },
};

export default modelo;
