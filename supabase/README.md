# Punchi Battle — base de données Supabase

Cette configuration prépare le passage du prototype statique à une application avec comptes, thèmes, participations, votes et commentaires persistants.

## Ce qui est préparé

- PostgreSQL via Supabase.
- Authentification gérée par Supabase Auth (pas de mots de passe maison dans le navigateur).
- Tables `profiles`, `themes`, `entries`, `votes` et `comments`.
- Règles Row Level Security (RLS) sur toutes les tables.
- Un seul vote par utilisateur et par punchline.
- Les participations et commentaires commencent en attente de modération.
- Les données privées d'authentification ne sont pas copiées dans les profils publics.

## Mise en place manuelle

1. Crée un projet Supabase depuis https://supabase.com.
2. Ouvre **SQL Editor**.
3. Copie le contenu de `migrations/202611210001_punchi_battle_schema.sql` et exécute-le.
4. Dans **Authentication → Providers**, configure au minimum l'email. Configure aussi les URLs de redirection de ton futur site.
5. Vérifie les tables et les policies RLS dans le tableau de bord.

## Connexion du site

Le dépôt actuel utilise encore des données de démonstration dans le navigateur. Le SQL seul ne relie pas le site à la base.

Pour connecter le front-end, il faudra ensuite ajouter le client Supabase et utiliser uniquement l'URL du projet et la clé **publishable**. Ne mets jamais une clé `service_role`, un mot de passe de base de données ou un secret serveur dans un fichier HTML/JavaScript public.

## Modération

Les changements de statut vers `published` ou `hidden`, la gestion des thèmes et les actions de modération doivent être exécutés depuis un backend / une Edge Function protégée. Ne donne pas les permissions d'administration au navigateur.

## Budget et sauvegardes

Le niveau gratuit est adapté aux essais, pas à une garantie d'exploitation sans interruption. Supabase annonce notamment une base de 500 MB sur Free et une mise en pause après une semaine d'inactivité ; vérifie toujours les limites à jour avant un lancement. Prévois des exports de sauvegarde et un budget de montée en charge si l'audience augmente.

## Contrôles après exécution

- Un visiteur anonyme ne peut lire que les thèmes actifs, les participations publiées et les commentaires publiés.
- Un utilisateur connecté ne peut modifier que son profil et ses propres participations en attente.
- Un utilisateur ne peut voter qu'une fois par participation.
- Les clés privilégiées ne sont jamais présentes dans le code public.
