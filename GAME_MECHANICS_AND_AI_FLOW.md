# Game Mechanics and AI Data Flow

> Historical audit note (pre-completion snapshot): this report records the repository before the final tutorial, mobile-input, run-resume, and five-room assessment implementation. For the current release status and verified behavior, use `IMPLEMENTATION_STATUS.md`; where the two conflict, that newer file and the runtime code are authoritative.

Audit date: 2026-07-22  
Audited revision: `f1011c3` (`Improve UI readability and accessibility`), including the uncommitted working-tree files present at audit time.  
Scope: executed source under `app/`, `game/`, and `lib/server/`, plus current tests and package/environment configuration.

This is a source audit, not a design document. “AI” below means the optional OpenAI-backed room planner or reinforcement recommender unless the text explicitly says “local Director.” Line references reflect the current compact formatting in which a complete runtime branch may occupy one source line.

## Status labels

- **Implemented**: connected to an executed runtime path.
- **Partially implemented**: connected, but incomplete or materially misleading.
- **UI only**: displayed but does not drive mechanics.
- **Mocked**: placeholder data stands in for a live system.
- **Unused**: code exists but no executed caller connects it.
- **Broken**: connected behavior contradicts its intended runtime purpose.
- **Not implemented**: no current runtime implementation exists.

## 1. Executive Summary

Hollow Vault is a Next.js 16.2.6 / React 19.2.6 browser game. It has no external game engine: `app/page.tsx` owns the 1280×720 logical canvas, request-animation-frame loop, mutable run state, combat, inputs, room transitions, telemetry, and browser persistence. Next.js Node route handlers provide optional OpenAI calls (`package.json`; `app/page.tsx:13-24`, `52-184`; `app/api/*/route.ts`).

The core loop is **implemented**: start a run, clear all configured enemy waves, select one of three random upgrades, consume the next buffered room, and repeat until death. Player health and upgrades persist during that run. Death grants vault shards and returns to the menu (`app/page.tsx:27-39`, `92-96`, `113-148`).

Rooms are mixed local/AI-planned, but not generated geometry. The game has 14 fixed room templates, 15 fixed encounter presets, seven fixed enemy groups, fixed obstacle rectangles, fixed hazard positions, and fixed spawn-zone rectangles (`game/rooms.ts:41-107`). Local code always prepares future rooms first. OpenAI may later replace matching buffered plans by selecting allowlisted preset/style IDs and small bounded modifiers. It cannot return walls, executable code, coordinates, arbitrary enemies, or new assets (`game/rooms.ts:141-170`; `lib/server/adaptive-rooms/planner.ts:10-66`).

OpenAI **does affect gameplay when configured and when its response passes every check**. A valid room response can change the fixed preset selected, spawn-zone pattern, enemy count multiplier, enemy speed/aggression modifier, enemy reaction modifier, and cosmetic map style. Predictions, confidence, and reason codes mainly affect acceptance or explanation. The model cannot directly change enemy damage, weapon values, room geometry, health-growth formula, wave delay, or objective implementation (`game/rooms.ts:25-39`, `141-170`; `app/page.tsx:82-86`, `121-130`).

Enemy spawning has no continuous spawn-rate formula. All enemies in a wave are created immediately. When they are all dead, the next complete wave appears after a fixed 1.1-second delay. Neither skill nor OpenAI changes that delay (`game/rooms.ts:45`, `132-139`; `app/page.tsx:79-89`, `130`). Enemy count is adaptive through the current tier and the bounded placement multiplier.

Reinforcements are **implemented**, but their appearance is easy to misread. Every room receives one available local recommendation and one charge at its first wave; appearance is not gated by low health. The recommended type is chosen from health, deaths/survival, aim, and estimated pressure. After calibration, OpenAI can asynchronously replace that unused recommendation. The player must activate it with `R`, controller left bumper, or the HUD button. It is never auto-activated (`game/reinforcements.ts:20-32`; `app/page.tsx:77`, `81`, `98`, `115`, `169`).

The requested “first five assessment levels” do not exist. There are exactly four fixed calibration rooms, and there is no tutorial step engine, instructional prompt state, tutorial save status, skip/replay flow, or tutorial-assistance adjustment. The profile marks calibration complete after any completed sample at room 4 or later (`game/rooms.ts:92-95`, `121-123`; `game/adaptive.ts:63`). **Status: Not implemented as a tutorial; four-room calibration is implemented.**

The game can run indefinitely without OpenAI. Local room selection, local difficulty, local reinforcement decisions, and queue construction all happen before network responses. Provider failure marks locally prepared rooms as fallback; reinforcement failure leaves the local recommendation untouched (`app/page.tsx:81`, `96`, `130`).

The dashboard uses real locally recorded adaptation records and derived values; it is not a static mock. Some copy overstates what is measured. For example, its health modifier is hardcoded to 1 even though actual enemy health grows 15% per room index, and `flankRouteCount` is inferred from a spawn-pattern label rather than pathfinding (`game/transparency.ts:55-84`; `app/page.tsx:85`).

### Implemented-status summary

| System | Status | Runtime truth |
|---|---|---|
| Core canvas combat | Implemented | Playable mouse/keyboard and controller loop |
| Mobile/touch controls | Not implemented | No touch/pointer-touch gameplay path |
| Four calibration rooms | Implemented | Fixed rooms 1–4 |
| Five-level tutorial | Not implemented | No fifth assessment room or tutorial state machine |
| Local skill profile | Implemented | Seven dimensions, rolling eight encounters |
| Local adaptive tier | Implemented | Five tiers, gradual one-step changes |
| OpenAI room planning | Implemented | Bounded replacement of future local plans |
| OpenAI reinforcement suggestion | Implemented | May replace an unused local recommendation |
| OpenAI difficulty endpoint | Unused | Server route exists; client never calls it |
| Dashboard | Partially implemented | Real records plus some imprecise claims |
| Local fallback | Implemented | Full gameplay continues without network/AI |
| Run resume | Broken/not implemented | Queue/history/seed are saved but a new run ignores them |

## 2. Full Game Runtime Flow

```text
Browser loads app/page.tsx
        ↓ client-side
localStorage save is migrated and selected metagame state is restored
        ↓
Player presses Enter the Vault
        ↓
fresh player + new UUID seed + 4 local plans are created
        ↓
current room consumes plan 1; three future plans remain buffered
        ↓
player entrance is validated; hazards/obstacles are installed
        ↓
local reinforcement is selected; optional reinforcement API starts in background
        ↓
all enemies in wave 1 spawn immediately
        ↓
requestAnimationFrame simulates input/combat/telemetry and draws the canvas
        ↓
all active enemies die → fixed 1.1 s delay → next whole wave
        ↓
all waves die → room metrics finalized
        ↓
local skill profile and local Director tier update synchronously
        ↓
three prepared future rooms exist immediately, with a locally generated tail/fallback
        ↓
after room 4 and later even rooms, optional room API runs asynchronously
        ↓ server-side
request schema/allowlists/rate limits → OpenAI Responses API → strict output schema
        ↓ client-side
valid, confident plans replace matching buffered local rooms; otherwise fallback stays
        ↓
player selects one of three upgrades
        ↓
queue.shift() supplies next room; local queue is replenished; loop repeats
        ↓
player reaches 0 HP → final metrics/profile/save → menu after 900 ms
```

1. `Home()` is a client component. Its mount effect parses `hollow-vault-save`, calls `migrateSave()`, and restores best room, souls, settings, customization, progression, records, reinforcement use, profile, Director, and recent metrics (`app/page.tsx:1`, `52-76`; `game/adaptive.ts:86`).
2. `start()` is synchronous. It creates `freshPlayer()`, selects a new or saved Director, creates a fresh UUID generation seed, builds local rooms 1–4, and calls `spawnWave()` for room 1 (`app/page.tsx:44`, `92`).
3. `spawnWave()` synchronously resolves the player entrance on wave 0, computes the local reinforcement, optionally starts an asynchronous reinforcement fetch, then creates the current wave’s enemies (`app/page.tsx:79-90`).
4. The animation effect owns input listeners and `requestAnimationFrame`. Simulation uses `dt = min(0.032, elapsedSeconds)`, so severe frame loss slows simulation rather than catching up (`app/page.tsx:100-148`).
5. A clear is detected only when `g.mobs.length === 0`, all waves are consumed, and `roomState !== "clear"`. Metrics/profile/Director/records and the local queue are updated synchronously. The room OpenAI call, when eligible, is fire-and-forget (`app/page.tsx:130`).
6. The reward overlay appears after a 700 ms timeout. Choosing a relic increments the room, shifts the first buffered plan, refills energy, resets room entities, and begins the next wave (`app/page.tsx:96`, `130`, `174`).
7. `finish()` runs on lethal damage. It records one death, evaluates the profile and Director, persists metagame/queue fields, awards shards, and schedules the menu after 900 ms (`app/page.tsx:95`, `118`, `127-128`).

### Client/server and blocking behavior

