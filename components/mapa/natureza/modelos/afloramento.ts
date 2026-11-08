// Afloramento: granito/gnaisse mineiro rompendo o chão em lascas e placas
// inclinadas, todas no mesmo mergulho (a foliação da rocha), umas sobre as outras.
// Musgo nas reentrâncias de baixo, lascas soltas ao pé.

import * as THREE from "three";
import { pecas, sorteio } from "../ferramentas";
import type { Modelo } from "../tipos";
import { COR, acabar, comNeve, musgo, pintar, rocha, type Lista } from "./_pedra-comum";

const modelo: Modelo = {
  id: "afloramento",
  nome: "Afloramento de rocha",
  variacoes: 5,
  altura: [1.4, 3.2],
  raio: 4,
  estados: ["neve"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(3300 + variacao * 151);
    const mergulho = 0.35 + r() * 0.4;
    const rumo = r() * Math.PI * 2;
    const nPlacas = nivel === 2 ? 2 : nivel === 1 ? 3 : 4 + Math.floor(r() * 2);
    const cor = variacao % 2 ? COR.gnaisse : COR.granito;
    // Bandas da foliação: linhas claras/escuras paralelas ao mergulho.
    const nrm = new THREE.Vector3(-Math.sin(mergulho), Math.cos(mergulho), 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rumo);
    const faixa = (p: THREE.Vector3) => 0.9 + 0.14 * Math.sin(p.dot(nrm) * 9 + Math.sin(p.x * 1.3) * 1.5);

    const lista: Lista = [];
    for (let k = 0; k < nPlacas; k++) {
      const L = 3.4 + r() * 2.6 - k * 0.2;
      const esp = 0.55 + r() * 0.5;
      const larg = 2.2 + r() * 1.6;
      const detalhe = nivel === 0 ? 3 : nivel === 1 ? 1 : 0;
      const g = rocha({ raio: [L / 2, esp / 2, larg / 2], detalhe, seed: variacao * 40 + k, rug: 0.06, cortes: 7 + Math.floor(r() * 3), forca: 1, rachas: nivel === 0 ? 1 : 0, estratos: nivel === 0 ? 0.22 : 0 });
      // Placas em telhado: cada uma sai de baixo da anterior, mais alta e mais atrás.
      g.rotateZ(mergulho + (r() - 0.5) * 0.15).rotateY(rumo + (r() - 0.5) * 0.3);
      const passo = (k - nPlacas / 2) * (0.55 + r() * 0.3);
      const lado = (r() - 0.5) * 1.6;
      const dir = new THREE.Vector3(Math.cos(rumo), 0, -Math.sin(rumo));
      const perp = new THREE.Vector3(Math.sin(rumo), 0, Math.cos(rumo));
      const c = dir.multiplyScalar(-passo).add(perp.multiplyScalar(lado));
      g.translate(c.x, 0.25 + k * 0.32 + esp * 0.25 + r() * 0.35, c.z);
      const geo = pintar(acabar(g, 2.5), cor, variacao * 9 + k, { alturaSombra: 0.9, sombra: 0.38, liquen: 0.4, escorrido: 0.25, faixa: nivel === 2 ? undefined : faixa });
      lista.push({ material: "pedra", geometria: geo });
      if (nivel === 0 && (estado.neve ?? 0) < 0.4) lista.push({ material: "musgo", geometria: musgo(geo, variacao + k, 0.4, 0.7, COR.musgo, 0.15) });
    }
    if (nivel === 0) {
      for (let k = 0; k < 3 + Math.floor(r() * 3); k++) {
        const s = 0.12 + r() * 0.22;
        const a = r() * Math.PI * 2;
        const d = 1.8 + r() * 1.6;
        const l = rocha({ raio: [s * 1.4, s * 0.45, s], detalhe: 1, seed: variacao * 70 + k, rug: 0.08, cortes: 4, forca: 0.9 });
        l.rotateY(r() * 3).rotateZ((r() - 0.5) * 0.6).translate(Math.cos(a) * d, s * 0.25, Math.sin(a) * d);
        lista.push({ material: "pedra", geometria: pintar(acabar(l, 1), cor, variacao + 80 + k, { alturaSombra: 0.3 }) });
      }
    }
    return pecas(comNeve(lista, estado.neve, nivel, variacao, 0.07));
  },
};

export default modelo;
