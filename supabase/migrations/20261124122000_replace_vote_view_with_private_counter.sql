-- Replace the privileged public view with a private, narrowly-scoped counter trigger.
begin;

drop view if exists public.entry_vote_totals;

alter table public.entries
    add column if not exists vote_count bigint not null default 0;

alter table public.entries
    drop constraint if exists entries_vote_count_nonnegative;

alter table public.entries
    add constraint entries_vote_count_nonnegative check (vote_count >= 0);

-- Reconcile aggregates before enabling triggers (safe for existing rows too).
update public.entries e
set vote_count = (
    select count(*)::bigint
    from public.votes v
    where v.entry_id = e.id
);

-- Keep privileged helper code outside every API-exposed schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.sync_entry_vote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        if auth.uid() is not null and new.voter_id is distinct from auth.uid() then
            raise exception using message = 'Vote associé à un autre compte.', errcode = '42501';
        end if;

        update public.entries
        set vote_count = vote_count + 1
        where id = new.entry_id;

        return new;
    elsif tg_op = 'DELETE' then
        if auth.uid() is not null and old.voter_id is distinct from auth.uid() then
            raise exception using message = 'Suppression du vote non autorisée.', errcode = '42501';
        end if;

        update public.entries
        set vote_count = greatest(vote_count - 1, 0)
        where id = old.entry_id;

        return old;
    end if;

    raise exception using message = 'Opération de vote non prise en charge.', errcode = '22023';
end;
$$;

revoke all on function private.sync_entry_vote_count() from public, anon, authenticated;

drop trigger if exists votes_sync_entry_vote_count on public.votes;
create trigger votes_sync_entry_vote_count
after insert or delete on public.votes
for each row execute function private.sync_entry_vote_count();

commit;
