alter table public.tick_lists add column if not exists icon text not null default 'list'
  check (icon in ('list','inbox','home','work','code','heart','film','book','game','shopping','calendar','target','idea','music','travel','star','fitness','study','coffee','folder'));

create table if not exists public.tick_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  avatar_data text check (avatar_data is null or (length(avatar_data) <= 150000 and avatar_data ~ '^data:image/(webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$'))
);
alter table public.tick_profiles enable row level security;
revoke all on public.tick_profiles from anon;
grant select, insert, update, delete on public.tick_profiles to authenticated;
create policy "Own admin profile" on public.tick_profiles for all to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.tick_admins where user_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.tick_admins where user_id = (select auth.uid())));
notify pgrst, 'reload schema';
