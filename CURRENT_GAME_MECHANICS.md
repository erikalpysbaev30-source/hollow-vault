# Current Game Mechanics Audit

> Historical audit note (pre-completion snapshot): this report predates the final tutorial, mobile-input, run-resume, and five-room assessment implementation. For the current release status and verified behavior, use `IMPLEMENTATION_STATUS.md`; where the two conflict, that newer file and the runtime code are authoritative.

Audit target: repository state at commit `f1011c3` (`Improve UI readability and accessibility`). This report describes executed code, not README claims or earlier prompts. Line references use the current compact source formatting, where a single numbered line may contain a complete runtime branch.

## 1. Executive Summary

Hollow Vault is a Next.js 16 / React 19 browser game drawn and simulated on one HTML canvas. It does not use a separate game engine. `app/page.tsx` owns the client game state, animation loop, combat, input, room transitions, telemetry, and persistence. Next.js Node route handlers provide optional OpenAI calls. The database scaffold is empty and unused (`db/schema.ts:1-4`).

Actually implemented:

- A playable room-clearing loop with three weapons, six random upgrades, five enemy kinds, hazards, drops, boss rooms, keyboard/mouse and controller input (`app/page.tsx:27-50`, `92-148`).
- Four fixed calibration rooms followed by seeded selection from fixed room templates and presets (`game/rooms.ts:64-107`, `121-152`). Layouts are selected, never procedurally constructed.
- A local seven-dimension skill profile and five-tier adaptive Director (`game/adaptive.ts:26-80`).
- A three-room look-ahead buffer and a constrained OpenAI room-planning overlay. Valid OpenAI plans can affect later gameplay (`app/page.tsx:130`; `game/rooms.ts:161-170`).
- Deterministic local reinforcement suggestions, optional OpenAI replacement suggestions, and player-triggered support (`game/reinforcements.ts:9-32`; `app/page.tsx:77-86`).
- Real room telemetry, a derived transparency dashboard, cosmetics, unlocks, and localStorage persistence (`game/transparency.ts`; `game/customization.ts`; `app/page.tsx:72-76`, `93`).

Partially implemented or misleading:

- `app/api/adaptive-difficulty/route.ts` is a complete endpoint, but the client never calls it and `Game.gptTier` is never assigned. It has no runtime effect.
- Prepared rooms, room history, and the generation seed are written to saves and migrated, but a new run ignores all three and starts again at room 1 with a new seed (`app/page.tsx:72`, `92`; `game/adaptive.ts:86`).
- Reinforcement cooldown is enforced, but every room supplies only one charge, so the cooldown normally cannot affect a second activation.
- The dashboard is connected to real records, but its `enemyHealthModifier: 1` and “Enemy health unchanged” copy describe adaptive modifiers, not actual health. Actual enemy health grows 15% per room index (`game/transparency.ts:55-68`; `app/page.tsx:85`).
- The dashboard privacy copy says room resources are used. `resourcesCollected` is recorded, but the skill formula does not consume it; “resource” skill uses accuracy, weapon energy per shot, and dash use (`app/game-ui.tsx:83`; `game/adaptive.ts:56`).

Not implemented:

- No generated room geometry, model-created layout, arbitrary model-created spawn point, continuous spawn-rate system, armor statistic, knockback system, seeded upgrade selection, run resume, account/cloud save, or database-backed player record.
- No API call blocks gameplay. Local rooms and local reinforcements exist before network responses.

Direct answers: OpenAI can truly affect future gameplay through the room and reinforcement endpoints, but only after calibration, only if configured and valid, and only inside allowlisted bounds. Reinforcement activation remains the player's choice. Reinforcement selection is deterministic locally and model-selected only when a valid asynchronous response replaces the unused local choice. Enemy groups spawn all at once per wave; there is no per-enemy spawn interval. The only inter-wave delay is a fixed 1.1 seconds.

## 2. Core Runtime Flow

```text
Menu → start()
  → create player and four local prepared rooms
  → resolve safe entrance spawn
  → select one local reinforcement
  → spawn every enemy in wave 1 immediately
  → simulate input, combat, hazards, drops, and telemetry each frame
  → when all enemies die, wait 1.1 s and spawn the next complete wave
  → when all waves end, calculate profile and evaluate Director tier
  → prepare three future local rooms; optionally request OpenAI replacements
  → show three random upgrades
  → player chooses one; consume the first buffered room
  → repeat, or save results and end the run when health reaches zero
```

1. `Home` initializes menu state and loads selected persistent fields from `hollow-vault-save` (`app/page.tsx:52-76`).
2. `start()` creates `freshPlayer()`, chooses the saved Director only if the saved profile completed calibration, generates a new UUID seed, creates rooms 1-4, and consumes room 1 (`app/page.tsx:44`, `92`).
3. `spawnWave()` calls `assembleRoomAndResolveSpawn()`, installs template obstacles/hazards, resolves the player entrance, chooses reinforcement support, and spawns wave 0 (`app/page.tsx:50`, `79-89`).
4. The `requestAnimationFrame` loop caps `dt` at 0.032 seconds, then updates input, movement, attacks, collisions, drops, timers, telemetry, rendering, and completion (`app/page.tsx:100-148`).
5. Empty active-enemy state either starts the next fixed-delay wave or records a clear (`app/page.tsx:130`).
6. `calculateProfile()` consumes at most eight recent encounters; `evaluateDifficulty()` may move one tier after stable evidence (`game/adaptive.ts:45-80`).
7. Room completion rebuilds a three-room buffer. After room 4 and then every even room, up to four client calls per run request bounded OpenAI plans in the background (`app/page.tsx:130`).
8. Upgrade choice applies immediately, increments the room, shifts the prepared queue, resets room entities, refills energy, and starts the next room (`app/page.tsx:32-39`, `96`). Player health and upgrades persist within the run.
9. Death calls `finish()`: it records one death, evaluates the profile/Director, awards vault shards, saves selected metagame data, and returns to the menu after 900 ms (`app/page.tsx:95`).

