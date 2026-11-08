// Matacão: bloco de granito arredondado e solto no pasto, de 2 a 6 m, com faces
// lascadas, rachaduras e às vezes um pedaço caído ao pé. Musgo no pé, líquen em cima.

import { pecas, sorteio } from "../ferramentas";
import type { Modelo } from "../tipos";
import { COR, acabar, comNeve, musgo, pintar, rocha, type Lista } from "./_pedra-comum";

const DIAMETROS = [2.4, 3.6, 4.8, 5.9, 3.1];

const modelo: Modelo = {
  id: "matacao",
  nome: "Matacão",
  variacoes: 5,
  altura: [1.5, 4.5],
  raio: 3.2,
  estados: ["neve"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(4100 + variacao * 131);
    const R = DIAMETROS[variacao % DIAMETROS.length] / 2;
    const ry = R * (0.62 + r() * 0.22);
    const rz = R * (0.72 + r() * 0.24);
    const detalhe = nivel === 0 ? 7 : nivel === 1 ? 3 : 1;
    const g = rocha({ raio: [R, ry, rz], detalhe, seed: variacao * 17 + 3, rug: 0.13, cortes: 3 + Math.floor(r() * 3), forca: 0.55, rachas: nivel === 2 ? 0 : 1 + Math.floor(r() * 2) });
    // Pesa embaixo: a barriga assenta e a pedra tomba um pouco para um lado.
    g.rotateZ((r() - 0.5) * 0.35).rotateX((r() - 0.5) * 0.25).rotateY(r() * Math.PI * 2);
    g.translate(0, ry * (0.78 - r() * 0.12), 0);
    const corpo = pintar(acabar(g, 3, true), COR.granito, variacao, { alturaSombra: ry * 0.7, sombra: 0.45, liquen: 0.45, escorrido: 0.4 });
    const lista: Lista = [{ material: "pedra", geometria: corpo }];

    if (nivel < 2) {
      // Lasca que se soltou e ficou ao pé.
      const nLascas = nivel === 0 ? 1 + Math.floor(r() * 2) : 1;
      for (let k = 0; k < nLascas; k++) {
        const s = R * (0.18 + r() * 0.16);
        const a = r() * Math.PI * 2;
        const l = rocha({ raio: [s, s * 0.6, s * 0.85], detalhe: nivel === 0 ? 2 : 0, seed: variacao * 31 + k, rug: 0.1, cortes: 4, forca: 0.85 });
        l.rotateY(r() * 3).translate(Math.cos(a) * (R + s * 0.6), s * 0.4, Math.sin(a) * (rz + s * 0.6));
        lista.push({ material: "pedra", geometria: pintar(acabar(l, 2), COR.granito, variacao + 40, { alturaSombra: s, sombra: 0.4 }) });
      }
    }
    if (nivel === 0 && (estado.neve ?? 0) < 0.4) lista.push({ material: "musgo", geometria: musgo(corpo, variacao, 0.45, ry * 0.75) });
    return pecas(comNeve(lista, estado.neve, nivel, variacao, 0.08));
  },
};

export default modelo;
