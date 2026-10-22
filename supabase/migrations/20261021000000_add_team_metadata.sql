alter table public.times
  add column if not exists metadata jsonb not null default '{}'::jsonb;