## 3. Room Selection and Generation

The repository contains 14 fixed `ROOM_TEMPLATES`, 15 fixed `ROOM_PRESETS`, seven fixed enemy groups, and fixed spawn-zone rectangles (`game/rooms.ts:52-107`). A template owns collision rectangles, enemy zones, hazard zones, player entrance zones, difficulty range, duration estimate, and entity limit. A preset chooses one template, enemy groups, wave arrangement, hazard/pickup policy, pacing role, and prediction ranges.

Selection path (`candidatePresetIds`, `prepareRoomQueue`, `materializeRoom`; `game/rooms.ts:121-170`):

```ts
if (room <= 4) use the one fixed calibration preset;
else if (room % 5 === 0) use an approved boss preset;
else filter fixed presets by current tier budget and profile weaknesses;
remove templates seen in the last three rooms when alternatives exist;
select one candidate with seededRandom(`${seed}:${room}:${tier}`);
materialize its fixed template and wave definitions;
```

- Rooms 1-4 are sequential and fixed: `test_aim`, `test_priority`, `test_resource`, `test_movement`.
- Every fifth room is a boss. Challenging/expert allow `warden_rift` or `warden_approach`; lower tiers allow only `warden_approach`.
- Other rooms use tier budgets: assisted 10-22, relaxed 18-34, standard 28-48, challenging 42-65, expert 58-85. Candidate filtering permits `budget.min - 8` through `budget.max + 8` (`game/rooms.ts:48-50`, `124-129`).
- Survival below 0.30 restricts candidates toward recovery, low-cost, or standard rooms. Movement below 0.30 excludes flank-tagged and rift-pulse rooms. Aim below 0.30 excludes `gloom_flock` (`game/rooms.ts:124-129`).
- The last three template IDs are avoided if possible. There is no persistent global no-repeat guarantee.
- Selection is deterministic within a run because a UUID seed is combined with room number and tier. A new run always creates a new seed.
- Map style is chosen after geometry. It changes only canvas palette/decorations; it does not alter obstacles or zones (`app/page.tsx:47`, `133-145`; `game/customization.ts:65-71`).
- Start buffers four plans including current, leaving three future rooms. After every clear it maintains exactly three future plans (`app/page.tsx:92`, `96`, `130`).
- If the queue is empty, `choose()` immediately creates one local room and then replenishes to three (`app/page.tsx:96`). If candidate filtering returns nothing, `gallery_relief` is the final local preset fallback (`game/rooms.ts:129`).
- OpenAI never supplies geometry. It chooses only candidate preset/style IDs plus bounded modifiers. Confidence below 0.50 is ignored (`game/rooms.ts:161-170`).

## 4. Enemy Spawn Mechanics

Enemy spawn zones are six fixed rectangles created by `zones()` and attached to each template (`game/rooms.ts:52`, `64-78`). `waveGroups()` maps `front`, `spread`, `flank`, or `encircle` to a preferred zone ordering (`game/rooms.ts:132-139`).

At runtime (`app/page.tsx:82-88`):

1. A placement names one starting zone.
2. A seeded RNG samples uniform `x` and `y` inside that rectangle.
3. The candidate is rejected if its conservative radius hits a wall/obstacle, is within 210 units of the player, or overlaps the reserved player-entry rectangle.
4. Every 40 failed attempts, the search rotates to another template zone. Maximum attempts are `spawnZones.length * 40` (normally 240).
5. If all attempts fail, that enemy is silently skipped. Otherwise the enemy is added immediately.

There is no enemy-to-enemy occupancy check, so multiple enemies can spawn overlapping. There is no spawn line-of-sight check. All fixed zones lie within the fully visible 1280×720 arena, so “off-screen spawning” is not a mechanic. There is no runtime maximum-active-enemy check; `maximumEntityCount` is used only while validating prepared plans, and validation estimates counts without the tier multiplier (`game/rooms.ts:155-159`). A group has its own `maximumPerRoom`, applied per wave placement. All members of a wave are spawned in one call, not over time.

The first wave is triggered synchronously by `start()` or `choose()`. Spawning stops after all configured waves have been consumed. A failed placement reduces actual enemies and increments no telemetry for that skipped enemy.

## 5. Spawn-Rate Calculation

There is no `baseSpawnInterval`, per-enemy timer, spawn-rate multiplier, or adaptive spawn-rate formula in the executed client. The actual rule is:

```ts
spawn every enemy in the current wave immediately;
wait until activeEnemyCount === 0;
if another wave exists:
  nextWave = configured delaySeconds; // 1.1 for every non-first wave
  decrement by dt;
  spawn the entire next wave when nextWave <= 0;
```

Sources: `SPAWN_BALANCE.waveDelaySeconds = 1.1` (`game/rooms.ts:45`), wave construction (`game/rooms.ts:135`), and completion loop (`app/page.tsx:130`). The first wave delay is 0. The fixed 1.1 seconds has no min/max, is not saved separately, does not vary by tier/skill/OpenAI, and is not exposed in configuration. OpenAI's schema has no wave-delay field (`lib/server/adaptive-rooms/schemas.ts:67-80`).

`enemyReactionTimeMultiplier` is sometimes easy to mistake for spawn rate. It affects enemy attack cooldowns, not spawning. The initial cooldown is:

