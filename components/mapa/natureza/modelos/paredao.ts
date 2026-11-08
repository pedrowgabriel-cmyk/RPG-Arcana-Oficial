// Paredão: trecho modular de penhasco (30 m de frente, 24 a 34 m de altura) com
// estratos horizontais, beirais, caneluras verticais, escorrido escuro e tálus
// de blocos caídos no pé. As pontas (x = ±15) têm o mesmo perfil dentro de cada
// família, então trechos da mesma família encaixam lado a lado.
// Famílias: 0–2 cinza 24 m · 3–5 cinza 34 m · 6–7 vermelha 30 m (cânion).

import * as THREE from "three";
import { pecas, ruido3, sorteio } from "../ferramentas";
import type { Modelo } from "../tipos";
import { COR, acabar, comNeve, malha, musgo, pintar, rocha, suave, tampa, type Lista } from "./_pedra-comum";

const LARGURA = 30;
const FUNDO = 10;

type Camada = { y0: number; T: number; sai: number; tom: number };

function familia(variacao: number) {
  if (variacao >= 6) return { id: 2, altura: 30, vermelha: true };
  return variacao >= 3 ? { id: 1, altura: 34, vermelha: false } : { id: 0, altura: 24, vermelha: false };
}

function camadas(id: number, H: number) {
  const r = sorteio(9000 + id * 77);
  const lista: Camada[] = [];
  for (let y = 0; y < H + 6; ) {
    const T = 1.6 + r() * 4.2;
    lista.push({ y0: y, T, sai: (r() - 0.5) * 3.2, tom: 0.84 + r() * 0.3 });
    y += T;
  }
  return lista;
}

const camadaEm = (cs: Camada[], y: number) => cs.find((c) => y >= c.y0 && y < c.y0 + c.T) ?? cs[cs.length - 1];

const modelo: Modelo = {
  id: "paredao",
  nome: "Trecho de paredão",
  variacoes: 8,
  altura: [24, 34],
  raio: 15,
  estados: ["neve"],
  gerar(variacao, nivel, estado) {
    const fam = familia(variacao);
    const H = fam.altura;
    const cs = camadas(fam.id, H);
    const sv = variacao * 37 + 5;
    const r = sorteio(9500 + variacao * 101);
    const [nx, nf, nt] = nivel === 0 ? [26, 26, 4] : nivel === 1 ? [10, 9, 2] : [3, 3, 1];

    // e = 0 nas pontas (perfil comum da família), 1 no miolo (cara própria da variação).
    const miolo = (x: number) => suave(0, 0.18, 0.5 - Math.abs(x / LARGURA)) ;
    const topo = (x: number) => H + miolo(x) * (ruido3(x * 0.09, 0, 0, sv + 8) - 0.5) * 5;
    const frente = (x: number, y: number) => {
      const e = miolo(x);
      const c = camadaEm(cs, y);
      const t = (y - c.y0) / c.T;
      let z = -y * 0.1 + c.sai + e * (ruido3(c.y0, 0, 0, sv) - 0.5) * 1.6;
      z -= 1.5 * (1 - suave(0, 0.4, t)); // pé da camada recuado: beiral em cima
      if (y < 4.5) z += 3.6 * Math.pow(1 - y / 4.5, 2); // tálus
      if (nivel < 2) {
        z += e * (ruido3(x * 0.16, y * 0.13, 0, sv + 1) - 0.5) * 2.6;
        const cana = ruido3(x * 0.13, y * 0.01, 0, sv + 2);
        if (cana > 0.58) z -= e * ((cana - 0.58) / 0.42) * 4.5 * suave(2, 6, y);
      }
      return z;
    };
    const ponto = (i: number, j: number) => {
      const x = (i / nx - 0.5) * LARGURA;
      const ht = topo(x);
      if (j <= nf) {
        const y = (ht * j) / nf;
        return new THREE.Vector3(x, y, frente(x, y));
      }
      const zc = frente(x, ht);
      if (j <= nf + nt) {
        const t = (j - nf) / nt;
        const y = ht - 0.6 * Math.sin(t * Math.PI) * miolo(x) + (nivel === 0 ? miolo(x) * (ruido3(x * 0.3, t * 3, 0, sv + 4) - 0.5) * 1.2 : 0);
        return new THREE.Vector3(x, y - t * 1.2, zc - t * FUNDO);
      }
      return new THREE.Vector3(x, 0, zc - FUNDO - 3);
    };
    const { geometrias, tampas } = malha(nx, nf + nt + 1, ponto);
    const corBase = fam.vermelha ? COR.vermelha : COR.gnaisse;
    const material = fam.vermelha ? "pedra-vermelha" : "pedra";
    const faixa = (p: THREE.Vector3) => {
      const c = camadaEm(cs, p.y);
      return (fam.vermelha ? 0.8 + (c.tom - 0.84) * 1.4 : c.tom) * (1 + (ruido3(p.x * 0.5, p.y * 3, 0, sv) - 0.5) * 0.08);
    };
    const opc = { alturaSombra: 5, sombra: 0.35, liquen: fam.vermelha ? 0.05 : 0.3, escorrido: 0.6, faixa, variacao: 0.12 };
    const parede = pintar(geometrias[0], corBase, sv, opc);
    const lista: Lista = [{ material, geometria: parede }];
    tampas.forEach((perfil, k) => lista.push({ material, geometria: pintar(tampa(perfil, k ? 1 : -1), corBase, sv, opc) }));

    if (nivel < 2) {
      // Blocos caídos no tálus.
      const n = nivel === 0 ? 4 + Math.floor(r() * 3) : 2;
      for (let k = 0; k < n; k++) {
        const s = 0.6 + r() * 1.4;
        const x = (r() - 0.5) * LARGURA * 0.8;
        const b = rocha({ raio: [s, s * 0.7, s * 0.9], detalhe: nivel === 0 ? 1 : 0, seed: sv + k * 3, rug: 0.1, cortes: 4, forca: 0.9 });
        b.rotateY(r() * 3).translate(x, s * 0.5, frente(x, 0) + 0.5 + r() * 3);
        lista.push({ material, geometria: pintar(acabar(b, 2), corBase, sv + 50 + k, { alturaSombra: s, sombra: 0.35, faixa: () => 0.95 }) });
      }
    }
    if (nivel === 0 && (estado.neve ?? 0) < 0.4) {
      // Capim e musgo nos beirais.
      lista.push({ material: "musgo", geometria: musgo(parede, sv, fam.vermelha ? 0.3 : 0.55, H + 4, fam.vermelha ? "#8a7a4c" : COR.capim, 0.55) });
    }
    // Centro do modelo em z = 0.
    for (const p of lista) p.geometria.translate(0, 0, FUNDO / 2 - 1);
    return pecas(comNeve(lista, estado.neve, nivel, variacao, 0.15));
  },
};

export default modelo;
