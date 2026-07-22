# Make the Existing Game Mobile-Ready, Fix Cursor Transitions, Build the Five-Level Tutorial, and Preserve Vercel Production Support

Act as a senior game engineer, mobile web specialist, input-systems engineer, UX/accessibility designer, Next.js/Vercel engineer, QA engineer, and code auditor.

Work in the existing repository. Do not rebuild the game from scratch, replace its engine, or produce a disconnected demo. Inspect the current implementation first, then modify the real runtime paths.

Your goal is to deliver one coherent production update that:

1. makes the entire game genuinely playable and readable on phones and tablets;
2. fixes cursor, pointer-lock, focus, input-reset, and level-transition bugs;
3. turns the first five skill-assessment levels into a real first-time tutorial;
4. preserves desktop keyboard/mouse and controller play;
5. preserves the adaptive game systems, OpenAI integration, local fallbacks, saves, and visual identity;
6. remains secure, reliable, and deployable on Vercel.

Do not claim completion from source inspection alone. Test the rendered game and its real transitions.

---

## Non-negotiable constraints

Do not unintentionally change:

- enemy or player balance;
- spawn rates, enemy counts, damage, weapon values, movement speed, or cooldowns;
- room-selection and adaptive-difficulty formulas;
- reinforcement formulas or costs;
- map geometry outside explicitly tutorial-specific guidance;
- skins, map styles, art direction, or core animations;
- the OpenAI response contract, prepared-room queue, or deterministic fallback behavior;
- existing desktop controls;
- Vercel/API behavior;
- existing saved progress.

Tutorial-specific safety measures may temporarily reduce pressure only when they are explicitly represented as tutorial assistance and excluded from skill scoring. Do not quietly rebalance normal gameplay.

Never expose an OpenAI key to the browser. Never create a `NEXT_PUBLIC_OPENAI_API_KEY`. Never call OpenAI directly from client code. Never hardcode localhost or a deployment domain into browser API requests.

Do not disable browser zoom globally. Do not use a global `user-scalable=no` solution. Restrict gesture suppression to the active gameplay surface when necessary.

Do not add `vercel.json`, a service worker, a new dependency, or a new state library unless the current architecture genuinely requires it. Explain any such addition.

---

## First: inspect the actual repository

Before editing, inspect the full repository and identify the real:

- framework, package manager, Node version, and rendering model;
- game entry point and main loop;
- canvas or renderer sizing code;
- CSS/theme/typography system and breakpoints;
- input manager and keyboard, mouse, controller, and touch paths;
- cursor and pointer-lock ownership;
- menu, pause, completion, game-over, loading, tutorial, and gameplay states;
- room progression and first-time skill-assessment flow;
- telemetry and skill-profile calculation;
- save schema, versioning, migrations, and storage error handling;
- OpenAI client, server routes, validation schemas, timeouts, fallbacks, and room queue;
- Vercel configuration and environment variables;
- PWA/manifest/service-worker support, if any;
- tests and production build commands.

Search all relevant references, including:

```txt
pointerLock
requestPointerLock
exitPointerLock
cursor
focus
blur
visibilitychange
touchstart
touchmove
touchend
touchcancel
pointerdown
pointerup
orientationchange
resize
visualViewport
safe-area
gamepad
roomComplete
levelComplete
transition
tutorial
calibration
assessment
telemetry
localStorage
OpenAI
api/
fallback
preparedRooms
manifest
serviceWorker
```

Trace values through the runtime. Do not assume that an interface, dashboard label, README statement, or old prompt proves a feature is connected.

Before changes, write a short audit in the final report covering:

- mobile layout and touch-input failures;
- cursor/pointer-lock root cause;
- transition and stale-input failures;
- current first-five-level behavior;
- save/migration risks;
- Vercel and API risks;
- exact files and functions involved.

---

## Ask one concise batch of questions

Ask these before implementation if the user is available. Do not ask them one at a time.

### Mobile

1. Should gameplay support landscape only, portrait only, or both?
2. Should movement use a fixed joystick, floating joystick, tap-to-move, or selectable modes?
3. Should aiming use a right joystick, drag-to-aim, tap-to-aim, or selectable modes?
4. Should shooting be manual, automatic, or selectable?
5. Should tablets use mobile controls, desktop-style controls, or a hybrid based on input?
6. What is the minimum supported phone width and oldest browser/device target?
7. Should haptics be enabled when supported?
8. Is installable PWA support required?