```ts
initialAttackCooldown = (0.7 + seededRandom())
  * tier.enemyReactionTimeMultiplier
  * (1 + placement.reactionModifier);
```

Its base random range is 0.7-1.7 seconds; tier multipliers are 1.35, 1.18, 1.00, 0.90, 0.82; OpenAI/local placement modifier is clamped to -0.10…+0.10 (`app/page.tsx:86`; `game/adaptive.ts:27-33`; `game/rooms.ts:46`). Recurring attack cooldowns are enemy-specific and also multiplied by the tier reaction multiplier (`app/page.tsx:121-126`).

Worked current spawn-rate example: room 6 `ring_skirmish` has two waves. Six standard-tier enemies appear immediately in wave 1. After the sixth dies, the game waits 1.1 seconds and creates all six enemies in wave 2. There is no 2.0-second or adaptive per-enemy interval.

## 6. Enemy Count and Wave Calculation

For each group placement (`app/page.tsx:83`):

```ts
count = group contains boss
  ? 1
  : min(
      group.maximumPerRoom,
      max(1, round(group.baseCount
        * placement.countMultiplier
        * DIFFICULTY[currentTier].enemyCountMultiplier))
    );
```

Tier count multipliers are assisted 0.72, relaxed 0.86, standard 1.00, challenging 1.12, expert 1.22 (`game/adaptive.ts:27-33`). Placement count multiplier defaults to 1 and is clamped 0.75-1.25. The formula does not use room index directly. Room index affects candidate choice, bosses, and health. Skill affects count indirectly by changing the tier/candidate and by the optional OpenAI modifier.

Wave construction (`game/rooms.ts:132-139`):

- `single` and `boss`: one wave containing every preset group.
- `double`: wave 1 contains the first group; wave 2 contains remaining groups. If the preset has only one group, that same group is repeated in wave 2.
- `ambush`: even-index groups in wave 1 and odd-index groups in wave 2; if there are no odd groups, the group list repeats in wave 2.
- Maximum placement groups per validated wave: 3. No explicit active cap exists.
- Elite chance is tier chance plus 0.08 in an `elite` pacing room, only after room 2, never for bosses. Tier chances are 2%, 6%, 11%, 17%, and 23% (`app/page.tsx:85`; `game/adaptive.ts:28-32`).

Actual examples with default placement multiplier 1:

| Example | Calculation | Result |
|---|---|---|
| Early: room 1 `test_aim`, standard Director | `round(5 × 1 × 1.00)` | 5 slimes, one wave |
| Middle: room 6 `ring_skirmish`, standard | `round(6 × 1 × 1.00)` in each of two repeated waves | 12 total, 6 active at once |
| High: room 6 `fortress_elite`, expert | `round(6 × 1.22)=7`; `round(5 × 1.22)=6` | 13 total over two waves, 31% elite roll per non-boss |

These are configuration examples, not a claim that the seeded selector will always choose those non-calibration presets.

## 7. Difficulty Calculation

Three distinct values exist:

- `overallSkillScore`: rolling player estimate, 0-1.
- `DirectorState.tier`: the five-level value actually used by gameplay.
- `PreparedRoom.targetDifficultyScore`: preset score clamped to `tierBudget.min - 8…max + 8`; it guides selection and reinforcement pressure but does not directly scale combat (`game/rooms.ts:141-146`).

`calculateProfile()` uses the latest eight samples (`game/adaptive.ts:45-63`). Exact dimensions:

```text
accuracy = clamp(total hits / max(1, total shots))
damagePerMinute = total damage / max(0.25, total duration minutes)
survival = normalizeInverse(damagePerMinute, 3, 90) × (1 - deathRate × 0.65)
reaction = normalizeInverse(mean reaction ms, 170, 950)
combat = normalizeInverse(mean kill ms, 900, 9000)
tactical = combat × 0.62 + completionRate × 0.38
objective = completionRate × 0.65 + normalized mean duration × 0.35
movement = recency-weighted clamp(movementMs / durationMs)
ability = recency-weighted clamp(abilityUses / max(2, durationMs / 18000))
resource = accuracy × 0.55
         + (1 - clamp(totalEnergySpent / max(1, totalShots × 8))) × 0.20
         + ability × 0.25
aim = accuracy × 0.88 + clamp(criticalHits / max(1, hits)) × 0.12
overall = clamp((aim×.24 + survival×.20 + objective×.16 + tactical×.15
               + movement×.10 + reaction×.09 + resource×.06)
               × (1 - deathRate×.25))
```

`deathRate` is the mean deaths per recent room clamped to 0-1. Recency weights rise linearly from 0.7 to 1.3. Confidence is `clamp(recentRooms/5) × clamp(totalShots/70) × (0.65 + 0.35×consistency)`.

Score bands: `<.28 assisted`, `<.43 relaxed`, `<.64 standard`, `<.81 challenging`, otherwise expert (`game/adaptive.ts:67`). The Director does not immediately assign that tier. It requires at least three encounters, confidence ≥0.45, a cooldown of 3 checkpoints (2 at high strength), and repeated evidence (3 checkpoints; 2 at high). It compares score against current-tier centers `[.18,.355,.535,.725,.9]` with margins low `.11`, normal `.085`, high `.065`, and moves only one tier (`game/adaptive.ts:70-80`). Adaptive off increments checkpoints but never changes tier.

Gameplay effects by tier are the count, aggression/speed, reaction cooldown, projectile speed, elite chance, drop rate, encounter attack complexity, boss attack complexity, telegraph length, and controller aim-assist multiplier in `DIFFICULTY` (`game/adaptive.ts:27-33`). Tier does not modify direct enemy damage or the room-index health formula.

