# Configuration Supabase — Punchi Battle

Le shell membre, la base, les menus Arène/Classement/Profil et les contrôles de sécurité sont en place. Les services d’envoi d’e-mail et de SMS doivent toutefois être configurés par le propriétaire du compte ; aucun fournisseur tiers ni frais SMS n’ont été activés automatiquement.

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

Le site accepte les numéros au format E.164. Le Congo (+242) est proposé en premier, mais le membre peut sélectionner un indicatif courant ou saisir un autre numéro complet commençant par `+`. Le champ de coordonnées secondaires reste libre et accepte tout indicatif E.164 valide.

Dans **Authentication → Providers → Phone** :

1. Activer Phone.
2. Choisir un fournisseur SMS pris en charge par Supabase.
3. Ajouter ses identifiants et son modèle OTP.
4. Configurer une limite d’envoi, CAPTCHA et les alertes de dépenses.
5. Tester la livraison sur plusieurs réseaux congolais (notamment MTN et Airtel) et sur au moins un numéro étranger, avant d’ouvrir l’inscription au public.

La documentation Supabase du 16 novembre 2026 indique que l’authentification téléphone utilise des codes OTP transmis par SMS ou, pour certains fournisseurs, WhatsApp. Les fournisseurs SMS pris en charge cités sont MessageBird, Twilio, Vonage et TextLocal (communautaire). Par défaut, une nouvelle demande d’OTP est limitée à une par 60 secondes ; le code standard expire après une heure. Configure quand même CAPTCHA et des limites plus strictes pour réduire les abus et les coûts. La connexion par téléphone exige que l’utilisateur vérifie son numéro à chaque connexion. <https://supabase.com/docs/guides/auth/phone-login>

### Ce que j’ai vérifié pour le +242 (République du Congo)

- **Twilio :** sa page officielle affiche actuellement **0,3371 USD par segment SMS sortant** vers le Congo, hors éventuels frais de transport opérateur et hors variation tarifaire. Les messages sont facturés par segment, donc les SMS longs peuvent coûter plus cher. La même page indique que le SMS bidirectionnel n’est pas pris en charge. Les identifiants expéditeur alphanumériques sont soumis à des règles de pré-enregistrement ; les identifiants numériques dynamiques peuvent être remplacés ou filtrés notamment sur Airtel et MTN. Twilio recommande un Sender ID alphanumérique pré-enregistré ; sa page mentionne un délai de provisionnement pouvant atteindre environ trois semaines. <https://www.twilio.com/en-us/guidelines/cg/sms> · <https://www.twilio.com/en-us/sms/pricing/cg>
- **Vonage :** sa fiche Congo indique un Sender ID alphanumérique portant la marque, un pré-enregistrement obligatoire pour le réseau MTN, l’absence de Sender ID numérique standard et l’interdiction des expéditeurs génériques tels que INFO/SMS/NOTICE. Elle précise également que le trafic P2P est interdit. Vérifier par écrit que le cas d’usage OTP transactionnel et le routage MTN/Airtel sont acceptés avant toute activation. <https://api.support.vonage.com/hc/en-us/articles/7538554948628-Republic-of-the-Congo-SMS-Features-and-Restrictions>
- **MessageBird :** la documentation Supabase signale une intégration basée sur les anciennes API MessageBird ; un nouveau compte Bird peut ne pas être compatible avec ce connecteur. Ne pas choisir ce fournisseur sans test de bout en bout. <https://supabase.com/docs/guides/auth/phone-login>

Ces tarifs et règles sont des informations observées le 24 novembre 2026 et peuvent évoluer sans préavis. Le montant du fournisseur, les frais opérateur, taxes, re-tentatives et la disponibilité réelle sur chaque réseau doivent être confirmés avant achat. **Aucun fournisseur SMS ni abonnement payant n’a été activé dans ton projet.**

**Risque des numéros recyclés et SIM swap :** les opérateurs peuvent réattribuer un ancien numéro et les comptes téléphoniques sont exposés au SIM swap. Une adresse e-mail confirmée et contrôlée est recommandée comme moyen de contact alternatif. Avant de faire du téléphone le seul identifiant d’un compte, prévoir une MFA robuste et une procédure de récupération adaptée. Ne présente pas les coordonnées secondaires actuellement facultatives comme une récupération de compte : elles ne sont pas vérifiées indépendamment. <https://supabase.com/docs/guides/auth/passwords> · <https://supabase.com/docs/guides/auth/auth-mfa/phone>

Références :
- https://supabase.com/docs/guides/auth/phone-login
- https://supabase.com/docs/guides/auth/auth-mfa/phone
- https://www.itu.int/rec/T-REC-E.164

## 4. Récupération et gestion du compte

- La connexion par e-mail accepte le mot de passe déjà défini par le membre ; la limite de 12 caractères s’applique à la création et au changement de mot de passe, pas à la connexion des anciens comptes.
- « Mot de passe oublié ? » envoie un lien avec `resetPasswordForEmail`. Le chemin de redirection doit être autorisé dans **Authentication → URL Configuration** ; la page revient sur le même site avec le type de récupération dans le hash.
- L’écran de nouveau mot de passe exige 12 caractères minimum et une confirmation identique.
- Le profil permet au membre de modifier son pseudo, son nom d’affichage et sa biographie. Le pseudo reste unique.
- La récupération de compte par téléphone n’utilise pas les coordonnées secondaires non vérifiées. Ne pas présenter ces champs comme un secours de compte.

## 5. Consentement et accès membre

La version courante est `PB-PRIVACY-2026-11-V1`. L’utilisateur doit l’accepter pendant l’inscription ou à sa prochaine connexion. La base enregistre cette acceptation dans `account_consents` ; les policies RLS vérifient ce registre avant l’accès aux données membre.

La notice [politique-confidentialite.html](../politique-confidentialite.html) est provisoire : l’identité légale, l’adresse et l’adresse de contact du responsable du traitement doivent être renseignées avant la publication. Faire vérifier les formalités et transferts internationaux applicables par un conseil compétent en République du Congo. Ne pas annoncer une conformité juridique avant cette validation.

Le projet se trouve dans la région spécifique eu-west-3 (Paris). La région choisie détermine l’emplacement principal des données, mais ne constitue pas à elle seule une preuve de conformité et ne garantit pas que tout traitement opérationnel reste dans cette région. Le changement de région nécessite une migration vers un nouveau projet.

## 6. Ouvrir un thème quand la modération est prête

Les six thèmes sont volontairement inactifs. Exemple à adapter dans SQL Editor, lorsque la battle est organisée :

```sql
update public.themes
set is_active = true,
    opens_at = now(),
    closes_at = now() + interval '7 days'
where slug = 'la-trahison';
```

Cette opération n’est pas exécutée par le site. Seul un responsable ayant les droits d’administration doit l’effectuer.

## 7. Modération

Les nouvelles punchlines restent en `pending`. Le navigateur ne peut pas publier, masquer ou changer le statut. Une interface de modération protégée doit être créée avant un lancement plus large. En attendant, un responsable peut publier une participation précise depuis SQL Editor après vérification.

## 8. Clés et secrets

- `supabase.js` contient uniquement l’URL du projet et une clé `sb_publishable_...`.
- Ne jamais ajouter `sb_secret_...`, `service_role`, un jeton d’administration, mot de passe PostgreSQL ou secret SMTP/SMS au dépôt.
- Les coordonnées secondaires sont privées et ne sont jamais renvoyées dans le profil public.
