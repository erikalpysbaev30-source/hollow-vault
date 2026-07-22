import assert from "node:assert/strict";
import test from "node:test";

import { calculateProfile, type EncounterMetrics } from "../game/adaptive";
import {
  DEFAULT_CUSTOMIZATION, DEFAULT_PROGRESSION, MAP_STYLES, chooseMapStyle, equipSkin,
  evaluateUnlocks, getMapStyle, getPlayerSkin, migrateCustomization, selectMapStyle,
} from "../game/customization";
import {
  canActivateReinforcement, decideLocalReinforcement, emptyReinforcementUsage,
  sanitizeReinforcementRecommendation,
} from "../game/reinforcements";
import { prepareRoomQueue, SPAWN_BALANCE, validatePreparedRoom } from "../game/rooms";
import {
  ADAPTATION_HISTORY_LIMIT, adaptationReasonText, appendAdaptationRecord,
  buildAdaptationRecord, compareRoomFacts, roomFacts,
} from "../game/transparency";

const metric = (overrides: Partial<EncounterMetrics> = {}): EncounterMetrics => ({
  room: 1, durationMs: 60_000, shotsFired: 50, shotsHit: 30, criticalHits: 4, kills: 7,
  damageTaken: 18, movementMs: 30_000, abilityUses: 2, energySpent: 50,
  reactionTimesMs: [350], killTimesMs: [2_500], deaths: 0, completed: true,
  enemiesSpawned: 7, healthAtStart: 120, healthAtEnd: 102, expectedCompletionTimeMs: 65_000,
  ...overrides,
});

const profile = calculateProfile(Array.from({ length: 6 }, (_, index) => metric({ room: index + 1 })));

test("reinforcement decisions are deterministic and react to health", () => {
  const context = { healthRatio: .3, resourceRatio: .8, remainingEnemyCount: 5, roomDifficultyScore: 40,
    bossPhase: false, recentDeaths: 0, profile, usage: emptyReinforcementUsage(), tier: "standard" as const,
    adaptationStrength: "normal" as const };
  assert.deepEqual(decideLocalReinforcement(context), decideLocalReinforcement(context));
  assert.equal(decideLocalReinforcement(context).reinforcementTypeId, "med-pulse");
});

test("reinforcement overuse raises bounded cost and cooldown", () => {
  const base = { healthRatio: .8, resourceRatio: .8, remainingEnemyCount: 8, roomDifficultyScore: 55,
    bossPhase: false, recentDeaths: 0, profile, tier: "standard" as const, adaptationStrength: "normal" as const };
  const unused = decideLocalReinforcement({ ...base, usage: emptyReinforcementUsage() });
  const used = decideLocalReinforcement({ ...base, usage: { uses: 5, successfulUses: 4, valueTotal: 4, recentUses: 3, typesUsed: ["stasis-field"] } });
  assert.ok(used.resourceCost >= unused.resourceCost);
  assert.ok(used.cooldownSeconds >= unused.cooldownSeconds);
  assert.ok(used.reasonCodes.includes("reinforcement_overuse"));
});

test("reinforcement recommendations fail closed and activation preserves player choice", () => {
  assert.equal(sanitizeReinforcementRecommendation({ recommendedTypeId: "invented", strengthTier: 2, resourceCostMultiplier: 1, cooldownMultiplier: 1, confidence: 1, reasonCodes: [] }, ["shield-pulse"]), null);
  const decision = decideLocalReinforcement({ healthRatio: .4, resourceRatio: 1, remainingEnemyCount: 3, roomDifficultyScore: 30, bossPhase: false, recentDeaths: 0, profile, usage: emptyReinforcementUsage(), tier: "standard", adaptationStrength: "normal" });
  assert.equal(canActivateReinforcement({ decision, charges: 1, cooldownRemaining: 0, energy: decision.resourceCost }).reason, "ready");
  assert.equal(canActivateReinforcement({ decision, charges: 0, cooldownRemaining: 0, energy: 100 }).reason, "no_charges");
  assert.equal(canActivateReinforcement({ decision, charges: 1, cooldownRemaining: 2, energy: 100 }).reason, "cooldown");
  assert.equal(canActivateReinforcement({ decision: null, charges: 1, cooldownRemaining: 0, energy: 100 }).reason, "unavailable");
});

