// Gera os dados de relevo em public/mapa: node scripts/gerar-relevo.mjs
// continente.bin: geografia do mapa oficial virada em altitude (Int16, metros).
// relevo/<id>.bin: recorte real de elevação (Int16, decímetros), norte em cima.
// Elevação real: AWS Terrain Tiles (Mapzen), derivados de SRTM e outras bases públicas.
import { registerHooks } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";
import path from "node:path";

registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith(".") && !path.extname(spec) && ctx.parentURL) {
      const alvo = path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), `${spec}.ts`);
      if (existsSync(alvo)) return next(pathToFileURL(alvo).href, ctx);
    }
    return next(spec, ctx);
  },
});

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const G = await import(pathToFileURL(path.join(raiz, "lib/mapa/geografia.ts")).href);
const { CONT_LARGURA, CONT_ALTURA, CONT_PASSO, METROS_POR_UNIDADE_DO_MAPA: M, POSICAO_3D, RECORTE_LADO, RECORTES, REGIAO_REAL } = await import(pathToFileURL(path.join(raiz, "lib/mapa/dados-relevo.ts")).href);

/* ── Ruído ── */
function ruido2(x, y, seed) {
  const h = (i, j) => {
    let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 2147483647 % 65536);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const [i, j] = [Math.floor(x), Math.floor(y)];
  const [fx, fy] = [x - i, y - j];
  const [u, v] = [fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)];
  return h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v;
}
function fbm(x, y, seed, oitavas = 5) {
  let [s, a, t] = [0, 0.5, 0];
  for (let o = 0; o < oitavas; o++) {
    s += a * ruido2(x, y, seed + o);
    t += a;
    x *= 2.03;
    y *= 2.03;
    a *= 0.5;
  }
  return s / t;
}
const crista = (x, y, seed) => 1 - Math.abs(2 * fbm(x, y, seed) - 1);
const suave = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ── Geometria ── */
function noPoligono(x, y, pts) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [a, b, c, e] = [pts[i][0], pts[i][1], pts[j][0], pts[j][1]];
    if (b > y !== e > y && x < ((c - a) * (y - b)) / (e - b) + a) d = !d;
  }
  return d;
}
function aoSegmento(x, y, a, b) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}
function aLinha(x, y, pts) {
  let m = Infinity;
  for (let i = 1; i < pts.length; i++) m = Math.min(m, aoSegmento(x, y, pts[i - 1], pts[i]));
  return m;
}

const MAR_OESTE = [...G.WEST_COAST, [755, 736], [0, 736]];
const MAR_LESTE = [...G.EAST_COAST, [1000, 736], [1000, 320]];
// O livro põe Santo Ozório na costa; o traçado 2D o deixa dentro do mar.
const PENINSULA_OZORIO = [[40, 268], [70, 282], [108, 298]];
const LUGARES = [...G.CITIES, ...G.REGION_PLACES].map((l) => ({ ...l, ...POSICAO_3D[l.id] }));
for (const l of LUGARES) l.cidade = (await import(pathToFileURL(path.join(raiz, `lib/mapa/cidades/${l.id}.ts`)).href)).default;

// O mar de quem está na costa vem da própria planta, para a cidade e o continente baterem.
const area = (pts) => pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * p[1], 0);
const COSTEIRAS = ["belo-horizonte", "santo-ozorio"].map((id) => {
  const l = LUGARES.find((v) => v.id === id);
  const agua = l.cidade.areas.filter((a) => a.tipo === "agua").sort((a, b) => Math.abs(area(b.pts)) - Math.abs(area(a.pts)))[0];
  // A planta só vai até a borda do lugar; a baía continua até o mar aberto.
  const pts = id === "belo-horizonte" ? [[7000, -7000], [1500, -6500], ...agua.pts.slice(1, -1), [1700, 5800], [7000, 6500]] : agua.pts;
  return { pts: pts.map(([x, z]) => [l.x + x / M, l.y + z / M]) };
});

function ehMar(x, y) {
  if (COSTEIRAS.some((c) => noPoligono(x, y, c.pts))) return true;
  if (aLinha(x, y, PENINSULA_OZORIO) < 12) return false;
  if (LUGARES.some((l) => Math.hypot(x - l.x, y - l.y) < l.cidade.raio / M)) return false;
  if (Math.hypot((x - G.ISLAND_DEF.cx) / G.ISLAND_DEF.rx, (y - G.ISLAND_DEF.cy) / G.ISLAND_DEF.ry) < 1) return false;
  return noPoligono(x, y, MAR_OESTE) || noPoligono(x, y, MAR_LESTE);
}