The separate `/api/adaptive-difficulty` recommendation can theoretically provide a tier to `evaluateDifficulty`, but no client fetch or assignment exists. `g.gptTier` remains `undefined`; local scoring alone changes the tier.

## 8. AI and OpenAI Mechanics

The OpenAI SDK is installed (`openai ^6.48.0`, `package.json:21-28`). `getOpenAIClient()` is server-only, reads `OPENAI_API_KEY`, disables retries, and uses a 1.5-8 second bounded timeout (default 5 seconds). Model defaults to `gpt-5.6-luna` (`lib/server/openai/client.ts`). No key is sent to the browser or stored under `NEXT_PUBLIC_`.

### Adaptive room path

| Runtime step | Status | Source |
|---|---|---|
| Room ends and telemetry/profile are summarized | Implemented | `app/page.tsx:130` |
| Client creates three local future rooms first | Implemented | `app/page.tsx:130` |
| After room 4 and each even room, client POSTs profile, last five summaries, and allowlists | Implemented | `app/page.tsx:130` |
| Server validates ≤9 KB, schema, preset/style allowlists, boss rule | Implemented | `app/api/adaptive-rooms/route.ts:37-60` |
| Server calls Responses API with strict JSON schema, `store:false`, 900 output tokens | Implemented | `lib/server/adaptive-rooms/planner.ts:12-43` |
| Output is parsed, Zod-validated, allowlist-validated, clamped, and checked for unique rooms | Implemented | `planner.ts:45-66`; `game/rooms.ts:161-165` |
| Confidence ≥0.50 plans replace matching buffered local plans | Implemented | `game/rooms.ts:168-170` |
| Future `choose()` consumes that plan | Implemented | `app/page.tsx:96` |
| Model creates room geometry or coordinates | Not implemented / prohibited | schemas and planner instructions |

Returned gameplay fields: approved `presetId`, spawn pattern, count multiplier 0.75-1.25, aggression/reaction modifier -0.10…0.10, predictions, up to four reason codes, confidence, and an approved compatible style. Predicted values are displayed but do not drive combat. Up to three rooms are requested per call. Gameplay never waits.

Server controls: default maximum four calls per session/IP per 24 hours (bounded 1-12), 10-second cooldown (0-120 s), six-hour in-memory cache (1 minute-24 h), and default five-second provider timeout (`app/api/adaptive-rooms/route.ts:20-23`, `63-105`). Cache is checked before rate limiting. Maps are process-local, so cold starts reset them.

### Reinforcement path

After calibration, the first wave can POST the profile, current-room summary, usage summary, and all three allowed IDs (`app/page.tsx:81`). Server limits default to three calls/day/session/IP, 15-second cooldown, one-hour memory cache, and the same provider timeout (`app/api/adaptive-reinforcements/route.ts:7-10`). Strict output can choose one allowlisted type, strength 1-3, cost multiplier .9-1.2, cooldown multiplier .9-1.25, reasons, and confidence (`lib/server/adaptive-reinforcements/schemas.ts`). A response replaces only the still-unused decision for the same room. It does not activate support.

### Failure behavior and deployment

Missing key, disabled flag, validation failure, timeout, rate limit, cooldown, malformed response, or network failure leaves the already-created local rooms/reinforcement in place. Room failures relabel buffered sources as `fallback`; reinforcement failures are silent. The server routes are Node-runtime Next.js handlers suitable for Vercel when server environment variables are configured. Repository code cannot prove that a particular Vercel deployment currently has a valid key. `.openai/hosting.json` instead records a Sites project and no D1/R2 bindings. The key is not exposed in source.

## 9. Reinforcement Appearance Mechanics

Reinforcement “appearance” is not random, health-gated, unlock-gated, or budget-gated. On the first wave of every room, the game always creates a local `available:true` decision, sets one charge, and resets cooldown to zero (`app/page.tsx:80-81`; `game/reinforcements.ts:20-25`). Therefore support appears every room, including room 1.

Health below 42% does not make the HUD appear; it changes the local selection to Mender Pulse. Crossing from ≥42% to <42% before use recalculates the local suggestion once (`app/page.tsx:114`). Repeated deaths, difficulty score, enemy count, skill, and usage affect type/strength/cost, not availability. There is no minimum room, unlock, timer appearance condition, or multiple simultaneous type list. OpenAI can replace the one suggestion only after the four calibration rooms. The user must press R or controller left bumper.

Activation condition (`game/reinforcements.ts:32`): decision available, charge >0, cooldown ≤0, and current energy ≥cost. Exactly one charge is granted per room. No support deals direct damage.

## 10. Reinforcement Selection Mechanics

Definitions (`game/reinforcements.ts:9-13`):

| ID | Base cost | Base cooldown | Base duration | Runtime strength |
|---|---:|---:|---:|---|
| `shield-pulse` | 24 | 34 s | 2.4 s | Sets invulnerability to at least 2.4 s; strength tier is ignored |
| `med-pulse` | 30 | 42 s | 0 | Heals `24 + strength×8` = 32/40/48 |
| `stasis-field` | 27 | 38 s | 5 s | Radius `155 + strength×18` = 173/191/209; enemies inside move at 55% speed |

Local priority chain (`game/reinforcements.ts:20-25`):

```ts
if (healthRatio < .42) med-pulse;
else if (recentDeaths > 0 || survival < .38) shield-pulse;
else if (aim < .42 || pressure > .62) stasis-field;
else shield-pulse;
```

