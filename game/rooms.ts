import {clamp,type AdaptiveTier,type PlayerPerformanceProfile} from "./adaptive";
import {createAdaptiveMemory,getEnemyBehaviorProfile,maybeStartExperiment,predictRoomPerformance,selectBehaviorProfile,selectPacingRole,selectRoomModuleIds,validateRoomModules,type AdaptiveMemory,type RoomPerformancePrediction} from "./adaptive-model";
import {getMapStyle,isMapStyleCompatible} from "./customization";
import type {PlayerSpawnZone} from "./spawn";

export type EnemyKind="slime"|"cultist"|"bat"|"golem"|"boss";
export type PacingRole="warmup"|"standard"|"pressure"|"recovery"|"challenge"|"elite"|"pre_boss"|"boss"|"reward";
export type SpawnPattern="front"|"spread"|"flank"|"encircle";
export type RoomSource="local"|"gpt"|"fallback";
export type Rect={x:number;y:number;w:number;h:number};
export type SpawnZone=Rect&{id:string};
export type PointZone={id:string;x:number;y:number;r:number};

export interface RoomTemplate{
 id:string;name:string;category:"combat"|"survival"|"objective"|"elite"|"boss"|"recovery";
 layoutId:string;obstacles:Rect[];spawnZones:SpawnZone[];hazardZones:PointZone[];playerSpawnZones:PlayerSpawnZone[];
 minDifficultyScore:number;maxDifficultyScore:number;estimatedDurationSeconds:number;maximumEntityCount:number;tags:string[];
}
export interface EnemyGroupDefinition{ id:string;kinds:EnemyKind[];baseCount:number;difficultyCost:number;tags:string[];maximumPerRoom:number }
export interface RoomPreset{
 id:string;templateId:string;difficultyTier:AdaptiveTier;difficultyScore:number;enemyGroupIds:string[];
 waveConfigurationId:"single"|"double"|"ambush"|"boss";hazardSetId:"none"|"slow_field"|"rift_pulse";
 pickupSetId:"generous"|"standard"|"scarce";objectiveId:"eliminate";pacingRole:PacingRole;
 expectedKillRateRange:[number,number];expectedCompletionTimeRange:[number,number];
}
export interface PreparedRoom{
 schemaVersion:1;roomSequenceIndex:number;source:RoomSource;presetId:string;templateId:string;layoutId:string;
 targetDifficultyScore:number;pacingRole:PacingRole;spawnPattern:SpawnPattern;
 waves:{waveIndex:number;delaySeconds:number;groups:{enemyGroupId:string;spawnZoneId:string;countMultiplier:number;aggressionModifier:number;reactionModifier:number}[]}[];
 hazardSetId:RoomPreset["hazardSetId"];pickupSetId:RoomPreset["pickupSetId"];objectiveId:"eliminate";
 predictedKillRate:number;predictedCompletionTimeSeconds:number;predictedDamageTakenRatio:number;
 adaptationReasonCodes:string[];confidence:number;
 behaviorProfileId:string;roomModuleIds:string[];performancePrediction:RoomPerformancePrediction;experimentId?:string;
 mapStyleId:string;mapStyleSource:"selected"|"random"|"local_ai"|"openai"|"fallback";styleReasonCodes:string[];
 plannerRecommendation?:RoomPlannerSelection;
}
export interface RoomPlannerSelection{
 roomSequenceIndex:number;presetId:string;spawnPattern:SpawnPattern;countMultiplier:number;aggressionModifier:number;
 reactionModifier:number;predictedKillRate:number;predictedCompletionTimeSeconds:number;predictedDamageTakenRatio:number;
 adaptationReasonCodes:string[];confidence:number;mapStyleId:string;
 pacingRole?:PacingRole;behaviorProfileId?:string;roomModuleIds?:string[];predictedDeathProbability?:number;predictedReinforcementUsageProbability?:number;experimentId?:string;
}

export const ENEMY_BASE_STATS:Record<EnemyKind,{health:number;radius:number;speed:number}>={
 slime:{health:42,radius:17,speed:80},cultist:{health:58,radius:18,speed:70},bat:{health:34,radius:15,speed:115},
 golem:{health:125,radius:28,speed:48},boss:{health:760,radius:50,speed:56},
};
export const SPAWN_BALANCE={roomHealthGrowth:.15,eliteHealthMultiplier:1.8,eliteRadiusMultiplier:1.25,waveDelaySeconds:1.1} as const;
export const SAFE_ADAPTATION_LIMITS={countMultiplier:[.75,1.25],aggressionModifier:[-.1,.1],reactionModifier:[-.1,.1]} as const;

