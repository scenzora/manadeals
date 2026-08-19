# ManaDeals.online — Admin Panel

Production-ready admin panel for **ManaDeals.online**, an affiliate product discovery and deals
platform covering Amazon, Flipkart and other affiliate networks.

Built with Next.js 16 (App Router) · TypeScript · MongoDB + Mongoose · Tailwind CSS v4 ·
React Hook Form + Zod · Recharts · Lucide.

---

## Getting started

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string (Atlas or local) |
| `AUTH_SECRET` | Long random string used to sign session JWTs |
| `AUTH_COOKIE_NAME` | Session cookie name (default `manadeals_admin_session`) |
| `AUTH_SESSION_HOURS` / `AUTH_REMEMBER_DAYS` | Session lifetime, with and without "remember me" |
| `NEXT_PUBLIC_SITE_URL` | Public base URL, used for reset links and metadata |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | Bootstrap super admin for the seed script |

Seed the database, then start the app:

```bash
npm run seed
```

```bash
npm run dev
```

Sign in at [http://localhost:3000/admin/login](http://localhost:3000/admin/login) with the seeded
super-admin credentials, then **change that password immediately** under *My profile*.

`npm run seed -- --fresh` wipes the seeded collections first. The seed is otherwise idempotent and
safe to re-run.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run seed` | Roles, super admin, demo catalogue and 60 days of analytics |
| `npm run seed:fresh` | Same, after clearing the seeded collections |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

> **Never commit `.env.local`.** It is already git-ignored. Rotate any credential that has been
> shared in plain text.

---

## Architecture

```
src/
├── app/
│   ├── (auth)/admin/          login, forgot-password, reset-password (own layout)
│   ├── admin/                 authenticated panel; layout resolves the session
│   └── api/admin/             route handlers, one folder per resource
├── components/
│   ├── admin/                 shell, sidebar, header, stat cards, date filter
│   ├── charts/                Recharts wrappers
│   ├── forms/                 shared create/edit dialog
│   ├── tables/                DataTable with search, filters, sorting, selection
│   └── ui/                    buttons, inputs, dialogs, badges, states
├── hooks/                     useResourceList, useOptions
├── lib/
│   ├── api.ts                 adminRoute() wrapper, responses, error translation
│   ├── auth.ts                password hashing, JWT sessions, getSession()
│   ├── crud.ts                CRUD handler factory
│   ├── resources.ts           per-resource CRUD configuration
│   ├── permissions.ts         permission registry and default role sets
│   ├── validations/           Zod schemas shared by client forms and the API
│   └── utils/                 formatting, slugs, query parsing, CSV
├── models/                    19 Mongoose models with indexes
├── services/                  analytics, products, expiry, settings, activity log
├── types/                     shared API and session types
└── proxy.ts                   edge middleware: route guard + security headers
```

### Request lifecycle

Every `/api/admin/*` handler is wrapped in `adminRoute(permission, handler)`, which:

1. connects to MongoDB (cached across hot reloads),
2. verifies the session cookie and loads the admin plus their role,
3. checks the required permission,
4. runs the handler and translates Zod / Mongoose / duplicate-key errors into consistent JSON.

Most resources are then a few lines: `lib/resources.ts` declares the model, schema, searchable
fields, filters, populates and hidden fields, and `lib/crud.ts` generates list / create / read /
update / delete handlers with pagination and audit logging for free. Products, analytics, admins,
roles, settings and price tracking have hand-written handlers where the behaviour is bespoke.

### Authentication & authorization

- Passwords are hashed with bcrypt (12 rounds) and never leave the server.
- Sessions are signed JWTs in an httpOnly, SameSite=Lax cookie (Secure in production).
- A `tokenVersion` counter on each admin invalidates existing sessions on password change or reset.
- Five failed sign-ins lock an account for 15 minutes; the login and reset endpoints are also
  IP rate-limited.
- `proxy.ts` performs a cheap cookie check at the edge and sets security headers; the real
  cryptographic verification always happens on the Node runtime in `getSession()`.
- Roles live in MongoDB, the permission *keys* live in `lib/permissions.ts` so the UI and API
  validate against one source of truth. The Super Admin role always holds every permission and
  cannot be edited, demoted or deleted while it is the last one.

### Modules

Dashboard · Products (+ CSV import) · Categories · Brands · Affiliate networks · Deals · Coupons ·
Reviews · Price tracking · Analytics · Users · Admins & roles · Banners · Blog · SEO · Wiki ·
Settings · Notifications · Activity logs · Profile.

Every list view has search, filters, sorting, pagination, loading skeletons, empty states and error
states; every destructive action is behind a confirmation dialog; every mutation is written to the
activity log with before/after values (secrets redacted).

### Analytics

`services/analytics.service.ts` uses MongoDB aggregation pipelines over the `clicks` and
`productviews` collections: headline stats with period-over-period deltas, a bucketed time series
(hour / day / week depending on the range), top products and categories, network split, and
device / browser / country / referrer breakdowns.

### Wiki

`/admin/wiki` is the team's internal handbook — Markdown pages grouped into sections, with search,
pinning, drafts and a live preview in the editor. It ships pre-populated by the seed script with the
ManaDeals operating manual (`scripts/wiki-content.ts`): how the platform fits together, catalogue
and CSV conventions, running campaigns, reading analytics, the price-tracking runbook, roles and
troubleshooting.

Markdown is rendered by `lib/utils/markdown.ts`, a deliberately small subset renderer that
**escapes every character before formatting** and allows only `http(s)`, `mailto:` and same-site
links. That gives us authored content without pulling in either a Markdown parser or an HTML
sanitiser, and means a wiki author cannot inject scripts. Re-seeding never overwrites edits made in
the panel — seeded pages are inserted only when missing.

### Product import

`/admin/products/import` parses the CSV in the browser, posts the rows for a **preview** that
resolves category / brand / network names and flags duplicates and invalid rows, and only writes to
MongoDB after the admin confirms. Columns: `name, description, category, brand, originalPrice,
salePrice, affiliateNetwork, affiliateUrl, imageUrl, rating, reviewCount, status`.

### Price tracking

Every price change — manual edit, price-tracking update, or a future automated updater — flows
through `recordPriceChange()`, which writes a `PriceHistory` row and keeps each product's
lowest/highest markers in sync. Adding a scraper later means calling that one function on a
schedule; no schema or UI change is required.

---

## Extending it

The following were designed for without being built:

- **Affiliate APIs** — `AffiliateNetwork` already stores base URL, URL pattern, tracking id and
  write-only API credentials.
- **Automated price updates & price-drop alerts** — `recordPriceChange()` plus the `Notification`
  model (which already carries `email` / `telegram` / `whatsapp` channels).
- **Scheduled sweeps** — `expireStaleOffers()` runs lazily on list reads today and can be moved to
  a cron job unchanged.
- **AI content and the public storefront** — models carry per-record SEO fields ready for the
  Next.js Metadata API; `/` currently redirects to `/admin`.

## Conventions

- Zod schemas are shared: forms use `useForm<Input, unknown, Values>` with `z.input` / `z.output`
  so client and server validate identically, and the API never trusts the client alone.
- Client-supplied filters pass through `sanitize()` (strips `$` operators) before reaching Mongo.
- Server components fetch and render; client components handle interaction only.
- Business logic lives in `services/`, never in a component.
