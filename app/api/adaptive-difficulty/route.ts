import { NextRequest, NextResponse } from "next/server";

import {
  sanitizeRecommendation,
  type AdaptiveTier,
  type DifficultyRecommendation,
} from "@/game/adaptive";
import {
  adaptiveRoomsModel,
  adaptiveRoomsTimeoutMs,
  getOpenAIClient,
} from "@/lib/server/openai/client";

export const runtime = "nodejs";
export const maxDuration = 10;

const TIERS: AdaptiveTier[] = ["assisted", "relaxed", "standard", "challenging", "expert"];
const calls = new Map<string, { count: number; reset: number }>();
const cache = new Map<string, { expires: number; value: DifficultyRecommendation }>();

function validBody(value: unknown): value is Record<string, unknown> & { sessionId: string } {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.sessionId === "string" &&
    /^[a-zA-Z0-9-]{12,64}$/.test(body.sessionId) &&
    TIERS.includes(body.currentTier as AdaptiveTier) &&
    typeof body.profile === "object" &&
    JSON.stringify(value).length < 6_000
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!validBody(body)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "local";
  const key = `${address}:${body.sessionId}`;
  const now = Date.now();
  const rate = calls.get(key);
  if (rate && rate.reset > now && rate.count >= 4) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  calls.set(key, {
    count: rate && rate.reset > now ? rate.count + 1 : 1,
    reset: now + 86_400_000,
  });

  const cacheKey = JSON.stringify([body.currentTier, body.profile, body.recentDeaths]);
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > now) return NextResponse.json({ ...cached.value, cached: true });

  const openai = getOpenAIClient();
  if (!openai) return NextResponse.json({ error: "local_fallback" }, { status: 503 });

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["recommendedTier", "adjustment", "confidence", "reasonCodes", "recommendedChanges"],
    properties: {
      recommendedTier: { type: "string", enum: TIERS },
      adjustment: { type: "number", minimum: -0.1, maximum: 0.1 },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      reasonCodes: { type: "array", maxItems: 4, items: { type: "string" } },
      recommendedChanges: {
        type: "object",
        additionalProperties: false,
        required: ["encounterComplexityDelta", "enemyAggressionDelta", "resourceDropDelta"],
        properties: {
          encounterComplexityDelta: { type: "integer", minimum: -1, maximum: 1 },
          enemyAggressionDelta: { type: "number", minimum: -0.08, maximum: 0.08 },
          resourceDropDelta: { type: "number", minimum: -0.1, maximum: 0.1 },
        },
      },
    },
  } as const;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), adaptiveRoomsTimeoutMs());
  try {
    const response = await openai.responses.create(
      {
        model: adaptiveRoomsModel(),
        reasoning: { effort: "none" },
        store: false,
        max_output_tokens: 350,
        instructions:
          "You are an adaptive game-difficulty analyst. Recommend one small, fair adjustment for future rooms. Never move more than one tier. Prioritize composition, timing, telegraphs, and resources over health or damage. Do not punish success. Return only the required schema.",
        input: JSON.stringify({
          goal: "balanced flow",
          allowed: {
            tierStep: 1,
            adjustment: [-0.1, 0.1],
            complexityDelta: [-1, 1],
            aggressionDelta: [-0.08, 0.08],
            resourceDelta: [-0.1, 0.1],
          },
          summary: body,
        }),
        text: {
          format: {
            type: "json_schema",
            name: "difficulty_recommendation",
            strict: true,
            schema,
          },
        },
      },
      { signal: controller.signal },
    );
    if (!response.output_text) {
      return NextResponse.json({ error: "invalid_provider_response" }, { status: 503 });
    }
    const value = sanitizeRecommendation(JSON.parse(response.output_text));
    if (!value) return NextResponse.json({ error: "invalid_provider_response" }, { status: 503 });
    cache.set(cacheKey, { expires: now + 21_600_000, value });
    return NextResponse.json({ ...value, cached: false });
  } catch {
    return NextResponse.json({ error: "provider_unavailable" }, { status: 503 });
  } finally {
    clearTimeout(timer);
  }
}
