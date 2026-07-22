import "server-only";

import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  if (!client) {
    client = new OpenAI({
      apiKey,
      maxRetries: 0,
      timeout: adaptiveRoomsTimeoutMs(),
    });
  }

  return client;
}

export function adaptiveRoomsModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";
}

export function adaptiveRoomsTimeoutMs(): number {
  return boundedInteger(process.env.ADAPTIVE_ROOMS_TIMEOUT_MS, 5_000, 1_500, 8_000);
}

export function adaptiveRoomsEnabled(): boolean {
  return process.env.ADAPTIVE_ROOMS_ENABLED !== "false";
}

export function boundedInteger(
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}
