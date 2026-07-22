# Genuine Adaptation Architecture

## Outcome

The game no longer plans future rooms from a difficulty tier alone. The local director now combines an eight-room skill window, persistent habits, editable preferences, confidence, pacing history, prediction calibration, boss-attempt memory, approved room modules, and bounded enemy behavior profiles. OpenAI remains an optional server-side planner. Local planning always produces the buffered rooms first, so combat never waits for a network request.

Baseline player damage, enemy damage, enemy health, spawn health growth, wave delay, controls, aiming, cosmetics, map styling, and tutorial progression were not changed.

## Original hardcoded limitations

| System | Previous runtime behavior | Limitation removed |
| --- | --- | --- |
| Difficulty | Five tiers selected mainly from one overall score | Separate dimensions now drive modules, behavior, pacing, and predictions |
| Room planning | Whole presets selected from a bounded list | Presets remain the safe geometry envelope, but profile-specific approved modules and layouts are selected and validated |
| Enemy behavior | Tier multipliers were the main behavior difference | Applied behavior profiles change aggression, attack frequency, and bounded flanking |
| Long-term memory | Eight recent encounter metrics only | Save-persistent habits, preferences, calibration, pacing, and boss analysis |
| Prediction | Static preset midpoint values | Per-player local predictions calibrated after every room |
| Bosses | Tier behavior only | Failed attempts improve telegraph clarity and reorder patterns for the next attempt |
| OpenAI | Received score/dimensions and preset choices | Receives bounded skill, habit, preference, pacing, and calibration summaries |

## Runtime data flow

```text
Room-end telemetry
        ↓
8-room deterministic skill profile
        ↓
habit + preference + confidence memory
        ↓
multi-room pacing role
        ↓
approved preset + modules + behavior profile
        ↓
local prediction and validation
        ↓
prepared room queue (immediate)
        ↓
optional server-side OpenAI recommendation
        ↓
strict schema + approved-ID checks + local materialization
        ↓
final applied room + dashboard history
```

## Profile formulas

All normalized values are clamped to `[0, 1]`; only the latest eight encounters are used. Recent samples have linearly increasing weights from `0.7` to `1.3`.

- `aim = accuracy × 0.88 + criticalHitRatio × 0.12`
- `survival = inverseNormalize(damagePerMinute, best=3, worst=90) × (1 - deathRate × 0.65)`
- `tactical = inverseNormalize(avgKillTime, 900, 9000) × 0.62 + completionRate × 0.38`
- `objective = completionRate × 0.65 + inverseNormalize(avgDuration, 25000, 150000) × 0.35`
- `movement = weightedRecent(movementMs / durationMs)`
- `reaction = inverseNormalize(avgReactionMs, 170, 950)`
- `resource = accuracy × 0.55 + energyEfficiency × 0.20 + abilityEfficiency × 0.25`
- `overall = weighted dimensions × (1 - deathRate × 0.25)`, with weights aim `.24`, survival `.20`, objective `.16`, tactics `.15`, movement `.10`, reaction `.09`, resources `.06`.
- `confidence = clamp(roomVolume × shotVolume) × (0.65 + consistency × 0.35)`.

The extended profile keeps ability and preference separate. For example, aggression preference is `fastClearRate × .55 + movementSkill × .45`; frustration risk is `deathRate × .50 + damageRatio × .32 + failureRate × .18`. Per-dimension confidence scales the overall evidence by relevant room or shot volume.

## Habit detection and confidence

The local system currently recognizes stationary combat, rush entry, long-range combat, and late reinforcement use. It also persists bounded fields for weapon/ability dominance, retreats, cover, flank avoidance, target priority, healing, and reinforcement timing as telemetry becomes available.

A habit is actionable only when:

```ts
evidenceCount >= 3 && confidence >= 0.65
```

The chance of applying a habit counter is:

```ts
min(0.35, meanActionableHabitConfidence * adaptationStrength * 0.5)
```

Therefore one unusual room cannot trigger a counter, and even high-confidence habits are not countered every room.

## Preferences

Challenge preference and adaptation strength remain player-editable. Their normalized mappings are:

- challenge: Relaxed `.30`, Balanced `.50`, Challenging `.75`
- adaptive strength: Low `.35`, Normal `.65`, High `.90`

Preference state is stored independently from measured ability in `AdaptiveMemory.preferences`.

## Enemy behavior profiles

Approved profiles are `cautious`, `balanced`, `aggressive`, `flanking`, `coordinated`, and `area-control`. Each declares preferred distance, flank tendency, retreat threshold, cover usage, coordination, reaction multiplier, attack-frequency multiplier, and compatibility metadata.

At runtime, the selected profile changes movement aggression, attack cadence, and bounded lateral flanking. It cannot change base health or damage, bypass line of sight, remove telegraphs, or read player input.

## Room modules

