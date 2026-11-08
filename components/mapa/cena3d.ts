// Cena Three.js do mapa: vista de drone, zoom do mundo inteiro até a rua.
// Sem React de propósito: tudo aqui roda a 60 fps e nada disso deve re-renderizar.
//
// Otimização para celular: só desenha quando algo mudou (a bateria agradece),
// árvores e casas em InstancedMesh, sombra só em tela grande, pixel ratio limitado.

import * as THREE from "three";
import { ALTURA_MAPA, LARGURA_MAPA, METROS_POR_UNIDADE_DO_MAPA, mundoDoLugar, mundoDoMapa } from "@/lib/mapa/lugares";
import { altitudeContinente } from "@/lib/mapa/relevo";
import { aoAlcance, type Bloqueios } from "@/lib/mapa/mundo";
import type { Pt } from "@/lib/mapa/geografia";
import type { Ponto } from "@/lib/mapa/tipos";
import { SEM_BLOQUEIOS, type Zona } from "@/lib/mapa/zona";
import { montarContinente } from "./continente3d";
import { INICIO_DA_BORDA, montarLugar, type Teto } from "./cidade3d";
import type { Clima } from "@/lib/mapa/clima";
import { Nuvens, type CeuLocal } from "./nuvens3d";
import { uTempo } from "./natureza/materiais";
import { etiqueta } from "./etiqueta";

const ZOOM_MIN = 22;
const ZOOM_MAX = 110_000;
const DISTANCIA_ABRE_TELHADO = 90;
const DISTANCIA_NOMES_PREDIOS = 500;
const DISTANCIA_NOMES_MAPA = 3200;
/** Nível de detalhe: perto vale o lugar; ao abrir, os prédios viram os leves e o chão some aos poucos. */
const DISTANCIA_DETALHE = 4200;
const DISTANCIA_SEM_CHAO = 6800;
const DISTANCIA_VIAS = 1400;
/** Quanto maior, mais rápido a câmera alcança o pedido. */
const SUAVIDADE = 7;
const GIRO_POR_PIXEL = 0.006;
const FIGURA_PADRAO = 70;
const ELEVACAO_RUA = 0.5;
const ELEVACAO_ALTO = 1.15;
/** Norte para cima, como o mapa impresso. */
const AZIMUTE = 0;
const COR_CEU = new THREE.Color("#a9c1d0");
const COR_ALTURA = new THREE.Color("#c7d5dc");
/** De longe a serra achata: o relevo cresce um pouco conforme o zoom abre. */
const EXAGERO_MAXIMO = 1.7;
const INICIO_EXAGERO = 12_000;
const FIM_EXAGERO = 60_000;
const FOLGA_DA_CAMERA = 14;
const QUADROS_DE_CEU_MS = 45;
/** Teto do passo por quadro: alto o bastante para celular lento não andar devagar. */
const PASSO_MAXIMO_S = 0.12;
const COR_TEMPORAL = new THREE.Color("#6f7a84");
const LUZ_DO_SOL = 3.2;
const LUZ_DO_CEU = 1.15;
const TOQUE_MAX_PX = 8;

export type PersonagemCena = { id: string; nome: string; x: number; z: number; zona: string };

type Boneco = {
  id: string;
  zona: string;
  grupo: THREE.Group;
  corpo: THREE.Group;
  rota: Ponto[];
  velocidade: number;
  aoChegar?: () => void;
  fase: number;
};

function corDoId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return new THREE.Color().setHSL((h % 360) / 360, 0.75, 0.55);
}

