# Punchi Battle — L’Arène des Mots

Site web de présentation du concept **Punchi Battle** : des participants proposent des punchlines autour d’un thème et la communauté peut les comparer et voter.

## Fichiers
- `index.html` : interface principale.
- `main.css` : styles.
- `index.html1` : fichier de type copie/ancienne version ; le comparer à `index.html` avant de le supprimer.

## Tester le site
Ouvre `index.html` dans un navigateur pour une vérification visuelle. Les fonctions qui nécessitent un service distant, une connexion ou une base de données doivent être testées séparément.

## Publication
GitHub Pages est activé pour ce dépôt. Pour vérifier l’adresse exacte et la branche publiée, ouvre **Settings → Pages** dans GitHub.

## À vérifier avant une ouverture publique
- Tester sur mobile et ordinateur, y compris les formulaires et les liens.
- Confirmer si les votes et les comptes sont uniquement simulés côté navigateur ou reliés à un backend.
- Ajouter une validation serveur, une protection anti-abus et une politique de confidentialité si des comptes ou votes réels sont collectés.
- Conserver une copie/version de sauvegarde avant les changements qui touchent l’interface.

> État documenté : prototype front-end ; les fonctions de production doivent être validées avant de les présenter comme opérationnelles.

## Contrôle automatique

Le contrôle de structure HTML peut être lancé localement avec :

```sh
python tools/check_site.py
```

GitHub Actions lance aussi ce contrôle à chaque modification de la branche `main` et pour chaque pull request. Les avertissements (par exemple un fragment HTML ou une ressource locale introuvable) doivent être examinés ; un passage réussi ne remplace pas les tests dans un vrai navigateur.

## Données et sécurité

Le site est actuellement une démonstration locale : votes et participations ne sont pas encore partagés entre utilisateurs. Le schéma Supabase préparatoire est dans [supabase/migrations](supabase/migrations/202611210001_punchi_battle_schema.sql) et son guide est dans [supabase/README.md](supabase/README.md). Il doit être appliqué et testé dans un projet Supabase avant toute connexion du site. Ne publie jamais une clé `service_role` dans le navigateur.

La recherche technique et les sources de données candidates sont documentées dans [RESEARCH_AND_ROADMAP.md](RESEARCH_AND_ROADMAP.md).
