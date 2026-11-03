-- =============================================================
-- 011 — Clima do mapa, controlado pelo Juiz
-- RODAR MANUALMENTE NO SUPABASE SQL EDITOR, depois da 010
-- =============================================================

alter table mapa_estado add column if not exists clima jsonb;
