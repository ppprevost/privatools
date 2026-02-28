# Audit SEO -- PrivaTools

**Date** : 2026-02-28
**Stack** : Astro 5 + React 19, traitement 100% client-side, deploye sur Coolify
**Domaine** : privatools.com
**Concurrents** : TinyPNG, iLovePDF, Smallpdf, Compressor.io

---

## P0 -- CRITIQUE

### #1 -- Pas de robots.txt
Pas de fichier `public/robots.txt`. Google voit un 404 et ne decouvre pas le sitemap.

### #2 -- Titre homepage duplique : "PrivaTools | PrivaTools"
Le layout ajoute `| PrivaTools` a chaque titre. La homepage passe deja "PrivaTools" comme titre.

### #3 -- Pas de meta Open Graph / Twitter
Aucun `og:title`, `og:description`, `og:image`, `twitter:card`. Les partages sur les reseaux affichent un apercu vide.

### #4 -- Pas de canonical URL
Aucun `<link rel="canonical">` sur aucune page. Risque de contenu duplique.

### #5 -- Contenu mince sur toutes les pages outils
Chaque page outil n'a qu'un H1 + une phrase de description + le composant React interactif. Google indexe ~20-30 mots par page. Les concurrents ont 500+ mots (how-to, FAQ, features).

---

## P1 -- HIGH

### #6 -- Pas de donnees structurees (JSON-LD / Schema.org)
Aucun schema WebApplication, FAQPage ou WebSite. Pas de rich snippets possibles.

### #7 -- Navigation mobile cassee
Les liens nav sont `hidden md:flex` sans menu hamburger. Sur mobile, impossible de naviguer entre les outils.

### #8 -- framer-motion (120KB) pour un blob decoratif
Le DecorativeBlob utilise framer-motion pour une simple animation scale/rotate. Remplacable par du CSS pur.

### #9 -- Footer ne liste pas tous les outils
Seulement 3 liens (Compress PDF, Compress Image, Contact). La plupart des pages outils n'ont aucun lien entrant depuis le footer.

### #10 -- Meta descriptions generiques, pas optimisees pour les mots-cles
Les descriptions actuelles ne ciblent pas les keywords de recherche ("compress pdf online free", "merge pdf online", etc.).

---

## P2 -- MEDIUM

### #11 -- Pas de section "Related Tools" entre les pages outils
Pas de cross-linking. Chaque page outil est isolee.

### #12 -- Sitemap sans lastmod
Le sitemap genere ne contient que `<loc>`, pas de `<lastmod>`.

### #13 -- Pas de lazy loading / decoding async sur les images
Les `<img>` dans les composants outils n'ont pas `loading="lazy"` ni `decoding="async"`.

### #14 -- Registration du Service Worker bloquante
Le SW est enregistre au chargement, pas differe.

---

## P3 -- LOW

### #15 -- Pas de page 404 custom
### #16 -- Alt text generiques ("Preview", "Before", "After")
### #17 -- Pas de page privacy policy
### #18 -- Pas de breadcrumbs
### #19 -- Pas de apple-touch-icon ni manifest.json

---

## Titres recommandes par page

| Page | Titre recommande |
|------|-----------------|
| index | PrivaTools - Free Online PDF & Image Tools, 100% Private |
| compress-pdf | Compress PDF Online Free - Reduce PDF Size, PrivaTools |
| merge-pdf | Merge PDF Online Free - Combine PDF Files, PrivaTools |
| split-pdf | Split PDF Online Free - Extract Pages, PrivaTools |
| jpg-to-pdf | JPG to PDF Converter Online Free, PrivaTools |
| compress-image | Compress Image Online Free - Reduce File Size, PrivaTools |
| resize-image | Resize Image Online Free - Change Dimensions, PrivaTools |
| convert-to-jpg | Convert to JPG Online Free - PNG WebP HEIC, PrivaTools |
| crop-image | Crop Image Online Free - Exact Pixel Control, PrivaTools |
| remove-background | Remove Background From Image Free - AI Powered, PrivaTools |

---

## Schemas recommandes

- **WebApplication** sur chaque page outil (nom, url, description, prix gratuit)
- **FAQPage** sur chaque page outil (une fois le contenu FAQ ajoute)
- **WebSite** sur la homepage (pour sitelinks)
- **BreadcrumbList** sur les pages outils