export const DIFFICULTY_BUDGET:Record<AdaptiveTier,{min:number;max:number}>={
 assisted:{min:10,max:22},relaxed:{min:18,max:34},standard:{min:28,max:48},challenging:{min:42,max:65},expert:{min:58,max:85},
};

const zones=(...ids:string[]):SpawnZone[]=>ids.map((id,i)=>({id,x:[140,455,805,935,525,180][i%6],y:[125,125,125,385,385,385][i%6],w:[230,260,230,190,235,210][i%6],h:[145,140,145,175,170,175][i%6]}));
const playerSpawnZones=(templateId:string):PlayerSpawnZone[]=>templateId==="split_chamber"?[
 {id:"south-entrance-west",x:474,y:548,w:82,h:48,entranceDirection:"south",priority:100},
 {id:"south-entrance-east",x:724,y:548,w:82,h:48,entranceDirection:"south",priority:90},
 {id:"west-backup",x:185,y:520,w:80,h:55,entranceDirection:"west",priority:40},
]:[
 {id:"south-entrance",x:599,y:548,w:82,h:48,entranceDirection:"south",priority:100},
 {id:"south-west-backup",x:454,y:548,w:82,h:48,entranceDirection:"south",priority:60},
 {id:"south-east-backup",x:744,y:548,w:82,h:48,entranceDirection:"south",priority:50},
];
const layout=(id:string,name:string,category:RoomTemplate["category"],difficulty:[number,number],duration:number,max:number,tags:string[],obstacles:Rect[],spawnIds=["north_west","north_mid","north_east","east","south_mid","west"],hazardZones:PointZone[]=[]):RoomTemplate=>({id,name,category,layoutId:id,obstacles,spawnZones:zones(...spawnIds),hazardZones,playerSpawnZones:playerSpawnZones(id),minDifficultyScore:difficulty[0],maxDifficultyScore:difficulty[1],estimatedDurationSeconds:duration,maximumEntityCount:max,tags});

export const ROOM_TEMPLATES:RoomTemplate[]=[
 layout("calibration_gallery","Quiet Gallery","combat",[10,34],42,8,["calibration","open","clear_lanes"],[{x:360,y:245,w:85,h:70},{x:835,y:245,w:85,h:70}]),
 layout("calibration_crossroads","Archive Crossroads","combat",[14,38],50,10,["calibration","balanced","mixed_range"],[{x:585,y:205,w:110,h:90},{x:585,y:425,w:110,h:90},{x:340,y:315,w:100,h:70},{x:840,y:315,w:100,h:70}]),
 layout("calibration_wells","Sealed Wells","survival",[18,42],56,11,["calibration","resource","cover"],[{x:260,y:205,w:110,h:80},{x:910,y:205,w:110,h:80},{x:455,y:425,w:120,h:75},{x:705,y:425,w:120,h:75}],undefined,[{id:"well_a",x:640,y:350,r:62}]),
 layout("calibration_orbit","Orbiting Reliquary","objective",[22,46],62,12,["calibration","movement","flank"],[{x:515,y:270,w:70,h:70},{x:695,y:270,w:70,h:70},{x:515,y:420,w:70,h:70},{x:695,y:420,w:70,h:70}],undefined,[{id:"orbit_a",x:640,y:370,r:72}]),
 layout("calibration_trial","Rift Trial","objective",[26,50],70,14,["calibration","assessment","mixed_range"],[{x:315,y:210,w:100,h:75},{x:865,y:210,w:100,h:75},{x:455,y:425,w:105,h:70},{x:720,y:425,w:105,h:70},{x:590,y:285,w:100,h:80}],undefined,[{id:"trial_a",x:640,y:365,r:58}]),
 layout("twin_gates","Twin Gates","combat",[18,52],52,12,["lanes","readable"],[{x:360,y:170,w:95,h:220},{x:825,y:330,w:95,h:220}]),
 layout("broken_ring","Broken Ring","combat",[24,58],58,14,["balanced","cover"],[{x:455,y:210,w:150,h:55},{x:675,y:210,w:150,h:55},{x:455,y:455,w:150,h:55},{x:675,y:455,w:150,h:55},{x:455,y:265,w:55,h:190},{x:770,y:265,w:55,h:190}],undefined,[{id:"ring_core",x:640,y:360,r:64}]),
 layout("long_lanes","Long Lanes","combat",[26,62],60,14,["ranged","clear_lanes"],[{x:300,y:230,w:260,h:58},{x:720,y:230,w:260,h:58},{x:300,y:445,w:260,h:58},{x:720,y:445,w:260,h:58}]),
 layout("staggered_columns","Staggered Columns","combat",[28,66],63,15,["flank","cover"],[{x:280,y:190,w:76,h:110},{x:480,y:380,w:76,h:110},{x:725,y:190,w:76,h:110},{x:925,y:380,w:76,h:110},{x:595,y:295,w:90,h:125}]),
 layout("split_chamber","Split Chamber","combat",[30,68],65,16,["lanes","pressure"],[{x:585,y:135,w:110,h:180},{x:585,y:405,w:110,h:180},{x:360,y:330,w:130,h:55},{x:790,y:330,w:130,h:55}]),
 layout("hourglass_vault","Hourglass Vault","combat",[34,72],66,16,["tight","pressure"],[{x:300,y:180,w:220,h:68},{x:760,y:180,w:220,h:68},{x:300,y:472,w:220,h:68},{x:760,y:472,w:220,h:68},{x:530,y:300,w:220,h:120}]),
 layout("serpentine_stack","Serpentine Stack","survival",[36,76],72,17,["movement","hazard"],[{x:235,y:190,w:310,h:60},{x:500,y:330,w:310,h:60},{x:735,y:470,w:310,h:60}],undefined,[{id:"rift_a",x:380,y:390,r:52},{id:"rift_b",x:900,y:265,r:52}]),
 layout("open_confluence","Open Confluence","recovery",[10,38],44,9,["open","recovery","clear_lanes"],[{x:560,y:305,w:70,h:70},{x:650,y:345,w:70,h:70}],undefined,[]),
 layout("idol_fortress","Idol Fortress","elite",[44,82],75,18,["elite","cover","flank"],[{x:260,y:175,w:135,h:90},{x:885,y:175,w:135,h:90},{x:260,y:455,w:135,h:90},{x:885,y:455,w:135,h:90},{x:520,y:265,w:240,h:190}],undefined,[{id:"fortress_a",x:440,y:360,r:55},{id:"fortress_b",x:840,y:360,r:55}]),
 layout("warden_ring","Warden Ring","boss",[28,85],95,8,["boss","open","arena"],[{x:300,y:190,w:95,h:95},{x:885,y:190,w:95,h:95},{x:300,y:440,w:95,h:95},{x:885,y:440,w:95,h:95}],undefined,[{id:"boss_core",x:640,y:360,r:82}]),
];

