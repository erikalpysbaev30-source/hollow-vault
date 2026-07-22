import {z} from "zod";
import {getReinforcement} from "@/game/reinforcements";

const ratio=z.number().finite().min(0).max(1);
export const reinforcementRequestSchema=z.strictObject({
 sessionId:z.string().regex(/^[a-zA-Z0-9-]{12,64}$/),
 playerProfile:z.strictObject({overallSkill:ratio,aimSkill:ratio,survivalSkill:ratio,reinforcementEfficiency:ratio}),
 currentRoom:z.strictObject({roomIndex:z.number().int().min(1).max(9999),roomDifficultyScore:z.number().finite().min(0).max(93),remainingEnemyCount:z.number().int().min(0).max(40),currentHealthRatio:ratio,currentResourceRatio:ratio,bossPhase:z.boolean()}),
 recentUsage:z.strictObject({reinforcementsUsed:z.number().int().min(0).max(100),successfulUses:z.number().int().min(0).max(100),averageValueScore:ratio}),
 allowedReinforcementTypeIds:z.array(z.string().min(1).max(60)).min(1).max(3),
});
export const reinforcementResponseSchema=z.strictObject({recommendedTypeId:z.string().min(1).max(60),strengthTier:z.number().int().min(1).max(3),resourceCostMultiplier:z.number().finite().min(.9).max(1.2),cooldownMultiplier:z.number().finite().min(.9).max(1.25),reasonCodes:z.array(z.string().min(1).max(40)).max(4),confidence:ratio});
export type ReinforcementRequest=z.infer<typeof reinforcementRequestSchema>;
export const allowedReinforcementIdsKnown=(request:ReinforcementRequest)=>new Set(request.allowedReinforcementTypeIds).size===request.allowedReinforcementTypeIds.length&&request.allowedReinforcementTypeIds.every(id=>Boolean(getReinforcement(id)));
export const REINFORCEMENT_JSON_SCHEMA={type:"object",additionalProperties:false,required:["recommendedTypeId","strengthTier","resourceCostMultiplier","cooldownMultiplier","reasonCodes","confidence"],properties:{recommendedTypeId:{type:"string",maxLength:60},strengthTier:{type:"integer",minimum:1,maximum:3},resourceCostMultiplier:{type:"number",minimum:.9,maximum:1.2},cooldownMultiplier:{type:"number",minimum:.9,maximum:1.25},reasonCodes:{type:"array",maxItems:4,items:{type:"string",maxLength:40}},confidence:{type:"number",minimum:0,maximum:1}}} as const;
