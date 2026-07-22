import {clamp,type AdaptiveTier,type PlayerPerformanceProfile} from "./adaptive";

export type ReinforcementTypeId="shield-pulse"|"med-pulse"|"stasis-field";
export interface ReinforcementDefinition{id:ReinforcementTypeId;name:string;description:string;icon:string;baseEnergyCost:number;baseCooldownSeconds:number;durationSeconds:number}
export interface ReinforcementUsageSummary{uses:number;successfulUses:number;valueTotal:number;recentUses:number;typesUsed:ReinforcementTypeId[]}
export interface ReinforcementDecision{available:boolean;reinforcementTypeId:ReinforcementTypeId|null;strengthTier:1|2|3;resourceCost:number;cooldownSeconds:number;durationSeconds:number;reasonCodes:string[];source:"local"|"openai";confidence:number}
export interface ReinforcementContext{healthRatio:number;resourceRatio:number;remainingEnemyCount:number;roomDifficultyScore:number;bossPhase:boolean;recentDeaths:number;profile:PlayerPerformanceProfile|null;usage:ReinforcementUsageSummary;tier:AdaptiveTier;adaptationStrength:"low"|"normal"|"high"}

export const REINFORCEMENTS:ReinforcementDefinition[]=[
 {id:"shield-pulse",name:"Aegis Pulse",description:"Immediate damage immunity. No direct damage.",icon:"◇",baseEnergyCost:24,baseCooldownSeconds:34,durationSeconds:2.4},
 {id:"med-pulse",name:"Mender Pulse",description:"Restores health after sustained pressure.",icon:"♥",baseEnergyCost:30,baseCooldownSeconds:42,durationSeconds:0},
 {id:"stasis-field",name:"Stasis Field",description:"Briefly slows enemies near the hunter.",icon:"◎",baseEnergyCost:27,baseCooldownSeconds:38,durationSeconds:5},
];
const byId=new Map(REINFORCEMENTS.map(x=>[x.id,x]));
export const isReinforcementTypeId=(id:string):id is ReinforcementTypeId=>REINFORCEMENTS.some(item=>item.id===id);
export const getReinforcement=(id:string|null|undefined)=>id&&isReinforcementTypeId(id)?byId.get(id):undefined;
export const emptyReinforcementUsage=():ReinforcementUsageSummary=>({uses:0,successfulUses:0,valueTotal:0,recentUses:0,typesUsed:[]});
export const reinforcementEfficiency=(usage:ReinforcementUsageSummary)=>usage.uses?clamp((usage.successfulUses/usage.uses)*.65+(usage.valueTotal/usage.uses)*.35):0;

export function decideLocalReinforcement(c:ReinforcementContext):ReinforcementDecision{
 const survival=c.profile?.dimensions.survival??.5,aim=c.profile?.dimensions.aim??.5,pressure=clamp(c.remainingEnemyCount/10*.55+c.roomDifficultyScore/85*.45),frustration=clamp((1-survival)*.45+clamp(c.recentDeaths/3)*.35+(1-c.healthRatio)*.2);let id:ReinforcementTypeId="shield-pulse",reasons:string[]=[];
 if(c.healthRatio<.42){id="med-pulse";reasons=["low_health","sustained_damage"]}else if(c.recentDeaths>0||survival<.38){id="shield-pulse";reasons=[c.recentDeaths>0?"repeated_deaths":"low_survival","recovery_required"]}else if(aim<.42||pressure>.62){id="stasis-field";reasons=[aim<.42?"weak_aim":"high_enemy_pressure","crowd_control"]}else reasons=["balanced_support"];
 if(c.bossPhase&&id==="med-pulse")reasons.push("boss_preparation");const def=byId.get(id)!;const overuse=clamp(c.usage.recentUses/3),strengthBoost=c.adaptationStrength==="high"?.12:c.adaptationStrength==="low"?-.1:0;const strength=Math.round(clamp(1+Math.max(pressure,frustration)*2+strengthBoost,1,3)) as 1|2|3;const costMultiplier=1+overuse*.2-frustration*.08;const cooldownMultiplier=1+overuse*.25;
 if(overuse>.6)reasons.push("reinforcement_overuse");else if(c.usage.uses===0)reasons.push("reinforcement_underuse");
 return{available:true,reinforcementTypeId:id,strengthTier:strength,resourceCost:Math.round(def.baseEnergyCost*costMultiplier),cooldownSeconds:Math.round(def.baseCooldownSeconds*cooldownMultiplier),durationSeconds:def.durationSeconds,reasonCodes:reasons.slice(0,4),source:"local",confidence:clamp(.62+Math.max(pressure,frustration)*.25)};
}

export function sanitizeReinforcementRecommendation(value:unknown,allowedIds:string[],local?:ReinforcementDecision):ReinforcementDecision|null{
 void local;if(!value||typeof value!=="object")return null;const o=value as Record<string,unknown>,id=String(o.recommendedTypeId||"");if(!allowedIds.includes(id)||!isReinforcementTypeId(id)||!Number.isFinite(o.strengthTier)||!Number.isFinite(o.resourceCostMultiplier)||!Number.isFinite(o.cooldownMultiplier)||!Number.isFinite(o.confidence)||!Array.isArray(o.reasonCodes))return null;const def=byId.get(id)!;return{available:true,reinforcementTypeId:id,strengthTier:Math.round(clamp(Number(o.strengthTier),1,3)) as 1|2|3,resourceCost:Math.round(def.baseEnergyCost*clamp(Number(o.resourceCostMultiplier),.9,1.2)),cooldownSeconds:Math.round(def.baseCooldownSeconds*clamp(Number(o.cooldownMultiplier),.9,1.25)),durationSeconds:def.durationSeconds,reasonCodes:o.reasonCodes.filter(x=>typeof x==="string").slice(0,4) as string[],source:"openai",confidence:clamp(Number(o.confidence),0,1)};
}

export function canActivateReinforcement(input:{decision:ReinforcementDecision|null;charges:number;cooldownRemaining:number;energy:number}):{ok:boolean;reason:"ready"|"unavailable"|"no_charges"|"cooldown"|"energy"}{if(!input.decision||!input.decision.available||!input.decision.reinforcementTypeId)return{ok:false,reason:"unavailable"};if(input.charges<=0)return{ok:false,reason:"no_charges"};if(input.cooldownRemaining>0)return{ok:false,reason:"cooldown"};if(input.energy<input.decision.resourceCost)return{ok:false,reason:"energy"};return{ok:true,reason:"ready"}}

export const REINFORCEMENT_REASON_TEXT:Record<string,string>={low_health:"Your health is below the current safety band.",sustained_damage:"Recent damage indicates sustained pressure.",repeated_deaths:"Recent failed encounters triggered recovery support.",low_survival:"Your survival trend favors immediate protection.",recovery_required:"The director is preserving a fair recovery window.",weak_aim:"A slowing field can create clearer shots.",high_enemy_pressure:"Several active threats are compressing your movement space.",crowd_control:"Control support adds breathing room without dealing damage for you.",boss_preparation:"The room is entering a high-pressure boss phase.",reinforcement_overuse:"Recent frequent use slightly increased cost and cooldown.",reinforcement_underuse:"A clear support option is being surfaced so you can choose whether to use it.",balanced_support:"A defensive option is available without changing room balance."};
