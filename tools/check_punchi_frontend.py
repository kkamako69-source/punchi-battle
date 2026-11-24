#!/usr/bin/env python3
"""Contract checks for the Punchi Battle Supabase browser integration."""
from __future__ import annotations

from pathlib import Path
import re
import sys
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"
CLIENT = ROOT / "supabase.js"


def fail(message: str) -> None:
    print("ERREUR:", message, file=sys.stderr)


class FormNestingChecker(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.form_depth = 0
        self.div_depth = 0
        self.errors: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        normalized = tag.lower()
        if normalized == "form":
            self.form_depth += 1
            if self.form_depth > 1:
                self.errors.append("formulaire HTML imbriqué détecté")
        elif normalized == "div":
            self.div_depth += 1

    def handle_endtag(self, tag: str) -> None:
        normalized = tag.lower()
        if normalized == "form":
            if self.form_depth <= 0:
                self.errors.append("balise de fermeture de formulaire inattendue")
            else:
                self.form_depth -= 1
        elif normalized == "div":
            if self.div_depth <= 0:
                self.errors.append("balise de fermeture div inattendue")
            else:
                self.div_depth -= 1

    def finish(self) -> None:
        if self.form_depth:
            self.errors.append("formulaire HTML non fermé")
        if self.div_depth:
            self.errors.append("balise div non fermée")


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

    for table in ("profile_contacts", "account_consents"):
        if f'.from("{table}")' not in client:
            errors.append(f"table privée {table} non utilisée par le client")

    for required in ("signInWithOtp", "verifyOtp", "normalizeE164", "PRIVACY_POLICY_VERSION", "recordPrivacyConsent"):
        if required not in client:
            errors.append(f"fonction de compte international / consentement manquante : {required}")

    if "window.PunchiBattleAuth?.isAuthenticated !== true" not in html:
        errors.append("verrouillage des menus avant inscription manquant")
    if 'data-auth-required="true"' not in html:
        errors.append("état visuel des menus verrouillés absent")
    if "pb-cloud-phone-privacy-consent" not in html or "pb-cloud-privacy-consent" not in html:
        errors.append("acceptation de la politique requise à l’inscription manquante")
    if "pb-cloud-existing-consent" not in html:
        errors.append("renouvellement du consentement pour les comptes existants manquant")
    if "politique-confidentialite.html" not in html:
        errors.append("lien vers la politique de confidentialité absent")
    for required in (
        'id="pb-cloud-member-nav"',
        'data-pb-view="arena"',
        'data-pb-view="ranking"',
        'data-pb-view="profile"',
        'id="pb-cloud-view-arena"',
        'id="pb-cloud-view-ranking"',
        'id="pb-cloud-view-profile"',
        'id="pb-cloud-leaderboard"',
        'id="pb-cloud-profile-submissions"',
    ):
        if required not in html:
            errors.append(f"menu membre / écran distinct manquant : {required}")

    if '.from("member_leaderboard")' not in client or "function renderCloudLeaderboard" not in client:
        errors.append("classement non relié à la vue PostgreSQL membre")
    if "data-pb-view-panel" not in html or "function showMemberView" not in client:
        errors.append("navigation réelle entre les écrans membre manquante")
    # Keep the previous mock dashboard hidden from the new account-first product shell.
    compact = re.sub(r"\s+", "", html)
    if "body>header,body>main,body>footer{display:none!important;}" not in compact:
        errors.append("ancienne interface fictive visible dans le shell membre")
    if ".from(\"member_leaderboard\")" not in client or "rank_number" not in client:
        errors.append("classement et rang individuel non reliés à PostgreSQL")
    if "recordPrivacyConsent(user)" not in client or "account_consents" not in client:
        errors.append("enregistrement du consentement versionné manquant")

    form_checker = FormNestingChecker()
    form_checker.feed(html)
    form_checker.finish()
    errors.extend(form_checker.errors)

    if not (ROOT / "politique-confidentialite.html").is_file():
        errors.append("page de politique de confidentialité manquante")
    if "PRIVACY_POLICY_VERSION = \"PB-PRIVACY-2026-11-V1\"" not in client:
        errors.append("version de politique de confidentialité non définie")
    if "pb-cloud-member-content" not in html or "id=\"pb-cloud-member-content\" hidden" not in html:
        errors.append("contenu des menus non masqué par défaut")
    if "pb-cloud-phone-auth-area" not in html or "id=\"pb-cloud-phone-auth-area\"" not in html:
        errors.append("zone de connexion téléphonique non isolée pour son masquage")
    if "profile_contacts" in html:
        errors.append("les coordonnées privées ne doivent pas être injectées comme données littérales dans le HTML")

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
