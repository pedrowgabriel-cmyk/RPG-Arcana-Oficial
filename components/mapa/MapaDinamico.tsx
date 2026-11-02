"use client";

import dynamic from "next/dynamic";

// O Three.js pesa: só baixa quando alguém abre o mapa.
export const MapaDinamico = dynamic(() => import("./MapaAoVivo").then((m) => m.MapaAoVivo), { ssr: false });
