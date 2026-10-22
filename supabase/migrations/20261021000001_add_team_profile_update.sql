create or replace function public.update_team_profile(
  p_old_name text,
  p_new_name text,
  p_metadata jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if nullif(trim(p_new_name), '') is null then
    raise exception 'O nome do clube é obrigatório.';
  end if;

  if p_old_name is distinct from p_new_name and exists (
    select 1 from public.times where nome = p_new_name
  ) then
    raise exception 'Já existe um clube com esse nome.';
  end if;

  update public.times
  set nome = p_new_name,
      metadata = coalesce(p_metadata, '{}'::jsonb)
  where nome = p_old_name;

  if not found then
    raise exception 'Clube não encontrado.';
  end if;

  update public.jogadores
  set time_nome = p_new_name
  where time_nome = p_old_name;

  update public.partidas
  set dados = jsonb_set(
    dados,
    '{_meta,equipes}',
    (
      select jsonb_agg(
        case when team.value = to_jsonb(p_old_name) then to_jsonb(p_new_name) else team.value end
      )
      from jsonb_array_elements(dados #> '{_meta,equipes}') as team(value)
    ),
    true
  )
  where jsonb_typeof(dados #> '{_meta,equipes}') = 'array'
    and exists (
      select 1
      from jsonb_array_elements_text(dados #> '{_meta,equipes}') as team_name(value)
      where team_name.value = p_old_name
    );
end;
$$;

grant execute on function public.update_team_profile(text, text, jsonb) to authenticated;
