import type { PointZone, Rect, RoomTemplate } from "./rooms";

export type Vec2 = { x: number; y: number };
export type PlayerPositionConvention = "center";
export type SpawnInvalidReason = "outside_room" | "solid_overlap" | "occupied" | "hazard_overlap" | "movement_blocked" | "no_valid_position";
export interface PlayerCollider { radius: number; offsetX: number; offsetY: number; convention: PlayerPositionConvention }
export interface PlayerSpawnZone extends Rect { id: string; entranceDirection: "north" | "south" | "east" | "west"; priority: number }
export interface OccupiedCircle extends Vec2 { radius: number; kind: "enemy" | "pickup" | "player" }
export interface SpawnResolutionResult { success: boolean; requestedPosition: Vec2; resolvedPosition: Vec2; spawnPointId?: string; fallbackUsed: boolean; reason?: SpawnInvalidReason; invalidReasons: SpawnInvalidReason[]; testedPositions: Vec2[] }

export const PLAYER_COLLIDER: PlayerCollider = { radius: 14, offsetX: 0, offsetY: 0, convention: "center" };
export const PLAYER_SPAWN_CLEARANCE = 8;
export const PLAYER_SPAWN_SEARCH_STEP = 24;
export const PLAYER_SPAWN_MAX_RADIUS = 264;
export const PLAYER_SPAWN_MAX_ATTEMPTS = 512;
export const PLAYABLE_ROOM_BOUNDS: Rect = { x: 92, y: 92, w: 1096, h: 536 };

const circleRectOverlap = (x: number, y: number, radius: number, rect: Rect) => {
  const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return Math.hypot(x - nearestX, y - nearestY) < radius;
};

export const colliderBoundsAt = (position: Vec2, collider = PLAYER_COLLIDER): Rect => ({
  x: position.x + collider.offsetX - collider.radius,
  y: position.y + collider.offsetY - collider.radius,
  w: collider.radius * 2,
  h: collider.radius * 2,
});

export const colliderCenterToSpritePosition = (bounds: Rect): Vec2 => ({ x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 });
export const worldToRoomPosition = (world: Vec2, roomOrigin: Vec2): Vec2 => ({ x: world.x - roomOrigin.x, y: world.y - roomOrigin.y });
export const roomToWorldPosition = (local: Vec2, roomOrigin: Vec2): Vec2 => ({ x: local.x + roomOrigin.x, y: local.y + roomOrigin.y });

export function validateSpawnPosition(input: {
  position: Vec2;
  collider?: PlayerCollider;
  roomBounds?: Rect;
  solids: Rect[];
  occupied?: OccupiedCircle[];
  hazards?: PointZone[];
  requireMovementClearance?: boolean;
}): SpawnInvalidReason[] {
  const collider = input.collider || PLAYER_COLLIDER;
  const room = input.roomBounds || PLAYABLE_ROOM_BOUNDS;
  const x = input.position.x + collider.offsetX;
  const y = input.position.y + collider.offsetY;
  const radius = collider.radius + PLAYER_SPAWN_CLEARANCE;
  const reasons: SpawnInvalidReason[] = [];
  if (x - radius < room.x || x + radius > room.x + room.w || y - radius < room.y || y + radius > room.y + room.h) reasons.push("outside_room");
  if (input.solids.some(rect => circleRectOverlap(x, y, radius, rect))) reasons.push("solid_overlap");
  if ((input.occupied || []).some(entity => Math.hypot(x - entity.x, y - entity.y) < radius + entity.radius + PLAYER_SPAWN_CLEARANCE)) reasons.push("occupied");
  if ((input.hazards || []).some(hazard => Math.hypot(x - hazard.x, y - hazard.y) < radius + hazard.r)) reasons.push("hazard_overlap");
  if (!reasons.length && input.requireMovementClearance !== false) {
    const probeDistance = collider.radius + PLAYER_SPAWN_CLEARANCE + 10;
    const probes = [[probeDistance, 0], [-probeDistance, 0], [0, probeDistance], [0, -probeDistance]];
    const openDirections = probes.filter(([dx, dy]) => {
      const px = x + dx, py = y + dy;
      return px - collider.radius >= room.x && px + collider.radius <= room.x + room.w && py - collider.radius >= room.y && py + collider.radius <= room.y + room.h && !input.solids.some(rect => circleRectOverlap(px, py, collider.radius, rect));
    }).length;
    if (openDirections < 2) reasons.push("movement_blocked");
  }
  return reasons;
}

