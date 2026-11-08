// Lajedo: laje de pedra baixa e larga rente ao chão, com o topo quase chato,
// bordas gastas e arredondadas, juntas (rachas) cortando a superfície, manchas
// escuras de líquen e escorrido, e um ou outro bloco solto por cima.

import { pecas, sorteio } from "../ferramentas";
import type { Modelo } from "../tipos";
import { COR, acabar, comNeve, musgo, pintar, rocha, type Lista } from "./_pedra-comum";

const modelo: Modelo = {
  id: "lajedo",
  nome: "Lajedo",
  variacoes: 4,
  altura: [0.4, 1.2],
  raio: 7,
  estados: ["neve"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(6100 + variacao * 97);
    const rx = 4.5 + r() * 4;
    const rz = rx * (0.55 + r() * 0.3);
    const alto = 0.45 + r() * 0.7;
    const ry = alto * 2.4;
    const detalhe = nivel === 0 ? (estado.neve ? 7 : 8) : nivel === 1 ? 3 : 1;
    const g = rocha({ raio: [rx, ry, rz], detalhe, seed: variacao * 13 + 2, rug: 0.16, cortes: 3, forca: 0.6, rachas: nivel === 2 ? 0 : 3 + Math.floor(r() * 2) });
    // Achata o topo (com ondulação leve) e enterra quase tudo: só a carapaça aparece.
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - ry + alto;
      const teto = alto * (0.7 + 0.3 * Math.sin(p.getX(i) * 0.4 + variacao) * Math.cos(p.getZ(i) * 0.5));
      if (y > teto) y = teto + (y - teto) * 0.18;
      p.setY(i, y);
    }
    g.rotateY(r() * Math.PI * 2);
    const corpo = pintar(acabar(g, 3, true), COR.lajedo, variacao, { alturaSombra: alto * 0.8, sombra: 0.35, liquen: 0.55, escorrido: 0.55, variacao: 0.18 });
    const lista: Lista = [{ material: "pedra", geometria: corpo }];
    if (nivel < 2) {
      const n = nivel === 0 ? 1 + Math.floor(r() * 3) : 1;
      for (let k = 0; k < n; k++) {
        const s = 0.3 + r() * 0.5;
        const a = r() * Math.PI * 2;
        const d = r() * rx * 0.6;
        const b = rocha({ raio: [s, s * 0.55, s * 0.8], detalhe: nivel === 0 ? 2 : 0, seed: variacao * 21 + k, rug: 0.1, cortes: 4, forca: 0.85 });
        b.rotateY(r() * 3).translate(Math.cos(a) * d, alto * 0.75 + s * 0.35, Math.sin(a) * d * 0.6);
        lista.push({ material: "pedra", geometria: pintar(acabar(b, 2), COR.granito, variacao + 30 + k, { alturaSombra: alto + s, sombra: 0.3 }) });
      }
    }
    if (nivel === 0 && (estado.neve ?? 0) < 0.4) lista.push({ material: "musgo", geometria: musgo(corpo, variacao, 0.35, alto * 0.5, COR.capim, 0) });
    return pecas(comNeve(lista, estado.neve, nivel, variacao, 0.06));
  },
};

export default modelo;
