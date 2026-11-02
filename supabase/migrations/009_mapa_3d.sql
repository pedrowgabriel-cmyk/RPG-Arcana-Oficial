-- =============================================================
-- 009 — Mapa 3D: posição e energia dos personagens, bloqueios do Juiz
-- RODAR MANUALMENTE NO SUPABASE SQL EDITOR (mesmo procedimento da 005/007/008)
-- =============================================================
--
-- Tabelas próprias em vez de characters.stats/sessions.settings: o mapa grava
-- com frequência e não pode disputar gravação com Dor, Sina ou iniciativa.
-- O movimento ao vivo passa por Realtime Broadcast; aqui fica só o último estado.

create table if not exists mapa_posicoes (
  character_id uuid primary key references characters(id) on delete cascade,
  session_id   uuid not null references sessions(id) on delete cascade,
  nome         text not null default '', -- jogadores não leem a ficha dos outros
  x            real not null default 0,
  z            real not null default 0,
  energia      real not null default 100 check (energia >= 0 and energia <= 100),
  updated_at   timestamptz not null default now()
);

create index if not exists mapa_posicoes_session_idx on mapa_posicoes (session_id);

create table if not exists mapa_estado (
  session_id uuid primary key references sessions(id) on delete cascade,
  bloqueios  jsonb not null default '{"entrada":[],"vista":[]}',
  updated_at timestamptz not null default now()
);

alter table mapa_posicoes enable row level security;
alter table mapa_estado   enable row level security;

create policy mapa_posicoes_select on mapa_posicoes
  for select using (
    public.is_session_member(session_id, auth.uid())
    or public.is_session_gm(session_id, auth.uid())
  );

create policy mapa_posicoes_gm_all on mapa_posicoes
  for all
  using (public.is_session_gm(session_id, auth.uid()))
  with check (public.is_session_gm(session_id, auth.uid()));

create policy mapa_posicoes_dono on mapa_posicoes
  for all
  using (exists (select 1 from characters c where c.id = character_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from characters c where c.id = character_id and c.owner_id = auth.uid()));

create policy mapa_estado_select on mapa_estado
  for select using (
    public.is_session_member(session_id, auth.uid())
    or public.is_session_gm(session_id, auth.uid())
  );

create policy mapa_estado_gm_all on mapa_estado
  for all
  using (public.is_session_gm(session_id, auth.uid()))
  with check (public.is_session_gm(session_id, auth.uid()));
