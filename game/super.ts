export const SUPER_CONFIG={
 requiredSuccessfulHits:20 as number,chargePerNormalHit:1,chargePerEliteHit:2,chargePerBossHit:1,maxStoredCharges:1,carryBetweenRooms:true,resetOnDeath:true,
}as const;

export const ENERGY_NOVA_CONFIG={radius:235,damage:72,normalEnemyKnockback:92,eliteKnockbackMultiplier:.35,bossDamageMultiplier:.45,interruptDurationMs:650}as const;

export interface SuperState{currentCharge:number;requiredCharge:number;isReady:boolean;storedCharges:number;maxStoredCharges:number;lastChargeSource?:string;totalSupersUsed:number;readySinceMs:number|null}
export interface SavedSuperState{currentCharge:number;storedCharges:number;totalSupersUsed:number}
export interface SuperRoomTelemetry{successfulHits:number;chargeEarned:number;supersCharged:number;supersActivated:number;targetsHit:number;damageDealt:number;eliteTargetsHit:number;bossDamage:number;heldReadyMs:number;roomsCompletedWhileReady:number}
export interface ValidatedHitEvent{attackId:string;targetId:number;targetType:"normal"|"elite"|"boss";acceptedDamage:number;source:"player-projectile"|"player-super"}
export type SuperActivationResult={success:true;abilityId:"energy-nova"}|{success:false;reason:"not-ready"|"invalid-state"|"player-disabled"|"already-activating"};

export const createSuperState=(saved?:Partial<SavedSuperState>|null):SuperState=>{
 const stored=Math.max(0,Math.min(SUPER_CONFIG.maxStoredCharges,Math.floor(Number(saved?.storedCharges)||0))),charge=stored?0:Math.max(0,Math.min(SUPER_CONFIG.requiredSuccessfulHits-1,Math.floor(Number(saved?.currentCharge)||0)));
 return{currentCharge:charge,requiredCharge:SUPER_CONFIG.requiredSuccessfulHits,isReady:stored>0,storedCharges:stored,maxStoredCharges:SUPER_CONFIG.maxStoredCharges,totalSupersUsed:Math.max(0,Math.floor(Number(saved?.totalSupersUsed)||0)),readySinceMs:null};
};
export const emptySuperTelemetry=():SuperRoomTelemetry=>({successfulHits:0,chargeEarned:0,supersCharged:0,supersActivated:0,targetsHit:0,damageDealt:0,eliteTargetsHit:0,bossDamage:0,heldReadyMs:0,roomsCompletedWhileReady:0});
export const savedSuperState=(state:SuperState):SavedSuperState=>({currentCharge:state.currentCharge,storedCharges:state.storedCharges,totalSupersUsed:state.totalSupersUsed});
export const chargeForHit=(hit:ValidatedHitEvent)=>hit.targetType==="elite"?SUPER_CONFIG.chargePerEliteHit:hit.targetType==="boss"?SUPER_CONFIG.chargePerBossHit:SUPER_CONFIG.chargePerNormalHit;
export const energyNovaDamageFor=(targetType:"normal"|"elite"|"boss")=>ENERGY_NOVA_CONFIG.damage*(targetType==="boss"?ENERGY_NOVA_CONFIG.bossDamageMultiplier:1);
export const isInsideEnergyNova=(player:{x:number;y:number},target:{x:number;y:number;hp:number})=>target.hp>0&&Math.hypot(target.x-player.x,target.y-player.y)<=ENERGY_NOVA_CONFIG.radius;

export function registerSuccessfulPlayerHit(state:SuperState,event:ValidatedHitEvent,dedup:Set<string>,telemetry:SuperRoomTelemetry,nowMs=Date.now()):boolean{
 if(event.source!=="player-projectile"||event.acceptedDamage<=0||state.storedCharges>=state.maxStoredCharges)return false;
 const key=`${event.attackId}:${event.targetId}`;if(dedup.has(key))return false;dedup.add(key);if(dedup.size>500){const first=dedup.values().next().value;if(first)dedup.delete(first)}
 const earned=chargeForHit(event);telemetry.successfulHits++;telemetry.chargeEarned+=earned;state.lastChargeSource=event.targetType;
 if(state.currentCharge+earned>=state.requiredCharge){state.currentCharge=0;state.storedCharges=Math.min(state.maxStoredCharges,state.storedCharges+1);state.isReady=true;state.readySinceMs=nowMs;telemetry.supersCharged++;}else state.currentCharge+=earned;
 return true;
}

export function consumeSuper(state:SuperState,validGameplayState=true,playerAlive=true,alreadyActivating=false,telemetry?:SuperRoomTelemetry,nowMs=Date.now()):SuperActivationResult{
 if(alreadyActivating)return{success:false,reason:"already-activating"};if(!validGameplayState)return{success:false,reason:"invalid-state"};if(!playerAlive)return{success:false,reason:"player-disabled"};if(state.storedCharges<=0)return{success:false,reason:"not-ready"};
 if(state.readySinceMs!==null&&telemetry)telemetry.heldReadyMs+=Math.max(0,nowMs-state.readySinceMs);state.storedCharges--;state.isReady=state.storedCharges>0;state.currentCharge=0;state.totalSupersUsed++;state.readySinceMs=null;if(telemetry)telemetry.supersActivated++;return{success:true,abilityId:"energy-nova"};
}
