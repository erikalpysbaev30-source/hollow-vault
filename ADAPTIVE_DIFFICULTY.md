# Hollow Vault adaptive rooms

## Architecture

The Canvas game remains client-side and fully playable offline. `game/adaptive.ts` owns telemetry scoring, skill dimensions, hysteresis, tier parameters, and schema-v5 migration. `game/rooms.ts` owns the approved room/layout/enemy registries, deterministic difficulty budgets, local selection, the prepared-room queue, validation, and deterministic fallback. `game/spawn.ts` owns the center-based player collider convention and deterministic safe-spawn resolver. `game/transparency.ts` converts final validated room facts plus observed outcomes into a capped dashboard history. `game/reinforcements.ts` owns the local support formula and player activation checks. `game/customization.ts` owns skins, visual map styles, unlock rules, compatibility, and selection. Two optional Node.js endpoints use the official OpenAI JavaScript SDK; strict Zod schemas validate input and output before local allowlist checks.

The room planner never returns code, geometry, coordinates, or unregistered content. It may select an approved preset, one unlocked compatible map-style ID, and bounded spawn/count/timing modifiers. The local engine resolves spawn-zone IDs, assembles the room, checks IDs, collisions, entity limits, boss sequencing, style compatibility, and difficulty ranges, then falls back locally if any check fails. The reinforcement planner may select one registered support ID and bounded cost/cooldown multipliers; it cannot activate support.

Four disguised calibration chambers measure basic combat, prioritization, resource pressure, and movement/environmental awareness. Fourteen distinct layouts and fifteen encounter presets currently cover open, lane, ring, split, flanking, survival, recovery, elite, and boss play.

## Zero-delay pipeline

1. A new run prepares rooms 1–4 locally before combat starts.
2. The active room is removed from the queue; at least three later rooms remain buffered.
3. A clear immediately exposes the reward UI and preserves the next local room.
4. The local director recalculates the rolling profile and refreshes the tail of the queue.
5. After calibration, and then every two cleared rooms, the browser asynchronously requests three plans from `/api/adaptive-rooms`.
6. Valid high-confidence plans replace matching future queue entries only. The active room and immediate transition never wait.
7. A missing key, timeout, refusal, invalid ID, invalid range, rate limit, or network failure leaves the complete local queue untouched.

## Telemetry and exact local formulas

Only room summaries are calculated. No raw inputs, recordings, screenshots, account data, chat, or personal information are collected or sent.

Each room tracks layout/template IDs, duration, enemies spawned/killed, shots fired/hit, critical hits, damage dealt/taken, starting/ending health, movement time, dash count, energy spent, resources collected, reaction samples, per-enemy kill times, completion, and deaths. Failed rooms are finalized into the rolling profile.

The dashboard uses those same finalized values. For each chamber it stores the recommendation (when one existed), local validation adjustments, final applied room, real field-by-field differences from the previous comparable room, reason codes, predicted versus actual completion/kill rate, source (`openai`, `local`, or `fallback`), and reinforcement use. Identical values produce no change row. History is capped at 12 records.

The latest eight rooms are used. Recent-weighted values use weights from `0.7` for the oldest to `1.3` for the newest.

| Dimension | Overall weight | Formula |
|---|---:|---|
| Aim | 24% | `accuracy × .88 + criticalHitRate × .12` |
| Survival | 20% | inverse damage/minute normalized from 3–90, multiplied by `1 - deathRate × .65` |
| Objective | 16% | `completionRate × .65 + inverse average duration(25–150s) × .35` |
| Tactical | 15% | inverse average kill time(0.9–9s) × `.62 + completionRate × .38` |
| Movement | 10% | recent-weighted moving-time / room-time ratio |
| Reaction | 9% | inverse first-action delay normalized from 170–950ms |
| Resource | 6% | `accuracy × .55 + energyEfficiency × .20 + abilityUseEfficiency × .25` |

Overall skill is the weighted sum multiplied by `1 - deathRate × .25`, clamped to 0–1. Confidence is `encounterVolume(up to 5) × shotVolume(up to 70) × (.65 + consistency × .35)`. Consistency is `1 - standardDeviation(perRoomScore) × 2.2`.

Tier bands are assisted `< .28`, relaxed `< .43`, standard `< .64`, challenging `< .81`, and expert otherwise. Changes require at least three encounters, 45% confidence, repeated evidence, cooldown, hysteresis, and move at most one tier.

## Room budgets and behavior

Deterministic difficulty ranges are:

| Tier | Min | Max |
|---|---:|---:|
| Assisted | 10 | 22 |
| Relaxed | 18 | 34 |
| Standard | 28 | 48 |
| Challenging | 42 | 65 |
| Expert | 58 | 85 |

Difficulty is primarily expressed through layout pressure, enemy roles, group combinations, spawn-zone pattern, waves, elite chance, aggression, reaction time, hazards, and pickup availability. Adaptive tiers do not secretly force misses and do not add an adaptive health/damage multiplier.

Local selection prevents boss presets outside every fifth room, avoids recent layouts, schedules readable or recovery content for weak survival, removes flank/hazard-heavy candidates for weak movement, and removes fast bat-heavy candidates for weak aim. Selection is deterministic for the saved run seed.

## OpenAI request flow

The server sends only an opaque session ID, tier, aggregate skill values, up to five compact recent-room summaries, and a short allowlist of valid preset IDs for each future room. The Responses API uses strict `text.format` JSON Schema, `store: false`, no SDK retry, a configurable timeout, six-hour cache, a cooldown, and a per-session/IP call cap. Request bodies over 9 KB, unknown request fields, duplicate room indexes, and unsafe numeric ranges are rejected before any provider call.

The response contains up to four plans. Every plan requires:

