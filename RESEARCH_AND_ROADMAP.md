# Recherche technique et données — Punchi Battle

Dernière vérification documentaire : 24 novembre 2026.

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

Deux corpus de Bantu Languages Initiative sont disponibles sur Hugging Face et portent explicitement la licence CC-BY-4.0 :

- **LRSC — Lingala Read Speech Corpus** : https://huggingface.co/datasets/BantuLanguagesInitiative/LRSC. Environ 5,01 heures de parole lue et 2 940 énoncés avec transcription. C'est le point de départ le plus adapté pour tester une recherche vocale ou une transcription en Lingala.
- **CSRC — Congolese Speech Radio Corpus** : https://huggingface.co/datasets/BantuLanguagesInitiative/CSRC. Environ 97 779 segments et 690,35 heures de radio en Lingala, Kikongo et Tshiluba, sans transcriptions de référence. Il convient plutôt à l'apprentissage auto-supervisé et à l'adaptation acoustique ; le téléchargement est volumineux.

Ces corpus concernent la reconnaissance et la recherche vocale, pas la génération de punchlines. Ne pas les utiliser pour cloner la voix d'un locuteur. Avant toute utilisation, conserver l'attribution aux auteurs du dataset original et à Bantu Languages Initiative, vérifier la carte de chaque dataset, les conditions de consentement et les limites du corpus. Ne pas redistribuer l'audio sans vérifier les droits.

Sources : https://huggingface.co/datasets/BantuLanguagesInitiative/LRSC · https://huggingface.co/datasets/BantuLanguagesInitiative/CSRC

## Règles de données à conserver

- Ne pas aspirer des paroles protégées ni des commentaires privés pour alimenter la plateforme.
- Laisser chaque artiste publier ses propres textes et choisir la visibilité.
- Garder une piste de modération et un mécanisme de signalement.
- Ne pas stocker les mots de passe, numéros de paiement ou secrets d'API dans les tables accessibles au public.
- Séparer les données fictives de démo des données réelles.
- Ajouter des jeux de test synthétiques, clairement identifiés, plutôt que d'utiliser les données personnelles de vraies personnes.

## Prochaines étapes

1. Connecter un environnement de prévisualisation avec la seule clé publishable ; garder tout secret côté serveur.
2. Créer un flux d’authentification email avec confirmation et redirections explicites.
3. Remplacer progressivement les données locales par des lectures/écritures Supabase après tests RLS.
4. Mettre en place la modération côté serveur avant de publier les participations en attente.
5. Tester chaque politique avec un visiteur anonyme et deux comptes distincts, puis vérifier votes, retraits, signalements et permissions.
6. Préparer les exports, le contrôle des quotas et la procédure de sauvegarde avant l’ouverture au public.

## Catalogue musical et métadonnées : limites d'utilisation

Les sources audio sous licence Creative Commons ne sont pas automatiquement utilisables dans des clips commerciaux, des publicités ou des morceaux publiés. Il faut vérifier la licence de chaque fichier et conserver sa provenance.

- **MTG-Jamendo** : environ 55 000 pistes annotées avec des tags de style/ambiance. Les métadonnées sont CC BY-NC-SA 4.0 et l'ensemble est destiné à la recherche/non-commercial ; les enregistrements ont chacun leur licence. Ne pas l'utiliser comme banque sonore pour Smoke Party ou les clips monétisés sans autorisation écrite de Jamendo et validation des droits individuels.
- **Free Music Archive (FMA)** : un pack HF annonce 106 199 morceaux/segments, 8 104 heures et environ 593 GB. Les métadonnées du dataset sont CC BY 4.0 mais les pistes ont des licences variées. Le volume est trop élevé pour le prototype ; choisir seulement des fichiers individuels dont les licences permettent explicitement l'usage souhaité.
- Ces catalogues peuvent aider la recherche, la classification et le prototypage d'outils ; ils ne sont pas des sources de paroles ou de punchlines.

Sources candidates : https://mtg.github.io/mtg-jamendo-dataset/ · https://huggingface.co/datasets/benjamin-paine/free-music-archive-full

## Évolution et maintenance

- Préférer des métadonnées structurées sous CC0 (par exemple Wikidata) et un catalogue d'enregistrements avec licences individuelles.
- Conserver sur chaque ressource : URL source, auteur, date de récupération, langue, licence, attribution et preuve de permission.
- Dédupliquer les médias et mettre en cache les résultats côté serveur ; ne pas faire une requête API par visiteur.
- Prévoir backoff/exponential retry, limites par IP/utilisateur et une file de modération.
- Maintenir les jeux de test synthétiques distincts des créations et données personnelles des artistes.