test("skin and map unlocks are deterministic and locked selections are rejected", () => {
  const unlocked = evaluateUnlocks({ ...DEFAULT_PROGRESSION, roomsCompleted: 5, bestAccuracy: .8 });
  assert.ok(unlocked.skinIds.includes("ember-sentinel"));
  assert.ok(unlocked.skinIds.includes("gilded-exile"));
  assert.ok(unlocked.mapStyleIds.includes("ember-catacomb"));
  assert.equal(equipSkin(DEFAULT_CUSTOMIZATION, "moon-wraith"), DEFAULT_CUSTOMIZATION);
  assert.equal(selectMapStyle(DEFAULT_CUSTOMIZATION, "frost-archive"), DEFAULT_CUSTOMIZATION);
  assert.equal(getPlayerSkin("unknown").id, "vault-hunter");
  assert.equal(getMapStyle("unknown").id, "hollow-vault");
});

test("customization migration preserves valid state and rejects tampered IDs", () => {
  const migrated = migrateCustomization({ customization: { selectedSkinId: "invented", selectedMapStyleId: "invented", unlockedSkinIds: ["ember-sentinel", "invented"], unlockedMapStyleIds: ["ember-catacomb", "invented"], recentMapStyleIds: Array(10).fill("hollow-vault") }, progression: { roomsCompleted: 5 } });
  assert.equal(migrated.customization.selectedSkinId, "vault-hunter");
  assert.equal(migrated.customization.selectedMapStyleId, "hollow-vault");
  assert.ok(migrated.customization.unlockedSkinIds.includes("ember-sentinel"));
  assert.equal(migrated.customization.recentMapStyleIds.length, 6);
});

test("map rotation uses only unlocked compatible styles and avoids recent repetition", () => {
  const unlockedIds = MAP_STYLES.map(style => style.id);
  const choice = chooseMapStyle({ mode: "random", selectedId: "hollow-vault", unlockedIds, recentIds: ["hollow-vault", "ember-catacomb"], templateId: "broken_ring", pacingRole: "combat", seed: "fixed" });
  assert.ok(unlockedIds.includes(choice.id));
  assert.ok(!["hollow-vault", "ember-catacomb"].includes(choice.id));
  const incompatible = chooseMapStyle({ mode: "selected", selectedId: "training-grid", unlockedIds, recentIds: [], templateId: "broken_ring", pacingRole: "combat", seed: "fixed" });
  assert.equal(incompatible.id, "hollow-vault");
  assert.equal(incompatible.source, "fallback");
});

test("map styling never changes validated collision or spawn balance", () => {
  const room = prepareRoomQueue(6, 1, "standard", profile, [], "style-test")[0];
  const before = structuredClone(room);
  const styled = { ...room, mapStyleId: "ember-catacomb" };
  assert.ok(validatePreparedRoom(styled));
  assert.deepEqual(styled.waves, before.waves);
  assert.equal(styled.templateId, before.templateId);
  assert.deepEqual(SPAWN_BALANCE, { roomHealthGrowth: .15, eliteHealthMultiplier: 1.8, eliteRadiusMultiplier: 1.25, waveDelaySeconds: 1.1 });
});

test("dashboard records report only actual differences and cap history", () => {
  const plan = prepareRoomQueue(1, 1, "standard", null, [], "record-test")[0];
  const facts = roomFacts(plan, "standard", 24, 7);
  assert.deepEqual(compareRoomFacts(facts, structuredClone(facts)), []);
  const record = buildAdaptationRecord({ plan, previousPlan: null, tier: "standard", metrics: metric(), reinforcementDecision: null, reinforcementUsed: false, reinforcementSuccessful: false, usage: emptyReinforcementUsage() });
  let records = [] as typeof record[];
  for (let index = 0; index < ADAPTATION_HISTORY_LIMIT + 5; index++) records = appendAdaptationRecord(records, { ...record, id: String(index) });
  assert.equal(records.length, ADAPTATION_HISTORY_LIMIT);
  assert.equal(records[0].id, "5");
  assert.match(adaptationReasonText("openai_fallback"), /local room/i);
  assert.ok(record.preservedRules.includes("Collision geometry unchanged"));
});
