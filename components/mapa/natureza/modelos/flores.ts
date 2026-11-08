// Moita de flores do campo (margaridinha, cosmos, assa-peixe, picão): um tufo de
// folha rasteira com hastes finas e as flores como pontos de cor por cima.
// Cada variação puxa uma cor (amarelo, roxo ou branco) com algumas intrusas.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { pecas, preparar, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial } from "../tipos";
import { degrade, desviar, lamina } from "./_chao-comum";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

/**
 * Corola: pétalas em triângulo saindo do centro (5 tris), virada para `normal`.
 * Cor chapada, sem atlas (a folha do atlas sujava a flor de nervura escura).
 * UV planar no disco, para uma textura de pétala entrar depois.
 */
function corola(centro: THREE.Vector3, raio: number, normal: THREE.Vector3, petalas: number, giro: number, r: () => number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const meia = (Math.PI / petalas) * 0.8;
  for (let k = 0; k < petalas; k++) {
    const a = giro + (k / petalas) * Math.PI * 2;
    const rr = raio * (0.8 + r() * 0.35);
    const [a0, a1] = [a - meia, a + meia];
    // Ponta da pétala um pouco caída: a flor tem cálice, não é prato.
    pos.push(0, 0, 0, Math.cos(a1) * rr, -rr * 0.15, Math.sin(a1) * rr, Math.cos(a0) * rr, -rr * 0.15, Math.sin(a0) * rr);
    uv.push(0.5, 0.5, 0.5 + Math.cos(a1) * 0.5, 0.5 + Math.sin(a1) * 0.5, 0.5 + Math.cos(a0) * 0.5, 0.5 + Math.sin(a0) * 0.5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal));
  g.translate(centro.x, centro.y, centro.z);
  g.computeVertexNormals();
  return preparar(g);
}

const CORES = ["#f0c63e", "#9a62b4", "#f4f0e4"];
const SECA = "#8a6a44";
const FOLHA = { viva: { pe: "#4a5a2e", ponta: "#7f9450" }, seca: { pe: "#6a5634", ponta: "#b49a62" } };
const HASTE = { viva: "#5d7038", seca: "#8c7448" };

const modelo: Modelo = {
  id: "flores",
  nome: "Flores do campo",
  variacoes: 6,
  altura: [0.3, 0.7],
  raio: 0.35,
  estados: ["seca"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(7700 + variacao * 71);
    const seca = !!estado.seca;
    const h = 0.3 + r() * 0.4;
    const largo = 0.18 + r() * 0.2;
    const dominante = variacao % 3;
    const folha = seca ? FOLHA.seca : FOLHA.viva;
    const lista: Lista = [];

    // Folhagem do pé: capim curto e largo.
    const tufos = nivel === 0 ? 6 : nivel === 1 ? 3 : 2;
    for (let i = 0; i < tufos; i++) {
      const a = r() * Math.PI * 2;
      const d = nivel === 2 ? 0 : Math.sqrt(r()) * largo * 0.4;
      const alt = h * (0.45 + r() * 0.25);
      const g = lamina(new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), a, alt * 1.4, alt, nivel === 0 ? alt * 0.3 : 0, ATLAS.capim, nivel === 0 ? 2 : 1, 0.3, a).translate(0, -0.02, 0);
      lista.push({ material: "folhagem", geometria: degrade(g, desviar(folha.pe, r), desviar(folha.ponta, r), h * 0.6, 0.12, variacao + i, 0.8) });
    }

    // Flores: haste fina (só perto) e cabeça virada para o céu, inclinada ao acaso.
    const quantas = nivel === 0 ? 14 + Math.floor(r() * 8) : nivel === 1 ? 9 : 4;
    const vento = r() * Math.PI * 2;
    for (let i = 0; i < quantas; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * largo * 0.6;
      const pe = new THREE.Vector3(Math.cos(a) * d * 0.4, 0, Math.sin(a) * d * 0.4);
      const alt = h * (0.65 + r() * 0.4);
      const topo = new THREE.Vector3(Math.cos(a) * d + Math.cos(vento) * alt * 0.08, alt, Math.sin(a) * d + Math.sin(vento) * alt * 0.08);
      if (nivel === 0) {
        const meio = pe.clone().lerp(topo, 0.5).add(new THREE.Vector3((r() - 0.5) * 0.04, 0, (r() - 0.5) * 0.04));
        const g = tubo([pe, meio, topo], [0.004, 0.003, 0.0025], 3);
        lista.push({ material: "musgo", geometria: tingir(g, seca ? HASTE.seca : HASTE.viva, 0.12, variacao) });
      }
      // Seca: metade das cabeças já caiu; o resto é miolo marrom.
      if (seca && r() < 0.5) continue;
      const qual = r() < 0.8 ? dominante : Math.floor(r() * 3);
      const cor = seca ? desviar(SECA, r, 0.03, 0.15) : desviar(CORES[qual], r, 0.015, 0.1);
      const tam = (seca ? 0.025 : qual === 1 ? 0.03 : 0.035) * (0.8 + r() * 0.5) * (nivel === 2 ? 2.4 : nivel === 1 ? 1.5 : 1);
      const normal = new THREE.Vector3((r() - 0.5) * 0.9, 1, (r() - 0.5) * 0.9).normalize();
      const flor = corola(topo, tam, normal, nivel === 0 ? 5 : 4, r() * Math.PI * 2, r);
      // Sem sombra do chão: a flor é o ponto mais claro da moita.
      lista.push({ material: "petala", geometria: tingir(flor, cor, 0.08, variacao + i) });
      // Miolo amarelo nas brancas e roxas (só perto): um triângulo acima do centro.
      if (nivel === 0 && !seca && qual !== 0) {
        const miolo = corola(topo.clone().addScaledVector(normal, 0.004), tam * 0.3, normal, 3, r() * 6.28, r);
        lista.push({ material: "petala", geometria: tingir(miolo, "#d8a42c", 0.05, variacao) });
      }
    }
    return pecas(lista);
  },
};

export default modelo;
