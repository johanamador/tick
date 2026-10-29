-- Existing notes stay literal plain text until the user edits them.
alter table public.tick_items
  add column if not exists priority text not null default 'normal'
  check (priority in ('low', 'normal', 'high', 'urgent'));
alter table public.tick_notes
  add column if not exists format text not null default 'plain'
  check (format in ('plain', 'markdown'));
notify pgrst, 'reload schema';
