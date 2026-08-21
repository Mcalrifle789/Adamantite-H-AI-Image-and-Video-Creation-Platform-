# Adamantite H — AI Image & Video Creation Platform

One studio for the best image and video models — Nano Banana, Kling, Seedance,
GPT Image, Grok, Veo, Sora and more — behind a single subscription and a single
provider key. Pick a model, write a prompt, ship the shot.

Built with Next.js 16 (App Router), React 19, Tailwind v4, Prisma 7 on
PostgreSQL, Higgsfield for generation, and Stripe for billing.

## What's here

- **Site pages** — landing, models, pricing, about, FAQ, contact, terms,
  privacy and a styled 404, all reachable from a sitemap footer, so the site
  reads as a site rather than a funnel into the studio. The pricing table's
  per-tier allowances are derived from the credit maths, not hardcoded, so the
  headline numbers can never drift from what a plan actually buys.
- **Auth** — email/password with database-backed sessions, a first-run owner
  bootstrap, and a **server-enforced one-hour idle logout**.
- **Studio** — projects rail (create / rename / duplicate / trash / restore),
  a model picker grouped by tier, a prompt composer that shows the exact credit
  cost before you submit, chat-style "ask for a change" editing, and a live
  results feed that polls pending jobs.
- **Credits** — an append-only ledger with per-period metering, atomic
  (serializable) spend, and automatic refunds when a job fails or is withheld.
- **Owner console** — `/admin`, owner-only, listing every account with a live
  green "active now" dot, plan, subscription status and usage.
- **Billing** — Stripe Checkout for the four plans and a signed, idempotent
  webhook that is the only place a plan is ever granted.

## Credit model

The spec quotes allowances as "N generations per tier." They all reproduce from
one pool per plan plus a fixed cost per model tier (`src/lib/plans.ts`):

| Plan | Price | Credits/mo |
| --- | --- | --- |
| Port | $8.99 | 3,990 |
| Standard | $17.99 | 7,980 |
| Pro | $34.99 | 15,000 |
| Max | $105.99 | 49,980 |

Image: budget 3 · mid 25 · premium 60 · high-end 120.
Video (per 5s): budget 250 · mid 500 · premium 1000.

e.g. Max = 49,980 ÷ 3 = **16,660 budget images**, matching the published table.

## Getting started

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL at minimum

# local throwaway Postgres:
npx prisma dev                # copy the URL it prints into DATABASE_URL
npx prisma migrate deploy

npm run dev                   # http://localhost:3000
```

The first account to register (or `OWNER_EMAIL`) becomes the owner.

The app runs without provider or Stripe keys — generation returns a clear
"not configured" error and the plans stay on the free tier — so you can explore
auth, projects and the studio UI before wiring the paid integrations.

## Environment

See `.env.example`. Summary:

- `DATABASE_URL` — Postgres (required).
- `APP_URL`, `OWNER_EMAIL`, `WEBHOOK_SECRET` — app config.
- `HIGGSFIELD_API_KEY_ID` / `_SECRET` — server-side generation credentials from
  [Higgsfield Cloud](https://cloud.higgsfield.ai). Optional
  `HIGGSFIELD_ENDPOINT_MAP` overrides model→endpoint paths without a redeploy.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_*` — billing.

## Deploying

The generated Prisma client lives in `src/generated/prisma` and is gitignored,
so it does not exist in a fresh clone. `prisma generate` therefore runs in both
`postinstall` and `build` — `postinstall` covers a plain `npm install`, and
keeping it in `build` too covers a platform restoring a dependency cache and
skipping the install step. Dropping either one fails the build with
`Module not found: Can't resolve '@/generated/prisma/client'`.

`prisma generate` does not need a database, so the build succeeds with no
environment variables at all. Every route is server-rendered on demand, so
nothing touches Postgres until a request arrives — which means a build can go
green and the site still 500 at runtime if `DATABASE_URL` is missing.

Set at minimum, on the deployment platform:

- `DATABASE_URL` — pooled connection string. `prisma dev` is local-only; use
  Neon, Supabase or another hosted Postgres.
- `APP_URL` — the deployed origin, e.g. `https://adamantite.example`. Stripe
  redirects and provider webhooks are built from it.
- `OWNER_EMAIL`, `WEBHOOK_SECRET`.

Then apply migrations against the production database once, from a machine with
that `DATABASE_URL` exported:

```bash
npx prisma migrate deploy
```

Provider and Stripe keys stay optional: without them generation returns a clear
"not configured" error and plans stay on the free tier, so a deployment can be
smoke-tested before the paid integrations are wired.

## Architecture notes

- **Provider adapter** (`src/lib/providers`) — generation is behind a
  `GenerationProvider` interface. Higgsfield is the only implementation today;
  adding fal.ai or Replicate is one more file, not a rewrite.
- **Webhooks are hints, not authority.** Higgsfield does not sign its
  callbacks, so the handler only reads `request_id` from the body and then
  re-fetches the real status over the authenticated API before trusting it.
  This also makes settlement idempotent against duplicate deliveries.
- **Polling fallback.** localhost can't receive a webhook, so the studio's
  status route reconciles with the provider on read. Both paths work.
- **Fonts.** All four faces from the spec are self-hosted as subsetted woff2
  (`src/fonts`, plus Arial CE in `public/fonts`) and wired up with
  `next/font/local` — no CDN, no external
  request, nothing that can resolve to a Microsoft default. Kaluar carries the
  logotype and headings; Raleway carries body, UI and the chat box; Arial CE is
  shipped as the last entry in every stack so even the fallback is a named
  file. Relevance is restricted to tracked uppercase micro-type on purpose:
  the trial cut is missing `$ % & + < = > @ ^ | ~` and the backtick, so
  putting it on prices or email addresses would drop those glyphs to the
  fallback mid-word. See
  `src/app/layout.tsx`.

## Scripts

- `npm run dev` / `build` / `start` — `build` runs `prisma generate` first
- `npm run lint`
- `npx prisma migrate deploy` — apply migrations
- `npx prisma studio` — inspect the database
