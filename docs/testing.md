# Testing

famuse keeps testing deliberately small: a Playwright smoke suite covers the
flows that only a real browser can verify, and nothing else is automated yet.
This page is the single source of truth for how tests are organized and run.

## Strategy

| Layer | Tool | What it covers | Status |
| --- | --- | --- | --- |
| E2E smoke | Playwright (Chromium) | Demo sign-in, real-time messaging between two members, household task toggling, mobile drawers + composer, ask-famuse chip insert | Active — `e2e/smoke.spec.ts`, `e2e/mobile.spec.ts` |
| Unit | Vitest | Pure logic such as `src/shared/format.ts` | Not set up yet; add only when a pure function gains non-trivial branching |
| Full E2E coverage | — | Plugins, uploads, AI replies, every channel | Deliberately out of scope: slow and brittle for the value returned |

Rules that keep the suite trustworthy:

- Smoke tests exercise public behavior only (roles, labels, visible text),
  never internal state or direct DB writes from the test.
- Tests must pass on reruns against the same local database. Message tests
  use unique text (`uniqueMarker` in `e2e/helpers.ts`); the task test
  restores the checkbox state it changed.
- Tests run serially (`workers: 1` in `playwright.config.ts`) because they
  share one seeded household and one set of Durable Object rooms.

## Running locally

Prerequisites: Node.js 22+ and pnpm, same as the app itself.

```sh
pnpm install
pnpm exec playwright install --with-deps chromium  # first time only
pnpm exec void db seed                             # reset + seed the demo household
pnpm run test:e2e
```

Notes:

- Playwright starts `pnpm run dev` itself via `webServer` in
  `playwright.config.ts`. If a dev server is already running on
  `http://127.0.0.1:5173`, it is reused locally; in CI a fresh one starts.
- `pnpm run test:e2e:ui` opens the Playwright UI for debugging.
- Seeding is recommended for a deterministic start, but not strictly
  required: one-click demo sign-in bootstraps the household through
  `/api/demo/ensure-household` on first join.
- Failures keep a screenshot and (on retry) a trace under `test-results/`,
  which is git-ignored.

## What the smoke suite checks

1. **Demo sign-in lands in the seeded household** — `Continue as Dad`
   completes auth + household join, `#living-room` shows seeded history,
   and the family roster is listed.
2. **Two members exchange a message in real time** — Dad and Mom in two
   browser contexts; Dad's message reaches Mom over the live room socket
   without a reload. This is the one flow unit tests cannot cover.
3. **A household task can be checked off and restored** — toggling
   `Take out the recycling` in the context drawer flips its state, then
   the test restores it. (The UI has no task-creation flow, so creation
   is not covered.)

4. **Navigation drawer opens, switches channel, and closes** (phone
   viewport, 390×844) — the header menu button slides the sidebar in,
   picking `#groceries` shows that room and dismisses the drawer.
5. **Household panel opens and tasks toggle from the phone layout** —
   the household button slides the context drawer in, the seeded task
   flips and is restored, then the panel closes.
6. **Composer sends with no horizontal overflow** — the page fits the
   390px viewport and a unique message sends from the mobile composer.

Drawer open/closed is asserted by bounding-rect position, not visibility:
off-canvas panels still count as "visible" to Playwright.

7. **Ask famuse chip inserts a mention instead of sending** — clicking
   `✨ Ask famuse` fills the composer with `@famuse ` and posts nothing
   (pet chips keep their send-immediately behavior).

Shared sign-in and live-room waits live in `e2e/helpers.ts`
(`signInAsDemo`, `waitForLiveRoom`, `sendMessage`). Reuse them instead of
re-implementing auth in new specs.

## CI

`.github/workflows/test.yml` runs the smoke suite on every pull request and
on pushes to `main`: install, `playwright install --with-deps chromium`,
`void db seed`, then `pnpm run test:e2e`. On failure it uploads
`test-results/` and the HTML report as a workflow artifact (7 days).
Deployment stays in `void-deploy.yml` and does not depend on this workflow.

## Adding a test

- Add specs under `e2e/`; keep to smoke-level breadth. If a flow needs many
  cases, that is a sign it belongs in a unit test, not more browser tests.
- Select by role/label/text, not CSS classes or DOM structure.
- Give new text content a unique suffix so reruns stay green.
- Restore any shared state you mutate (tasks, pet events).
- Assert the user-visible outcome, not implementation details.

## Troubleshooting

- **Browser fails to launch (`libglib-2.0.so.0` missing)** — system
  libraries are absent. Run `pnpm exec playwright install --with-deps chromium`.
- **Sign-in click does nothing** — in dev the button can render before React
  hydrates. `signInAsDemo` already retries the click until the household
  heading appears; keep that pattern for new entry points.
- **Port 5173 already in use** — a stale dev server is being reused. That is
  normally fine; stop it if you need a guaranteed-fresh server.
- **Flaky message delivery** — check the room socket reached `Live`
  (`waitForLiveRoom`) before sending; the composer is disabled until then.