```text
pressure = clamp(remainingEnemyCount/10 × .55 + roomDifficultyScore/85 × .45)
frustration = clamp((1-survival)×.45 + clamp(recentDeaths/3)×.35 + (1-healthRatio)×.20)
strength = round(clamp(1 + max(pressure,frustration)×2 + strengthBoost, 1, 3))
strengthBoost = high .12, normal 0, low -.10
overuse = clamp(recentUses/3)
cost = round(baseCost × (1 + overuse×.20 - frustration×.08))
cooldown = round(baseCooldown × (1 + overuse×.25))
confidence = clamp(.62 + max(pressure,frustration)×.25)
```

`resourceRatio` and `tier` are supplied to local context but never read by the selector. There are no reinforcement unlock requirements. An OpenAI result uses its requested type directly after allowlist/schema checks; there is no tie because exactly one result is allowed. Invalid AI output is ignored and the local decision remains. The player can ignore any suggestion.

## 11. Player Statistics and Telemetry

`emptyMetrics()` initializes per-room telemetry (`app/page.tsx:42`). Updates are:

| Metric | Runtime update | Reset/storage/use |
|---|---|---|
| duration | Room start to clear/death | New each room; profile, API, dashboard |
| shots fired | Adds projectile count when weapon fires | Profile accuracy/resource; API/dashboard |
| shots hit | Adds on every projectile-enemy collision | Can exceed fired due to piercing/repeated collision; clamped in profile |
| critical hits | Bullet center within 48% of enemy radius | Aim dimension |
| kills | Enemy reaches ≤0 HP | Dashboard/API; kill time also drives tactics |
| damage taken | Contact, bullets, rift pulses | Survival/profile/API/dashboard |
| movement ms | Frame time with movement magnitude >.05 | Movement dimension |
| ability uses | Successful dashes | Ability/resource dimension |
| energy spent | Weapon energy only | Reinforcement cost is not included; resource dimension |
| reaction times | First shot time from room start, one value/room | Reaction dimension |
| kill times | Spawn-to-death per enemy | Tactical dimension |
| deaths/completed | Death path or clear path | Profile, progression, dashboard |
| enemies spawned | Successful runtime spawns | Kill-rate denominator/dashboard |
| damage dealt | Actual capped damage per collision | Recorded but otherwise unused |
| health start/end | Room boundary | Damage ratio uses start; end otherwise unused |
| resources collected | Number of collected drops | Recorded but not used by profile/API/dashboard |
| reinforcement used/type/success | On activation | Usage/profile display and progression |

At room end, at most eight samples are retained and saved. The room API receives the last five summarized samples plus aggregate profile fields, not raw controls or recordings (`app/page.tsx:130`). Movement distance is not measured—only movement time. “Kill rate” is kills divided by successfully spawned enemies, not kills per minute.

## 12. Dashboard Mechanics

The dashboard is derived from `AIAdaptationRecord` and the current profile (`game/transparency.ts`; `app/game-ui.tsx:37-101`).

- Current/recent difficulty: `DirectorState.tier` recorded for each completed room, mapped to Recovery/Relaxed/Balanced/Challenging/Intense.
- Next-room trend: compares a pressure score of enemy count, waves, elite chance, flank routes, hazard level, and pickup scarcity (`game/transparency.ts:74-78`). It is derived, not an OpenAI field.
- “What the Director noticed”: thresholds on actual record accuracy (≥.70 or <.35), completion ratio (≤.85 or ≥1.25), damage ratio (≤.20 or ≥.55), and reinforcement use (`game/transparency.ts:82`).
- “What changed”: compares final validated room facts, not raw provider output (`game/transparency.ts:55-62`, `75-80`).
- “Why”: first reason code translated through a fixed friendly-copy registry. Unknown codes use generic copy.
- Skill bars: live profile dimensions; reinforcement efficiency is `successful ratio×.65 + average value×.35` (`game/reinforcements.ts:18`).
- Room source: `gpt` becomes `openai`; provider failure-marked local rooms become `fallback`; otherwise `local`.
- Predictions: preset midpoint defaults or validated model predictions versus actual room duration/kill rate.
- Reinforcement: the decision recorded for the room and whether its coarse success condition was true.

The dashboard is not mocked, but several labels overstate precision. `roomFacts()` reports actual spawned enemy count after a room but estimates next count from formulas. Cover density is obstacle area divided by `1132×572`, with >12% high, >5.5% medium. `flankRouteCount` is a label derived only from spawn pattern (encircle 2, flank 1, otherwise 0), not pathfinding. `enemyHealthModifier` and `enemyDamageModifier` are hardcoded 1 and not compared. `localAdjustments` records only a style incompatibility; it does not expose every numerical clamp. During `plannerStatus === planning`, status copy says “The next room is ready,” although later rooms are still being requested (`game/transparency.ts:84`).

## 13. Combat Calculations

Player defaults: 120 HP, 100 energy, 245 speed, 8 energy/second regeneration, 1.05-second dash cooldown, 14 collision radius (`app/page.tsx:44`, `114`; `game/spawn.ts:11`). Dash performs seven collision-checked 62-unit steps using `dt=.14`, grants .34 seconds invulnerability, and can cover up to 434 units; its movement is not conventional velocity integration (`app/page.tsx:117`).

Weapons (`app/page.tsx:27-31`, `120`):

| Weapon | Damage | Fire cooldown | Projectile speed/life | Pellets | Cost | Pierce |
|---|---:|---:|---|---:|---:|---:|
| Repeater | 17 | .16 s | 780 / 1.3 s | 1 | 1 | 0 |
| Scattergun | 10 | .56 s | 650 / .48 s | 6 | 6 | 0 |
| Scepter | 32 | .38 s | 540 / 1.3 s | 1 | 4 | 2 (up to 3 collision hits) |

