import type OpenAI from "openai";

import { sanitizePlannerSelections, type RoomPlannerSelection } from "@/game/rooms";
import {
  ADAPTIVE_ROOM_JSON_SCHEMA,
  adaptiveRoomResponseSchema,
  type AdaptiveRoomRequest,
} from "./schemas";

export const ADAPTIVE_ROOM_INSTRUCTIONS = `You are a constrained roguelite encounter-planning system. Select one approved preset, pacing role, enemy behavior profile, compatible room-module combination, and map-style ID for each requested future room, using only supplied IDs. Configure only bounded schema fields. Modules are approved metadata for locally validated layouts; never invent geometry or coordinates. A map style is cosmetic only. Never generate code, scripts, assets, commands, or IDs. Adapt gradually from separate aim, movement, survival, tactical, resource, confidence, and summarized Super-use evidence. Super charging, damage, and activation are deterministic local systems: never change their values or force activation. You may favor approved readable clustered, interruption, or recovery opportunities, but do not make every room counter the Super. Favor composition, positioning, pacing, and recovery over health or damage inflation. Low confidence must remain neutral. Repeated damage or failures should produce recovery. Avoid repetition. Return only schema-valid JSON.`;

export async function requestAdaptiveRoomPlans(
  openai: OpenAI,
  model: string,
  request: AdaptiveRoomRequest,
  signal: AbortSignal,
): Promise<RoomPlannerSelection[] | null> {
  const response = await openai.responses.create(
    {
      model,
      reasoning: { effort: "none" },
      store: false,
      max_output_tokens: 900,
      instructions: ADAPTIVE_ROOM_INSTRUCTIONS,
      input: JSON.stringify({
        goal: "plan buffered future rooms",
        tier: request.currentTier,
        profile: request.profile,
        adaptiveContext:request.adaptiveContext,
        recentRooms: request.recentRooms,
        superSummary:request.superSummary||{successfulHits:0,chargeEarned:0,becameReady:false,used:false,targetsHit:0,damageDealt:0,heldReadySeconds:0},
        candidates: request.candidates,
        allowedBehaviorProfileIds:request.allowedBehaviorProfileIds,
        availableModuleIds:request.availableModuleIds,
        roomsRequested: request.roomsRequested,
      }),
      text: {
        format: {
          type: "json_schema",
          name: "adaptive_room_plans",
          strict: true,
          schema: ADAPTIVE_ROOM_JSON_SCHEMA,
        },
      },
    },
    { signal },
  );

  if (!response.output_text) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(response.output_text);
  } catch {
    return null;
  }

  const checked = adaptiveRoomResponseSchema.safeParse(decoded);
  if (!checked.success || checked.data.plans.length !== request.roomsRequested) return null;

  const allowedByRoom = Object.fromEntries(
    request.candidates.map((candidate) => [candidate.roomSequenceIndex, candidate.presetIds]),
  );
  const allowedStylesByRoom = Object.fromEntries(request.candidates.map((candidate) => [candidate.roomSequenceIndex, candidate.mapStyleIds]));
  const selections = sanitizePlannerSelections(checked.data, allowedByRoom, allowedStylesByRoom);
  if (!selections || selections.length !== request.roomsRequested) return null;

  const uniqueRooms = new Set(selections.map((selection) => selection.roomSequenceIndex));
  return uniqueRooms.size === selections.length ? selections : null;
}
