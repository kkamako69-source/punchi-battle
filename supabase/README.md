# Punchi Battle — backend Supabase

## État réel au 24 novembre 2026

Le projet Supabase `punchi-battle` a été créé dans `Specimens Org`, région `eu-west-3` (Paris). Le devis de création était de **0 USD/mois**. Cela ne couvre pas d’éventuels dépassements, services externes ni options futures : surveiller les quotas et la facturation.

- Projet : `ppuhpuuuxohokuzfctpq`
- API : https://ppuhpuuuxohokuzfctpq.supabase.co
- État observé : `ACTIVE_HEALTHY`
- PostgreSQL : version 17.12
- Migrations appliquées : schéma initial, index supplémentaires, privilèges/anti-spam, compteur privé des votes, verrouillage anti-concurrence et visibilité des thèmes selon leur fenêtre d’ouverture.
- 6 tables publiques avec RLS ; 16 policies ; 6 thèmes initiaux, tous inactifs.
- Aucun profil ni contenu utilisateur réel n’a été créé dans la base lors de cette revue.

## Architecture et sécurité

- Supabase Auth gère les identités ; aucun mot de passe n’est stocké dans une table publique.
- Le navigateur utilise uniquement la clé publishable (`sb_publishable_...`) dans `supabase.js`. Cette clé est publique par conception ; RLS et les privilèges SQL constituent la barrière d’accès. Aucun secret/service-role n’est dans le dépôt.
- Le profil est créé après connexion/confirmation par l’utilisateur lui-même via `profiles_insert_self` ; l’identifiant du profil doit être `auth.uid()`.
- Les participations et commentaires sont créés avec le statut `pending`. Le navigateur ne dispose pas du privilège SQL pour les publier, masquer ou modifier leur statut.
- Un seul vote est permis par compte et par punchline grâce à une contrainte unique.
- Les lignes de votes ne sont lisibles que par leur votant. Le total public est une colonne agrégée `entries.vote_count`, mise à jour par un déclencheur privé. Aucune vue publique privilégiée ne contourne RLS.
- Un helper `SECURITY DEFINER` est utilisé uniquement dans le schéma non exposé `private`, avec `search_path` vide, vérification de `auth.uid()` et droits d’exécution révoqués pour `PUBLIC`, `anon` et `authenticated`.
- Limites de publication côté base : 5 punchlines par compte sur 24 heures et 20 commentaires par heure. Un verrou transactionnel par compte et type de contenu sérialise les contrôles de limite pour résister aux envois simultanés. Les dates de création sont définies par PostgreSQL.

Après la dernière migration, les conseillers Supabase ne signalent aucune alerte de sécurité ni de santé. Les seules alertes performance restantes sont des index non encore utilisés sur une base vide ; elles sont informatives, pas des échecs.

## État de l’application

La page `index.html` dispose maintenant d’un espace en ligne : inscription/connexion, profil, lecture des thèmes actifs, envoi de punchlines en attente de modération, flux de contenus publiés et votes partagés. La maquette locale plus bas est conservée comme exemple et reste explicitement séparée.

**L’ouverture publique n’est pas encore complète.** Avant d’utiliser les inscriptions avec le grand public, configure les URLs d’authentification et un SMTP personnalisé selon [CONFIGURATION.md](CONFIGURATION.md). Le fournisseur d’e-mail intégré de Supabase est limité aux adresses autorisées de l’équipe et à 2 e-mails par heure ; il ne convient pas à un lancement public.

Les six thèmes restent inactifs. Cela empêche les soumissions avant que la modération et l’organisation soient prêtes. Le site affiche donc « aucun thème ouvert » jusqu’à l’activation volontaire d’un thème dans le tableau de bord.

## Audit réutilisable

Un notebook SQL en lecture seule est disponible dans le projet Supabase : [Punchi Battle — audit continu](https://supabase.com/dashboard/project/ppuhpuuuxohokuzfctpq/explorer/notebook/409399d0-c7c0-4b40-a58c-7fa04c74025d). Il regroupe les contrôles RLS, les politiques, les volumes, les thèmes, les privilèges d’insertion et la cohérence des compteurs de votes.

## Tests à effectuer avant lancement

1. Configurer URL du site, URL de redirection et SMTP.
2. Tester une inscription avec confirmation e-mail puis une reconnexion.
3. Tester l’isolation de deux comptes distincts et la lecture anonyme.
4. Tester la soumission pending, la modération et l’impossibilité de modifier le statut depuis le navigateur.
5. Tester deux votes sur la même punchline, le retrait d’un vote et le compteur agrégé.
6. Vérifier les limites anti-spam, les sauvegardes et les quotas Free.

## Fichiers

- `migrations/202611210001_punchi_battle_schema.sql` — tables, RLS et privilèges initiaux.
- `migrations/20261124095000_add_fk_owner_indexes.sql` — index supplémentaires.
- `migrations/20261124121800_harden_write_paths_and_vote_totals.sql` — droits d’insertion limités et limites anti-spam.
- `migrations/20261124122000_replace_vote_view_with_private_counter.sql` — compteur de votes privé.
- `migrations/20261124123000_serialize_rate_limits.sql` — verrou transactionnel des limites anti-spam.
- `migrations/20261124123500_filter_themes_by_open_window.sql` — lecture publique limitée aux thèmes réellement ouverts.
- `seed.sql` — thèmes de démarrage désactivés.
- `../supabase.js` — client navigateur épinglé à `@supabase/supabase-js@2.119.2`.
- `CONFIGURATION.md` — réglages de lancement dans Supabase.
- `../RESEARCH_AND_ROADMAP.md` — sources et évolutions envisagées.
