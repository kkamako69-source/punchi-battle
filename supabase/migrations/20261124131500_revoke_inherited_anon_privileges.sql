-- Remove inherited PUBLIC/anon table privileges across the member-only Data API.
-- Re-grant only the exact authenticated operations required by Punchi Battle.
begin;

revoke all on table
    public.profiles,
    public.themes,
    public.entries,
    public.votes,
    public.comments,
    public.reports,
    public.profile_contacts,
    public.account_consents
from public, anon;

-- Profiles: members may read profiles, create their own, and update public profile fields.
grant select on public.profiles to authenticated;
grant insert (id, username, display_name) on public.profiles to authenticated;
grant update (username, display_name, bio, avatar_url) on public.profiles to authenticated;

-- Themes and entries: no anonymous reads; members read only after versioned consent.
grant select on public.themes to authenticated;
grant select, insert, delete on public.entries to authenticated;
grant update (body, theme_id) on public.entries to authenticated;

-- Voting: only authenticated members can read their own votes, cast a vote, or withdraw it.
grant select, insert, delete on public.votes to authenticated;

-- Comments and reports remain member-only and row-scoped by RLS.
grant select, insert, delete on public.comments to authenticated;
grant select, insert on public.reports to authenticated;

-- Private contact data: only each owner, with limited writable columns.
grant select, delete on public.profile_contacts to authenticated;
grant insert (user_id, backup_email, phone_e164, country_iso2)
    on public.profile_contacts to authenticated;
grant update (backup_email, phone_e164, country_iso2)
    on public.profile_contacts to authenticated;

-- Consent records are append-only and self-scoped.
grant select on public.account_consents to authenticated;
grant insert (user_id, consent_code, policy_version)
    on public.account_consents to authenticated;

commit;
