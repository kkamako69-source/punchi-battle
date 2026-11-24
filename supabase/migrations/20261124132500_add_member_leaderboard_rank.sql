-- Add a stable rank number to the RLS-invoker leaderboard view.
create or replace view public.member_leaderboard
with (security_invoker = true)
as
select
    ranked.author_id,
    ranked.username,
    ranked.display_name,
    ranked.submissions_count,
    ranked.votes_total,
    row_number() over (
        order by ranked.votes_total desc,
                 ranked.submissions_count desc,
                 ranked.username asc
    )::bigint as rank_number
from (
    select
        e.author_id,
        p.username,
        p.display_name,
        count(e.id)::bigint as submissions_count,
        coalesce(sum(e.vote_count), 0)::bigint as votes_total
    from public.entries e
    join public.profiles p on p.id = e.author_id
    where e.status = 'published'
    group by e.author_id, p.username, p.display_name
) ranked;

revoke all on public.member_leaderboard from public, anon, authenticated;
grant select on public.member_leaderboard to authenticated;
