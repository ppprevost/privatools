<p align="center">
  <img src="public/illustrations/intro-character.png" alt="Priva.TOOLS mascot" width="200" />
</p>

<h1 align="center">Priva.TOOLS</h1>

<p align="center">
  Privacy-first file tools that run entirely in your browser.<br/>
  No upload, no server processing, no tracking. Your files never leave your device.
</p>

<p align="center">
  <a href="https://priva.tools"><strong>priva.tools</strong></a>
</p>

## What it does

PDF and image tools powered by Web Workers and WebAssembly, all client-side:

| Tool | Route |
| :--- | :---- |
| Compress PDF | `/compress-pdf` |
| Merge PDF | `/merge-pdf` |
| Split PDF | `/split-pdf` |
| JPG to PDF | `/jpg-to-pdf` |
| Compress Image | `/compress-image` |
| Resize Image | `/resize-image` |
| Crop Image | `/crop-image` |
| Convert to JPG | `/convert-to-jpg` |
| Remove Background | `/remove-background` |

Other pages: `/blog`, `/about`, `/contact`, `/support`, `/privacy`

## Tech stack

- **Astro 5** + **React 19** with hybrid SSR (Node adapter)
- **Tailwind CSS v4** with a neobrutalist design system
- **Web Workers** for all file processing (no main thread blocking)
- **Neon PostgreSQL** (serverless) for contact form, comments, and blog
- **Cloudflare Turnstile** for captcha on forms
- **Vitest** + **React Testing Library** for unit and component tests
- **Docker** + **Coolify** for deployment

## Architecture

Clean Architecture with functional style (no classes, no DI):

```
src/
  domain/        # Entities, validators, typed errors (zero deps)
  infra/         # Neon repos, Turnstile, hashing
  use-cases/     # Business orchestration (submit-comment, get-blog-posts, etc.)
  pages/api/     # Thin API routes: parse request -> use case -> map error
  components/    # React UI components
  lib/           # Utilities, workers, schema builders, tools config
```

## Getting started

```sh
pnpm install
pnpm dev
```

The app runs at `localhost:4321`. All file tools work without any configuration since they run client-side.

## Environment variables

Only needed for server-side features (contact form, comments, blog API, admin):

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `PUBLIC_PAYPAL_LINK` | PayPal.me link for the support page (buildtime) |
| `MOBILE_API_KEY` | API key for the KMP mobile app |
| `ADMIN_SECRET` | Bearer token for `/api/admin/comments` |

Without these variables, the tools still work perfectly. The contact form and comments just won't be functional.

## Commands

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build to `./dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint errors |

## License

MIT
