// Colisão e rota dentro de um lugar. Sem Three.js. Grade espacial porque uma
// cidade grande tem centenas de prédios e isto roda a cada passo.

import type { Bloqueios } from "./mundo";
import type { Relevo } from "./relevo";
import type { Area, Cidade, Face, Ponto, Predio, Rua, XZ } from "./tipos";

const FOLGA = 0.5;
const ESPESSURA_PAREDE = 0.5;
const MEIA_PORTA = 2;
const CELULA = 32;
const PASSO_GRADE = 1;
const MAX_NOS = 400_000;
const PESO_HEURISTICA = 1.6;
const INCLINACAO_MAXIMA = 1.4; // 54°: paredão, só passa em rua

export const SEM_BLOQUEIOS: Bloqueios = { entrada: [], vista: [] };

export function dentroDoPoligono(x: number, z: number, pts: XZ[]) {
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i];
    const [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

export function distanciaAoSegmento(x: number, z: number, a: XZ, b: XZ) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}

export function faceDaPorta(p: Predio): Face {
  return p.porta ?? "s";
}

export function portaDe(p: Predio): Ponto {
  const f = faceDaPorta(p);
  if (f === "s") return { x: p.x, z: p.z + p.fundo / 2 };
  if (f === "n") return { x: p.x, z: p.z - p.fundo / 2 };
  if (f === "l") return { x: p.x + p.largura / 2, z: p.z };
  return { x: p.x - p.largura / 2, z: p.z };
}

function naPorta(p: Predio, x: number, z: number) {
  const f = faceDaPorta(p);
  if (f === "s") return z > p.z && Math.abs(x - p.x) < MEIA_PORTA - FOLGA;
  if (f === "n") return z < p.z && Math.abs(x - p.x) < MEIA_PORTA - FOLGA;
  if (f === "l") return x > p.x && Math.abs(z - p.z) < MEIA_PORTA - FOLGA;
  return x < p.x && Math.abs(z - p.z) < MEIA_PORTA - FOLGA;
}

export const LARGURA_PORTA = MEIA_PORTA * 2;

export class Zona {
  private grade = new Map<number, Predio[]>();
  private barreiras: Area[];
  readonly entraveis: Predio[];
  readonly cidade: Cidade;
  readonly relevo: Relevo | null;

