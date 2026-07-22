"use client";
import{useRef,useState,type PointerEvent as ReactPointerEvent}from"react";

type VectorHandler=(x:number,y:number)=>void;
function Joystick({label,onVector,className=""}:{label:string;onVector:VectorHandler;className?:string}){
 const ref=useRef<HTMLDivElement>(null),pointer=useRef<number|null>(null);const[pos,setPos]=useState({x:0,y:0});
 const update=(event:ReactPointerEvent)=>{const rect=ref.current!.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,dx=event.clientX-cx,dy=event.clientY-cy,max=rect.width*.36,length=Math.hypot(dx,dy)||1,scale=Math.min(1,max/length),x=dx*scale,y=dy*scale;setPos({x,y});onVector(x/max,y/max)};
 const down=(event:ReactPointerEvent)=>{pointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);update(event)};
 const move=(event:ReactPointerEvent)=>{if(pointer.current===event.pointerId)update(event)};
 const end=(event:ReactPointerEvent)=>{if(pointer.current!==event.pointerId)return;pointer.current=null;setPos({x:0,y:0});onVector(0,0)};
 return <div ref={ref} className={`touch-stick ${className}`} role="group" aria-label={label} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}><span style={{transform:`translate(${pos.x}px,${pos.y}px)`}}/><small>{label}</small></div>;
}

function AttackJoystick({onVector,onRelease}:{onVector:VectorHandler;onRelease:VectorHandler}){
 const ref=useRef<HTMLDivElement>(null),pointer=useRef<number|null>(null),last=useRef({x:0,y:0});const[pos,setPos]=useState({x:0,y:0,magnitude:0});
 const update=(event:ReactPointerEvent)=>{const rect=ref.current!.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,dx=event.clientX-cx,dy=event.clientY-cy,max=rect.width*.36,length=Math.hypot(dx,dy)||1,scale=Math.min(1,max/length),x=dx*scale,y=dy*scale,nx=x/max,ny=y/max,magnitude=Math.min(1,Math.hypot(nx,ny));last.current={x:nx,y:ny};setPos({x,y,magnitude});onVector(nx,ny)};
 const down=(event:ReactPointerEvent)=>{pointer.current=event.pointerId;last.current={x:0,y:0};event.currentTarget.setPointerCapture(event.pointerId);update(event)};
 const move=(event:ReactPointerEvent)=>{if(pointer.current===event.pointerId)update(event)};
 const end=(event:ReactPointerEvent)=>{if(pointer.current!==event.pointerId)return;pointer.current=null;const released=last.current;onRelease(released.x,released.y);last.current={x:0,y:0};setPos({x:0,y:0,magnitude:0});onVector(0,0)};
 const angle=Math.atan2(pos.y,pos.x)*180/Math.PI,magnitude=pos.magnitude;
 return <div ref={ref} className="touch-stick aim-stick" role="button" aria-label="Attack: drag to aim and release to fire; tap to auto-aim" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
  <i className="touch-aim-guide" aria-hidden="true" style={{transform:`rotate(${angle}deg) scaleX(${magnitude})`,opacity:magnitude}}/><span style={{transform:`translate(${pos.x}px,${pos.y}px)`}}/><small>ATTACK</small>
 </div>;
}

export function MobileControls({visible,leftHanded,onMove,onAim,onAttackRelease,onDash,onSupport,onPause}:{visible:boolean;leftHanded:boolean;onMove:VectorHandler;onAim:VectorHandler;onAttackRelease:VectorHandler;onDash:()=>void;onSupport:()=>void;onPause:()=>void}){
 if(!visible)return null;return <div className={`mobile-controls ${leftHanded?"left-handed":""}`} aria-label="Touch game controls">
  <Joystick label="MOVE" className="move-stick" onVector={onMove}/><AttackJoystick onVector={onAim} onRelease={onAttackRelease}/>
  <button className="touch-action dash" onPointerDown={onDash}>DASH</button><button className="touch-action support" onPointerDown={onSupport}>SUPPORT</button><button className="touch-pause" onClick={onPause} aria-label="Pause game">Ⅱ</button>
 </div>;
}
