export type UnlockRequirementType="rooms_completed"|"boss_defeated"|"accuracy_threshold"|"reinforcement_mastery"|"adaptive_tier_reached"|"no_reinforcement_rooms";
export type MapStyleMode="selected"|"random"|"ai";
export type MapStyleQuality="auto"|"low"|"medium"|"high";

export interface UnlockRequirement{id:string;type:UnlockRequirementType;targetValue:number;targetId?:string;description:string}
export interface ProgressionState{roomsCompleted:number;bossesDefeated:number;bestAccuracy:number;roomsWithoutReinforcement:number;reinforcementTypesUsed:string[];highestAdaptiveTier:string}
export interface PlayerSkinDefinition{id:string;name:string;description:string;rarity:"standard"|"rare"|"epic"|"legendary";unlockRequirementId?:string;colors:{head:string;body:string;legs:string;outline:string;glow:string};portrait:string;trail:string}
export interface MapStyleDefinition{id:string;name:string;description:string;performanceTier:"low"|"medium"|"high";compatibleRoomTemplateIds:string[];unlockRequirementId?:string;palette:{void:string;floorA:string;floorB:string;grid:string;detail:string;wall:string;wallInset:string;accent:string;vignette:string}}
export interface CustomizationSettings{selectedSkinId:string;selectedMapStyleId:string;mapStyleMode:MapStyleMode;mapStyleQuality:MapStyleQuality;unlockedSkinIds:string[];unlockedMapStyleIds:string[];reinforcementSettings:{aiSuggestionsEnabled:boolean;adaptationStrength:"low"|"normal"|"high"};dashboardSettings:{detailLevel:"simple"|"detailed";notifications:"on"|"minimal"|"off";showPostRoomSummary:boolean;lastViewedRecordId:string};recentMapStyleIds:string[]}

const ALL_ROOM_TEMPLATES=["calibration_gallery","calibration_crossroads","calibration_wells","calibration_orbit","calibration_trial","twin_gates","broken_ring","long_lanes","staggered_columns","split_chamber","hourglass_vault","serpentine_stack","open_confluence","idol_fortress","warden_ring"];

export const UNLOCK_REQUIREMENTS:UnlockRequirement[]=[
 {id:"rooms-3",type:"rooms_completed",targetValue:3,description:"Clear 3 chambers"},
 {id:"rooms-5",type:"rooms_completed",targetValue:5,description:"Clear 5 chambers"},
 {id:"boss-1",type:"boss_defeated",targetValue:1,description:"Defeat the Warden"},
 {id:"accuracy-75",type:"accuracy_threshold",targetValue:.75,description:"Finish a chamber with 75% accuracy"},
 {id:"reinforcement-3",type:"reinforcement_mastery",targetValue:3,description:"Use all 3 reinforcement types"},
 {id:"challenging-tier",type:"adaptive_tier_reached",targetValue:3,description:"Reach Challenging adaptive tier"},
 {id:"no-reinforcement-3",type:"no_reinforcement_rooms",targetValue:3,description:"Clear 3 chambers without reinforcement"},
];

export const PLAYER_SKINS:PlayerSkinDefinition[]=[
 {id:"vault-hunter",name:"Vault Hunter",description:"The original teal field rig.",rarity:"standard",colors:{head:"#e0b58a",body:"#2f8d92",legs:"#163d50",outline:"#14232e",glow:"#7ad5d4"},portrait:"HV",trail:"#7be4e8"},
 {id:"ember-sentinel",name:"Ember Sentinel",description:"A furnace-red ward suit recovered below the Twin Gates.",rarity:"rare",unlockRequirementId:"rooms-3",colors:{head:"#e4b089",body:"#a64649",legs:"#54243c",outline:"#271522",glow:"#ff9b62"},portrait:"ES",trail:"#ff865f"},
 {id:"moon-wraith",name:"Moon Wraith",description:"A pale rift mantle earned by breaking a Warden seal.",rarity:"epic",unlockRequirementId:"boss-1",colors:{head:"#d8d0d5",body:"#6655a2",legs:"#28264e",outline:"#17142c",glow:"#c89bff"},portrait:"MW",trail:"#ad78ff"},
 {id:"gilded-exile",name:"Gilded Exile",description:"Precision-forged armor for disciplined hunters.",rarity:"legendary",unlockRequirementId:"accuracy-75",colors:{head:"#ecc395",body:"#947238",legs:"#40341d",outline:"#211b13",glow:"#ffd76a"},portrait:"GE",trail:"#ffd05a"},
 {id:"signal-ghost",name:"Signal Ghost",description:"A quiet cyan shell for self-reliant descents.",rarity:"epic",unlockRequirementId:"no-reinforcement-3",colors:{head:"#c5e8e1",body:"#277283",legs:"#183044",outline:"#0b1824",glow:"#63edff"},portrait:"SG",trail:"#66e7ff"},
];

