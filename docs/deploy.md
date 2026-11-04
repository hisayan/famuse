# Deploy

famuse runs on Cloudflare Workers (Worker + D1 + R2 + Durable Objects) and
deploys with `void deploy`. Two paths:

- **Local deploy** from your machine (required for the first deploy).
- **CI deploy** on every push to `main` (`.github/workflows/void-deploy.yml`).

There is deliberately no "Deploy to Cloudflare" button: provisioning
(D1/R2/DO), migrations, and secrets need the `void deploy` flow, which a
one-click button cannot run.

## One-time setup

### 1. Cloudflare API token (bootstrap)

Cloudflare dashboard → profile → API Tokens → Create Token. Start from the
"Edit Cloudflare Workers" template, then make sure it has:

| Permission          | Level | Why                          |
| ------------------- | ----- | ---------------------------- |
| Workers Scripts     | Edit  | Worker code + DO namespaces  |
| D1                  | Edit  | Create database, run migrate |
| Workers R2 Storage  | Edit  | Create bucket                |
| Account Resources   | —     | Restrict to the one account  |

After the first deploy succeeds, replace this token with the narrowed CI
token below and delete the bootstrap one.

### 2. GitHub settings

Repository → Settings → Secrets and variables → Actions:

- Secrets: `CLOUDFLARE_API_TOKEN` (required).
- Variables: `CLOUDFLARE_WORKERS_SUBDOMAIN` (only when the Worker has no
  version preview URL; use `my-team` or `my-team.workers.dev`).
- Not needed here: `DATABASE_URL` (SQLite/D1 only), `CF_ACCESS_*` (no
  Cloudflare Access in front of the app).
- Add `CLOUDFLARE_ACCOUNT_ID` only when the token can access several
  accounts.

## First deploy (from your machine)

```sh
pnpm exec void deploy --platform cloudflare
```

What it does: provisions D1/R2/Durable Objects, applies `db/migrations/`,
uploads the Worker, and creates `BETTER_AUTH_SECRET` automatically. Then
commit the updated `void.lock.json` (it records the provisioned resource
IDs). Run the first deploy from one machine at a time.

## Production secrets

Local `.env` is never uploaded. Set server values remotely:

```sh
pnpm exec void secret put MODEL_API_KEY
pnpm exec void secret list
```

Without `MODEL_API_KEY`, @famuse answers with the built-in local
assistant, so the app still works.

## Steady state: push to deploy

Pushes to `main` deploy automatically. Keep `void.lock.json` and
`db/migrations/` committed. After editing `db/schema.ts`, generate
migrations before pushing:

```sh
pnpm exec void db generate
```

## Narrowing the CI token (recommended)

Steady-state deploys only upload code, so the CI token does not need
create/write access to data products:

1. Delete the bootstrap token (or let it expire).
2. Create the steady-state token and store it as `CLOUDFLARE_API_TOKEN`:

| Permission          | Level | Why                                   |
| ------------------- | ----- | ------------------------------------- |
| Workers Scripts     | Edit  | Upload new Worker versions + bindings |
| D1                  | Read  | Migration-status checks               |
| Workers R2 Storage  | Read  | Bound bucket reads                    |
| Account Resources   | —     | Restrict to the one account           |

3. Apply schema changes from your machine first (your own login, no
   stored token), then push:

```sh
pnpm exec void db migrate --remote
git push
```

If a CI deploy fails at the migration step, a migration is pending: run
the command above and re-run the failed job.

Prefer auto-migration instead? Keep D1: Edit on the CI token and narrow
only R2. Re-escalate temporarily (restore Edit, then narrow again) when
adding brand-new resources — creation needs write access. Rotate the
token periodically; Cloudflare tokens support expiry (TTL).

## Troubleshooting

- `Cloudflare authentication is required` → `CLOUDFLARE_API_TOKEN` is
  missing or expired.
- Lock-file conflicts → deploy from one machine at a time; commit
  `void.lock.json` before deploying elsewhere or from CI.
- Deploy stops on migration history mismatch → regenerate with
  `void db generate` and commit before deploying.
- No preview URL on fresh checkouts → set
  `CLOUDFLARE_WORKERS_SUBDOMAIN`.
