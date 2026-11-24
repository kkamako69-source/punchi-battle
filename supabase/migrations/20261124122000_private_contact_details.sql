-- Store optional secondary contacts privately. Primary email/phone authentication
-- remains in Supabase Auth; this table is never readable by anonymous users.
begin;

create table if not exists public.profile_contacts (
    user_id uuid primary key references auth.users(id) on delete cascade,
    backup_email text,
    phone_e164 text,
    country_iso2 text not null default 'CG',
    contact_consent_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint profile_contacts_email_format check (
        backup_email is null
        or (
            char_length(backup_email) <= 254
            and backup_email = lower(backup_email)
            and backup_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        )
    ),
    constraint profile_contacts_phone_e164 check (
        phone_e164 is null
        or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
    ),
    constraint profile_contacts_country_iso2 check (country_iso2 ~ '^[A-Z]{2}$'),
    constraint profile_contacts_consent_required check (
        (backup_email is null and phone_e164 is null)
        or contact_consent_at is not null
    )
);

alter table public.profile_contacts enable row level security;

drop policy if exists profile_contacts_select_self on public.profile_contacts;
create policy profile_contacts_select_self on public.profile_contacts
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists profile_contacts_insert_self on public.profile_contacts;
create policy profile_contacts_insert_self on public.profile_contacts
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists profile_contacts_update_self on public.profile_contacts;
create policy profile_contacts_update_self on public.profile_contacts
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists profile_contacts_delete_self on public.profile_contacts;
create policy profile_contacts_delete_self on public.profile_contacts
for delete to authenticated
using (user_id = (select auth.uid()));

create or replace function public.stamp_profile_contact_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        new.created_at := statement_timestamp();
        new.updated_at := statement_timestamp();
        if new.backup_email is not null or new.phone_e164 is not null then
            new.contact_consent_at := statement_timestamp();
        else
            new.contact_consent_at := null;
        end if;
        return new;
    end if;

    new.updated_at := statement_timestamp();
    if new.backup_email is distinct from old.backup_email
       or new.phone_e164 is distinct from old.phone_e164 then
        if new.backup_email is not null or new.phone_e164 is not null then
            new.contact_consent_at := statement_timestamp();
        else
            new.contact_consent_at := null;
        end if;
    else
        new.contact_consent_at := old.contact_consent_at;
    end if;

    return new;
end;
$$;

revoke all on function public.stamp_profile_contact_change() from public, anon, authenticated;

drop trigger if exists profile_contacts_stamp_change on public.profile_contacts;
create trigger profile_contacts_stamp_change
before insert or update on public.profile_contacts
for each row execute function public.stamp_profile_contact_change();

revoke all on public.profile_contacts from public, anon, authenticated;
grant select, delete on public.profile_contacts to authenticated;
grant insert (user_id, backup_email, phone_e164, country_iso2)
    on public.profile_contacts to authenticated;
grant update (backup_email, phone_e164, country_iso2)
    on public.profile_contacts to authenticated;

commit;