export class Cena3D {
  private renderer: THREE.WebGLRenderer;
  private cena = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 1, 4000);
  private alvo = new THREE.Vector3(0, 0, 0);
  private distancia = 120;
  private bonecos = new Map<string, Boneco>();
  private origem: Ponto = { x: 0, z: 0 };
  private continente = montarContinente();
  private lugar: ReturnType<typeof montarLugar> | null = null;
  private sol = new THREE.DirectionalLight("#ffe2b8", 3.2);
  private nuvens = new Nuvens();
  private neblina = new THREE.Fog(COR_CEU, 1e7, 2e7);
  private azimute = AZIMUTE;
  private azimuteAlvo = AZIMUTE;
  private distanciaAlvo = 120;
  private torcao: number | null = null;
  private exagero = 1;
  private ultimoCeu = 0;
  private ceu: CeuLocal = { nuvens: 0, chuva: 0, vento: 0, tempestade: 0, relampago: 0 };
  private luzDoCeu = new THREE.HemisphereLight("#eef4ff", "#5a4a34", LUZ_DO_CEU);
  private raio = new THREE.Raycaster();
  private sujo = true;
  private quadro = 0;
  private antes = 0;
  private bloqueios: Bloqueios = SEM_BLOQUEIOS;
  private ponteiros = new Map<number, { x: number; y: number }>();
  private inicioToque: { x: number; y: number } | null = null;
  private pinca = 0;
  private medir: ResizeObserver;

  /** Vetor do joystick/teclado em [-1, 1]; (0,0) parado. Preenchido pela interface. */
  entrada = { x: 0, z: 0 };
  velocidadeDireta = 8;
  zona: Zona | null = null;
  podeAndar = true;
  aoAndar?: (id: string, x: number, z: number, unidades: number) => void;
  aoTocar?: (ponto: Ponto) => void;
  /** Câmera parou em cima do ponto do mapa impresso (mx, my). */
  aoOlhar?: (mx: number, my: number) => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private meuId: string | null,
    private juiz: boolean,
  ) {
    const grande = window.matchMedia("(min-width: 1024px)").matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: grande, powerPreference: "high-performance", logarithmicDepthBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, grande ? 2 : 1.5));
    this.renderer.shadowMap.enabled = grande;
    this.cena.background = COR_CEU.clone();
    this.cena.fog = this.neblina;
    this.cena.add(this.nuvens.grupo);

    this.cena.add(this.luzDoCeu);
    this.sol.castShadow = grande;
    this.sol.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sol.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, far: 320 });
    this.cena.add(this.sol, this.sol.target, this.continente.grupo);
    this.posicionarCamera();

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", this.aoApertar);
    canvas.addEventListener("pointermove", this.aoMover);
    canvas.addEventListener("pointerup", this.aoSoltar);
    canvas.addEventListener("pointercancel", this.aoSoltar);
    canvas.addEventListener("wheel", this.aoRolar, { passive: false });
    canvas.addEventListener("contextmenu", this.semMenu);
    this.medir = new ResizeObserver(() => this.ajustarTamanho());
    this.medir.observe(canvas.parentElement ?? canvas);
    this.ajustarTamanho();
    this.quadro = requestAnimationFrame(this.ciclo);
  }

  /** Troca o lugar detalhado; a origem da cena segue junto para não perder precisão. */
  abrirLugar(zona: Zona) {
    if (this.lugar) {
      this.cena.remove(this.lugar.grupo);
      this.descartar(this.lugar.grupo);
    }
    const velha = this.origem;
    this.origem = mundoDoLugar(zona.cidade.id);
    const dx = velha.x - this.origem.x;
    const dz = velha.z - this.origem.z;
    this.alvo.x += dx;
    this.alvo.z += dz;
    this.continente.grupo.position.set(-this.origem.x, 0, -this.origem.z);
    this.continente.uOrigem.value.set(this.origem.x, this.origem.z);
    this.zona = zona;
    this.lugar = montarLugar(zona);
    this.cena.add(this.lugar.grupo);
    for (const b of this.bonecos.values()) {
      b.grupo.position.x += dx;
      b.grupo.position.z += dz;
      b.rota = [];
      this.pousar(b);
    }
    this.posicionarCamera();
  }

  private pousar(b: Boneco) {
    const { x, z } = b.grupo.position;
    b.grupo.position.y = b.zona === this.zona?.cidade.id ? this.zona.altura(x, z) : this.alturaDoChao(x, z);
  }

  private deslocamento(zona: string): Ponto {
    const p = mundoDoLugar(zona);
    return { x: p.x - this.origem.x, z: p.z - this.origem.z };
  }

  private posicionarCamera() {
    this.alvo.y = this.alturaDoChao(this.alvo.x, this.alvo.z);
    const abertura = THREE.MathUtils.smoothstep(Math.log10(this.distancia), 2.2, 4.6);
    const elevacao = THREE.MathUtils.lerp(ELEVACAO_RUA, ELEVACAO_ALTO, abertura);
    const h = Math.cos(elevacao) * this.distancia;
    const [cx, cz] = [this.alvo.x + Math.sin(this.azimute) * h, this.alvo.z + Math.cos(this.azimute) * h];
    const cy = Math.max(this.alvo.y + Math.sin(elevacao) * this.distancia, this.alturaDoChao(cx, cz) + FOLGA_DA_CAMERA);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.alvo);
    this.camera.near = Math.max(1, this.distancia / 100);
    this.camera.far = this.distancia * 8 + 30000;
    this.aplicarClima();
    this.camera.updateProjectionMatrix();
    this.sol.target.position.copy(this.alvo);
    this.sol.position.set(this.alvo.x - 130, this.alvo.y + 70, this.alvo.z + 70);
    this.sujo = true;
  }

  private ajustarTamanho() {
    const pai = this.canvas.parentElement;
    if (!pai) return;
    this.renderer.setSize(pai.clientWidth, pai.clientHeight, false);
    this.camera.aspect = pai.clientWidth / Math.max(1, pai.clientHeight);
    this.camera.updateProjectionMatrix();
    this.sujo = true;
  }

  private pontoNoChao(px: number, py: number): Ponto | null {
    const caixa = this.canvas.getBoundingClientRect();
    this.raio.setFromCamera(
      new THREE.Vector2(((px - caixa.left) / caixa.width) * 2 - 1, -((py - caixa.top) / caixa.height) * 2 + 1),
      this.camera,
    );
    const zona = this.zona;
    if (!zona?.relevo) return null;
    // Marcha pelo raio em vez de testar meio milhão de triângulos.
    const { origin, direction } = this.raio.ray;
    const passo = Math.max(1, this.distancia / 300);
    for (let t = 0; t < this.distancia * 3; t += passo) {
      const [x, y, z] = [origin.x + direction.x * t, origin.y + direction.y * t, origin.z + direction.z * t];
      if (Math.hypot(x, z) < zona.cidade.raio && y <= zona.relevo.altura(x, z)) return { x, z };
    }
    return null;
  }

  private aoApertar = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId);
    this.ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.inicioToque = this.ponteiros.size === 1 ? { x: e.clientX, y: e.clientY } : null;
    this.pinca = 0;
  };

  private aoMover = (e: PointerEvent) => {
    const antes = this.ponteiros.get(e.pointerId);
    if (!antes) return;
    this.ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.ponteiros.size === 2) {
      const [a, b] = [...this.ponteiros.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinca) this.zoom(this.pinca / d);
      this.pinca = d;
      const torcao = Math.atan2(b.y - a.y, b.x - a.x);
      if (this.torcao !== null) this.girar(THREE.MathUtils.euclideanModulo(torcao - this.torcao + Math.PI, Math.PI * 2) - Math.PI);
      this.torcao = torcao;
      return;
    }
    if (this.inicioToque && Math.hypot(e.clientX - this.inicioToque.x, e.clientY - this.inicioToque.y) < TOQUE_MAX_PX) return;
    this.inicioToque = null;
    if (e.buttons & 2) {
      this.girar((e.clientX - antes.x) * GIRO_POR_PIXEL);
      return;
    }
    const fator = (this.distancia / this.canvas.clientHeight) * 0.75;
    const dx = (e.clientX - antes.x) * fator;
    const dy = (e.clientY - antes.y) * fator * 1.3;
    const [sen, cos] = [Math.sin(this.azimute), Math.cos(this.azimute)];
    this.alvo.x -= dx * cos + dy * sen;
    this.alvo.z -= dy * cos - dx * sen;
    this.limitarAlvo();
    this.posicionarCamera();
    this.avisarOlhar();
  };

  private aoSoltar = (e: PointerEvent) => {
    this.ponteiros.delete(e.pointerId);
    if (this.inicioToque && e.type === "pointerup") {
      const ponto = this.pontoNoChao(e.clientX, e.clientY);
      if (ponto) this.aoTocar?.(ponto);
    }
    this.inicioToque = null;
    this.pinca = 0;
    this.torcao = null;
  };

  private semMenu = (e: Event) => e.preventDefault();

  private aoRolar = (e: WheelEvent) => {
    e.preventDefault();
    this.zoom(Math.exp(e.deltaY * 0.0012));
  };

  zoom(fator: number) {
    this.distanciaAlvo = THREE.MathUtils.clamp(this.distanciaAlvo * fator, ZOOM_MIN, ZOOM_MAX);
  }

  girar(radianos: number) {
    this.azimuteAlvo += radianos;
  }

  /** Zoom e giro alcançam o pedido aos poucos; o zoom em escala log, para parecer igual perto e longe. */
  private suavizar(dt: number) {
    const k = 1 - Math.exp(-dt * SUAVIDADE);
    const dz = Math.log(this.distanciaAlvo / this.distancia);
    const da = this.azimuteAlvo - this.azimute;
    if (Math.abs(dz) < 0.0005 && Math.abs(da) < 0.0005) return;
    this.distancia *= Math.exp(dz * k);
    this.azimute += da * k;
    this.limitarAlvo();
    this.posicionarCamera();
  }

  /** Chão sob a câmera: malha do lugar aberto, ou continente exagerado de longe. */
  private alturaDoChao(x: number, z: number) {
    const zona = this.zona;
    if (zona?.relevo && Math.hypot(x, z) < zona.cidade.raio) return zona.altura(x, z);
    const m = METROS_POR_UNIDADE_DO_MAPA;
    return altitudeContinente((x + this.origem.x) / m + LARGURA_MAPA / 2, (z + this.origem.z) / m + ALTURA_MAPA / 2) * this.exagero;
  }

  /** Quanto mais longe, mais ar: neblina, relevo exagerado e nuvens. */
  private aplicarClima() {
    const d = this.distancia;
    const fora = THREE.MathUtils.smoothstep(d, 3500, 40_000);
    this.neblina.near = THREE.MathUtils.lerp(d * 30, d * 1.5, fora);
    this.neblina.far = THREE.MathUtils.lerp(d * 60, d * 7, fora) * (1 - 0.55 * THREE.MathUtils.smoothstep(d, 45_000, 110_000));
    (this.cena.background as THREE.Color).copy(COR_CEU).lerp(COR_ALTURA, fora);
    this.exagero = 1 + (EXAGERO_MAXIMO - 1) * THREE.MathUtils.smoothstep(d, INICIO_EXAGERO, FIM_EXAGERO);
    this.continente.malha.scale.y = this.exagero;
    this.aplicarTempo();
  }

  /** Tempo fechado escurece a luz, acinzenta o céu e fecha a neblina; relâmpago clareia tudo. */
  private aplicarTempo() {
    const { nuvens, chuva, tempestade, relampago } = this.ceu;
    const sombra = Math.min(1, nuvens * 0.45 + chuva * 0.25 + tempestade * 0.3);
    this.sol.intensity = LUZ_DO_SOL * (1 - sombra * 0.8) + relampago * 4;
    this.luzDoCeu.intensity = LUZ_DO_CEU * (1 - sombra * 0.35) + relampago * 2.5;
    const fundo = this.cena.background as THREE.Color;
    fundo.lerp(COR_TEMPORAL, sombra * 0.7);
    this.neblina.color.copy(fundo);
    const fecha = 1 - chuva * 0.55;
    this.neblina.near *= fecha;
    this.neblina.far *= fecha;
  }

  definirClima(clima: Clima) {
    this.nuvens.definir(clima);
    this.ultimoCeu = 0;
  }

  /** Jogador olha o próprio lugar; de longe, e para o Juiz, vale o continente. */
  private limitarAlvo() {
    const raio = this.zona?.cidade.raio ?? 0;
    if (!this.juiz && this.distancia < DISTANCIA_DETALHE) {
      const d = Math.hypot(this.alvo.x, this.alvo.z);
      if (d > raio) this.alvo.multiplyScalar(raio / d);
    }
    const [mx, mz] = [(LARGURA_MAPA * METROS_POR_UNIDADE_DO_MAPA) / 2, (ALTURA_MAPA * METROS_POR_UNIDADE_DO_MAPA) / 2];
    this.alvo.x = THREE.MathUtils.clamp(this.alvo.x, -mx - this.origem.x, mx - this.origem.x);
    this.alvo.z = THREE.MathUtils.clamp(this.alvo.z, -mz - this.origem.z, mz - this.origem.z);
  }

  private avisarOlhar() {
    if (!this.aoOlhar) return;
    const m = METROS_POR_UNIDADE_DO_MAPA;
    this.aoOlhar((this.alvo.x + this.origem.x) / m + LARGURA_MAPA / 2, (this.alvo.z + this.origem.z) / m + ALTURA_MAPA / 2);
  }


  centrar(x: number, z: number, distancia?: number) {
    this.alvo.set(x, 0, z);
    if (distancia) this.distancia = this.distanciaAlvo = distancia;
    this.posicionarCamera();
    this.sujo = true;
  }

  /** Centra num lugar do continente, aberto ou não. */
  olharMundo(p: Ponto, distancia: number) {
    this.centrar(p.x - this.origem.x, p.z - this.origem.z, distancia);
    this.avisarOlhar();
  }

  definirBloqueios(b: Bloqueios) {
    this.bloqueios = b;
    this.sujo = true;
  }

  sincronizar(lista: PersonagemCena[]) {
    for (const p of lista) {
      const existente = this.bonecos.get(p.id);
      if (existente) {
        existente.zona = p.zona;
        continue;
      }
      const cor = corDoId(p.id);
      const grupo = new THREE.Group();
      const corpo = new THREE.Group();
      const roupa = new THREE.MeshLambertMaterial({ color: cor });
      const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.1, 2, 8), roupa);
      tronco.position.y = 1.1;
      tronco.castShadow = true;
      const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshLambertMaterial({ color: "#d9b08c" }));
      cabeca.position.y = 2.35;
      const chapeu = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 10), new THREE.MeshLambertMaterial({ color: "#2e2118" }));
      chapeu.position.y = 2.68;
      corpo.add(tronco, cabeca, chapeu);
      const aro = new THREE.Mesh(
        new THREE.RingGeometry(1, 1.3, 20),
        new THREE.MeshBasicMaterial({ color: cor, side: THREE.DoubleSide }),
      );
      aro.rotation.x = -Math.PI / 2;
      aro.position.y = 0.15;
      const nome = etiqueta(p.nome);
      nome.position.y = 4;
      grupo.add(corpo, aro, nome);
      const d = this.deslocamento(p.zona);
      grupo.position.set(p.x + d.x, 0, p.z + d.z);
      this.cena.add(grupo);
      const novo: Boneco = { id: p.id, zona: p.zona, grupo, corpo, rota: [], velocidade: 0, fase: 0 };
      this.pousar(novo);
      this.bonecos.set(p.id, novo);
    }
    this.sujo = true;
  }

  posicao(id: string): Ponto | null {
    const b = this.bonecos.get(id);
    if (!b) return null;
    const d = this.deslocamento(b.zona);
    return { x: b.grupo.position.x - d.x, z: b.grupo.position.z - d.z };
  }

  /** Personagem chegou de viagem: entra na posição nova, sem rota. */
  colocar(id: string, zona: string, x: number, z: number) {
    const b = this.bonecos.get(id);
    if (!b) return;
    b.zona = zona;
    b.rota = [];
    const d = this.deslocamento(zona);
    b.grupo.position.set(x + d.x, 0, z + d.z);
    this.pousar(b);
    this.sujo = true;
  }

  /** Marcha do bando pelas estradas, vista do alto. */
  marchar(ids: string[], pts: Pt[], segundos: number, aoChegar: () => void) {
    const rota = pts.map(([mx, my]) => {
      const p = mundoDoMapa(mx, my);
      return { x: p.x - this.origem.x, z: p.z - this.origem.z };
    });
    let total = 0;
    for (let i = 1; i < rota.length; i++) total += Math.hypot(rota[i].x - rota[i - 1].x, rota[i].z - rota[i - 1].z);
    const xs = rota.map((p) => p.x);
    const zs = rota.map((p) => p.z);
    const meio = { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
    this.alvo.set(meio.x, 0, meio.z);
    this.distancia = this.distanciaAlvo = Math.max(5000, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) * 2.2);
    this.posicionarCamera();
    let primeiro = true;
    for (const id of ids) {
      const b = this.bonecos.get(id);
      if (!b) continue;
      b.grupo.position.set(rota[0].x, 0, rota[0].z);
      b.zona = "";
      b.rota = rota.slice(1);
      b.velocidade = total / segundos;
      b.aoChegar = primeiro ? aoChegar : undefined;
      primeiro = false;
    }
    if (primeiro) aoChegar();
  }

  percorrer(id: string, rota: Ponto[], velocidade: number, aoChegar?: () => void) {
    const b = this.bonecos.get(id);
    if (!b) return;
    const d = this.deslocamento(b.zona);
    b.rota = rota.slice(1).map((p) => ({ x: p.x + d.x, z: p.z + d.z }));
    b.velocidade = velocidade;
    b.aoChegar = aoChegar;
  }

  /** Posição recebida da rede: corrige o boneco sem interromper uma rota própria. */
  teleportar(id: string, x: number, z: number) {
    const b = this.bonecos.get(id);
    if (!b) return;
    const d = this.deslocamento(b.zona);
    b.rota = [{ x: x + d.x, z: z + d.z }];
    b.velocidade = 16;
  }

  private gamepad() {
    for (const g of navigator.getGamepads?.() ?? []) {
      if (!g) continue;
      const [x = 0, z = 0] = g.axes;
      if (Math.hypot(x, z) > 0.2) return { x, z };
    }
    return null;
  }

  private ciclo = (agora: number) => {
    this.quadro = requestAnimationFrame(this.ciclo);
    const dt = Math.min(PASSO_MAXIMO_S, (agora - this.antes) / 1000);
    this.antes = agora;
    uTempo.value = agora / 1000;
    this.suavizar(dt);
    if (this.andarDireto(dt)) this.sujo = true;
    if (this.lugar?.detalhes.visible && this.lugar.natureza.atualizar(this.camera.position, this.alvo)) this.sujo = true;
    if (this.lugar?.detalhes.visible && this.lugar.construcoes.atualizar(this.camera.position)) this.sujo = true;
    for (const b of this.bonecos.values()) if (this.passo(b, dt)) this.sujo = true;
    if (agora - this.ultimoCeu > QUADROS_DE_CEU_MS) {
      const passou = Math.min(0.2, (agora - (this.ultimoCeu || agora - QUADROS_DE_CEU_MS)) / 1000);
      this.ultimoCeu = agora;
      this.ceu = this.nuvens.atualizar(passou, this.distancia, this.alvo, this.origem);
      // Água e céu se mexem sozinhos: redesenha no ritmo do céu.
      if (this.lugar?.temAgua && this.lugar.detalhes.visible) this.sujo = true;
      if (this.nuvens.ativo || this.ceu.nuvens > 0.05) {
        this.aplicarClima();
        this.sujo = true;
      }
    }
    if (!this.sujo) return;
    this.sujo = false;
    this.atualizarVisibilidade();
    this.renderer.render(this.cena, this.camera);
  };

  private andarDireto(dt: number) {
    if (!this.meuId) return false;
    const b = this.bonecos.get(this.meuId);
    const zona = this.zona;
    if (!b || !zona || b.zona !== zona.cidade.id) return false;
    const e = this.gamepad() ?? this.entrada;
    const forca = Math.min(1, Math.hypot(e.x, e.z));
    if (!forca || !this.podeAndar) return false;

    b.rota = [];
    const [sen, cos] = [Math.sin(this.azimute), Math.cos(this.azimute)];
    const nx = e.x * cos + e.z * sen;
    const nz = e.z * cos - e.x * sen;
    const n = Math.hypot(nx, nz) || 1;
    const passo = this.velocidadeDireta * forca * dt;
    const x = b.grupo.position.x + (nx / n) * passo;
    const z = b.grupo.position.z + (nz / n) * passo;
    const livre = zona.pontoLivre(x, z, this.bloqueios);
    const antesX = b.grupo.position.x;
    const antesZ = b.grupo.position.z;
    if (livre) b.grupo.position.set(x, 0, z);
    else if (zona.pontoLivre(x, antesZ, this.bloqueios)) b.grupo.position.x = x;
    else if (zona.pontoLivre(antesX, z, this.bloqueios)) b.grupo.position.z = z;
    const andou = Math.hypot(b.grupo.position.x - antesX, b.grupo.position.z - antesZ);
    if (!andou) return false;
    this.pousar(b);
    b.fase += dt * 14;
    b.corpo.position.y = Math.abs(Math.sin(b.fase)) * 0.18;
    b.corpo.rotation.y = Math.atan2(nx, nz);
    this.alvo.x = b.grupo.position.x;
    this.alvo.z = b.grupo.position.z;
    this.posicionarCamera();
    this.aoAndar?.(b.id, b.grupo.position.x, b.grupo.position.z, andou);
    return true;
  }

  private passo(b: Boneco, dt: number) {
    const proximo = b.rota[0];
    if (!proximo) return false;
    const dx = proximo.x - b.grupo.position.x;
    const dz = proximo.z - b.grupo.position.z;
    const d = Math.hypot(dx, dz);
    const passo = b.velocidade * dt;
    if (d <= passo) {
      b.grupo.position.set(proximo.x, 0, proximo.z);
      this.pousar(b);
      b.rota.shift();
      if (!b.rota.length) {
        b.corpo.position.y = 0;
        const fim = b.aoChegar;
        b.aoChegar = undefined;
        fim?.();
      }
      return true;
    }
    b.grupo.position.x += (dx / d) * passo;
    b.grupo.position.z += (dz / d) * passo;
    this.pousar(b);
    b.corpo.rotation.y = Math.atan2(dx, dz);
    b.fase += dt * 14;
    b.corpo.position.y = Math.abs(Math.sin(b.fase)) * 0.18;
    return true;
  }

  /** Telhado abre no zoom ou com o jogador dentro; interior escondido nunca abre para jogador. */
  private atualizarVisibilidade() {
    const zona = this.zona;
    const lugar = this.lugar;
    if (!zona || !lugar) return;
    const escalaFigura = Math.max(1, this.distancia / FIGURA_PADRAO);
    const eu = this.meuId ? this.posicao(this.meuId) : null;
    const minhaZona = this.meuId ? this.bonecos.get(this.meuId)?.zona : null;
    const dentroDe = eu ? zona.predioNoPonto(eu.x, eu.z) : null;
    const detalhado = this.distancia < DISTANCIA_DETALHE;
    const sumindo = THREE.MathUtils.smoothstep(this.distancia, DISTANCIA_DETALHE, DISTANCIA_SEM_CHAO);
    lugar.detalhes.visible = detalhado;
    lugar.grupo.visible = sumindo < 1;
    lugar.material.opacity = 1 - sumindo;
    lugar.chao.position.y = detalhado ? 0 : 2;
    this.continente.uRaio.value = detalhado ? zona.cidade.raio * INICIO_DA_BORDA : 0;
    for (const [id, g] of this.continente.vizinhas) g.visible = !(detalhado && id === zona.cidade.id);
    for (const v of this.continente.vias) v.visible = this.distancia > DISTANCIA_VIAS;
    for (const n of lugar.nomes) n.visible = this.distancia < DISTANCIA_NOMES_PREDIOS;
    for (const n of this.continente.nomes) {
      n.visible = this.distancia > DISTANCIA_NOMES_MAPA && (n.userData.forte || this.distancia < 42_000);
      const e = this.distancia / 26;
      n.scale.set(e * 5.7, e, 1);
    }
    const perto = this.distancia < DISTANCIA_ABRE_TELHADO;
    const oculto = (id: string) => !this.juiz && this.bloqueios.vista.includes(id);

    // Abre só um telhado: o do prédio onde o jogador está, ou o que a câmera mira de perto.
    // Abrir todos de uma vez deixava torres e mirantes soltos no ar.
    const mirado = perto ? zona.predioNoPonto(this.alvo.x, this.alvo.z) : null;
    for (const t of lugar.tetos as Teto[]) {
      const estou = dentroDe?.id === t.predio.id;
      const aberto = (estou || mirado?.id === t.predio.id) && !(oculto(t.predio.id) && !estou);
      t.telhado.visible = !aberto;
      t.interior.visible = aberto;
    }
    for (const b of this.bonecos.values()) {
      b.grupo.scale.setScalar(escalaFigura);
      if (b.id === this.meuId || this.juiz) {
        b.grupo.visible = true;
        continue;
      }
      if (b.zona !== minhaZona) {
        b.grupo.visible = false;
        continue;
      }
      const p = this.posicao(b.id)!;
      const predio = zona.predioNoPonto(p.x, p.z);
      const escondido = predio && oculto(predio.id) && predio.id !== dentroDe?.id;
      b.grupo.visible = !escondido && (!eu || aoAlcance(eu, p));
    }
  }

  destruir() {
    cancelAnimationFrame(this.quadro);
    this.medir.disconnect();
    this.canvas.removeEventListener("pointerdown", this.aoApertar);
    this.canvas.removeEventListener("pointermove", this.aoMover);
    this.canvas.removeEventListener("pointerup", this.aoSoltar);
    this.canvas.removeEventListener("pointercancel", this.aoSoltar);
    this.canvas.removeEventListener("wheel", this.aoRolar);
    this.canvas.removeEventListener("contextmenu", this.semMenu);
    this.descartar(this.cena);
    this.renderer.dispose();
  }

  private descartar(raiz: THREE.Object3D) {
    raiz.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const material = m.material as THREE.MeshLambertMaterial | undefined;
      material?.map?.dispose();
      material?.dispose?.();
    });
  }
}
