import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { migrateSave, type EncounterMetrics } from "../game/adaptive";
import { DEFAULT_CUSTOMIZATION, migrateCustomization } from "../game/customization";
import { emptyReinforcementUsage } from "../game/reinforcements";
import { materializeRoom } from "../game/rooms";
import {
  PLAYER_FRIENDLY_REASONS, UNKNOWN_FRIENDLY_REASON, attachNextRoomPreview,
  buildAdaptationRecord, buildNextRoomPreview, dashboardSections, directorStatusCopy,
  friendlyReason, playerObservations, roomSourceCopy,
} from "../game/transparency";

const metrics: EncounterMetrics = { room: 6, durationMs: 42_000, shotsFired: 50, shotsHit: 40, criticalHits: 4, kills: 6, damageTaken: 12, movementMs: 28_000, abilityUses: 2, energySpent: 45, reactionTimesMs: [300], killTimesMs: [2_100], deaths: 0, completed: true, enemiesSpawned: 6, healthAtStart: 120, healthAtEnd: 108, expectedCompletionTimeMs: 60_000 };
const previous = materializeRoom(6, "ring_skirmish", "standard");
const next = materializeRoom(7, "lane_crossfire", "challenging");
const record = buildAdaptationRecord({ plan: previous, previousPlan: null, tier: "standard", metrics, reinforcementDecision: null, reinforcementUsed: false, reinforcementSuccessful: false, usage: emptyReinforcementUsage() });

test("dashboard works with no history, disabled mode, planning, and local fallback", () => {
  assert.match(directorStatusCopy({ enabled: true, records: [], plannerStatus: "local" }).title, /learning/i);
  assert.match(directorStatusCopy({ enabled: false, records: [], plannerStatus: "local" }).title, /off/i);
  assert.match(directorStatusCopy({ enabled: true, records: [record], plannerStatus: "planning" }).title, /ready/i);
  assert.match(roomSourceCopy("fallback").text, /prepared room/i);
  assert.match(roomSourceCopy("openai").text, /checked/i);
  assert.match(roomSourceCopy("local").text, /built-in/i);
});

test("simple mode hides advanced values and detailed mode exposes real sections", () => {
  assert.equal(dashboardSections("simple").includes("metrics"), false);
  assert.equal(dashboardSections("simple").includes("localAdjustments"), false);
  assert.equal(dashboardSections("detailed").includes("metrics"), true);
  assert.equal(dashboardSections("detailed").includes("prediction"), true);
});

test("all production reasons are translated and unknown codes are safe", () => {
  for (const [code, value] of Object.entries(PLAYER_FRIENDLY_REASONS)) {
    assert.ok(value.title.length > 2, code);
    assert.ok(value.explanation.length > 10, code);
    assert.ok(value.icon.length > 0, code);
  }
  assert.deepEqual(friendlyReason("unknown-provider-code"), UNKNOWN_FRIENDLY_REASON);
  assert.equal(friendlyReason("unknown-provider-code").explanation.includes("unknown-provider-code"), false);
});

test("next-room comparison uses final validated room rather than raw recommendation", () => {
  const requested = { roomSequenceIndex: 7, presetId: "split_assault", mapStyleId: "training-grid", spawnPattern: "spread" as const, countMultiplier: 1, aggressionModifier: 0, reactionModifier: 0, predictedKillRate: .7, predictedCompletionTimeSeconds: 70, predictedDamageTakenRatio: .3, adaptationReasonCodes: ["balanced_pressure"], confidence: .8 };
  const validated = materializeRoom(7, "split_assault", "challenging", "gpt", requested);
  assert.equal(validated.plannerRecommendation?.mapStyleId, "training-grid");
  assert.equal(validated.mapStyleId, "hollow-vault");
  const preview = buildNextRoomPreview(previous, validated, "standard", "challenging");
  assert.equal(preview.finalAppliedRoom.mapStyleId, "hollow-vault");
  assert.equal(preview.changes.some(change => change.after === "Calibration Grid"), false);
});

test("unchanged final room values never create false changes", () => {
  const preview = buildNextRoomPreview(previous, structuredClone(previous), "standard", "standard");
  assert.deepEqual(preview.changes, []);
  assert.equal(preview.trend, "No mechanical change");
});

test("dashboard observations come from actual recorded metrics", () => {
  const observations = playerObservations(record).map(item => item.text).join(" ");
  assert.match(observations, /accuracy/i);
  assert.match(observations, /faster/i);
  assert.match(observations, /avoided/i);
  const attached = attachNextRoomPreview(record, previous, next, "standard", "challenging");
  assert.equal(attached.nextRoom?.roomName, "Long Lanes");
});

test("dashboard preferences migrate and history remains capped", () => {
  const migrated = migrateCustomization({ customization: { dashboardSettings: { detailLevel: "detailed", notifications: "minimal", showPostRoomSummary: false, lastViewedRecordId: "room-6" } } });
  assert.deepEqual(migrated.customization.dashboardSettings, { detailLevel: "detailed", notifications: "minimal", showPostRoomSummary: false, lastViewedRecordId: "room-6" });
  assert.equal(migrateSave({ adaptationRecords: Array(20).fill(record) }).adaptationRecords.length, 12);
  assert.equal(DEFAULT_CUSTOMIZATION.dashboardSettings.detailLevel, "simple");
});

test("menu, pause, indicator, post-room summary, controller navigation, and responsive rules are wired", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8"), css = readFileSync(new URL("../app/director.css", import.meta.url), "utf8");
  assert.match(page, /AI DIRECTOR/);
  assert.match(page, /pause-director/);
  assert.match(page, /hasUnreadAdaptation/);
  assert.match(page, /PostRoomDirectorSummary/);
  assert.match(page, /navigator\.getGamepads/);
  assert.match(page, /button:not\(:disabled\)/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /high-contrast/);
});

test("normal dashboard UI exposes no secrets, raw prompts, JSON, model IDs, or token data", () => {
  const ui = readFileSync(new URL("../app/game-ui.tsx", import.meta.url), "utf8").toLowerCase();
  for (const forbidden of ["openai_api_key", "raw prompt", "raw response", "token usage", "stack trace", "json.stringify", "gpt-5"]) assert.equal(ui.includes(forbidden), false, forbidden);
});