const zoneCenter = (zone: PlayerSpawnZone): Vec2 => ({ x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 });

export function resolveSafePlayerSpawn(input: {
  requestedSpawn: Vec2;
  requestedSpawnPointId?: string;
  backupZones?: PlayerSpawnZone[];
  collider?: PlayerCollider;
  roomBounds?: Rect;
  solids: Rect[];
  occupied?: OccupiedCircle[];
  hazards?: PointZone[];
}): SpawnResolutionResult {
  const testedPositions: Vec2[] = [];
  const invalidReasons = new Set<SpawnInvalidReason>();
  const valid = (position: Vec2) => {
    if (testedPositions.length >= PLAYER_SPAWN_MAX_ATTEMPTS) return false;
    testedPositions.push(position);
    const reasons = validateSpawnPosition({ ...input, position });
    reasons.forEach(reason => invalidReasons.add(reason));
    return reasons.length === 0;
  };
  if (valid(input.requestedSpawn)) return { success: true, requestedPosition: input.requestedSpawn, resolvedPosition: input.requestedSpawn, spawnPointId: input.requestedSpawnPointId, fallbackUsed: false, invalidReasons: [], testedPositions };
  const backups = [...(input.backupZones || [])].sort((a, b) => b.priority - a.priority);
  for (const zone of backups) {
    const point = zoneCenter(zone);
    if (valid(point)) return { success: true, requestedPosition: input.requestedSpawn, resolvedPosition: point, spawnPointId: zone.id, fallbackUsed: true, reason: [...invalidReasons][0], invalidReasons: [...invalidReasons], testedPositions };
  }
  for (let radius = PLAYER_SPAWN_SEARCH_STEP; radius <= PLAYER_SPAWN_MAX_RADIUS; radius += PLAYER_SPAWN_SEARCH_STEP) {
    const points = Math.max(8, Math.ceil(Math.PI * 2 * radius / PLAYER_SPAWN_SEARCH_STEP));
    for (let index = 0; index < points && testedPositions.length < PLAYER_SPAWN_MAX_ATTEMPTS; index++) {
      const angle = index / points * Math.PI * 2;
      const point = { x: Math.round(input.requestedSpawn.x + Math.cos(angle) * radius), y: Math.round(input.requestedSpawn.y + Math.sin(angle) * radius) };
      if (valid(point)) return { success: true, requestedPosition: input.requestedSpawn, resolvedPosition: point, fallbackUsed: true, reason: [...invalidReasons][0], invalidReasons: [...invalidReasons], testedPositions };
    }
  }
  const room = input.roomBounds || PLAYABLE_ROOM_BOUNDS;
  const center = { x: room.x + room.w / 2, y: room.y + room.h / 2 };
  if (valid(center)) return { success: true, requestedPosition: input.requestedSpawn, resolvedPosition: center, spawnPointId: "room-center-fallback", fallbackUsed: true, reason: [...invalidReasons][0], invalidReasons: [...invalidReasons], testedPositions };
  return { success: false, requestedPosition: input.requestedSpawn, resolvedPosition: input.requestedSpawn, fallbackUsed: true, reason: "no_valid_position", invalidReasons: [...invalidReasons, "no_valid_position"], testedPositions };
}

export function resolveRoomPlayerSpawn(template: RoomTemplate, occupied: OccupiedCircle[] = []): SpawnResolutionResult {
  const zones = [...template.playerSpawnZones].sort((a, b) => b.priority - a.priority);
  const primary = zones[0];
  const requestedSpawn = primary ? zoneCenter(primary) : { x: 640, y: 570 };
  return resolveSafePlayerSpawn({ requestedSpawn, requestedSpawnPointId: primary?.id, backupZones: zones.slice(1), solids: template.obstacles, occupied, hazards: template.hazardZones });
}

export function applyResolvedPlayerSpawn<T extends Vec2>(player: T, result: SpawnResolutionResult): T {
  if (!result.success) return player;
  player.x = result.resolvedPosition.x;
  player.y = result.resolvedPosition.y;
  return player;
}

export const reservedSpawnBounds = (result: SpawnResolutionResult, radius = PLAYER_COLLIDER.radius + PLAYER_SPAWN_CLEARANCE + 20): Rect => ({ x: result.resolvedPosition.x - radius, y: result.resolvedPosition.y - radius, w: radius * 2, h: radius * 2 });
export const circleOverlapsReservedSpawn = (x: number, y: number, radius: number, reserved: Rect) => circleRectOverlap(x, y, radius, reserved);
