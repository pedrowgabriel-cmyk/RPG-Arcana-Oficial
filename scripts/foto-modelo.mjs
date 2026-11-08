// Fotografa um modelo da natureza na bancada (app/natureza-demo).
//   node scripts/foto-modelo.mjs <id> [--modo grade|cena|perto]
//   node scripts/foto-modelo.mjs <estilo> --estilo [--lugar <id>] [--modo grade|rua|longe|perto|entravel] [--neve 0.8] [--seca] [--queimada] [--saida arquivo.png]
// Precisa do servidor de desenvolvimento em http://localhost:${PORTA:-3460}.
// Uma foto por vez no computador inteiro (trava em arquivo): vários agentes podem chamar.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const id = args[0];
const op = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : null);
const modo = op("modo") ?? "grade";
const saida = path.resolve(op("saida") ?? `foto-${id}-${modo}.png`);
// --estilo: o id é um estilo de construção (bancada de prédios); --lugar escolhe a cidade.
const q = args.includes("--estilo") ? new URLSearchParams({ estilo: id, modo, lugar: op("lugar") ?? "tupaciguara" }) : new URLSearchParams({ modelo: id, modo });
if (op("neve")) q.set("neve", op("neve"));
if (args.includes("--seca")) q.set("seca", "1");
if (args.includes("--queimada")) q.set("queimada", "1");
const url = `http://localhost:${process.env.PORTA ?? 3460}/natureza-demo?${q}`;

const trava = path.join(tmpdir(), "arcana-foto.trava");
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; ; i++) {
  try {
    mkdirSync(trava);
    break;
  } catch {
    // Trava velha de quem morreu no meio: libera depois de 3 minutos.
    if (Date.now() - statSync(trava).mtimeMs > 180_000) rmSync(trava, { recursive: true, force: true });
    if (i > 600) throw new Error("Esperei 10 minutos pela vez da foto.");
    await espera(1000);
  }
}

const perfil = mkdtempSync(path.join(tmpdir(), "arcana-foto-"));
const porta = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", `--remote-debugging-port=${porta}`, "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--user-data-dir=${perfil}`, "--window-size=1280,800", "about:blank"],
  { stdio: "ignore" },
);
const fim = (codigo) => {
  chrome.kill("SIGKILL");
  rmSync(trava, { recursive: true, force: true });
  setTimeout(() => {
    rmSync(perfil, { recursive: true, force: true });
    process.exit(codigo);
  }, 300);
};
setTimeout(() => {
  console.error("Tempo esgotado (120 s).");
  fim(2);
}, 120_000);

try {
  let alvo;
  for (let i = 0; i < 60 && !alvo; i++) {
    try {
      alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: "PUT" })).json();
    } catch {
      await espera(500);
    }
  }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let n = 0;
  const pend = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) {
      pend.get(d.id)(d.result ?? d.error);
      pend.delete(d.id);
    }
    if (d.method === "Runtime.exceptionThrown") console.error("Erro na página:", d.params.exceptionDetails.exception?.description?.slice(0, 400));
  };
  const cmd = (method, params = {}) => new Promise((r) => {
    const i = ++n;
    pend.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async (e) => (await cmd("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
  await cmd("Runtime.enable");
  await cmd("Page.enable");
  // Navega depois de abrir: pela URL do /json/new, tudo depois do primeiro & se perde.
  await cmd("Page.navigate", { url });
  await espera(1500);
  for (let i = 0; i < 180 && !(await ev("window.__pronto === true")); i++) await espera(500);
  console.log(await ev("location.search"));
  console.log(await ev("document.getElementById('info')?.textContent"));
  const foto = await cmd("Page.captureScreenshot", { format: "png" });
  writeFileSync(saida, Buffer.from(foto.data, "base64"));
  console.log(`Foto: ${saida}`);
  fim(0);
} catch (e) {
  console.error(e);
  fim(1);
}
