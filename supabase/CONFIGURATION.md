# Configuration Supabase — Punchi Battle

Le code, la base et les contrôles de sécurité sont en place. Les services d’envoi d’e-mail et de SMS doivent toutefois être configurés par le propriétaire du compte ; aucun fournisseur tiers ni frais SMS n’ont été activés automatiquement.

## 1. URL du site et redirection e-mail

Dans **Authentication → URL Configuration** :

- Site URL : `https://kkamako69-source.github.io/punchi-battle/`
- Additional Redirect URLs : `https://kkamako69-source.github.io/punchi-battle/`

Le client passe cette URL comme `emailRedirectTo`. Ne pas ajouter de wildcard trop large.

## 2. E-mail

Dans **Authentication → Providers → Email** :

- Activer Email + Password.
- Garder la confirmation de l’adresse e-mail activée.
- Vérifier le modèle de confirmation et la destination de retour.

Le SMTP intégré de Supabase est limité aux adresses autorisées de l’équipe et à 2 e-mails par heure par projet. Pour inscrire le public, configurer un SMTP personnalisé dans les paramètres Authentication/SMTP (par exemple Resend, Brevo, Amazon SES ou Postmark). Vérifier les tarifs et les conditions de chaque fournisseur. Ne jamais déposer la clé SMTP dans GitHub ou dans le JavaScript navigateur.

Documentation :
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/rate-limits

## 3. Téléphone international et SMS OTP

Le site accepte les numéros au format E.164, avec indicatifs internationaux : +242 (République du Congo), +243 (RDC), +33 (France), etc. Le pays par défaut des coordonnées secondaires est CG, mais il ne restreint pas les numéros autorisés.

Dans **Authentication → Providers → Phone** :

1. Activer Phone.
2. Choisir un fournisseur SMS pris en charge (Twilio, Vonage, MessageBird ou TextLocal).
3. Ajouter les identifiants du fournisseur et son gabarit SMS avec la variable OTP correcte.
4. Configurer un délai d’envoi, les limites de fréquence et CAPTCHA.
5. Tester d’abord avec les numéros/codes de test prévus par Supabase ; n’utiliser un fournisseur en production qu’après vérification des prix et de la livraison dans les pays ciblés.

La documentation Supabase consultée le 24 novembre 2026 indique par défaut un nouvel OTP possible toutes les 60 secondes et un code valable une heure (la configuration du fournisseur peut modifier certains paramètres). Les messages SMS peuvent entraîner des frais à chaque envoi. Vérifier les tarifs par pays, notamment pour les numéros congolais et ceux de la diaspora.

**Risque des numéros recyclés :** les opérateurs peuvent réattribuer un ancien numéro. Un numéro vérifié n’est pas un identifiant permanent. Encourage les membres à garder une adresse e-mail qu’ils contrôlent. Ne présente pas les coordonnées secondaires actuellement facultatives comme une récupération de compte : elles ne sont pas encore vérifiées indépendamment. Pour renforcer les comptes exclusivement téléphoniques, prévoir un second facteur ou une méthode de récupération fiable.

Références :
- https://supabase.com/docs/guides/auth/phone-login
- https://supabase.com/docs/guides/auth/auth-mfa/phone
- https://www.itu.int/rec/T-REC-E.164

## 4. Consentement et accès membre

La version courante est `PB-PRIVACY-2026-11-V1`. L’utilisateur doit l’accepter pendant l’inscription ou à sa prochaine connexion. La base enregistre cette acceptation dans `account_consents` ; les policies RLS vérifient ce registre avant l’accès aux données membre.

La notice [politique-confidentialite.html](../politique-confidentialite.html) est provisoire : l’identité légale, l’adresse et l’adresse de contact du responsable du traitement doivent être renseignées avant la publication. Faire vérifier les formalités et transferts internationaux applicables par un conseil compétent en République du Congo. Ne pas annoncer une conformité juridique avant cette validation.

Le projet se trouve dans la région spécifique eu-west-3 (Paris). La région choisie détermine l’emplacement principal des données, mais ne constitue pas à elle seule une preuve de conformité et ne garantit pas que tout traitement opérationnel reste dans cette région. Le changement de région nécessite une migration vers un nouveau projet.

## 5. Ouvrir un thème quand la modération est prête

Les six thèmes sont volontairement inactifs. Exemple à adapter dans SQL Editor, lorsque la battle est organisée :

```sql
update public.themes
set is_active = true,
    opens_at = now(),
    closes_at = now() + interval '7 days'
where slug = 'la-trahison';
```

Cette opération n’est pas exécutée par le site. Seul un responsable ayant les droits d’administration doit l’effectuer.

## 6. Modération

Les nouvelles punchlines restent en `pending`. Le navigateur ne peut pas publier, masquer ou changer le statut. Une interface de modération protégée doit être créée avant un lancement plus large. En attendant, un responsable peut publier une participation précise depuis SQL Editor après vérification.

## 7. Clés et secrets

- `supabase.js` contient uniquement l’URL du projet et une clé `sb_publishable_...`.
- Ne jamais ajouter `sb_secret_...`, `service_role`, un jeton d’administration, mot de passe PostgreSQL ou secret SMTP/SMS au dépôt.
- Les coordonnées secondaires sont privées et ne sont jamais renvoyées dans le profil public.