Critical damage is `baseDamage × 1.35`. There is no random critical chance. A piercing projectile has no hit registry, so it can potentially collide repeatedly with the same enemy across frames until its pierce counter is exhausted. Spread adds deterministic pellet offsets plus random jitter of ±12.5% of the configured spread.

Enemy health:

```ts
health = baseHealth × (1 + roomIndex × 0.15) × (elite ? 1.8 : 1)
```

Base health/radius/speed: slime 42/17/80, cultist 58/18/70, bat 34/15/115, golem 125/28/48, boss 760/50/56 (`game/rooms.ts:41-45`). Thus room 1 already has +15%; room 6 has +90%. Tier does not affect health. Enemy speed is `baseSpeed × tierAggressionMultiplier × (1 + placementAggressionModifier)`.

Direct damage is fixed: contact 12, golem contact 18, boss contact 22; normal enemy projectile 11, boss projectile 16; rift pulse 7 (`app/page.tsx:105`, `118`, `127-128`). Difficulty changes projectile speed and some projectile/ray counts, not damage. Hit invulnerability is .72 s after contact, .66 after projectile, .50 after rift. There is no armor, shield HP, knockback, or player damage multiplier. Aegis uses the same `p.inv` timer.

Drops: per-kill chance is `.34 × tier.resourceDropMultiplier × pickupFactor`; pickup factors are generous 1.35, standard 1, scarce .72. Conditional drop type probabilities are heart 22%, energy 42.9%, coin 35.1% because the second random draw occurs only after heart fails. Hearts heal 22, energy restores 38, coins add 5; drops last 14 seconds (`app/page.tsx:128-129`).

There is no conventional point score. `g.kills` is a run-wide kill counter and run coins come only from 5-coin drops or the +24 Coin Magnet upgrade. On death, vault-shard gain is `max(1, roomIndex × 4 + floor(totalRunKills / 3))`; `best` becomes `max(savedBest, currentRoom)` (`app/page.tsx:95`). Successful room clears do not immediately award shards or update `best`. After each clear, three of the six upgrades are selected with `sort(() => Math.random() - .5).slice(0,3)` and one is applied free of charge (`app/page.tsx:32-39`, `130`). Upgrade selection is unseeded and has no rarity weighting despite rarity labels.

Enemy attacks (`app/page.tsx:121-126`) are type-specific: slimes dash; cultists keep 230-350 distance and fire 1 or 3 shots; bats lunge; golems fire 8 or 12 radial shots; bosses alternate radial and aimed patterns, become faster below 50% HP, and use harder counts at boss complexity ≥3. Telegraph thresholds are multiplied by tier telegraph multiplier.

## 14. Aiming Mechanics

Mouse absolute aim is `atan2(cursor-player)` and ignores sensitivity/invert settings. Pointer-locked mouse accumulates movement at `sensitivity × 1.45`, clamps the crosshair inside the arena, and optionally inverts Y (`app/page.tsx:103`, `119`). Mouse has no aim assist.

Controller right stick uses radial dead-zone mapping:

```ts
n = clamp((magnitude - inner) / (outer - inner));
curved = n ** responseCurve;
```

Defaults: inner .16, outer .96, curve 1.65; settings ranges .08-.30 and 1.0-2.4 (`game/adaptive.ts:82`; `app/page.tsx:41`, `165`). Movement stick uses a hardcoded curve 1.2 rather than the setting. Aim turns frame-independently by capped angular delta × sensitivity × `(2.8 + magnitude×5.2) × dt` (`app/page.tsx:115`).

Controller assist levels off/low/normal/high are 0/.06/.12/.20 multiplied by tier aim-assist multiplier .82-1.30. Target selection requires HP >0, distance ≤620, angle inside `.25 + assistLevel×.5` radians, and sampled line of sight at 11 interior points. Score is `angleDifference×2 + distance/900`; lowest wins (`game/adaptive.ts:83-84`). Each frame, aim moves by `angleDelta × assistLevel × min(1, dt×12)`.

Projectile direction uses the resulting aim plus weapon spread. Crosshair is placed directly at mouse coordinates or 190 units along controller aim. `dt` is capped at .032 seconds, preventing huge simulation steps but slowing simulation under severe frame loss. Fire cooldowns are time-based but do not catch up multiple missed shots in one frame.

## 15. Skins and Map Styles

Five skins and five map styles are code registries in `game/customization.ts:13-40`. Default skin/style are `vault-hunter` and `hollow-vault`. Unlock conditions are rooms completed, first boss, 75% best room accuracy, reaching challenging tier, or three no-reinforcement clears. `reinforcement-3` exists as a requirement but no registered skin/style uses it.

Locked selections are rejected. Unknown IDs fall back to defaults (`game/customization.ts:42-62`). Skins alter canvas colors, trail color, portrait, and menu preview only; hitbox/stats do not change (`app/page.tsx:133`, `145`; `app/game-ui.tsx:104-108`).

Map modes:

- `selected`: chosen compatible unlocked style, otherwise Hollow Vault.
- `random`: deterministic seeded choice, avoiding the last two styles when possible.
- `ai`: accepts an allowed OpenAI style when supplied; otherwise locally matches recovery/boss pacing when possible, then seeded rotation (`game/customization.ts:65-71`).

Styles change canvas palette/decorative detail only. Geometry remains the selected template. `mapStyleQuality` only suppresses one floor-detail drawing branch when set to low; auto/medium/high are otherwise equivalent in runtime (`app/page.tsx:135`).

