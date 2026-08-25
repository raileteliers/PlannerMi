-- The two writes the app cannot do halfway.
--
-- Each is one function call, and a function call in Postgres is a transaction:
-- if anything raises, nothing happened. Doing these as several round-trips
-- from the client would allow a state the app has never had to handle — a
-- cascade delete that removed the ramo but not its evaluaciones.
--
-- `security invoker` (the default, spelled out here on purpose) so RLS still
-- applies inside: the auth.uid() checks below are a second lock, not the only one.

-- Import, dev seeding, and the "empty the base" button: wipe and rewrite.
create function public.replace_dataset(p_datos jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'no session';
  end if;

  delete from public.records where user_id = v_user;
  delete from public.deletions where user_id = v_user;

  -- One insert for the whole dataset: the five arrays flattened into rows.
  insert into public.records (user_id, kind, id, data)
  select v_user, coleccion.key, entidad.value ->> 'id', entidad.value
  from jsonb_each(p_datos) as coleccion
  cross join lateral jsonb_array_elements(coleccion.value) as entidad;
end;
$$;

-- A cascade delete: every entity in the plan goes, and every block that
-- pointed at one survives with its ref cleared. That time was used anyway.
create function public.apply_delete_plan(p_plan jsonb, p_bloques jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'no session';
  end if;

  perform public.delete_kind(v_user, 'ramos', p_plan -> 'ramoIds');
  perform public.delete_kind(v_user, 'evaluaciones', p_plan -> 'evaluacionIds');
  perform public.delete_kind(v_user, 'compromisos', p_plan -> 'compromisoIds');
  perform public.delete_kind(v_user, 'tareas', p_plan -> 'tareaIds');

  insert into public.records (user_id, kind, id, data)
  select v_user, 'bloques', bloque.value ->> 'id', bloque.value
  from jsonb_array_elements(coalesce(p_bloques, '[]'::jsonb)) as bloque
  on conflict (user_id, kind, id)
    do update set data = excluded.data;
end;
$$;

-- Delete a list of ids of one kind, leaving a tombstone for each.
create function public.delete_kind(p_user uuid, p_kind text, p_ids jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  delete from public.records
  where user_id = p_user
    and kind = p_kind
    and id in (select jsonb_array_elements_text(coalesce(p_ids, '[]'::jsonb)));

  insert into public.deletions (user_id, kind, id)
  select p_user, p_kind, jsonb_array_elements_text(coalesce(p_ids, '[]'::jsonb))
  on conflict (user_id, kind, id)
    do update set deleted_at = now();
end;
$$;

-- Deleting one record. A function rather than a plain delete because the
-- tombstone has to be written with it, and two round-trips could leave a row
-- gone with nothing to tell the other device about it.
create function public.delete_record(p_kind text, p_id text)
returns void
language plpgsql
security invoker
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'no session';
  end if;

  perform public.delete_kind(v_user, p_kind, to_jsonb(array[p_id]));
end;
$$;

-- The server's clock, for the sync cursor.
--
-- A device that used its own clock would either skip changes (clock ahead) or
-- drag the same ones down forever (clock behind), and phone clocks drift.
create function public.server_now() returns timestamptz
language sql
stable
as $$ select now(); $$;
