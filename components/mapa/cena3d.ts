// Cena Three.js do mapa: vista de drone, zoom do mundo inteiro até a rua.
// Sem React de propósito: tudo aqui roda a 60 fps e nada disso deve re-renderizar.
//
// Otimização para celular: só desenha quando algo mudou (a bateria agradece),
// árvores e casas em InstancedMesh, sombra só em tela grande, pixel ratio limitado.

import * as THREE from "three";
import {
  LADO_MUNDO,
  PREDIOS,
  SEM_BLOQUEIOS,
  aoAlcance,
  pontoLivre,
  predioNoPonto,
  type Bloqueios,
  type Ponto,
  type Predio,
} from "@/lib/mapa/mundo";

const ZOOM_MIN = 22;
const ZOOM_MAX = 170;
const DISTANCIA_ABRE_TELHADO = 75;
const ELEVACAO = 0.95;
const AZIMUTE = Math.PI / 4;
const TOQUE_MAX_PX = 8;

export type PersonagemCena = { id: string; nome: string; x: number; z: number };

type Boneco = {
  id: string;
  grupo: THREE.Group;
  corpo: THREE.Group;
  rota: Ponto[];
  velocidade: number;
  aoChegar?: () => void;
  fase: number;
};

type Teto = { predio: Predio; telhado: THREE.Object3D; interior: THREE.Object3D };

function corDoId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return new THREE.Color().setHSL((h % 360) / 360, 0.75, 0.55);
}

