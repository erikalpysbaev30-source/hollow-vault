# Codex Prompt: Verify and Deploy Hollow Vault on Vercel

Act as a senior Next.js engineer, Vercel deployment specialist, security engineer, build engineer, and QA lead.

You are working with the extracted Hollow Vault source archive. The game is already complete and playable. Preserve its gameplay, room and enemy balance, spawn timing, controls, aiming, adaptive difficulty, reinforcements, UI, accessibility, skins, map styles, animation, and local save behavior exactly.

Your task is to inspect the actual repository, make only narrowly necessary Vercel compatibility or security repairs, verify the complete production build, and provide an evidence-based deployment handoff.

## Required architecture

Keep the existing Next.js App Router architecture:

```text
Browser Canvas game
  → relative same-origin /api request
  → Next.js Node.js route handler on Vercel
  → server-only OpenAI SDK
  → strict validated structured result
  → bounded future room or optional reinforcement
```

Do not move OpenAI into client code. Never expose `OPENAI_API_KEY` through `NEXT_PUBLIC_*`, browser bundles, localStorage, public assets, logs returned to users, source maps, or API responses. Never allow the browser to submit arbitrary prompts or select the model/system instructions.

## Preserve

Do not intentionally alter:

- weapons, player stats, enemy stats, damage, health scaling, drops, elite chances, waves, or the fixed 1.1-second inter-wave delay;
- fixed room templates, spawn zones, player-spawn validation, prepared-room queue, or local fallback;
- controls, mouse/controller aiming, aim assist, sensitivity, dead zones, or collision;
- reinforcement selection, cost, cooldown, strength, activation, or player agency;
- dashboard calculations, cosmetics, progression, UI layout, colors, typography, accessibility, or Canvas rendering;
- localStorage schema or existing save compatibility.

Only make changes required for Vercel build compatibility, server/client separation, API safety, environment handling, or documentation. Explain every source change and why it was necessary.

## Inspect first

Before editing, inspect at minimum:

- `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`;
- `app/page.tsx`, `app/layout.tsx`, and all `app/api/**/route.ts` files;
- `lib/server/openai/client.ts`, both adaptive planner/schema folders;
- `game/adaptive.ts`, `game/rooms.ts`, `game/reinforcements.ts`, `game/spawn.ts`;
- `README.md`, `VERCEL_DEPLOYMENT.md`, public assets, and tests.

Confirm that this is Next.js 16 with React 19, a client-only Canvas simulation, Node.js App Router API routes, pnpm, and no required custom persistent server or runtime filesystem writes.

## Vercel requirements

1. Keep browser API requests relative: `/api/adaptive-rooms` and `/api/adaptive-reinforcements`.
2. Keep OpenAI imports behind `server-only` and server environment variables.
3. Keep OpenAI routes on `runtime = "nodejs"`.
4. Do not configure `output: "export"`; API routes require Vercel Functions.
5. Preserve strict Zod request validation, body limits, allowlists, timeouts, bounded output, caching, cooldowns, and local fallback.
6. Do not add `vercel.json` unless an actual repository constraint requires it.
7. Keep `.env.example`, but never create or package a real secret file.
8. Verify assets on a case-sensitive Linux build path.
9. Treat in-memory serverless rate limits as best-effort; do not claim they are durable across cold starts.
10. Do not make real paid OpenAI calls during automated tests.

## Environment variables

Document only variables the code actually consumes:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
ADAPTIVE_ROOMS_ENABLED=true
ADAPTIVE_ROOMS_MAX_CALLS_PER_SESSION=4
ADAPTIVE_ROOMS_TIMEOUT_MS=5000
ADAPTIVE_ROOMS_COOLDOWN_MS=10000
ADAPTIVE_ROOMS_CACHE_TTL_MS=21600000
ADAPTIVE_REINFORCEMENTS_MAX_CALLS_PER_SESSION=3
ADAPTIVE_REINFORCEMENTS_COOLDOWN_MS=15000
```

Explain which values are optional, which are server-only, and that Vercel requires a redeployment after variable changes.

## Required verification

Use the committed pnpm lockfile and run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Then start the production build and verify:

- `/` returns 200 and HTML;
- `/api/health` returns 200, safe booleans, and no credential;
- invalid `/api/adaptive-rooms` input returns a bounded 4xx fallback response;
- the build reports all API routes as dynamic;
- no hardcoded production localhost API URL exists;
- no OpenAI API key appears in source or packaged output.

Fix genuine failures and rerun the failed checks. Do not use `ignoreBuildErrors`, disable linting, weaken meaningful types, or remove tests.

## Deployment handoff

At completion, report:

1. every changed file and why;
2. typecheck, lint, test-count, and production-build results;
3. exact Vercel dashboard steps and environment variables;
4. API and fallback verification results;
5. confirmation that secrets are absent;
6. confirmation that UI, gameplay, and spawn timing were preserved;
7. honest limitations, especially best-effort in-memory serverless rate limiting.

Do not redesign or rewrite the game. If the repository already meets a requirement, verify it and leave it unchanged.
