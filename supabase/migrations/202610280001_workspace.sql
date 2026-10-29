create table if not exists public.tick_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.tick_admins enable row level security;
revoke all on public.tick_admins from anon, authenticated;
grant select on public.tick_admins to authenticated;
create policy "Only see own admin membership" on public.tick_admins
  for select to authenticated using (user_id = (select auth.uid()));

create table public.tick_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  position integer not null default 0 check(position >= 0),
  unique (id, user_id)
);
create table public.tick_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('movie','series','book','comic','task')),
  title text not null check (char_length(title) between 1 and 240),
  subtitle text not null default '' check (char_length(subtitle) <= 500),
  year text not null default '' check (char_length(year) <= 20),
  cover_url text,
  source text check (source in ('tmdb','openlibrary','comicvine')),
  external_id text,
  position integer not null default 0 check(position >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  list_id uuid,
  foreign key (list_id, user_id) references public.tick_lists (id, user_id) on delete set null (list_id)
);
create table public.tick_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Sin título' check (char_length(title) between 1 and 120),
  content text not null default '' check (char_length(content) <= 250000),
  position integer not null default 0,
  updated_at timestamptz not null default now()
);
create index tick_items_owner on public.tick_items(user_id, position);
create index tick_notes_owner on public.tick_notes(user_id, position);
create index tick_lists_owner on public.tick_lists(user_id);
create unique index tick_unique_external on public.tick_items(user_id, kind, source, external_id)
  where external_id is not null and source is not null;

alter table public.tick_lists enable row level security;
alter table public.tick_items enable row level security;
alter table public.tick_notes enable row level security;
revoke all on public.tick_lists, public.tick_items, public.tick_notes from anon;
grant select, insert, update, delete on public.tick_lists, public.tick_items, public.tick_notes to authenticated;
create policy "Private admin lists" on public.tick_lists for all to authenticated
  using (user_id = (select auth.uid()) and exists(select 1 from public.tick_admins where user_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists(select 1 from public.tick_admins where user_id = (select auth.uid())));
create policy "Private admin items" on public.tick_items for all to authenticated
  using (user_id = (select auth.uid()) and exists(select 1 from public.tick_admins where user_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists(select 1 from public.tick_admins where user_id = (select auth.uid())));
create policy "Private admin notes" on public.tick_notes for all to authenticated
  using (user_id = (select auth.uid()) and exists(select 1 from public.tick_admins where user_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists(select 1 from public.tick_admins where user_id = (select auth.uid())));

create function public.tick_note_timestamp() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger tick_note_updated before update on public.tick_notes for each row execute function public.tick_note_timestamp();

create function public.tick_reorder(ordered_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if cardinality(ordered_ids) > 2000 then raise exception 'Too many items'; end if;
  update public.tick_items as item set position = ordering.position - 1
    from unnest(ordered_ids) with ordinality as ordering(id, position)
    where item.id = ordering.id and item.user_id = (select auth.uid());
end;
$$;
revoke all on function public.tick_reorder(uuid[]) from public, anon;
grant execute on function public.tick_reorder(uuid[]) to authenticated;