export const MAP_STYLES:MapStyleDefinition[]=[
 {id:"hollow-vault",name:"Hollow Vault",description:"Cold stone, muted brass, and the original rift lighting.",performanceTier:"low",compatibleRoomTemplateIds:ALL_ROOM_TEMPLATES,palette:{void:"#0c0c16",floorA:"#25253a",floorB:"#202033",grid:"#0e0e1b99",detail:"#34344b",wall:"#3b354a",wallInset:"#262438",accent:"#d84d5d",vignette:"#03030ccc"}},
 {id:"ember-catacomb",name:"Ember Catacomb",description:"Warm iron floors under a restrained volcanic glow.",performanceTier:"low",unlockRequirementId:"rooms-5",compatibleRoomTemplateIds:ALL_ROOM_TEMPLATES,palette:{void:"#140b0d",floorA:"#3c2427",floorB:"#302025",grid:"#170b0ddd",detail:"#6a3930",wall:"#5a3534",wallInset:"#332023",accent:"#ff8b50",vignette:"#090204dd"}},
 {id:"frost-archive",name:"Frost Archive",description:"Blue-white archive tiles and glacial rift light.",performanceTier:"medium",unlockRequirementId:"boss-1",compatibleRoomTemplateIds:ALL_ROOM_TEMPLATES,palette:{void:"#08121a",floorA:"#253b4b",floorB:"#1d3241",grid:"#09151dcc",detail:"#426779",wall:"#405d6b",wallInset:"#263d4a",accent:"#7ae9ff",vignette:"#02080ddd"}},
 {id:"overgrown-rift",name:"Overgrown Rift",description:"A sealed research wing reclaimed by luminous moss.",performanceTier:"medium",unlockRequirementId:"challenging-tier",compatibleRoomTemplateIds:ALL_ROOM_TEMPLATES,palette:{void:"#08130f",floorA:"#263d32",floorB:"#1e332a",grid:"#07140ddd",detail:"#477451",wall:"#3f5947",wallInset:"#24372c",accent:"#7fe76e",vignette:"#020a06dd"}},
 {id:"training-grid",name:"Calibration Grid",description:"A minimal high-clarity simulation for calibration chambers.",performanceTier:"low",unlockRequirementId:"rooms-3",compatibleRoomTemplateIds:["calibration_gallery","calibration_crossroads","calibration_wells","calibration_orbit","calibration_trial","open_confluence"],palette:{void:"#071113",floorA:"#163238",floorB:"#122a30",grid:"#4ad6d633",detail:"#55c9c5",wall:"#315258",wallInset:"#1d3b41",accent:"#ffd05e",vignette:"#02090bdd"}},
];

export const DEFAULT_PROGRESSION:ProgressionState={roomsCompleted:0,bossesDefeated:0,bestAccuracy:0,roomsWithoutReinforcement:0,reinforcementTypesUsed:[],highestAdaptiveTier:"standard"};
export const DEFAULT_CUSTOMIZATION:CustomizationSettings={selectedSkinId:"vault-hunter",selectedMapStyleId:"hollow-vault",mapStyleMode:"selected",mapStyleQuality:"auto",unlockedSkinIds:["vault-hunter"],unlockedMapStyleIds:["hollow-vault"],reinforcementSettings:{aiSuggestionsEnabled:true,adaptationStrength:"normal"},dashboardSettings:{detailLevel:"detailed",notifications:"on",showPostRoomSummary:true,lastViewedRecordId:""},recentMapStyleIds:[]};

