# Hollow Vault — Rift Protocol: Restoration Audit

## Current State Assessment

### ✓ Legitimate Backend Systems (Preserved)
- `game/adaptive.ts` - 13KB deterministic difficulty calculation with 5 tiers
- `game/customization.ts` - 14KB skin/map-style management  
- `game/reinforcements.ts` - 6KB reinforcement system
- `game/rooms.ts` - 24KB room template library with enemy groups, spawn zones
- `game/spawn.ts` - 8KB safe-spawn resolver and collision validation
- `game/transparency.ts` - 20KB AI Director dashboard state
- `game/ui-accessibility.ts` - Accessibility features
- `lib/server/adaptive-rooms/planner.ts` - Server-side room planning logic
- `lib/server/adaptive-reinforcements/planner.ts` - Server-side reinforcement planning
- `lib/server/openai/client.ts` - OpenAI integration with security boundaries
- `app/api/health/route.ts` - Health endpoint
- `app/api/adaptive-rooms/route.ts` - Room planning API
- `app/api/adaptive-reinforcements/route.ts` - Reinforcement planning API
- `app/api/adaptive-difficulty/route.ts` - Difficulty recommendations

### ✗ Incorrectly Replaced (v0-Generated Mockups)
- `app/page.tsx` - **99 bytes**: Just imports landing page, not the game
- `app/landing.tsx` - 11KB marketing landing page (fake hero section, buttons)
- `app/game-ui.tsx` - 16KB: Game UI components exist but disconnected from canvas
- `app/onboarding/page.tsx` - 304 lines: Multi-step form (not gameplay-based)
- `app/assessment/page.tsx` - Mock tutorial missions, not real playable rooms
- `app/profile/page.tsx` - 171 lines: Static stats display, no real profile data
- `app/campaign/page.tsx` - 251 lines: Mission list mockup, no adaptive logic
- `app/campaign-map/page.tsx` - 374 lines: SVG map visualization mockup
- `app/adaptation/page.tsx` - 341 lines: "Adaptation Lab" mockup with static data
- `app/settings/page.tsx` - 333 lines: Settings panels, some disconnected from game
- Multiple CSS files for styling these mockups

### Missing Critical Components
1. **Canvas Game Loop** - Main gameplay rendering and update loop
2. **Player Entity** - Character with collision, health, weapons
3. **Enemy System** - Spawning, behavior, combat, death
4. **Projectile System** - Firing, collision, damage
5. **Input Handling** - Keyboard, mouse, gamepad, touch, pointer-lock
6. **Mobile Controls** - Floating joysticks, touch input system
7. **Tutorial Flow** - Real 5-level gameplay progression (not mockup cards)
8. **Room Transitions** - Camera effects, loading, completion handling
9. **Relic Selection** - Post-room upgrade choices
10. **Save Persistence** - Run state, profile, cosmetics, progress

## Restoration Requirements

### Phase 1: Restore Canvas Game
1. Restore `app/page.tsx` with actual Canvas game component
2. Implement game loop with requestAnimationFrame
3. Restore player movement (WASD), aiming (mouse), firing (click)
4. Restore gamepad support (both axes, both triggers)
5. Restore mobile touch controls (movement joystick, aiming drag)
6. Restore pointer-lock management for smooth input

### Phase 2: Restore Game Systems
1. Connect enemy spawning to `game/spawn.ts` safe-spawn resolver
2. Connect room loading to `game/rooms.ts` templates
3. Connect difficulty adaptation to `game/adaptive.ts` tier system
4. Connect reinforcements to `game/reinforcements.ts` logic
5. Connect cosmetics to `game/customization.ts` (skins, map styles)

### Phase 3: Restore Gameplay Features
1. Player health, energy, weapons
2. Combat: projectiles, hit detection, damage, critical hits
3. Dash ability with cooldown
4. Reinforcement system with costs, charges, cooldowns
5. Room completion detection and transitions
6. Relic choice screen after rooms
7. Wave progression within rooms
8. Enemy difficulty scaling

### Phase 4: Restore Tutorial Flow
1. Real playable Room 1-5 (movement, aiming, dash, abilities, combat)
2. Measure gameplay metrics during tutorial
3. Build player profile from Room 5 completion
4. Allow skip and replay from settings
5. Persist tutorial completion status

### Phase 5: Restore Mobile Support
1. Floating movement joystick (left side of canvas)
2. Drag-to-aim aiming (right side of canvas)
3. Fire button (tap on right)
4. Dash button (tap with modifier or dedicated)
5. Reinforcement button (swipe or dedicated)
6. Portrait mode responsiveness
7. Safe area padding for notches

### Phase 6: Restore Persistence
1. Campaign progress and best room
2. Player profile and adaptive state
3. Cosmetics (selected skin, map style)
4. Settings (UI scale, accessibility, control preferences)
5. Tutorial completion status
6. Currency/relics collected
7. Corrupted data fallback

### Phase 7: Remove Fake Dashboard
1. Delete or disable `/onboarding` page
2. Delete or disable `/assessment` page
3. Delete or disable `/profile` page
4. Delete or disable `/campaign` page
5. Delete or disable `/campaign-map` page
6. Delete or disable `/adaptation` page
7. Keep `/settings` for actual game settings

### Phase 8: Production Verification
1. Run full test suite (`pnpm test`)
2. Run typecheck and lint (`pnpm run typecheck && pnpm run lint`)
3. Build (`pnpm build`)
4. Test gameplay on:
   - Desktop 1366×768, 1920×1080
   - Mobile 375×812, 812×375, 320×568
5. Verify no console errors
6. Verify cursor/pointer-lock transitions
7. Verify touch controls on mobile emulator
8. Verify main menu → gameplay → room completion → relic choice flow
9. Verify save/load persistence
10. Verify OpenAI integration (optional, graceful fallback)

## Success Criteria
- [ ] User can play from main menu through rooms to completion
- [ ] Enemies spawn, move, attack, die correctly
- [ ] Player can move, aim, shoot, dash, use abilities
- [ ] Reinforcements work with real costs and cooldowns
- [ ] Tutorial runs all 5 levels with real gameplay
- [ ] Mobile controls work smoothly on emulator
- [ ] Saves persist across sessions
- [ ] Difficulty adapts based on real gameplay metrics
- [ ] OpenAI room planning works (optional fallback to local)
- [ ] No typecheck, lint, or test failures
- [ ] Vercel deployment succeeds
- [ ] No fake dashboard pages remain

## Files to Preserve (DO NOT DELETE)
- All files in `game/` (core systems)
- All files in `lib/server/` (API backend)
- All routes in `app/api/` (API endpoints)
- Legitimate CSS files (accessibility, director, systems)
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `.env.example` with correct variable names

## Files to Restore/Create
- `app/page.tsx` - Main game canvas component (largest change)
- `app/mobile-controls.tsx` - Touch joystick implementation
- `app/tutorial-overlay.tsx` - Tutorial UI prompts
- `game/tutorial.ts` - Tutorial room generation
- `game/input.ts` - Unified input handler (keyboard, mouse, gamepad, touch)
- Tests for all restored systems

