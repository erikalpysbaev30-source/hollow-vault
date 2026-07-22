import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

import {ACCESSIBLE_UI_COLORS,UI_SCALE_FACTORS,contrastRatio,normalizeUIScale} from "../game/ui-accessibility";

const css=readFileSync(new URL("../app/accessibility.css",import.meta.url),"utf8");
const page=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
const dashboard=readFileSync(new URL("../app/game-ui.tsx",import.meta.url),"utf8");

test("major text and interface color pairs meet WCAG AA contrast",()=>{
 assert.ok(contrastRatio(ACCESSIBLE_UI_COLORS.textPrimary,ACCESSIBLE_UI_COLORS.background)>=4.5);
 assert.ok(contrastRatio(ACCESSIBLE_UI_COLORS.textSecondary,ACCESSIBLE_UI_COLORS.panel)>=4.5);
 assert.ok(contrastRatio(ACCESSIBLE_UI_COLORS.textMuted,ACCESSIBLE_UI_COLORS.panel)>=4.5);
 assert.ok(contrastRatio(ACCESSIBLE_UI_COLORS.accent,ACCESSIBLE_UI_COLORS.background)>=4.5);
 assert.ok(contrastRatio(ACCESSIBLE_UI_COLORS.focus,ACCESSIBLE_UI_COLORS.background)>=3);
 assert.ok(contrastRatio(ACCESSIBLE_UI_COLORS.warning,ACCESSIBLE_UI_COLORS.panel)>=4.5);
});

test("central typography scale protects readable body, secondary, and control sizes",()=>{
 for(const token of ["--font-size-xs:calc(.75rem","--font-size-sm:calc(.875rem","--font-size-base:calc(1rem","--font-size-md:calc(1.125rem","--font-size-lg:calc(1.375rem","--font-size-xl:calc(1.75rem","--font-size-2xl:calc(2.25rem"] )assert.match(css,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
 assert.match(css,/\.setting-row b\{font-size:var\(--font-size-base\)/);
 assert.match(css,/\.setting-row small\{font:var\(--font-size-sm\)/);
 assert.match(css,/\.director-title p\{font-size:var\(--font-size-base\)/);
 assert.match(css,/\.weapon-dock b\{font-size:var\(--font-size-base\)/);
});

test("UI scale values are bounded, persisted through settings, and safely normalized",()=>{
 assert.deepEqual(UI_SCALE_FACTORS,{small:.9,default:1,large:1.15,"extra-large":1.3});
 assert.equal(normalizeUIScale("large"),"large");
 assert.equal(normalizeUIScale("extra-large"),"extra-large");
 assert.equal(normalizeUIScale("oversized"),"default");
 assert.match(page,/uiScale:normalizeUIScale/);
 assert.match(page,/label="UI scale"/);
 assert.match(page,/ui-scale-\$\{settings\.uiScale\}/);
});

test("high contrast, focus, selected, disabled, and colorblind-safe states have non-color cues",()=>{
 assert.match(css,/outline:3px solid var\(--color-focus\)/);
 assert.match(css,/min-height:var\(--control-min\)/);
 assert.match(css,/content:"✓ SELECTED"/);
 assert.match(css,/text-decoration:line-through/);
 assert.match(page,/aria-pressed=\{value\}/);
 assert.match(dashboard,/"↑"/);
 assert.match(dashboard,/"↓"/);
 assert.match(dashboard,/= Unchanged/);
 assert.match(css,/\.high-contrast\{/);
});

test("responsive rules protect mobile, large scale, HUD overlays, and long strings",()=>{
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/\.menu-links\{display:grid;grid-template-columns:1fr\}/);
 assert.match(css,/\.difficulty-timeline ol\{grid-template-columns:1fr\}/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/\.ui-scale-extra-large \.settings-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
 assert.match(css,/\.game-hud\{[^}]*background:#080b13e8/);
 assert.match(css,/\.room-toast\{[^}]*background:#070913dc/);
 assert.match(page,/navigator\.getGamepads/);
});