| Work | Location | Timing | Blocks current room? |
|---|---|---|---|
| Game loop, telemetry, queue, fallback | Browser | Synchronous/frame-driven | N/A |
| Profile and tier evaluation | Browser | At clear/death | Brief synchronous work only |
| Room OpenAI request | Browser → Node route → OpenAI | After eligible clears | No |
| Reinforcement OpenAI request | Browser → Node route → OpenAI | First wave of eligible room | No |
| Strict provider schema/allowlist checks | Node route | During request | No current-room wait |
| Applying response | Browser | On promise resolution | Only matching future/unused state |

## 3. Core Gameplay Mechanics

### Movement

- **Location:** `app/page.tsx:114-118`; collision helper `blocked()` at `45-46`.
- **Input:** WASD or controller axes 0/1. No touch input exists.
- **Formula:** input vector is normalized, then collision is resolved one axis at a time with `position += direction × player.speed × slowMultiplier × dt`.
- **Defaults:** speed 245 units/s; hostile slow fields multiply speed by 0.7 (`app/page.tsx:44`, `118`).
- **Dash:** Space/controller A, only while moving and cooldown ≤0. Sets cooldown to 1.05 s, invulnerability to 0.34 s, then performs seven collision-checked 62-unit displacement steps using a fixed `dt=.14`; maximum attempted displacement is 434 units (`app/page.tsx:44`, `117`).
- **Telemetry:** movement time increases when input magnitude exceeds .05; dash increments `abilityUses` (`app/page.tsx:116-117`). Distance is not measured.

### Aiming and attacking

- Mouse aim is the angle from player to canvas cursor. Pointer-locked movement accumulates crosshair position at `movement × mouseSensitivity × 1.45`; absolute mouse mode maps client coordinates to 1280×720 (`app/page.tsx:103`, `119`).
- Controller aim uses axes 2/3, dead-zone/curve mapping, angular smoothing, optional target assist, and a crosshair 190 units from the player (`game/adaptive.ts:82-84`; `app/page.tsx:115`, `119`).
- Firing occurs while mouse is down or the controller right trigger/right bumper is held, if weapon cooldown ≤0 and energy is sufficient (`app/page.tsx:115`, `120`).
- Weapon energy regenerates at 8/s. Weapon values are:

| ID | Damage | Cooldown | Speed | Spread | Projectiles | Energy | Life | Pierce counter |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `repeater` | 17 | .16 s | 780 | .025 | 1 | 1 | 1.3 s | 0 |
| `scatter` | 10 | .56 s | 650 | .23 | 6 | 6 | .48 s | 0 |
| `arc` | 32 | .38 s | 540 | .04 | 1 | 4 | 1.3 s | 2 |

Source: `app/page.tsx:27-31`, `120`.

### Damage, health, drops, and hazards

- Player starts with 120 HP and 100 energy. There is no armor, shield-health pool, or knockback statistic (`app/page.tsx:44`).
- Critical hits are geometric, not random: impact within 48% of enemy radius. Damage becomes `base × 1.35` (`app/page.tsx:128`).
- Enemy health is `baseHealth × (1 + roomIndex × .15) × (elite ? 1.8 : 1)` (`app/page.tsx:85`; `game/rooms.ts:41-45`). Room 1 already applies +15%.
- Enemy movement speed is `baseSpeed × tier.enemyAggressionMultiplier × (1 + placement.aggressionModifier)` (`app/page.tsx:86`).
- Fixed incoming damage: normal contact 12, golem 18, boss 22; normal projectile 11, boss projectile 16; rift pulse 7 (`app/page.tsx:105`, `118`, `127-128`). Tier affects projectile speed/pattern complexity, not damage.
- Hit invulnerability: contact .72 s, projectile .66 s, rift .5 s. Aegis also writes the same `p.inv` timer.
- Per-kill drop chance is `.34 × tier.resourceDropMultiplier × pickupFactor`, where generous = 1.35, standard = 1, scarce = .72. Hearts heal 22, energy restores 38, and coins add 5 (`app/page.tsx:128-129`).

### Enemy behavior

`app/page.tsx:121-127` implements all five types:

- slime chases and periodically lunges;
- cultist maintains approximately 230–350 units and fires one or three projectiles;
- bat approaches and lunges;
- golem fires 8 or 12 radial projectiles;
- boss approaches outside 280 units, alternates radial/aimed attacks, and intensifies below 50% HP.

Tier changes aggression speed, cooldown multiplier, projectile speed, telegraph duration, and complexity flags through `DIFFICULTY` (`game/adaptive.ts:27-33`).

### Room completion, rewards, death, pause, transitions

- Objective is always `eliminate`; all configured waves must be empty (`game/rooms.ts:19-30`; `app/page.tsx:130`).
- A clear records metrics/profile/progression, rebuilds the future queue, optionally starts OpenAI planning, and shows three unweighted random upgrades after 700 ms (`app/page.tsx:32-39`, `130`).
- Relic selection uses `sort(() => Math.random() - .5).slice(0,3)`, is unseeded, and ignores displayed rarity (`app/page.tsx:130`).
- There is no conventional score. Run kills/coins are counters. Death awards `max(1, room×4 + floor(runKills/3))` shards and updates best room (`app/page.tsx:95`).
- Escape toggles React `paused` and exits pointer lock, but does not clear keys, mouse-down, or controller state (`app/page.tsx:98`). Simulation stops while paused or the relic overlay is present (`app/page.tsx:114`).
- On clear, `roomState` changes but pointer lock is not released and movement/fire simulation continues during the 700 ms before the relic overlay. This is a current transition defect, not an intended mechanic (`app/page.tsx:103`, `114`, `130`).

## 4. Room Selection and Room Generation

### Registries

| Registry | Count | Content | Source |
|---|---:|---|---|
| `ROOM_TEMPLATES` | 14 | fixed geometry, zones, bounds, tags | `game/rooms.ts:64-79` |
| `ROOM_PRESETS` | 15 | template/group/wave/hazard/pickup/pacing choices | `game/rooms.ts:91-107` |
| `ENEMY_GROUPS` | 7 | kinds, base count, cap, cost/tags | `game/rooms.ts:81-89` |
| `MAP_STYLES` | 5 | palettes and compatibility | `game/customization.ts:31-37` |

### Actual selection

```ts
if (room <= 4) {
  return exactly one calibration preset for that index;
}
if (room % 5 === 0) {
  return approved boss preset(s) for current tier;
}
filter fixed non-boss presets by tier budget ± 8;
if survival < .30, keep recovery/low-pressure/standard options;
if movement < .30, remove flank-tagged and rift-pulse options;
if aim < .30, remove gloom_flock options;
avoid templates used in last 3 rooms when alternatives exist;
seeded-select one candidate;
materialize fixed template and waves;
```

Source: `candidatePresetIds()`, `prepareRoomQueue()`, and `materializeRoom()` (`game/rooms.ts:121-152`).

- Calibration is sequential and fixed: `test_aim`, `test_priority`, `test_resource`, `test_movement`.
- Bosses occur every fifth room. Challenging/expert may use `warden_rift`; lower tiers use `warden_approach`.
- Tier budgets are assisted 10–22, relaxed 18–34, standard 28–48, challenging 42–65, expert 58–85. Candidate filtering and target-score clamping allow `min-8…max+8` (`game/rooms.ts:48-50`, `124-146`).
- Local selection is seeded by `${generationSeed}:${room}:${tier}`. The run seed is a fresh UUID (`game/rooms.ts:116-117`, `151-152`; `app/page.tsx:92`).
- Start creates four local plans including the current room, so three future rooms are buffered. Every clear preserves the already prepared immediate room when present and locally creates a two-room tail before any new API result (`app/page.tsx:92`, `130`).
- `choose()` consumes `preparedRooms.shift()`. If empty, it generates one local plan, then replenishes to three (`app/page.tsx:96`).
- If filtering yields no normal candidates, `gallery_relief` is used (`game/rooms.ts:129`).
- OpenAI selections can replace matching buffered plans only; current gameplay never waits (`game/rooms.ts:168-170`; `app/page.tsx:130`).

### Distinct room concepts

| Concept | Actual meaning |
|---|---|
| Room template | Fixed obstacles, zones, duration estimate, capacity and tags |
| Layout | `template.layoutId`; currently the same ID/geometry as the template |
| Preset | Fixed template plus enemy groups, wave mode, hazards, pickups and pacing |
| Map style | Cosmetic canvas palette/decorations; no geometry change |
| Enemy composition | Fixed enemy-group IDs from the selected preset |
| Spawn zones | Fixed template rectangles; pattern changes their ordering |
| Wave configuration | `single`, `double`, `ambush`, or `boss` materialized locally |
| Objective | Always `eliminate` |
| Hazards | `none`, `slow_field`, or `rift_pulse`; fixed template hazard points |
| Pickups | `generous`, `standard`, `scarce`; modifies random drop chance |

## 5. Player Spawn Mechanics

Player spawning is **implemented** through `game/spawn.ts` and `assembleRoomAndResolveSpawn()` (`app/page.tsx:50`, `80`).