  constructor(cidade: Cidade, relevo: Relevo | null = null) {
    this.cidade = cidade;
    this.relevo = relevo;
    for (const p of cidade.predios) {
      const [cx0, cz0] = [this.cel(p.x - p.largura / 2 - FOLGA), this.cel(p.z - p.fundo / 2 - FOLGA)];
      const [cx1, cz1] = [this.cel(p.x + p.largura / 2 + FOLGA), this.cel(p.z + p.fundo / 2 + FOLGA)];
      for (let cz = cz0; cz <= cz1; cz++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          const k = this.chave(cx, cz);
          const lista = this.grade.get(k);
          if (lista) lista.push(p);
          else this.grade.set(k, [p]);
        }
      }
    }
    this.barreiras = cidade.areas.filter((a) => a.tipo === "agua" || a.tipo === "rochas");
    this.entraveis = cidade.predios.filter((p) => p.entravel);
  }

  private cel(v: number) {
    return Math.floor(v / CELULA);
  }

  private chave(cx: number, cz: number) {
    return (cx + 4096) * 8192 + cz + 4096;
  }

  private vizinhos(x: number, z: number) {
    return this.grade.get(this.chave(this.cel(x), this.cel(z))) ?? [];
  }

  predioNoPonto(x: number, z: number): Predio | null {
    return this.vizinhos(x, z).find((p) => Math.abs(x - p.x) <= p.largura / 2 && Math.abs(z - p.z) <= p.fundo / 2) ?? null;
  }

  /** Bloqueia o passo fora do raio, na água, em prédio fechado ou trancado e nas paredes. */
  pontoLivre(x: number, z: number, bloqueios: Bloqueios = SEM_BLOQUEIOS): boolean {
    if (Math.hypot(x, z) > this.cidade.raio - 1) return false;
    for (const p of this.vizinhos(x, z)) {
      const dx = Math.abs(x - p.x);
      const dz = Math.abs(z - p.z);
      if (dx > p.largura / 2 + FOLGA || dz > p.fundo / 2 + FOLGA) continue;
      if (!p.entravel || bloqueios.entrada.includes(p.id)) return false;
      const naParede = dx > p.largura / 2 - ESPESSURA_PAREDE - FOLGA || dz > p.fundo / 2 - ESPESSURA_PAREDE - FOLGA;
      if (naParede && !naPorta(p, x, z)) return false;
    }
    if (this.relevo && this.relevo.inclinacao(x, z) > INCLINACAO_MAXIMA && !this.predioNoPonto(x, z) && !this.naRua(x, z, 1)) return false;
    return !this.barreiras.some((a) => dentroDoPoligono(x, z, a.pts));
  }

  /** Altura do chão; dentro de prédio vale o piso. */
  altura(x: number, z: number) {
    if (!this.relevo) return 0;
    const p = this.predioNoPonto(x, z);
    return p ? this.relevo.baseDe(p.id) : this.relevo.altura(x, z);
  }

  naRua(x: number, z: number, folga = 0) {
    const perto = (r: Rua) => {
      for (let i = 1; i < r.pts.length; i++) {
        if (distanciaAoSegmento(x, z, r.pts[i - 1], r.pts[i]) <= r.largura / 2 + folga) return true;
      }
      return false;
    };
    return this.cidade.ruas.some(perto);
  }

  private visada(a: Ponto, b: Ponto, bloqueios: Bloqueios) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (!this.pontoLivre(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, bloqueios)) return false;
    }
    return true;
  }

  /** A* na grade e depois corta os cantos desnecessários. null = sem caminho. */
  calcularRota(de: Ponto, para: Ponto, bloqueios: Bloqueios = SEM_BLOQUEIOS): Ponto[] | null {
    if (!this.pontoLivre(para.x, para.z, bloqueios)) return null;
    if (this.visada(de, para, bloqueios)) return [de, para];

    const grade = this.buscar(de, para, bloqueios);
    if (!grade) return null;
    const rota: Ponto[] = [de];
    let i = 0;
    while (i < grade.length - 1) {
      let j = Math.min(grade.length - 1, i + 160);
      while (j > i + 1 && !this.visada(grade[i], grade[j], bloqueios)) j = Math.max(i + 1, j - 6);
      rota.push(grade[j]);
      i = j;
    }
    return rota;
  }

  private buscar(de: Ponto, para: Ponto, bloqueios: Bloqueios): Ponto[] | null {
    const passo = PASSO_GRADE;
    const paraGrade = (v: number) => Math.round(v / passo);
    const ponto = (c: number) => c * passo;
    const LADO = 16384;
    const k = (cx: number, cz: number) => (cx + LADO / 2) * LADO + cz + LADO / 2;
    const [fx, fz] = [paraGrade(para.x), paraGrade(para.z)];
    // Peso acima de 1: rota um pouco menos ótima, mas campo aberto não explode em nós.
    const h = (cx: number, cz: number) => Math.hypot(cx - fx, cz - fz) * PESO_HEURISTICA;

    const custo = new Map<number, number>();
    const veioDe = new Map<number, number>();
    const fila = new Heap();
    const [ix, iz] = [paraGrade(de.x), paraGrade(de.z)];
    custo.set(k(ix, iz), 0);
    fila.por(h(ix, iz), ix, iz);
    let nos = 0;
    let achou = false;

    while (fila.tamanho && nos < MAX_NOS) {
      const { cx, cz } = fila.tirar();
      nos++;
      if (Math.abs(cx - fx) <= 1 && Math.abs(cz - fz) <= 1) {
        veioDe.set(k(fx, fz), k(cx, cz));
        achou = true;
        break;
      }
      const g = custo.get(k(cx, cz))!;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const [nx, nz] = [cx + dx, cz + dz];
          const novo = g + (dx && dz ? Math.SQRT2 : 1);
          const chave = k(nx, nz);
          if (novo >= (custo.get(chave) ?? Infinity)) continue;
          if (!this.pontoLivre(ponto(nx), ponto(nz), bloqueios)) continue;
          if (dx && dz && (!this.pontoLivre(ponto(nx), ponto(cz), bloqueios) || !this.pontoLivre(ponto(cx), ponto(nz), bloqueios))) continue;
          custo.set(chave, novo);
          veioDe.set(chave, k(cx, cz));
          fila.por(novo + h(nx, nz), nx, nz);
        }
      }
    }
    if (!achou) return null;

    const lista: Ponto[] = [para];
    const inicio = k(ix, iz);
    let c = veioDe.get(k(fx, fz));
    while (c !== undefined && c !== inicio) {
      const cx = Math.floor(c / LADO) - LADO / 2;
      const cz = c % LADO - LADO / 2;
      lista.push({ x: ponto(cx), z: ponto(cz) });
      c = veioDe.get(c);
    }
    lista.push(de);
    return lista.reverse();
  }
}

class Heap {
  private itens: { f: number; cx: number; cz: number }[] = [];

  get tamanho() {
    return this.itens.length;
  }

  por(f: number, cx: number, cz: number) {
    const v = this.itens;
    v.push({ f, cx, cz });
    let i = v.length - 1;
    while (i > 0) {
      const pai = (i - 1) >> 1;
      if (v[pai].f <= v[i].f) break;
      [v[pai], v[i]] = [v[i], v[pai]];
      i = pai;
    }
  }

  tirar() {
    const v = this.itens;
    const topo = v[0];
    const fim = v.pop()!;
    if (v.length) {
      v[0] = fim;
      let i = 0;
      for (;;) {
        const [a, b] = [2 * i + 1, 2 * i + 2];
        let m = i;
        if (a < v.length && v[a].f < v[m].f) m = a;
        if (b < v.length && v[b].f < v[m].f) m = b;
        if (m === i) break;
        [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return topo;
  }
}