export const ENEMY_GROUPS:EnemyGroupDefinition[]=[
 {id:"moss_pack",kinds:["slime"],baseCount:5,difficultyCost:10,tags:["melee","readable"],maximumPerRoom:10},
 {id:"gloom_flock",kinds:["bat","bat","slime"],baseCount:5,difficultyCost:15,tags:["fast","flank"],maximumPerRoom:9},
 {id:"rift_firing_line",kinds:["cultist","cultist","slime"],baseCount:5,difficultyCost:18,tags:["ranged","pressure"],maximumPerRoom:8},
 {id:"mixed_vanguard",kinds:["slime","cultist","bat"],baseCount:6,difficultyCost:22,tags:["mixed","tactical"],maximumPerRoom:10},
 {id:"idol_guard",kinds:["golem","slime","cultist"],baseCount:5,difficultyCost:28,tags:["tank","area_control"],maximumPerRoom:8},
 {id:"elite_hunt",kinds:["golem","cultist","bat"],baseCount:6,difficultyCost:36,tags:["elite","mixed","flank"],maximumPerRoom:9},
 {id:"warden",kinds:["boss"],baseCount:1,difficultyCost:42,tags:["boss"],maximumPerRoom:1},
];

export const ROOM_PRESETS:RoomPreset[]=[
 {id:"test_aim",templateId:"calibration_gallery",difficultyTier:"assisted",difficultyScore:14,enemyGroupIds:["moss_pack"],waveConfigurationId:"single",hazardSetId:"none",pickupSetId:"generous",objectiveId:"eliminate",pacingRole:"warmup",expectedKillRateRange:[.75,1],expectedCompletionTimeRange:[30,55]},
 {id:"test_priority",templateId:"calibration_crossroads",difficultyTier:"relaxed",difficultyScore:22,enemyGroupIds:["gloom_flock","rift_firing_line"],waveConfigurationId:"double",hazardSetId:"none",pickupSetId:"standard",objectiveId:"eliminate",pacingRole:"standard",expectedKillRateRange:[.7,1],expectedCompletionTimeRange:[38,68]},
 {id:"test_resource",templateId:"calibration_wells",difficultyTier:"standard",difficultyScore:30,enemyGroupIds:["rift_firing_line","moss_pack"],waveConfigurationId:"double",hazardSetId:"slow_field",pickupSetId:"standard",objectiveId:"eliminate",pacingRole:"pressure",expectedKillRateRange:[.65,1],expectedCompletionTimeRange:[45,78]},
 {id:"test_movement",templateId:"calibration_orbit",difficultyTier:"standard",difficultyScore:36,enemyGroupIds:["mixed_vanguard"],waveConfigurationId:"ambush",hazardSetId:"rift_pulse",pickupSetId:"standard",objectiveId:"eliminate",pacingRole:"challenge",expectedKillRateRange:[.65,1],expectedCompletionTimeRange:[48,82]},
 {id:"test_mastery",templateId:"calibration_trial",difficultyTier:"standard",difficultyScore:40,enemyGroupIds:["mixed_vanguard","idol_guard"],waveConfigurationId:"double",hazardSetId:"slow_field",pickupSetId:"standard",objectiveId:"eliminate",pacingRole:"challenge",expectedKillRateRange:[.62,1],expectedCompletionTimeRange:[55,95]},
 {id:"gallery_relief",templateId:"open_confluence",difficultyTier:"assisted",difficultyScore:16,enemyGroupIds:["moss_pack"],waveConfigurationId:"single",hazardSetId:"none",pickupSetId:"generous",objectiveId:"eliminate",pacingRole:"recovery",expectedKillRateRange:[.82,1],expectedCompletionTimeRange:[25,52]},
 {id:"gate_patrol",templateId:"twin_gates",difficultyTier:"relaxed",difficultyScore:25,enemyGroupIds:["moss_pack","rift_firing_line"],waveConfigurationId:"double",hazardSetId:"none",pickupSetId:"standard",objectiveId:"eliminate",pacingRole:"standard",expectedKillRateRange:[.72,1],expectedCompletionTimeRange:[38,68]},
 {id:"ring_skirmish",templateId:"broken_ring",difficultyTier:"standard",difficultyScore:34,enemyGroupIds:["mixed_vanguard"],waveConfigurationId:"double",hazardSetId:"none",pickupSetId:"standard",objectiveId:"eliminate",pacingRole:"standard",expectedKillRateRange:[.68,.98],expectedCompletionTimeRange:[44,76]},
 {id:"lane_crossfire",templateId:"long_lanes",difficultyTier:"standard",difficultyScore:39,enemyGroupIds:["rift_firing_line","moss_pack"],waveConfigurationId:"double",hazardSetId:"none",pickupSetId:"standard",objectiveId:"eliminate",pacingRole:"pressure",expectedKillRateRange:[.64,.95],expectedCompletionTimeRange:[50,82]},
 {id:"column_ambush",templateId:"staggered_columns",difficultyTier:"standard",difficultyScore:44,enemyGroupIds:["gloom_flock","mixed_vanguard"],waveConfigurationId:"ambush",hazardSetId:"none",pickupSetId:"standard",objectiveId:"eliminate",pacingRole:"challenge",expectedKillRateRange:[.62,.94],expectedCompletionTimeRange:[52,86]},
 {id:"split_assault",templateId:"split_chamber",difficultyTier:"challenging",difficultyScore:52,enemyGroupIds:["mixed_vanguard","idol_guard"],waveConfigurationId:"double",hazardSetId:"none",pickupSetId:"scarce",objectiveId:"eliminate",pacingRole:"pressure",expectedKillRateRange:[.6,.92],expectedCompletionTimeRange:[58,92]},
 {id:"hourglass_flank",templateId:"hourglass_vault",difficultyTier:"challenging",difficultyScore:58,enemyGroupIds:["gloom_flock","rift_firing_line","mixed_vanguard"],waveConfigurationId:"ambush",hazardSetId:"slow_field",pickupSetId:"scarce",objectiveId:"eliminate",pacingRole:"challenge",expectedKillRateRange:[.58,.9],expectedCompletionTimeRange:[62,98]},
 {id:"serpent_pressure",templateId:"serpentine_stack",difficultyTier:"expert",difficultyScore:66,enemyGroupIds:["mixed_vanguard","idol_guard"],waveConfigurationId:"ambush",hazardSetId:"rift_pulse",pickupSetId:"scarce",objectiveId:"eliminate",pacingRole:"pressure",expectedKillRateRange:[.55,.88],expectedCompletionTimeRange:[68,108]},
 {id:"fortress_elite",templateId:"idol_fortress",difficultyTier:"expert",difficultyScore:76,enemyGroupIds:["elite_hunt","idol_guard"],waveConfigurationId:"double",hazardSetId:"slow_field",pickupSetId:"standard",objectiveId:"eliminate",pacingRole:"elite",expectedKillRateRange:[.52,.86],expectedCompletionTimeRange:[72,115]},
 {id:"warden_approach",templateId:"warden_ring",difficultyTier:"standard",difficultyScore:42,enemyGroupIds:["warden"],waveConfigurationId:"boss",hazardSetId:"none",pickupSetId:"standard",objectiveId:"eliminate",pacingRole:"boss",expectedKillRateRange:[.8,1],expectedCompletionTimeRange:[60,115]},
 {id:"warden_rift",templateId:"warden_ring",difficultyTier:"challenging",difficultyScore:57,enemyGroupIds:["warden"],waveConfigurationId:"boss",hazardSetId:"rift_pulse",pickupSetId:"scarce",objectiveId:"eliminate",pacingRole:"boss",expectedKillRateRange:[.72,1],expectedCompletionTimeRange:[58,105]},
];

