import type{EncounterMetrics,PlayerPerformanceProfile}from"./adaptive";
import type{InputFamily}from"./input";

export type TutorialStatus="new"|"active"|"completed"|"skipped";
export interface TutorialProgress{schemaVersion:1;status:TutorialStatus;currentLevel:number;completedLevels:number[];completedStepIds:string[];assistanceFlags:string[];summaryShown:boolean}
export const DEFAULT_TUTORIAL_PROGRESS:TutorialProgress={schemaVersion:1,status:"new",currentLevel:1,completedLevels:[],completedStepIds:[],assistanceFlags:[],summaryShown:false};

export function migrateTutorial(value:unknown):TutorialProgress{
 const raw=value&&typeof value==="object"?value as Record<string,unknown>:{};const status:[TutorialStatus,...TutorialStatus[]]=["new","active","completed","skipped"];return{schemaVersion:1,status:status.includes(raw.status as TutorialStatus)?raw.status as TutorialStatus:"new",currentLevel:Number.isInteger(raw.currentLevel)?Math.max(1,Math.min(5,Number(raw.currentLevel))):1,completedLevels:Array.isArray(raw.completedLevels)?[...new Set(raw.completedLevels.filter(x=>Number.isInteger(x)&&Number(x)>=1&&Number(x)<=5).map(Number))]:[],completedStepIds:Array.isArray(raw.completedStepIds)?raw.completedStepIds.filter(x=>typeof x==="string").slice(0,40) as string[]:[],assistanceFlags:Array.isArray(raw.assistanceFlags)?raw.assistanceFlags.filter(x=>typeof x==="string").slice(0,20) as string[]:[],summaryShown:raw.summaryShown===true};
}

const control=(family:InputFamily,keyboard:string,controller:string,touch:string)=>family==="controller"?controller:family==="touch"?touch:keyboard;
export interface TutorialPrompt{id:string;title:string;text:string;level:number}
export function currentTutorialPrompt(level:number,m:EncounterMetrics,family:InputFamily):TutorialPrompt|null{
 if(level===1){if(m.movementMs<700)return{id:"l1-move",level,title:"Move",text:control(family,"Use WASD to move.","Use the left stick to move.","Drag the left joystick to move.")};if(m.shotsFired<1)return{id:"l1-attack",level,title:"Aim and attack",text:control(family,"Aim with the mouse and hold click.","Aim with the right stick and use the trigger.","Drag the attack stick and release to fire. Tap it to auto-aim.")};if(m.shotsHit<1)return{id:"l1-hit",level,title:"Land a hit",text:"Track a target and land one attack."};}
 if(level===2){if(m.kills<2)return{id:"l2-telegraph",level,title:"Read the warning",text:"Watch the gold warning marks, move clear, then defeat two enemies."};}
 if(level===3){if(m.abilityUses<1)return{id:"l3-dash",level,title:"Dash through danger",text:control(family,"Move and press Space to dash.","Move and press A to dash.","Move and tap DASH.")};if((m.resourcesCollected||0)<1)return{id:"l3-resource",level,title:"Collect resources",text:"Defeated enemies may drop health, energy, or coins. Move over one pickup."};}
 if(level===4&&!m.reinforcementUsed)return{id:"l4-support",level,title:"Choose support",text:control(family,"Press R when support is ready.","Press the left bumper when support is ready.","Tap the SUPPORT button when it is ready.")};
 if(level===5&&m.kills<5)return{id:"l5-combine",level,title:"Final assessment",text:"Combine movement, aim, dashing, and optional support. Clear the chamber your way."};
 return null;
}

const demonstrated=(level:number,m:EncounterMetrics)=>level===1?m.movementMs>=700&&m.shotsFired>0&&m.shotsHit>0:level===2?m.kills>=2:level===3?m.abilityUses>0&&(m.resourcesCollected||0)>0:level===4?Boolean(m.reinforcementUsed):level===5?m.kills>=5:true;
export function completeTutorialLevel(progress:TutorialProgress,level:number,m:EncounterMetrics):TutorialProgress{
 if(progress.status==="completed"||progress.status==="skipped"||level<1||level>5)return progress;const ok=demonstrated(level,m),levels=[...new Set([...progress.completedLevels,level])].sort(),flags=ok?progress.assistanceFlags:[...new Set([...progress.assistanceFlags,`level-${level}-objective-incomplete`])];return{...progress,status:level>=5?"completed":"active",currentLevel:Math.min(5,level+1),completedLevels:levels,completedStepIds:[...new Set([...progress.completedStepIds,`level-${level}-room-cleared`,...(ok?[`level-${level}-demonstrated`]:[])])],assistanceFlags:flags,summaryShown:level>=5?false:progress.summaryShown};
}
export const skipTutorial=(progress:TutorialProgress):TutorialProgress=>({...progress,status:"skipped",currentLevel:5,summaryShown:true,assistanceFlags:[...new Set([...progress.assistanceFlags,"tutorial-skipped"])]});
export const replayTutorial=():TutorialProgress=>({...DEFAULT_TUTORIAL_PROGRESS,status:"active"});
export const tutorialNeedsRun=(progress:TutorialProgress)=>progress.status==="new"||progress.status==="active";
export function tutorialPlayStyle(profile:PlayerPerformanceProfile|null){if(!profile)return{title:"Balanced explorer",text:"The Director will keep learning from normal rooms."};const d=profile.dimensions,entries:[[string,number],...Array<[string,number]>]=[["Precision hunter",d.aim],["Mobile duelist",d.movement],["Steady survivor",d.survival],["Tactical reader",d.tactical],["Resource keeper",d.resource]];entries.sort((a,b)=>b[1]-a[1]);return{title:entries[0][0],text:`Your strongest early signal was ${entries[0][0].toLowerCase()}. This estimate will continue changing as you play.`}}
