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
    "comments_delete_own_pending",
    "reports_read_own",
    "reports_submit_visible_target",
)

def fail(message: str) -> None:
    print("ERREUR:", message, file=sys.stderr)

def main() -> int:
    errors: list[str] = []
    if not MIGRATION.is_file():
        errors.append("migration SQL manquante")
        migration = ""
    else:
        migration = MIGRATION.read_text(encoding="utf-8").lower()

    if not INDEX_MIGRATION.is_file():
        errors.append("migration d'index complémentaires manquante")
        index_migration = ""
    else:
        index_migration = INDEX_MIGRATION.read_text(encoding="utf-8").lower()

    if not HARDENING_MIGRATION.is_file():
        errors.append("migration de durcissement des écritures manquante")
        hardening_migration = ""
    else:
        hardening_migration = HARDENING_MIGRATION.read_text(encoding="utf-8").lower()

    if not COUNTER_MIGRATION.is_file():
        errors.append("migration du compteur de votes privé manquante")
        counter_migration = ""
    else:
        counter_migration = COUNTER_MIGRATION.read_text(encoding="utf-8").lower()

    if not SEED.is_file():
        errors.append("catalogue seed SQL manquant")
        seed = ""
    else:
        seed = SEED.read_text(encoding="utf-8").lower()

    for table in TABLES:
        if f"create table if not exists public.{table}" not in migration:
            errors.append(f"table public.{table} manquante")
        if f"alter table public.{table} enable row level security" not in migration:
            errors.append(f"RLS non activé explicitement sur public.{table}")

    for policy in REQUIRED_POLICIES:
        if policy not in migration:
            errors.append(f"policy {policy} manquante")

    if "security definer" in migration:
        errors.append("fonction SECURITY DEFINER trouvée dans la migration publique")
    if "profiles_insert_self" not in migration or "id = (select auth.uid())" not in migration:
        errors.append("création de profil non limitée à auth.uid()")
    if "one_vote_per_user_per_entry unique (entry_id, voter_id)" not in migration:
        errors.append("contrainte d'unicité des votes manquante")
    if "t.is_active = true" not in migration or "t.closes_at > now()" not in migration:
        errors.append("contrôle de fenêtre d'ouverture du thème manquant")
    if "grant usage on schema public to anon, authenticated" not in migration:
        errors.append("GRANT USAGE explicite du schéma public manquant")
    if "grant select on public.profiles, public.themes, public.entries, public.comments to anon, authenticated" not in migration:
        errors.append("GRANT de lecture explicite des tables exposées manquant")
    if "grant select, insert, delete on public.votes to authenticated" not in migration:
        errors.append("GRANT de votes explicite manquant")
    if "grant insert on public.profiles to authenticated" not in migration:
        errors.append("GRANT d'insertion des profils manquant")
    if "grant select, insert on public.reports to authenticated" not in migration:
        errors.append("GRANT de lecture/insertion des signalements manquant")
    if "char_length(avatar_url) <= 2048" not in migration or "'^https://'" not in migration:
        errors.append("validation HTTPS/longueur avatar manquante")
    if "revoke all on function public.set_updated_at() from public, anon, authenticated" not in migration:
        errors.append("EXECUTE de la fonction trigger non révoqué pour les rôles publics")
    if "create index if not exists votes_voter_created_idx" not in index_migration:
        errors.append("index de clé étrangère votes_voter_id manquant")
    if "create index if not exists comments_author_created_idx" not in index_migration:
        errors.append("index de clé étrangère comments_author_id manquant")

    required_hardening = (
        "revoke insert on public.profiles from authenticated",
        "grant insert (id, username, display_name) on public.profiles to authenticated",
        "revoke insert on public.entries from authenticated",
        "grant insert (author_id, theme_id, body) on public.entries to authenticated",
        "revoke insert on public.votes from authenticated",
        "grant insert (entry_id, voter_id) on public.votes to authenticated",
        "grant delete on public.comments to authenticated",
        "create trigger entries_submission_rate_limit",
        "create trigger comments_submission_rate_limit",
        "revoke all on function public.enforce_submission_rate_limit() from public, anon, authenticated",
    )
    for fragment in required_hardening:
        if fragment not in hardening_migration:
            errors.append(f"durcissement SQL manquant : {fragment}")

    required_counter = (
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
    )
    for fragment in required_counter:
        if fragment not in counter_migration:
            errors.append(f"compteur de votes sécurisé manquant : {fragment}")
    if "create view public.entry_vote_totals" in hardening_migration:
        errors.append("vue publique privilégiée de votes toujours présente")
    if "is_active)\nvalues" not in seed or ", false)" not in seed:
        errors.append("les thèmes de départ doivent rester inactifs par défaut")

    if errors:
        for error in errors:
            fail(error)
        return 1

    print(
        "OK : "
        + str(len(TABLES))
        + " tables, "
        + str(len(REQUIRED_POLICIES))
        + " policies attendues, privilèges limités, anti-spam, compteur de votes privé et index vérifiés."
    )
    print("NOTE : vérification statique uniquement ; une vraie migration et des tests RLS restent nécessaires.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
