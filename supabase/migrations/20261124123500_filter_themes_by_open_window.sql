-- Only show an active theme while its configured opening window is live.
drop policy if exists themes_read_active on public.themes;

create policy themes_read_active on public.themes
for select to anon, authenticated
using (
    is_active = true
    and (opens_at is null or opens_at <= now())
    and (closes_at is null or closes_at > now())
);