```ts
{
  roomSequenceIndex: number;
  presetId: string;
  mapStyleId: string;                // supplied unlocked/compatible ID only
  spawnPattern: "front" | "spread" | "flank" | "encircle";
  countMultiplier: number;          // .75–1.25
  aggressionModifier: number;       // -.10–.10
  reactionModifier: number;         // -.10–.10
  predictedKillRate: number;        // 0–1
  predictedCompletionTimeSeconds: number; // 20–150
  predictedDamageTakenRatio: number; // .05–.80
  adaptationReasonCodes: string[];  // max 4
  confidence: number;               // 0–1
}
```

Unknown preset IDs, IDs not allowed for that exact room, invalid spawn patterns, malformed arrays, wrong boss placement, incompatible zones, excessive entities, low-confidence results, and out-of-range values are rejected or clamped locally.

## Spawn safety

Every room template declares a primary entrance zone plus ordered backups. Room geometry and hazards are assembled before the player is placed. The resolver validates the player's full circular collider plus clearance against room boundaries, walls, props, hazards, live enemies, and pickups, and requires immediate movement space. It tries the requested entrance, backups, then a bounded deterministic ring search; it never retries forever. The final entrance area is reserved while enemies are placed.

Run start and every room transition use this same resolver and mutate the existing player entity, preventing duplicate-player or stale-position paths. Development builds can visualize the requested point, tested candidates, final collider, and reserved entrance. The fixed Canvas viewport has no independent movable camera, so no camera re-centering is required.

## Adaptive reinforcements

Every room begins with one optional local support decision. Health below `42%` favors Mender Pulse; recent deaths or weak survival favor Aegis Pulse; weak aim or high room pressure favor Stasis Field. Pressure is `remainingEnemies / 10 × .55 + roomDifficulty / 85 × .45`. Frustration is `(1 - survival) × .45 + recentDeaths / 3 × .35 + (1 - health) × .20`, with normalized terms clamped to 0–1. Strength is clamped to tiers 1–3.

Repeated recent use adds up to 20% energy cost and 25% cooldown. Recovery evidence can reduce energy cost by at most 8%. The optional OpenAI response is limited to one registered ID, strength 1–3, cost multiplier `.9–1.2`, cooldown multiplier `.9–1.25`, four reason codes, and confidence 0–1. It arrives asynchronously and can replace only an unused suggestion for the current room. Network or validation failure leaves the deterministic local suggestion intact. Support has one room charge and always requires `R` or left-bumper activation.

## Progression, skins, and map styles

Save schema 5 adds cumulative room/boss/accuracy/reinforcement progress, selected and unlocked skin/style IDs, style mode (`selected`, `random`, or `ai`), quality, dashboard detail, notification level, post-room summary preference, last-viewed record, recent style history, capped adaptation records, and capped reinforcement state. Migration preserves earlier best depth, shards, settings, telemetry, director, queue, and history; unknown or locked IDs fall back to the original hunter and Hollow Vault style.

## Player-facing AI Director

The dashboard is available from the first main-menu action, the pause menu, the HUD brain icon, and the optional post-room summary. Simple mode leads with three questions: what the game noticed, what will actually change next, and why. Detailed mode adds the real aggregate metrics and prediction comparison. The next-room card is built only after the buffered plan has passed local validation, so rejected model suggestions never appear as applied changes.

Player settings control adaptive rooms, notification frequency, dashboard detail, post-room summaries, high contrast, and reduced motion. Normal UI translates reason codes into plain language and never displays prompts, raw JSON, model IDs, tokens, or secrets. Development-only diagnostics remain gated to localhost builds.

Unlock rules are registry data: rooms cleared, a Warden defeat, 75% chamber accuracy, reaching Challenging, using all support types, or clearing three rooms without support. Selection rejects locked IDs. Random and local-AI style choices are deterministic for the run seed and avoid the last two themes when possible. OpenAI sees only currently unlocked IDs that are compatible with the candidate room templates. Styles change Canvas palettes and optional decoration only; template geometry, obstacles, collisions, spawn zones, enemy counts, health, damage, and timing remain authoritative in the room registry.

## Configuration and cost controls

Use server-side environment variables only:

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

Never prefix the API key with `NEXT_PUBLIC_`. One request plans three future rooms. Calls happen only after calibration and then at two-room intervals, stop at the session cap, and are skipped when adaptive rooms are disabled. `OPENAI_MODEL` is configurable.

## Adding content

Add a layout to `ROOM_TEMPLATES` with fixed collision rectangles, approved spawn zones, optional hazard zones, entity cap, tags, and a difficulty range. Add enemies only through `ENEMY_GROUPS`, including bounded base counts and role tags. Add a `ROOM_PRESETS` entry that references existing template/group IDs and a registered wave, hazard, pickup, and objective ID. Add a unit test that materializes and validates the new preset. The AI allowlist is derived from these registries automatically.

## Development and limitations

On localhost, F8 shows the current preset, map style, support ID, difficulty cost, source, planner status, buffer, profile, and skill dimensions. The Director Analysis screen also exposes development-only simulated beginner/expert/death/asymmetric profiles, forced fallback/support, unlock-all, and clear-history actions. These actions are absent from production builds.

- The current objective registry contains `eliminate`; richer hold-zone or escort objectives are not implemented yet.
- Hazards currently include slow fields and timed rift pulses. There are no arbitrary geometry or verticality systems in this 2D Canvas build.
- Prediction values are recorded for comparison, but per-template prediction-error calibration is not yet persisted.
- Endpoint rate limits and caches are in-memory and reset with the server isolate. Use provider project budgets or a durable rate-limit store when a hard global ceiling is required.
- The optional live model path cannot be exercised without a server-side API key; schema, validation, fallback, and queue paths are covered locally.
