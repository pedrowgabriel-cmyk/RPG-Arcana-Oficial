"use client";

// Bancada de estilos de construção: os tipos de prédio lado a lado, uma rua inteira,
// ou a versão de longe. Uso de desenvolvimento (scripts/foto-modelo.mjs --estilo).

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { TipoPredio } from "@/lib/mapa/tipos";
import { triangulos } from "../natureza/ferramentas";
import { materialDe } from "../natureza/materiais";
import { carregarEstiloPorId } from "./estilos";
import { TETO_PREDIO, type NivelPredio, type PredioLocal } from "./tipos";

export type ModoDaBancada = "grade" | "rua" | "longe" | "perto" | "entravel";

/** Tamanhos típicos das plantas das cidades. */
export const AMOSTRAS: { tipo: TipoPredio; largura: number; fundo: number; altura: number; nome: string }[] = [
  { tipo: "casa", largura: 9, fundo: 8, altura: 4.2, nome: "Casa" },
  { tipo: "casa", largura: 11, fundo: 9, altura: 7.6, nome: "Sobrado" },
  { tipo: "comercio", largura: 10, fundo: 12, altura: 5, nome: "Armazém" },
  { tipo: "saloon", largura: 12, fundo: 16, altura: 5.5, nome: "Saloon" },
  { tipo: "hotel", largura: 14, fundo: 12, altura: 9, nome: "Hotel" },
  { tipo: "igreja", largura: 14, fundo: 26, altura: 9, nome: "Igreja" },
  { tipo: "publico", largura: 16, fundo: 12, altura: 8, nome: "Câmara" },
  { tipo: "banco", largura: 12, fundo: 12, altura: 7, nome: "Banco" },
  { tipo: "estacao", largura: 22, fundo: 10, altura: 5, nome: "Estação" },
  { tipo: "galpao", largura: 14, fundo: 20, altura: 6, nome: "Galpão" },
  { tipo: "fazenda", largura: 20, fundo: 12, altura: 5, nome: "Fazenda" },
  { tipo: "moinho", largura: 8, fundo: 8, altura: 12, nome: "Moinho" },
  { tipo: "fabrica", largura: 18, fundo: 24, altura: 8, nome: "Fábrica" },
  { tipo: "torre", largura: 5, fundo: 5, altura: 9, nome: "Torre" },
  { tipo: "tenda", largura: 6, fundo: 8, altura: 3, nome: "Tenda" },
  { tipo: "ruina", largura: 10, fundo: 9, altura: 5, nome: "Ruína" },
];

export function VisualizadorConstrucao({ estilo, lugar, modo }: { estilo: string; lugar: string; modo: ModoDaBancada }) {
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
    cena.fog = new THREE.Fog("#c9b99b", 220, 520);
    cena.add(new THREE.HemisphereLight("#eef4ff", "#5a4a34", 1.15));
    const sol = new THREE.DirectionalLight("#ffe2b8", 3.2);
    sol.position.set(-60, 70, 50);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, far: 300 });
    cena.add(sol);
    const chao = new THREE.Mesh(new THREE.CircleGeometry(600, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: "#7b7349" }));
    chao.receiveShadow = true;
    cena.add(chao);
    const camera = new THREE.PerspectiveCamera(35, canvas.current.clientWidth / canvas.current.clientHeight, 0.5, 2000);
    let vivo = true;

    void (async () => {
      const e = await carregarEstiloPorId(estilo);
      const textos = [`${e.nome} · lugar ${lugar} · modo ${modo}`];
      const por = (a: (typeof AMOSTRAS)[number], x: number, z: number, nivel: NivelPredio, entravel: boolean, giro = 0, n = 0) => {
        const p: PredioLocal = { id: `${a.nome}-${n}`, nome: a.nome, tipo: a.tipo, largura: a.largura, fundo: a.fundo, altura: a.altura, entravel, lugar };
        const pecas = e.gerar(p, nivel, 1000 + n * 31);
        const g = new THREE.Group();
        for (const peca of [...pecas.corpo, ...pecas.telhado, ...(modo === "entravel" ? pecas.interior : [])]) {
          const m = new THREE.Mesh(peca.geometria, materialDe(peca.material));
          m.castShadow = m.receiveShadow = true;
          g.add(m);
        }
        g.position.set(x, 0, z);
        g.rotation.y = giro;
        cena.add(g);
        return triangulos([...pecas.corpo, ...pecas.telhado]);
      };
      if (modo === "grade" || modo === "longe" || modo === "entravel") {
        const nivel: NivelPredio = modo === "longe" ? 1 : 0;
        AMOSTRAS.forEach((a, i) => {
          const t = por(a, ((i % 4) - 1.5) * 34, (Math.floor(i / 4) - 1.5) * 36, nivel, modo === "entravel", 0, i);
          const alerta = t > TETO_PREDIO[nivel] ? `  ACIMA DO TETO (${TETO_PREDIO[nivel]})` : "";
          textos.push(`${a.nome} (${a.tipo}): ${Math.round(t)} triângulos${alerta}`);
        });
        camera.position.set(95, 120, 175);
        camera.lookAt(0, 0, 8);
      } else if (modo === "rua") {
        // Rua de terra com casas, sobrados e comércio dos dois lados, fachadas para o meio.
        const tipos = [0, 0, 1, 2, 0, 3, 0, 1, 0, 2, 4, 0];
        let x = -60;
        tipos.forEach((k, i) => {
          const a = { ...AMOSTRAS[k], largura: AMOSTRAS[k].largura - 1 + (i % 3) };
          por(a, x + a.largura / 2, -12 - a.fundo / 2, 0, false, 0, i);
          por(a, x + a.largura / 2, 12 + a.fundo / 2, 0, false, Math.PI, i + 50);
          x += a.largura + 1.5;
        });
        const rua = new THREE.Mesh(new THREE.PlaneGeometry(160, 16).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: "#a98c5e" }));
        rua.position.y = 0.02;
        cena.add(rua);
        camera.position.set(-20, 26, 46);
        camera.lookAt(10, 3, 0);
      } else {
        textos.push(`Sobrado: ${Math.round(por(AMOSTRAS[1], 0, 0, 0, false))} triângulos`);
        camera.position.set(14, 9, 22);
        camera.lookAt(0, 4, 0);
      }
      if (!vivo) return;
      setInfo(textos);
      renderer.render(cena, camera);
      requestAnimationFrame(() => {
        renderer.render(cena, camera);
        (window as unknown as { __pronto: boolean }).__pronto = true;
      });
    })().catch((err: Error) => {
      setInfo([`ERRO: ${err.message}`]);
      (window as unknown as { __pronto: boolean }).__pronto = true;
    });

    return () => {
      vivo = false;
      renderer.dispose();
    };
  }, [estilo, lugar, modo]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <canvas ref={canvas} style={{ width: "100%", height: "100%", display: "block" }} />
      <pre id="info" style={{ position: "absolute", left: 8, top: 8, margin: 0, color: "#fff", font: "12px monospace", textShadow: "0 0 3px #000" }}>
        {info.join("\n")}
      </pre>
    </div>
  );
}
