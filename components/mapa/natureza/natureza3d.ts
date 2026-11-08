// Natureza de um lugar: espalha os modelos de biomas.ts sobre o relevo e desenha
// em instâncias, trocando de nível de detalhe por célula conforme a câmera chega.
// Cobertura de chão (tapete) nasce só em volta da câmera, sempre nos mesmos pontos.

import * as THREE from "three";
import { dentroDoPoligono, type Zona } from "@/lib/mapa/zona";
import type { Area, XZ } from "@/lib/mapa/tipos";
import { NATUREZA, type Grupo, type Onde } from "./biomas";
import { carregarModelo } from "./catalogo";
import { sorteio } from "./ferramentas";
import { materialDe } from "./materiais";
import type { Estado, Modelo, Nivel, Peca } from "./tipos";

/** Distância da câmera até onde cada nível vale. Depois disso, some (o continente assume). */
const ALCANCE: Record<Nivel, number> = { 0: 230, 1: 950, 2: 4600 };
const CELULA = 96;
const MAX_POR_GRUPO = 7000;
const RAIO_DO_TAPETE = 240;
const CELULA_DO_TAPETE = 24;
const MAX_TAPETE_POR_GRUPO = 5000;
const NIVEIS: Nivel[] = [0, 1, 2];
const INGREME = 0.45;
const MARGEM = 25;

type Exemplar = { x: number; y: number; z: number; giro: number; escala: number; variacao: number; celula: number };

/** Geometria pronta por modelo, variação, nível e estado: gerar é caro, guarda. */
const cacheDePecas = new Map<string, Peca[]>();

function pecasDe(m: Modelo, variacao: number, nivel: Nivel, estado: Estado) {
  const chave = `${m.id}|${variacao}|${nivel}|${estado.neve ?? 0}|${estado.seca ? 1 : 0}|${estado.queimada ? 1 : 0}`;
  let p = cacheDePecas.get(chave);
  if (!p) {
    p = m.gerar(variacao, nivel, estado);
    cacheDePecas.set(chave, p);
  }
  return p;
}

function ruido2(x: number, z: number, seed: number) {
  const h = (i: number, j: number) => {
    let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + seed * 1013;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const [i, j] = [Math.floor(x), Math.floor(z)];
  const [u, v] = [x - i, z - j].map((t) => t * t * (3 - 2 * t));
  return h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v;
}

function distanciaAPoligono(x: number, z: number, pts: readonly XZ[]) {
  let d = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, az, bx, bz] = [pts[j][0], pts[j][1], pts[i][0], pts[i][1]];
    const [dx, dz] = [bx - ax, bz - az];
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return d;
}

/** Decide se um ponto serve para o grupo: chão certo, longe de rua, prédio e água. */
function criarFiltro(zona: Zona) {
  const { cidade } = zona;
  const aguas = cidade.areas.filter((a) => a.tipo === "agua");
  const areaEm = (x: number, z: number): Area | null => {
    for (const a of cidade.areas) if (a.tipo !== "agua" && dentroDoPoligono(x, z, a.pts)) return a;
    return null;
  };
  return (x: number, z: number, onde: Onde[]) => {
    if (Math.hypot(x, z) > cidade.raio * 0.97) return false;
    if (aguas.some((a) => dentroDoPoligono(x, z, a.pts))) return false;
    if (zona.predioNoPonto(x, z) || zona.naRua(x, z, 1.5)) return false;
    const area = areaEm(x, z);
    if (area && onde.includes(area.tipo)) return area.tipo !== "rochas" || onde.includes("rochas");
    if (area && area.tipo !== "pasto" && area.tipo !== "mata") return false;
    if (onde.includes("ingreme") && zona.relevo && zona.relevo.inclinacao(x, z) > INGREME) return true;
    if (onde.includes("margem") && aguas.some((a) => distanciaAPoligono(x, z, a.pts) < MARGEM)) return true;
    return !area && onde.includes("campo") && (!zona.relevo || zona.relevo.inclinacao(x, z) < INGREME * 1.6);
  };
}

