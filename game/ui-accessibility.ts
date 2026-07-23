export type UIScale="small"|"default"|"large"|"extra-large";
export type UIDensity="auto"|"comfortable"|"compact";

export const UI_SCALE_FACTORS:Record<UIScale,number>={small:.9,default:1,large:1.15,"extra-large":1.3};
export const UI_SCALE_OPTIONS=Object.keys(UI_SCALE_FACTORS) as UIScale[];

export const ACCESSIBLE_UI_COLORS={
 background:"#090813",panel:"#11131f",panelElevated:"#191b2a",
 textPrimary:"#f7f1df",textSecondary:"#c8d1ce",textMuted:"#aebbb8",
 accent:"#78e5dc",accentHover:"#a2f1eb",border:"#55625f",focus:"#ffd166",
 success:"#9fe8aa",warning:"#ffd166",danger:"#ff9b9b",
} as const;

export function normalizeUIScale(value:unknown):UIScale{return UI_SCALE_OPTIONS.includes(value as UIScale)?value as UIScale:"default"}
export function normalizeUIDensity(value:unknown):UIDensity{return value==="comfortable"||value==="compact"?value:"auto"}

function luminance(hex:string){const channels=hex.replace("#","").match(/.{2}/g)?.map(value=>parseInt(value,16)/255)??[0,0,0];const [r,g,b]=channels.map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b}
export function contrastRatio(foreground:string,background:string){const a=luminance(foreground),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
