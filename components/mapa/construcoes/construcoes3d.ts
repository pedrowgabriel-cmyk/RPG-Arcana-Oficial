// Prédios de um lugar desenhados pelo estilo da cidade. Os comuns são agrupados por
// quadra e juntados por material (poucas chamadas de desenho); cada quadra troca de
// nível conforme a câmera: detalhado perto, volume no meio, caixa leve longe.
// Os entráveis são montados um a um, com telhado separado para abrir.

import * as THREE from "three";
import type { Predio } from "@/lib/mapa/tipos";
import type { Zona } from "@/lib/mapa/zona";
import { juntar } from "../natureza/ferramentas";
import { materialDe } from "../natureza/materiais";
import type { NomeMaterial, Peca } from "../natureza/tipos";
import { bloco } from "./kit";
import { carregarEstilo } from "./estilos";
import type { Estilo, NivelPredio, PredioLocal } from "./tipos";

const QUADRA = 160;
const ALCANCE_DETALHE = 520;
const ALCANCE_VOLUME = 1700;
/** Quadras geradas por quadro: gerar é caro, espalha para não engasgar. */
const GERAR_POR_QUADRO = 2;

export type Teto = { predio: Predio; telhado: THREE.Object3D; interior: THREE.Object3D };

type Face = "n" | "s" | "l" | "o";
const GIRO: Record<Face, number> = { s: 0, n: Math.PI, l: Math.PI / 2, o: -Math.PI / 2 };

