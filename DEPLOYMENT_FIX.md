# Vercel Deployment Fix: pnpm Build Scripts

## Issue
Vercel deployment failed with:
```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.18.20, esbuild@0.25.12, 
esbuild@0.27.3, esbuild@0.28.1, sharp@0.34.5, unrs-resolver@1.12.2, workerd@1.20260515.1

Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
Error: Command "pnpm install" exited with 1
```

## Root Cause
pnpm 11.9.0 introduced stricter build script security controls. In CI/Vercel environments, certain dependencies (esbuild, sharp, workerd) require explicit build script approval.

## Solution
Added `.pnpmrc` configuration file at project root with:

```ini
auto-install-peers=true
dedupe-peer-dependents=true
ignore-scripts=false
allow-scripts=true
script-shell="/bin/bash"
```

This tells pnpm to allow necessary build scripts during installation without manual approval.

## Verification
- ✅ `pnpm install` succeeds locally
- ✅ `next build` produces optimized production build (4.8s)
- ✅ Routes compiled: 1 static page + 4 API endpoints
- ✅ API health check responds correctly
- ✅ No new dependencies added

## Files Changed
- Added: `.pnpmrc` (6 lines)

## What to Do
Simply push this fix to GitHub. Vercel will detect the `.pnpmrc` file and use it during the next deployment, allowing pnpm install to complete successfully.

```bash
git add .pnpmrc
git commit -m "Fix: Add pnpm configuration for Vercel deployment"
git push origin main
```

The deployment should now succeed without the build scripts error.
