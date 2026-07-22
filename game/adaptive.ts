export type AdaptiveTier="assisted"|"relaxed"|"standard"|"challenging"|"expert";
export type DifficultyPreference="relaxed"|"balanced"|"challenging";

export interface EncounterMetrics{
 room:number;durationMs:number;shotsFired:number;shotsHit:number;criticalHits:number;kills:number;
 damageTaken:number;movementMs:number;abilityUses:number;energySpent:number;reactionTimesMs:number[];
 killTimesMs:number[];deaths:number;completed:boolean;
 templateId?:string;layoutId?:string;enemiesSpawned?:number;damageDealt?:number;healthAtStart?:number;healthAtEnd?:number;
 resourcesCollected?:number;expectedKillRate?:number;expectedCompletionTimeMs?:number;
 reinforcementUsed?:boolean;reinforcementTypeId?:string;reinforcementSuccessful?:boolean;
}
export interface SkillDimensions{aim:number;movement:number;tactical:number;resource:number;reaction:number;survival:number;objective:number}
export interface PlayerPerformanceProfile{
 schemaVersion:2;completedTestLevels:boolean;encounters:number;accuracy:number;reactionTimeMs:number;
 averageKillTimeMs:number;damageTakenPerMinute:number;movementEfficiency:number;abilityUsageEfficiency:number;
 consistencyScore:number;overallSkillScore:number;confidenceScore:number;dimensions:SkillDimensions;lastUpdatedAt:string;
}
export interface DifficultyParameters{
 enemyCountMultiplier:number;enemyAggressionMultiplier:number;enemyReactionTimeMultiplier:number;
 projectileSpeedMultiplier:number;eliteSpawnChance:number;resourceDropMultiplier:number;
 encounterComplexity:number;bossPatternComplexity:number;telegraphMultiplier:number;aimAssistMultiplier:number;
}
export interface DirectorState{tier:AdaptiveTier;checkpoints:number;lastAdjustmentCheckpoint:number;stableEvidence:number;lastReason:string;history:{room:number;from:AdaptiveTier;to:AdaptiveTier;reason:string;at:string}[]}
export interface DifficultyRecommendation{recommendedTier:AdaptiveTier;adjustment:number;confidence:number;reasonCodes:string[];recommendedChanges:{encounterComplexityDelta:number;enemyAggressionDelta:number;resourceDropDelta:number}}

export const TIER_ORDER:AdaptiveTier[]=["assisted","relaxed","standard","challenging","expert"];
export const DIFFICULTY:Record<AdaptiveTier,DifficultyParameters>={
 assisted:{enemyCountMultiplier:.72,enemyAggressionMultiplier:.76,enemyReactionTimeMultiplier:1.35,projectileSpeedMultiplier:.8,eliteSpawnChance:.02,resourceDropMultiplier:1.55,encounterComplexity:0,bossPatternComplexity:0,telegraphMultiplier:1.45,aimAssistMultiplier:1.3},
 relaxed:{enemyCountMultiplier:.86,enemyAggressionMultiplier:.88,enemyReactionTimeMultiplier:1.18,projectileSpeedMultiplier:.9,eliteSpawnChance:.06,resourceDropMultiplier:1.25,encounterComplexity:1,bossPatternComplexity:1,telegraphMultiplier:1.2,aimAssistMultiplier:1.15},
 standard:{enemyCountMultiplier:1,enemyAggressionMultiplier:1,enemyReactionTimeMultiplier:1,projectileSpeedMultiplier:1,eliteSpawnChance:.11,resourceDropMultiplier:1,encounterComplexity:2,bossPatternComplexity:2,telegraphMultiplier:1,aimAssistMultiplier:1},
 challenging:{enemyCountMultiplier:1.12,enemyAggressionMultiplier:1.12,enemyReactionTimeMultiplier:.9,projectileSpeedMultiplier:1.08,eliteSpawnChance:.17,resourceDropMultiplier:.9,encounterComplexity:3,bossPatternComplexity:3,telegraphMultiplier:.9,aimAssistMultiplier:.9},
 expert:{enemyCountMultiplier:1.22,enemyAggressionMultiplier:1.22,enemyReactionTimeMultiplier:.82,projectileSpeedMultiplier:1.14,eliteSpawnChance:.23,resourceDropMultiplier:.82,encounterComplexity:4,bossPatternComplexity:4,telegraphMultiplier:.84,aimAssistMultiplier:.82},
};

