import { z } from "zod";

import { isKnownMapStyle, isMapStyleCompatible } from "@/game/customization";
import { getRoomPreset } from "@/game/rooms";
import {ENEMY_BEHAVIOR_PROFILES,ROOM_MODULES,getEnemyBehaviorProfile,getRoomModule} from "@/game/adaptive-model";

const finiteRatio = z.number().finite().min(0).max(1);
const dimensionsSchema = z.strictObject({
  aim: finiteRatio,
  movement: finiteRatio,
  tactical: finiteRatio,
  resource: finiteRatio,
  reaction: finiteRatio,
  survival: finiteRatio,
  objective: finiteRatio,
});

const recentRoomSchema = z.strictObject({
  templateId: z.string().min(1).max(80),
  completionTimeRatio: z.number().finite().min(0).max(2),
  killRate: finiteRatio,
  accuracy: finiteRatio,
  damageTakenRatio: z.number().finite().min(0).max(2),
  deaths: z.number().int().min(0).max(20),
  completed: z.boolean(),
});

const candidateSchema = z.strictObject({
  roomSequenceIndex: z.number().int().min(1).max(9_999),
  presetIds: z.array(z.string().min(1).max(80)).min(1).max(8),
  mapStyleIds: z.array(z.string().min(1).max(80)).min(1).max(5),
});
const superSummarySchema=z.strictObject({successfulHits:z.number().int().min(0).max(10000),chargeEarned:z.number().int().min(0).max(20000),becameReady:z.boolean(),used:z.boolean(),targetsHit:z.number().int().min(0).max(500),damageDealt:z.number().finite().min(0).max(100000),heldReadySeconds:z.number().finite().min(0).max(3600)});

const adaptiveContextSchema=z.strictObject({
  player:z.strictObject({
    aimSkill:finiteRatio,movementSkill:finiteRatio,survivalSkill:finiteRatio,reactionSkill:finiteRatio,tacticalSkill:finiteRatio,resourceSkill:finiteRatio,reinforcementSkill:finiteRatio,
    aggressionPreference:finiteRatio,defensivePreference:finiteRatio,preferredCombatDistance:finiteRatio,frustrationRisk:finiteRatio,boredomRisk:finiteRatio,
    confidence:z.strictObject({overall:finiteRatio,aim:finiteRatio,movement:finiteRatio,survival:finiteRatio,tactics:finiteRatio,resources:finiteRatio,reinforcements:finiteRatio,preferences:finiteRatio}),
  }),
  habits:z.strictObject({
    repeatedHabitIds:z.array(z.string().min(1).max(60)).max(8),averageCombatDistance:finiteRatio,rushFrequency:finiteRatio,retreatFrequency:finiteRatio,stationaryCombatRatio:finiteRatio,coverUsageRate:finiteRatio,flankAvoidanceRate:finiteRatio,
  }),
  preferences:z.strictObject({preferredDifficulty:finiteRatio,preferredRoomDuration:finiteRatio,preferredEnemyDensity:finiteRatio,preferredTacticalComplexity:finiteRatio,preferredPacingSpeed:finiteRatio,adaptationStrength:finiteRatio,confidence:finiteRatio}),
  pacingHistory:z.array(z.enum(["warmup","standard","pressure","recovery","experiment","challenge","elite","reward","pre_boss","boss"])).max(8),
  calibration:z.strictObject({completionTimeFactor:z.number().finite().min(.7).max(1.3),damageFactor:z.number().finite().min(.7).max(1.3),killRateFactor:z.number().finite().min(.7).max(1.3),samples:z.number().int().min(0).max(10_000)}),
});

export const adaptiveRoomRequestSchema = z
  .strictObject({
    sessionId: z.string().regex(/^[a-zA-Z0-9-]{12,64}$/),
    currentTier: z.enum(["assisted", "relaxed", "standard", "challenging", "expert"]),
    roomsRequested: z.number().int().min(1).max(4),
    profile: z.strictObject({
      overallSkillScore: finiteRatio,
      confidenceScore: finiteRatio,
      dimensions: dimensionsSchema,
      accuracy: finiteRatio,
      damageTakenPerMinute: z.number().finite().min(0).max(10_000),
      averageKillTimeMs: z.number().finite().min(0).max(600_000),
    }),
    recentRooms: z.array(recentRoomSchema).max(5),
    superSummary:superSummarySchema.optional(),
    candidates: z.array(candidateSchema).min(1).max(4),
    adaptiveContext:adaptiveContextSchema,
    allowedBehaviorProfileIds:z.array(z.string().min(1).max(60)).min(1).max(8).default(ENEMY_BEHAVIOR_PROFILES.map(x=>x.id)),
    availableModuleIds:z.array(z.string().min(1).max(60)).min(1).max(20).default(ROOM_MODULES.map(x=>x.id)),
  })
  .superRefine((value, context) => {
    if (value.candidates.length !== value.roomsRequested) {
      context.addIssue({
        code: "custom",
        path: ["candidates"],
        message: "Candidate count must match roomsRequested",
      });
    }
    const rooms = new Set(value.candidates.map((candidate) => candidate.roomSequenceIndex));
    if (rooms.size !== value.candidates.length) {
      context.addIssue({
        code: "custom",
        path: ["candidates"],
        message: "Room sequence indexes must be unique",
      });
    }
  });

