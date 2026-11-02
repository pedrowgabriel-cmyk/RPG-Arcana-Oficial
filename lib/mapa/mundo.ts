// Mapa 3D — mundo, colisão, rota e energia. Sem Three.js: mesa, celular e
// servidor podem usar este módulo.
//
// A planta de Tupaciguara é PROVISÓRIA: o livro (Doc 2 §5.3) cita o Bar do Tião
// e as fazendas, mas não o arranjo das ruas. Trocar pelo layout canônico aqui.
// A energia é decisão de campanha (Doc 2 §10.9), não regra do livro.

export const LADO_MUNDO = 120; // unidades; 1 unidade = 2 m
export const METROS_POR_UNIDADE = 2;
export const ENERGIA_MAX = 100;

export type Predio = {
  id: string;
  nome: string;
  x: number;
  z: number;
  largura: number;
  fundo: number;
  altura: number;
  cor: string;
  /** Só prédios entráveis têm interior e porta. */
  entravel: boolean;
};

export type Meio = "pe" | "cavalo";

export const MEIOS: Record<Meio, { rotulo: string; energiaPor100m: number; metrosPorMinuto: number; unidadesPorSegundo: number }> = {
  pe: { rotulo: "A pé", energiaPor100m: 10, metrosPorMinuto: 80, unidadesPorSegundo: 6 },
  cavalo: { rotulo: "A cavalo", energiaPor100m: 4, metrosPorMinuto: 300, unidadesPorSegundo: 14 },
};

export const PREDIOS: Predio[] = [
  { id: "bar-do-tiao", nome: "Bar do Tião", x: -14, z: -13, largura: 16, fundo: 12, altura: 5, cor: "#8a5a3a", entravel: true },
  { id: "fazenda-esperanca", nome: "Fazenda Esperança", x: 30, z: -32, largura: 18, fundo: 12, altura: 5, cor: "#b08a5a", entravel: true },
  { id: "fazenda-vasconcelos", nome: "Fazenda Vasconcelos", x: -36, z: 32, largura: 18, fundo: 12, altura: 5, cor: "#9a7a58", entravel: true },
  { id: "fazenda-domingues", nome: "Fazenda Domingues", x: 34, z: 34, largura: 18, fundo: 12, altura: 5, cor: "#a36a4a", entravel: true },
  { id: "moinho", nome: "Moinho", x: -38, z: -36, largura: 8, fundo: 8, altura: 8, cor: "#8d8476", entravel: false },
  { id: "casa-1", nome: "Casa", x: 12, z: -14, largura: 10, fundo: 9, altura: 4, cor: "#a9825c", entravel: false },
  { id: "casa-2", nome: "Casa", x: 26, z: -12, largura: 9, fundo: 9, altura: 4, cor: "#94704e", entravel: false },
  { id: "casa-3", nome: "Casa", x: -30, z: -12, largura: 9, fundo: 9, altura: 4, cor: "#b39268", entravel: false },
  { id: "casa-4", nome: "Casa", x: -14, z: 13, largura: 11, fundo: 9, altura: 4, cor: "#8f6e50", entravel: false },
  { id: "casa-5", nome: "Casa", x: 2, z: 14, largura: 9, fundo: 9, altura: 4, cor: "#a67c58", entravel: false },
  { id: "casa-6", nome: "Casa", x: 16, z: 14, largura: 10, fundo: 9, altura: 4, cor: "#b08c62", entravel: false },
  { id: "casa-7", nome: "Casa", x: -30, z: 13, largura: 9, fundo: 9, altura: 4, cor: "#99775a", entravel: false },
];

const PONTO_INICIAL = { x: 0, z: 0 };

/** Cada personagem nasce num lugar próprio da praça, sempre o mesmo. */
export function pontoDeNascimento(id: string): Ponto {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const angulo = ((h % 12) / 12) * Math.PI * 2;
  return { x: PONTO_INICIAL.x + Math.cos(angulo) * 3, z: PONTO_INICIAL.z + Math.sin(angulo) * 3 };
}

const FOLGA = 0.8;
const ESPESSURA_PAREDE = 0.5;

/** A porta fica sempre na face sul (z maior). */
export function portaDe(p: Predio) {
  return { x: p.x, z: p.z + p.fundo / 2 };
}

export function predioNoPonto(x: number, z: number): Predio | null {
  return PREDIOS.find((p) => Math.abs(x - p.x) <= p.largura / 2 && Math.abs(z - p.z) <= p.fundo / 2) ?? null;
}

export type Bloqueios = {
  /** Prédios que o Juiz trancou. */
  entrada: string[];
  /** Prédios cujo interior o Juiz escondeu dos jogadores. */
  vista: string[];
};

export const SEM_BLOQUEIOS: Bloqueios = { entrada: [], vista: [] };

