// Pinta as texturas do continente uma vez e grava em public/mapa/texturas.
//   node scripts/assar-texturas.mjs     (servidor de desenvolvimento em localhost:${PORTA:-3460})
// Rode de novo quando mudar cidade, relevo ou pintura, e suba VERSAO_TEXTURAS em continente3d.ts.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = `http://localhost:${process.env.PORTA ?? 3460}/mapa-demo?assar=1`;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const NOMES = ["continente", "alem-perto", "alem-longe"];

async function assar(sufixo, largura) {
  const perfil = mkdtempSync(path.join(tmpdir(), "arcana-assar-"));
  const porta = 9800 + Math.floor(Math.random() * 100);
  const chrome = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ["--headless=new", `--remote-debugging-port=${porta}`, "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--user-data-dir=${perfil}`, `--window-size=${largura},800`, "about:blank"],
    { stdio: "ignore" },
  );
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
    };
    const cmd = (method, params = {}) => new Promise((r) => {
      const i = ++n;
      pend.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
    const ev = async (e) => (await cmd("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
    await cmd("Runtime.enable");
    await cmd("Page.enable");
    await cmd("Page.navigate", { url });
    // A pintura leva de 30 s a alguns minutos em Chrome sem placa de vídeo.
    for (let i = 0; i < 900; i++) {
      await espera(1000);
      const pronto = await Promise.race([ev(`!!window.__texturas && ${JSON.stringify(NOMES)}.every((n) => window.__texturas.has(n))`), espera(20_000).then(() => false)]);
      if (pronto) break;
      if (i === 899) throw new Error("A pintura não terminou em 15 minutos.");
    }
    for (const nome of NOMES) {
      const dados = await ev(`window.__texturas.get(${JSON.stringify(nome)}).toDataURL("image/webp", 0.9)`);
      const arquivo = path.join(raiz, `public/mapa/texturas/${nome}${sufixo}.webp`);
      writeFileSync(arquivo, Buffer.from(dados.split(",")[1], "base64"));
      console.log(`${arquivo}: ${Math.round((dados.length * 0.75) / 1024)} KB`);
    }
  } finally {
    chrome.kill("SIGKILL");
    await espera(300);
    rmSync(perfil, { recursive: true, force: true });
  }
}

await assar("", 1280);
await assar("-celular", 900);
