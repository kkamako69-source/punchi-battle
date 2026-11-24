# Punchi Battle — L’Arène des Mots

Punchi Battle est une plateforme de battles de punchlines : un thème est ouvert, les MC proposent leurs textes, une modération valide les participations, puis les membres votent.

## État au 24 novembre 2026

- Le site possède un portail d’inscription/connexion par e-mail ou téléphone.
- Les menus **Arène**, **Classement** et **Mon profil** sont trois écrans distincts ; ils restent verrouillés tant que le compte n’est pas authentifié et que la version courante de la politique n’a pas été acceptée.
- La base PostgreSQL utilise huit tables, RLS sur chacune et 22 politiques.
- Les coordonnées principales restent dans Supabase Auth. Les coordonnées secondaires sont dans une table privée distincte.
- Les visiteurs anonymes n’ont aucun privilège SQL de lecture ou d’écriture sur les huit tables.
- Les six thèmes sont volontairement fermés jusqu’à ce que la modération soit prête.
- L’ancienne maquette locale est conservée dans le code historique, mais elle est masquée dans le parcours membre : aucun faux score n’est présenté comme un résultat réel.

## Parcours de compte

**E-mail :** adresse + mot de passe (12 caractères minimum) + confirmation de l’adresse par e-mail.

**Téléphone :** OTP SMS à six chiffres au format international E.164. Le Congo est prérempli comme pays de référence pour les coordonnées secondaires ; les indicatifs internationaux sont acceptés, sans restriction géographique.

**Coordonnées secondaires :** e-mail et/ou téléphone facultatifs, conservés dans `profile_contacts`, visibles uniquement par le membre propriétaire. Ces coordonnées secondaires ne sont pas vérifiées par le formulaire et ne constituent pas un moyen de récupération du compte.

**Consentement :** chaque compte doit accepter la version courante de la politique ; l’acceptation est enregistrée dans `account_consents` et les policies RLS la vérifient. Les coordonnées ne sont jamais rendues publiques.

## À terminer avant l’ouverture publique

1. Configurer l’URL de redirection et un SMTP personnalisé pour les e-mails.
2. Activer l’authentification téléphonique et choisir un fournisseur SMS (Twilio, Vonage, MessageBird ou autre pris en charge). Aucun fournisseur ni abonnement SMS payant n’a été activé.
3. Configurer CAPTCHA et les limites de l’OTP pour éviter les abus et les frais SMS.
4. Compléter l’identité légale et les coordonnées du responsable dans la notice, puis faire vérifier les obligations de traitement et de transfert international applicables en République du Congo.
5. Créer une interface de modération protégée avant d’ouvrir les thèmes et les publications au public.

Voir [Configuration Supabase](supabase/CONFIGURATION.md) et [Politique de confidentialité](politique-confidentialite.html).

## Architecture

- `index.html` : shell membre, portail d’accès, menus Arène/Classement/Profil et notice de confidentialité.
- `supabase.js` : client navigateur épinglé à `@supabase/supabase-js@2.119.2`, avec clé publishable uniquement.
- `supabase/migrations/` : douze migrations SQL versionnées et appliquées au projet Supabase.
- `supabase/seed.sql` : six thèmes de départ désactivés.
- `supabase/README.md` : architecture réelle, sécurité, privilèges et état.
- `supabase/CONFIGURATION.md` : URL Auth, e-mail, SMS, CAPTCHA, modération et lancement.
- `politique-confidentialite.html` : notice provisoire à compléter et valider.
- `RESEARCH_AND_ROADMAP.md` : recherches, licences et étapes suivantes.

## Sécurité

Les huit tables sont protégées par RLS. Le consentement versionné est vérifié au niveau PostgreSQL : masquer les menus dans le navigateur n’est pas la seule barrière. Les rôles `PUBLIC` et `anon` n’ont aucun droit de table sur les données membres. Les coordonnées privées utilisent des droits limités et des policies propriétaire-seul.

Les votes sont uniques par compte et par participation. Un compteur agrégé est maintenu par une fonction privée. Les statuts de modération et les horodatages ne peuvent pas être choisis librement depuis le navigateur. Des limites anti-spam transactionnelles s’appliquent aux punchlines et aux commentaires.

Ne place jamais une clé `sb_secret_...`, `service_role`, un mot de passe PostgreSQL ou un secret SMTP/SMS dans GitHub ou dans le navigateur.

## Contrôles locaux

```sh
python tools/check_site.py
node tools/check_inline_js.cjs
node --input-type=module --check < supabase.js
python tools/check_supabase_schema.py
python tools/check_punchi_frontend.py
```

GitHub Actions lance les contrôles HTML, JavaScript, module Supabase, schéma et contrat front-end. CodeQL analyse le JavaScript et Dependabot suit les actions GitHub.

## Liens

- [Dépôt GitHub](https://github.com/kkamako69-source/punchi-battle)
- [Site](https://kkamako69-source.github.io/punchi-battle/)
- [Supabase](https://supabase.com/dashboard/project/ppuhpuuuxohokuzfctpq)
- [Audit continu Supabase](https://supabase.com/dashboard/project/ppuhpuuuxohokuzfctpq/explorer/notebook/409399d0-c7c0-4b40-a58c-7fa04c74025d)
- [Politique de confidentialité](politique-confidentialite.html)