1. Each template supplies prioritized `playerSpawnZones`; most use a primary south entrance and two south backups. `split_chamber` uses two south entrances plus a west backup (`game/rooms.ts:53-61`).
2. `resolveRoomPlayerSpawn()` sorts zones by priority and requests the primary center. If none exists, it requests `(640,570)` (`game/spawn.ts:107-112`).
3. Validation uses a centered radius-14 collider plus 8 clearance against playable bounds `(92,92,1096,536)`, obstacle rectangles, occupied enemies/pickups, and template hazard circles (`game/spawn.ts:11-16`, `35-64`).
4. It requires at least two of four cardinal movement probes to be open unless explicitly disabled (`game/spawn.ts:54-62`).
5. On failure, it tries backup-zone centers by priority, then concentric rings every 24 units through radius 264, with at least eight points per ring and at most 512 tested positions, then room center (`game/spawn.ts:68-104`).
6. `applyResolvedPlayerSpawn()` writes the resolved center directly to the player (`game/spawn.ts:114-119`).
7. A reserved rectangle with radius `14+8+20=42` around the player spawn is retained so enemies cannot spawn into it (`game/spawn.ts:121-122`; `app/page.tsx:84`).

Room and world coordinates are effectively the same in current gameplay because templates are drawn in the single 1280×720 arena. `worldToRoomPosition()` and `roomToWorldPosition()` exist and are tested utilities, but `app/page.tsx` does not use them (`game/spawn.ts:32-33`). There is no mid-room respawn. New rooms reposition the existing player and preserve current HP; death ends the run. Inputs/cursor are not authoritatively reset on spawn or transition.

## 6. Enemy Spawn Mechanics

Enemy zones are fixed rectangles from `zones()` (`game/rooms.ts:52`). `waveGroups()` assigns groups to zone IDs according to the `front`, `spread`, `flank`, or `encircle` ordering (`game/rooms.ts:132-139`).

Runtime chain (`app/page.tsx:82-88`):

```text
read next PreparedRoom wave
→ for each group placement, resolve group and named fixed zone
→ compute group count
→ seeded-random x/y inside zone
→ reject if obstacle/wall collision
→ reject if within 210 units of player
→ reject if overlapping reserved player entrance
→ after each 40 failed attempts, rotate to another zone
→ stop after spawnZoneCount × 40 attempts
→ skip enemy if no valid point; otherwise create it immediately
```

- Selection is deterministic within the run using `${seed}:${room}:${waveIndex}:${groupId}`.
- No line-of-sight check is performed.
- No enemy-to-enemy collision/occupancy check is performed, so enemies can overlap at spawn.
- Spawn zones are in the visible logical arena; off-screen spawning is not designed.
- There is no runtime active-enemy cap. Group `maximumPerRoom` caps each placement. `RoomTemplate.maximumEntityCount` is checked only by `validatePreparedRoom()` for AI-built candidates, using an estimate that omits the tier multiplier (`game/rooms.ts:155-159`).
- Every group member spawns in the same `spawnWave()` call.
- First spawn occurs synchronously at run/room start. Spawning stops after all configured waves.
- A placement that exhausts attempts is silently skipped, lowering actual count. `enemiesSpawned` increments only for successful spawns.

## 7. Spawn-Rate Calculation

There is no per-enemy spawn interval and no adaptive spawn-rate formula.

```ts
// Local materialization
delaySeconds = waveIndex === 0 ? 0 : SPAWN_BALANCE.waveDelaySeconds;

// Runtime
spawnAllEnemiesInCurrentWaveImmediately();
if (activeEnemies === 0 && anotherWaveExists) {
  nextWave = configuredDelaySeconds;
  nextWave -= dt;
  if (nextWave <= 0) spawnAllEnemiesInNextWaveImmediately();
}
```

`SPAWN_BALANCE.waveDelaySeconds` is exactly 1.1 (`game/rooms.ts:45`, `135`; `app/page.tsx:130`).

| Value | Default/range | Changes? | AI? | Saved? | Dashboard? |
|---|---|---|---|---|---|
| first-wave delay | 0 s | No | No | In plan | Derived |
| later-wave delay | 1.1 s | No | No | In plan | Yes, sum of later delays |
| per-enemy interval | nonexistent | N/A | No | No | No |
| active-enemy cap | nonexistent at runtime | N/A | No | No | No |

`reactionModifier` is not spawn rate. It changes enemy initial/recurring attack timing. Initial cooldown is:

```ts
(0.7 + seededRandom())
  * DIFFICULTY[tier].enemyReactionTimeMultiplier
  * (1 + placement.reactionModifier)
```

The random base is 0.7–1.7 s; tier multipliers are 1.35, 1.18, 1, .9, .82; placement modifier is clamped to −.1…+.1 (`app/page.tsx:86`; `game/adaptive.ts:27-33`; `game/rooms.ts:46`).

**Worked example:** standard-tier `ring_skirmish` has two waves. Six enemies appear immediately in wave 1. After the sixth is dead, the game waits 1.1 seconds, then all six wave-2 enemies appear together. No accuracy, kill rate, profile, or OpenAI field changes 1.1 seconds.

## 8. Enemy Count and Wave Calculation

For each placement (`app/page.tsx:83`):

```ts
count = group.kinds.includes("boss")
  ? 1
  : Math.min(
      group.maximumPerRoom,
      Math.max(
        1,
        Math.round(
          group.baseCount
          * placement.countMultiplier
          * DIFFICULTY[currentTier].enemyCountMultiplier
        )
      )
    );
```

Tier count multipliers: assisted .72, relaxed .86, standard 1, challenging 1.12, expert 1.22 (`game/adaptive.ts:27-33`). Placement count multiplier defaults to 1 and is clamped .75–1.25 (`game/rooms.ts:46`, `141-146`). Skill affects count indirectly through tier/preset selection; OpenAI can directly select the bounded placement multiplier.

Wave rules (`game/rooms.ts:132-139`):

- `single`/`boss`: one wave with every preset group;
- `double`: first group in wave 1; remaining groups in wave 2; a one-group preset repeats that group in wave 2;
- `ambush`: even-index groups in wave 1, odd-index groups in wave 2; absent odd groups repeat the full list;
- every later wave waits 1.1 seconds after all current enemies die;
- validated AI plans permit at most three group placements per wave.

Elite roll (`app/page.tsx:85`):

```ts
elite = kind !== "boss"
  && roomIndex > 2
  && rng() < (tier.eliteSpawnChance + (pacingRole === "elite" ? .08 : 0));
```

Tier base chances are 2%, 6%, 11%, 17%, 23%.

| Example | Current-code calculation | Result |
|---|---|---|
| Early room 1 `test_aim`, default standard Director | `round(5×1×1)` | 5 slimes, one wave |
| Middle `ring_skirmish`, standard | one `mixed_vanguard`: `round(6×1×1)=6`, repeated by `double` | 12 total, max 6 at once |
| Difficult `fortress_elite`, expert | `round(6×1.22)=7`; `round(5×1.22)=6` | 13 total over two waves; 31% elite roll |

The middle/difficult examples demonstrate fixed presets and formulas; seeded room selection does not guarantee those presets at a particular non-boss room.

## 9. Reinforcement Mechanics

### A. When does support become available?

At the first wave of every room, `spawnWave()` executes:

```ts
g.reinforcementDecision = decideLocalReinforcement(context);
g.reinforcementCharges = 1;
g.reinforcementCooldown = 0;
```

Source: `app/page.tsx:81`. `decideLocalReinforcement()` always returns `available:true` (`game/reinforcements.ts:20-25`). Therefore support availability is not conditional on health, deaths, room index, or AI. Those values choose the type/cost/strength. When health crosses below .42, a still-unused decision is recomputed locally (`app/page.tsx:114`).

Activation requires all of:

```ts
decision exists and available
&& reinforcementTypeId exists
&& charges > 0
&& cooldownRemaining <= 0
&& player.energy >= decision.resourceCost
```

Source: `canActivateReinforcement()` (`game/reinforcements.ts:32`). There is exactly one charge per room, so the cooldown normally cannot gate a second use.

After calibration, OpenAI suggestion eligibility is:

```ts
aiSuggestionsEnabled
&& profile.completedTestLevels
&& reinforcementApiCalls < 3
```

The call begins on the first wave. A valid result replaces the decision only if the player is still in that room and has not used support (`app/page.tsx:81`).

### B. Which support is selected?

Local formulas (`game/reinforcements.ts:20-25`):

```ts
pressure = clamp(remainingEnemyCount/10*.55 + roomDifficultyScore/85*.45);
frustration = clamp((1-survival)*.45 + clamp(recentDeaths/3)*.35 + (1-healthRatio)*.2);

if (healthRatio < .42) med-pulse;
else if (recentDeaths > 0 || survival < .38) shield-pulse;
else if (aim < .42 || pressure > .62) stasis-field;
else shield-pulse;

strength = round(clamp(1 + max(pressure, frustration)*2 + strengthBoost, 1, 3));
overuse = clamp(recentUses/3);
costMultiplier = 1 + overuse*.2 - frustration*.08;
cooldownMultiplier = 1 + overuse*.25;
```

