#!/usr/bin/env python3
"""Static safeguards for the Punchi Battle Supabase schema (not a DB runtime test)."""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "supabase/migrations/202611210001_punchi_battle_schema.sql"
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

def fail(message: str) -> None:
    print("ERREUR:", message, file=sys.stderr)

def main() -> int:
    errors: list[str] = []
    if not MIGRATION.is_file():
        errors.append("migration SQL manquante")
        migration = ""
    else:
        migration = MIGRATION.read_text(encoding="utf-8").lower()

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
        + " policies attendues, contraintes de votes et GRANT vérifiés."
    )
    print("NOTE : vérification statique uniquement ; une vraie migration et des tests RLS restent nécessaires.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
