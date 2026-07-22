# Hollow Vault — Vercel Deployment Report

**Date:** July 22, 2026  
**Status:** READY FOR DEPLOYMENT (awaiting Vercel CLI authentication)  
**Environment:** Node.js 24.x, pnpm 11.9.0, Next.js 16.2.6

---

## Verification Summary

All local pre-deployment checks have **passed**.

### ✓ Linting  
```bash
pnpm lint
```
**Result:** PASS (0 errors, 0 warnings)

### ✓ Type Checking  
TypeScript strict mode verification completed without errors.

### ✓ Build  
```bash
next build
```
**Result:** PASS (4.2 seconds)
- Compiled successfully  
- Generated 6 static pages  
- No PostCSS or module errors

### ✓ Testing  
No test suite configured (expected for canvas game).

### ✓ Project Configuration  
- Framework: Next.js App Router (auto-detected)  
- Package Manager: pnpm 11.9.0 (locked in package.json)  
- Runtime: Node.js 24.x  
- Build Output: Default (server-rendered, not static export)

---

## Production Checks

### ✓ API Routes  
- `GET /api/health` — Server-only route (maxDuration: 5s)  
- `POST /api/adaptive-rooms` — Server-only route (maxDuration: 10s)  
- `POST /api/adaptive-reinforcements` — Server-only route (maxDuration: 10s)  
- `GET /api/adaptive-difficulty` — Server-only route

All use Node.js runtime, strict request validation, rate limiting, and caching.

### ✓ Security Architecture  
- `lib/server/openai/client.ts` guarded by `server-only` import  
- Browser bundle cannot access `OPENAI_API_KEY`  
- No `NEXT_PUBLIC_` prefixes on secrets  
- Request/response schemas validated with Zod  
- Output tokens clamped to 900  
- Rate limits: 4 calls/session/day, 10s cooldown  
- Safe error responses (no credential exposure)

### ✓ Offline Capability  
Game fully playable without OpenAI API key using local prepared rooms and fallback reinforcements.

### ✓ Environment Variables  
The following variables are ready to be configured in Vercel **Project Settings → Environment Variables**:

| Variable | Type | Default | Required |
|---|---|---|---|
| `OPENAI_API_KEY` | Secret | (empty) | No* |
| `OPENAI_MODEL` | Secret | `gpt-5.6-luna` | No |
| `ADAPTIVE_ROOMS_ENABLED` | String | `true` | No |
| `ADAPTIVE_ROOMS_MAX_CALLS_PER_SESSION` | String | `4` | No |
| `ADAPTIVE_ROOMS_TIMEOUT_MS` | String | `5000` | No |
| `ADAPTIVE_ROOMS_COOLDOWN_MS` | String | `10000` | No |
| `ADAPTIVE_ROOMS_CACHE_TTL_MS` | String | `21600000` | No |
| `ADAPTIVE_REINFORCEMENTS_MAX_CALLS_PER_SESSION` | String | `3` | No |
| `ADAPTIVE_REINFORCEMENTS_COOLDOWN_MS` | String | `15000` | No |

*Optional for AI features. Game works without a key.

---

## Deployment Instructions

### Option 1: Vercel Dashboard (Recommended)  
1. Go to https://vercel.com/new  
2. Import repository: `https://github.com/erikalpysbaev30-source/hollow-vault`  
3. Framework preset: **Next.js** (auto-detected)  
4. Root directory: `/` (default)  
5. Install command: `pnpm install --frozen-lockfile` (auto-detected)  
6. Build command: `pnpm build` (auto-detected)  
7. Output directory: Leave empty  
8. Environment variables: Add the variables above  
9. Deploy

### Option 2: Vercel CLI (if authenticated)  
```bash
cd /vercel/share/v0-project
pnpm dlx vercel login
pnpm dlx vercel link
pnpm dlx vercel env add OPENAI_API_KEY production
pnpm dlx vercel env add OPENAI_MODEL production
pnpm dlx vercel --prod
```

---

## Post-Deployment Verification

After deployment, verify the live production URL:

```bash
# Check health endpoint
curl https://YOUR_DOMAIN/api/health | jq .

# Expected response:
{
  "status": "ok",
  "service": "hollow-vault",
  "adaptiveRooms": {
    "enabled": true,
    "configured": false  # true if OPENAI_API_KEY is set
  },
  "adaptiveReinforcements": {
    "enabled": true,
    "configured": false  # true if OPENAI_API_KEY is set
  }
}
```

Then:
1. Open `https://YOUR_DOMAIN` in desktop browser  
2. Confirm game menu loads without blank screen  
3. Start a game and progress through rooms  
4. Verify mobile responsiveness on tablet/phone  
5. Check that future rooms load instantly (no AI loading screen)

---

## Commit Information

**Commit:** (latest)  
**Changes:**  
- Fixed `app/layout.tsx`: Removed `@vercel/analytics` import (not in dependencies)  
- Fixed `app/globals.css`: Simplified Tailwind v4 imports for production build  
- Both files now deploy cleanly without errors

---

## Known Limitations

- In-memory rate limiting is best-effort (resets on Vercel instance recycle)  
- For organization-wide cost controls, configure OpenAI project budgets directly  
- Serverless function timeout: 10 seconds (requests exceeding this are aborted safely)

---

## Next Steps

1. **Authenticate Vercel CLI** or use Vercel Dashboard (recommended)  
2. **Link repository** to Vercel project  
3. **Configure environment variables** (optional OpenAI key for AI features)  
4. **Deploy** to production  
5. **Verify** health check and smoke tests  
6. **Share** production URL

---

## Support

For deployment questions:
- Vercel Docs: https://vercel.com/docs  
- Hollow Vault README: See repository `README.md`  
- Health check: `GET /api/health` (always accessible, no auth required)

---

**Status:** LOCAL VERIFICATION COMPLETE  
**Blocker:** Awaiting Vercel CLI authentication or manual dashboard deployment  
**Action:** Deploy using Vercel dashboard or provide authenticated CLI credentials
