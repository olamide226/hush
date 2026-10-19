# hush

Anonymous audience Q&A with two unlisted links per room:

- **Audience link** — `/e/:eventId` — anyone with it can submit a question and only ever sees a confirmation.
- **Host link** — `/admin/:eventId#k=…` — the only link that reveals the collected questions.

No accounts. No emails. No visible question feed for the audience.

## Stack

- **Frontend:** React 19, Vite, TypeScript, React Router, Lucide icons, hand-written CSS
- **Backend:** Vercel serverless function (`api/[...path].ts`) with a small framework-agnostic router
- **Database:** [Turso](https://turso.tech) / libSQL via `@libsql/client`
- **Local dev:** one command (`npm run dev`) runs Vite middleware and the API together

The Turso token stays server-side. It is never exposed through `VITE_*` variables.

## How the privacy model works

1. Creating a room generates a random 12-character event ID and a 32-character admin key.
2. Only a SHA-256 hash of the admin key is stored in the database.
3. The public event endpoint returns the title, description, and status — never questions.
4. Questions can only be listed with `GET /api/events/:id/admin` plus a valid admin key.
5. The audience submit endpoint returns `{ ok: true }` and nothing else.
6. Admin links are kept in the URL fragment (`#k=…`), which is not sent to the server, then moved into browser storage and removed from the address bar.

Because there is deliberately no authentication, the host link is a bearer secret. Anyone who has it can read and manage the room.

## Local setup

Requirements: Node 20+ and a Turso database.

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```env
TURSO_DATABASE_URL=libsql://your-database-org.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```

Then:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Turso database

The app creates its tables automatically on the first request:

- `hush_events`
- `hush_questions`

They are namespaced with the `hush_` prefix, so the same database can safely be shared with another app (for example, the `time-track` project) without table collisions.

To use a brand-new database instead, create one in the Turso dashboard or with the Turso CLI and point the two environment variables at it:

```bash
turso db create hush
turso db show hush --url
turso db tokens create hush
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite + API on port 5173 |
| `npm run build` | Type-check client and server, build `dist/` |
| `npm run typecheck` | Type-check client and server |
| `npm run lint` | Run oxlint |
| `npm run preview` | Preview the production build |

## Deploying to Vercel

1. Push this directory to a Git repository.
2. Import the project in Vercel. Vercel detects Vite; `vercel.json` supplies the SPA rewrites and build settings.
3. Add the environment variables in **Project → Settings → Environment Variables**:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
4. Deploy.

Or from the CLI:

```bash
vercel
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel --prod
```

After deploying, create a room once to let the schema initialize. `GET /api/health` returns `{ "ok": true }` when the database is reachable.

### Domain and SEO configuration

Canonical URLs, Open Graph tags, `robots.txt`, and `sitemap.xml` are all generated from one value:

- Locally it defaults to `http://localhost:5173`.
- On Vercel it automatically uses `VERCEL_PROJECT_PRODUCTION_URL` (your project's production domain).
- To use a custom domain, set a single environment variable in Vercel: `SITE_URL=https://your-domain.com`.

The app code and share links use `window.location.origin` at runtime, so they follow whatever domain the app is served from without changes.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | Database health check |
| `POST` | `/api/events` | — | Create a room, returns `{ event, adminKey }` |
| `GET` | `/api/events/:id` | — | Public room metadata (no questions) |
| `GET` | `/api/events/:id/admin` | `Bearer <adminKey>` | Room + all questions |
| `PATCH` | `/api/events/:id` | `Bearer <adminKey>` | Open or close the room |
| `POST` | `/api/events/:id/questions` | — | Submit an anonymous question |
| `PATCH` | `/api/questions/:id` | `Bearer <adminKey>` | Mark answered / pin |
| `DELETE` | `/api/questions/:id` | `Bearer <adminKey>` | Delete a question |

## Project structure

```
api/[...path].ts     Vercel catch-all function
api/_lib/api.ts      API router, validation, auth
api/_lib/db.ts       Turso client, schema, queries
server/dev.ts        Local Vite + API server
shared/types.ts      Shared client/server types
src/pages/           Home, Ask, Admin, NotFound
src/components/      Brand, CopyButton, QuestionCard, dialogs, toasts
src/lib/             API client, browser storage, formatting
```

## Limits and notes

- If you lose the host link and it is not in the browser where the room was created, it cannot be recovered. This is intentional — no account exists to recover it.
- Host links are stored in `localStorage` on the device that created or opened them.
- Question length is capped at 1,000 characters; event titles at 80 and descriptions at 240.
- A room can be closed to pause submissions without deleting existing questions.
- Vercel serverless functions keep the Turso token out of the browser bundle.
