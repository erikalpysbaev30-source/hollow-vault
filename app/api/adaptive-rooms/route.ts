import { NextRequest, NextResponse } from "next/server";

import type { RoomPlannerSelection } from "@/game/rooms";
import { requestAdaptiveRoomPlans } from "@/lib/server/adaptive-rooms/planner";
import {
  adaptiveRoomRequestSchema,
  candidatesUseApprovedPresets,
} from "@/lib/server/adaptive-rooms/schemas";
import {
  adaptiveRoomsEnabled,
  adaptiveRoomsModel,
  adaptiveRoomsTimeoutMs,
  boundedInteger,
  getOpenAIClient,
} from "@/lib/server/openai/client";

export const runtime = "nodejs";
export const maxDuration = 10;

const MAX_BODY_BYTES = 9_000;
const DAY_MS = 86_400_000;
const calls = new Map<string, { count: number; resetAt: number; lastCallAt: number }>();
const cache = new Map<string, { expiresAt: number; value: RoomPlannerSelection[] }>();

function failure(error: string, status: number) {
  return NextResponse.json({ success: false, error, fallbackRequired: true }, { status });
}

function clientAddress(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "local"
  ).slice(0, 80);
}

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return failure("payload_too_large", 413);

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return failure("invalid_request", 400);
  }
  if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) return failure("payload_too_large", 413);

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return failure("invalid_json", 400);
  }

  const parsed = adaptiveRoomRequestSchema.safeParse(raw);
  if (!parsed.success) return failure("invalid_request", 400);
  const body = parsed.data;
  if (!candidatesUseApprovedPresets(body)) return failure("invalid_candidates", 400);

  if (!adaptiveRoomsEnabled()) return failure("adaptive_rooms_disabled", 503);

  const now = Date.now();
  const cacheKey = JSON.stringify([
    body.currentTier,
    body.profile,
    body.recentRooms,
    body.candidates,
  ]);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({ success: true, source: "cache", plans: cached.value, cached: true });
  }

  const rateKey = `${clientAddress(request)}:${body.sessionId}`;
  const prior = calls.get(rateKey);
  const maxCalls = boundedInteger(process.env.ADAPTIVE_ROOMS_MAX_CALLS_PER_SESSION, 4, 1, 12);
  const cooldownMs = boundedInteger(process.env.ADAPTIVE_ROOMS_COOLDOWN_MS, 10_000, 0, 120_000);
  if (prior && prior.resetAt > now) {
    if (prior.count >= maxCalls) return failure("rate_limited", 429);
    if (now - prior.lastCallAt < cooldownMs) return failure("cooldown_active", 429);
  }

  const openai = getOpenAIClient();
  if (!openai) return failure("openai_not_configured", 503);

  calls.set(rateKey, {
    count: prior && prior.resetAt > now ? prior.count + 1 : 1,
    resetAt: prior && prior.resetAt > now ? prior.resetAt : now + DAY_MS,
    lastCallAt: now,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), adaptiveRoomsTimeoutMs());
  try {
    const plans = await requestAdaptiveRoomPlans(openai, adaptiveRoomsModel(), body, controller.signal);
    if (!plans) return failure("invalid_provider_response", 503);

    const ttlMs = boundedInteger(process.env.ADAPTIVE_ROOMS_CACHE_TTL_MS, 21_600_000, 60_000, DAY_MS);
    cache.set(cacheKey, { expiresAt: now + ttlMs, value: plans });
    return NextResponse.json({ success: true, source: "openai", plans, cached: false });
  } catch {
    return failure("provider_unavailable", 503);
  } finally {
    clearTimeout(timer);
  }
}