Strength boost is +.12 high, −.1 low, 0 normal. No random tie-break exists. Health branch wins, then deaths/survival, then aim/pressure.

| ID | Name | Local selection | Base cost | Base cooldown | Duration | Effect/strength | AI-selectable? |
|---|---|---|---:|---:|---:|---|---|
| `shield-pulse` | Aegis Pulse | deaths, low survival, or default | 24 | 34 s | 2.4 s | Invulnerability; strength tier currently ignored | Yes |
| `med-pulse` | Mender Pulse | HP <42% | 30 | 42 s | 0 | heals `24 + tier×8` | Yes |
| `stasis-field` | Stasis Field | aim <.42 or pressure >.62 | 27 | 38 s | 5 s | radius `155 + tier×18`; enemy speed ×.55 | Yes |

Sources: `game/reinforcements.ts:9-13`; activation `app/page.tsx:77`, slowing `127`.

OpenAI returns a type, strength 1–3, cost multiplier .9–1.2, cooldown multiplier .9–1.25, reasons, and confidence. Client sanitization repeats allowlist checks/clamps and derives duration from the local registry (`game/reinforcements.ts:28-29`). Invalid or failed results leave the already-created local decision unchanged. The player may ignore either recommendation.

## 10. Tutorial and First Five Assessment Levels

**Status: four calibration encounters implemented; tutorial and fifth level not implemented.**

| Room | Fixed preset/template | Mechanical content | Tutorial prompts | Metrics | Assistance/scoring exclusion |
|---:|---|---|---|---|---|
| 1 | `test_aim` / Quiet Gallery | 5-slime group, open lanes, generous drops | None | Standard `EncounterMetrics` | None |
| 2 | `test_priority` / Archive Crossroads | bats/ranged groups, two waves | None | Standard metrics | None |
| 3 | `test_resource` / Sealed Wells | ranged/slime groups, slow field | None | Standard metrics | None |
| 4 | `test_movement` / Orbiting Reliquary | mixed vanguard, rift pulse, ambush waves | None | Standard metrics | None |
| 5 | Boss preset selected by current tier | Warden encounter | None | Standard metrics | None |

Sources: presets `game/rooms.ts:92-105`; fixed calibration branch `121-123`.

There is no tutorial component, prompt registry, event-driven step state, tutorial pause policy, skip/replay UI, tutorial version, or assistance flags. “First-time” is inferred only indirectly: `start()` uses the saved Director when `profile.completedTestLevels` is true; otherwise it creates one from the starting preference (`app/page.tsx:92`). `completedTestLevels` becomes true if any sample has `room >= 4 && completed` (`game/adaptive.ts:63`).

Returning players do not skip rooms 1–4: every new run still calls `prepareRoomQueue(1,4,...)`, whose fixed branch always emits calibration presets. The completed flag only preserves the saved Director and enables AI calls. There is no tutorial replay because there is no distinct tutorial mode. Initial profile calculation starts after room 1 and is recalculated after every room; room 4 merely flips the completion flag.

Paused time is not excluded: duration is wall-clock `performance.now() - roomStarted`, so pauses before completion contaminate duration. No tutorial assistance exists or is excluded from scoring.

## 11. Gameplay Data and Telemetry

`EncounterMetrics` is defined in `game/adaptive.ts:4-11`, initialized by `emptyMetrics()` (`app/page.tsx:42`), mutated in the game loop, finalized at clear/death, retained for up to eight recent encounters, and saved in localStorage.

| Metric / exact field | Recorded/updated | Formula or meaning | Local save | Room AI | Gameplay/profile | Dashboard |
|---|---|---|---|---|---|---|
| `room` | room start | current index | Yes | indirectly | context | record index |
| `durationMs` | clear/death | `performance.now()-roomStarted` | Yes | summarized ratio | objective/confidence inputs | actual duration/ratio |
| `shotsFired` | each firing event | projectile count, so scatter adds 6 | Yes | aggregate profile + summary | accuracy/resource/confidence | accuracy |
| `shotsHit` | projectile/enemy collision | increments per collision, including repeated pierce hits | Yes | aggregate + summary | accuracy/aim | accuracy |
| `criticalHits` | collision within `.48×radius` | count | Yes | only inside profile dimensions | aim | skill bar indirectly |
| `kills` | enemy death | count | Yes | summarized kill rate | tactical | kill rate |
| `damageTaken` | hostile hit/hazard | raw HP damage, may exceed remaining HP | Yes | aggregate DPM + summary | survival | damage ratio |
| `movementMs` | frame with movement input | `dt×1000`, not distance | Yes | dimension only | movement | movement skill |
| `abilityUses` | dash | count | Yes | dimension only | resource/ability | resource/tactics indirectly |
| `energySpent` | weapon fire | weapon cost | Yes | dimension only | resource | not direct |
| `reactionTimesMs` | first firing event | time from room start | Yes | aggregate mean | reaction | reaction skill |
| `killTimesMs` | each enemy death | time since that enemy spawned | Yes | aggregate mean | tactical | tactics indirectly |
| `deaths` | `finish()` | increments 1 on fatal run end | Yes | summary | survival/tier | observed deaths |
| `completed` | clear | boolean | Yes | summary | completion/objective | result |
| `templateId`,`layoutId` | initialization | current plan IDs | Yes | template summary only | history/filtering | room identity |
| `enemiesSpawned` | successful enemy create | count | Yes | kill-rate summary | no profile dimension directly | actual room count/kill rate |
| `damageDealt` | player hit | capped at remaining enemy HP | Yes | No | Unused | No |
| `healthAtStart`,`healthAtEnd` | room boundaries | HP values | Yes | No | start used for dashboard ratio | damage ratio uses start |
| `resourcesCollected` | pickup collection | pickup count, not value | Yes | No | Unused | No |
| `expectedKillRate` | plan initialization | plan prediction | Yes | No | Unused | record uses plan directly |
| `expectedCompletionTimeMs` | plan initialization | prediction×1000 | Yes | No | Unused | completion ratio denominator |
| reinforcement fields | activation | used/type/coarse success | Yes | usage summary to reinforcement API | progression/efficiency | support card |

Derived summaries sent to room AI use `summarizeRoomMetric()` (`game/rooms.ts:172`):

```ts
completionTimeRatio = clamp(durationMs / 90000, 0, 2);
killRate = clamp(kills / max(1, enemiesSpawned || kills), 0, 1);
accuracy = clamp(shotsHit / max(1, shotsFired), 0, 1);
damageTakenRatio = clamp(damageTaken / 120, 0, 2);
```

Metrics reset to a fresh object on every new room (`app/page.tsx:42`, `96`). Raw mouse movement, key events, projectile trajectories, frames, screenshots, and full gameplay recordings are not represented in the request code.

## 12. Player Skill Profile Calculation

`calculateProfile()` uses the latest eight encounter samples (`game/adaptive.ts:45-63`). Recency weighting for movement/ability rises linearly from .7 for the oldest sample to 1.3 for the newest (`game/adaptive.ts:38`).

```ts
accuracy = clamp(totalHits / max(1, totalShots));
damagePerMinute = totalDamage / max(.25, totalDurationMs / 60000);
reactionMs = mean(allReactionTimes, fallback=700);
killTimeMs = mean(allKillTimes, fallback=7000);
movement = weightedRecent(clamp(movementMs / durationMs));
ability = weightedRecent(clamp(abilityUses / max(2, durationMs/18000)));
completion = completedRooms / max(1, recentRooms);
deathRate = clamp(mean(deathsPerRoom));

survival = clamp(normalizeInverse(damagePerMinute, 3, 90) * (1-deathRate*.65));
reaction = normalizeInverse(reactionMs, 170, 950);
combat = normalizeInverse(killTimeMs, 900, 9000);
tactical = clamp(combat*.62 + completion*.38);
objective = clamp(completion*.65 + normalizeInverse(mean(durationMs),25000,150000)*.35);
resource = clamp(accuracy*.55
  + (1-clamp(totalEnergySpent/max(1,totalShots*8)))*.2
  + ability*.25);
aim = clamp(accuracy*.88 + clamp(totalCriticals/max(1,totalHits))*.12);

overall = clamp((aim*.24 + survival*.20 + objective*.16 + tactical*.15
  + movement*.10 + reaction*.09 + resource*.06) * (1-deathRate*.25));
```

`normalizeInverse(value,best,worst) = clamp((worst-value)/(worst-best))` (`game/adaptive.ts:35-36`).

Consistency is `clamp(1 - standardDeviation(roomScores)×2.2)`, where each room score is 40% accuracy, 30% inverse damage, 30% inverse duration. Confidence is:

```ts
clamp(recentCount/5)
* clamp(totalShots/70)
* (.65 + .35*consistency)
```

