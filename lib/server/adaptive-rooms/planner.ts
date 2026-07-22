import type OpenAI from "openai";

import { sanitizePlannerSelections, type RoomPlannerSelection } from "@/game/rooms";
import {
  ADAPTIVE_ROOM_JSON_SCHEMA,
  adaptiveRoomResponseSchema,
  type AdaptiveRoomRequest,
} from "./schemas";

export const ADAPTIVE_ROOM_INSTRUCTIONS = `You are a constrained roguelite encounter-planning system. Select one approved preset and one approved map-style ID for each requested future room, using only the IDs supplied for that exact room. Configure only the bounded fields in the schema. A map style is cosmetic only and must not imply geometry or balance changes. Never invent IDs, geometry, coordinates, code, scripts, assets, or commands. Adapt gradually from rolling skill evidence. Favor readable composition, positioning, wave timing, and recovery over health or damage inflation. Strong aim with weak movement should get clearer lanes and lower flank pressure. Weak aim should avoid fast flank-heavy rooms. Repeated damage or failures should produce recovery without becoming humiliatingly easy. Avoid repeating recent templates. Return only schema-valid JSON.`;

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
        recentRooms: request.recentRooms,
        candidates: request.candidates,
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
