import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const health = readFileSync(new URL("../app/api/health/route.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../lib/server/openai/client.ts", import.meta.url), "utf8");
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");

test("browser API calls remain same-origin and no production localhost URL is embedded", () => {
  assert.match(page, /fetch\("\/api\/adaptive-rooms"/);
  assert.match(page, /fetch\("\/api\/adaptive-reinforcements"/);
  assert.doesNotMatch(page, /fetch\(["']https?:\/\//);
  assert.doesNotMatch(page, /127\.0\.0\.1/);
});

test("OpenAI remains server-only and the browser cannot choose its model", () => {
  assert.match(client, /import "server-only"/);
  assert.match(client, /process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(page, /OPENAI_API_KEY|from ["']openai["']/);
});

test("health route is dynamic, safe, and reports both adaptive services", () => {
  assert.match(health, /runtime = "nodejs"/);
  assert.match(health, /dynamic = "force-dynamic"/);
  assert.match(health, /adaptiveRooms:/);
  assert.match(health, /adaptiveReinforcements:/);
  assert.doesNotMatch(health, /apiKey[,}]/);
});

test("Vercel build is not configured as a static export", () => {
  assert.doesNotMatch(nextConfig, /output\s*:\s*["']export["']/);
});

test("secret environment files and generated deployment folders are excluded", () => {
  assert.match(gitignore, /\.env\*/);
  assert.match(gitignore, /!\.env\.example/);
  assert.match(gitignore, /\.vercel/);
  assert.match(gitignore, /\/node_modules/);
  assert.match(gitignore, /\/\.next\//);
});
