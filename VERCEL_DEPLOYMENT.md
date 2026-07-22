# Vercel Deployment — Hollow Vault

The repository is a native Next.js App Router application. Vercel should detect **Next.js** automatically. Do not configure a static export or output directory.

## Required software

- Node.js 24.x
- pnpm 11.9.0

## Local verification

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm start
```

The game remains playable when `OPENAI_API_KEY` is empty. In that state, its local prepared-room and reinforcement systems are used.

## Environment variables

Add these in **Vercel → Project Settings → Environment Variables**:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | Only for live AI planning | empty | Server-only OpenAI project key |
| `OPENAI_MODEL` | No | `gpt-5.6-luna` | Server-selected planning model |
| `ADAPTIVE_ROOMS_ENABLED` | No | `true` | Enables both bounded OpenAI planners |
| `ADAPTIVE_ROOMS_MAX_CALLS_PER_SESSION` | No | `4` | Room-planner daily warm-instance limit |
| `ADAPTIVE_ROOMS_TIMEOUT_MS` | No | `5000` | OpenAI abort timeout, clamped 1500–8000 ms |
| `ADAPTIVE_ROOMS_COOLDOWN_MS` | No | `10000` | Minimum room-planner interval |
| `ADAPTIVE_ROOMS_CACHE_TTL_MS` | No | `21600000` | Room-plan memory-cache lifetime |
| `ADAPTIVE_REINFORCEMENTS_MAX_CALLS_PER_SESSION` | No | `3` | Reinforcement-planner daily warm-instance limit |
| `ADAPTIVE_REINFORCEMENTS_COOLDOWN_MS` | No | `15000` | Minimum reinforcement-planner interval |

Apply the key and model to **Production**. Add them to **Preview** and **Development** only if those deployments should make real OpenAI calls. Prefer separate OpenAI project keys for production and non-production. Never use a `NEXT_PUBLIC_` prefix for the API key.

Changing a Vercel environment variable does not update an existing deployment. Redeploy afterward.

## Dashboard deployment

1. Upload this project to GitHub, GitLab, or Bitbucket.
2. In Vercel, select **Add New → Project** and import the repository.
3. Confirm that the framework preset is **Next.js**.
4. Keep the root directory at the repository root.
5. Use `pnpm install --frozen-lockfile` as the install command.
6. Use `pnpm build` as the build command.
7. Leave the output directory empty.
8. Add the environment variables above.
9. Deploy.
10. Open `https://YOUR_DOMAIN/api/health`.
11. Confirm `status` is `ok`, and confirm `configured` is `true` for both adaptive systems when a key is installed.
12. Start a game and complete the four calibration rooms. Confirm later rooms remain instant and the AI Director can report an OpenAI-assisted or local-fallback source.

## Vercel CLI alternative

```bash
pnpm dlx vercel login
pnpm dlx vercel link
pnpm dlx vercel env add OPENAI_API_KEY production
pnpm dlx vercel env add OPENAI_MODEL production
pnpm dlx vercel env add ADAPTIVE_ROOMS_ENABLED production
pnpm dlx vercel --prod
```

Enter secret values only in the interactive prompt.

## Production checks

- `GET /api/health` returns status and safe configuration booleans, never credentials.
- `POST /api/adaptive-rooms` and `POST /api/adaptive-reinforcements` use Node.js Vercel Functions.
- Browser requests use relative `/api/...` URLs.
- OpenAI is imported only by `server-only` code.
- Invalid, unavailable, or slow provider responses retain local prepared rooms and local reinforcements.
- No runtime filesystem or permanent custom server is required.
- Serverless in-memory cache/rate-limit maps are best-effort and reset on cold starts. Configure OpenAI project budgets for durable account-level cost control.

## ZIP contents

The distributable ZIP intentionally excludes dependency folders, generated builds, caches, Git history, Vercel metadata, temporary files, and every `.env*` file except `.env.example`. Install dependencies after extracting it.