/** Bloqueia o passo em prédio fechado, trancado ou na parede de um entrável. */
export function pontoLivre(x: number, z: number, bloqueios: Bloqueios = SEM_BLOQUEIOS): boolean {
  const limite = LADO_MUNDO / 2 - 1;
  if (Math.abs(x) > limite || Math.abs(z) > limite) return false;
  for (const p of PREDIOS) {
    const dx = Math.abs(x - p.x);
    const dz = Math.abs(z - p.z);
    const fora = dx > p.largura / 2 + FOLGA || dz > p.fundo / 2 + FOLGA;
    if (fora) continue;
    if (!p.entravel || bloqueios.entrada.includes(p.id)) return false;
    const naParede =
      dx > p.largura / 2 - ESPESSURA_PAREDE - FOLGA || dz > p.fundo / 2 - ESPESSURA_PAREDE - FOLGA;
    const naPorta = z > p.z && dx < 2.5;
    if (naParede && !naPorta) return false;
  }
  return true;
}

export type Ponto = { x: number; z: number };

const PASSO_GRADE = 1;

function celula(v: number) {
  return Math.round((v + LADO_MUNDO / 2) / PASSO_GRADE);
}

function visada(a: Ponto, b: Ponto, bloqueios: Bloqueios) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (!pontoLivre(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, bloqueios)) return false;
  }
  return true;
}

/** Busca em largura na grade e depois corta os cantos desnecessários. null = sem caminho. */
export function calcularRota(de: Ponto, para: Ponto, bloqueios: Bloqueios = SEM_BLOQUEIOS): Ponto[] | null {
  if (!pontoLivre(para.x, para.z, bloqueios)) return null;
  if (visada(de, para, bloqueios)) return [de, para];

  const lado = Math.floor(LADO_MUNDO / PASSO_GRADE) + 1;
  const indice = (cx: number, cz: number) => cz * lado + cx;
  const paraMundo = (c: number) => c * PASSO_GRADE - LADO_MUNDO / 2;
  const inicio = indice(celula(de.x), celula(de.z));
  const fim = indice(celula(para.x), celula(para.z));
  const veioDe = new Int32Array(lado * lado).fill(-1);
  veioDe[inicio] = inicio;
  const fila = new Int32Array(lado * lado);
  let cabeca = 0;
  let cauda = 0;
  fila[cauda++] = inicio;

  while (cabeca < cauda && veioDe[fim] === -1) {
    const atual = fila[cabeca++];
    const cx = atual % lado;
    const cz = Math.floor(atual / lado);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= lado || nz >= lado) continue;
        const prox = indice(nx, nz);
        if (veioDe[prox] !== -1 || !pontoLivre(paraMundo(nx), paraMundo(nz), bloqueios)) continue;
        if (dx && dz && (!pontoLivre(paraMundo(nx), paraMundo(cz), bloqueios) || !pontoLivre(paraMundo(cx), paraMundo(nz), bloqueios))) continue;
        veioDe[prox] = atual;
        fila[cauda++] = prox;
      }
    }
  }
  if (veioDe[fim] === -1) return null;

  const grade: Ponto[] = [para];
  for (let c = veioDe[fim]; c !== inicio; c = veioDe[c]) {
    grade.push({ x: paraMundo(c % lado), z: paraMundo(Math.floor(c / lado)) });
  }
  grade.push(de);
  grade.reverse();

  const rota: Ponto[] = [de];
  let i = 0;
  while (i < grade.length - 1) {
    let j = grade.length - 1;
    while (j > i + 1 && !visada(grade[i], grade[j], bloqueios)) j--;
    rota.push(grade[j]);
    i = j;
  }
  return rota;
}

export function distanciaMetros(rota: Ponto[]) {
  let unidades = 0;
  for (let i = 1; i < rota.length; i++) {
    unidades += Math.hypot(rota[i].x - rota[i - 1].x, rota[i].z - rota[i - 1].z);
  }
  return unidades * METROS_POR_UNIDADE;
}

export function custoEnergia(metros: number, meio: Meio) {
  return Math.ceil((metros / 100) * MEIOS[meio].energiaPor100m);
}

/** Andar no controle é sempre a pé: desconta só a energia inteira já percorrida. */
export function descontarPassos(metros: number) {
  const metrosPorPonto = 100 / MEIOS.pe.energiaPor100m;
  const gasto = Math.floor(metros / metrosPorPonto);
  return { gasto, sobra: metros - gasto * metrosPorPonto };
}

export function minutosDeJogo(metros: number, meio: Meio) {
  return Math.max(1, Math.round(metros / MEIOS[meio].metrosPorMinuto));
}

/** Viagem custa o que a rota custa; quem não tem energia para ela não sai do lugar. */
export function custoDaViagem(rota: Ponto[], meio: Meio, energia: number) {
  const metros = distanciaMetros(rota);
  const custo = custoEnergia(metros, meio);
  return { metros, custo, minutos: minutosDeJogo(metros, meio), podeIr: custo <= energia };
}

export const RAIO_DE_VISAO = 60;

/** O jogador só enxerga quem está por perto; a mesa do Juiz enxerga todos. */
export function aoAlcance(eu: Ponto, outro: Ponto) {
  return Math.hypot(eu.x - outro.x, eu.z - outro.z) <= RAIO_DE_VISAO;
}
