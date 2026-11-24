# Punchi Battle — L’Arène des Mots

Punchi Battle est une plateforme de battles de punchlines : un thème est ouvert, les MC proposent leurs textes, une modération valide les participations, puis la communauté vote.

## État du projet au 24 novembre 2026

- Le site GitHub Pages comprend une nouvelle zone **Arène en ligne** reliée au backend Supabase.
- Les comptes utilisent Supabase Auth ; les profils, thèmes, punchlines et votes sont stockés dans PostgreSQL.
- Les punchlines nouvellement envoyées restent en attente de modération. Seules les participations publiées apparaissent dans le flux public.
- Le compteur de votes est visible publiquement, mais l'identité des votants reste privée.
- L'ancienne maquette locale reste en dessous de l'espace en ligne pour comparaison ; ses statistiques et interactions sont fictives et indépendantes de la vraie base.
- Les six thèmes sont volontairement fermés jusqu'à ce qu'un responsable soit prêt à ouvrir une battle.

**Avant d'ouvrir au public :** configure l'URL et la redirection Auth, un SMTP personnalisé et la modération. Le SMTP de test Supabase intégré n'est pas adapté à des inscriptions publiques. Voir [Configuration Supabase](supabase/CONFIGURATION.md).

## Structure

- `index.html` : site principal, espace en ligne et ancienne maquette de présentation.
- `supabase.js` : client navigateur Supabase épinglé à `@supabase/supabase-js@2.119.2`, avec une clé publishable uniquement.
- `supabase/migrations/` : quatre migrations SQL versionnées et appliquées au projet connecté.
- `supabase/seed.sql` : six thèmes initiaux, tous inactifs.
- `supabase/README.md` : architecture réelle, privilèges, contrôles et statut.
- `supabase/CONFIGURATION.md` : URL Auth, SMTP, modération et étapes avant lancement.
- `RESEARCH_AND_ROADMAP.md` : ressources, licences, stratégie et étapes futures.

## Sécurité de la base

Les six tables publiques ont RLS activée. Les privilèges SQL sont limités par colonne pour les INSERT ; les statuts de modération et les horodatages sont gérés côté base. Les votes sont uniques par compte et par participation. Une fonction privée met à jour uniquement le total public sans exposer les identités des votants. Des limites serveur réduisent le spam : 5 punchlines par compte sur 24 heures, 20 commentaires par heure.

Ne place jamais de clé `sb_secret_...`, `service_role`, mot de passe PostgreSQL ou secret SMTP dans GitHub ou dans le navigateur.

## Contrôles

```sh
python tools/check_site.py
node tools/check_inline_js.cjs
node --input-type=module --check < supabase.js
python tools/check_supabase_schema.py
```

GitHub Actions exécute les contrôles HTML, JavaScript classique, le module navigateur et les contrôles de schéma. CodeQL analyse le JavaScript et Dependabot suit chaque semaine les GitHub Actions.

## Liens

- [Projet GitHub](https://github.com/kkamako69-source/punchi-battle)
- [Site publié](https://kkamako69-source.github.io/punchi-battle/)
- [Backend Supabase](https://supabase.com/dashboard/project/ppuhpuuuxohokuzfctpq)
- [Politique de sécurité](SECURITY.md)
