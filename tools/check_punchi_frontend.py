#!/usr/bin/env python3
"""Contract checks for the Punchi Battle Supabase browser integration."""
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"
CLIENT = ROOT / "supabase.js"


def fail(message: str) -> None:
    print("ERREUR:", message, file=sys.stderr)


def main() -> int:
    errors: list[str] = []
    if not HTML.is_file() or not CLIENT.is_file():
        fail("index.html ou supabase.js manquant")
        return 1

    html = HTML.read_text(encoding="utf-8")
    client = CLIENT.read_text(encoding="utf-8")
    html_ids = set(re.findall(r'\bid=["\']([^"\']+)["\']', html))
    referenced_ids = set(re.findall(r'\$\(["\']([^"\']+)["\']\)', client))
    referenced_ids.update(re.findall(r'getElementById\(["\']([^"\']+)["\']\)', client))

    missing = sorted(referenced_ids - html_ids)
    if missing:
        errors.append("identifiants DOM utilisés par supabase.js absents de index.html : " + ", ".join(missing))

    if '<script type="module" src="supabase.js"></script>' not in html:
        errors.append("module Supabase absent de index.html")
    if "@supabase/supabase-js@2.119.2" not in client:
        errors.append("version du client Supabase non épinglée à 2.119.2")
    if "sb_publishable_" not in client:
        errors.append("clé publishable Supabase manquante")
    if re.search(r"sb_secret_|service_role|service-role", client, re.IGNORECASE):
        errors.append("une clé privilégiée ou référence service-role apparaît dans le client public")
    if "emailRedirectTo" not in client:
        errors.append("redirection de confirmation e-mail absente")
    if "password.length < 12" not in client:
        errors.append("contrôle minimal de longueur du mot de passe absent")
    for table in ("profiles", "themes", "entries", "votes"):
        if f'.from("{table}")' not in client:
            errors.append(f"table {table} non utilisée par le client")
    if "escapeHTML(entry.body)" not in client:
        errors.append("texte de punchline non échappé avant affichage")
    if 'aria-live="polite"' not in html:
        errors.append("messages d’état accessibles (aria-live) absents")

    if errors:
        for error in errors:
            fail(error)
        return 1

    print(
        "OK : "
        + str(len(referenced_ids))
        + " références DOM résolues, version Supabase épinglée, clé publique uniquement, "
        + "authentification et échappement des contenus vérifiés."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
