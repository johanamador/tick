begin;

alter table public.tick_items
  add column if not exists tags text[] not null default '{}';

alter table public.tick_items drop constraint if exists tick_items_kind_check;
alter table public.tick_items add constraint tick_items_kind_check
  check (kind in ('movie','series','book','comic','game','task'));

alter table public.tick_items drop constraint if exists tick_items_source_check;
alter table public.tick_items add constraint tick_items_source_check
  check (source in ('tmdb','openlibrary','comicvine','steam'));

create or replace function public.tick_valid_tags(values_to_check text[])
returns boolean language sql immutable set search_path = '' as $$
  select cardinality(values_to_check) <= 8
    and not exists (select 1 from unnest(values_to_check) as tag where tag is null or char_length(btrim(tag)) not between 1 and 32)
    and (select count(*) = count(distinct lower(tag)) from unnest(values_to_check) as tag);
$$;

alter table public.tick_items drop constraint if exists tick_items_tags_check;
alter table public.tick_items add constraint tick_items_tags_check
  check (public.tick_valid_tags(tags));

notify pgrst, 'reload schema';
commit;