export const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const normalizeInverse=(value:number,best:number,worst:number)=>clamp((worst-value)/(worst-best));
const avg=(v:number[],fallback=0)=>v.length?v.reduce((a,b)=>a+b,0)/v.length:fallback;
const weightedRecent=(values:number[])=>{if(!values.length)return 0;let sum=0,weight=0;values.forEach((v,i)=>{const w=.7+i/(Math.max(1,values.length-1))*.6;sum+=v*w;weight+=w});return sum/weight};

/**
 * Deterministic metric weights (sum 1): aim .24, survival .20, objective .16,
 * tactical .15, movement .10, reaction .09, resource .06. Caps and rolling
 * averages keep a single exceptional room from dominating the profile.
 */
export function calculateProfile(samples:EncounterMetrics[]):PlayerPerformanceProfile{
 const recent=samples.slice(-8);const totalShots=recent.reduce((n,s)=>n+s.shotsFired,0),hits=recent.reduce((n,s)=>n+s.shotsHit,0);
 const accuracy=clamp(hits/Math.max(1,totalShots));const totalMinutes=Math.max(.25,recent.reduce((n,s)=>n+s.durationMs,0)/60000);
 const damagePerMinute=recent.reduce((n,s)=>n+s.damageTaken,0)/totalMinutes;
 const reaction=avg(recent.flatMap(s=>s.reactionTimesMs),700);const killTime=avg(recent.flatMap(s=>s.killTimesMs),7000);
 const movement=weightedRecent(recent.map(s=>clamp(s.movementMs/Math.max(1,s.durationMs))));
 const ability=weightedRecent(recent.map(s=>clamp(s.abilityUses/Math.max(2,s.durationMs/18000))));
 const completion=recent.filter(s=>s.completed).length/Math.max(1,recent.length);const deathRate=clamp(avg(recent.map(s=>s.deaths)));
 const survival=clamp(normalizeInverse(damagePerMinute,3,90)*(1-deathRate*.65));const reactionScore=normalizeInverse(reaction,170,950);
 const combat=normalizeInverse(killTime,900,9000);const tactical=clamp(combat*.62+completion*.38);
 const objective=clamp(completion*.65+normalizeInverse(avg(recent.map(s=>s.durationMs),90000),25000,150000)*.35);
 const resource=clamp((accuracy*.55)+(1-clamp(recent.reduce((n,s)=>n+s.energySpent,0)/Math.max(1,totalShots*8)))*.2+ability*.25);
 const aim=clamp(accuracy*.88+clamp(recent.reduce((n,s)=>n+s.criticalHits,0)/Math.max(1,hits))*.12);
 const dims={aim,movement,tactical,resource,reaction:reactionScore,survival,objective};
 const roomScores=recent.map(s=>clamp((s.shotsHit/Math.max(1,s.shotsFired))*.4+normalizeInverse(s.damageTaken,0,65)*.3+normalizeInverse(s.durationMs,20000,150000)*.3));
 const deviation=Math.sqrt(avg(roomScores.map(v=>(v-avg(roomScores))**2)));const consistency=clamp(1-deviation*2.2);
 const score=clamp((aim*.24+survival*.20+objective*.16+tactical*.15+movement*.10+reactionScore*.09+resource*.06)*(1-deathRate*.25));
 const volumeConfidence=clamp(recent.length/5)*clamp(totalShots/70);const confidence=clamp(volumeConfidence*(.65+.35*consistency));
 return{schemaVersion:2,completedTestLevels:samples.some(s=>s.room>=4&&s.completed),encounters:samples.length,accuracy,reactionTimeMs:reaction,averageKillTimeMs:killTime,damageTakenPerMinute:damagePerMinute,movementEfficiency:movement,abilityUsageEfficiency:ability,consistencyScore:consistency,overallSkillScore:score,confidenceScore:confidence,dimensions:dims,lastUpdatedAt:new Date().toISOString()};
}

