-- Append-only record of each user's acceptance of the privacy notice version.
begin;

create table if not exists public.account_consents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    consent_code text not null check (consent_code in ('privacy_policy')),
    policy_version text not null check (policy_version ~ '^[A-Z0-9._-]{3,40}$'),
    accepted_at timestamptz not null default now(),
    constraint account_consents_once unique (user_id, consent_code, policy_version)
);

alter table public.account_consents enable row level security;

drop policy if exists account_consents_select_self on public.account_consents;
create policy account_consents_select_self on public.account_consents
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists account_consents_insert_self on public.account_consents;
create policy account_consents_insert_self on public.account_consents
for insert to authenticated
with check (user_id = (select auth.uid()));

revoke all on public.account_consents from public, anon, authenticated;
grant select on public.account_consents to authenticated;
grant insert (user_id, consent_code, policy_version)
    on public.account_consents to authenticated;

commit;