Missing reaction/kill arrays use 700/7000 ms. Empty accuracy uses denominator 1. The profile stores encounters, the seven dimensions, aggregate values, confidence, and timestamp (`game/adaptive.ts:13-17`, `45-63`). There are no explicit boredom, frustration, confidence-per-dimension, or reinforcement dimensions. Reinforcement efficiency is calculated separately for dashboard/API use.

Score tier bands (`scoreTier()`, `game/adaptive.ts:67`):

| Score | Desired tier |
|---:|---|
| `< .28` | assisted |
| `.28–<.43` | relaxed |
| `.43–<.64` | standard |
| `.64–<.81` | challenging |
| `≥ .81` | expert |

The Director does not jump directly to this tier. `evaluateDifficulty()` requires at least 3 encounters, confidence ≥.45, a 3-checkpoint cooldown (2 on high strength), and repeated directional evidence: 3 eligible checkpoints normally/low, 2 high. It compares score to current-tier centers `[.18,.355,.535,.725,.9]` plus/minus margins .11 low, .085 normal, .065 high, and moves only one tier (`game/adaptive.ts:70-80`).

The actual tier changes enemy count, speed/aggression, attack cooldowns, projectile speed, elite chance, resource-drop chance, attack-pattern complexity, telegraph duration, and controller assist (`game/adaptive.ts:27-33`; `app/page.tsx:83-86`, `105`, `119`, `121-128`). `targetDifficultyScore` itself mainly selects/labels rooms and influences reinforcement pressure; it does not directly multiply damage or health.

## 13. Exact Data Sent to the AI

There are two executed endpoints and one unused endpoint.

### A. Executed room planner: `POST /api/adaptive-rooms`

Client construction: `app/page.tsx:130`. Server schema: `lib/server/adaptive-rooms/schemas.ts:6-65`.

```ts
{
  sessionId: string; // /^[a-zA-Z0-9-]{12,64}$/
  currentTier: "assisted"|"relaxed"|"standard"|"challenging"|"expert";
  roomsRequested: number; // integer 1..4
  profile: {
    overallSkillScore: number; // 0..1
    confidenceScore: number; // 0..1
    dimensions: { aim; movement; tactical; resource; reaction; survival; objective }; // each 0..1
    accuracy: number; // 0..1
    damageTakenPerMinute: number; // 0..10000
    averageKillTimeMs: number; // 0..600000
  };
  recentRooms: Array<{
    templateId: string; // 1..80 chars
    completionTimeRatio: number; // 0..2
    killRate: number; // 0..1
    accuracy: number; // 0..1
    damageTakenRatio: number; // 0..2
    deaths: number; // integer 0..20
    completed: boolean;
  }>; // max 5
  candidates: Array<{
    roomSequenceIndex: number; // integer 1..9999
    presetIds: string[]; // 1..8, unique and locally registered
    mapStyleIds: string[]; // 1..5, unique, registered/compatible
  }>; // 1..4 and length must equal roomsRequested
}
```

| Field | Generated by | Raw/summary | Why sent | Reaches OpenAI? |
|---|---|---|---|---|
| `sessionId` | sessionStorage UUID | pseudonymous session token | rate key only | **No**; planner input omits it |
| `currentTier` | local Director | derived | pacing context | Yes as `tier` |
| `roomsRequested` | buffered candidate length | derived | output cardinality | Yes |
| profile scores/dimensions | `calculateProfile()` | rolling summary | skill context | Yes |
| last ≤5 room summaries | `summarizeRoomMetric()` | summarized | recent evidence | Yes |
| candidate room/preset/style IDs | local registries/filter | allowlist | constrain selection | Yes |

The client is not trusted: the server Zod-parses a strict object, verifies candidate uniqueness and boss/non-boss rules, checks every preset against the local registry, and checks style compatibility (`schemas.ts:33-102`). The server does not recompute the numeric profile from raw events, so valid-range client summaries are still client-provided.

### B. Executed reinforcement planner: `POST /api/adaptive-reinforcements`

Client construction: `app/page.tsx:81`. Schema: `lib/server/adaptive-reinforcements/schemas.ts:4-14`.

```ts
{
  sessionId: string; // same regex
  playerProfile: {
    overallSkill: number; aimSkill: number;
    survivalSkill: number; reinforcementEfficiency: number; // all 0..1
  };
  currentRoom: {
    roomIndex: number; // 1..9999
    roomDifficultyScore: number; // 0..93
    remainingEnemyCount: number; // integer 0..40
    currentHealthRatio: number; currentResourceRatio: number; // 0..1
    bossPhase: boolean;
  };
  recentUsage: {
    reinforcementsUsed: number; successfulUses: number; // integer 0..100
    averageValueScore: number; // 0..1
  };
  allowedReinforcementTypeIds: string[]; // 1..3, unique/registered
}
```

`remainingEnemyCount` here is not the active mob count. At first-wave call time it is `round(targetDifficultyScore/7)` (`app/page.tsx:81`). The complete request except `sessionId` reaches OpenAI nested as `summary: request`; in this planner, `sessionId` does reach OpenAI because the entire request object is nested (`lib/server/adaptive-reinforcements/planner.ts:5`).

### C. Unused difficulty endpoint: `POST /api/adaptive-difficulty`

The route accepts a session ID, tier, any object-like profile, and body under 6000 JSON characters, then sends the entire body as `summary` (`app/api/adaptive-difficulty/route.ts:21-31`, `89-117`). No browser code calls this endpoint, and `Game.gptTier` is never assigned. Its data flow has no current gameplay effect.

### Data not sent by executed construction

The executed request builders do not include the API key, passwords/account fields, screenshots, audio, chat messages, raw key/mouse events, full save JSON, exact player position, projectile paths, or a gameplay recording (`app/page.tsx:81`, `130`). This is a statement about current explicit request bodies, not a platform-wide privacy guarantee. Server/OpenAI SDK transport metadata is outside this repository’s code.

## 14. AI Request Timing

### Room planner

Eligibility at room completion (`app/page.tsx:130`):

```ts
settings.adaptive
&& nextProfile.completedTestLevels
&& (g.room === 4 || g.room % 2 === 0)
&& g.apiCalls < 4
```

Thus calls occur after room 4, then eligible even rooms (normally 6, 8, 10) until the per-run client count reaches four. The profile flag flips on a completed room 4. A prepared immediate room and locally generated tail/fallback exist before the fetch, and the reward overlay proceeds without waiting.

Server controls (`app/api/adaptive-rooms/route.ts`):

- body ≤9000 UTF-8 bytes;
- cache checked before rate limiting;
- default max 4 calls per IP+session per 24-hour in-memory window, configurable/bounded 1–12;
- default cooldown 10 s, bounded 0–120 s;
- default provider timeout 5 s, bounded 1.5–8 s;
- cache TTL 6 hours, bounded 1 minute–24 hours;
- no provider retry (`lib/server/openai/client.ts:11-16`).

There is no browser `AbortController`, request deduplication token, or response sequence number. Provider calls are bounded server-side. In-memory maps are per Vercel process and reset on cold start; they are not global durable rate limiting/caching.

### Reinforcement planner

Runs at the first wave of each room only when suggestions are enabled, calibration is complete, and client calls are below 3 (`app/page.tsx:81`). The local choice exists before the request. Server default max is 3 per IP+session/day, cooldown 15 s, cache 1 hour, and the same 5 s provider timeout (`app/api/adaptive-reinforcements/route.ts:7-10`).

No request is manually initiated from the dashboard. Map-style AI choice is part of room planning only when map-style mode is `ai`; otherwise the server receives only the already chosen local style for each future room (`app/page.tsx:130`).

## 15. OpenAI Prompt Construction

The SDK is created server-side only in `lib/server/openai/client.ts`. It reads `OPENAI_API_KEY`, uses `OPENAI_MODEL` or `gpt-5.6-luna`, `maxRetries:0`, and the bounded timeout. Both executed planners use the Responses API, `store:false`, `reasoning:{effort:"none"}`, and strict JSON Schema output.

### Room planner

System/developer-style instructions are the repository constant `ADAPTIVE_ROOM_INSTRUCTIONS` (`lib/server/adaptive-rooms/planner.ts:10`):

> You are a constrained roguelite encounter-planning system. Select one approved preset and one approved map-style ID for each requested future room, using only the IDs supplied for that exact room. Configure only the bounded fields in the schema. A map style is cosmetic only and must not imply geometry or balance changes. Never invent IDs, geometry, coordinates, code, scripts, assets, or commands. Adapt gradually from rolling skill evidence. Favor readable composition, positioning, wave timing, and recovery over health or damage inflation. Strong aim with weak movement should get clearer lanes and lower flank pressure. Weak aim should avoid fast flank-heavy rooms. Repeated damage or failures should produce recovery without becoming humiliatingly easy. Avoid repeating recent templates. Return only schema-valid JSON.

The input JSON contains goal, tier, profile, recentRooms, candidates, and roomsRequested. Maximum output is 900 tokens. Schema name is `adaptive_room_plans` (`planner.ts:18-42`). No temperature is set.

