#!/usr/bin/env python3
"""Static safeguards for the Punchi Battle Supabase schema (not a DB runtime test)."""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "supabase/migrations/202611210001_punchi_battle_schema.sql"
INDEX_MIGRATION = ROOT / "supabase/migrations/20261124095000_add_fk_owner_indexes.sql"
HARDENING_MIGRATION = ROOT / "supabase/migrations/20261124121800_harden_write_paths_and_vote_totals.sql"
COUNTER_MIGRATION = ROOT / "supabase/migrations/20261124122000_replace_vote_view_with_private_counter.sql"
RATE_LIMIT_LOCK_MIGRATION = ROOT / "supabase/migrations/20261124123000_serialize_rate_limits.sql"
THEME_WINDOW_MIGRATION = ROOT / "supabase/migrations/20261124123500_filter_themes_by_open_window.sql"
CONTACT_MIGRATION = ROOT / "supabase/migrations/20261124122000_private_contact_details.sql"
CONSENT_MIGRATION = ROOT / "supabase/migrations/20261124130000_record_privacy_consent.sql"
MEMBER_CONSENT_MIGRATION = ROOT / "supabase/migrations/20261124131000_require_current_member_consent.sql"
ANON_PRIVILEGES_MIGRATION = ROOT / "supabase/migrations/20261124131500_revoke_inherited_anon_privileges.sql"
LEADERBOARD_MIGRATION = ROOT / "supabase/migrations/20261124132000_member_leaderboard_view.sql"
LEADERBOARD_RANK_MIGRATION = ROOT / "supabase/migrations/20261124132500_add_member_leaderboard_rank.sql"
TYPES = ROOT / "supabase/database.types.ts"
SEED = ROOT / "supabase/seed.sql"

TABLES = ("profiles", "themes", "entries", "votes", "comments", "reports")
REQUIRED_POLICIES = (
    "profiles_read_public",
    "profiles_insert_self",
    "profiles_update_self",
    "themes_read_active",
    "entries_read_published_or_own",
    "entries_submit_pending",
    "entries_edit_own_pending",
    "entries_delete_own_pending",
    "votes_read_own",
    "votes_insert_once",
    "votes_delete_own",
    "comments_read_published_or_own",
    "comments_submit_pending",
    "reports_read_own",
    "reports_submit_visible_target",
)


def read_required(path: Path, label: str, errors: list[str]) -> str:
    if not path.is_file():
        errors.append(f"{label} manquant")
        return ""
    return path.read_text(encoding="utf-8").lower()


def require_fragments(source: str, fragments: tuple[str, ...], label: str, errors: list[str]) -> None:
    for fragment in fragments:
        if fragment not in source:
            errors.append(f"{label} : élément manquant ({fragment})")


