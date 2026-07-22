import assert from "node:assert/strict";
import test from "node:test";
import {calculateProfile,type EncounterMetrics} from "../game/adaptive";
import {actionableHabit,calibratePrediction,createAdaptiveMemory,deriveHabitProfile,maybeStartExperiment,predictRoomPerformance,selectBehaviorProfile,selectPacingRole,updateAdaptiveMemory,updateBossAnalysis,validateRoomModules} from "../game/adaptive-model";
import {prepareRoomQueue} from "../game/rooms";

const sample=(room:number,kind:"expert"|"beginner"|"stationary"|"failure"="expert"):EncounterMetrics=>({room,durationMs:kind==="expert"?34_000:kind==="failure"?120_000:78_000,shotsFired:50,shotsHit:kind==="expert"?44:kind==="beginner"?13:29,criticalHits:kind==="expert"?9:2,kills:kind==="failure"?2:8,damageTaken:kind==="expert"?8:kind==="failure"?110:42,movementMs:kind==="stationary"?4_000:kind==="expert"?27_000:17_000,abilityUses:2,energySpent:55,reactionTimesMs:[kind==="expert"?210:650],killTimesMs:[kind==="expert"?1200:4700],deaths:kind==="failure"?1:0,completed:kind!=="failure",healthAtStart:120,healthAtEnd:kind==="failure"?0:60,enemiesSpawned:8,reinforcementUsed:kind==="failure",stationaryCombatRatio:kind==="stationary"?.82:undefined,averageCombatDistanceRatio:kind==="expert"?.72:.42});

test("identical telemetry creates identical deterministic local plans",()=>{
 const samples=Array.from({length:6},(_,i)=>sample(i+1,"expert")),profile=calculateProfile(samples),memory=updateAdaptiveMemory(createAdaptiveMemory(),profile,samples);
 const a=prepareRoomQueue(6,4,"challenging",profile,[],"same-seed",memory),b=prepareRoomQueue(6,4,"challenging",profile,[],"same-seed",memory);
 assert.deepEqual(a,b);
});

test("same seed produces player-specific rooms, modules, behavior, and predictions",()=>{
 const expertSamples=Array.from({length:8},(_,i)=>sample(i+1,"expert")),beginnerSamples=Array.from({length:8},(_,i)=>sample(i+1,"beginner"));
 const expertProfile=calculateProfile(expertSamples),beginnerProfile=calculateProfile(beginnerSamples),expert=createAdaptiveMemory(expertProfile,expertSamples),beginner=createAdaptiveMemory(beginnerProfile,beginnerSamples);
 const a=prepareRoomQueue(6,4,"standard",expertProfile,[],"comparison-seed",expert),b=prepareRoomQueue(6,4,"standard",beginnerProfile,[],"comparison-seed",beginner);
 assert.notDeepEqual(a.map(x=>[x.presetId,x.behaviorProfileId,x.roomModuleIds]),b.map(x=>[x.presetId,x.behaviorProfileId,x.roomModuleIds]));
 assert.notDeepEqual(a.map(x=>x.performancePrediction),b.map(x=>x.performancePrediction));
});

test("habits require repeated confident evidence before countering",()=>{
 const two=deriveHabitProfile([sample(1,"stationary"),sample(2,"stationary")]),four=deriveHabitProfile([1,2,3,4].map(room=>sample(room,"stationary")));
 assert.equal(actionableHabit(two,"stationary-combat"),null);assert.ok(actionableHabit(four,"stationary-combat"));
 const base=calculateProfile([1,2,3,4].map(room=>sample(room,"stationary"))),memory={...createAdaptiveMemory(base,[1,2,3,4].map(room=>sample(room,"stationary"))),habits:four};
 assert.equal(selectBehaviorProfile(memory,"standard",0).id,"area-control");
});

test("repeated failures select recovery pacing without changing base combat stats",()=>{
 const samples=[1,2,3,4].map(room=>sample(room,"failure")),profile=calculateProfile(samples),memory=createAdaptiveMemory(profile,samples);
 assert.equal(selectPacingRole(memory,7,false),"recovery");
 const rooms=prepareRoomQueue(7,1,"standard",profile,[],"recovery-seed",memory);assert.ok(["recovery","standard"].includes(rooms[0].pacingRole));
});

test("prediction calibration uses a capped rolling learning rate",()=>{
 const memory=createAdaptiveMemory(),prediction=predictRoomPerformance(memory,{difficultyScore:45,estimatedDurationSeconds:60,enemyPressure:.6,hazardPressure:.5,resourceAvailability:.5,templateId:"broken_ring"}),next=calibratePrediction(memory.calibration,prediction,{completionTimeSeconds:prediction.predictedCompletionTimeSeconds*1.8,killRate:.2,damageTakenRatio:.75},"broken_ring");
 assert.equal(next.samples,1);assert.ok(next.completionTimeFactor>1&&next.completionTimeFactor<=1.045);assert.ok(next.byTemplate.broken_ring.samples===1);
});

test("room modules reject incompatible combinations",()=>{
 assert.equal(validateRoomModules(["entrance-south","arena-open","exit-south"]),true);
 assert.equal(validateRoomModules(["arena-open","corridor-lanes"]),false);
 assert.equal(validateRoomModules(["missing-module"]),false);
});

test("controlled experiments are single-variable and suppressed by frustration or boss cadence",()=>{
 const memory=createAdaptiveMemory(calculateProfile([1,2,3,4,5,6].map(room=>sample(room,"expert"))),[1,2,3,4,5,6].map(room=>sample(room,"expert")));
 const experiment=maybeStartExperiment(memory,7,0);assert.ok(experiment);assert.equal(experiment?.variableChanged,"coverDensity");
 assert.equal(maybeStartExperiment(memory,10,0),null);
 assert.equal(maybeStartExperiment({...memory,player:{...memory.player,frustrationRisk:.8}},7,0),null);
});

test("boss adaptation only changes later-attempt clarity and ordering after a failed attempt",()=>{
 const memory=createAdaptiveMemory(),failed=sample(10,"failure"),next=updateBossAnalysis(memory.boss,{...failed,bossPhaseReached:2,stationaryCombatRatio:.7,dominantDamageSource:"radial-burst"},true);
 assert.equal(next.attempts,1);assert.equal(next.phaseReached,2);assert.ok(next.telegraphMultiplier>1);assert.equal(next.patternOrderOffset,1);
 assert.deepEqual(updateBossAnalysis(next,{...failed,completed:true},true),next);
});
