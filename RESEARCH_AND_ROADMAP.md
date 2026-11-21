# Recherche technique et données — Punchi Battle

Date de vérification : 21 novembre 2026.

## Choix recommandé pour le premier backend

**Supabase (PostgreSQL + Auth + Row Level Security)** est le meilleur point de départ pour le prototype Punchi Battle :
- les liens entre profils, thèmes, participations, votes et commentaires sont relationnels ;
- Auth gère l'identité et les sessions ;
- PostgreSQL impose des contraintes d'unicité (un vote par personne et par participation) ;
- RLS applique les autorisations directement au niveau des lignes.

Références officielles :
- Supabase Database : https://supabase.com/docs/guides/database/overview
- Supabase Auth : https://supabase.com/docs/guides/auth
- RLS : https://supabase.com/docs/guides/database/postgres/row-level-security
- Clés API et sécurité : https://supabase.com/docs/guides/api/api-keys

**Budget :** le tarif Free affiché lors de la recherche comprend une base Postgres de 500 MB et peut mettre en pause les projets inactifs après une semaine. Cela convient à une maquette ou un lancement très limité, à condition de prévoir des exports de sauvegarde et de contrôler les quotas. Voir https://supabase.com/pricing.

## Sécurité des comptes

Ne conserve jamais les mots de passe dans `localStorage` ni dans une table publique. Pour une authentification maison côté serveur, OWASP recommande des fonctions lentes et salées comme Argon2id, scrypt ou bcrypt ; jamais un simple hachage rapide. Pour Punchi Battle, le choix prioritaire est de déléguer l'identité à Supabase Auth plutôt que de recréer ce mécanisme.

Références :
- OWASP Password Storage : https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Authentication : https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

## Jeu de données linguistique candidat — Lingala

La **Lingala Read Speech Corpus (LRSC)** publiée sur Hugging Face par BantuLanguagesInitiative indique environ 5,01 heures de parole lue, 2 940 énoncés et 31 locuteurs. Elle peut servir de point de départ pour une future fonction vocale en Lingala (navigation dictée, recherche ou transcription), pas pour inventer des punchlines ni pour remplir la base communautaire.

Avant tout usage : relire la fiche de données, la licence applicable et les conditions de la publication originale, vérifier les droits et le consentement des locuteurs, conserver l'attribution et ne pas redistribuer les enregistrements sans autorisation.

Référence : https://huggingface.co/datasets/BantuLanguagesInitiative/LRSC

## Règles de données à conserver

- Ne pas aspirer des paroles protégées ni des commentaires privés pour alimenter la plateforme.
- Laisser chaque artiste publier ses propres textes et choisir la visibilité.
- Garder une piste de modération et un mécanisme de signalement.
- Ne pas stocker les mots de passe, numéros de paiement ou secrets d'API dans les tables accessibles au public.
- Séparer les données fictives de démo des données réelles.
- Ajouter des jeux de test synthétiques, clairement identifiés, plutôt que d'utiliser les données personnelles de vraies personnes.

## Prochaines étapes

1. Créer le projet Supabase et appliquer la migration SQL.
2. Connecter un environnement de prévisualisation avec la seule clé publishable.
3. Remplacer progressivement les données locales par des lectures/écritures Supabase.
4. Tester chaque politique RLS avec un compte anonyme et deux comptes utilisateurs distincts.
5. Ne basculer le domaine public qu'après tests d'authentification, modération et sauvegarde.
