# Configuration Supabase — Punchi Battle

Le code public et la base sont prêts pour un test d’intégration. Quelques paramètres ne peuvent pas être changés via les outils de dépôt et doivent être confirmés dans le tableau de bord Supabase.

## 1. URL du site et redirection

Dans **Authentication → URL Configuration** :

- Site URL : `https://kkamako69-source.github.io/punchi-battle/`
- Additional Redirect URLs : `https://kkamako69-source.github.io/punchi-battle/`

Le client transmet cette URL lors de l’inscription (`emailRedirectTo`). Supabase n’accepte une redirection que si elle correspond à une URL autorisée. Ne mets pas une règle wildcard plus large que nécessaire.

## 2. Fournisseur e-mail

Dans **Authentication → Providers → Email** :

- Activer Email + Password.
- Garder la confirmation de l’adresse e-mail activée.
- Vérifier que le modèle de confirmation ramène l’utilisateur vers l’URL configurée.

**Limite importante :** le SMTP intégré Supabase sert aux essais. Il n’envoie qu’aux adresses e-mail autorisées des membres de l’organisation et est limité à 2 e-mails/heure par projet. Pour accepter les inscriptions du public, il faudra configurer un SMTP personnalisé (par exemple Resend, Brevo, Amazon SES ou Postmark) dans **Project Settings / Authentication → SMTP**. N’enregistre aucun mot de passe SMTP dans GitHub ou dans le navigateur.

Références :
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/rate-limits

## 3. Ouvrir un thème quand la modération est prête

Les six thèmes ont volontairement `is_active = false`. Ne les active pas avant d’avoir préparé la modération et les règles de la battle. Quand tu es prêt, ouvre SQL Editor dans Supabase et active un thème précis, avec une plage horaire réelle. Exemple de commande à adapter au jour d’ouverture :

```sql
update public.themes
set is_active = true,
    opens_at = now(),
    closes_at = now() + interval '7 days'
where slug = 'la-trahison';
```

Cette opération n’est pas exécutée automatiquement par le site. Seul un responsable disposant de droits d’administration doit l’effectuer.

## 4. Modération des participations

Les nouvelles punchlines apparaissent avec `status = 'pending'`. Le navigateur ne possède pas de permission pour modifier ce statut. Après vérification du contenu, un modérateur peut publier une participation depuis le SQL Editor en ciblant son identifiant précis. Une interface de modération dédiée et protégée devra être développée avant une exploitation plus large.

## 5. Clés et secrets

- `supabase.js` contient l’URL du projet et une clé `sb_publishable_...`, conçue pour le navigateur.
- N’ajoute jamais `sb_secret_...`, `service_role`, un jeton d’administration ou le mot de passe PostgreSQL au dépôt.
- N’active pas d’accès anonyme d’écriture : les policies exigent un utilisateur authentifié.

## 6. Contrôle

Après les réglages, teste avec deux adresses e-mail différentes : inscription, confirmation, profil, vote, retrait du vote et soumission. Avec le SMTP intégré, les adresses doivent être autorisées pour l’équipe ; pour tout autre utilisateur, configure d’abord ton fournisseur SMTP.