## 16. Save and Persistence Mechanics

Storage is one localStorage key, `hollow-vault-save`, schema version 5 (`app/page.tsx:72-76`; `game/adaptive.ts:86`). Persisted/loaded fields: best room, souls, settings, profile, Director, recent metrics, customization, progression, adaptation records, and reinforcement usage. Room history, prepared queue, and seed are written and migrated but not loaded into a new `Game`. `sound` is written but not restored. `reinforcementHistory` is migrated but never populated or used.

No current room/player HP/upgrades/coins/entities are saved; runs cannot resume. Adaptation history is capped at 12, recent metrics at 8, style history at 6, and Director history at 12. Valid customization IDs are checked and unlocks re-evaluated. Profile is accepted only at schema version 2. General settings are shallow-spread without per-field validation except UI scale normalization.

Invalid JSON, blocked storage, quota errors, or private-mode failures are swallowed and defaults/current memory state continue. There is no user warning, migration log, cloud backup, or database persistence.

## 17. Fallback Mechanics

| Failure | Actual behavior |
|---|---|
| OpenAI disabled/missing key/timeout/network/rate/invalid room response | Keep three local prepared rooms; mark them `fallback` and add `openai_fallback` |
| Invalid/low-confidence individual room plan | Reject whole malformed response or ignore confidence <.50 selection; local matching room remains |
| Empty room queue | Generate one local room immediately, then refill to three |
| No room candidates | Use `gallery_relief` |
| Invalid runtime enemy spawn | Rotate zones up to bounded attempts, then skip that enemy |
| Invalid player entrance | Try priority backups, concentric 24-unit search to radius 264/512 tests, then room center; if none exists, throw during room assembly |
| Invalid save JSON/storage unavailable | Silently use defaults; no recovery UI |
| Unknown skin/style | Fall back to Vault Hunter/Hollow Vault; locked equip request is ignored |
| Incompatible map style | Apply Hollow Vault with `style_incompatible` |
| Reinforcement API failure/invalid ID | Keep deterministic local decision |
| Reinforcement cannot activate | Return unavailable/no charge/cooldown/energy reason internally; HUD shows state, no exception |

Sources: `app/page.tsx:50`, `74`, `81`, `96`, `130`; `game/spawn.ts:68-121`; `game/rooms.ts:121-170`; `game/customization.ts:43-47`, `65-71`.

## 18. Worked Examples

### A. Spawn rate

Room 6 `ring_skirmish` has two waves. Wave 1's six enemies are constructed in one `spawnWave()` call. Only when all six are dead does `nextWave` count down from 1.1. Wave 2's six enemies are then constructed together. No player metric changes 1.1 seconds.

### B. Enemy count

Standard `ring_skirmish`, default count modifier:

```text
mixed_vanguard base = 6
round(6 × 1.00 placement × 1.00 tier) = 6
double configuration with one group repeats it = 6 + 6 = 12 total
```

### C. Difficulty

Hypothetical runtime data, explicitly chosen to demonstrate the exact current formula: five identical completed rooms, each 50 s, 50 shots/30 hits/5 criticals, 18 damage, 30 s moving, 3 dashes, 70 weapon energy, 350 ms first-shot reaction, kill times 2500/3000 ms, no deaths.

Calculated values are approximately aim .548, survival .786, objective .930, tactical .858, movement .600, reaction .769, resource .745, consistency 1, confidence 1, and overall skill .740. `scoreTier(.740)` is challenging. From a standard Director at normal strength, the score is above standard center `.535 + .085`; three consecutive eligible checkpoints are required, then the Director moves exactly one step to challenging.

### D. Reinforcement

Using that profile at 30% health, five remaining enemies, room score 40, zero recent deaths/uses:

```text
pressure = 5/10×.55 + 40/85×.45 = .487
frustration ≈ (1-.786)×.45 + (1-.30)×.20 = .236
health < .42 → Mender Pulse
strength = round(1 + .487×2) = 2
cost = round(30 × (1 - .236×.08)) = 29 energy
cooldown = 42 s
activation healing = 24 + 2×8 = 40 HP
```

It appears regardless of current energy, but activation fails if energy is below 29.

### E. AI room plan

A schema-valid response for room 6 may select allowlisted `ring_skirmish`, `spread`, count 1.0, aggression +.02, reaction 0, compatible `hollow-vault`, predictions, reasons, confidence .82. Server Zod and allowlist checks pass it; client sanitization clamps fields; confidence passes .50; `materializeRoom()` rebuilds the fixed Broken Ring template and waves; `validatePreparedRoom()` passes it; the matching buffered room becomes source `gpt`. Runtime spawns 12 standard-tier enemies over two waves, with speed multiplied by 1.02. No coordinates or walls came from OpenAI.

## 19. Implemented vs Intended Matrix