Approved modules cover safe entrance, open or covered arena, lanes, readable cover, zero or one flank route, controlled hazard, pickup, reinforcement, and exit metadata. The validator rejects unknown IDs and incompatible pairs such as `arena-open + corridor-lanes` or `flank-none + flank-single`.

For safety and save compatibility, modules select and describe validated variants inside existing room-template geometry; they do not create arbitrary coordinates. The selected template supplies real obstacles, spawn zones, collision, navigation envelope, and entity cap.

## Prediction and calibration

For every prepared room:

```text
relativePressure = clamp(difficultyScore / 90 - overallSkill + 0.5)
completion = clamp(baseDuration × (0.72 + relativePressure × 0.62) × calibration, 20, 150)
killRate = clamp((1.04 - relativePressure × 0.42) × calibration, 0.20, 1)
damage = clamp((0.08 + relativePressure × 0.50 + hazard × 0.08 - resources × 0.05) × calibration, 0.05, 0.80)
death = clamp(relativePressure × 0.52 + frustration × 0.25 - survival × 0.20, 0, 0.85)
```

After completion, global and per-template calibration factors use a capped exponential update:

```ts
observedRatio = clamp(actual / predicted, 0.7, 1.3)
next = previous * 0.85 + observedRatio * 0.15
```

## Pacing and experiments

The pacing director chooses warmup, standard, pressure, recovery, challenge, elite, reward, pre-boss, or boss roles from recent failures, frustration, boredom, confidence, previous roles, and boss proximity. Failure risk above `.58` selects recovery. A boss or elite is followed by reward pacing. High-confidence boredom produces challenge; high-confidence skill above `.72` produces pressure.

Safe experiments are limited to one variable, currently readable cover density. They are suppressed during boss cadence, recovery/frustration, low confidence, or another active experiment, and have a deterministic maximum start opportunity of 22%.

## Boss adaptation

Boss adaptation occurs only after a failed attempt. Each failure records phase reached, stationary ratio, reinforcement use, and available damage-source data. Later attempts may:

- increase telegraph duration by `6%` per failure, capped at `18%`;
- shift pattern ordering by `attempts % 3`;
- never increase boss health or damage.

Successful attempts do not add failure adaptation.

## Reinforcements

Local reinforcement selection uses health, survival, aim, active pressure, recent deaths, boss phase, resource ratio, and recent reinforcement usage. Low health favors healing; repeated deaths or weak survival favor shielding; weak aim or crowd pressure favors stasis. Recent overuse increases cost by up to 20% and cooldown by up to 25%. OpenAI may choose only from the same three approved IDs, and activation always remains the player's choice.

## OpenAI boundary

`POST /api/adaptive-rooms` receives no replay, arbitrary prompt, coordinates, or secret. The request contains the local skill summary, recent room summaries, actionable habit IDs and rates, editable preferences, pacing history, calibration factors, candidate preset/style IDs, approved behavior IDs, and approved module IDs.

The strict response contains preset, map style, spawn pattern, bounded count/aggression/reaction modifiers, pacing role, behavior profile, room modules, predictions, reason codes, and confidence. Unknown fields or IDs, incompatible styles/modules, invalid boss placement, bad numeric ranges, or invalid spawn/entity caps fail closed. The already-prepared local queue remains playable.

## Dashboard data flow

The dashboard reads final applied `PreparedRoom` data—not raw model output. Its room facts include pacing, behavior, approved modules, enemy count, health/damage multipliers, wave delay, predictions, map style, source, and validation result. Adaptation records compare the previous final room with the next final room and suppress false “changes” when values are identical.

## Same-seed comparison proof

`tests/genuine-adaptation.test.ts` runs identical seeds with different player profiles. The generated sequences differ in preset, module set, behavior profile, and performance prediction. A second test verifies identical telemetry and seed produce byte-for-byte identical local plans.

## Persistence and performance

Save schema `7` migrates legacy progress while adding `adaptiveMemory`. Histories are capped: performance 8, pacing 8, habits 8, adaptation records 12, room history 12. Analysis happens at room boundaries, never per frame. API work is asynchronous and future rooms are already buffered.

## Verification

The production verification commands are:

```bash
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

The anti-hardcoding suite covers deterministic results, different-profile divergence, habit thresholds, recovery pacing, module validation, controlled experiments, boss adaptation, prediction calibration, schema validation, invalid-ID rejection, fallback planning, persistence, dashboard integrity, and preserved combat constants.

## Honest limitations

- Existing geometry is intentionally retained; room modules choose validated structural variants and metadata rather than stitching new free-form geometry.
- Directional circling, precise cover occupancy, target-role order, and boss damage-source attribution are represented in the persistent schema but need richer runtime event instrumentation before they can become actionable habits.
- Controlled experiments currently vary readable cover only. The framework prevents concurrent or boss/recovery experiments, but more single-variable experiment definitions can be added later.
- OpenAI remains optional. Without a configured key, the deterministic local director supplies all rooms, behavior, pacing, predictions, boss adjustments, and reinforcements.