### Cursor and tutorial

9. Should the cursor appear immediately when a level is cleared, or only after the completion overlay appears?
10. Should Continue require a click/tap before pointer lock can return?
11. Is the tutorial mandatory once per save, optional from the start, or always skippable?
12. Should tutorial prompts pause, slow, or leave gameplay running?
13. Must the tutorial support keyboard/mouse, controller, and touch equally?
14. Should tutorial replay be available in Settings or the main menu?
15. Is tutorial completion stored per save or globally?
16. Should the AI dashboard explain how tutorial performance formed the initial skill profile?

If answers are unavailable, continue with these defaults:

- landscape gameplay, with menus usable in both orientations;
- a clear rotate-device prompt that safely pauses gameplay in unsupported orientation;
- floating left movement joystick;
- floating right aim joystick;
- a dedicated fire button;
- hybrid tablet input based on the active device;
- minimum supported width of 320 CSS pixels;
- optional haptics setting;
- PWA support only if compatible with the current architecture;
- cursor visible as soon as level completion begins;
- pointer lock returns only after an intentional Continue gesture and only when gameplay is ready;
- tutorial runs once per save, with a confirmation before skipping;
- mostly non-blocking prompts, except a short first explanation;
- keyboard/mouse, controller, and touch all supported;
- tutorial replay in Settings;
- tutorial progress saved per save;
- a friendly post-tutorial dashboard explanation.

Record assumptions in the final report.

---

# Part A — Vercel-safe architecture

## Preserve the server boundary

Use the repository's existing server framework and route conventions. If this is a Next.js App Router project, keep OpenAI routes as server-only route handlers with a flow equivalent to:

```txt
Browser game
  -> relative same-origin /api request
  -> Vercel Node.js function
  -> server-only OpenAI client
  -> strict schema validation and bounded values
  -> normalized response
  -> client queue or local fallback
```

Verify rather than assume the exact route names. Preserve existing health, adaptive-room, and adaptive-reinforcement endpoints if present.

Requirements:

- import the OpenAI SDK only from server-only modules;
- use the Node.js runtime for routes that require the OpenAI SDK;
- read secrets only from server environment variables;
- use relative same-origin URLs from the client;
- validate request and response bodies;
- clamp AI-controlled numeric values to existing safe limits;
- set bounded request timeouts and handle cancellation;
- keep gameplay non-blocking while a future plan is generated;
- use the existing prepared queue and deterministic local fallback;
- do not allow API failure to prevent the next room from loading;
- do not rely on Vercel Function memory as durable storage;
- do not write runtime data to the deployment filesystem;
- prevent duplicate requests caused by remounts, visibility changes, orientation changes, or repeated transition events;
- do not log secrets or excessive player telemetry;
- keep rate/cost controls already present.

Audit existing environment variables. Prefer the existing names, such as the current equivalents of:

```txt
OPENAI_API_KEY
OPENAI_MODEL
ADAPTIVE_ROOMS_ENABLED
```

Do not invent variables the code does not use. Update `.env.example` and deployment documentation if the implementation changes the required environment.

Remember that adding or changing Vercel environment variables requires a new deployment.

## PWA and caching safety

If PWA support is requested and fits the repository:

- provide a valid manifest, icons, theme colors, and install metadata;
- cache only a versioned app shell and safe static assets;
- never cache OpenAI/API POST responses, secrets, telemetry submissions, or sensitive save data;
- use network-only behavior for adaptive API routes;
- do not create a broken offline mode that claims AI functionality works offline;
- ensure old caches cannot trap users on a broken game build;
- provide a safe update/reload path;
- test that Vercel route handling is not intercepted by the service worker.

If PWA support would be unsafe or disproportionate, document why and leave it out instead of adding a fragile service worker.

---

# Part B — Centralized application and input lifecycle

## Define explicit interaction modes

Create or strengthen a single source of truth for modes such as:

```ts
type InteractionMode =
  | "main-menu"
  | "loading"
  | "gameplay"
  | "paused"
  | "level-complete"
  | "game-over"
  | "tutorial-blocking"
  | "tutorial-nonblocking"
  | "settings";
```

