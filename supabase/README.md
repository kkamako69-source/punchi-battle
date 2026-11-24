# Punchi Battle — backend Supabase

## État réel au 24 novembre 2026

Le projet Supabase `punchi-battle` a été créé dans l’organisation `Specimens Org`, région `eu-west-3` (Paris), avec un devis de création de projet à **0 USD/mois**. Le montant d’un projet à 0 USD ne signifie pas que toutes les consommations, dépassements ou options futures seront gratuits : surveiller les quotas et le tableau de facturation avant de monter en charge.

- Référence du projet : `ppuhpuuuxohokuzfctpq`
- URL : https://ppuhpuuuxohokuzfctpq.supabase.co
- État observé : `ACTIVE_HEALTHY`
- Migrations appliquées : schéma initial, puis index propriétaires votes/commentaires.
- Tables déployées : `profiles`, `themes`, `entries`, `votes`, `comments`, `reports`.
- RLS activée sur les six tables.
- Catalogue initial : 6 thèmes insérés, tous inactifs tant qu’un responsable ne les active pas.
- La base ne contient encore aucun profil, participation, vote, commentaire ou signalement réel.

## Architecture

- Supabase Auth gère les comptes ; aucun mot de passe ne doit être stocké dans une table publique.
- Les profils sont créés côté client après inscription/première connexion au moyen de `profiles_insert_self`, qui exige `id = auth.uid()`. Aucun trigger `SECURITY DEFINER` public n’est utilisé.
- Les participations et commentaires sont créés en attente de modération.
- Les changements de statut vers `published` ou `hidden`, l’ouverture des thèmes et les opérations de modération doivent venir d’un backend fiable, pas du navigateur.
- Une contrainte unique garantit un seul vote par utilisateur et par participation. La politique autorise à retirer son vote.
- Les clés secrètes/service-role, mots de passe de base de données et jetons privés ne doivent jamais être ajoutés au dépôt ou aux scripts publics.

## Sécurité et privilèges

RLS est activée sur toutes les tables publiques. Les privilèges SQL sont accordés explicitement, notamment pour les nouvelles tables exposées via l’API Data de Supabase. La documentation Supabase a modifié le comportement d’exposition des nouvelles tables publiques à partir du 30 octobre 2026 ; nos migrations donnent les `GRANT` minimaux requis. <https://supabase.com/changelog>

Après les migrations, les conseillers Supabase n’affichaient aucune alerte de sécurité ni de santé. Le conseiller de performance a signalé uniquement des index non encore utilisés ; ils sont attendus sur une base nouvellement créée avec des tables vides. Les index pour les clés étrangères de votes/commentaires ont été ajoutés.

## État de l’interface

Le site GitHub Pages est **toujours une démonstration locale**. La création du backend ne connecte pas automatiquement les formulaires HTML. N’utilise pas encore l’interface comme système d’authentification ou de vote public.

L’intégration front-end devra utiliser uniquement l’URL du projet et une clé `sb_publishable_...`. Ne jamais utiliser la clé `service_role`/secret dans le navigateur. Avant le passage en public, tester :
1. lecture anonyme limitée aux thèmes actifs, participations publiées et commentaires publiés ;
2. deux comptes distincts, création du profil lié à `auth.uid()` et isolation de leurs données ;
3. tentative de voter deux fois pour une participation ;
4. retrait du vote, créations en attente, règles de signalement et absence d’accès au statut de modération ;
5. confirmation e-mail, redirections et session navigateur ;
6. sauvegardes/export et limites du niveau gratuit.

## Fichiers

- `migrations/202611210001_punchi_battle_schema.sql` — schéma initial et RLS.
- `migrations/20261124095000_add_fk_owner_indexes.sql` — index complémentaires.
- `seed.sql` — thèmes de démarrage désactivés.
- `../RESEARCH_AND_ROADMAP.md` — sources de données, contraintes et plan.
- `../tools/check_supabase_schema.py` — vérification statique (ne remplace pas les tests RLS réels).
