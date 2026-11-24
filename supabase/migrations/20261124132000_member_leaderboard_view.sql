-- Live member leaderboard based only on published entries and aggregate votes.
-- SECURITY INVOKER preserves caller table privileges and RLS policies.
begin;

create or replace view public.member_leaderboard
with (security_invoker = true)
as
select
    e.author_id,
    p.username,
    p.display_name,
    count(e.id)::bigint as submissions_count,
    coalesce(sum(e.vote_count), 0)::bigint as votes_total
from public.entries e
join public.profiles p on p.id = e.author_id
where e.status = 'published'
group by e.author_id, p.username, p.display_name;

revoke all on public.member_leaderboard from public, anon, authenticated;
grant select on public.member_leaderboard to authenticated;

commit;
