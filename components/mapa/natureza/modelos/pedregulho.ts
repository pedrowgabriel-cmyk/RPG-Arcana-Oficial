// Pedregulho: punhado de pedras pequenas espalhadas, umas angulosas (quebradas)
// e outras roladas, agrupadas como o tempo deixa: perto de uma maior, rareando.

import { pecas, sorteio } from "../ferramentas";
import type { Modelo } from "../tipos";
import { COR, acabar, comNeve, pintar, rocha, type Lista } from "./_pedra-comum";

const TONS = [COR.granito, COR.gnaisse, "#8a7f70", "#958d80"];

const modelo: Modelo = {
  id: "pedregulho",
  nome: "Pedregulho",
  variacoes: 5,
  altura: [0.3, 0.9],
  raio: 2.5,
  estados: ["neve"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(5200 + variacao * 113);
    const n = 9 + Math.floor(r() * 6);
    const pedras: { x: number; z: number; s: number }[] = [];
    // Uma ou duas "mães" e o resto em volta, cada vez menor e mais longe.
    const maes = 1 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const mae = i < maes;
      const s = mae ? 0.45 + r() * 0.35 : 0.1 + Math.pow(r(), 1.8) * 0.35;
      const a = r() * Math.PI * 2;
      const d = mae ? r() * 0.8 : 0.5 + Math.pow(r(), 0.8) * 2.2;
      const ref = pedras[Math.floor(r() * Math.min(maes, pedras.length))] ?? { x: 0, z: 0 };
      pedras.push({ x: (mae ? 0 : ref.x) + Math.cos(a) * d, z: (mae ? 0 : ref.z) + Math.sin(a) * d * 0.8, s });
    }
    pedras.sort((a, b) => b.s - a.s);
    const usadas = nivel === 2 ? pedras.slice(0, 3) : pedras;
    const lista: Lista = [];
    usadas.forEach((p, i) => {
      const rolada = r() < 0.4;
      const detalhe = nivel === 2 ? 0 : nivel === 1 ? (p.s > 0.4 ? 1 : 0) : p.s > 0.3 ? 2 : 1;
      const ry = p.s * (0.45 + r() * 0.3);
      const g = rocha({ raio: [p.s, ry, p.s * (0.7 + r() * 0.3)], detalhe, seed: variacao * 50 + i, rug: rolada ? 0.08 : 0.14, cortes: rolada ? 1 : 3 + Math.floor(r() * 3), forca: rolada ? 0.4 : 0.85 });
      g.rotateZ((r() - 0.5) * 0.4).rotateY(r() * Math.PI * 2).translate(p.x, ry * 0.65, p.z);
      lista.push({ material: "pedra", geometria: pintar(acabar(g, 1.5, rolada), TONS[Math.floor(r() * TONS.length)], variacao * 7 + i, { alturaSombra: ry, sombra: 0.4, liquen: 0.2 }) });
    });
    return pecas(comNeve(lista, estado.neve, nivel, variacao, 0.04));
  },
};

export default modelo;