### Reinforcement planner

Instructions (`lib/server/adaptive-reinforcements/planner.ts:4`):

> You are a constrained support director for a roguelite. Select exactly one reinforcement ID from the supplied allowlist. Preserve player agency: this is a suggestion, never an automatic activation. Prefer protection or control over direct damage. Adjust cost and cooldown only inside the schema bounds. Never invent IDs, code, geometry, assets, commands, or player data. Return only schema-valid JSON.

Input is `{goal:"recommend one optional reinforcement", summary:request}`. Maximum output is 400 tokens. Schema name is `reinforcement_recommendation` (`planner.ts:5`).

Security boundary in plain language: the model chooses only from IDs and numeric ranges supplied by local/server code. It does not return executable code. Free-form reason-code strings are allowed but are capped to four × 40 characters and translated by a local friendly-copy registry when displayed.

## 16. Exact Output Generated by the AI

### Room response

Exact plan shape (`lib/server/adaptive-rooms/schemas.ts:67-84`, JSON Schema `104-151`):

```ts
{
  plans: Array<{
    roomSequenceIndex: number; // integer 1..9999
    presetId: string; // allowlisted for exact room
    spawnPattern: "front"|"spread"|"flank"|"encircle";
    countMultiplier: number; // .75..1.25
    aggressionModifier: number; // -.1..+.1
    reactionModifier: number; // -.1..+.1
    predictedKillRate: number; // 0..1
    predictedCompletionTimeSeconds: number; // 20..150
    predictedDamageTakenRatio: number; // .05–.8
    adaptationReasonCodes: string[]; // max 4, each max 40
    confidence: number; // 0..1
    mapStyleId: string; // allowlisted and compatible
  }> // 1..4; must equal roomsRequested
}
```

Representative **schema-constructed example, not a live response**:

```json
{
  "plans": [
    {
      "roomSequenceIndex": 6,
      "presetId": "ring_skirmish",
      "spawnPattern": "spread",
      "countMultiplier": 1.05,
      "aggressionModifier": 0.02,
      "reactionModifier": 0,
      "predictedKillRate": 0.82,
      "predictedCompletionTimeSeconds": 63,
      "predictedDamageTakenRatio": 0.27,
      "adaptationReasonCodes": ["balanced_pressure"],
      "confidence": 0.82,
      "mapStyleId": "hollow-vault"
    }
  ]
}
```

The server’s HTTP success wrapper adds `success`, `source`, `cached`, and `plans` (`app/api/adaptive-rooms/route.ts:71-72`, `99-101`).

### Reinforcement response

Exact shape (`lib/server/adaptive-reinforcements/schemas.ts:12-15`):

```ts
{
  recommendedTypeId: string; // must be in supplied registry allowlist
  strengthTier: 1|2|3;
  resourceCostMultiplier: number; // .9..1.2
  cooldownMultiplier: number; // .9..1.25
  reasonCodes: string[]; // max 4 × 40 chars
  confidence: number; // 0..1
}
```

Representative **schema-constructed example**:

```json
{
  "recommendedTypeId": "stasis-field",
  "strengthTier": 2,
  "resourceCostMultiplier": 1,
  "cooldownMultiplier": 1.05,
  "reasonCodes": ["high_enemy_pressure", "crowd_control"],
  "confidence": 0.78
}
```

The HTTP wrapper returns it as `recommendation` with success/source/cache fields (`app/api/adaptive-reinforcements/route.ts:10`).

## 17. Output Validation and Local Corrections

### Room planner validation layers

1. **Request transport:** declared and actual body ≤9000 bytes; valid JSON (`app/api/adaptive-rooms/route.ts:37-54`).
2. **Strict request Zod schema:** unknown keys rejected; types/ranges/array sizes enforced (`schemas.ts:33-65`).
3. **Local candidate registry:** unique approved preset/style IDs; correct boss rule; known and compatible styles (`schemas.ts:89-102`).
4. **Provider structured output:** strict JSON Schema with `additionalProperties:false` (`planner.ts:33-40`; `schemas.ts:104-151`).
5. **JSON parse + Zod response schema:** rejects malformed/missing/extra/out-of-range values and wrong plan count (`planner.ts:45-55`).
6. **Client-style sanitizer on server:** exact room allowlist, style allowlist/compatibility, spawn enum, finite numeric values; clamps all numeric ranges and truncates reasons (`planner.ts:57-65`; `game/rooms.ts:161-165`).
7. **Client repeats sanitization:** `sanitizePlannerSelections(data, allowed, allowedStyles)` on the HTTP body (`app/page.tsx:130`).
8. **Confidence gate:** plans below .5 are ignored (`game/rooms.ts:168-169`).
9. **Materialization:** IDs are resolved to local preset/template/group/zone definitions; style incompatibility becomes `hollow-vault` (`game/rooms.ts:141-146`).
10. **Prepared-room validation:** preset/template/layout/style consistency, boss index rule, ≤3 groups per wave, known group/zone IDs, estimated entity count ≤template limit, score 0–93 (`game/rooms.ts:155-159`).

Unknown fields are rejected at Zod/schema layers. Out-of-range provider numbers should be rejected by strict schema before sanitizer; direct sanitizer use clamps them. An invalid response is rejected as a whole. A low-confidence individual selection is ignored while other confident matching selections may apply. An invalid materialized candidate leaves the corresponding current local room unchanged.

The audit trail is incomplete: `localAdjustments` records only requested-versus-applied map-style incompatibility, not every clamp, low-confidence rejection, entity-limit failure, or skipped enemy spawn (`game/transparency.ts:64-68`).

### Reinforcement validation

Request size ≤6000, strict request schema, unique known allowlist, rate/cache/provider checks, strict provider JSON Schema, Zod response, allowlisted returned ID, then client registry check/clamps and local derivation of final cost/cooldown/duration (`app/api/adaptive-reinforcements/route.ts:9-10`; planner `:5`; `game/reinforcements.ts:28-29`). Invalid output does not partially apply; local choice remains.

There are no navigation-mesh checks because geometry is never model-generated. Enemy collision/entrance checks occur only when the selected local plan is spawned.

## 18. What the AI Output Actually Changes

### Room planner application matrix

| Output | Returned | Validated | Applied to gameplay? | Runtime use |
|---|---|---|---|---|
| `roomSequenceIndex` | Yes | Yes | Routing only | matches buffered room |
| `presetId` | Yes | allowlisted | **Yes** | selects fixed template, groups, waves, hazard, pickups, pacing |
| `spawnPattern` | Yes | enum | **Yes** | changes group-to-zone ordering |
| `countMultiplier` | Yes | .75–1.25 | **Yes** | enemy count formula |
| `aggressionModifier` | Yes | −.1…+.1 | **Yes** | enemy movement speed |
| `reactionModifier` | Yes | −.1…+.1 | **Yes** | initial enemy attack cooldown; also embedded in placements |
| `predictedKillRate` | Yes | 0–1 | No direct mechanic | dashboard prediction/record |
| `predictedCompletionTimeSeconds` | Yes | 20–150 | No direct mechanic | dashboard/expected duration |
| `predictedDamageTakenRatio` | Yes | .05–.8 | No current mechanic/UI use | stored in plan only |
| `adaptationReasonCodes` | Yes | length/type | Explanation only | dashboard friendly reasons |
| `confidence` | Yes | 0–1 | Acceptance gate | <.5 selection ignored |
| `mapStyleId` | Yes | allowlist/compatibility | Cosmetic only | canvas palette/decorations |

Wave count/delay, enemy IDs, objective, hazards, pickups, layout, and geometry are not independent AI output fields. They change only indirectly when an allowlisted `presetId` selects a different fixed preset. Enemy health/damage are never AI-controlled.

### Reinforcement application matrix

| Output | Applied? | Effect |
|---|---|---|
| `recommendedTypeId` | Yes if response arrives before use | replaces displayed/activatable type |
| `strengthTier` | Yes | med heal/stasis radius; Aegis ignores it |
| `resourceCostMultiplier` | Yes | local base cost × clamped multiplier |
| `cooldownMultiplier` | Yes | local base cooldown × clamped multiplier |
| `reasonCodes` | Information | dashboard/HUD explanation |
| `confidence` | Stored/displayed | no minimum-confidence gate for reinforcement |

## 19. AI Dashboard Data Flow

```text
live EncounterMetrics
→ calculateProfile() and evaluateDifficulty()
→ current PreparedRoom + reinforcement decision
→ buildAdaptationRecord()
→ optional next-room plan replacement
→ attachNextRoomPreview()
→ AIDirectorWidget / PostRoomDirectorSummary / DirectorDashboard
```

Source record construction: `app/page.tsx:93-94`, `130`, `150`; derivation: `game/transparency.ts`; rendering: `app/game-ui.tsx`.

