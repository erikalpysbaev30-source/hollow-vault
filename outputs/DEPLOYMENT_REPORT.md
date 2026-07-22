# Hollow Vault deployment report

- Production URL: https://yo-ebon-sigma.vercel.app
- Vercel project: `erikalpy/yo`
- Deployment ID: `dpl_CFkwwMUZX5TDYGVMapHHU73GXXWi`
- Runtime: Next.js 16.2.6 on Node.js 24.x with pnpm 11.9.0
- Source: current workspace snapshot based on commit `f1011c3`, including the completed uncommitted release changes

## Verification

- Frozen clean install: passed
- TypeScript: passed
- ESLint: passed
- Automated tests: 76 passed, 0 failed
- Local production build: passed
- Vercel production build: passed
- Live `/`: HTTP 200
- Live `/manifest.webmanifest`: HTTP 200
- Live `/api/health`: `status: "ok"`
- Live rendered menu: verified with no browser console errors
- Responsive rendered QA: 1366×768, 375×812, and 812×375

## OpenAI configuration

The deployment currently reports both adaptive services as enabled but `configured: false` because no `OPENAI_API_KEY` was supplied. The game is fully playable and uses its deterministic local prepared-room and reinforcement fallback.

To enable live OpenAI recommendations, add `OPENAI_API_KEY` as a server-side Production environment variable in Vercel, optionally set `OPENAI_MODEL=gpt-5.6-luna`, and redeploy. Never use a `NEXT_PUBLIC_` prefix.

No API key is present in the repository or browser bundle.
