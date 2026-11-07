alter table public.competicoes
  add column if not exists categoria text,
  add column if not exists pais text;
