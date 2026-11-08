// Formato dos arquivos de relevo. Sem dependências: usado por scripts e pelo jogo.

export const CONT_PASSO = 2; // unidades do mapa impresso entre pontos
export const CONT_LARGURA = 501;
export const CONT_ALTURA = 369;

export const RECORTE_LADO = 301;

/**
 * Escala do mundo, entre GTA e Red Dead: 1 unidade do mapa impresso = 42 m.
 * O continente tem cerca de 42 km; a história segue em 1 unidade = 1 km (lib/mapa/viagem.ts).
 */
export const METROS_POR_UNIDADE_DO_MAPA = 42;

/** Lugares que colidiriam nesta escala, afastados só no 3D. */
export const POSICAO_3D: Record<string, { x: number; y: number }> = {
  "deserto-de-mucuri": { x: 215, y: 665 },
  "serra-da-saudade-cordilheira": { x: 552, y: 128 },
};

/** Lugares com recorte real de Minas: centro (graus) e lado do quadrado (metros). */
export const RECORTES: Record<string, { lat: number; lon: number; lado: number; altitudeBase: number }> = {
  "belo-horizonte": { lat: -19.945, lon: -43.935, lado: 5400, altitudeBase: 824 },
};

/** Em volta do recorte, a região real entra no continente (unidades do mapa). */
export const REGIAO_REAL = 170;

/* ── Além do mapa ──
 * A terra que se vê de longe, fora do mapa jogável. Vem no mesmo continente.bin, depois do
 * mapa: primeiro a grade de perto (fina), depois a de longe (grossa). O mapa jogável não muda.
 * Mar a oeste e ao sul; ao norte o sertão seco de chapadas; a noroeste o cerrado de chapadões;
 * a leste serras de mata descendo até a costa, que sobe para nordeste desde a baía.
 */
export type GradeDeFora = { x0: number; y0: number; passo: number; largura: number; altura: number };
export const ALEM_PERTO: GradeDeFora = { x0: -500, y0: -600, passo: 4, largura: 501, altura: 376 };
export const ALEM_LONGE: GradeDeFora = { x0: -2600, y0: -2400, passo: 20, largura: 301, altura: 251 };
/** Onde começa cada grade dentro do continente.bin (em Int16). */
export const INICIO_PERTO = CONT_LARGURA * CONT_ALTURA;
export const INICIO_LONGE = INICIO_PERTO + ALEM_PERTO.largura * ALEM_PERTO.altura;

type P = readonly [number, number];

function sorte(i: number, semente: number) {
  let n = Math.imul(i, 374761393) + Math.imul(semente, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** Linha de costa recortada: divide cada trecho e empurra o meio para o lado, várias vezes. */
function recortar(pts: readonly P[], semente: number, forca = 0.22, voltas = 5): P[] {
  let linha = pts.map((p) => [p[0], p[1]] as P);
  let k = 0;
  for (let v = 0; v < voltas; v++) {
    const nova: P[] = [linha[0]];
    for (let i = 1; i < linha.length; i++) {
      const [a, b] = [linha[i - 1], linha[i]];
      const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
      const desvio = (sorte(k++, semente + v) - 0.5) * 2 * forca;
      nova.push([(a[0] + b[0]) / 2 - dy * desvio, (a[1] + b[1]) / 2 + dx * desvio], b);
    }
    linha = nova;
  }
  return linha;
}

/** Costa oeste de fora: sai de (0, 95) e segue a curva oficial para noroeste. */
export const COSTA_NOROESTE: P[] = recortar(
  [[-2900, -2700], [-2100, -1900], [-1500, -1250], [-1050, -820], [-700, -470], [-450, -250], [-300, -90], [-160, 20], [-60, 62], [0, 95]],
  7,
);
/** Cabo ao sul: fecha a terra entre a costa oficial e a baía. */
export const CABO_SUL: P[] = recortar([[755, 706], [760, 742], [782, 772], [808, 780], [828, 762], [840, 744], [866, 746], [895, 736]], 9, 0.12, 3);
/** Costa leste de fora: da boca da baía para nordeste, como a costa do Brasil. */
export const COSTA_NORDESTE: P[] = recortar(
  [[1000, 320], [1052, 334], [1112, 306], [1160, 252], [1226, 214], [1282, 158], [1350, 108], [1430, 36], [1520, -36], [1640, -120], [1800, -230], [2000, -360], [2300, -560], [2800, -900], [3700, -1500]],
  11,
);

/** Rios que saem do mapa e seguem terra adentro (do mapa para fora). */
export const RIOS_DE_FORA: { pts: P[]; largura: number }[] = [
  { pts: recortar([[760, 0], [768, -60], [744, -130], [760, -210], [728, -300], [742, -400], [700, -520], [716, -640]], 21, 0.15, 3), largura: 1.6 }, // Riacho de Araguari
  { pts: recortar([[878, 0], [892, -56], [880, -120], [906, -190], [930, -270], [924, -360], [960, -450], [990, -560]], 23, 0.15, 3), largura: 1.6 }, // afluente do Sucuri
  { pts: recortar([[1000, 180], [1046, 166], [1098, 128], [1150, 104], [1208, 58], [1262, 14], [1330, -40], [1400, -110], [1470, -190], [1560, -260]], 25, 0.12, 3), largura: 2.6 }, // Sucuri, entre as serras
  { pts: recortar([[-560, -700], [-420, -560], [-300, -470], [-140, -420], [40, -330], [200, -300], [360, -220], [520, -250], [650, -330], [760, -330]], 27, 0.15, 3), largura: 2.2 }, // rio grande do sertão
  { pts: recortar([[-330, -90], [-260, -150], [-230, -240], [-150, -300], [-120, -400]], 29, 0.15, 3), largura: 1.4 }, // vereda do cerrado
];

function ruidoDeFora(x: number, y: number, semente: number) {
  let [s, a, t] = [0, 0.5, 0];
  for (let o = 0; o < 4; o++) {
    const [i, j] = [Math.floor(x), Math.floor(y)];
    const [fx, fy] = [x - i, y - j];
    const [u, v] = [fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)];
    const h = (a2: number, b2: number) => sorte(Math.imul(i + a2, 92821) ^ (j + b2), semente + o);
    s += a * (h(0, 0) * (1 - u) * (1 - v) + h(1, 0) * u * (1 - v) + h(0, 1) * (1 - u) * v + h(1, 1) * u * v);
    t += a;
    x *= 2.03;
    y *= 2.03;
    a *= 0.5;
  }
  return s / t;
}
export { ruidoDeFora };

const suaveF = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function aLinhaF(x: number, y: number, pts: readonly P[]) {
  let m = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    m = Math.min(m, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
  }
  return m;
}

/** Quanto um ponto é mata atlântica, cerrado ou sertão. Somam 1. */
export function regiaoDeFora(x: number, y: number) {
  const torto = (ruidoDeFora(x / 160, y / 160, 301) - 0.5) * 240;
  const mata = 1 - suaveF(170, 420, aLinhaF(x, y, COSTA_NORDESTE) + torto);
  // Cerrado no oeste e noroeste; o sertão toma o norte e o nordeste interior.
  const cerrado = (1 - suaveF(120, 520, x - y * 0.35 + torto * 1.3)) * (1 - mata);
  return { mata, cerrado, sertao: Math.max(0, 1 - mata - cerrado) };
}