def main() -> int:
    errors: list[str] = []
    migration = read_required(MIGRATION, "migration SQL initiale", errors)
    index_migration = read_required(INDEX_MIGRATION, "migration d'index complémentaires", errors)
    hardening = read_required(HARDENING_MIGRATION, "migration de durcissement", errors)
    counter = read_required(COUNTER_MIGRATION, "migration du compteur de votes privé", errors)
    rate_lock = read_required(RATE_LIMIT_LOCK_MIGRATION, "migration de verrouillage anti-concurrence", errors)
    theme_window = read_required(THEME_WINDOW_MIGRATION, "migration de visibilité des thèmes", errors)
    contacts = read_required(CONTACT_MIGRATION, "migration de coordonnées privées", errors)
    consents = read_required(CONSENT_MIGRATION, "migration du registre de consentement", errors)
    member_consent = read_required(MEMBER_CONSENT_MIGRATION, "migration de consentement obligatoire", errors)
    anon_privileges = read_required(ANON_PRIVILEGES_MIGRATION, "migration de révocation des privilèges anonymes", errors)
    leaderboard = read_required(LEADERBOARD_MIGRATION, "migration du classement membre", errors)
    leaderboard_rank = read_required(LEADERBOARD_RANK_MIGRATION, "migration du rang membre", errors)
    generated_types = read_required(TYPES, "types TypeScript générés", errors)
    seed = read_required(SEED, "catalogue seed SQL", errors)

    for table in TABLES:
        if f"create table if not exists public.{table}" not in migration:
            errors.append(f"table public.{table} manquante")
        if f"alter table public.{table} enable row level security" not in migration:
            errors.append(f"RLS non activé explicitement sur public.{table}")

    for policy in REQUIRED_POLICIES:
        if policy not in migration:
            errors.append(f"policy initiale {policy} manquante")

    if "security definer" in migration:
        errors.append("fonction SECURITY DEFINER trouvée dans la migration publique initiale")
    if "profiles_insert_self" not in migration or "id = (select auth.uid())" not in migration:
        errors.append("création de profil initiale non limitée à auth.uid()")
    if "one_vote_per_user_per_entry unique (entry_id, voter_id)" not in migration:
        errors.append("contrainte d'unicité des votes manquante")
    if "t.is_active = true" not in migration or "t.closes_at > now()" not in migration:
        errors.append("contrôle de fenêtre d'ouverture du thème manquant")
    if "grant usage on schema public to anon, authenticated" not in migration:
        errors.append("GRANT USAGE explicite du schéma public manquant")
    if "grant select on public.profiles, public.themes, public.entries, public.comments to anon, authenticated" not in migration:
        errors.append("GRANT initial de lecture documenté manquant")
    if "char_length(avatar_url) <= 2048" not in migration or "'^https://'" not in migration:
        errors.append("validation HTTPS/longueur avatar manquante")
    if "revoke all on function public.set_updated_at() from public, anon, authenticated" not in migration:
        errors.append("EXECUTE de la fonction trigger non révoqué pour les rôles publics")
    require_fragments(index_migration, (
        "create index if not exists votes_voter_created_idx",
        "create index if not exists comments_author_created_idx",
    ), "index des clés étrangères", errors)

    require_fragments(hardening, (
        "revoke insert on public.profiles from authenticated",
        "grant insert (id, username, display_name) on public.profiles to authenticated",
        "revoke insert on public.entries from authenticated",
        "grant insert (author_id, theme_id, body) on public.entries to authenticated",
        "revoke insert on public.votes from authenticated",
        "grant insert (entry_id, voter_id) on public.votes to authenticated",
        "grant insert (entry_id, author_id, body) on public.comments to authenticated",
        "grant insert (reporter_id, target_type, target_id, category, details) on public.reports to authenticated",
        "comments_delete_own_pending",
        "create trigger entries_submission_rate_limit",
        "create trigger comments_submission_rate_limit",
        "revoke all on function public.enforce_submission_rate_limit() from public, anon, authenticated",
    ), "durcissement des écritures", errors)

    require_fragments(counter, (
        "add column if not exists vote_count bigint not null default 0",
        "create schema if not exists private",
        "revoke all on schema private from public, anon, authenticated",
        "create or replace function private.sync_entry_vote_count()",
        "security definer",
        "set search_path = ''",
        "auth.uid()",
        "revoke all on function private.sync_entry_vote_count() from public, anon, authenticated",
        "create trigger votes_sync_entry_vote_count",
        "drop view if exists public.entry_vote_totals",
    ), "compteur de votes sécurisé", errors)

    require_fragments(rate_lock, (
        "pg_catalog.pg_advisory_xact_lock",
        "pg_catalog.hashtextextended",
        "set search_path = ''",
        "revoke all on function public.enforce_submission_rate_limit() from public, anon, authenticated",
    ), "verrou transactionnel anti-concurrence", errors)

    require_fragments(theme_window, (
        "create policy themes_read_active on public.themes",
        "is_active = true",
        "opens_at <= now()",
        "closes_at > now()",
    ), "visibilité des thèmes par fenêtre horaire", errors)

    require_fragments(contacts, (
        "create table if not exists public.profile_contacts",
        "alter table public.profile_contacts enable row level security",
        "profile_contacts_select_self",
        "profile_contacts_insert_self",
        "profile_contacts_update_self",
        "profile_contacts_delete_self",
        "profile_contacts_phone_e164",
        "profile_contacts_country_iso2",
        "profile_contacts_consent_required",
        "revoke all on public.profile_contacts from public, anon, authenticated",
        "grant select, delete on public.profile_contacts to authenticated",
        "grant insert (user_id, backup_email, phone_e164, country_iso2)",
        "grant update (backup_email, phone_e164, country_iso2)",
        "revoke all on function public.stamp_profile_contact_change() from public, anon, authenticated",
    ), "stockage privé des coordonnées", errors)

    require_fragments(consents, (
        "create table if not exists public.account_consents",
        "alter table public.account_consents enable row level security",
        "account_consents_select_self",
        "account_consents_insert_self",
        "unique (user_id, consent_code, policy_version)",
        "grant select on public.account_consents to authenticated",
        "grant insert (user_id, consent_code, policy_version)",
    ), "registre de consentement append-only", errors)

    require_fragments(member_consent, (
        "profiles_read_members",
        "themes_read_active",
        "entries_read_published_or_own",
        "votes_read_own",
        "comments_read_published_or_own",
        "reports_read_own",
        "profile_contacts_select_self",
        "policy_version = 'pb-privacy-2026-11-v1'",
        "revoke select on public.profiles, public.themes, public.entries, public.comments from anon",
    ), "obligation de consentement dans RLS", errors)

    require_fragments(anon_privileges, (
        "revoke all on table",
        "public.profiles",
        "public.profile_contacts",
        "public.account_consents",
        "from public, anon",
        "grant select on public.profiles to authenticated",
        "grant select, insert, delete on public.votes to authenticated",
        "grant select, insert on public.reports to authenticated",
    ), "privilèges minimaux sans accès anonyme", errors)

    if "create view public.entry_vote_totals" in hardening:
        errors.append("vue publique privilégiée de votes toujours présente")

    require_fragments(leaderboard, (
        "create or replace view public.member_leaderboard",
        "with (security_invoker = true)",
        "e.status = 'published'",
        "sum(e.vote_count)",
        "revoke all on public.member_leaderboard from public, anon, authenticated",
        "grant select on public.member_leaderboard to authenticated",
    ), "classement calculé avec RLS", errors)

    require_fragments(generated_types, (
        "export type database =",
        "profile_contacts:",
        "account_consents:",
        "member_leaderboard:",
        "rank_number:",
    ), "types TypeScript synchronisés", errors)

    require_fragments(leaderboard_rank, (
        "create or replace view public.member_leaderboard",
        "with (security_invoker = true)",
        "row_number() over",
        "as rank_number",
        "revoke all on public.member_leaderboard from public, anon, authenticated",
        "grant select on public.member_leaderboard to authenticated",
    ), "rang exact du membre", errors)

    if "is_active)\nvalues" not in seed or ", false)" not in seed:
        errors.append("les thèmes de départ doivent rester inactifs par défaut")

    if errors:
        for error in errors:
            print("ERREUR:", error, file=sys.stderr)
        return 1

    print(
        "OK : 8 tables, 22 policies attendues, RLS, consentement versionné, "
        "coordonnées privées, absence d'accès anonyme, privilèges limités, "
        "anti-spam, compteur de votes privé, classement et rang membre vérifiés."
    )
    print("NOTE : vérification statique ; les parcours Auth/SMS et tests RLS avec de vrais comptes restent nécessaires.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
