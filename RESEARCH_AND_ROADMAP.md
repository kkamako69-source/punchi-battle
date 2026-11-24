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

## État du backend au 24 novembre 2026

Le projet Supabase `punchi-battle` a été créé dans `Specimens Org`, région `eu-west-3` (Paris), avec un devis initial de création à **0 USD/mois**. L’état observé est `ACTIVE_HEALTHY`. Les deux migrations sont appliquées ; six tables existent et RLS est activée sur chacune. Le seed contient six thèmes, tous inactifs. Aucun profil, vote, commentaire ou texte utilisateur n’est encore présent.

Les conseillers Supabase ne signalent pas d’alerte de sécurité ni de santé. Les alertes de performance restantes sont uniquement des index non encore utilisés dans une base vide ; deux index couvrant les clés propriétaires des votes et commentaires ont été ajoutés pour éviter des scans lors des consultations par utilisateur.

**Important :** la page GitHub Pages reste une démonstration locale. Le fait que la base existe n’active pas encore l’inscription, les votes ou les publications partagés. L’intégration front-end doit être faite et testée avec deux comptes et un visiteur anonyme avant ouverture publique.
## Prochaines étapes

1. Configurer l’URL du site, l’URL de redirection et un SMTP personnalisé pour les inscriptions du public.
2. Tester l’authentification e-mail avec deux comptes réels et la confirmation des adresses.
3. Activer un thème uniquement quand les règles et la modération sont prêtes.
4. Créer une interface de modération protégée avant l’ouverture plus large.
5. Tester la lecture anonyme, la séparation des comptes, les votes, leur retrait et les compteurs publics.
6. Préparer les sauvegardes, contrôler les quotas et vérifier les journaux après les premières connexions.

## Catalogue musical et métadonnées : limites d'utilisation

Les sources audio sous licence Creative Commons ne sont pas automatiquement utilisables dans des clips commerciaux, des publicités ou des morceaux publiés. Il faut vérifier la licence de chaque fichier et conserver sa provenance.

- **MTG-Jamendo** : environ 55 000 pistes annotées avec des tags de style/ambiance. Les métadonnées sont CC BY-NC-SA 4.0 et l'ensemble est destiné à la recherche/non-commercial ; les enregistrements ont chacun leur licence. Ne pas l'utiliser comme banque sonore pour Smoke Party ou les clips monétisés sans autorisation écrite de Jamendo et validation des droits individuels.
- **Free Music Archive (FMA)** : un pack HF annonce 106 199 morceaux/segments, 8 104 heures et environ 593 GB. Les métadonnées du dataset sont CC BY 4.0 mais les pistes ont des licences variées. Le volume est trop élevé pour le prototype ; choisir seulement des fichiers individuels dont les licences permettent explicitement l'usage souhaité.
- Ces catalogues peuvent aider la recherche, la classification et le prototypage d'outils ; ils ne sont pas des sources de paroles ou de punchlines.

Sources candidates : https://mtg.github.io/mtg-jamendo-dataset/ · https://huggingface.co/datasets/benjamin-paine/free-music-archive-full


## État actualisé au 24 novembre 2026 — parcours membre et contacts

Le backend a maintenant **10 migrations appliquées**, huit tables avec RLS et 22 policies. Les rôles `PUBLIC` et `anon` n’ont aucun privilège SQL sur les tables membres. Les opérations sont ouvertes aux membres authentifiés seulement lorsque leur consentement courant figure dans `account_consents`.

Le parcours comprend :
- inscription/connexion e-mail + mot de passe, avec confirmation e-mail ;
- inscription/connexion par OTP SMS en E.164, du Congo ou de tout autre pays ;
- verrouillage des menus Battles, Classement et Mon profil avant authentification et consentement ;
- stockage séparé des coordonnées secondaires dans `profile_contacts`, visible uniquement par leur propriétaire ;
- enregistrement append-only de la version de la politique acceptée ;
- contrôles CI du HTML, des références DOM, du module Supabase, des privilèges privés et des formulaires.

**Services à configurer avant le lancement :** SMTP personnalisé, fournisseur SMS, CAPTCHA et rate limits. Aucun fournisseur SMS payant n’est activé. Le téléphone peut être recyclé ; une adresse e-mail contrôlée est recommandée pour limiter le risque de perte d’accès. Les coordonnées secondaires restent facultatives et non vérifiées.

**Vie privée / droit :** la notice est provisoire et ne doit pas être présentée comme une preuve de conformité. Le responsable doit compléter son identité et son contact, puis vérifier les obligations de la loi congolaise 29-2019, la CNPD créée par la loi 5-2025 et les transferts transfrontaliers. Le projet Supabase est dans eu-west-3 Paris : le choix de région encadre l’emplacement principal, mais n’est pas à lui seul une garantie de conformité ni d’exclusivité du traitement dans cette région.

Sources officielles :
- Loi n° 29-2019 (Journal officiel SGG) : https://www.sgg.cg/JO/2019/congo-jo-2019-45.pdf
- Loi n° 5-2025 (CNPD) : https://www.oarh.cg/wp-content/uploads/2026/09/Loi-n%C2%B05-2025-du-29-mars-2025-portant-creation-de-la-commission-nationale-pour-la-protection-des-donnees-a-caractere-personnel.pdf
- Décret n° 2025-538 (nomination des membres CNPD) : https://www.sgg.cg/JO/2026/congo-jo-2026-5-2.pdf
- Authentification téléphone Supabase : https://supabase.com/docs/guides/auth/phone-login
- Risque de réattribution des numéros : https://supabase.com/docs/guides/auth/passwords
- Résidence et traitement des données Supabase : https://supabase.com/docs/guides/platform/regions

## Évolution et maintenance

- Préférer des métadonnées structurées sous CC0 (par exemple Wikidata) et un catalogue d'enregistrements avec licences individuelles.
- Conserver sur chaque ressource : URL source, auteur, date de récupération, langue, licence, attribution et preuve de permission.
- Dédupliquer les médias et mettre en cache les résultats côté serveur ; ne pas faire une requête API par visiteur.
- Prévoir backoff/exponential retry, limites par IP/utilisateur et une file de modération.
- Maintenir les jeux de test synthétiques distincts des créations et données personnelles des artistes.