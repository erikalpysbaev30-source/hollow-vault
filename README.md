# Hollow Vault — Rift Protocol

Hollow Vault is a client-side Canvas roguelite with a deterministic adaptive room director, a real-data transparency dashboard, optional player-activated reinforcements, unlockable hunter skins, and visual map styles. It is fully playable without a network connection or API key. When configured, server-only OpenAI planners can asynchronously recommend future rooms, compatible cosmetic themes, and optional support from strict allowlists; they can never invent level geometry, code, enemies, assets, or spawn coordinates.

The interface includes persisted Small, Default, Large, and Extra Large UI scales plus a High Contrast UI mode. Typography, color tokens, contrast measurements, and responsive checks are documented in `UI_ACCESSIBILITY.md`.

The repository supports two deployment targets:

- Native Next.js on Vercel (`pnpm dev`, `pnpm build`, `pnpm start`)
- Vinext on OpenAI Sites (`pnpm dev:sites`, `pnpm build:sites`, `pnpm start:sites`)

## Requirements

- Node.js 24.x
- pnpm 11.9.0 (declared in `package.json`)

## Local setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. The game works immediately with an empty `OPENAI_API_KEY`; the adaptive endpoint returns a safe fallback response and the premade room queue remains active.

To exercise the live planner, put a real project key in `.env.local`:

```env
OPENAI_API_KEY=your_server_side_project_key
OPENAI_MODEL=gpt-5.6-luna
ADAPTIVE_ROOMS_ENABLED=true
ADAPTIVE_ROOMS_MAX_CALLS_PER_SESSION=4
ADAPTIVE_ROOMS_TIMEOUT_MS=5000
ADAPTIVE_ROOMS_COOLDOWN_MS=10000
ADAPTIVE_ROOMS_CACHE_TTL_MS=21600000
ADAPTIVE_REINFORCEMENTS_MAX_CALLS_PER_SESSION=3
ADAPTIVE_REINFORCEMENTS_COOLDOWN_MS=15000
```

Never prefix the key with `NEXT_PUBLIC_`, add it to source code, or expose it in browser settings. `.env.local` is ignored by Git.

Useful checks:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

With the app running, `GET /api/health` reports whether adaptive rooms and reinforcements are enabled and whether a key is configured. It never returns the key. `POST /api/adaptive-rooms` plans buffered rooms, while `POST /api/adaptive-reinforcements` recommends one optional bounded support action.

## Deploy to Vercel

### Git integration (recommended)

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, choose **Add New → Project**, import the repository, and keep **Next.js** as the detected framework.
3. Leave the output directory empty. This is a server-rendered Next.js application, not a static export.
4. Use `pnpm install --frozen-lockfile` as the install command and `pnpm build` as the build command. The committed `pnpm-lock.yaml` and `packageManager` field make pnpm deterministic.
5. In **Project Settings → Environment Variables**, add `OPENAI_API_KEY`, `OPENAI_MODEL`, and `ADAPTIVE_ROOMS_ENABLED`. Add the four `ADAPTIVE_ROOMS_*` controls shown above if you want to override their safe defaults.
6. Apply the variables to Production and whichever Preview/Development environments should use live planning. Use different OpenAI project keys for production and non-production when possible.
7. Deploy, then request `https://YOUR_DOMAIN/api/health`. Expect `status: "ok"` and `configured: true` when the key is present.
8. If you add or change environment variables after a deployment, redeploy so the new function receives them.

No `vercel.json` is required. Next.js App Router routes are detected natively. The API routes explicitly use the Node.js runtime, and the OpenAI route has a 10-second function ceiling plus its own shorter request timeout.

See `VERCEL_DEPLOYMENT.md` for the complete environment-variable table, dashboard workflow, production checks, CLI alternative, and ZIP handoff notes.

### Vercel CLI (optional)

```bash
pnpm dlx vercel login
pnpm dlx vercel link
pnpm dlx vercel env add OPENAI_API_KEY production
pnpm dlx vercel env add OPENAI_MODEL production
pnpm dlx vercel env add ADAPTIVE_ROOMS_ENABLED production
pnpm dlx vercel --prod
```

Enter secrets only at the CLI prompt. Do not place an API key directly in a shell command or commit it to a Vercel configuration file.

## Runtime and security architecture

- `app/page.tsx` is the browser game and authoritative Canvas simulation. It calls only same-origin API paths.
- `game/spawn.ts` validates the complete player collider against final room geometry, hazards, occupants, and boundaries, with explicit entrance zones and deterministic bounded fallback.
- `game/transparency.ts` builds capped, human-readable adaptation records from final validated rooms and observed combat facts; it does not infer changes that did not happen.
- `game/reinforcements.ts` owns deterministic local support decisions, use penalties, activation checks, and the three allowlisted support types. The player must activate every reinforcement with `R` or the left bumper.
- `game/customization.ts` owns deterministic skin/style registries, unlock evaluation, compatibility, migration, and safe fallback IDs. Map styles affect Canvas colors and decoration only.
- `app/api/adaptive-rooms/route.ts` validates request size and shape, applies cooldown/rate limits and caching, and calls the official OpenAI JavaScript SDK.
- `app/api/adaptive-reinforcements/route.ts` applies the same server-only, strict-schema boundary to optional support recommendations.
- `lib/server/openai/client.ts` is guarded by `server-only`; the browser bundle cannot import the key-bearing client.
- `lib/server/adaptive-rooms/schemas.ts` validates both inbound telemetry and model output with strict Zod schemas.
- `lib/server/adaptive-rooms/planner.ts` uses the Responses API with strict JSON Schema, `store: false`, no automatic retries, bounded output, an abort timeout, and a configurable model.
- `game/rooms.ts` remains authoritative. It allowlists every layout, preset, enemy group, spawn zone, and modifier range before a model-selected room can enter the queue.

The APIs send only an opaque session ID, aggregate skill values, compact room summaries, current health/resource ratios, aggregate reinforcement use, and approved IDs. They do not send raw input events, recordings, screenshots, account data, save files, messages, or chat content.

## Latency, fallback, and cost controls

Gameplay never waits for OpenAI. Three future rooms are created locally first; the next room is already ready when the request starts. Any missing key, timeout, network failure, refusal, invalid JSON, invented ID, unsafe value, or rate limit leaves those premade rooms untouched.

Cost is bounded by a default four calls per browser run and four accepted calls per session/IP/day on each warm server instance, a ten-second cooldown, six-hour response cache, 900 output-token ceiling, zero SDK retries, and one call that plans up to four rooms. Serverless in-memory counters are best-effort and reset when an instance is recycled; for hard organization-wide limits, also configure OpenAI project budgets and rate limits or replace the maps with a durable rate-limit store.

`gpt-5.6-luna` is the default because room planning is a small, latency-sensitive constrained selection task. `OPENAI_MODEL` remains configurable if model requirements change.

## Gameplay preservation

The new systems preserve the existing weapons, layouts, enemy behavior, health/damage rules, room health scaling, elite multipliers, wave delay, and safe AI modifier bounds. Player spawning now resolves against final collision geometry and reserves the entrance during enemy placement without changing combat balance. Skins and map styles are visual only; reinforcements add explicit player-triggered defense/control without silently changing room balance. Exact constants remain centralized and regression-tested. See `ADAPTIVE_DIFFICULTY.md` for formulas, schemas, spawn behavior, persistence, and queue behavior.

## OpenAI Sites deployment

The existing Sites target remains available:

```bash
pnpm build:sites
```

Sites-specific Cloudflare worker/database source is intentionally excluded from the native Next.js typecheck because Vercel does not compile or deploy it.