Adapt names to the current code. Do not introduce a parallel state machine if one already exists; consolidate behavior into the existing authority.

For every mode, define:

- whether simulation runs;
- whether gameplay input is accepted;
- whether pointer lock is allowed;
- whether the cursor is visible;
- which overlay receives input;
- which element receives focus;
- whether touch controls appear;
- whether controller navigation is active.

Desktop, controller, and touch must feed one normalized gameplay input state. The game loop should consume commands, not contain three competing control implementations.

Example shape, adapted to the repository:

```ts
type GameplayInput = {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  firing: boolean;
  dashPressed: boolean;
  abilityPressed: boolean;
};
```

## Reset input at every boundary

Implement one authoritative reset that clears held keys, buttons, axes, joystick pointers, aim drag, firing, dash/ability edges, and cached pointer deltas.

Call it on:

- level completion;
- pause and resume;
- gameplay start;
- game over;
- menu entry;
- tab blur;
- `visibilitychange` to hidden;
- `touchcancel`;
- orientation transition;
- controller disconnect;
- component teardown.

The reset must prevent:

- movement continuing after a room ends;
- firing through an overlay;
- a Continue tap/click becoming a shot;
- stuck virtual joysticks;
- duplicate completion or loading actions.

## Listener hygiene

Audit all event listeners, animation loops, timers, subscriptions, and pointer-lock handlers. Use stable references and exact cleanup. Under React Strict Mode or repeated mounting, there must still be only one effective listener and one active game loop.

---

# Part C — Cursor, focus, pointer lock, and transitions

## Cursor policy

Use state-driven cursor behavior, not scattered CSS overrides.

- Main menu, settings, pause, completion, game over, and blocking tutorial overlays: cursor visible on mouse-capable devices.
- Active mouse gameplay: pointer lock may hide/capture the cursor.
- Controller gameplay: do not force pointer lock merely because a controller is connected.
- Touch devices: never request pointer lock.
- Non-blocking tutorial prompts: follow the underlying gameplay mode.

Remove contradictory rules such as a parent hiding the cursor while a child overlay tries to show it.

## Correct level-clear sequence

When a level is cleared, perform this sequence once:

```txt
completion is detected
-> reject duplicate completion
-> stop gameplay input
-> clear all held input
-> stop or safely settle simulation
-> exit pointer lock if active
-> switch to level-complete mode
-> show the cursor on mouse devices
-> render the completion UI
-> focus its primary action without activating it
```

The canvas must not recapture pointer lock while the completion overlay is open.

On Continue:

```txt
intentional click/tap/controller activation
-> consume and suppress that activation from gameplay
-> begin the level transition once
-> load/prepare the next room
-> mount and size gameplay
-> reset input again
-> enter gameplay mode
-> request pointer lock only from the valid user gesture when appropriate
```

If browser rules prevent lock at the desired moment, show a clear “Click to resume” surface. Do not loop pointer-lock requests.

Handle `pointerlockchange` and `pointerlockerror`. Treat an unexpected unlock during gameplay as a controlled pause or resume state rather than leaving input half-active.

## Focus policy

- Move focus to the active overlay's primary control.
- Trap focus only in truly modal overlays.
- Restore focus predictably when closing settings or pause.
- Do not autofocus in a way that fires Continue on the same event that opened the overlay.
- Make focus rings clearly visible.
- Ensure touch and controller users are not forced through desktop focus behavior.

---

# Part D — Mobile viewport and responsive layout

## Centralized viewport sizing

Create one viewport service/hook/utility used by the renderer and UI. Account for:

- `window.innerWidth` and `innerHeight`;
- `visualViewport` where useful;
- dynamic browser bars;
- device orientation;
- CSS safe areas;
- device pixel ratio;
- a clamped render DPR for performance;
- resize and orientation events;
- full-screen mode, if already supported.

Use modern viewport units with safe fallback:

```css
min-height: 100vh;
min-height: 100dvh;
```

Do not stretch the game world. Preserve its logical coordinate system and aspect behavior. Scale the canvas backing store separately from its CSS size.

## Safe areas

