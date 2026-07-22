# Hollow Vault release implementation status

This matrix describes the shipped code, not wishlist behavior. `GAME_MECHANICS_AND_AI_FLOW.md` contains the detailed trace and formulas.

| Feature | Intended behavior | Current behavior | Status | Release blocker? | Main files |
|---|---|---|---|---|---|
| Core room loop | Launch, fight, clear, reward, continue, save | Connected Canvas runtime with guarded transitions and room-boundary resume snapshots | Working | No | `app/page.tsx`, `game/save.ts` |
| Player spawning | Never overlap room collision or occupants | One deterministic collider-aware resolver is used by room entry and respawn paths | Working | No | `game/spawn.ts`, `app/page.tsx` |
| Enemy waves | Apply the final validated room plan | Spawn zones, overlap rejection, room cap, waves, delays, elites, and completion are connected | Working | No | `game/rooms.ts`, `app/page.tsx` |
| First five levels | Teach and assess through real play | Fixed assessment presets, input-specific live prompts, real telemetry, skip/replay, persisted completion, and play-style summary | Working | No | `game/tutorial.ts`, `game/rooms.ts`, `app/page.tsx` |
| Local adaptation | Work fully without a network | Deterministic dimensions, habits, editable preferences, confidence, behavior profiles, room modules, predictions, calibration, pacing, safe experiments, and boss-attempt memory drive buffered rooms | Working | No | `game/adaptive.ts`, `game/adaptive-model.ts`, `game/rooms.ts` |
| OpenAI room planner | Recommend future approved rooms without delay | Server-only Responses API route receives bounded profile/habit/preference/pacing/calibration summaries; strict schemas, approved IDs, clamps, cache/rate limits, abort timeout, and a local buffer keep it optional | Working when configured | No | `app/api/adaptive-rooms`, `lib/server/adaptive-rooms`, `game/rooms.ts` |
| Reinforcements | Optional player-controlled support | Deterministic local availability plus optional validated AI recommendation; energy cost, one charge per room, cooldown/overuse penalties, HUD, and manual activation | Working | No | `game/reinforcements.ts`, `app/api/adaptive-reinforcements`, `app/page.tsx` |
| AI dashboard | Explain real observations and applied changes | Menu/pause access, detailed default, final-applied records, source/fallback/validation labels, predictions, history, and privacy note | Working | No | `app/game-ui.tsx`, `game/transparency.ts` |
| Skins | Cosmetic unlock, equip, and persistence | Registered, previewed, gated, equipped in gameplay, migrated, with safe fallback; no gameplay stats change | Working | No | `game/customization.ts`, `app/page.tsx` |
| Map styles | Visual style independent of geometry | Selected/random/AI modes use unlocked compatible IDs and change Canvas presentation only | Working | No | `game/customization.ts`, `app/page.tsx` |
| Desktop input | Mouse/keyboard and controller | Central transition reset, pointer-lock release, aim settings, controller navigation, and no gameplay input through overlays | Working | No | `game/input.ts`, `app/page.tsx` |
| Mobile input | Floating native touch controls | Independent multi-touch move/aim sticks, fire/dash/support/pause, left-handed mode, opacity/size settings, safe areas, and orientation layouts | Working | No | `app/mobile-controls.tsx`, `app/mobile.css`, `app/page.tsx` |
| Accessibility | Readable scalable UI | Central typography/color tokens, four UI scales, high contrast, visible focus, non-color states, responsive overflow fixes | Working | No | `app/accessibility.css`, `game/ui-settings.ts` |
| Persistence | Local, versioned, corruption-safe | Schema v7 migration preserves progress and adds adaptive habits, preferences, confidence, prediction calibration, pacing, experiments, boss analysis, cosmetics, queues, and safe active-run boundaries | Working | No | `game/adaptive.ts`, `game/adaptive-model.ts`, `game/save.ts`, `app/page.tsx` |
| PWA shell | Installable where supported | Manifest and safe-area/mobile shell are present; no service worker is shipped, so offline reload is browser-cache dependent | Partial by design | No | `app/manifest.ts`, `app/layout.tsx` |
| Vercel runtime | Native Next.js deployment | Production build generates static game shell plus three Node.js API routes; no custom server, static export, filesystem persistence, or exposed key | Working | No | `app/api`, `next.config.ts`, `.env.example` |
| Authentication/database | Not requested | No accounts or remote player database; saves and analytics remain local as requested | Intentionally omitted | No | — |

## Verified release checks

- TypeScript: passed
- ESLint: passed
- Automated tests: 85 passed, 0 failed
- Next.js production build: passed
- Production health endpoint: passed
- Rendered QA: 1366×768 desktop, 375×812 portrait phone, and 812×375 landscape phone
- OpenAI-key live call: not run because no key was supplied; missing-key fallback was verified
- Vercel production: deployed and live at `https://yo-ebon-sigma.vercel.app`

## Honest limitations

- Serverless in-memory rate limits and caches reset when a Vercel instance is recycled. Use OpenAI project budgets or a durable rate-limit service for an account-wide hard ceiling.
- The active run snapshot is intentionally a room-boundary checkpoint, not a mid-fight save.
- PWA installation is supported through the manifest, but a service worker/offline asset cache is intentionally not included.