| Feature | Intended behavior | Current implemented behavior | Actually affects gameplay? | Status | Main files |
|---|---|---|---|---|---|
| Adaptive rooms | Tailor future rooms | Local tier/profile filter plus bounded OpenAI overlay | Yes | Working | `adaptive.ts`, `rooms.ts`, `page.tsx` |
| OpenAI room planning | Plan rooms from telemetry | Chooses approved preset/modifiers/style only | Yes, when configured | Working | room API/planner/schemas |
| Generated layouts | Model creates layout | Selects fixed templates only | No | Not implemented | `rooms.ts` |
| Spawn-rate adaptation | Vary spawn timing | Fixed immediate waves + 1.1 s delay | No | Not implemented | `rooms.ts`, `page.tsx` |
| Enemy-count adaptation | Scale counts safely | Tier × bounded placement multiplier | Yes | Working | `adaptive.ts`, `rooms.ts`, `page.tsx` |
| Reinforcement AI | Recommend contextual support | Local always; OpenAI may replace unused suggestion | Yes | Working | reinforcement API/files, `page.tsx` |
| Reinforcement cooldown | Limit repeated support | Timer enforced but only one charge per room | Normally no additional effect | Partially working | `reinforcements.ts`, `page.tsx` |
| AI difficulty endpoint | Recommend tier | Endpoint exists; client never calls it | No | Unused | `adaptive-difficulty/route.ts` |
| AI dashboard | Explain actual adaptation | Real records/derived facts, with some misleading copy | Yes, information only | Partially working | `transparency.ts`, `game-ui.tsx` |
| Skin menu | Select/unlock cosmetics | Five working code-rendered skins | Cosmetic | Working | `customization.ts`, `game-ui.tsx` |
| Map styles | Select/rotate themes | Five palettes; AI/local selection; geometry unchanged | Cosmetic | Working | `customization.ts`, `page.tsx` |
| Spawn validation | Safe entrance/enemies | Strong player resolver; bounded enemy checks | Yes | Working | `spawn.ts`, `page.tsx` |
| Prepared room queue | Avoid network delay | Three future rooms always prepared | Yes | Working in-run | `page.tsx`, `rooms.ts` |
| Queue persistence | Resume prepared future rooms | Written/migrated but never restored | No | Broken | `adaptive.ts`, `page.tsx` |
| Local fallback | Continue without API | Local plans/support precede network | Yes | Working | `page.tsx`, `rooms.ts`, `reinforcements.ts` |
| Save persistence | Preserve progression/settings | Metagame works; run/queue/sound restore gaps | Yes, partially | Partially working | `adaptive.ts`, `customization.ts`, `page.tsx` |

## 20. Problems and Inconsistencies

| Severity | Issue | Observable effect / likely cause | Files |
|---|---|---|---|
| High | Saved prepared queue/seed/history are never restored | Reload always starts room 1 with a new queue/seed despite save fields; load effect omits them | `app/page.tsx:72`, `92`; `game/adaptive.ts:86` |
| High | Dedicated OpenAI difficulty endpoint is dead | Model tier/adjustment can never affect the Director; no client fetch and `gptTier` never assigned | `adaptive-difficulty/route.ts`; `app/page.tsx:24` |
| Medium | Dashboard says enemy health is unchanged while health grows 15% × room index | Owners may believe later rooms do not inflate health; dashboard hardcodes modifier 1 and copy means “not adaptively changed” | `transparency.ts:55-68`; `page.tsx:85` |
| Medium | Dashboard says resources are used, but pickups collected are ignored | `resourcesCollected` is telemetry-only; resource skill measures different behavior | `game-ui.tsx:83`; `adaptive.ts:56`; `page.tsx:129` |
| Medium | One-group `double`/`ambush` presets repeat the same group | `ring_skirmish` produces 12 rather than one group of 6; fallback branch deliberately reuses the full ID list | `game/rooms.ts:136-138` |
| Medium | Enemy spawn does not check other enemies | Enemies can begin overlapped; the loop only checks walls, player distance, and reserved entrance | `app/page.tsx:84` |
| Medium | Plan entity validation differs from runtime count | Validation ignores tier multiplier and runtime has no total active cap, weakening `maximumEntityCount` as a guarantee | `game/rooms.ts:158`; `app/page.tsx:83` |
| Medium | Accuracy can overcount | Piercing projectile collisions increment hits multiple times and have no per-enemy hit registry; raw hit/fired ratio may exceed 1 before profile clamp | `app/page.tsx:128`; `adaptive.ts:47` |
| Low | Reinforcement cooldown has little practical purpose | One charge means cooldown cannot gate a second normal use in the room | `app/page.tsx:81`; `reinforcements.ts:32` |
| Low | Shield strength tier does nothing | OpenAI/local strength 1-3 changes med/stasis but Aegis always uses base 2.4 s | `app/page.tsx:77` |
| Low | Several reinforcement inputs are unused | Resource ratio and tier do not influence local selection; likely interface prepared for broader logic | `reinforcements.ts:7`, `20-25` |
| Low | Sound setting is saved but not loaded | Sound returns to on after reload | `app/page.tsx:59`, `72`, `165` |
| Low | Map quality modes mostly do the same thing | Only `low` suppresses decorative floor lines; auto/medium/high share rendering | `app/page.tsx:135` |
| Low | Planning status copy contradicts state | While `plannerStatus` is `planning`, dashboard says next room is ready | `game/transparency.ts:84` |
| Low | Local adjustment audit is incomplete | Dashboard logs style incompatibility only, not all clamped/rejected provider values | `game/transparency.ts:65-66`; `rooms.ts:161-170` |
| Low | Vault shards and best room update only when a run ends in death | Clearing a room saves profile/progression but not shard reward; reward formula runs in `finish()` only | `app/page.tsx:95`, `130` |

## Audit Verification

No gameplay, UI, balance, configuration, or deployment files were modified. The only added file is this report.

- TypeScript: `tsc --noEmit --incremental false` passed.
- Automated tests: 64 passed, 0 failed using Node's test runner with the repository's TypeScript loader. Covered adaptation, schemas, planner fail-closed behavior, spawn resolver, reinforcements, dashboard derivation, cosmetics, persistence migration, and accessibility.
- Production build was not rerun because this task changed documentation only. The report does not claim browser-playtest coverage beyond code and automated-test inspection.
