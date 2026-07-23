export type InputFamily="keyboard-mouse"|"controller"|"touch";
export type InteractionMode="main-menu"|"gameplay"|"paused"|"level-complete"|"game-over"|"settings"|"tutorial-overlay"|"loading";

export interface TouchGameplayInput{
 moveX:number;moveY:number;aimX:number;aimY:number;aiming:boolean;fire:boolean;fireQueued:boolean;autoAimQueued:boolean;dashPressed:boolean;supportPressed:boolean;superPressed:boolean;
}

export const emptyTouchInput=():TouchGameplayInput=>({moveX:0,moveY:0,aimX:0,aimY:0,aiming:false,fire:false,fireQueued:false,autoAimQueued:false,dashPressed:false,supportPressed:false,superPressed:false});

export type TouchAttackRelease={mode:"aimed"|"auto-aim";x:number;y:number;magnitude:number;angle:number|null};
export function resolveTouchAttackRelease(x:number,y:number,aimThreshold=.18):TouchAttackRelease{
 const magnitude=Math.min(1,Math.hypot(x,y));
 if(magnitude<aimThreshold)return{mode:"auto-aim",x:0,y:0,magnitude,angle:null};
 return{mode:"aimed",x:x/magnitude,y:y/magnitude,magnitude,angle:Math.atan2(y,x)};
}

export function resetMutableInput(input:{keys:Set<string>;mouse:{down:boolean};touch:TouchGameplayInput;reinforcementButtonDown?:boolean;superButtonDown?:boolean}){
 input.keys.clear();input.mouse.down=false;Object.assign(input.touch,emptyTouchInput());if("reinforcementButtonDown" in input)input.reinforcementButtonDown=false;if("superButtonDown" in input)input.superButtonDown=false;
}

export const interactionModeFor=(input:{screen:string;paused:boolean;levelComplete:boolean;gameOver:boolean;settingsOpen?:boolean;tutorialBlocking?:boolean}):InteractionMode=>{
 if(input.gameOver)return"game-over";if(input.tutorialBlocking)return"tutorial-overlay";if(input.settingsOpen||input.screen==="settings")return"settings";if(input.screen!=="game")return"main-menu";if(input.levelComplete)return"level-complete";if(input.paused)return"paused";return"gameplay";
};

export const pointerLockAllowed=(mode:InteractionMode,family:InputFamily,enabled:boolean)=>enabled&&mode==="gameplay"&&family==="keyboard-mouse";
export const cursorVisible=(mode:InteractionMode,family:InputFamily)=>family!=="keyboard-mouse"||mode!=="gameplay";
