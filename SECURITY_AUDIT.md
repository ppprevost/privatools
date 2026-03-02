# Audit de securite -- PrivaTools

**Date** : 2026-03-02
**Stack** : Astro 5 + React 19, traitement client-side (Web Workers), endpoints SSR (`/api/contact`, `/api/comments`, `/api/admin/comments`)

---

## CRITIQUE

### #1 -- Credentials base de donnees inlines dans le build

Le `DATABASE_URL` (Neon PostgreSQL) avec user/password est inline en dur dans le fichier compile `dist/server/pages/api/contact.astro.mjs`. Quiconque accede au filesystem du serveur ou a l'image Docker recupere les credentials en clair.

**Fichier** : `.env`, `dist/server/pages/api/contact.astro.mjs`
**Fix** : Utiliser `process.env.DATABASE_URL` au runtime. Rotation immediate du mot de passe Neon.

---

## HIGH

### #2 -- Pas de protection CSRF sur `/api/contact`

L'endpoint accepte des POST JSON sans validation d'Origin ni token CSRF. N'importe quel site tiers peut soumettre des requetes.

**Fichier** : `src/pages/api/contact.ts`
**Fix** : Verifier le header `Origin` cote serveur.

### #3 -- Pas de rate limiting sur `/api/contact`

Aucune limite de debit. Un attaquant peut flooder la base avec des milliers d'entrees, generer des couts et saturer le connection pool.

**Fichier** : `src/pages/api/contact.ts`
**Fix** : Rate limiting par IP (in-memory Map avec TTL) + honeypot ou captcha.

### #4 -- Pas de Content Security Policy (CSP)

Aucun header CSP configure nulle part (ni meta, ni nginx, ni Astro middleware). Pas de restriction sur les scripts et ressources chargeables.

**Fichier** : `nginx.conf`, `src/layouts/BaseLayout.astro`
**Fix** : Ajouter un CSP via middleware Astro.

---

## MEDIUM

### #5 -- Aucun header de securite standard

Headers manquants : `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`. Le site est framable (clickjacking), pas de HSTS, MIME sniffing possible.

**Fichier** : `nginx.conf`, middleware Astro absent
**Fix** : Ajouter tous les headers via middleware Astro.

### #6 -- Pas de validation de longueur sur le formulaire contact

Les champs `name`, `email`, `message` n'ont pas de limite de taille. Un attaquant peut envoyer un message de plusieurs Mo.

**Fichier** : `src/pages/api/contact.ts`
**Fix** : Limiter name (200 chars), email (320 chars), message (5000 chars).

### #7 -- Pas de limite de taille sur les fichiers uploades

Le DropZone accepte des fichiers sans verification de taille. Un fichier de 2 GB crash l'onglet navigateur au moment du `arrayBuffer()`.

**Fichier** : `src/components/ui/DropZone.tsx`
**Fix** : Rejeter les fichiers > 200 MB avec un message utilisateur.

### #8 -- Service worker : cache sans validation d'integrite

Le SW cache toute URL contenant "onnx" ou "@imgly" (matching trop loose). Pas de SRI, pas de limite de taille du cache, pas d'expiration.

**Fichier** : `public/sw.js`
**Fix** : Whitelister les hostnames CDN, ajouter une limite de cache.

---

## LOW

### #9 -- Workers sans validation des messages entrants

Les 8 workers ne valident pas le type des donnees recues (ArrayBuffer attendu, options attendues). Un bug cote main thread produit des erreurs silencieuses.

**Fichiers** : `src/lib/workers/*.ts`

### #10 -- Blob URLs pas revoquees (memory leaks)

Certains composants creent un nouveau blob URL sans revoquer le precedent (CropImage, RemoveBackground, CompressImage).

**Fichiers** : `src/components/tools/CropImage.tsx`, `RemoveBackground.tsx`, `CompressImage.tsx`

### #11 -- console.error peut leaker des infos sensibles

`console.error('Contact form error:', e)` log l'objet erreur complet (stack, connection string, query).

**Fichier** : `src/pages/api/contact.ts`

### #12 -- Config Astro confuse

`output: 'static'` avec un adapter Node est inhabituel. Devrait etre `'hybrid'`.

**Fichier** : `astro.config.mjs`

### #13 -- Dockerfile copie tout node_modules en runtime

Les devDependencies sont presentes dans l'image finale, augmentant la surface d'attaque.

**Fichier** : `Dockerfile`

---

## Corriges

### #2 -- CSRF sur `/api/contact` -- CORRIGE
Verification du header `Origin` contre une whitelist (`ALLOWED_ORIGINS`) dans `requireAuth()`.
**Fichier** : `src/lib/api-helpers.ts`

### #3 -- Rate limiting sur `/api/contact` -- CORRIGE
Rate limiting par IP (5 requetes/min) en memoire. Captcha Cloudflare Turnstile ajoute sur le formulaire contact et les commentaires.
**Fichiers** : `src/pages/api/contact.ts`, `src/components/tools/ContactForm.tsx`

### #6 -- Validation de longueur -- CORRIGE
Limites ajoutees : name (200), email (320), message (5000). Commentaires : name (3-100), content (10-2000).
**Fichiers** : `src/pages/api/contact.ts`, `src/pages/api/comments.ts`

### Route admin `/api/admin/comments` -- SECURISEE
- Authentification par `Authorization: Bearer <ADMIN_SECRET>` (variable d'env, 256 bits)
- Comparaison timing-safe du secret pour prevenir les timing attacks
- Rate limiting : 10 req/min par IP, lockout 15 min apres 20 tentatives (anti-bruteforce)
- Le rate limit s'applique AVANT la verification du secret (pas de leak de timing sur les 429)
- Endpoints GET (lister), PATCH (approuver/rejeter), DELETE (supprimer)
- Les commentaires ne sont visibles publiquement qu'apres approbation (`approved = true`)
**Fichier** : `src/pages/api/admin/comments.ts`

---

## Positif

- 0 vulnerabilite npm (`pnpm audit` clean)
- Aucun XSS (pas de `dangerouslySetInnerHTML`, `innerHTML`, `eval`)
- SQL injection mitigee (tagged template literals Neon)
- Aucun script tiers / tracking (hors Cloudflare Turnstile)
- Pas de source maps en production
- Cloudflare Turnstile sur formulaire contact et commentaires
- Moderation des commentaires avant publication
- Comparaisons timing-safe pour les secrets (API key mobile, admin secret)
