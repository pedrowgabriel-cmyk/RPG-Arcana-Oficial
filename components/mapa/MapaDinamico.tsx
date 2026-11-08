"use client";

import dynamic from "next/dynamic";

// O Three.js pesa: só baixa quando alguém abre o mapa.
export const MapaDinamico = dynamic(
  async () => {
    const [{ MapaAoVivo }, { carregarContinente }, { carregarTodas }, { carregarTexturasAssadas }] = await Promise.all([
      import("./MapaAoVivo"),
      import("@/lib/mapa/relevo"),
      import("@/lib/mapa/lugares"),
      import("./continente3d"),
    ]);
    await Promise.all([carregarContinente(), carregarTodas(), carregarTexturasAssadas()]);
    return MapaAoVivo;
  },
  { ssr: false },
);