const skinById=new Map(PLAYER_SKINS.map(s=>[s.id,s])),styleById=new Map(MAP_STYLES.map(s=>[s.id,s])),requirementById=new Map(UNLOCK_REQUIREMENTS.map(r=>[r.id,r]));
export const getPlayerSkin=(id:string)=>skinById.get(id)||skinById.get("vault-hunter")!;
export const getMapStyle=(id:string)=>styleById.get(id)||styleById.get("hollow-vault")!;
export const isKnownPlayerSkin=(id:string)=>skinById.has(id);
export const isKnownMapStyle=(id:string)=>styleById.has(id);
export const isMapStyleCompatible=(styleId:string,templateId:string)=>Boolean(styleById.get(styleId)?.compatibleRoomTemplateIds.includes(templateId));

function tierIndex(tier:string){return["assisted","relaxed","standard","challenging","expert"].indexOf(tier)}
export function requirementMet(id:string|undefined,p:ProgressionState):boolean{
 if(!id)return true;const r=requirementById.get(id);if(!r)return false;
 if(r.type==="rooms_completed")return p.roomsCompleted>=r.targetValue;
 if(r.type==="boss_defeated")return p.bossesDefeated>=r.targetValue;
 if(r.type==="accuracy_threshold")return p.bestAccuracy>=r.targetValue;
 if(r.type==="reinforcement_mastery")return p.reinforcementTypesUsed.length>=r.targetValue;
 if(r.type==="adaptive_tier_reached")return tierIndex(p.highestAdaptiveTier)>=r.targetValue;
 return p.roomsWithoutReinforcement>=r.targetValue;
}
export function evaluateUnlocks(p:ProgressionState){return{skinIds:PLAYER_SKINS.filter(x=>requirementMet(x.unlockRequirementId,p)).map(x=>x.id),mapStyleIds:MAP_STYLES.filter(x=>requirementMet(x.unlockRequirementId,p)).map(x=>x.id)}}
export function mergeUnlocks(settings:CustomizationSettings,p:ProgressionState):CustomizationSettings{const u=evaluateUnlocks(p);return{...settings,unlockedSkinIds:[...new Set([...settings.unlockedSkinIds,...u.skinIds])],unlockedMapStyleIds:[...new Set([...settings.unlockedMapStyleIds,...u.mapStyleIds])]}}
export function equipSkin(settings:CustomizationSettings,id:string):CustomizationSettings{return skinById.has(id)&&settings.unlockedSkinIds.includes(id)?{...settings,selectedSkinId:id}:settings}
export function selectMapStyle(settings:CustomizationSettings,id:string):CustomizationSettings{return styleById.has(id)&&settings.unlockedMapStyleIds.includes(id)?{...settings,selectedMapStyleId:id}:settings}

