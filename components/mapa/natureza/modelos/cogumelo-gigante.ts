// Cogumelo gigante do Sertão de Fungos: pé grosso, torto e fibroso, com bulbo
// enterrado no lodo e saia rasgada; chapéu largo de borda caída e ondulada,
// lamelas por baixo, manchas e baba escorrendo da borda. Na base, um
// agrupamento de cogumelos menores do mesmo tipo.

import * as THREE from "three";
import { bolha, pecas, preparar, ruido3, sorteio, tingir, tubo } from "../ferramentas";
import type { Estado, Modelo, NomeMaterial, Nivel } from "../tipos";
import { avesso, manchar, suave } from "./_pantano-comum";

const PE = "#d6ccb4";
const CHAPEU = "#cdbf9c";
const LAMELA = "#8e7c62";
const MANCHA = "#7a6446";
const BABA = "#bdb68c";
const SECO_PE = "#a8977a";
const SECO_CHAPEU = "#a88d62";
const QUEIMADO = "#2c2622";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

/** Malha indexada em grade (anéis × ângulos), fechando a volta sem emenda. UV planar vista de cima. */
function grade(aneis: THREE.Vector3[][], raioUV: number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const n = aneis[0].length;
  for (const anel of aneis) {
    for (const p of anel) {
      pos.push(p.x, p.y, p.z);
      uv.push(0.5 + p.x / (2 * raioUV), 0.5 + p.z / (2 * raioUV));
    }
  }
  for (let i = 0; i < aneis.length - 1; i++) {
    for (let k = 0; k < n; k++) {
      const a = i * n + k;
      const b = i * n + ((k + 1) % n);
      const c = (i + 1) * n + k;
      const d = (i + 1) * n + ((k + 1) % n);
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return preparar(g);
}

type Chapeu = { cima: THREE.BufferGeometry; baixo: THREE.BufferGeometry; lamelas: THREE.BufferGeometry | null; borda: THREE.Vector3[] };

/** Chapéu em coordenadas locais: centro do pé em (0, 0, 0), domo para cima, borda caída. */
function chapeu(R: number, domo: number, caida: number, rPe: number, seed: number, nivel: Nivel, seca: boolean, comLamelas: boolean): Chapeu {
  const segA = nivel === 0 ? 24 : nivel === 1 ? 12 : 6;
  const segR = nivel === 0 ? 7 : nivel === 1 ? 3 : 2;
  const borda = (a: number) => {
    const onda = ruido3(Math.cos(a) * 1.8, Math.sin(a) * 1.8, seed * 0.37, seed) - 0.5;
    const fino = ruido3(Math.cos(a) * 6, Math.sin(a) * 6, seed * 0.37, seed + 2) - 0.5;
    return { raio: R * (1 + onda * 0.12 + fino * 0.05), cai: caida * (1 + onda * 1.2) * (seca ? -0.4 : 1) };
  };
  const cima: THREE.Vector3[][] = [];
  const baixo: THREE.Vector3[][] = [];
  const bordaPts: THREE.Vector3[] = [];
  // Topo: um ponto só (anel degenerado) até a borda, com o lábio dobrado para baixo.
  for (let i = 0; i <= segR; i++) {
    const t = i / segR;
    const anel: THREE.Vector3[] = [];
    for (let k = 0; k < segA; k++) {
      const a = (k / segA) * Math.PI * 2;
      const b = borda(a);
      const rho = b.raio * (t * 0.85 + Math.sin((t * Math.PI) / 2) * 0.15);
      const y = domo * (1 - t * t) - b.cai * t ** 3 + (ruido3(Math.cos(a) * t * 3, t * 2, Math.sin(a) * t * 3, seed + 4) - 0.5) * R * 0.05 * t;
      anel.push(new THREE.Vector3(Math.cos(a) * rho, y, Math.sin(a) * rho));
    }
    cima.push(anel);
  }
  for (const p of cima[segR]) bordaPts.push(p.clone());
  // Lábio da borda (um pouco de espessura) e a face de baixo, que sobe até o pé.
  const segB = nivel === 0 ? 4 : 1;
  for (let i = 0; i <= segB; i++) {
    const s = i / segB;
    const anel: THREE.Vector3[] = [];
    for (let k = 0; k < segA; k++) {
      const e = bordaPts[k];
      const dir = new THREE.Vector3(e.x, 0, e.z).normalize();
      const rhoBorda = Math.hypot(e.x, e.z);
      const rho = rhoBorda * 0.97 - (rhoBorda * 0.97 - rPe) * s;
      const y = e.y - R * 0.04 + (0 - (e.y - R * 0.04)) * Math.sin((s * Math.PI) / 2) ** 0.8;
      anel.push(dir.multiplyScalar(rho).setY(y));
    }
    baixo.push(anel);
  }
  // Fecha o miolo por baixo (senão a luz passa pelo meio e a sombra fura).
  baixo.push(baixo[0].map(() => new THREE.Vector3(0, R * 0.02, 0)));
  const gCima = grade([...cima, baixo[0]], R * 1.3);
  const gBaixo = grade(baixo, R * 1.3);
  // A face de baixo vai da borda para dentro: a normal já sai apontando para o chão.

  let lamelas: THREE.BufferGeometry | null = null;
  if (nivel === 0 && comLamelas) {
    // Lamelas: lâminas radiais finas penduradas na face de baixo, das duas faces.
    const pos: number[] = [];
    const uv: number[] = [];
    const nl = 36;
    const passos = 3;
    for (let k = 0; k < nl; k++) {
      const a = (k / nl) * Math.PI * 2 + 0.03;
      const kk = Math.floor((a / (Math.PI * 2)) * segA) % segA;
      const e = bordaPts[kk];
      const rb = Math.hypot(e.x, e.z) * 0.86;
      const curta = k % 2 === 1 ? 0.45 : 0;
      const topo: THREE.Vector3[] = [];
      const fundo: THREE.Vector3[] = [];
      for (let i = 0; i <= passos; i++) {
        const s = curta + (1 - curta) * (i / passos);
        const rho = rb - (rb - rPe) * s;
        const y = e.y - R * 0.04 + (0 - (e.y - R * 0.04)) * Math.sin((s * Math.PI) / 2) ** 0.8 - R * 0.01;
        const p = new THREE.Vector3(Math.cos(a) * rho, y, Math.sin(a) * rho);
        topo.push(p);
        fundo.push(p.clone().setY(y - R * 0.08 * Math.sin(Math.min(1, s * 1.15) * Math.PI) ** 0.7 - R * 0.01));
      }
      for (let i = 0; i < passos; i++) {
        const [p1, p2, q1, q2] = [topo[i], topo[i + 1], fundo[i], fundo[i + 1]];
        const v0 = i / passos;
        const v1 = (i + 1) / passos;
        pos.push(...p1.toArray(), ...q1.toArray(), ...p2.toArray(), ...p2.toArray(), ...q1.toArray(), ...q2.toArray());
        uv.push(0, v0, 1, v0, 0, v1, 0, v1, 1, v0, 1, v1);
        pos.push(...p1.toArray(), ...p2.toArray(), ...q1.toArray(), ...p2.toArray(), ...q2.toArray(), ...q1.toArray());
        uv.push(0, v0, 0, v1, 1, v0, 0, v1, 1, v1, 1, v0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    lamelas = preparar(g);
  }
  return { cima: gCima, baixo: gBaixo, lamelas, borda: bordaPts };
}

/** Um cogumelo inteiro em `onde`, de altura H, inclinado para `dir`. */
function cogumelo(r: () => number, H: number, onde: THREE.Vector3, nivel: Nivel, estado: Estado, seed: number, principal: boolean): Lista {
  const lista: Lista = [];
  const seca = !!estado.seca;
  const queimada = !!estado.queimada;
  const mat: NomeMaterial = queimada ? "carvao" : "cogumelo";
  const corPe = queimada ? QUEIMADO : seca ? SECO_PE : PE;
  const corChapeu = queimada ? QUEIMADO : seca ? SECO_CHAPEU : CHAPEU;
  const R = H * (0.48 + r() * 0.2);
  const rPe = H * (0.085 + r() * 0.035);
  const dir = r() * Math.PI * 2;
  const tomba = H * (0.06 + r() * 0.16);
  const topo = new THREE.Vector3(Math.cos(dir) * tomba, H * 0.86, Math.sin(dir) * tomba);

  // Pé: bulbo enterrado, afina no meio, alarga sob o chapéu. Sempre um pouco torto.
  const ctr = [
    new THREE.Vector3(0, -0.15 * H, 0),
    new THREE.Vector3((r() - 0.5) * rPe, H * 0.25, (r() - 0.5) * rPe),
    new THREE.Vector3(topo.x * 0.45 + (r() - 0.5) * rPe * 1.5, H * 0.55, topo.z * 0.45 + (r() - 0.5) * rPe * 1.5),
    topo,
  ];
  const eixo = suave(ctr, nivel === 0 ? 9 : nivel === 1 ? 4 : 2);
  const raios = eixo.map((p) => {
    const t = Math.max(0, p.y) / (H * 0.86);
    return rPe * (1 + 0.9 * Math.max(0, 1 - t * 4) ** 2 + 0.35 * Math.max(0, t - 0.8) * 5 - 0.12 * Math.sin(t * Math.PI));
  });
  const pe = tubo(eixo, raios, nivel === 0 ? 12 : nivel === 1 ? 6 : 4);
  if (nivel < 2) {
    // Fibras do pé: sulcos verticais (o ruído alongado em y vira estria).
    const p = pe.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
      const f = (ruido3(x * 6 / H * 4, y * 0.3, z * 6 / H * 4, seed) - 0.5) * rPe * 0.18;
      p.setXYZ(i, x + f, y, z + f);
    }
    pe.computeVertexNormals();
  }
  pe.translate(onde.x, onde.y, onde.z);
  tingir(pe, corPe, 0.14, seed, 0.35, H * 0.3);
  if (!queimada) {
    manchar(pe, seca ? "#7d6c52" : "#8d8a60", 2.5 / H, 0.5, 0.65, seed + 1, H * 0.35);
    manchar(pe, "#e2d9c4", 7 / H, 0.62, 0.45, seed + 2);
  }
  lista.push({ material: mat, geometria: pe });

  // Saia rasgada pendurada no pé, logo abaixo do chapéu.
  if (nivel === 0 && principal) {
    const ys = H * (0.68 + r() * 0.08);
    const c = eixo.reduce((m, q) => (Math.abs(q.y - ys) < Math.abs(m.y - ys) ? q : m));
    const segA = 18;
    const aneis: THREE.Vector3[][] = [[], []];
    for (let k = 0; k < segA; k++) {
      const a = (k / segA) * Math.PI * 2;
      const rasgo = ruido3(Math.cos(a) * 3, Math.sin(a) * 3, seed, seed + 6);
      aneis[0].push(new THREE.Vector3(c.x + Math.cos(a) * rPe * 0.95, c.y, c.z + Math.sin(a) * rPe * 0.95));
      aneis[1].push(new THREE.Vector3(c.x + Math.cos(a) * rPe * 1.55, c.y - H * (0.04 + rasgo * 0.12), c.z + Math.sin(a) * rPe * 1.55));
    }
    const saia = grade(aneis, R).translate(onde.x, onde.y, onde.z);
    // As duas faces: de perto se vê por dentro.
    for (const s of [saia, avesso(saia.clone())]) {
      tingir(s, queimada ? QUEIMADO : seca ? "#9a8a6c" : "#bfb293", 0.2, seed + 3);
      lista.push({ material: mat, geometria: s });
    }
  }

  // Chapéu, inclinado junto com o pé.
  const ch = chapeu(R, R * (0.13 + r() * 0.1), R * (0.12 + r() * 0.12), rPe * 1.25, seed, nivel, seca, principal);
  const giro = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(-Math.sin(dir), 0, Math.cos(dir)), -(tomba / H) * 0.8 - r() * 0.08);
  const lugar = new THREE.Matrix4().makeTranslation(onde.x + topo.x, onde.y + topo.y, onde.z + topo.z).multiply(giro);
  for (const g of [ch.cima, ch.baixo, ch.lamelas]) g?.applyMatrix4(lugar);
  const yRef = onde.y + topo.y;

  tingir(ch.cima, corChapeu, 0.16, seed + 4);
  if (!queimada) {
    // Topo mais claro e liso, borda mais suja; pintas e manchas de podre.
    manchar(ch.cima, seca ? "#c2ab80" : "#ddd3b8", 1.2 / R, 0.45, 0.6, seed + 5);
    manchar(ch.cima, seca ? "#6b5434" : MANCHA, 4 / R, 0.6, 0.85, seed + 6);
    manchar(ch.cima, "#5a5236", 9 / R, 0.7, 0.7, seed + 7);
  } else {
    manchar(ch.cima, "#4a3a2a", 3 / R, 0.6, 0.6, seed + 6);
  }
  lista.push({ material: mat, geometria: ch.cima });
  tingir(ch.baixo, queimada ? "#1e1a17" : seca ? "#6e5e46" : LAMELA, 0.12, seed + 8, 0.35, yRef);
  lista.push({ material: mat, geometria: ch.baixo });
  if (ch.lamelas) {
    tingir(ch.lamelas, queimada ? "#24201c" : seca ? "#7c6a50" : "#9c8a6e", 0.18, seed + 9, 0.3, yRef);
    lista.push({ material: mat, geometria: ch.lamelas });
  }

  // Baba escorrendo da borda (só no vivo e de perto).
  if (nivel === 0 && !seca && !queimada) {
    const nb = principal ? 6 + Math.floor(r() * 5) : 2;
    const borda = ch.borda.map((p) => p.clone().applyMatrix4(lugar));
    for (let i = 0; i < nb; i++) {
      const de = borda[Math.floor(r() * borda.length)];
      const comp = R * (0.04 + r() * 0.14);
      const fim = de.clone().add(new THREE.Vector3((r() - 0.5) * 0.05, -comp, (r() - 0.5) * 0.05));
      const gota = tubo([de, de.clone().lerp(fim, 0.7), fim], [R * 0.012, R * 0.006, R * 0.01], 4, true);
      lista.push({ material: "cogumelo", geometria: tingir(gota, BABA, 0.15, seed + 10 + i) });
    }
  }

  if (estado.neve) {
    // Neve no chapéu pintada na própria malha (o chapéu é uma cúpula lisa: uma
    // casca de neve copiada dobraria os triângulos sem mudar a silhueta).
    const n = ch.cima.attributes.normal;
    const p = ch.cima.attributes.position;
    const cores = ch.cima.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const borda = (ruido3(p.getX(i) * 1.5, p.getY(i) * 1.5, p.getZ(i) * 1.5, seed + 30) - 0.5) * 0.3;
      const t = Math.max(0, Math.min(1, (n.getY(i) - (1 - estado.neve * 0.9) + borda) * 4));
      cores.setXYZ(i, cores.getX(i) + (0.93 - cores.getX(i)) * t, cores.getY(i) + (0.95 - cores.getY(i)) * t, cores.getZ(i) + (0.97 - cores.getZ(i)) * t);
    }
    cores.needsUpdate = true;
  }
  return lista;
}

const modelo: Modelo = {
  id: "cogumelo-gigante",
  nome: "Cogumelo gigante (Sertão de Fungos)",
  variacoes: 5,
  altura: [3, 9],
  raio: 4,
  estados: ["neve", "seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(5300 + variacao * 173);
    const H = 3 + r() * 6;
    const lista: Lista = [];
    lista.push(...cogumelo(r, H, new THREE.Vector3(0, 0, 0), nivel, estado, variacao * 31, true));
    if (nivel === 2) return pecas(lista);

    // Variações 1 e 3: um segundo cogumelo médio crescendo colado ao grande.
    if (variacao % 2 === 1) {
      const a = r() * Math.PI * 2;
      const d = H * (0.35 + r() * 0.15);
      lista.push(...cogumelo(r, H * (0.45 + r() * 0.2), new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), nivel, estado, variacao * 31 + 50, false));
    }
    // Agrupamento de pequenos no pé.
    const np = nivel === 0 ? (variacao % 2 === 1 ? 2 : 3 + Math.floor(r() * 3)) : 2;
    for (let i = 0; i < np; i++) {
      const a = r() * Math.PI * 2;
      const d = H * 0.24 + r() * H * 0.3;
      const h = 0.3 + r() * Math.min(1.4, H * 0.18);
      lista.push(...cogumelo(r, h, new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), nivel === 0 ? 1 : 2, estado, variacao * 31 + 100 + i, false));
    }
    // Lodo no pé (tufo de musgo achatado), para o cogumelo sair do chão e não pousar nele.
    if (nivel === 0 && !estado.queimada) {
      const lodo = bolha(H * 0.14, 1, 0.45, variacao + 3, 0.1).translate(0, 0, 0);
      lista.push({ material: "musgo", geometria: tingir(lodo, estado.seca ? "#6e6650" : "#5d6240", 0.25, variacao, 0.3, H * 0.05) });
    }
    return pecas(lista);
  },
};

export default modelo;
