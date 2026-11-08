"use client";

// Bancada de modelos da natureza: grade de variações x níveis, ou uma cena com
// vários juntos. Uso de desenvolvimento (scripts/foto-modelo.mjs fotografa daqui).

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { carregarModelo } from "./catalogo";
import { triangulos } from "./ferramentas";
import { materialDe, uTempo } from "./materiais";
import { TETO_DE_TRIANGULOS, type Estado, type Nivel } from "./tipos";

export type ModoDoVisualizador = "grade" | "cena" | "perto";

export function Visualizador({ id, estado, modo }: { id: string; estado: Estado; modo: ModoDoVisualizador }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [info, setInfo] = useState<string[]>([]);

  useEffect(() => {
    if (!canvas.current) return;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: true });
    renderer.setPixelRatio(1);
    renderer.setSize(canvas.current.clientWidth, canvas.current.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const cena = new THREE.Scene();
    cena.background = new THREE.Color("#c9b99b");
    cena.fog = new THREE.Fog("#c9b99b", 80, 260);
    // Mesma luz do mapa (cena3d): é assim que o modelo vai aparecer no jogo.
    cena.add(new THREE.HemisphereLight("#eef4ff", "#5a4a34", 1.15));
    const sol = new THREE.DirectionalLight("#ffe2b8", 3.2);
    sol.position.set(-40, 32, 28);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 200 });
    cena.add(sol);
    const chao = new THREE.Mesh(new THREE.CircleGeometry(300, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: "#7b7349" }));
    chao.receiveShadow = true;
    cena.add(chao);
    const camera = new THREE.PerspectiveCamera(35, canvas.current.clientWidth / canvas.current.clientHeight, 0.1, 1000);
    let vivo = true;

    void (async () => {
      const modelo = await carregarModelo(id);
      const textos: string[] = [`${modelo.nome} · ${modelo.variacoes} variações · estados: ${modelo.estados.join(", ") || "nenhum"}`];
      const alto = modelo.altura[1];
      const por = (variacao: number, nivel: Nivel, x: number, z: number, giro = 0, escala = 1) => {
        const lista = modelo.gerar(variacao, nivel, estado);
        const g = new THREE.Group();
        for (const p of lista) {
          const m = new THREE.Mesh(p.geometria, materialDe(p.material));
          m.castShadow = m.receiveShadow = true;
          g.add(m);
        }
        g.position.set(x, 0, z);
        g.rotation.y = giro;
        g.scale.setScalar(escala);
        cena.add(g);
        return triangulos(lista);
      };
      const espaco = Math.max(modelo.raio * 2.6, alto * 0.9, 2);
      if (modo === "grade") {
        const linhas = Math.min(4, modelo.variacoes);
        for (let v = 0; v < linhas; v++) {
          for (const nivel of [0, 1, 2] as Nivel[]) {
            const t = por(v, nivel, (nivel - 1) * espaco, (v - (linhas - 1) / 2) * espaco);
            const alerta = t > TETO_DE_TRIANGULOS[nivel] ? `  ACIMA DO TETO (${TETO_DE_TRIANGULOS[nivel]})` : "";
            textos.push(`variação ${v} · nível ${nivel}: ${Math.round(t)} triângulos${alerta}`);
          }
        }
        const lado = Math.max(espaco * 3, linhas * espaco);
        camera.position.set(lado * 0.95, alto * 0.9 + lado * 0.45, lado * 1.15);
        camera.lookAt(0, alto * 0.4, 0);
      } else if (modo === "perto") {
        textos.push(`nível 0: ${Math.round(por(0, 0, 0, 0))} triângulos`);
        camera.position.set(alto * 0.9 + 2, alto * 0.65 + 0.5, alto * 1.25 + 2);
        camera.lookAt(0, alto * 0.45, 0);
      } else {
        // Cena: um conjunto natural, com variações e tamanhos misturados.
        let a = 7;
        const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
        const area = espaco * 4;
        let total = 0;
        for (let i = 0; i < 26; i++) {
          total += por(i % modelo.variacoes, 0, (r() - 0.5) * area, (r() - 0.5) * area, r() * Math.PI * 2, 0.8 + r() * 0.4);
        }
        textos.push(`26 exemplares, ${Math.round(total)} triângulos`);
        camera.position.set(area * 0.9, alto + area * 0.35, area * 1.05);
        camera.lookAt(0, alto * 0.3, 0);
      }
      if (!vivo) return;
      setInfo(textos);
      renderer.render(cena, camera);
      requestAnimationFrame(() => {
        uTempo.value = 1;
        renderer.render(cena, camera);
        (window as unknown as { __pronto: boolean }).__pronto = true;
      });
    })().catch((e: Error) => {
      setInfo([`ERRO: ${e.message}`]);
      (window as unknown as { __pronto: boolean }).__pronto = true;
    });

    return () => {
      vivo = false;
      renderer.dispose();
    };
  }, [id, estado, modo]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <canvas ref={canvas} style={{ width: "100%", height: "100%", display: "block" }} />
      <pre id="info" style={{ position: "absolute", left: 8, top: 8, margin: 0, color: "#fff", font: "12px monospace", textShadow: "0 0 3px #000" }}>
        {info.join("\n")}
      </pre>
    </div>
  );
}