export function preferenceTier(p:DifficultyPreference):AdaptiveTier{return p==="relaxed"?"relaxed":p==="challenging"?"challenging":"standard"}
export function scoreTier(score:number):AdaptiveTier{return score<.28?"assisted":score<.43?"relaxed":score<.64?"standard":score<.81?"challenging":"expert"}
export function createDirector(preference:DifficultyPreference="balanced"):DirectorState{return{tier:preferenceTier(preference),checkpoints:0,lastAdjustmentCheckpoint:-3,stableEvidence:0,lastReason:"Starting preference",history:[]}}

export function evaluateDifficulty(state:DirectorState,profile:PlayerPerformanceProfile,room:number,strength:"low"|"normal"|"high"="normal",enabled=true,gptTier?:AdaptiveTier):DirectorState{
 const next={...state,checkpoints:state.checkpoints+1,history:[...state.history]};if(!enabled)return next;
 const minEvidence=strength==="high"?2:3,cooldown=strength==="high"?2:3;if(profile.encounters<3||profile.confidenceScore<.45||next.checkpoints-state.lastAdjustmentCheckpoint<cooldown)return{...next,lastReason:"Gathering stable performance evidence"};
 let desired=scoreTier(profile.overallSkillScore);if(gptTier&&Math.abs(TIER_ORDER.indexOf(gptTier)-TIER_ORDER.indexOf(desired))<=1)desired=gptTier;
 const current=TIER_ORDER.indexOf(state.tier),target=TIER_ORDER.indexOf(desired);const margin=strength==="low"?.11:strength==="high"?.065:.085;
 const center=[.18,.355,.535,.725,.9][current];const direction=profile.overallSkillScore>center+margin?1:profile.overallSkillScore<center-margin?-1:0;
 if(!direction||target===current)return{...next,stableEvidence:Math.max(0,state.stableEvidence-1),lastReason:"Performance remains inside the current challenge band"};
 const evidence=state.stableEvidence+1;if(evidence<minEvidence)return{...next,stableEvidence:evidence,lastReason:"Trend detected; waiting for repeated evidence"};
 const to=TIER_ORDER[clamp(current+direction,0,TIER_ORDER.length-1)];const reason=direction>0?"Consistently strong room clears":"Repeated pressure indicates more readable pacing";
 return{...next,tier:to,stableEvidence:0,lastAdjustmentCheckpoint:next.checkpoints,lastReason:reason,history:[...next.history,{room,from:state.tier,to,reason,at:new Date().toISOString()}].slice(-12)};
}

