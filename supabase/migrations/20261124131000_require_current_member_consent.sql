-- Require a durable, version-specific consent record for every member operation.
-- Anonymous users cannot read member data even through direct Data API calls.
begin;

-- Authenticated consent is the prerequisite for the member-only application.
-- This reads the caller's own append-only consent record; no mutable JWT claim is trusted.
drop policy if exists profiles_read_public on public.profiles;
create policy profiles_read_members on public.profiles
for select to authenticated
using (
    exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (
    id = (select auth.uid())
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (
    id = (select auth.uid())
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
)
with check (
    id = (select auth.uid())
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

drop policy if exists themes_read_active on public.themes;
create policy themes_read_active on public.themes
for select to authenticated
using (
    is_active = true
    and (opens_at is null or opens_at <= now())
    and (closes_at is null or closes_at > now())
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

drop policy if exists entries_read_published_or_own on public.entries;
create policy entries_read_published_or_own on public.entries
for select to authenticated
using (
    (status = 'published' or author_id = (select auth.uid()))
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

drop policy if exists entries_submit_pending on public.entries;
create policy entries_submit_pending on public.entries
for insert to authenticated
with check (
    author_id = (select auth.uid())
    and status = 'pending'
    and exists (
        select 1
        from public.themes t
        where t.id = entries.theme_id
          and t.is_active = true
          and (t.opens_at is null or t.opens_at <= now())
          and (t.closes_at is null or t.closes_at > now())
    )
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

drop policy if exists entries_edit_own_pending on public.entries;
create policy entries_edit_own_pending on public.entries
for update to authenticated
using (
    author_id = (select auth.uid())
    and status = 'pending'
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
)
with check (
    author_id = (select auth.uid())
    and status = 'pending'
    and exists (
        select 1
        from public.themes t
        where t.id = entries.theme_id
          and t.is_active = true
          and (t.opens_at is null or t.opens_at <= now())
          and (t.closes_at is null or t.closes_at > now())
    )
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

-- Keep withdrawal of an owner's unmoderated submission available even after consent expires.
drop policy if exists entries_delete_own_pending on public.entries;
create policy entries_delete_own_pending on public.entries
for delete to authenticated
using (author_id = (select auth.uid()) and status = 'pending');

drop policy if exists votes_read_own on public.votes;
create policy votes_read_own on public.votes
for select to authenticated
using (
    voter_id = (select auth.uid())
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

drop policy if exists votes_insert_once on public.votes;
create policy votes_insert_once on public.votes
for insert to authenticated
with check (
    voter_id = (select auth.uid())
    and exists (
        select 1
        from public.entries e
        where e.id = votes.entry_id and e.status = 'published'
    )
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

drop policy if exists votes_delete_own on public.votes;
create policy votes_delete_own on public.votes
for delete to authenticated
using (voter_id = (select auth.uid()));

drop policy if exists comments_read_published_or_own on public.comments;
create policy comments_read_published_or_own on public.comments
for select to authenticated
using (
    (status = 'published' or author_id = (select auth.uid()))
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

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
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

-- Keep withdrawal of an author's own unmoderated comment available.
drop policy if exists comments_delete_own_pending on public.comments;
create policy comments_delete_own_pending on public.comments
for delete to authenticated
using (author_id = (select auth.uid()) and status = 'pending');

drop policy if exists reports_read_own on public.reports;
create policy reports_read_own on public.reports
for select to authenticated
using (
    reporter_id = (select auth.uid())
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

drop policy if exists reports_submit_visible_target on public.reports;
create policy reports_submit_visible_target on public.reports
for insert to authenticated
with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and (
        (target_type = 'entry' and exists (
            select 1 from public.entries e
            where e.id = reports.target_id and e.status = 'published'
        ))
        or
        (target_type = 'comment' and exists (
            select 1 from public.comments c
            where c.id = reports.target_id and c.status = 'published'
        ))
    )
    and exists (
        select 1
        from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

-- Secondary contacts require current consent for use, but the owner can always erase them.
drop policy if exists profile_contacts_select_self on public.profile_contacts;
create policy profile_contacts_select_self on public.profile_contacts
for select to authenticated
using (
    user_id = (select auth.uid())
    and exists (
        select 1 from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

drop policy if exists profile_contacts_insert_self on public.profile_contacts;
create policy profile_contacts_insert_self on public.profile_contacts
for insert to authenticated
with check (
    user_id = (select auth.uid())
    and exists (
        select 1 from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

drop policy if exists profile_contacts_update_self on public.profile_contacts;
create policy profile_contacts_update_self on public.profile_contacts
for update to authenticated
using (
    user_id = (select auth.uid())
    and exists (
        select 1 from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
)
with check (
    user_id = (select auth.uid())
    and exists (
        select 1 from public.account_consents ac
        where ac.user_id = (select auth.uid())
          and ac.consent_code = 'privacy_policy'
          and ac.policy_version = 'PB-PRIVACY-2026-11-V1'
    )
);

-- Consent rows themselves remain available to the owner without a current-consent guard.
-- This allows a returning member to accept a newer policy and regain access.
drop policy if exists account_consents_select_self on public.account_consents;
create policy account_consents_select_self on public.account_consents
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists account_consents_insert_self on public.account_consents;
create policy account_consents_insert_self on public.account_consents
for insert to authenticated
with check (user_id = (select auth.uid()));

-- Member menus are genuinely private at the Data API layer, not just hidden in HTML.
revoke select on public.profiles, public.themes, public.entries, public.comments from anon;

commit;