/** Pontos de um grupo dentro de um retângulo, sempre os mesmos para a mesma semente. */
function espalhar(zona: Zona, g: Grupo, seed: number, x0: number, z0: number, lado: number, limite: number, serve: ReturnType<typeof criarFiltro>, modelo: Modelo) {
  const r = sorteio(seed);
  const esperado = (g.densidade * lado * lado) / 10_000;
  const quantos = Math.min(limite, Math.floor(esperado) + (r() < esperado % 1 ? 1 : 0));
  const lista: Exemplar[] = [];
  for (let i = 0; i < quantos * 2 && lista.length < quantos; i++) {
    const [x, z] = [x0 + r() * lado, z0 + r() * lado];
    if (g.agrupar && ruido2(x / 70, z / 70, seed % 97) < g.agrupar * 0.75) continue;
    if (!serve(x, z, g.onde)) continue;
    const [e0, e1] = g.escala ?? [0.8, 1.2];
    const variacao = g.variacoes ? g.variacoes[Math.floor(r() * g.variacoes.length)] : Math.floor(r() * modelo.variacoes);
    lista.push({ x, y: zona.altura(x, z), z, giro: r() * Math.PI * 2, escala: e0 + r() * (e1 - e0), variacao, celula: 0 });
  }
  return lista;
}

type Lote = { malhas: Record<Nivel, THREE.InstancedMesh[]>; exemplares: Exemplar[] };

function criarLote(modelo: Modelo, variacao: number, estado: Estado, capacidade: number, grupo: THREE.Group): Lote {
  const malhas = {} as Record<Nivel, THREE.InstancedMesh[]>;
  for (const nivel of NIVEIS) {
    malhas[nivel] = pecasDe(modelo, variacao, nivel, estado).map((p) => {
      const m = new THREE.InstancedMesh(p.geometria, materialDe(p.material), capacidade);
      m.castShadow = nivel === 0;
      m.receiveShadow = nivel < 2;
      m.count = 0;
      m.frustumCulled = false;
      grupo.add(m);
      return m;
    });
  }
  return { malhas, exemplares: [] };
}

const matriz = new THREE.Matrix4();
const giro = new THREE.Quaternion();
const eixo = new THREE.Vector3(0, 1, 0);
const pos = new THREE.Vector3();
const esc = new THREE.Vector3();

function preencher(lote: Lote, nivelDe: (e: Exemplar) => Nivel | null) {
  const contagem: Record<Nivel, number> = { 0: 0, 1: 0, 2: 0 };
  for (const e of lote.exemplares) {
    const nivel = nivelDe(e);
    if (nivel === null) continue;
    matriz.compose(pos.set(e.x, e.y, e.z), giro.setFromAxisAngle(eixo, e.giro), esc.setScalar(e.escala));
    for (const m of lote.malhas[nivel]) m.setMatrixAt(contagem[nivel], matriz);
    contagem[nivel]++;
  }
  for (const nivel of NIVEIS) {
    for (const m of lote.malhas[nivel]) {
      m.count = contagem[nivel];
      m.instanceMatrix.needsUpdate = true;
    }
  }
}

export class Natureza {
  grupo = new THREE.Group();
  private fixos: Lote[] = [];
  private tapetes: { grupo: Grupo; modelo: Modelo; lotes: Lote[]; indice: number }[] = [];
  private ultimo = new THREE.Vector3(Infinity, 0, Infinity);
  private ultimoTapete = new THREE.Vector3(Infinity, 0, Infinity);
  private serve: ReturnType<typeof criarFiltro>;
  pronto = false;

  constructor(private zona: Zona) {
    this.serve = criarFiltro(zona);
  }