export function applyDeadZone(x:number,y:number,inner=.16,outer=.96,curve=1.65):{x:number;y:number;magnitude:number}{const m=Math.hypot(x,y);if(m<=inner)return{x:0,y:0,magnitude:0};const n=clamp((m-inner)/(outer-inner));const curved=n**curve;return{x:x/m*curved,y:y/m*curved,magnitude:curved}}
export function hasLineOfSight(a:{x:number;y:number},b:{x:number;y:number},obstacles:{x:number;y:number;w:number;h:number}[]):boolean{for(let i=1;i<12;i++){const t=i/12,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(obstacles.some(o=>x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h))return false}return true}
export function selectAimTarget(origin:{x:number;y:number},aimAngle:number,mobs:{x:number;y:number;hp:number}[],obstacles:{x:number;y:number;w:number;h:number}[],radius=.36){let best:null|{x:number;y:number;angle:number;score:number}=null;for(const m of mobs){if(m.hp<=0||!hasLineOfSight(origin,m,obstacles))continue;const angle=Math.atan2(m.y-origin.y,m.x-origin.x);const diff=Math.abs(Math.atan2(Math.sin(angle-aimAngle),Math.cos(angle-aimAngle)));const dist=Math.hypot(m.x-origin.x,m.y-origin.y);if(diff>radius||dist>620)continue;const score=diff*2+dist/900;if(!best||score<best.score)best={x:m.x,y:m.y,angle,score}}return best}
export function sanitizeRecommendation(v:unknown):DifficultyRecommendation|null{if(!v||typeof v!=="object")return null;const o=v as Record<string,unknown>,c=o.recommendedChanges as Record<string,unknown>;if(!TIER_ORDER.includes(o.recommendedTier as AdaptiveTier)||!Number.isFinite(o.adjustment)||!Number.isFinite(o.confidence)||!Array.isArray(o.reasonCodes)||!c)return null;return{recommendedTier:o.recommendedTier as AdaptiveTier,adjustment:clamp(Number(o.adjustment),-.1,.1),confidence:clamp(Number(o.confidence),0,1),reasonCodes:o.reasonCodes.filter(x=>typeof x==="string").slice(0,4) as string[],recommendedChanges:{encounterComplexityDelta:Math.round(clamp(Number(c.encounterComplexityDelta)||0,-1,1)),enemyAggressionDelta:clamp(Number(c.enemyAggressionDelta)||0,-.08,.08),resourceDropDelta:clamp(Number(c.resourceDropDelta)||0,-.1,.1)}}}
export function migrateSave(v:unknown){const o=v&&typeof v==="object"?v as Record<string,unknown>:{};const migrated=migrateCustomization(o),rooms=(value:unknown)=>Array.isArray(value)?value.filter(x=>x&&typeof x==="object").slice(-12).map(x=>{const room=x as Record<string,unknown>;return{...room,mapStyleId:typeof room.mapStyleId==="string"?room.mapStyleId:"hollow-vault",mapStyleSource:typeof room.mapStyleSource==="string"?room.mapStyleSource:"selected",styleReasonCodes:Array.isArray(room.styleReasonCodes)?room.styleReasonCodes:["player_style_choice"]}}):[];const usage=o.reinforcementUsage&&typeof o.reinforcementUsage==="object"?o.reinforcementUsage as Record<string,unknown>:{};return{...o,schemaVersion:5,best:typeof o.best==="number"?o.best:1,souls:typeof o.souls==="number"?o.souls:0,settings:typeof o.settings==="object"?o.settings:{},profile:(o.profile as PlayerPerformanceProfile)?.schemaVersion===2?o.profile:null,director:o.director||null,recentMetrics:Array.isArray(o.recentMetrics)?o.recentMetrics.slice(-8):[],roomHistory:rooms(o.roomHistory),preparedRoomQueue:rooms(o.preparedRoomQueue),generationSeed:typeof o.generationSeed==="string"?o.generationSeed:"",customization:migrated.customization,progression:migrated.progression,adaptationRecords:Array.isArray(o.adaptationRecords)?o.adaptationRecords.filter(x=>x&&typeof x==="object").slice(-12):[],reinforcementHistory:Array.isArray(o.reinforcementHistory)?o.reinforcementHistory.filter(x=>x&&typeof x==="object").slice(-12):[],reinforcementUsage:{uses:Number.isFinite(usage.uses)?Math.max(0,Number(usage.uses)):0,successfulUses:Number.isFinite(usage.successfulUses)?Math.max(0,Number(usage.successfulUses)):0,valueTotal:Number.isFinite(usage.valueTotal)?Math.max(0,Number(usage.valueTotal)):0,recentUses:Number.isFinite(usage.recentUses)?Math.max(0,Math.min(3,Number(usage.recentUses))):0,typesUsed:Array.isArray(usage.typesUsed)?usage.typesUsed.filter(x=>typeof x==="string").slice(0,3):[]}}}
import {migrateCustomization} from "./customization";