const templateById=new Map(ROOM_TEMPLATES.map(x=>[x.id,x]));
const presetById=new Map(ROOM_PRESETS.map(x=>[x.id,x]));
const groupById=new Map(ENEMY_GROUPS.map(x=>[x.id,x]));
export const getRoomTemplate=(id:string)=>templateById.get(id);
export const getRoomPreset=(id:string)=>presetById.get(id);
export const getEnemyGroup=(id:string)=>groupById.get(id);

const hash=(value:string)=>{let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
export const seededRandom=(seed:string)=>{let a=hash(seed);return()=>{a|=0;a=a+0x6d2b79f5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
const midpoint=(r:[number,number])=>(r[0]+r[1])/2;
const tierIndex=(tier:AdaptiveTier)=>["assisted","relaxed","standard","challenging","expert"].indexOf(tier);

export function candidatePresetIds(room:number,tier:AdaptiveTier,profile:PlayerPerformanceProfile|null,history:PreparedRoom[]):string[]{
 if(room<=5)return [["test_aim"],["test_priority"],["test_resource"],["test_movement"],["test_mastery"]][room-1];
 const boss=room>5&&room%5===0;if(boss)return tierIndex(tier)>=3?["warden_rift","warden_approach"]:["warden_approach"];
 const budget=DIFFICULTY_BUDGET[tier],recent=history.slice(-3),failed=profile?profile.dimensions.survival<.3:false;
 let candidates=ROOM_PRESETS.filter(p=>p.pacingRole!=="boss"&&!p.id.startsWith("test_")&&p.difficultyScore>=budget.min-8&&p.difficultyScore<=budget.max+8);
 if(failed)candidates=candidates.filter(p=>p.pacingRole==="recovery"||p.difficultyScore<=budget.min+8||p.pacingRole==="standard");
 if(profile?.dimensions.movement!==undefined&&profile.dimensions.movement<.3)candidates=candidates.filter(p=>!getRoomTemplate(p.templateId)?.tags.includes("flank")&&p.hazardSetId!=="rift_pulse");
 if(profile?.dimensions.aim!==undefined&&profile.dimensions.aim<.3)candidates=candidates.filter(p=>!p.enemyGroupIds.includes("gloom_flock"));
 const noRepeat=candidates.filter(p=>!recent.some(r=>r.templateId===p.templateId));return (noRepeat.length?noRepeat:candidates.length?candidates:ROOM_PRESETS.filter(p=>p.id==="gallery_relief")).map(p=>p.id);
}

function waveGroups(preset:RoomPreset,template:RoomTemplate,pattern:SpawnPattern,countMultiplier:number,aggression:number,reaction:number){
 const order:Record<SpawnPattern,string[]>={front:["north_mid","north_west","north_east","east","west","south_mid"],spread:["north_west","north_east","east","west","north_mid","south_mid"],flank:["east","west","north_east","north_west","south_mid","north_mid"],encircle:["north_west","east","south_mid","west","north_east","north_mid"]};
 const available=new Set(template.spawnZones.map(z=>z.id)),zoneOrder=order[pattern].filter(id=>available.has(id));
 const make=(ids:string[],waveIndex:number)=>({waveIndex,delaySeconds:waveIndex?SPAWN_BALANCE.waveDelaySeconds:0,groups:ids.map((enemyGroupId,i)=>({enemyGroupId,spawnZoneId:zoneOrder[(i+waveIndex)%Math.max(1,zoneOrder.length)]||template.spawnZones[i%template.spawnZones.length].id,countMultiplier,aggressionModifier:aggression,reactionModifier:reaction}))});
 if(preset.waveConfigurationId==="single"||preset.waveConfigurationId==="boss")return[make(preset.enemyGroupIds,0)];
 if(preset.waveConfigurationId==="double")return[make([preset.enemyGroupIds[0]],0),make(preset.enemyGroupIds.slice(1).length?preset.enemyGroupIds.slice(1):preset.enemyGroupIds,1)];
 return[make(preset.enemyGroupIds.filter((_,i)=>i%2===0),0),make(preset.enemyGroupIds.filter((_,i)=>i%2===1).length?preset.enemyGroupIds.filter((_,i)=>i%2===1):preset.enemyGroupIds,1)];
}

export function materializeRoom(room:number,presetId:string,tier:AdaptiveTier,source:RoomSource="local",selection?:Partial<RoomPlannerSelection>):PreparedRoom{
 const preset=presetById.get(presetId)||ROOM_PRESETS[0],template=templateById.get(preset.templateId)!;const budget=DIFFICULTY_BUDGET[tier];
 const countMultiplier=clamp(Number(selection?.countMultiplier??1),...SAFE_ADAPTATION_LIMITS.countMultiplier),aggression=clamp(Number(selection?.aggressionModifier??0),...SAFE_ADAPTATION_LIMITS.aggressionModifier),reaction=clamp(Number(selection?.reactionModifier??0),...SAFE_ADAPTATION_LIMITS.reactionModifier);
 const pattern:SpawnPattern=["front","spread","flank","encircle"].includes(selection?.spawnPattern||"")?selection!.spawnPattern!:template.tags.includes("flank")?"flank":"spread";
 const requestedStyle=typeof selection?.mapStyleId==="string"?selection.mapStyleId:"hollow-vault",mapStyleId=isMapStyleCompatible(requestedStyle,template.id)?requestedStyle:"hollow-vault";
 const predictedKillRate=clamp(Number(selection?.predictedKillRate??midpoint(preset.expectedKillRateRange)),0,1),predictedCompletionTimeSeconds=clamp(Number(selection?.predictedCompletionTimeSeconds??midpoint(preset.expectedCompletionTimeRange)),20,150),predictedDamageTakenRatio=clamp(Number(selection?.predictedDamageTakenRatio??(.22+tierIndex(tier)*.08)),.05,.8),behaviorProfileId=getEnemyBehaviorProfile(selection?.behaviorProfileId||"")?.id||"balanced",roomModuleIds=selection?.roomModuleIds&&validateRoomModules(selection.roomModuleIds)?selection.roomModuleIds:["entrance-south",template.tags.includes("open")?"arena-open":"arena-cover",template.tags.includes("flank")?"flank-single":"flank-none","pickup-standard","reinforcement-safe","exit-south"],performancePrediction:RoomPerformancePrediction={predictedCompletionTimeSeconds,predictedKillRate,predictedDamageTakenRatio,predictedDeathProbability:clamp(Number(selection?.predictedDeathProbability??predictedDamageTakenRatio*.65),0,.85),predictedReinforcementUsageProbability:clamp(Number(selection?.predictedReinforcementUsageProbability??predictedDamageTakenRatio*.8),0,.9),confidence:clamp(Number(selection?.confidence??.7),0,1)};
 return{schemaVersion:1,roomSequenceIndex:room,source,presetId:preset.id,templateId:template.id,layoutId:template.layoutId,targetDifficultyScore:clamp(preset.difficultyScore,budget.min-8,budget.max+8),pacingRole:selection?.pacingRole||preset.pacingRole,spawnPattern:pattern,waves:waveGroups(preset,template,pattern,countMultiplier,aggression,reaction),hazardSetId:preset.hazardSetId,pickupSetId:preset.pickupSetId,objectiveId:preset.objectiveId,predictedKillRate,predictedCompletionTimeSeconds,predictedDamageTakenRatio,behaviorProfileId,roomModuleIds,performancePrediction,experimentId:selection?.experimentId,adaptationReasonCodes:(selection?.adaptationReasonCodes||["local_fallback"]).filter(x=>typeof x==="string").slice(0,4),confidence:performancePrediction.confidence,mapStyleId,mapStyleSource:source==="gpt"?"openai":"selected",styleReasonCodes:source==="gpt"?["openai_style_plan"]:["player_style_choice"],plannerRecommendation:source==="gpt"&&selection?selection as RoomPlannerSelection:undefined};
}

export function applyRoomMapStyle(plan:PreparedRoom,style:{id:string;source:PreparedRoom["mapStyleSource"];reasonCodes:string[]}):PreparedRoom{return isMapStyleCompatible(style.id,plan.templateId)?{...plan,mapStyleId:style.id,mapStyleSource:style.source,styleReasonCodes:style.reasonCodes.slice(0,4)}:{...plan,mapStyleId:"hollow-vault",mapStyleSource:"fallback",styleReasonCodes:["style_incompatible"]}}

export function prepareRoomQueue(startRoom:number,count:number,tier:AdaptiveTier,profile:PlayerPerformanceProfile|null,history:PreparedRoom[],seed:string,memory?:AdaptiveMemory|null):PreparedRoom[]{
 const adaptive=memory||createAdaptiveMemory(profile,[]),out:PreparedRoom[]=[];
 for(let room=startRoom;room<startRoom+count;room++){
  const boss=room>5&&room%5===0,role=selectPacingRole({...adaptive,pacingHistory:[...adaptive.pacingHistory,...history.map(x=>x.pacingRole),...out.map(x=>x.pacingRole)]},room,boss),all=candidatePresetIds(room,tier,profile,[...history,...out]);
  const roleCandidates=all.filter(id=>{const p=getRoomPreset(id);if(!p)return false;if(role==="recovery")return p.pacingRole==="recovery"||p.pacingRole==="standard";if(role==="pressure"||role==="challenge")return["pressure","challenge","elite"].includes(p.pacingRole);if(role==="pre_boss")return p.pickupSetId!=="scarce";return true}),candidates=roleCandidates.length?roleCandidates:all;
  const signature=`${Math.round(adaptive.player.aimSkill*10)}:${Math.round(adaptive.player.movementSkill*10)}:${Math.round(adaptive.player.survivalSkill*10)}:${adaptive.habits.repeatedHabits.map(x=>x.habitId).sort().join("+")}`,rng=seededRandom(`${seed}:${room}:${tier}:${signature}`),presetId=candidates[Math.floor(rng()*candidates.length)]||"gallery_relief",preset=getRoomPreset(presetId)!,template=getRoomTemplate(preset.templateId)!,experiment=role==="recovery"||boss?null:maybeStartExperiment(adaptive,room,rng()),behavior=selectBehaviorProfile(adaptive,role,rng());
  let moduleIds=selectRoomModuleIds(template.tags,adaptive,role,preset.hazardSetId!=="none");if(experiment){moduleIds=[...new Set([...moduleIds.filter(id=>id!=="pickup-standard"),"cover-readable"])]}
  const prediction=predictRoomPerformance(adaptive,{difficultyScore:preset.difficultyScore,estimatedDurationSeconds:template.estimatedDurationSeconds,enemyPressure:preset.enemyGroupIds.length/3,hazardPressure:preset.hazardSetId==="none"?0:1,resourceAvailability:preset.pickupSetId==="generous"?1:preset.pickupSetId==="scarce"?0:.5,templateId:template.id}),countMultiplier=1,aggressionModifier=clamp((behavior.aggression-1)*adaptive.player.confidence.preferences,-.1,.1),reactionModifier=clamp((behavior.reactionTimeMultiplier-1)*adaptive.player.confidence.overall,-.1,.1),reasonCodes=[experiment?"pacing_experiment":`pacing_${role}`,`behavior_${behavior.id}`,adaptive.player.confidence.overall<.45?"low_confidence_neutral":"profile_targeted"];
  out.push(materializeRoom(room,presetId,tier,"local",{pacingRole:role==="experiment"?"standard":role as PacingRole,behaviorProfileId:behavior.id,roomModuleIds:moduleIds,experimentId:experiment?.id,countMultiplier,aggressionModifier,reactionModifier,predictedKillRate:prediction.predictedKillRate,predictedCompletionTimeSeconds:prediction.predictedCompletionTimeSeconds,predictedDamageTakenRatio:prediction.predictedDamageTakenRatio,predictedDeathProbability:prediction.predictedDeathProbability,predictedReinforcementUsageProbability:prediction.predictedReinforcementUsageProbability,confidence:prediction.confidence,adaptationReasonCodes:reasonCodes,mapStyleId:"hollow-vault"}));
 }
 return out;
}

export function validatePreparedRoom(plan:PreparedRoom):boolean{
 const preset=presetById.get(plan.presetId),template=templateById.get(plan.templateId);if(!preset||!template||preset.templateId!==template.id||plan.layoutId!==template.layoutId||!getMapStyle(plan.mapStyleId)||!isMapStyleCompatible(plan.mapStyleId,template.id)||!getEnemyBehaviorProfile(plan.behaviorProfileId||"balanced")||!validateRoomModules(plan.roomModuleIds||[]))return false;
 const bossIndex=plan.roomSequenceIndex>5&&plan.roomSequenceIndex%5===0;if(bossIndex&&preset.pacingRole!=="boss"||!bossIndex&&preset.pacingRole==="boss")return false;
 const zones=new Set(template.spawnZones.map(z=>z.id));let entities=0;for(const wave of plan.waves){if(wave.groups.length>3)return false;for(const group of wave.groups){const def=groupById.get(group.enemyGroupId);if(!def||!zones.has(group.spawnZoneId))return false;entities+=Math.ceil(def.baseCount*group.countMultiplier)}}return entities<=template.maximumEntityCount&&plan.targetDifficultyScore>=0&&plan.targetDifficultyScore<=93;
}

export function sanitizePlannerSelections(value:unknown,allowedByRoom:Record<number,string[]>,allowedStylesByRoom:Record<number,string[]>={}):RoomPlannerSelection[]|null{
 if(!value||typeof value!=="object"||!Array.isArray((value as {plans?:unknown}).plans))return null;const plans=(value as {plans:unknown[]}).plans;if(plans.length<1||plans.length>4)return null;const out:RoomPlannerSelection[]=[];
 for(const raw of plans){if(!raw||typeof raw!=="object")return null;const o=raw as Record<string,unknown>,room=Number(o.roomSequenceIndex),preset=String(o.presetId||""),mapStyleId=String(o.mapStyleId||"hollow-vault"),behaviorProfileId=String(o.behaviorProfileId||"balanced"),roomModuleIds=Array.isArray(o.roomModuleIds)?o.roomModuleIds.filter(x=>typeof x==="string") as string[]:["entrance-south","arena-cover","flank-none","exit-south"],pacingRole=String(o.pacingRole||getRoomPreset(preset)?.pacingRole||"standard") as PacingRole,numbers=[o.countMultiplier,o.aggressionModifier,o.reactionModifier,o.predictedKillRate,o.predictedCompletionTimeSeconds,o.predictedDamageTakenRatio,o.confidence];const allowedStyles=allowedStylesByRoom[room]||["hollow-vault"];if(!Number.isInteger(room)||!allowedByRoom[room]?.includes(preset)||!allowedStyles.includes(mapStyleId)||!isMapStyleCompatible(mapStyleId,getRoomPreset(preset)?.templateId||"")||!["front","spread","flank","encircle"].includes(String(o.spawnPattern))||!["warmup","standard","pressure","recovery","challenge","elite","pre_boss","boss","reward"].includes(pacingRole)||!getEnemyBehaviorProfile(behaviorProfileId)||!validateRoomModules(roomModuleIds)||numbers.some(x=>typeof x!=="number"||!Number.isFinite(x)))return null;if(!Array.isArray(o.adaptationReasonCodes))return null;
  out.push({roomSequenceIndex:room,presetId:preset,spawnPattern:o.spawnPattern as SpawnPattern,countMultiplier:clamp(Number(o.countMultiplier),...SAFE_ADAPTATION_LIMITS.countMultiplier),aggressionModifier:clamp(Number(o.aggressionModifier),...SAFE_ADAPTATION_LIMITS.aggressionModifier),reactionModifier:clamp(Number(o.reactionModifier),...SAFE_ADAPTATION_LIMITS.reactionModifier),predictedKillRate:clamp(Number(o.predictedKillRate),0,1),predictedCompletionTimeSeconds:clamp(Number(o.predictedCompletionTimeSeconds),20,150),predictedDamageTakenRatio:clamp(Number(o.predictedDamageTakenRatio),.05,.8),predictedDeathProbability:clamp(Number(o.predictedDeathProbability??Number(o.predictedDamageTakenRatio)*.65),0,.85),predictedReinforcementUsageProbability:clamp(Number(o.predictedReinforcementUsageProbability??Number(o.predictedDamageTakenRatio)*.8),0,.9),pacingRole,behaviorProfileId,roomModuleIds,adaptationReasonCodes:o.adaptationReasonCodes.filter(x=>typeof x==="string").slice(0,4) as string[],confidence:clamp(Number(o.confidence),0,1),mapStyleId});
 }return out;
}

export function applyPlannerSelections(queue:PreparedRoom[],selections:RoomPlannerSelection[],tier:AdaptiveTier):PreparedRoom[]{
 const byRoom=new Map(selections.filter(s=>s.confidence>=.5).map(s=>[s.roomSequenceIndex,s]));return queue.map(current=>{const s=byRoom.get(current.roomSequenceIndex);if(!s)return current;const candidate=materializeRoom(current.roomSequenceIndex,s.presetId,tier,"gpt",{...s,pacingRole:s.pacingRole||current.pacingRole,behaviorProfileId:s.behaviorProfileId||current.behaviorProfileId,roomModuleIds:s.roomModuleIds||current.roomModuleIds,predictedDeathProbability:s.predictedDeathProbability??current.performancePrediction?.predictedDeathProbability,predictedReinforcementUsageProbability:s.predictedReinforcementUsageProbability??current.performancePrediction?.predictedReinforcementUsageProbability});return validatePreparedRoom(candidate)?candidate:current});
}

export function summarizeRoomMetric(metric:{durationMs:number;kills:number;shotsFired:number;shotsHit:number;damageTaken:number;deaths:number;completed:boolean;enemiesSpawned?:number;templateId?:string}){return{templateId:metric.templateId||"unknown",completionTimeRatio:clamp(metric.durationMs/90000,0,2),killRate:clamp(metric.kills/Math.max(1,metric.enemiesSpawned||metric.kills),0,1),accuracy:clamp(metric.shotsHit/Math.max(1,metric.shotsFired),0,1),damageTakenRatio:clamp(metric.damageTaken/120,0,2),deaths:metric.deaths,completed:metric.completed}}
