-- Punchi Battle: initial Supabase/PostgreSQL schema
-- Apply manually in the Supabase SQL Editor after creating a new project.
-- This schema does not connect the existing static demo to Supabase by itself.
-- Moderation/status changes must be performed only by a trusted server using a secret key.
begin;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text not null unique
        check (username ~ '^[a-z0-9_]{3,24}$'),
    display_name text not null default ''
        check (char_length(display_name) <= 60),
    bio text not null default ''
        check (char_length(bio) <= 280),
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.themes (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
    title text not null check (char_length(title) between 2 and 80),
    description text not null default '' check (char_length(description) <= 500),
    is_active boolean not null default false,
    opens_at timestamptz,
    closes_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.entries (
    id uuid primary key default gen_random_uuid(),
    author_id uuid not null references public.profiles(id) on delete cascade,
    theme_id uuid not null references public.themes(id) on delete restrict,
    body text not null check (char_length(body) between 10 and 280),
    status text not null default 'pending'
        check (status in ('pending', 'published', 'hidden')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.votes (
    id uuid primary key default gen_random_uuid(),
    entry_id uuid not null references public.entries(id) on delete cascade,
    voter_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint one_vote_per_user_per_entry unique (entry_id, voter_id)
);

create table if not exists public.comments (
    id uuid primary key default gen_random_uuid(),
    entry_id uuid not null references public.entries(id) on delete cascade,
    author_id uuid not null references public.profiles(id) on delete cascade,
    body text not null check (char_length(body) between 1 and 500),
    status text not null default 'pending'
        check (status in ('pending', 'published', 'hidden')),
    created_at timestamptz not null default now()
);

create index if not exists entries_theme_status_created_idx
    on public.entries (theme_id, status, created_at desc);
create index if not exists entries_author_created_idx
    on public.entries (author_id, created_at desc);
create index if not exists votes_entry_idx on public.votes (entry_id);
create index if not exists comments_entry_status_created_idx
    on public.comments (entry_id, status, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
before update on public.entries
for each row execute function public.set_updated_at();

-- Create a public profile on signup without copying email or password data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, username, display_name)
    values (
        new.id,
        'mc_' || left(replace(new.id::text, '-', ''), 12),
        coalesce(left(new.raw_user_meta_data ->> 'display_name', 60), '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.themes enable row level security;
alter table public.entries enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;

-- Public profile fields only; email and credential data are never exposed here.
drop policy if exists profiles_read_public on public.profiles;
create policy profiles_read_public on public.profiles
for select to anon, authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists themes_read_active on public.themes;
create policy themes_read_active on public.themes
for select to anon, authenticated using (is_active = true);

drop policy if exists entries_read_published_or_own on public.entries;
create policy entries_read_published_or_own on public.entries
for select to anon, authenticated
using (status = 'published' or author_id = (select auth.uid()));

drop policy if exists entries_submit_pending on public.entries;
create policy entries_submit_pending on public.entries
for insert to authenticated
with check (author_id = (select auth.uid()) and status = 'pending');

drop policy if exists entries_edit_own_pending on public.entries;
create policy entries_edit_own_pending on public.entries
for update to authenticated
using (author_id = (select auth.uid()) and status = 'pending')
with check (author_id = (select auth.uid()) and status = 'pending');

drop policy if exists entries_delete_own_pending on public.entries;
create policy entries_delete_own_pending on public.entries
for delete to authenticated
using (author_id = (select auth.uid()) and status = 'pending');

drop policy if exists votes_read_own on public.votes;
create policy votes_read_own on public.votes
for select to authenticated
using (voter_id = (select auth.uid()));

drop policy if exists votes_insert_once on public.votes;
create policy votes_insert_once on public.votes
for insert to authenticated
with check (
    voter_id = (select auth.uid())
    and exists (
        select 1 from public.entries e
        where e.id = votes.entry_id and e.status = 'published'
    )
);

drop policy if exists votes_delete_own on public.votes;
create policy votes_delete_own on public.votes
for delete to authenticated
using (voter_id = (select auth.uid()));

drop policy if exists comments_read_published_or_own on public.comments;
create policy comments_read_published_or_own on public.comments
for select to anon, authenticated
using (status = 'published' or author_id = (select auth.uid()));

drop policy if exists comments_submit_pending on public.comments;
create policy comments_submit_pending on public.comments
for insert to authenticated
with check (
    author_id = (select auth.uid())
    and status = 'pending'
    and exists (
        select 1 from public.entries e
        where e.id = comments.entry_id and e.status = 'published'
    )
);

-- Minimum client privileges. RLS policies remain the authorization boundary.
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.themes, public.entries, public.comments to anon, authenticated;
grant update (username, display_name, bio, avatar_url) on public.profiles to authenticated;
grant insert on public.entries to authenticated;
grant update (body, theme_id) on public.entries to authenticated;
grant delete on public.entries to authenticated;
grant select, insert, delete on public.votes to authenticated;
grant insert on public.comments to authenticated;

commit;
