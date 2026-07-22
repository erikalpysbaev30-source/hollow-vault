import assert from "node:assert/strict";
import test from "node:test";

import { getRoomTemplate, ROOM_TEMPLATES, SPAWN_BALANCE } from "../game/rooms";
import {
  PLAYER_COLLIDER, PLAYER_SPAWN_MAX_ATTEMPTS, PLAYABLE_ROOM_BOUNDS,
  applyResolvedPlayerSpawn, circleOverlapsReservedSpawn, colliderBoundsAt,
  colliderCenterToSpritePosition, reservedSpawnBounds, resolveRoomPlayerSpawn,
  resolveSafePlayerSpawn, roomToWorldPosition, validateSpawnPosition, worldToRoomPosition,
} from "../game/spawn";

test("every registered room resolves a fully valid entrance spawn", () => {
  for (const room of ROOM_TEMPLATES) {
    const result = resolveRoomPlayerSpawn(room);
    assert.equal(result.success, true, room.id);
    assert.deepEqual(validateSpawnPosition({ position: result.resolvedPosition, solids: room.obstacles, hazards: room.hazardZones }), [], room.id);
  }
});

test("valid empty-room spawn keeps the requested center", () => {
  const requested = { x: 640, y: 570 };
  const result = resolveSafePlayerSpawn({ requestedSpawn: requested, solids: [] });
  assert.equal(result.fallbackUsed, false);
  assert.deepEqual(result.resolvedPosition, requested);
});

test("near-wall and partly outside spawns search inward", () => {
  for (const requestedSpawn of [{ x: 95, y: 360 }, { x: 640, y: 625 }]) {
    const result = resolveSafePlayerSpawn({ requestedSpawn, solids: [] });
    assert.equal(result.success, true);
    assert.equal(result.fallbackUsed, true);
    assert.deepEqual(validateSpawnPosition({ position: result.resolvedPosition, solids: [] }), []);
  }
});

test("wall and prop overlap use the nearest deterministic fallback", () => {
  const input = { requestedSpawn: { x: 640, y: 540 }, solids: [{ x: 585, y: 405, w: 110, h: 180 }] };
  const first = resolveSafePlayerSpawn(input), second = resolveSafePlayerSpawn(input);
  assert.deepEqual(first, second);
  assert.equal(first.success, true);
  assert.ok(first.invalidReasons.includes("solid_overlap"));
  assert.deepEqual(validateSpawnPosition({ position: first.resolvedPosition, solids: input.solids }), []);
});

test("occupied enemies and pickups cannot share the player spawn", () => {
  const requestedSpawn = { x: 640, y: 570 };
  const result = resolveSafePlayerSpawn({ requestedSpawn, solids: [], occupied: [{ ...requestedSpawn, radius: 28, kind: "enemy" }, { x: 660, y: 570, radius: 10, kind: "pickup" }] });
  assert.equal(result.success, true);
  assert.equal(result.fallbackUsed, true);
  assert.ok(result.invalidReasons.includes("occupied"));
});

test("large colliders validate their full bounds", () => {
  const collider = { ...PLAYER_COLLIDER, radius: 48 };
  const result = resolveSafePlayerSpawn({ requestedSpawn: { x: 130, y: 130 }, collider, solids: [] });
  assert.equal(result.success, true);
  assert.deepEqual(validateSpawnPosition({ position: result.resolvedPosition, collider, solids: [] }), []);
});

test("resolver fails safely with bounded attempts when no position exists", () => {
  const roomBounds = { x: 0, y: 0, w: 100, h: 100 };
  const result = resolveSafePlayerSpawn({ requestedSpawn: { x: 50, y: 50 }, roomBounds, solids: [{ x: 0, y: 0, w: 100, h: 100 }] });
  assert.equal(result.success, false);
  assert.equal(result.reason, "no_valid_position");
  assert.ok(result.testedPositions.length <= PLAYER_SPAWN_MAX_ATTEMPTS);
});

test("Split Chamber regression rejects the old fixed point", () => {
  const room = getRoomTemplate("split_chamber")!;
  assert.ok(validateSpawnPosition({ position: { x: 640, y: 540 }, solids: room.obstacles, hazards: room.hazardZones }).includes("solid_overlap"));
  const result = resolveRoomPlayerSpawn(room);
  assert.equal(result.spawnPointId, "south-entrance-west");
  assert.deepEqual(validateSpawnPosition({ position: result.resolvedPosition, solids: room.obstacles, hazards: room.hazardZones }), []);
});

test("room transitions and respawns reuse the resolver without duplicating player", () => {
  const player = { x: 10, y: 10, hp: 120 };
  const identity = player;
  const first = resolveRoomPlayerSpawn(getRoomTemplate("calibration_gallery")!);
  const transitioned = applyResolvedPlayerSpawn(player, first);
  assert.equal(transitioned, identity);
  const second = resolveRoomPlayerSpawn(getRoomTemplate("split_chamber")!);
  const respawned = applyResolvedPlayerSpawn(player, second);
  assert.equal(respawned, identity);
  assert.deepEqual({ x: player.x, y: player.y }, second.resolvedPosition);
});

test("room entrance wins over stale or saved coordinates", () => {
  const stalePosition = { x: 640, y: 540 };
  const room = getRoomTemplate("split_chamber")!;
  const result = resolveRoomPlayerSpawn(room);
  assert.notDeepEqual(result.resolvedPosition, stalePosition);
  assert.deepEqual(result.resolvedPosition, { x: 515, y: 572 });
});

test("sprite, collider, room, and world positions share one center convention", () => {
  const position = { x: 515, y: 572 }, bounds = colliderBoundsAt(position);
  assert.deepEqual(colliderCenterToSpritePosition(bounds), position);
  assert.equal(PLAYER_COLLIDER.convention, "center");
  const origin = { x: 1200, y: 800 }, world = roomToWorldPosition(position, origin);
  assert.deepEqual(worldToRoomPosition(world, origin), position);
});

test("reserved entrance space excludes props and enemy circles", () => {
  for (const room of ROOM_TEMPLATES) {
    const result = resolveRoomPlayerSpawn(room), reserved = reservedSpawnBounds(result);
    assert.equal(room.obstacles.some(rect => !(reserved.x + reserved.w <= rect.x || rect.x + rect.w <= reserved.x || reserved.y + reserved.h <= rect.y || rect.y + rect.h <= reserved.y)), false, room.id);
    assert.equal(circleOverlapsReservedSpawn(result.resolvedPosition.x, result.resolvedPosition.y, 22, reserved), true);
  }
});

test("spawn safety leaves established spawn balance constants untouched", () => {
  assert.deepEqual(SPAWN_BALANCE, { roomHealthGrowth: .15, eliteHealthMultiplier: 1.8, eliteRadiusMultiplier: 1.25, waveDelaySeconds: 1.1 });
  assert.deepEqual(PLAYABLE_ROOM_BOUNDS, { x: 92, y: 92, w: 1096, h: 536 });
});
