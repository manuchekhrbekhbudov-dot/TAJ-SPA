-- TAJ SPA feedback/admin setup
-- Run the whole file in Supabase Dashboard > SQL Editor.
-- Then invite the admin in Authentication > Users and add their UUID
-- to public.spa_admins (instructions are in README.md).

create extension if not exists pgcrypto;

create table if not exists public.spa_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'TAJ SPA Admin',
  created_at timestamptz not null default now()
);

create table if not exists public.spa_feedback (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('review', 'complaint', 'suggestion', 'question', 'thanks')),
  name text,
  contact text,
  rating smallint check (rating is null or rating between 1 and 5),
  message text not null check (char_length(trim(message)) between 5 and 1500),
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now(),
  constraint spa_feedback_name_length check (name is null or char_length(name) <= 80),
  constraint spa_feedback_contact_length check (contact is null or char_length(contact) <= 120)
);

alter table public.spa_admins enable row level security;
alter table public.spa_feedback enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on table public.spa_feedback to anon, authenticated;
grant select on table public.spa_feedback to authenticated;
grant update (status) on table public.spa_feedback to authenticated;
grant delete on table public.spa_feedback to authenticated;
grant select on table public.spa_admins to authenticated;

drop policy if exists "spa_admins can read own row" on public.spa_admins;
create policy "spa_admins can read own row"
  on public.spa_admins
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "public can submit feedback" on public.spa_feedback;
create policy "public can submit feedback"
  on public.spa_feedback
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and char_length(trim(message)) between 5 and 1500
    and (name is null or char_length(name) <= 80)
    and (contact is null or char_length(contact) <= 120)
  );

drop policy if exists "admins can read feedback" on public.spa_feedback;
create policy "admins can read feedback"
  on public.spa_feedback
  for select
  to authenticated
  using (
    exists (
      select 1 from public.spa_admins
      where spa_admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "admins can update feedback status" on public.spa_feedback;
create policy "admins can update feedback status"
  on public.spa_feedback
  for update
  to authenticated
  using (
    exists (
      select 1 from public.spa_admins
      where spa_admins.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.spa_admins
      where spa_admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "admins can delete feedback" on public.spa_feedback;
create policy "admins can delete feedback"
  on public.spa_feedback
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.spa_admins
      where spa_admins.user_id = (select auth.uid())
    )
  );

-- Important: never add a public INSERT policy to spa_admins.
-- That would allow visitors to grant themselves admin access.