Centralize safe-area tokens:

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
}
```

Apply them to HUD edges, pause/settings controls, joystick regions, fire/action buttons, completion dialogs, tooltips, and rotate-device messaging.

## Orientation

With the default policy, gameplay is landscape-first and menus work in either orientation.

If portrait gameplay is unsupported:

- show a styled rotate-device overlay;
- pause simulation and clear input;
- do not merely cover still-running gameplay;
- restore the previous valid state after rotation;
- resize only after dimensions stabilize enough to prevent thrashing.

## Responsive UI

Make the following usable without clipping or horizontal scrolling:

- main menu;
- HUD;
- pause and settings;
- level-complete and game-over screens;
- tutorial prompts;
- AI transparency dashboard;
- skin and map-style selectors;
- tooltips and modals.

Use flexible wrapping, grids, `clamp()`, min/max sizes, overflow management, and scrollable panels where appropriate. Do not hide essential controls just to fit a small screen.

Minimum expectations:

- touch targets at least 44×44 CSS pixels;
- body and action text normally at least 16px;
- secondary essential text at least 14px;
- clear contrast and focus states;
- no essential information conveyed only by color;
- large UI scale does not break navigation.

HUD zones should remain separate: status, objectives/notifications, movement, and combat actions must not overlap.

---

# Part E — Touch controls

## Movement joystick

Implement or repair a multi-touch-safe movement joystick:

- left-side control zone;
- floating by default;
- dead zone and normalized vector;
- clamped knob distance;
- tracked pointer/touch identifier;
- independent simultaneous aim/fire touches;
- full cleanup on end, cancel, blur, orientation change, pause, and transition;
- safe-area placement;
- adjustable size and opacity.

Do not map the entire screen to movement.

## Aim and firing

Use a right-side aim joystick by default. Preserve the last valid aim direction when returning to neutral unless existing mechanics require otherwise.

The fire control must:

- use a dedicated, reachable button;
- support hold-to-fire if the weapon already does;
- not trigger when interacting with UI;
- not remain held after cancel/transition;
- show cooldown, disabled, or ammunition state when applicable;
- not change weapon fire rate.

Do not make auto-fire the default. If selectable auto-fire already exists or is explicitly approved, use the same combat rules, range, line-of-sight, and fire-rate limits as manual fire.

Expose only actions the game actually implements. Action buttons must reflect cooldowns/charges and support left-handed or remappable layouts where practical.

## Touch settings

Add or preserve settings for the applicable options:

- joystick mode;
- joystick size and opacity;
- aim sensitivity;
- aim assist;
- button size/placement;
- left-handed layout;
- haptics;
- UI scale.

Persist them safely without changing the gameplay camera scale.

Use `touch-action` narrowly on the gameplay surface and controls. Menus, settings, dashboards, and long text must remain scrollable and zoomable.

---

# Part F — First five levels as a tutorial and fair skill assessment

## Use the actual current progression

First audit how many assessment/calibration rooms really exist. If the current code has fewer than five, do not pretend otherwise. Extend or map the existing sequence to five guided assessment levels using the smallest coherent change, while preserving normal post-tutorial room generation and balance.

The tutorial must teach through real actions and record real performance. It must not be a timed slideshow.

Recommended progression, adapted to mechanics that actually exist:

### Level 1 — Movement, aim, and basic attack

- teach the active movement input;
- teach aiming for the active device;
- teach basic firing;
- require demonstrated movement and successful attacks;
- explain only the minimum needed to start.

### Level 2 — Enemy telegraphs and positioning

- teach relevant attack warnings;
- teach spacing, cover, or dodging only if implemented;
- require the player to respond to a real telegraph;
- avoid unavoidable damage during instruction.

### Level 3 — Ability, dash, resources, or pickups

- teach only mechanics that exist;
- demonstrate cooldown/resource feedback;
- require one successful use in an appropriate context;
- never fabricate an unavailable mechanic.

### Level 4 — Reinforcements

- explain what triggers availability;
- explain cost, cooldown, charges, and effect using real values;
- require the player to open/select/use the actual reinforcement flow where safe;
- keep AI recommendation and local fallback behavior honest.

### Level 5 — Combined assessment

- combine the learned mechanics in a controlled encounter or mini-boss if the game already supports it;
- reduce tutorial handholding;
- collect a fair final sample;
- end with a clear summary and transition to normal adaptive play.

## Event-driven tutorial steps

Represent steps with explicit state and event-based completion. Use real gameplay events such as movement distance, aim stability, shot fired, hit confirmed, telegraph avoided, ability used, reinforcement activated, encounter completed, or UI opened.

Do not complete important steps solely because a timer elapsed. Timers may control presentation pacing, reminders, or fallback hints.

Each step should define the applicable:

- stable ID and version;
- level;
- input-specific instruction;
- trigger condition;
- completion condition;
- whether gameplay pauses;
- highlight/anchor target;
- assistance flag;
- analytics event without sensitive data.

Prompts must react to the active input device:

- keyboard/mouse labels and icons;
- controller button labels using the current mapping;
- touch joystick and action-button highlights.

Use a stability threshold before switching prompt families so incidental mouse movement does not replace a controller/touch prompt.

## Tutorial pressure and fairness

Tutorial assistance must be bounded, transparent, and mechanically safe. Do not use unrestricted GPT output to generate the first five tutorial levels. Prefer validated local tutorial templates with explicit allowed ranges.

Separate:

```ts
rawPerformanceMetrics
tutorialAssistanceFlags
adjustedAssessmentMetrics
```

Exclude or normalize:

- time spent in blocking prompts;
- orientation prompts;
- paused time;
- forced scripted waits;
- scripted invulnerability or damage reduction;
- guaranteed reinforcement or pickup demonstrations;
- enemies delayed specifically for explanation;
- retries caused by an input/system bug.

Do not secretly punish a player for using tutorial help. Record raw facts, assistance context, and the bounded values actually used for the initial skill profile.

After level five, enter the existing normal adaptive flow. OpenAI may prepare future rooms only through the existing validated, asynchronous, fallback-safe path.

## Tutorial presentation

- Use concise text, icons, and restrained highlights matching the current visual identity.
- Keep non-blocking prompts away from the reticle, hazards, joysticks, and buttons.
- Blocking prompts must expose cursor/touch/controller navigation correctly.
- Provide dismiss/reminder behavior where appropriate.
- Never depend on color alone.
- Do not make text tiny to avoid layout work.

## Skip, replay, resume, and migration

Persist:

- tutorial schema version;
- started/completed/skipped status;
- current level and step when safe;
- chosen tutorial options;
- whether the profile summary was shown.

Requirements:

- existing players must not be trapped in a newly added mandatory tutorial;
- new players get the intended first-run flow;
- Skip requires a clear confirmation and states the consequence;
- Replay must not destroy unrelated progress or overwrite the live skill profile unless explicitly confirmed;
- interrupted tutorials resume at a safe boundary;
- invalid or old save data migrates or falls back safely;
- blocked/private storage does not crash the game.

At completion, show a friendly and accurate profile summary explaining:

- what the game observed;
- which metrics affected the initial profile;
- what assistance was excluded or normalized;
- the starting difficulty tendency;
- that future play can update the profile.

Do not present mocked dashboard data as live measurements.

---

# Part G — Mobile audio, haptics, and performance

## Audio

- initialize/resume audio only after an allowed user gesture;
- avoid creating multiple audio contexts;
- handle tab backgrounding and restoration;
- do not let orientation or transition events duplicate sounds;
- preserve existing volume and mute settings.

## Haptics

When supported and enabled, use restrained patterns for meaningful actions such as firing, taking damage, completing an objective, or confirming an action. Feature-detect and fail silently. Do not vibrate continuously.

## Performance

Profile real mobile behavior. Optimize rendering and presentation without changing simulation outcomes.

Allowed adaptive quality controls include:

- clamped device-pixel ratio;
- particle count or cosmetic effect density;
- shadow/glow quality;
- decorative background complexity;
- nonessential animation quality.

Do not vary enemy logic, damage, spawn timing, projectile behavior, or collision correctness based on device performance.

Target smooth play on representative phones, with a graceful quality floor. Avoid allocating objects in hot loops, repeated layout reads during pointer movement, or excessive React state updates per animation frame.

---

# Part H — Testing and verification

## Required viewport matrix

Test at minimum:

```txt
320 x 568
360 x 640
375 x 667
390 x 844
412 x 915
430 x 932
667 x 375
844 x 390
932 x 430
768 x 1024
1024 x 768
1366 x 768
1920 x 1080
```

Include high-DPI behavior and at least one mobile Safari-like and one mobile Chromium-like environment where tooling permits.

## Transition matrix

Test every supported input family through:

```txt
main menu -> gameplay
gameplay -> pause -> gameplay
gameplay -> level complete -> next level
gameplay -> game over -> retry/menu
gameplay -> blocking tutorial -> gameplay
gameplay -> unsupported orientation -> gameplay
gameplay -> tab hidden -> visible
tutorial interrupted -> reload -> safe resume
tutorial complete -> normal adaptive room
settings/dashboard -> gameplay
```

Verify after every transition:

- correct cursor visibility;
- correct pointer-lock state;
- correct focused element;
- no stale movement or firing;
- no accidental click-through;
- no duplicate listener, timer, room load, API call, or completion event;
- correct touch-control visibility;
- correct simulation pause state.

## Automated tests

Add or update tests for the real architecture, including:

- interaction-mode cursor policy;
- pointer-lock success, rejection, unlock, and error handling;
- input reset on every lifecycle boundary;
- multi-touch ownership and `touchcancel`/pointer cancellation;
- orientation pause and restore;
- viewport/DPR calculations;
- no horizontal UI overflow;
- safe-area positioning;
- touch target sizes where feasible;
- first-time tutorial detection;
- all five level progressions and event-driven gates;
- skip, replay, interrupted resume, and save migration;
- input-specific prompt switching;
- exclusion of paused/scripted assistance from skill scoring;
- one transition and one API request under duplicate events;
- API request validation, timeouts, invalid output, and fallback;
- Vercel route response behavior with missing API key;
- absence of server secrets from client configuration;
- service-worker exclusions if PWA support is added.

Use screenshot/visual tests if the repository already supports them. Add development-only diagnostics where useful, but keep debug UI out of production.

## Manual rendered QA

Run the game, not only unit tests. Inspect menus, gameplay, HUD, touch controls, tutorial prompts, completion overlay, dashboard, settings, skins, and map selection at representative sizes.

Confirm:

- no clipped labels or off-screen primary actions;
- no overlapping joysticks/HUD/prompts;
- scroll works in menus and dashboards;
- gameplay does not page-scroll;
- zoom remains available outside the gameplay surface;
- rotate handling does not lose progress;
- cursor appears immediately on completion;
- Continue does not fire a shot;
- controller and touch can complete the tutorial without a mouse;
- desktop behavior remains intact.

## Production and Vercel verification

Use the repository's actual package manager and scripts. For a pnpm project, run the available equivalents of:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Then verify the production build rather than relying only on the development server:

- application routes render;
- server API routes remain dynamic and callable;
- health endpoint works if present;
- missing/invalid API credentials produce a controlled local fallback;
- API responses are not cached incorrectly;
- no secret is present in generated browser bundles, source maps, logs, or public files;
- no client request contains localhost or a hardcoded deployment hostname;
- the deployment does not rely on mutable local disk or durable in-memory function state;
- mobile deep links and refreshes work on Vercel;
- manifest/icons resolve in production if PWA support exists.

Do not deploy to a production Vercel project unless explicitly authorized. If Vercel CLI/project access is already available and deployment was requested, create a preview deployment first, test it, and report the URL. Never print secret values.

---

# Required implementation order

Follow this order unless repository evidence requires a clearly documented adjustment:

1. Inspect the complete runtime, styles, inputs, progression, saves, APIs, and tests.
2. Ask the combined question batch or apply the documented defaults.
3. Reproduce and document mobile, cursor, transition, tutorial, and deployment issues.
4. Confirm the Vercel/server-only OpenAI boundary and current fallback flow.
5. Establish one interaction-mode and input authority.
6. Add authoritative input reset and listener cleanup.
7. Fix level-completion, focus, cursor, and pointer-lock sequencing.
8. Centralize viewport, DPR, safe-area, and orientation behavior.
9. Implement/repair normalized touch movement, aim, fire, and action controls.
10. Make HUD, menus, overlays, dashboard, settings, skins, and maps responsive.
11. Add/persist applicable mobile settings and accessibility options.
12. Add the versioned tutorial state and migration.
13. Implement the five event-driven tutorial levels using actual mechanics.
14. Separate raw metrics, assistance flags, and adjusted assessment metrics.
15. Connect the post-tutorial summary to real values.
16. Validate post-tutorial adaptive-room/API/fallback behavior.
17. Add safe audio, haptics, performance, and optional PWA behavior.
18. Add automated lifecycle, tutorial, mobile, API, and Vercel tests.
19. Perform rendered QA across the viewport and transition matrices.
20. Run type checking, linting, tests, and the production build.
21. Fix every regression before finishing.

---

# Acceptance criteria

The task is complete only when all applicable items are true:

1. The game is playable with touch on supported phones and tablets.
2. Desktop keyboard/mouse and controller controls still work.
3. The renderer responds correctly to mobile viewport and browser-bar changes.
4. Unsupported orientation pauses safely and restores correctly.
5. Safe areas protect all essential UI and controls.
6. Touch controls support simultaneous movement, aiming, and actions.
7. Touch cancellation, blur, rotation, pause, and transitions cannot leave stuck input.
8. Essential controls are at least 44×44 CSS pixels.
9. Menus and dashboards scroll without horizontal overflow.
10. Gameplay does not accidentally scroll the page.
11. Browser zoom is not globally disabled.
12. The cursor becomes visible when level completion begins.
13. Pointer lock is released on completion and cannot be recaptured by the covered canvas.
14. Continue does not produce an accidental shot or movement.
15. Pointer lock returns only at a legal, intentional gameplay-resume gesture.
16. Pointer-lock errors and unexpected unlocks produce a controlled state.
17. Focus moves correctly for menus and overlays.
18. Event listeners, timers, animation loops, and transitions are not duplicated.
19. New players receive five coherent tutorial/assessment levels.
20. Each tutorial gate completes from demonstrated gameplay actions.
21. Prompts match the active keyboard/mouse, controller, or touch input.
22. Existing players are not trapped in the new tutorial.
23. Skip, replay, interrupted resume, and migration work safely.
24. Tutorial assistance is explicitly tracked and excluded or normalized in skill scoring.
25. The post-tutorial profile summary uses real, traceable values.
26. Normal adaptive gameplay begins after level five.
27. OpenAI calls remain server-only and validated.
28. AI latency/failure never blocks the next room because a local fallback is ready.
29. The client uses relative same-origin API URLs.
30. No secret reaches public code, bundles, logs, or PWA caches.
31. Vercel Functions do not rely on local filesystem writes or durable process memory.
32. PWA caching, if added, excludes adaptive APIs and sensitive data.
33. Mobile quality scaling changes visuals only, not gameplay results.
34. Existing spawn rates, damage, balance, reinforcement rules, and adaptive formulas remain unchanged outside documented tutorial assistance.
35. Existing saves and cosmetic selections remain valid.
36. Automated tests pass.
37. Type checking and linting pass.
38. The production build succeeds.
39. The production/Vercel runtime paths are verified.
40. No known critical or high-severity regression remains.

---

# Final deliverables

At the end, provide:

1. a concise root-cause audit of the original mobile and cursor/transition issues;
2. the actual architecture and runtime flow found;
3. assumptions/defaults used for unanswered questions;
4. all modified files with a short purpose for each;
5. the final interaction-mode, cursor, pointer-lock, and input-reset rules;
6. mobile viewport, safe-area, orientation, and touch-control implementation details;
7. the five tutorial levels and their real completion triggers;
8. tutorial save schema and migration behavior;
9. exact skill metrics collected and how tutorial assistance is handled;
10. Vercel/API/OpenAI security and fallback behavior;
11. PWA/cache behavior, or the reason PWA support was not added;
12. viewports, browsers, input devices, and transitions tested;
13. type-check, lint, automated test, and production-build results with exact commands;
14. preview deployment URL and smoke-test results only if deployment was explicitly authorized;
15. remaining limitations or unverified device-specific behavior;
16. explicit confirmation that normal gameplay balance and formulas were not changed.

Be direct about anything incomplete. Do not report a mocked value, untested code path, or source-only assumption as working production behavior.
