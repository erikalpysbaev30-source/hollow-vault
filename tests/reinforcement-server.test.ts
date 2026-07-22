import assert from "node:assert/strict";
import test from "node:test";

import { requestReinforcementRecommendation } from "../lib/server/adaptive-reinforcements/planner";
import { allowedReinforcementIdsKnown, reinforcementRequestSchema, reinforcementResponseSchema } from "../lib/server/adaptive-reinforcements/schemas";

const request = {
  sessionId: "12345678-1234-1234-1234-123456789abc",
  playerProfile: { overallSkill: .55, aimSkill: .6, survivalSkill: .45, reinforcementEfficiency: .5 },
  currentRoom: { roomIndex: 6, roomDifficultyScore: 55, remainingEnemyCount: 7, currentHealthRatio: .35, currentResourceRatio: .8, bossPhase: false },
  recentUsage: { reinforcementsUsed: 2, successfulUses: 1, averageValueScore: .5 },
  allowedReinforcementTypeIds: ["shield-pulse", "med-pulse", "stasis-field"],
};
const response = { recommendedTypeId: "med-pulse", strengthTier: 2, resourceCostMultiplier: 1, cooldownMultiplier: 1.1, reasonCodes: ["low_health"], confidence: .84 };

test("reinforcement request and response schemas are strict", () => {
  const parsed = reinforcementRequestSchema.safeParse(request);
  assert.equal(parsed.success, true);
  assert.equal(allowedReinforcementIdsKnown(parsed.data!), true);
  assert.equal(reinforcementRequestSchema.safeParse({ ...request, secret: "no" }).success, false);
  assert.equal(reinforcementRequestSchema.safeParse({ ...request, allowedReinforcementTypeIds: ["invented"] }).success, true);
  assert.equal(allowedReinforcementIdsKnown(reinforcementRequestSchema.parse({ ...request, allowedReinforcementTypeIds: ["invented"] })), false);
  assert.equal(reinforcementResponseSchema.safeParse(response).success, true);
  assert.equal(reinforcementResponseSchema.safeParse({ ...response, resourceCostMultiplier: 4 }).success, false);
});

test("reinforcement planner uses strict structured output and rejects unknown IDs", async () => {
  let providerRequest: Record<string, unknown> | undefined;
  const mock = { responses: { create: async (input: Record<string, unknown>) => { providerRequest = input; return { output_text: JSON.stringify(response) }; } } };
  const result = await requestReinforcementRecommendation(mock as never, "test-model", request, new AbortController().signal);
  assert.deepEqual(result, response);
  assert.equal(providerRequest?.store, false);
  assert.deepEqual(providerRequest?.reasoning, { effort: "none" });
  assert.equal((providerRequest?.text as { format?: { strict?: boolean } }).format?.strict, true);
  mock.responses.create = async () => ({ output_text: JSON.stringify({ ...response, recommendedTypeId: "invented" }) });
  assert.equal(await requestReinforcementRecommendation(mock as never, "test-model", request, new AbortController().signal), null);
});

test("reinforcement planner fails closed offline or on malformed output", async () => {
  const malformed = { responses: { create: async () => ({ output_text: "not-json" }) } };
  assert.equal(await requestReinforcementRecommendation(malformed as never, "test-model", request, new AbortController().signal), null);
  const missing = { responses: { create: async () => ({ output_text: "" }) } };
  assert.equal(await requestReinforcementRecommendation(missing as never, "test-model", request, new AbortController().signal), null);
});
