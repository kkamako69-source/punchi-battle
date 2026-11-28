# Punchi Battle — backend Supabase

## État réel au 24 novembre 2026

Le projet Supabase `punchi-battle` se trouve dans `Specimens Org`, région `eu-west-3` (Paris). Le devis initial de création était de **0 USD/mois** ; les SMS, SMTP tiers, dépassements, services et plans additionnels peuvent coûter de l’argent.

- Projet : `ppuhpuuuxohokuzfctpq`
- API : https://ppuhpuuuxohokuzfctpq.supabase.co
- État observé : `ACTIVE_HEALTHY`
- PostgreSQL : 17.12
- **12 migrations appliquées**
- **8 tables**, RLS sur chacune, **22 policies**
- 6 thèmes de départ, tous inactifs
- Aucun compte, aucune participation, aucun vote, aucun commentaire et aucune coordonnée secondaire réelle n’ont encore été enregistrés.

## Parcours membre et consentement

- Supabase Auth conserve l’identifiant principal : e-mail ou numéro téléphone vérifié selon le mode choisi. Aucun mot de passe n’est stocké dans les tables publiques.
- L’inscription e-mail demande une confirmation. La connexion par téléphone utilise un OTP SMS et un numéro E.164 ; le fournisseur SMS reste à configurer.
- La politique `PB-PRIVACY-2026-11-V1` doit être acceptée. L’acceptation est inscrite dans `account_consents` et enregistrée pour le compte connecté.
- Les policies RLS vérifient l’existence du consentement courant avant de lire ou d’écrire les données membre. Les visiteurs anonymes n’ont aucun privilège de table sur les huit tables.
- Les anciens comptes qui se connectent après un changement de politique voient un formulaire de renouvellement du consentement.
- La récupération du mot de passe e-mail utilise le flux Auth de Supabase ; la redirection et les modèles d’e-mail doivent être configurés.
- Le pseudo, le nom d’affichage et la biographie peuvent être modifiés dans le menu Profil. La connexion des anciens comptes ne bloque pas les mots de passe historiques de moins de 12 caractères.

## Coordonnées et confidentialité

- `profiles` ne contient que les champs de profil public (pseudo, nom d’affichage, biographie, avatar). Il ne contient ni e-mail ni téléphone.
- `profile_contacts` conserve facultativement un e-mail secondaire, un téléphone E.164 et un code pays ISO-2. Les règles SQL permettent au seul propriétaire de lire/modifier ses coordonnées et de les supprimer ; aucune lecture anonyme n’est accordée.
- Les coordonnées secondaires ne sont **pas vérifiées** par le formulaire et ne doivent pas être utilisées comme récupération du compte avant la mise en place d’une vérification indépendante.
- `account_consents` est un registre append-only : les utilisateurs peuvent lire et ajouter leurs propres consentements, pas les modifier ni les supprimer.
- Les e-mails et téléphones ne figurent pas dans les profils publics, les cartes de battle, les classements ou les réponses du flux public.

## Sécurité métier

- Participations et commentaires démarrent avec `status = 'pending'`. Le navigateur ne peut pas changer les statuts de modération.
- Une contrainte garantit un seul vote par membre et par participation.
- Le compteur public des votes est stocké dans `entries.vote_count` et mis à jour par un trigger dans le schéma non exposé `private`. Aucune vue publique privilégiée n’est utilisée.
- Un helper `SECURITY DEFINER` existe uniquement dans `private`, avec `search_path` vide, vérification de `auth.uid()` et exécution révoquée aux rôles publics.
- Limites serveur : 5 punchlines par compte sur 24 heures, 20 commentaires par heure. Les vérifications sont sérialisées avec un verrou transactionnel.
- Les dates de création sont produites par PostgreSQL.
- Les thèmes ne sont lisibles que lorsque `is_active`, `opens_at` et `closes_at` autorisent l’accès.

Les vérifications SQL confirment actuellement que `anon` ne peut effectuer aucune opération SELECT/INSERT/UPDATE/DELETE sur les huit tables. Les conseillers Supabase ne remontent aucune alerte de sécurité ou de santé. Les alertes performance restantes concernent des index non encore utilisés sur une base vide.

## SMS Congo et international