function prng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function texturaDoChao() {
  const lado = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = lado;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#7d7a45";
  c.fillRect(0, 0, lado, lado);
  const r = prng(7);
  for (let i = 0; i < 9000; i++) {
    c.fillStyle = `rgba(${40 + r() * 70},${50 + r() * 60},${20 + r() * 30},0.22)`;
    c.fillRect(r() * lado, r() * lado, 2 + r() * 7, 2 + r() * 7);
  }
  const px = (v: number) => ((v + LADO_MUNDO / 2) / LADO_MUNDO) * lado;
  c.strokeStyle = "#a98c5e";
  c.lineCap = "round";
  c.lineWidth = 34;
  c.beginPath();
  c.moveTo(px(-60), px(0));
  c.lineTo(px(60), px(0));
  c.moveTo(px(0), px(-60));
  c.lineTo(px(0), px(60));
  c.stroke();
  c.lineWidth = 16;
  for (const p of PREDIOS.filter((p) => p.entravel && p.id !== "bar-do-tiao")) {
    c.beginPath();
    c.moveTo(px(p.x), px(p.z + p.fundo / 2));
    c.quadraticCurveTo(px(p.x), px(0), px(p.x * 0.3), px(0));
    c.stroke();
  }
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

function etiqueta(texto: string, escala = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 56;
  const c = canvas.getContext("2d")!;
  c.font = "bold 30px Georgia, serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.lineWidth = 7;
  c.strokeStyle = "rgba(0,0,0,0.9)";
  c.strokeText(texto, 128, 28, 244);
  c.fillStyle = "#fff";
  c.fillText(texto, 128, 28, 244);
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(9 * escala, 2 * escala, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export class Cena3D {
  private renderer: THREE.WebGLRenderer;
  private cena = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 2, 800);
  private alvo = new THREE.Vector3(0, 0, 0);
  private distancia = 120;
  private bonecos = new Map<string, Boneco>();
  private tetos: Teto[] = [];
  private chao: THREE.Mesh;
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
  velocidadeDireta = 6;
  podeAndar = true;
  aoAndar?: (id: string, x: number, z: number, unidades: number) => void;
  aoTocar?: (ponto: Ponto) => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private meuId: string | null,
    private juiz: boolean,
  ) {
    const grande = window.matchMedia("(min-width: 1024px)").matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: grande, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, grande ? 2 : 1.5));
    this.renderer.shadowMap.enabled = grande;
    this.cena.background = new THREE.Color("#1a1612");
    this.cena.fog = new THREE.Fog("#1a1612", 200, 420);

    this.cena.add(new THREE.HemisphereLight("#fff1d6", "#54452f", 1.7));
    const sol = new THREE.DirectionalLight("#ffd9a0", 2.2);
    sol.position.set(-50, 90, 40);
    sol.castShadow = grande;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, far: 220 });
    this.cena.add(sol);

    this.chao = new THREE.Mesh(
      new THREE.PlaneGeometry(LADO_MUNDO, LADO_MUNDO),
      new THREE.MeshLambertMaterial({ map: texturaDoChao() }),
    );
    this.chao.rotation.x = -Math.PI / 2;
    this.chao.receiveShadow = true;
    this.cena.add(this.chao);

    for (const p of PREDIOS) this.montarPredio(p);
    this.montarArvores();
    this.posicionarCamera();

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", this.aoApertar);
    canvas.addEventListener("pointermove", this.aoMover);
    canvas.addEventListener("pointerup", this.aoSoltar);
    canvas.addEventListener("pointercancel", this.aoSoltar);
    canvas.addEventListener("wheel", this.aoRolar, { passive: false });
    this.medir = new ResizeObserver(() => this.ajustarTamanho());
    this.medir.observe(canvas.parentElement ?? canvas);
    this.ajustarTamanho();
    this.quadro = requestAnimationFrame(this.ciclo);
  }

  private montarPredio(p: Predio) {
    const parede = new THREE.MeshLambertMaterial({ color: p.cor });
    const telhadoMat = new THREE.MeshLambertMaterial({ color: "#6e3a2a" });
    const telhado = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT2 / 2, 1, 4).rotateY(Math.PI / 4), telhadoMat);
    telhado.scale.set(p.largura * 1.08, 3, p.fundo * 1.08);
    telhado.position.set(p.x, p.altura + 1.5, p.z);
    telhado.castShadow = true;
    this.cena.add(telhado);

    if (!p.entravel) {
      const caixa = new THREE.Mesh(new THREE.BoxGeometry(p.largura, p.altura, p.fundo), parede);
      caixa.position.set(p.x, p.altura / 2, p.z);
      caixa.castShadow = true;
      this.cena.add(caixa);
      return;
    }

    const e = 0.5;
    const interior = new THREE.Group();
    const parte = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
      const malha = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      malha.position.set(p.x + x, y, p.z + z);
      malha.castShadow = true;
      return malha;
    };
    const lado = (p.largura - 5) / 2;
    this.cena.add(
      parte(p.largura, p.altura, e, 0, p.altura / 2, -p.fundo / 2, parede),
      parte(e, p.altura, p.fundo, -p.largura / 2, p.altura / 2, 0, parede),
      parte(e, p.altura, p.fundo, p.largura / 2, p.altura / 2, 0, parede),
      parte(lado, p.altura, e, -(lado + 5) / 2, p.altura / 2, p.fundo / 2, parede),
      parte(lado, p.altura, e, (lado + 5) / 2, p.altura / 2, p.fundo / 2, parede),
    );
    const madeira = new THREE.MeshLambertMaterial({ color: "#5a3a22" });
    const piso = parte(p.largura - 0.4, 0.1, p.fundo - 0.4, 0, 0.06, 0, new THREE.MeshLambertMaterial({ color: "#c9ae84" }));
    piso.castShadow = false;
    interior.add(piso, parte(p.largura * 0.7, 1.1, 1, 0, 0.55, -p.fundo / 2 + 1.5, madeira));
    for (const lx of [-0.28, 0.28]) interior.add(parte(2.2, 0.9, 2.2, p.largura * lx, 0.45, 1.5, madeira));
    this.cena.add(interior);

    const nome = etiqueta(p.nome, 1.5);
    nome.position.set(p.x, p.altura + 5.5, p.z);
    this.cena.add(nome);
    this.tetos.push({ predio: p, telhado, interior });
  }

  private montarArvores() {
    const r = prng(19);
    const pontos: Ponto[] = [];
    while (pontos.length < 260) {
      const x = (r() - 0.5) * (LADO_MUNDO - 4);
      const z = (r() - 0.5) * (LADO_MUNDO - 4);
      if (Math.abs(x) < 5 || Math.abs(z) < 5 || !pontoLivre(x, z) || predioNoPonto(x, z)) continue;
      pontos.push({ x, z });
    }
    const copa = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1.7, 0),
      new THREE.MeshLambertMaterial({ color: "#46603a", flatShading: true }),
      pontos.length,
    );
    const tronco = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.22, 0.32, 1.8, 5),
      new THREE.MeshLambertMaterial({ color: "#4a3524" }),
      pontos.length,
    );
    const m = new THREE.Matrix4();
    pontos.forEach((p, i) => {
      const e = 0.8 + r() * 0.7;
      m.makeScale(e, e * 1.2, e).setPosition(p.x, 2.6 * e, p.z);
      copa.setMatrixAt(i, m);
      m.makeScale(e, e, e).setPosition(p.x, 0.9 * e, p.z);
      tronco.setMatrixAt(i, m);
    });
    copa.castShadow = true;
    this.cena.add(copa, tronco);
  }

  private posicionarCamera() {
    const h = Math.cos(ELEVACAO) * this.distancia;
    this.camera.position.set(
      this.alvo.x + Math.sin(AZIMUTE) * h,
      Math.sin(ELEVACAO) * this.distancia,
      this.alvo.z + Math.cos(AZIMUTE) * h,
    );
    this.camera.lookAt(this.alvo);
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
    const hit = this.raio.intersectObject(this.chao)[0];
    return hit ? { x: hit.point.x, z: hit.point.z } : null;
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
      return;
    }
    if (this.inicioToque && Math.hypot(e.clientX - this.inicioToque.x, e.clientY - this.inicioToque.y) < TOQUE_MAX_PX) return;
    this.inicioToque = null;
    const fator = (this.distancia / this.canvas.clientHeight) * 0.75;
    const dx = (e.clientX - antes.x) * fator;
    const dy = (e.clientY - antes.y) * fator * 1.3;
    const limite = LADO_MUNDO / 2;
    const s = Math.SQRT1_2;
    this.alvo.x = THREE.MathUtils.clamp(this.alvo.x - (dx + dy) * s, -limite, limite);
    this.alvo.z = THREE.MathUtils.clamp(this.alvo.z - (dy - dx) * s, -limite, limite);
    this.posicionarCamera();
  };

  private aoSoltar = (e: PointerEvent) => {
    this.ponteiros.delete(e.pointerId);
    if (this.inicioToque && e.type === "pointerup") {
      const ponto = this.pontoNoChao(e.clientX, e.clientY);
      if (ponto) this.aoTocar?.(ponto);
    }
    this.inicioToque = null;
    this.pinca = 0;
  };

  private aoRolar = (e: WheelEvent) => {
    e.preventDefault();
    this.zoom(Math.exp(e.deltaY * 0.0012));
  };

  zoom(fator: number) {
    this.distancia = THREE.MathUtils.clamp(this.distancia * fator, ZOOM_MIN, ZOOM_MAX);
    this.posicionarCamera();
  }

  centrar(x: number, z: number, distancia?: number) {
    this.alvo.set(x, 0, z);
    if (distancia) this.distancia = distancia;
    this.posicionarCamera();
  }

  definirBloqueios(b: Bloqueios) {
    this.bloqueios = b;
    this.sujo = true;
  }

  sincronizar(lista: PersonagemCena[]) {
    for (const p of lista) {
      if (this.bonecos.has(p.id)) continue;
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
      grupo.position.set(p.x, 0, p.z);
      this.cena.add(grupo);
      this.bonecos.set(p.id, { id: p.id, grupo, corpo, rota: [], velocidade: 0, fase: 0 });
    }
    this.sujo = true;
  }

  posicao(id: string): Ponto | null {
    const b = this.bonecos.get(id);
    return b ? { x: b.grupo.position.x, z: b.grupo.position.z } : null;
  }

  percorrer(id: string, rota: Ponto[], velocidade: number, aoChegar?: () => void) {
    const b = this.bonecos.get(id);
    if (!b) return;
    b.rota = rota.slice(1);
    b.velocidade = velocidade;
    b.aoChegar = aoChegar;
  }

  /** Posição recebida da rede: corrige o boneco sem interromper uma rota própria. */
  teleportar(id: string, x: number, z: number) {
    const b = this.bonecos.get(id);
    if (!b) return;
    b.rota = [{ x, z }];
    b.velocidade = 12;
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
    const dt = Math.min(0.05, (agora - this.antes) / 1000);
    this.antes = agora;
    if (this.andarDireto(dt)) this.sujo = true;
    for (const b of this.bonecos.values()) if (this.passo(b, dt)) this.sujo = true;
    if (!this.sujo) return;
    this.sujo = false;
    this.atualizarVisibilidade();
    this.renderer.render(this.cena, this.camera);
  };

  private andarDireto(dt: number) {
    if (!this.meuId) return false;
    const b = this.bonecos.get(this.meuId);
    if (!b) return false;
    const e = this.gamepad() ?? this.entrada;
    const forca = Math.min(1, Math.hypot(e.x, e.z));
    if (!forca || !this.podeAndar) return false;

    b.rota = [];
    const s = Math.SQRT1_2;
    const nx = (e.x + e.z) * s;
    const nz = (e.z - e.x) * s;
    const n = Math.hypot(nx, nz) || 1;
    const passo = this.velocidadeDireta * forca * dt;
    const x = b.grupo.position.x + (nx / n) * passo;
    const z = b.grupo.position.z + (nz / n) * passo;
    const livre = pontoLivre(x, z, this.bloqueios);
    const antesX = b.grupo.position.x;
    const antesZ = b.grupo.position.z;
    if (livre) b.grupo.position.set(x, 0, z);
    else if (pontoLivre(x, antesZ, this.bloqueios)) b.grupo.position.x = x;
    else if (pontoLivre(antesX, z, this.bloqueios)) b.grupo.position.z = z;
    const andou = Math.hypot(b.grupo.position.x - antesX, b.grupo.position.z - antesZ);
    if (!andou) return false;
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
    b.corpo.rotation.y = Math.atan2(dx, dz);
    b.fase += dt * 14;
    b.corpo.position.y = Math.abs(Math.sin(b.fase)) * 0.18;
    return true;
  }

  /** Telhado abre no zoom ou com o jogador dentro; interior escondido nunca abre para jogador. */
  private atualizarVisibilidade() {
    const eu = this.meuId ? this.posicao(this.meuId) : null;
    const dentroDe = eu ? predioNoPonto(eu.x, eu.z) : null;
    const perto = this.distancia < DISTANCIA_ABRE_TELHADO;
    const oculto = (id: string) => !this.juiz && this.bloqueios.vista.includes(id);

    for (const t of this.tetos) {
      const estou = dentroDe?.id === t.predio.id;
      const aberto = (perto || estou) && !(oculto(t.predio.id) && !estou);
      t.telhado.visible = !aberto;
      t.interior.visible = aberto;
    }
    for (const b of this.bonecos.values()) {
      if (b.id === this.meuId || this.juiz) {
        b.grupo.visible = true;
        continue;
      }
      const p = { x: b.grupo.position.x, z: b.grupo.position.z };
      const predio = predioNoPonto(p.x, p.z);
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
    this.cena.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const material = m.material as THREE.Material | undefined;
      material?.dispose?.();
    });
    this.renderer.dispose();
  }
}