const COSTAS = [G.WEST_COAST, G.EAST_COAST, ...COSTEIRAS.map((c) => [...c.pts, c.pts[0]])];
const CHAPADAS = [{ x: 246, y: 152, rx: 58, ry: 34, alto: 1250 }];
const BAIXADAS = [
  { x: 305, y: 458, r: 62, fundo: 330 }, // Vale do Sacramento
  { x: 768, y: 405, r: 58, fundo: 240 }, // Baixada de São José
  { x: 560, y: 508, r: 78, fundo: 180 }, // Sertão de Fungos, úmido
  { x: 671, y: 72, r: 24, fundo: 980 }, // vale de Maria da Fé, entre montanhas
];
const CANIONS = [[[150, 705], [190, 685], [215, 665], [248, 637], [272, 591]]]; // Ravina Vermelha

function altitude(x, y) {
  let costa = Infinity;
  for (const c of COSTAS) costa = Math.min(costa, aLinha(x, y, c));
  if (ehMar(x, y)) return -Math.min(180, 1 + costa * 6);

  let h = 760 * suave(0, 75, costa) + 1 + costa * 2.2;
  h += (fbm(x / 95, y / 95, 11) - 0.5) * 520 * suave(0, 40, costa);
  h += (fbm(x / 22, y / 22, 12) - 0.5) * 170 * suave(0, 20, costa);

  for (const c of CHAPADAS) {
    const d = Math.hypot((x - c.x) / c.rx, (y - c.y) / c.ry);
    const t = 1 - suave(0.72, 1.05, d);
    h = h + (c.alto + (fbm(x / 30, y / 30, 21) - 0.5) * 40 - h) * t;
  }
  for (const b of BAIXADAS) {
    const d = Math.hypot(x - b.x, y - b.y);
    const alvo = b.fundo + (fbm(x / 18, y / 18, 22) - 0.5) * 40;
    h = h + (alvo - h) * (1 - suave(b.r * 0.35, b.r, d));
  }
  for (const m of G.HILL_DEFS) {
    const d = Math.hypot(x - m.cx, y - m.cy) / m.r;
    h += Math.exp(-d * d * 1.6) * 240 * (0.6 + crista(x / 14, y / 14, 31));
  }
  G.RIDGES.forEach((r, i) => {
    const d = aoSegmento(x, y, [r.x1, r.y1], [r.x2, r.y2]);
    const neve = r.y1 < 115 ? 1.5 : 1;
    const corpo = Math.exp(-(d * d) / 420);
    h += corpo * neve * (420 + 760 * crista(x / 17, y / 17, 40 + i) * crista(x / 6, y / 6, 50 + i));
  });
  // Caricatura: a altura total cai para caber no mundo menor e o morro ganha ritmo.
  const perto = Math.min(...LUGARES.map((l) => Math.hypot(x - l.x, y - l.y) / (l.cidade.raio / M)));
  const movimento = suave(0, 40, costa) * (0.3 + 0.7 * suave(0.7, 2, perto));
  h = 6 + h * 0.24;
  h += (fbm(x / 62, y / 62, 71) - 0.5) * 460 * movimento;
  h += (crista(x / 24, y / 24, 72) - 0.55) * 240 * movimento;
  h += (fbm(x / 8, y / 8, 73) - 0.5) * 56 * movimento;

  for (const c of CANIONS) {
    const d = aLinha(x + (fbm(x / 9, y / 9, 61) - 0.5) * 14, y, c);
    h -= (1 - suave(1, 7, d)) * Math.min(420, h * 0.75);
  }
  for (const r of G.RIVER_DEFS) {
    const d = aLinha(x, y, r.pts);
    h -= (1 - suave(0.3, 9, d)) * Math.min(260, h * 0.36);
  }
  for (const l of G.LAKE_DEFS) {
    const d = Math.hypot((x - l.cx) / l.rx, (y - l.cy) / l.ry);
    const nivel = l.cy < 150 ? 330 : l.cx > 400 ? 150 : 215;
    h = h + (nivel - h) * (1 - suave(0.9, 1.5, d));
  }
  return Math.max(1, h);
}

const alts = new Int16Array(CONT_LARGURA * CONT_ALTURA);
for (let j = 0; j < CONT_ALTURA; j++) {
  for (let i = 0; i < CONT_LARGURA; i++) alts[j * CONT_LARGURA + i] = Math.round(altitude(i * CONT_PASSO, j * CONT_PASSO));
}
const terra = alts.filter((a) => a > 0);
console.log(`continente: ${CONT_LARGURA}×${CONT_ALTURA}, ${terra.reduce((a, b) => Math.min(a, b))} a ${terra.reduce((a, b) => Math.max(a, b))} m`);
for (const l of LUGARES) {
  const v = alts[Math.round(l.y / CONT_PASSO) * CONT_LARGURA + Math.round(l.x / CONT_PASSO)];
  console.log(`  ${l.id}: ${v} m`);
}

