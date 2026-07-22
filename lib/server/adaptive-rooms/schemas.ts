import { z } from "zod";

import { isKnownMapStyle, isMapStyleCompatible } from "@/game/customization";
import { getRoomPreset } from "@/game/rooms";

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
    candidates: z.array(candidateSchema).min(1).max(4),
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
});

export const adaptiveRoomResponseSchema = z.strictObject({
  plans: z.array(adaptiveRoomPlanSchema).min(1).max(4),
});

export type AdaptiveRoomRequest = z.infer<typeof adaptiveRoomRequestSchema>;
export type AdaptiveRoomResponse = z.infer<typeof adaptiveRoomResponseSchema>;

export function candidatesUseApprovedPresets(request: AdaptiveRoomRequest): boolean {
  return request.candidates.every((candidate) => {
    const uniqueIds = new Set(candidate.presetIds);
    const uniqueStyles = new Set(candidate.mapStyleIds);
    if (uniqueIds.size !== candidate.presetIds.length || uniqueStyles.size !== candidate.mapStyleIds.length || candidate.mapStyleIds.some(id=>!isKnownMapStyle(id))) return false;
    const presetsAreValid=candidate.presetIds.every((presetId) => {
      const preset = getRoomPreset(presetId);
      if (!preset) return false;
      const isBossRoom = candidate.roomSequenceIndex % 5 === 0;
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
        },
      },
    },
  },
} as const;