export const adaptiveRoomPlanSchema = z.strictObject({
  roomSequenceIndex: z.number().int().min(1).max(9_999),
  presetId: z.string().min(1).max(80),
  spawnPattern: z.enum(["front", "spread", "flank", "encircle"]),
  countMultiplier: z.number().finite().min(0.75).max(1.25),
  aggressionModifier: z.number().finite().min(-0.1).max(0.1),
  reactionModifier: z.number().finite().min(-0.1).max(0.1),
  predictedKillRate: finiteRatio,
  predictedCompletionTimeSeconds: z.number().finite().min(20).max(150),
  predictedDamageTakenRatio: z.number().finite().min(0.05).max(0.8),
  adaptationReasonCodes: z.array(z.string().min(1).max(40)).max(4),
  confidence: finiteRatio,
  mapStyleId: z.string().min(1).max(80),
  pacingRole:z.enum(["warmup","standard","pressure","recovery","challenge","elite","pre_boss","boss","reward"]).default("standard"),
  behaviorProfileId:z.string().min(1).max(60).default("balanced"),
  roomModuleIds:z.array(z.string().min(1).max(60)).min(3).max(10).default(["entrance-south","arena-cover","flank-none","exit-south"]),
  predictedDeathProbability:finiteRatio.default(.2),
  predictedReinforcementUsageProbability:finiteRatio.default(.25),
});

export const adaptiveRoomResponseSchema = z.strictObject({
  plans: z.array(adaptiveRoomPlanSchema).min(1).max(4),
});

export type AdaptiveRoomRequest = z.infer<typeof adaptiveRoomRequestSchema>;
export type AdaptiveRoomResponse = z.infer<typeof adaptiveRoomResponseSchema>;

export function candidatesUseApprovedPresets(request: AdaptiveRoomRequest): boolean {
  if(new Set(request.allowedBehaviorProfileIds).size!==request.allowedBehaviorProfileIds.length||request.allowedBehaviorProfileIds.some(id=>!getEnemyBehaviorProfile(id))||new Set(request.availableModuleIds).size!==request.availableModuleIds.length||request.availableModuleIds.some(id=>!getRoomModule(id)))return false;
  return request.candidates.every((candidate) => {
    const uniqueIds = new Set(candidate.presetIds);
    const uniqueStyles = new Set(candidate.mapStyleIds);
    if (uniqueIds.size !== candidate.presetIds.length || uniqueStyles.size !== candidate.mapStyleIds.length || candidate.mapStyleIds.some(id=>!isKnownMapStyle(id))) return false;
    const presetsAreValid=candidate.presetIds.every((presetId) => {
      const preset = getRoomPreset(presetId);
      if (!preset) return false;
      const isBossRoom = candidate.roomSequenceIndex > 5 && candidate.roomSequenceIndex % 5 === 0;
      return isBossRoom ? preset.pacingRole === "boss" : preset.pacingRole !== "boss";
    });
    return presetsAreValid&&candidate.mapStyleIds.every(styleId=>candidate.presetIds.some(presetId=>isMapStyleCompatible(styleId,getRoomPreset(presetId)?.templateId||"")));
  });
}

export const ADAPTIVE_ROOM_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["plans"],
  properties: {
    plans: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "roomSequenceIndex",
          "presetId",
          "spawnPattern",
          "countMultiplier",
          "aggressionModifier",
          "reactionModifier",
          "predictedKillRate",
          "predictedCompletionTimeSeconds",
          "predictedDamageTakenRatio",
          "adaptationReasonCodes",
          "confidence",
          "mapStyleId",
          "pacingRole",
          "behaviorProfileId",
          "roomModuleIds",
          "predictedDeathProbability",
          "predictedReinforcementUsageProbability",
        ],
        properties: {
          roomSequenceIndex: { type: "integer", minimum: 1, maximum: 9_999 },
          presetId: { type: "string", maxLength: 80 },
          spawnPattern: { type: "string", enum: ["front", "spread", "flank", "encircle"] },
          countMultiplier: { type: "number", minimum: 0.75, maximum: 1.25 },
          aggressionModifier: { type: "number", minimum: -0.1, maximum: 0.1 },
          reactionModifier: { type: "number", minimum: -0.1, maximum: 0.1 },
          predictedKillRate: { type: "number", minimum: 0, maximum: 1 },
          predictedCompletionTimeSeconds: { type: "number", minimum: 20, maximum: 150 },
          predictedDamageTakenRatio: { type: "number", minimum: 0.05, maximum: 0.8 },
          adaptationReasonCodes: {
            type: "array",
            maxItems: 4,
            items: { type: "string", maxLength: 40 },
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          mapStyleId: { type: "string", maxLength: 80 },
          pacingRole:{type:"string",enum:["warmup","standard","pressure","recovery","challenge","elite","pre_boss","boss","reward"]},
          behaviorProfileId:{type:"string",maxLength:60},
          roomModuleIds:{type:"array",minItems:3,maxItems:10,items:{type:"string",maxLength:60}},
          predictedDeathProbability:{type:"number",minimum:0,maximum:1},
          predictedReinforcementUsageProbability:{type:"number",minimum:0,maximum:1},
        },
      },
    },
  },
} as const;