  /** Carrega os modelos e espalha. Leva uns instantes: o lugar aparece antes, a natureza logo depois. */
  async carregar() {
    const grupos = NATUREZA[this.zona.cidade.id] ?? [];
    const modelos = new Map<string, Modelo>();
    await Promise.all([...new Set(grupos.map((g) => g.modelo))].map(async (id) => modelos.set(id, await carregarModelo(id))));
    const raio = this.zona.cidade.raio;
    grupos.forEach((g, indice) => {
      const modelo = modelos.get(g.modelo)!;
      const estado = g.estado ?? {};
      const lotes = Array.from({ length: modelo.variacoes }, (_, v) => criarLote(modelo, v, estado, g.tapete ? MAX_TAPETE_POR_GRUPO : MAX_POR_GRUPO, this.grupo));
      if (g.tapete) {
        this.tapetes.push({ grupo: g, modelo, lotes, indice });
        return;
      }
      const todos = espalhar(this.zona, g, 7919 * (indice + 1) + raio, -raio, -raio, raio * 2, MAX_POR_GRUPO, this.serve, modelo);
      for (const e of todos) {
        e.celula = Math.floor((e.x + raio) / CELULA) * 1000 + Math.floor((e.z + raio) / CELULA);
        lotes[e.variacao].exemplares.push(e);
      }
      this.fixos.push(...lotes);
    });
    this.pronto = true;
  }

  /** Troca o nível de cada exemplar pela distância da câmera. Barato: só refaz quando ela anda. */
  atualizar(camera: THREE.Vector3, alvo: THREE.Vector3) {
    if (!this.pronto) return false;
    let mudou = false;
    if (camera.distanceTo(this.ultimo) > 25) {
      this.ultimo.copy(camera);
      const nivelDe = (e: Exemplar): Nivel | null => {
        const d = Math.hypot(e.x - camera.x, e.y - camera.y, e.z - camera.z);
        return d < ALCANCE[0] ? 0 : d < ALCANCE[1] ? 1 : d < ALCANCE[2] ? 2 : null;
      };
      for (const l of this.fixos) preencher(l, nivelDe);
      mudou = true;
    }
    // Tapete: só perto, e só quando a câmera está baixa o bastante para ver capim.
    const perto = camera.y - alvo.y < ALCANCE[1];
    if (perto && alvo.distanceTo(this.ultimoTapete) > CELULA_DO_TAPETE) {
      this.ultimoTapete.copy(alvo);
      for (const t of this.tapetes) this.semearTapete(t, alvo, camera);
      mudou = true;
    } else if (!perto && this.ultimoTapete.x !== Infinity) {
      this.ultimoTapete.set(Infinity, 0, Infinity);
      for (const t of this.tapetes) for (const l of t.lotes) preencher(l, () => null);
      mudou = true;
    }
    return mudou;
  }

  private semearTapete(t: Natureza["tapetes"][number], alvo: THREE.Vector3, camera: THREE.Vector3) {
    for (const l of t.lotes) l.exemplares = [];
    const c = CELULA_DO_TAPETE;
    const [i0, i1] = [Math.floor((alvo.x - RAIO_DO_TAPETE) / c), Math.floor((alvo.x + RAIO_DO_TAPETE) / c)];
    const [j0, j1] = [Math.floor((alvo.z - RAIO_DO_TAPETE) / c), Math.floor((alvo.z + RAIO_DO_TAPETE) / c)];
    let total = 0;
    for (let i = i0; i <= i1 && total < MAX_TAPETE_POR_GRUPO; i++) {
      for (let j = j0; j <= j1 && total < MAX_TAPETE_POR_GRUPO; j++) {
        if (Math.hypot(i * c + c / 2 - alvo.x, j * c + c / 2 - alvo.z) > RAIO_DO_TAPETE) continue;
        // Semente pela célula: voltar ao mesmo lugar mostra o mesmo capim.
        const seed = (i * 73856093) ^ (j * 19349663) ^ (t.indice * 83492791);
        for (const e of espalhar(this.zona, t.grupo, seed, i * c, j * c, c, MAX_TAPETE_POR_GRUPO - total, this.serve, t.modelo)) {
          t.lotes[e.variacao].exemplares.push(e);
          total++;
        }
      }
    }
    const nivelDe = (e: Exemplar): Nivel | null => (Math.hypot(e.x - camera.x, e.z - camera.z) < ALCANCE[0] * 0.6 ? 0 : 1);
    for (const l of t.lotes) preencher(l, nivelDe);
  }
}