const hash=(value:string)=>{let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
export function chooseMapStyle(input:{mode:MapStyleMode;selectedId:string;unlockedIds:string[];recentIds:string[];templateId:string;pacingRole:string;seed:string;openAIStyleId?:string}):{id:string;source:"selected"|"random"|"local_ai"|"openai"|"fallback";reasonCodes:string[]}{
 const allowed=input.unlockedIds.filter(id=>styleById.has(id)&&isMapStyleCompatible(id,input.templateId));const pool=allowed.length?allowed:["hollow-vault"];
 if(input.mode==="selected")return pool.includes(input.selectedId)?{id:input.selectedId,source:"selected",reasonCodes:["player_style_choice"]}:{id:"hollow-vault",source:"fallback",reasonCodes:["style_incompatible"]};
 if(input.mode==="ai"&&input.openAIStyleId&&pool.includes(input.openAIStyleId))return{id:input.openAIStyleId,source:"openai",reasonCodes:["openai_style_plan"]};
 const fresh=pool.filter(id=>!input.recentIds.slice(-2).includes(id)),choices=fresh.length?fresh:pool;
 if(input.mode==="ai"){const roleChoice=input.pacingRole==="recovery"?choices.find(id=>id==="overgrown-rift"||id==="frost-archive"):input.pacingRole==="boss"?choices.find(id=>id==="ember-catacomb"):undefined;if(roleChoice)return{id:roleChoice,source:"local_ai",reasonCodes:["room_pacing_match"]}}
 const id=choices[hash(`${input.seed}:${input.templateId}:${input.pacingRole}`)%choices.length]||"hollow-vault";return{id,source:input.mode==="random"?"random":"local_ai",reasonCodes:[fresh.length?"avoid_style_repetition":"style_rotation"]};
}

export function migrateCustomization(value:unknown):{customization:CustomizationSettings;progression:ProgressionState}{
 const root=value&&typeof value==="object"?value as Record<string,unknown>:{};const raw=root.customization&&typeof root.customization==="object"?root.customization as Record<string,unknown>:{};const progress=root.progression&&typeof root.progression==="object"?root.progression as Record<string,unknown>:{};
 const unlockedSkins=Array.isArray(raw.unlockedSkinIds)?raw.unlockedSkinIds.filter(x=>typeof x==="string"&&skinById.has(x)):[];const unlockedStyles=Array.isArray(raw.unlockedMapStyleIds)?raw.unlockedMapStyleIds.filter(x=>typeof x==="string"&&styleById.has(x)):[];
 const dashboard=raw.dashboardSettings&&typeof raw.dashboardSettings==="object"?raw.dashboardSettings as Record<string,unknown>:{};const customization:CustomizationSettings={...DEFAULT_CUSTOMIZATION,selectedSkinId:typeof raw.selectedSkinId==="string"&&skinById.has(raw.selectedSkinId)?raw.selectedSkinId:"vault-hunter",selectedMapStyleId:typeof raw.selectedMapStyleId==="string"&&styleById.has(raw.selectedMapStyleId)?raw.selectedMapStyleId:"hollow-vault",mapStyleMode:["selected","random","ai"].includes(String(raw.mapStyleMode))?raw.mapStyleMode as MapStyleMode:"selected",mapStyleQuality:["auto","low","medium","high"].includes(String(raw.mapStyleQuality))?raw.mapStyleQuality as MapStyleQuality:"auto",unlockedSkinIds:[...new Set(["vault-hunter",...unlockedSkins])],unlockedMapStyleIds:[...new Set(["hollow-vault",...unlockedStyles])],reinforcementSettings:{aiSuggestionsEnabled:(raw.reinforcementSettings as Record<string,unknown>)?.aiSuggestionsEnabled!==false,adaptationStrength:["low","normal","high"].includes(String((raw.reinforcementSettings as Record<string,unknown>)?.adaptationStrength))?(raw.reinforcementSettings as CustomizationSettings["reinforcementSettings"]).adaptationStrength:"normal"},dashboardSettings:{detailLevel:dashboard.detailLevel==="detailed"?"detailed":"simple",notifications:["on","minimal","off"].includes(String(dashboard.notifications))?dashboard.notifications as CustomizationSettings["dashboardSettings"]["notifications"]:"on",showPostRoomSummary:dashboard.showPostRoomSummary!==false,lastViewedRecordId:typeof dashboard.lastViewedRecordId==="string"?dashboard.lastViewedRecordId.slice(0,80):""},recentMapStyleIds:Array.isArray(raw.recentMapStyleIds)?raw.recentMapStyleIds.filter(x=>typeof x==="string"&&styleById.has(x)).slice(-6):[]};
 if(!customization.unlockedSkinIds.includes(customization.selectedSkinId))customization.selectedSkinId="vault-hunter";if(!customization.unlockedMapStyleIds.includes(customization.selectedMapStyleId))customization.selectedMapStyleId="hollow-vault";
 const progression:ProgressionState={roomsCompleted:Number.isFinite(progress.roomsCompleted)?Math.max(0,Number(progress.roomsCompleted)):0,bossesDefeated:Number.isFinite(progress.bossesDefeated)?Math.max(0,Number(progress.bossesDefeated)):0,bestAccuracy:Number.isFinite(progress.bestAccuracy)?Math.max(0,Math.min(1,Number(progress.bestAccuracy))):0,roomsWithoutReinforcement:Number.isFinite(progress.roomsWithoutReinforcement)?Math.max(0,Number(progress.roomsWithoutReinforcement)):0,reinforcementTypesUsed:Array.isArray(progress.reinforcementTypesUsed)?progress.reinforcementTypesUsed.filter(x=>typeof x==="string").slice(0,8):[],highestAdaptiveTier:typeof progress.highestAdaptiveTier==="string"?progress.highestAdaptiveTier:"standard"};
 return{customization:mergeUnlocks(customization,progression),progression};
}