function semente(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Quadra = { predios: Predio[]; centro: THREE.Vector3; nivel: NivelPredio | 2 | null; grupo: THREE.Group | null; caixas: THREE.Group };

export class Construcoes {
  grupo = new THREE.Group();
  tetos: Teto[] = [];
  private estilo: Estilo | null = null;
  private quadras: Quadra[] = [];
  private faces = new Map<string, Face>();
  private ultimo = new THREE.Vector3(Infinity, 0, Infinity);

  constructor(
    private zona: Zona,
    /** Caixas leves (o que já existia) de uma lista de prédios. */
    private caixas: (predios: Predio[]) => THREE.Group,
  ) {}

  async carregar() {
    this.estilo = await carregarEstilo(this.zona.cidade.id);
    const porQuadra = new Map<string, Predio[]>();
    for (const p of this.zona.cidade.predios) {
      if (p.entravel) {
        this.montarEntravel(p);
        continue;
      }
      const k = `${Math.floor(p.x / QUADRA)},${Math.floor(p.z / QUADRA)}`;
      porQuadra.set(k, [...(porQuadra.get(k) ?? []), p]);
    }
    for (const predios of porQuadra.values()) {
      const caixas = this.caixas(predios);
      this.grupo.add(caixas);
      const cx = predios.reduce((s, p) => s + p.x, 0) / predios.length;
      const cz = predios.reduce((s, p) => s + p.z, 0) / predios.length;
      this.quadras.push({ predios, centro: new THREE.Vector3(cx, this.base(predios[0]), cz), nivel: null, grupo: null, caixas });
    }
  }

  private base(p: Predio) {
    return this.zona.relevo?.baseDe(p.id) ?? 0;
  }

  /** Comum sem porta definida: fachada para a rua mais perto. */
  private faceDe(p: Predio): Face {
    if (p.porta) return p.porta;
    const pronta = this.faces.get(p.id);
    if (pronta) return pronta;
    const tenta: [Face, number, number][] = [
      ["s", 0, p.fundo / 2 + 5],
      ["n", 0, -p.fundo / 2 - 5],
      ["l", p.largura / 2 + 5, 0],
      ["o", -p.largura / 2 - 5, 0],
    ];
    const achada = tenta.find(([, dx, dz]) => this.zona.naRua(p.x + dx, p.z + dz, 3))?.[0] ?? "s";
    this.faces.set(p.id, achada);
    return achada;
  }

  private local(p: Predio): PredioLocal {
    const f = this.faceDe(p);
    const deLado = f === "l" || f === "o";
    return { ...p, largura: deLado ? p.fundo : p.largura, fundo: deLado ? p.largura : p.fundo, lugar: this.zona.cidade.id };
  }

  private matriz(p: Predio) {
    return new THREE.Matrix4().makeRotationY(GIRO[this.faceDe(p)]).setPosition(p.x, this.base(p), p.z);
  }

  /** Fundação de pedra: o desnível do terreno vira embasamento, não prédio flutuando. */
  private fundacao(p: Predio): Peca | null {
    const f = this.zona.relevo?.fundacoes.get(p.id) ?? 0;
    if (f < 0.15) return null;
    return { material: "cantaria", geometria: bloco(p.largura + 0.3, f, p.fundo + 0.3, 0, -f, 0) };
  }

  private malhas(lista: Peca[], m: THREE.Matrix4, sombra: boolean) {
    const g = new THREE.Group();
    for (const p of lista) {
      const malha = new THREE.Mesh(p.geometria.clone().applyMatrix4(m), materialDe(p.material));
      malha.castShadow = sombra;
      malha.receiveShadow = true;
      g.add(malha);
    }
    return g;
  }

  private montarEntravel(p: Predio) {
    const pecas = this.estilo!.gerar(this.local(p), 0, semente(p.id));
    const m = this.matriz(p);
    const fundacao = this.fundacao(p);
    const corpo = this.malhas(pecas.corpo, m, true);
    if (fundacao) corpo.add(this.malhas([fundacao], new THREE.Matrix4().setPosition(p.x, this.base(p), p.z), false));
    const telhado = this.malhas(pecas.telhado, m, true);
    const interior = this.malhas(pecas.interior, m, false);
    interior.visible = false;
    this.grupo.add(corpo, telhado, interior);
    this.tetos.push({ predio: p, telhado, interior });
  }

  /** Junta por material todos os prédios da quadra num nível. */
  private montarQuadra(q: Quadra, nivel: NivelPredio) {
    const porMaterial = new Map<NomeMaterial, THREE.BufferGeometry[]>();
    const por = (lista: Peca[], m: THREE.Matrix4) => {
      for (const peca of lista) porMaterial.set(peca.material, [...(porMaterial.get(peca.material) ?? []), peca.geometria.clone().applyMatrix4(m)]);
    };
    for (const p of q.predios) {
      const pecas = this.estilo!.gerar(this.local(p), nivel, semente(p.id));
      const m = this.matriz(p);
      por([...pecas.corpo, ...pecas.telhado], m);
      const f = this.fundacao(p);
      if (f) por([f], new THREE.Matrix4().setPosition(p.x, this.base(p), p.z));
    }
    const g = new THREE.Group();
    for (const [material, gs] of porMaterial) {
      const malha = new THREE.Mesh(juntar(gs), materialDe(material));
      malha.castShadow = nivel === 0;
      malha.receiveShadow = true;
      g.add(malha);
      for (const x of gs) x.dispose();
    }
    return g;
  }

  /** Troca o nível das quadras pela distância da câmera. Devolve true se mudou algo. */
  atualizar(camera: THREE.Vector3) {
    if (!this.estilo || !this.quadras.length) return false;
    if (camera.distanceTo(this.ultimo) < 20 && !this.quadras.some((q) => q.nivel === null)) return false;
    this.ultimo.copy(camera);
    let gerados = 0;
    let mudou = false;
    const ordem = [...this.quadras].sort((a, b) => a.centro.distanceTo(camera) - b.centro.distanceTo(camera));
    for (const q of ordem) {
      const d = q.centro.distanceTo(camera);
      const quer: NivelPredio | 2 = d < ALCANCE_DETALHE ? 0 : d < ALCANCE_VOLUME ? 1 : 2;
      if (q.nivel === quer) continue;
      if (quer < 2 && gerados >= GERAR_POR_QUADRO) {
        // Fica para o próximo quadro; força nova volta mesmo sem a câmera andar.
        this.ultimo.set(Infinity, 0, Infinity);
        continue;
      }
      if (q.grupo) {
        this.grupo.remove(q.grupo);
        q.grupo.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
        q.grupo = null;
      }
      if (quer < 2) {
        q.grupo = this.montarQuadra(q, quer as NivelPredio);
        this.grupo.add(q.grupo);
        gerados++;
      }
      q.caixas.visible = quer === 2;
      q.nivel = quer;
      mudou = true;
    }
    return mudou;
  }
}