Le formulaire accepte les numéros E.164, avec le Congo (+242) en premier et une saisie internationale libre. Le projet ne possède encore aucun fournisseur SMS configuré. Twilio affiche actuellement 0,3371 USD par segment SMS sortant vers le Congo et des règles d’expéditeur particulières ; Vonage publie également des restrictions Sender ID sur MTN. Aucun abonnement n’a été lancé. Voir [guide SMS](CONFIGURATION.md) et ne pas activer avant un test +242 sur MTN/Airtel et un accord sur les coûts.

## État de l’interface

Les menus Battles, Classement et Mon profil sont verrouillés avant connexion et acceptation de la politique. La démonstration locale est conservée séparément et clairement identifiée.

**Le lancement public n’est pas encore prêt :**
- SMTP personnalisé requis pour les e-mails destinés au public.
- Fournisseur SMS requis pour l’OTP téléphone.
- CAPTCHA et limites OTP à configurer pour maîtriser les coûts SMS.
- L’identité et le contact du responsable du traitement restent à compléter dans la notice.
- La notice doit faire l’objet d’une vérification juridique avant un lancement en République du Congo et à l’international.
- Une interface de modération protégée reste à construire.

## Audit réutilisable

Le notebook SQL [Punchi Battle — audit continu](https://supabase.com/dashboard/project/ppuhpuuuxohokuzfctpq/explorer/notebook/409399d0-c7c0-4b40-a58c-7fa04c74025d) suit les volumes, RLS, policies, privilèges et compteurs. Un audit complémentaire « Membres & confidentialité » peut être utilisé pour contrôler les contacts, le registre de consentement et l’absence de droits anonymes.

## Tests à réaliser avant ouverture

1. Configurer URL du site, URL de redirection et SMTP.
2. Configurer le fournisseur SMS, ses gabarits, CAPTCHA et limites de fréquence ; vérifier les tarifs et pays desservis.
3. Tester inscription et confirmation e-mail.
4. Tester OTP SMS avec un numéro congolais et un numéro étranger.
5. Tester un compte qui n’a pas accepté la notice : il doit voir uniquement le portail/écran de consentement ; l’API doit refuser les données membre.
6. Tester l’acceptation de la notice et le déverrouillage des menus.
7. Tester deux comptes distincts, contacts privés, participation pending, vote, retrait du vote et signalement.
8. Tester effacement des coordonnées secondaires et procédure de suppression du compte.
9. Préparer sauvegardes, exports, rétention, gestion des incidents et modération.

## Fichiers et migrations

- `migrations/202611210001_punchi_battle_schema.sql` — schéma initial et RLS.
- `migrations/20261124095000_add_fk_owner_indexes.sql` — index de clés étrangères.
- `migrations/20261124121800_harden_write_paths_and_vote_totals.sql` — droits d’insertion limités et limites anti-spam.
- `migrations/20261124122000_replace_vote_view_with_private_counter.sql` — compteur de votes privé.
- `migrations/20261124123000_serialize_rate_limits.sql` — verrou transactionnel des limites.
- `migrations/20261124123500_filter_themes_by_open_window.sql` — visibilité des thèmes selon leurs fenêtres.
- `migrations/20261124122000_private_contact_details.sql` — coordonnées secondaires privées.
- `migrations/20261124130000_record_privacy_consent.sql` — registre append-only des consentements.
- `migrations/20261124131000_require_current_member_consent.sql` — consentement obligatoire dans les policies.
- `migrations/20261124131500_revoke_inherited_anon_privileges.sql` — suppression des privilèges anonymes hérités.
- `migrations/20261124132000_member_leaderboard_view.sql` — vue de classement `SECURITY INVOKER` respectant RLS.
- `migrations/20261124132500_add_member_leaderboard_rank.sql` — rang global réel, même au-delà du Top 50.
- `seed.sql` — six thèmes inactifs.
- `../supabase.js` — client navigateur épinglé à `@supabase/supabase-js@2.119.2`.
- `database.types.ts` — types TypeScript générés depuis le schéma live.
- `database.types.ts` — types TypeScript générés du schéma live (à régénérer après chaque migration).
- `CONFIGURATION.md` — réglages Auth/SMTP/SMS.
- `../politique-confidentialite.html` — notice provisoire à compléter.
