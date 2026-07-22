import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {calculateProfile,selectAutoAimTarget,type EncounterMetrics} from "../game/adaptive";
import {cursorVisible,emptyTouchInput,interactionModeFor,pointerLockAllowed,resetMutableInput,resolveTouchAttackRelease} from "../game/input";
import {prepareRoomQueue} from "../game/rooms";
import {createActiveRunSnapshot,sanitizeActiveRun} from "../game/save";
import {completeTutorialLevel,currentTutorialPrompt,migrateTutorial,replayTutorial,skipTutorial,tutorialNeedsRun} from "../game/tutorial";

const metrics=(room:number,overrides:Partial<EncounterMetrics>={}):EncounterMetrics=>({room,durationMs:40_000,shotsFired:20,shotsHit:12,criticalHits:2,kills:6,damageTaken:10,movementMs:15_000,abilityUses:1,energySpent:25,reactionTimesMs:[300],killTimesMs:[1800],deaths:0,completed:true,resourcesCollected:1,reinforcementUsed:true,...overrides});

test("tutorial migrates safely and provides input-specific live prompts",()=>{
 const progress=migrateTutorial({status:"invalid",currentLevel:99,completedLevels:[1,1,8]});
 assert.equal(progress.status,"new");assert.equal(progress.currentLevel,5);assert.deepEqual(progress.completedLevels,[1]);
 const keyboard=currentTutorialPrompt(1,metrics(1,{movementMs:0,shotsFired:0,shotsHit:0}),"keyboard-mouse");
 const touch=currentTutorialPrompt(1,metrics(1,{movementMs:0,shotsFired:0,shotsHit:0}),"touch");
 assert.match(keyboard?.text||"",/WASD/);assert.match(touch?.text||"",/joystick/);
});

test("five cleared assessment rooms create a completed tutorial record",()=>{
 let progress=replayTutorial();for(let room=1;room<=5;room++)progress=completeTutorialLevel(progress,room,metrics(room));
 assert.equal(progress.status,"completed");assert.deepEqual(progress.completedLevels,[1,2,3,4,5]);assert.equal(progress.summaryShown,false);assert.equal(tutorialNeedsRun(progress),false);
});

test("tutorial skip and incomplete demonstrations are explicit",()=>{
 const incomplete=completeTutorialLevel(replayTutorial(),1,metrics(1,{movementMs:0,shotsFired:0,shotsHit:0}));
 assert.ok(incomplete.assistanceFlags.includes("level-1-objective-incomplete"));
 const skipped=skipTutorial(incomplete);assert.equal(skipped.status,"skipped");assert.ok(skipped.assistanceFlags.includes("tutorial-skipped"));
});

test("initial assessment is not complete until room five",()=>{
 assert.equal(calculateProfile([1,2,3,4].map(room=>metrics(room))).completedTestLevels,false);
 assert.equal(calculateProfile([1,2,3,4,5].map(room=>metrics(room))).completedTestLevels,true);
});

test("interaction modes keep pointer lock and input isolated from overlays",()=>{
 assert.equal(interactionModeFor({screen:"game",paused:false,levelComplete:false,gameOver:false}),"gameplay");
 assert.equal(interactionModeFor({screen:"game",paused:false,levelComplete:true,gameOver:false}),"level-complete");
 assert.equal(pointerLockAllowed("gameplay","keyboard-mouse",true),true);
 assert.equal(pointerLockAllowed("paused","keyboard-mouse",true),false);
 assert.equal(cursorVisible("level-complete","keyboard-mouse"),true);
 const mutable={keys:new Set(["KeyW"]),mouse:{down:true},touch:{...emptyTouchInput(),fire:true,aiming:true,fireQueued:true,autoAimQueued:true},reinforcementButtonDown:true};resetMutableInput(mutable);
 assert.equal(mutable.keys.size,0);assert.equal(mutable.mouse.down,false);assert.equal(mutable.touch.fire,false);assert.equal(mutable.touch.aiming,false);assert.equal(mutable.touch.fireQueued,false);assert.equal(mutable.touch.autoAimQueued,false);assert.equal(mutable.reinforcementButtonDown,false);
});

test("mobile attack release supports aimed fire and nearest-target auto aim",()=>{
 const aimed=resolveTouchAttackRelease(.8,.2),tap=resolveTouchAttackRelease(.04,.03);
 assert.equal(aimed.mode,"aimed");assert.ok(Math.abs(Math.hypot(aimed.x,aimed.y)-1)<.0001);assert.equal(tap.mode,"auto-aim");
 const target=selectAutoAimTarget({x:0,y:0},[{x:180,y:0,hp:10},{x:90,y:0,hp:10},{x:50,y:0,hp:0}],[]);
 assert.equal(target?.x,90);
});

test("active runs persist only validated room-boundary state",()=>{
 const rooms=prepareRoomQueue(6,3,"standard",null,[],"snapshot-seed");
 const snapshot=createActiveRunSnapshot({room:6,player:{x:100,y:120,hp:90,maxHp:100,energy:40,maxEnergy:80,speed:250,inv:0,dashCd:0,dashMax:1.2,weapon:0,coins:3},kills:14,currentRoom:rooms[0],preparedRooms:rooms.slice(1),roomHistory:[],generationSeed:"snapshot-seed"});
 assert.equal(sanitizeActiveRun(snapshot)?.room,6);
 assert.equal(sanitizeActiveRun({...snapshot,currentRoom:{...snapshot.currentRoom,presetId:"unknown"}}),null);
});

test("mobile shell includes safe areas, floating controls, and an installable manifest",()=>{
 const page=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8"),controls=readFileSync(new URL("../app/mobile-controls.tsx",import.meta.url),"utf8"),css=readFileSync(new URL("../app/mobile.css",import.meta.url),"utf8"),manifest=readFileSync(new URL("../app/manifest.ts",import.meta.url),"utf8");
 assert.match(page,/MobileControls/);assert.match(page,/onAttackRelease/);assert.match(page,/visualViewport/);assert.match(page,/navigator\.vibrate/);assert.match(controls,/release to fire/);assert.doesNotMatch(controls,/className="touch-action fire"/);assert.match(css,/env\(safe-area-inset-bottom/);assert.match(css,/touch-aim-guide/);assert.match(manifest,/display:\s*"standalone"/);
});
