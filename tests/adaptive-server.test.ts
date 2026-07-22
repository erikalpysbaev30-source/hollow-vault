import assert from "node:assert/strict";
import test from "node:test";

import { requestAdaptiveRoomPlans } from "../lib/server/adaptive-rooms/planner";
import { adaptiveRoomRequestSchema, adaptiveRoomResponseSchema, candidatesUseApprovedPresets } from "../lib/server/adaptive-rooms/schemas";

const request = {
  sessionId: "12345678-1234-1234-1234-123456789abc",
  currentTier: "standard" as const,
  roomsRequested: 1,
  profile: {
    overallSkillScore: 0.6,
    confidenceScore: 0.8,
    dimensions: { aim: 0.7, movement: 0.5, tactical: 0.6, resource: 0.5, reaction: 0.6, survival: 0.5, objective: 0.7 },
    accuracy: 0.64,
    damageTakenPerMinute: 18,
    averageKillTimeMs: 2_800,
  },
  recentRooms: [{ templateId: "broken_ring", completionTimeRatio: 0.7, killRate: 1, accuracy: 0.64, damageTakenRatio: 0.2, deaths: 0, completed: true }],
  adaptiveContext:{
    player:{aimSkill:.7,movementSkill:.5,survivalSkill:.5,reactionSkill:.6,tacticalSkill:.6,resourceSkill:.5,reinforcementSkill:.5,aggressionPreference:.55,defensivePreference:.5,preferredCombatDistance:.55,frustrationRisk:.15,boredomRisk:.2,confidence:{overall:.8,aim:.8,movement:.7,survival:.7,tactics:.7,resources:.6,reinforcements:.4,preferences:.6}},
    habits:{repeatedHabitIds:[],averageCombatDistance:.55,rushFrequency:.3,retreatFrequency:.2,stationaryCombatRatio:.25,coverUsageRate:.5,flankAvoidanceRate:.4},
    preferences:{preferredDifficulty:.5,preferredRoomDuration:.5,preferredEnemyDensity:.5,preferredTacticalComplexity:.5,preferredPacingSpeed:.5,adaptationStrength:.65,confidence:.6},
    pacingHistory:["standard" as const],calibration:{completionTimeFactor:1,damageFactor:1,killRateFactor:1,samples:1},
  },
  candidates: [{ roomSequenceIndex: 6, presetIds: ["ring_skirmish"], mapStyleIds: ["hollow-vault"] }],
  allowedBehaviorProfileIds:["balanced","coordinated"],
  availableModuleIds:["entrance-south","arena-cover","flank-none","exit-south"],
};

const validResponse = {
  plans: [{
    roomSequenceIndex: 6,
    presetId: "ring_skirmish",
    mapStyleId: "hollow-vault",
    spawnPattern: "spread" as const,
    countMultiplier: 1,
    aggressionModifier: 0.02,
    reactionModifier: 0,
    predictedKillRate: 0.78,
    predictedCompletionTimeSeconds: 60,
    predictedDamageTakenRatio: 0.24,
    adaptationReasonCodes: ["balanced_pressure"],
    confidence: 0.82,
    pacingRole:"standard" as const,
    behaviorProfileId:"balanced",
    roomModuleIds:["entrance-south","arena-cover","flank-none","exit-south"],
    predictedDeathProbability:.18,
    predictedReinforcementUsageProbability:.24,
  }],
};

test("adaptive room request validation is strict and bounded", () => {
  assert.equal(adaptiveRoomRequestSchema.safeParse(request).success, true);
  assert.equal(adaptiveRoomRequestSchema.safeParse({ ...request, unexpected: true }).success, false);
  assert.equal(adaptiveRoomRequestSchema.safeParse({ ...request, roomsRequested: 2 }).success, false);
  assert.equal(adaptiveRoomRequestSchema.safeParse({ ...request, candidates: [...request.candidates, ...request.candidates] }).success, false);
  assert.equal(candidatesUseApprovedPresets(request), true);
  assert.equal(candidatesUseApprovedPresets({ ...request, candidates: [{ roomSequenceIndex: 6, presetIds: ["invented_room"], mapStyleIds: ["hollow-vault"] }] }), false);
  assert.equal(candidatesUseApprovedPresets({ ...request, candidates: [{ roomSequenceIndex: 10, presetIds: ["ring_skirmish"], mapStyleIds: ["hollow-vault"] }] }), false);
});

test("provider response validation rejects unknown fields and unsafe ranges", () => {
  assert.equal(adaptiveRoomResponseSchema.safeParse(validResponse).success, true);
  assert.equal(adaptiveRoomResponseSchema.safeParse({ plans: [{ ...validResponse.plans[0], countMultiplier: 1.5 }] }).success, false);
  assert.equal(adaptiveRoomResponseSchema.safeParse({ plans: [{ ...validResponse.plans[0], coordinates: [1, 2] }] }).success, false);
});

test("OpenAI planner uses structured output and accepts only allowed preset IDs", async () => {
  let providerRequest: Record<string, unknown> | undefined;
  const mock = {
    responses: {
      create: async (input: Record<string, unknown>) => {
        providerRequest = input;
        return { output_text: JSON.stringify(validResponse) };
      },
    },
  };
  const result = await requestAdaptiveRoomPlans(mock as never, "test-model", request, new AbortController().signal);
  assert.equal(result?.[0].presetId, "ring_skirmish");
  assert.equal(providerRequest?.model, "test-model");
  assert.deepEqual(providerRequest?.reasoning, { effort: "none" });
  assert.equal(providerRequest?.store, false);
  assert.equal((providerRequest?.text as { format?: { strict?: boolean } }).format?.strict, true);

  const invented = { plans: [{ ...validResponse.plans[0], presetId: "invented_room" }] };
  mock.responses.create = async () => ({ output_text: JSON.stringify(invented) });
  assert.equal(await requestAdaptiveRoomPlans(mock as never, "test-model", request, new AbortController().signal), null);
});

test("OpenAI planner fails closed on malformed and incomplete output", async () => {
  const malformed = { responses: { create: async () => ({ output_text: "not-json" }) } };
  assert.equal(await requestAdaptiveRoomPlans(malformed as never, "test-model", request, new AbortController().signal), null);
  const missing = { responses: { create: async () => ({ output_text: "" }) } };
  assert.equal(await requestAdaptiveRoomPlans(missing as never, "test-model", request, new AbortController().signal), null);
});
