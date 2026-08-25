-- The database, with the same shape the app has always had: one row per
-- entity, the entity itself as JSON.
--
-- One table and not five, for the same reason SQLite has five identical ones
-- and nobody queries them: nothing filters in SQL. The whole base is read once
-- and every screen selects from memory. Five tables would be twenty policies
-- to keep in step and a DDL migration for every new kind of entity; here a new
-- kind is one word in a check constraint.
--
-- Referential integrity stays in src/logic/cascade.ts, not in foreign keys:
-- the phone applies the same rules with no network, so the rule has to live
-- somewhere both can reach.

create table public.records (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (
    kind in ('ramos', 'evaluaciones', 'compromisos', 'tareas', 'bloques')
  ),
  id text not null,
  -- Exactly what src/model/types.ts describes, and nothing else: no user_id
  -- inside, so an exported JSON is interchangeable with the SQLite one.
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

create index records_user_kind_idx on public.records (user_id, kind);
-- The sync pull asks "what changed since?", which is this index.
create index records_user_updated_idx on public.records (user_id, updated_at);

-- Tombstones. Without them a device that was offline cannot tell a record that
-- was deleted elsewhere from one it has not pulled yet, and deletions would
-- come back from the dead on the next sync.
create table public.deletions (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  id text not null,
  deleted_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

create index deletions_user_at_idx on public.deletions (user_id, deleted_at);

-- updated_at is the clock the sync trusts, so the server sets it. A client
-- with a wrong clock — or a malicious one — cannot make its write look newer.
create function public.touch_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger records_touch_updated_at
  before update on public.records
  for each row execute function public.touch_updated_at();

alter table public.records enable row level security;
alter table public.deletions enable row level security;

create policy "records are private" on public.records
  for select using (auth.uid() = user_id);
create policy "insert only your own records" on public.records
  for insert with check (auth.uid() = user_id);
create policy "update only your own records" on public.records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete only your own records" on public.records
  for delete using (auth.uid() = user_id);

create policy "deletions are private" on public.deletions
  for select using (auth.uid() = user_id);
create policy "insert only your own deletions" on public.deletions
  for insert with check (auth.uid() = user_id);
create policy "delete only your own deletions" on public.deletions
  for delete using (auth.uid() = user_id);