| Dashboard value | Source | Classification |
|---|---|---|
| AI active/planner status | settings + `plannerStatus` + records | Real local state |
| Room source | `PreparedRoom.source`: local/gpt/fallback | Real, cached in record |
| “What was noticed” | threshold rules over record accuracy/time/damage/support | Locally derived |
| “What changed” | comparison of previous/current `RoomFactSnapshot` | Locally derived |
| “Why” | plan/support reason codes mapped through fixed copy | AI- or locally generated code, locally worded |
| Current difficulty | recorded `DirectorState.tier` | Real |
| Next trend | local pressure-score comparison | Derived, not model output |
| Skill bars | current profile dimensions + reinforcement efficiency | Real derived |
| Prediction vs actual | plan prediction vs duration/kill rate | AI or preset prediction + real actual |
| Reinforcement card | recorded final decision/use/success | Real/coarsely derived |
| Local fallback | plan source/status | Real |

`roomFacts()` computes cover as obstacle area divided by `1132×572`; >.12 is high, >.055 medium. `flankRouteCount` is 2 for `encircle`, 1 for `flank`, otherwise 0. It is not pathfinding. Enemy health/damage modifiers are hardcoded 1. `difficultyTrend` uses enemy count + `waves×2 + eliteChance×10 + flankRoutes×1.5 + hazard weight`; next-room pressure also adds pickup scarcity (`game/transparency.ts:55-78`).

The dashboard is not mocked, but these inconsistencies exist:

- “Enemy health adaptation unchanged” can be read as no scaling, while health grows 15% per room (`transparency.ts:68`; `page.tsx:85`).
- `resourcesCollected` is recorded but not used in resource skill (`adaptive.ts:56`).
- `plannerStatus === "planning"` displays “The next room is ready” because the immediate local room is ready, while later replacement planning is still active (`transparency.ts:84`).
- local adjustment history omits most validation corrections.

## 20. Failure and Fallback Behavior

| Failure | Detected in | Player effect / fallback | Continues? | Retry/logging |
|---|---|---|---|---|
| Missing API key | `getOpenAIClient()` / routes | 503; room plans marked fallback, local support retained | Yes | no automatic retry; no client log |
| `ADAPTIVE_ROOMS_ENABLED=false` | both executed routes | 503 `adaptive_rooms_disabled`; same local fallback | Yes | no retry |
| Invalid room body/JSON | room route | 400, client treats null as fallback | Yes | no retry |
| Invalid reinforcement body/JSON | reinforcement route | 400, local choice remains | Yes | no retry |
| Provider timeout/error/rate limit | routes | 429/503; same local fallbacks | Yes | SDK retries disabled |
| Empty/malformed provider output | planners | null → 503 | Yes | no retry |
| Unknown preset/style/room mismatch | server/client validation | whole response rejected or matching selection ignored | Yes | fallback record only |
| Excessive count/modifier | strict schema/sanitizer | rejected or clamped; materialized local cap check | Yes | incomplete correction record |
| Low room confidence | `applyPlannerSelections()` | that plan ignored, local room kept | Yes | no retry |
| Unknown reinforcement ID | planner/client sanitizer | local decision retained | Yes | no retry |
| Browser network offline | fetch promise | room queue marked fallback; reinforcement unchanged | Yes | no retry |
| Vercel function cold start/state reset | platform + module maps | rate/cache state resets; gameplay unaffected | Yes | not detected |
| Empty prepared queue | `choose()` | generate local room immediately and refill | Yes | N/A |
| Invalid saved prepared room | migration only shallow-filters objects | not consumed on new run, so no runtime plan failure | Yes | queue restore is absent |
| Invalid enemy placement | spawn loop | skip that enemy after bounded attempts | Yes | no production log |
| Invalid player spawn | resolver/assembly | backups/radial/center; then throws if impossible | Usually; final failure crashes room path | fallback warning dev-only |
| Invalid save/blocked storage | load/persist try/catch | defaults/in-memory play, no warning | Yes | silently swallowed |

Room fetch success is not checked beyond `r.ok`; error response bodies are discarded. Fallback plans add `openai_fallback` and `source:"fallback"` (`app/page.tsx:130`). Reinforcement `.catch()` is empty because local choice is already present (`app/page.tsx:81`).

## 21. Security and Privacy

### Implemented protections

- `OPENAI_API_KEY` is read only in `lib/server/openai/client.ts`, which imports `server-only`; no `NEXT_PUBLIC_` key exists (`.env.example`; client.ts:1-16).
- Browser code calls same-origin `/api/...`, never OpenAI directly (`app/page.tsx:81`, `130`).
- Executed routes use the Node runtime and bounded `maxDuration=10` (`app/api/adaptive-rooms/route.ts:17-18`; reinforcement route `:6`).
- Request byte limits, strict schemas, finite numeric ranges, array limits, registry allowlists, boss rules, and style compatibility constrain room/reinforcement inputs.
- Provider output uses strict JSON Schema, Zod parsing, allowlists, clamps, and local materialization.
- `store:false` is sent to Responses API (`planner.ts:22`; reinforcement planner `:5`).
- Raw provider errors are not returned; routes emit fixed error codes.
- Model name is server-controlled by environment, not request input.

### Current weaknesses/limits

- Rate limiting and caching use process-local `Map`s. On Vercel they are neither durable nor globally consistent, and can reset/partition across instances (`app/api/adaptive-rooms/route.ts:22-23`; reinforcement route `:7`).
- There is no authentication. Session ID is client-generated and IP headers contribute to rate keys.
- Numeric profile summaries are range-validated but not server-recomputed; a modified client can submit invented in-range performance.
- The reinforcement prompt receives `sessionId` because the full request is sent as `summary`; it is unnecessary for model reasoning (`reinforcement planner.ts:5`). The room planner correctly omits it.
- The unused adaptive-difficulty endpoint has weaker validation (`profile` only needs to be an object) and sends the whole body to the model (`app/api/adaptive-difficulty/route.ts:21-31`, `97-107`). It is not reachable from the current UI but remains an exposed route.
- Reason codes are model-generated strings. Rendering maps unknown values to fixed copy, reducing direct prompt-output display risk (`game/transparency.ts:48-51`).
- No explicit Content Security Policy or route authentication is defined in `next.config.ts`.
- No request identifiers or structured audit logs exist; catches intentionally suppress details.

No repository code logs the API key. The health route reports configured/enabled/model status but not the key (`app/api/health/route.ts:9-25`).

## 22. Worked End-to-End Example

This is a **schema-based hypothetical using actual formulas and registries**, not a captured live provider response.

### 1–4. Clear, metrics, derived profile, local tier

Suppose room 4 finishes with 50 shots, 35 hits, 8 kills from 8 spawned enemies, 24 damage, 60 seconds, no death. Its request summary is:

```text
accuracy = 35/50 = .70
killRate = 8/8 = 1
completionTimeRatio = 60000/90000 = .667
damageTakenRatio = 24/120 = .20
```

`calculateProfile()` recomputes the rolling eight-room profile; assume the resulting validated aggregate is overall .70, confidence .80, aim .72, movement .60, survival .68, with the other real dimensions in range. `completedTestLevels` becomes true because room 4 completed. `evaluateDifficulty()` may move only if its evidence/cooldown gates pass; otherwise it retains the current tier.

### 5. Client request

The game first locally prepares rooms 5–7, then POSTs an object containing the session ID, current tier, the seven-dimension profile, last ≤5 summarized rooms, and the exact allowed preset/style IDs for those three room indexes (`app/page.tsx:130`). Room 5’s allowlist contains boss presets because `5 % 5 === 0`.

### 6–8. Server and OpenAI

