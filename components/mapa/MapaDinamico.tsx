"use client";

import dynamic from "next/dynamic";

// O Three.js pesa: só baixa quando alguém abre o mapa.
export const MapaDinamico = dynamic(
  async () => {
    const [{ MapaAoVivo }, { carregarContinente }, { carregarTodas }] = await Promise.all([
      import("./MapaAoVivo"),
      import("@/lib/mapa/relevo"),
      import("@/lib/mapa/lugares"),
    ]);
    await Promise.all([carregarContinente(), carregarTodas()]);
    return MapaAoVivo;
  },
  { ssr: false },
);
