// Confere um lugar do mapa: node scripts/validar-cidade.mjs <id> (ou sem id, todos).
import { registerHooks } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
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
const pasta = path.join(raiz, "lib/mapa/cidades");
const { Zona, LARGURA_PORTA, portaDe } = await import(pathToFileURL(path.join(raiz, "lib/mapa/zona.ts")).href);
const { definirContinente, gerarRelevo, lerBin } = await import(pathToFileURL(path.join(raiz, "lib/mapa/relevo.ts")).href);
const { CITIES, REGION_PLACES } = await import(pathToFileURL(path.join(raiz, "lib/mapa/geografia.ts")).href);
definirContinente(lerBin(readFileSync(path.join(raiz, "public/mapa/continente.bin"))));
const ids = process.argv[2] ? [process.argv[2]] : readdirSync(pasta).filter((f) => f !== "kit.ts").map((f) => f.replace(".ts", ""));
const TIPOS = "casa comercio saloon hotel igreja publico banco estacao galpao fazenda moinho fabrica torre tenda ruina".split(" ");
const MAX_ROTA_TESTADA = 25;
let falhas = 0;

for (const id of ids) {
  const erros = [];
  const c = (await import(pathToFileURL(path.join(pasta, `${id}.ts`)).href)).default;
  if (c.id !== id) erros.push(`id ${c.id} difere do arquivo`);
  const vistos = new Set();
  for (const p of c.predios) {
    if (vistos.has(p.id)) erros.push(`id repetido: ${p.id}`);
    vistos.add(p.id);
    if (!TIPOS.includes(p.tipo)) erros.push(`${p.id}: tipo ${p.tipo}`);
    if (![p.x, p.z, p.largura, p.fundo, p.altura].every(Number.isFinite)) erros.push(`${p.id}: número inválido`);
    if (Math.hypot(Math.abs(p.x) + p.largura / 2, Math.abs(p.z) + p.fundo / 2) > c.raio) erros.push(`${p.id}: fora do raio`);
    if (p.entravel && Math.min(p.largura, p.fundo) < LARGURA_PORTA + 4) erros.push(`${p.id}: entrável precisa de ao menos ${LARGURA_PORTA + 4} m de lado`);
  }
  const ps = [...c.predios].sort((a, b) => a.x - b.x);
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length && ps[j].x - ps[i].x < 200; j++) {
      const [a, b] = [ps[i], ps[j]];
      if (Math.abs(a.x - b.x) < (a.largura + b.largura) / 2 + 1 && Math.abs(a.z - b.z) < (a.fundo + b.fundo) / 2 + 1) erros.push(`prédios colados ou sobrepostos: ${a.id} e ${b.id}`);
    }
  }
  for (const a of c.areas) if (a.pts.length < 3) erros.push(`área ${a.tipo} com menos de 3 pontos`);
  const l = [...CITIES, ...REGION_PLACES].find((v) => v.id === id);
  const arqDem = path.join(raiz, `public/mapa/relevo/${id}.bin`);
  const zona = new Zona(c, gerarRelevo(c, l.x, l.y, existsSync(arqDem) ? lerBin(readFileSync(arqDem)) : null));
  if (!zona.pontoLivre(c.chegada.x, c.chegada.z)) erros.push("chegada bloqueada");
  const portas = c.predios.filter((p) => p.entravel);
  for (const p of portas) {
    const d = portaDe(p);
    const f = p.porta ?? "s";
    const fora = { x: d.x + (f === "l" ? 3 : f === "o" ? -3 : 0), z: d.z + (f === "s" ? 3 : f === "n" ? -3 : 0) };
    if (!zona.pontoLivre(fora.x, fora.z)) erros.push(`${p.id}: porta dá em obstáculo`);
  }
  for (const p of portas.slice(0, MAX_ROTA_TESTADA)) {
    if (!zona.calcularRota(c.chegada, { x: p.x, z: p.z })) erros.push(`${p.id}: sem caminho a partir da chegada`);
  }
  if (erros.length > 30) erros.splice(30, erros.length, "…");
  falhas += erros.length;
  console.log(`${erros.length ? "FALHOU" : "OK"} ${id}: ${c.predios.length} prédios, ${portas.length} entráveis, ${c.ruas.length} ruas, ${c.areas.length} áreas, raio ${c.raio} m`);
  for (const e of erros) console.log(`  - ${e}`);
}
process.exit(falhas ? 1 : 0);