The route verifies ≤9 KB, strict Zod fields, unique rooms/IDs, local registries, boss rules, rate/cooldown/cache, then calls Responses API with the fixed instructions and strict schema (`route.ts:37-101`; planner.ts:10-66`). Suppose the model returns room 6:

```json
{
  "roomSequenceIndex": 6,
  "presetId": "ring_skirmish",
  "spawnPattern": "spread",
  "countMultiplier": 1.05,
  "aggressionModifier": 0.02,
  "reactionModifier": 0,
  "predictedKillRate": 0.82,
  "predictedCompletionTimeSeconds": 63,
  "predictedDamageTakenRatio": 0.27,
  "adaptationReasonCodes": ["balanced_pressure"],
  "confidence": 0.82,
  "mapStyleId": "hollow-vault"
}
```

### 9–11. Local correction, queue, spawn

The plan passes allowlists, clamps (no changes), confidence .5, materialization, and prepared-room validation. It replaces only matching buffered room 6. `ring_skirmish` uses one base-6 group in `double` mode, which repeats it. If the actual tier is challenging (count multiplier 1.12):

```text
per wave = round(6 × 1.05 × 1.12) = round(7.056) = 7
total = 14 over two waves
wave 1 = 7 immediately
wave 2 = 7 immediately after all wave-1 enemies die + 1.1 s
enemy speed multiplier = 1.12 tier × 1.02 AI aggression = 1.1424
```

Enemy health still uses only base health, room-6 growth `(1+.9)`, and elite multiplier; AI does not change it. The next upgrade selection shifts the validated plan from the queue and `spawnWave()` applies it (`app/page.tsx:83-86`, `96`).

### 12. Dashboard

After room 6, `buildAdaptationRecord()` records source `openai`, actual spawned count, real accuracy/damage/time/kill rate, prediction versus actual, plan reasons, and final room facts. It reports spread as zero flank routes, two waves, total delay 1.1 s, and the selected style (`game/transparency.ts:55-68`).

## 23. Implemented-versus-Intended Matrix

| Feature | Current implemented behavior | Affects gameplay? | AI involved? | Status | Main files |
|---|---|---:|---:|---|---|
| Adaptive room selection | local filter/seeded preset + optional bounded replacement | Yes | Optional | Implemented | `adaptive.ts`, `rooms.ts`, `page.tsx` |
| Generated layouts | fixed templates only | No generated geometry | No | Not implemented | `rooms.ts` |
| Spawn-rate adaptation | immediate whole waves + fixed 1.1 s delay | No adaptation | No | Not implemented | `rooms.ts`, `page.tsx` |
| Enemy-count adaptation | tier × bounded plan multiplier | Yes | Optional multiplier/preset | Implemented | `adaptive.ts`, `rooms.ts`, `page.tsx` |
| AI map style | approved compatible palette selection | Cosmetic | Yes in AI style mode | Implemented | `customization.ts`, room planner |
| Reinforcement AI | local recommendation, optional async replacement | Yes if player activates | Optional | Implemented | reinforcement files, `page.tsx` |
| Tutorial assessment | four fixed calibration rooms; no tutorial steps/fifth assessment | Yes as ordinary rooms | AI starts afterward | Partially implemented |
| Player skill profile | rolling 8 rooms, seven weighted dimensions | Yes through tier/filtering | Sent to AI | Implemented | `adaptive.ts` |
| Dashboard | real records and derived explanations, some misleading claims | Information only | Shows AI/local fields | Partially implemented | `transparency.ts`, `game-ui.tsx` |
| Prepared room queue | three future plans with a local tail/fallback; matching AI replacement | Yes | Optional | Implemented in-run | `page.tsx`, `rooms.ts` |
| Queue persistence | saved/migrated but ignored when starting | No restored effect | No | Broken | `page.tsx`, `adaptive.ts` |
| Local fallback | local rooms/support precede network | Yes | No | Implemented | `page.tsx`, `rooms.ts`, `reinforcements.ts` |
| AI predictions | stored/displayed only | No direct control | Yes | UI only | planner, `transparency.ts` |
| AI reason codes | fixed-copy dashboard explanations | No direct control | Yes/local | UI only | `transparency.ts` |
| Save persistence | metagame/profile/settings; no run resume | Partly | No | Partially implemented | `page.tsx`, migration files |
| Vercel API | Node route handlers, same-origin fetch, server key | Yes when configured | Yes | Implemented with weak distributed limits | `app/api`, `lib/server` |
| Difficulty AI route | complete standalone route, no client caller | No | Would be | Unused | `adaptive-difficulty/route.ts` |

## 24. Problems and Gaps

| Severity | Problem | Observed behavior | Root cause | Recommended next step | Files |
|---|---|---|---|---|---|
| High | Requested five-level tutorial does not exist | Four ordinary calibration rooms, no instruction/skip/replay/assistance model | no tutorial state or fifth calibration preset | design and implement separately; do not describe current calibration as tutorial | `rooms.ts:92-95`, `adaptive.ts:63` |
| High | Saved queue/seed/history are not restored | every run starts room 1 with a new seed despite persisted fields | load/start omit migrated values | either restore a valid run or stop claiming queue persistence | `page.tsx:72,92`; `adaptive.ts:86` |
| High | Cursor/input lifecycle is incomplete | pointer lock remains on clear; held input can continue before reward overlay; pause does not clear input | pointer lock and mutable input are tied only to canvas mouse/Escape | centralize interaction mode and reset input on every transition | `page.tsx:98,103,114,130` |
| High | OpenAI difficulty endpoint is disconnected | returned tier/changes can never affect Director | no fetch; `gptTier` never assigned | remove endpoint or explicitly integrate after security review | `adaptive-difficulty/route.ts`; `page.tsx:24` |
| Medium | Process-local rate limit/cache is weak on Vercel | limits reset or partition across function instances | module `Map` state is ephemeral | use durable rate-limit/cache service if abuse/cost risk warrants | both executed routes |
| Medium | AI-plan entity validation differs from runtime | tier-scaled runtime count can exceed template validation estimate; no live active cap | validator omits tier multiplier | validate exact materialized tier count and enforce runtime cap | `rooms.ts:155-159`; `page.tsx:83` |
| Medium | Enemy spawn ignores enemy occupancy | enemies may overlap at spawn | rejection checks omit existing mobs | include occupied enemies with bounded fallback | `page.tsx:84` |
| Medium | Piercing hits can inflate accuracy | one projectile can hit same enemy on consecutive frames; hits may exceed shots | no per-projectile hit registry | track enemy IDs already hit per projectile | `page.tsx:128`; `adaptive.ts:47` |
| Medium | Dashboard health claim is misleading | health modifier says 1/unchanged while room index increases health | record models adaptive modifier, not actual scale | show both base progression and adaptive modifier explicitly | `transparency.ts:55-68`; `page.tsx:85` |
| Medium | AI adjustment audit is incomplete | most clamps/rejections are invisible | `localAdjustments` only checks style mismatch | record requested, validated, applied, rejection reason per field | `transparency.ts:64-68`; `rooms.ts:161-170` |
| Medium | Reinforcement remaining count sent to AI is estimated | model receives `round(score/7)`, not current enemies | call happens before enemy spawn and uses score proxy | name field honestly or compute expected exact composition locally | `page.tsx:81` |
| Medium | Pause time can contaminate completion time | duration is wall-clock from spawn to clear/death | no paused-time accumulator | track active simulation time separately | `page.tsx:80,95,130` |
| Low | Reinforcement cooldown normally has no effect | one charge prevents a second use anyway | charge set to 1 every room | simplify UI or define multi-charge cases | `page.tsx:81`; `reinforcements.ts:32` |
| Low | Aegis strength tier is ignored | tiers 1–3 all grant 2.4 s | activation uses definition duration only | either remove tier for Aegis or scale within declared bounds | `page.tsx:77` |
| Low | Reinforcement API sends session ID to OpenAI | unnecessary identifier enters model input | full request nested as summary | omit `sessionId` as room planner does | reinforcement planner `:5` |
| Low | Some collected telemetry is unused | `damageDealt`, `resourcesCollected`, health end do not affect profile/API | fields added without consumers | document as diagnostics or connect intentionally | `adaptive.ts:4-11`; `page.tsx:128-129` |
| Low | One-group double/ambush repeats group | e.g. `ring_skirmish` becomes 12 standard enemies | fallback repeats full group list | make repetition explicit in preset or change wave materializer | `rooms.ts:136-138` |
| Low | Sound and run state persistence are inconsistent | sound resets; current run cannot resume | save/load field mismatch and no run schema | define supported persistence contract | `page.tsx:59,72,95` |

## Concise audit conclusions

1. **Core loop:** fixed-template room → immediate wave → combat → fixed 1.1 s between complete waves → profile/tier update → local three-room queue → optional AI replacement → relic choice → next room.
2. **Spawn rate:** no per-enemy rate; whole waves spawn immediately; non-first waves wait exactly 1.1 s after the prior wave is empty.
3. **Reinforcement appearance:** one available recommendation/charge is created at every room’s first wave. Health affects type, not availability. The player activates it.
4. **Room-AI data:** session ID for server rate limiting, tier, rolling profile, up to five summarized rooms, and exact allowed preset/style IDs for 1–4 buffered rooms. The room planner omits session ID from the OpenAI input.
5. **Room-AI output:** exact room index, allowlisted preset/style, spawn pattern, count/aggression/reaction modifiers, three predictions, reason codes, and confidence.
6. **Fields that affect play:** preset, spawn pattern, count multiplier, aggression modifier, reaction modifier; map style affects visuals. Predictions/reasons do not change combat; confidence gates application.
7. **Without AI:** the full game continues using seeded local rooms, local tier evaluation, local reinforcements, and deterministic fallback.
8. **Largest gaps:** no five-level tutorial, saved queue/run cannot resume, and cursor/input transitions are not safely centralized. The separate AI difficulty endpoint is also unused.

## Audit verification note

This audit did not modify gameplay, balance, UI, API, configuration, or persistence code. The only new artifact is `GAME_MECHANICS_AND_AI_FLOW.md`.

- TypeScript: passed with `tsc --noEmit --incremental false`.
- ESLint: passed with the repository configuration.
- Automated tests: 69 passed, 0 failed. The suite covers adaptive formulas, room/server schemas, provider fail-closed behavior, queue replacement, reinforcements, spawn resolution, dashboard derivation, persistence migration, accessibility, and Vercel boundaries.
- Production build: not rerun because this task added documentation only and changed no compiled source.
