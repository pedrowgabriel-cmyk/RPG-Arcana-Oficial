"use client";

import dynamic from "next/dynamic";

// O Three.js pesa: só baixa quando alguém abre o mapa.
export const MapaDinamico = dynamic(
  async () => {
    const [{ MapaAoVivo }, { carregarContinente }] = await Promise.all([import("./MapaAoVivo"), import("@/lib/mapa/relevo")]);
    await carregarContinente();
    return MapaAoVivo;
  },
  { ssr: false },
);