/* ── Recortes reais ── */
function lerPng(b) {
  let i = 8;
  let dados = [];
  let [w, h, ct] = [0, 0, 0];
  while (i < b.length) {
    const n = b.readUInt32BE(i);
    const t = b.toString("latin1", i + 4, i + 8);
    const c = b.subarray(i + 8, i + 8 + n);
    i += 12 + n;
    if (t === "IHDR") [w, h, ct] = [c.readUInt32BE(0), c.readUInt32BE(4), c[9]];
    if (t === "IDAT") dados.push(c);
  }
  const k = ct === 6 ? 4 : 3;
  const r = inflateSync(Buffer.concat(dados));
  const st = w * k;
  const saida = new Float32Array(w * h);
  let ant = new Uint8Array(st);
  for (let y = 0; y < h; y++) {
    const f = r[y * (st + 1)];
    const l = Uint8Array.from(r.subarray(y * (st + 1) + 1, (y + 1) * (st + 1)));
    for (let x = 0; x < st; x++) {
      const [a, c, e] = [x >= k ? l[x - k] : 0, ant[x], x >= k ? ant[x - k] : 0];
      if (f === 1) l[x] = (l[x] + a) & 255;
      else if (f === 2) l[x] = (l[x] + c) & 255;
      else if (f === 3) l[x] = (l[x] + ((a + c) >> 1)) & 255;
      else if (f === 4) {
        const p = a + c - e;
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - c), Math.abs(p - e)];
        l[x] = (l[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? c : e)) & 255;
      }
    }
    for (let x = 0; x < w; x++) saida[y * w + x] = l[x * k] * 256 + l[x * k + 1] + l[x * k + 2] / 256 - 32768;
    ant = l;
  }
  return saida;
}

const tiles = new Map();
async function tile(Z, x, y) {
  const k = `${Z}/${x}/${y}`;
  if (!tiles.has(k)) {
    const r = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${k}.png`);
    if (!r.ok) throw new Error(`tile ${k}: ${r.status}`);
    tiles.set(k, lerPng(Buffer.from(await r.arrayBuffer())));
  }
  return tiles.get(k);
}
async function amostra(lat, lon, Z = 13) {
  const n = 2 ** Z;
  const r = (lat * Math.PI) / 180;
  const fx = ((lon + 180) / 360) * n * 256 - 0.5;
  const fy = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n * 256 - 0.5;
  const [ix, iy] = [Math.floor(fx), Math.floor(fy)];
  const px = async (x, y) => (await tile(Z, Math.floor(x / 256), Math.floor(y / 256)))[(y & 255) * 256 + (x & 255)];
  const [a, b, c, d] = [await px(ix, iy), await px(ix + 1, iy), await px(ix, iy + 1), await px(ix + 1, iy + 1)];
  const [u, v] = [fx - ix, fy - iy];
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

for (const [id, r] of Object.entries(RECORTES)) {
  const dem = new Int16Array(RECORTE_LADO * RECORTE_LADO);
  const mLat = 110574;
  const mLon = 111320 * Math.cos((r.lat * Math.PI) / 180);
  let [min, max] = [Infinity, -Infinity];
  for (let j = 0; j < RECORTE_LADO; j++) {
    for (let i = 0; i < RECORTE_LADO; i++) {
      const dx = (i / (RECORTE_LADO - 1) - 0.5) * r.lado;
      const dz = (j / (RECORTE_LADO - 1) - 0.5) * r.lado;
      const h = await amostra(r.lat - dz / mLat, r.lon + dx / mLon);
      dem[j * RECORTE_LADO + i] = Math.round(h * 10);
      min = Math.min(min, h);
      max = Math.max(max, h);
    }
  }
  writeFileSync(path.join(raiz, `public/mapa/relevo/${id}.bin`), Buffer.from(dem.buffer));
  const perfil = [];
  for (let j = 0; j < RECORTE_LADO; j += 30) perfil.push(Math.round(dem[j * RECORTE_LADO + (RECORTE_LADO >> 1)] / 10));
  console.log(`${id}: ${min.toFixed(0)} a ${max.toFixed(0)} m; perfil norte→sul ${perfil.join(" ")}`);

  // A região em volta entra no continente, para a serra seguir além da borda do lugar.
  const l = LUGARES.find((v) => v.id === id);
  for (let j = 0; j < CONT_ALTURA; j++) {
    for (let i = 0; i < CONT_LARGURA; i++) {
      const [x, y] = [i * CONT_PASSO, j * CONT_PASSO];
      const d = Math.hypot(x - l.x, y - l.y);
      const k = j * CONT_LARGURA + i;
      if (d > REGIAO_REAL || alts[k] <= 0) continue;
      const real = (await amostra(r.lat - ((y - l.y) * M) / mLat, r.lon + ((x - l.x) * M) / mLon, 12)) - r.altitudeBase;
      let costa = Infinity;
      for (const c of COSTAS) costa = Math.min(costa, aLinha(x, y, c));
      const peso = 1 - suave(REGIAO_REAL * 0.6, REGIAO_REAL, d);
      alts[k] = Math.round(Math.max(1, alts[k] * (1 - peso) + Math.max(1, real) * suave(0, 6, costa) * peso));
    }
  }
}
writeFileSync(path.join(raiz, "public/mapa/continente.bin"), Buffer.from(alts.buffer));
