-- Punchi Battle: tighten client write privileges, rate-limit submissions,
-- allow authors to remove pending comments, and expose only aggregate vote counts.
begin;

-- Restrict INSERT to client-controlled business fields. Server defaults own ids and timestamps.
revoke insert on public.profiles from authenticated;
grant insert (id, username, display_name) on public.profiles to authenticated;

revoke insert on public.entries from authenticated;
grant insert (author_id, theme_id, body) on public.entries to authenticated;

revoke insert on public.votes from authenticated;
grant insert (entry_id, voter_id) on public.votes to authenticated;

revoke insert on public.comments from authenticated;
grant insert (entry_id, author_id, body) on public.comments to authenticated;

revoke insert on public.reports from authenticated;
grant insert (reporter_id, target_type, target_id, category, details) on public.reports to authenticated;

-- Allow a member to remove their own comment while it is still awaiting moderation.
drop policy if exists comments_delete_own_pending on public.comments;
create policy comments_delete_own_pending on public.comments
for delete to authenticated
using (author_id = (select auth.uid()) and status = 'pending');
grant delete on public.comments to authenticated;

-- Per-account abuse limits. SECURITY INVOKER is intentional: the function must
-- count only rows the authenticated author can already see through the RLS policies.
create or replace function public.enforce_submission_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    recent_count bigint;
begin
    if current_user_id is null or new.author_id is distinct from current_user_id then
        raise exception using message = 'Connexion requise pour publier.', errcode = '42501';
    end if;

    if tg_table_name = 'entries' then
        select count(*) into recent_count
        from public.entries e
        where e.author_id = current_user_id
          and e.created_at >= statement_timestamp() - interval '24 hours';

        if recent_count >= 5 then
            raise exception using message = 'Limite atteinte : 5 punchlines maximum sur 24 heures.', errcode = 'P0001';
        end if;

        new.created_at := statement_timestamp();
        new.updated_at := statement_timestamp();
    elsif tg_table_name = 'comments' then
        select count(*) into recent_count
        from public.comments c
        where c.author_id = current_user_id
          and c.created_at >= statement_timestamp() - interval '1 hour';

        if recent_count >= 20 then
            raise exception using message = 'Limite atteinte : 20 commentaires maximum par heure.', errcode = 'P0001';
        end if;

        new.created_at := statement_timestamp();
    else
        raise exception using message = 'Table non prise en charge.', errcode = '22023';
    end if;

    return new;
end;
$$;

drop trigger if exists entries_submission_rate_limit on public.entries;
create trigger entries_submission_rate_limit
before insert on public.entries
for each row execute function public.enforce_submission_rate_limit();

drop trigger if exists comments_submission_rate_limit on public.comments;
create trigger comments_submission_rate_limit
before insert on public.comments
for each row execute function public.enforce_submission_rate_limit();

-- The trigger is the only public workflow that needs this helper.
revoke all on function public.enforce_submission_rate_limit() from public, anon, authenticated;

-- This view intentionally exposes only aggregate totals for published entries.
-- SECURITY INVOKER is false so the view owner can aggregate protected vote rows;
-- no voter ids or individual vote rows are returned.
create or replace view public.entry_vote_totals
with (security_barrier = true, security_invoker = false)
as
select
    e.id as entry_id,
    count(v.id)::bigint as vote_count
from public.entries e
left join public.votes v on v.entry_id = e.id
where e.status = 'published'
group by e.id;

revoke all on public.entry_vote_totals from public, anon, authenticated;
grant select on public.entry_vote_totals to anon, authenticated;

commit;
