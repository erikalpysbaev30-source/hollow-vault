"use client";

import type { CSSProperties } from "react";
import type { AdaptiveTier, PlayerPerformanceProfile } from "@/game/adaptive";
import {
  MAP_STYLES, PLAYER_SKINS, UNLOCK_REQUIREMENTS, getPlayerSkin,
  type CustomizationSettings, type MapStyleMode, type MapStyleQuality,
} from "@/game/customization";
import {
  changeCategory, difficultyLabel, directorStatusCopy, friendlyReason, playerObservations,
  publicSkillProfile, roomSourceCopy, skillLabel, type AIAdaptationRecord,
} from "@/game/transparency";
import {
  getReinforcement, REINFORCEMENT_REASON_TEXT,
  type ReinforcementDecision, type ReinforcementUsageSummary,
} from "@/game/reinforcements";

const requirementText = (id?: string) => UNLOCK_REQUIREMENTS.find((requirement) => requirement.id === id)?.description || "Available by default";
const pct = (value: number) => `${Math.round(value * 100)}%`;

interface DashboardProps {
  records: AIAdaptationRecord[];
  profile: PlayerPerformanceProfile | null;
  tier: AdaptiveTier;
  plannerStatus: string;
  bufferedRooms: number;
  customization: CustomizationSettings;
  usage: ReinforcementUsageSummary;
  reinforcement: ReinforcementDecision | null;
  adaptiveEnabled: boolean;
  changeDetail: (value: "simple" | "detailed") => void;
  onReturn: () => void;
  onDetail: (record: AIAdaptationRecord) => void;
  onDebug?: (action: string) => void;
}

export function DirectorDashboard(props: DashboardProps) {
  const { records, profile, plannerStatus, customization, usage } = props;
  const latest = records.at(-1) || null;
  const next = latest?.nextRoom;
  const detail = customization.dashboardSettings.detailLevel;
  const status = directorStatusCopy({ enabled: props.adaptiveEnabled, records, plannerStatus });
  const observations = playerObservations(latest);
  const reasonCodes = next?.reasonCodes.length ? next.reasonCodes : latest?.reasonCodes || [];
  const primaryReason = friendlyReason(reasonCodes[0] || "");
  const source = roomSourceCopy(next?.roomSource || latest?.roomSource || "local");
  const skill = publicSkillProfile(profile, usage);
  const dimensions: [string, number][] = [["Aim", skill.aim], ["Movement", skill.movement], ["Survival", skill.survival], ["Tactics", skill.tactics], ["Resource use", skill.resourceManagement], ["Reinforcements", skill.reinforcementEfficiency]];
  const recommendation = getReinforcement(latest?.reinforcement.decision?.reinforcementTypeId || props.reinforcement?.reinforcementTypeId);
  const visibleChanges = next?.changes.slice(0, detail === "detailed" ? 12 : 6) || [];

  return <section className="armory director-page" aria-labelledby="director-title">
    <header><button onClick={props.onReturn}>← RETURN</button><b>AI DIRECTOR</b><span>{next?.difficultyLabel || difficultyLabel(props.tier)}</span></header>
    <div className="director-inner">
      <div className="director-title">
        <div><p className="overline">HOW THE VAULT ADAPTS</p><h1 id="director-title">Your next chamber.</h1><p>The Director reads recent room results, prepares a bounded room, and shows only changes the game actually accepted.</p></div>
        <label>VIEW<select aria-label="Dashboard detail" value={detail} onChange={(event) => props.changeDetail(event.target.value as "simple" | "detailed")}><option value="simple">Simple</option><option value="detailed">Detailed</option></select></label>
      </div>

      <section className="director-hero" aria-live="polite">
        <div className="director-state"><i aria-hidden>◇</i><span><small>{status.title}</small><b>{status.text}</b></span></div>
        <div className="next-room-callout"><small>NEXT ROOM</small><b>{next?.roomName || "Introductory chamber"}</b><span>{next ? `${next.difficultyLabel} · ${next.trend}` : "Complete a room to reveal the next adaptation"}</span></div>
        <div className="source-callout"><small>ROOM SOURCE</small><b>{source.title}</b><span>{source.text}</span></div>
      </section>

      {!latest ? <section className="director-learning"><i>◎</i><h2>The AI Director is still learning.</h2><p>Complete a few introductory rooms to see what the game noticed, what changed, and why.</p></section> : <>
        <div className="director-three-cards">
          <section className="plain-director-card"><small>01 · LAST ROOM</small><h2>What the Director noticed</h2><div className="observation-list">{observations.length ? observations.map(item => <p key={item.text}><i aria-hidden>{item.icon}</i>{item.text}</p>) : <p><i aria-hidden>◇</i>The last room stayed close to its expected result.</p>}</div></section>
          <section className="plain-director-card"><small>02 · NEXT ROOM</small><h2>What changed</h2>{visibleChanges.length ? <div className="friendly-changes">{visibleChanges.map(change => <div key={change.field}><i className={change.direction}>{change.direction === "increase" ? "↑" : change.direction === "decrease" ? "↓" : "↻"}</i><span><small>{changeCategory(change.field)} · {change.direction === "changed" ? "Changed" : change.direction === "increase" ? "↑ Increase" : "↓ Decrease"}</small><b>{change.label}</b><em>{change.before} → {change.after}</em></span></div>)}</div> : <p className="empty-state">= Unchanged. No mechanical values changed; the next room keeps the current balance or changes presentation only.</p>}</section>
          <section className="plain-director-card why-card"><small>03 · REASON</small><h2>Why it changed</h2><i className="reason-icon" aria-hidden>{primaryReason.icon}</i><h3>{primaryReason.title}</h3><p>{primaryReason.explanation}</p><strong>The AI never directly changes health or damage; normal room progression still applies.</strong></section>
        </div>

        <section className="difficulty-timeline" aria-label="Recent difficulty timeline"><div><h2>Recent chamber path</h2><p>These labels describe room pressure, not your worth as a player.</p></div><ol>{records.slice(-5).map(record => <li key={record.id}><button onClick={() => props.onDetail(record)} aria-label={`Open details for ${record.roomName}`}><small>ROOM {record.roomIndex}</small><b>{record.roomName}</b><span>{difficultyLabel(record.difficultyTier)}</span></button><i aria-hidden>→</i></li>)}{next && <li className="next"><button onClick={() => latest && props.onDetail(latest)}><small>NEXT</small><b>{next.roomName}</b><span>{next.difficultyLabel}</span></button></li>}</ol></section>

        <div className="director-lower-grid">
          <section className="reinforcement-explanation"><small>OPTIONAL SUPPORT</small><h2>Reinforcement suggestion</h2><div><i aria-hidden>{recommendation?.icon || "◇"}</i><span><b>{recommendation?.name || "No suggestion yet"}</b><p>{latest.reinforcement.decision ? friendlyReason(latest.reinforcement.decision.reasonCodes[0] || "balanced_support").explanation : "A support option appears when the room has enough evidence."}</p></span></div><dl><div><dt>Used</dt><dd>{latest.reinforcement.used ? "Activated once" : "Not activated"}</dd></div><div><dt>Result</dt><dd>{latest.reinforcement.used ? latest.reinforcement.successful ? "Helped in the room" : "No clear benefit recorded" : "Your choice was preserved"}</dd></div><div><dt>Cost</dt><dd>{latest.reinforcement.decision ? `${latest.reinforcement.decision.resourceCost} energy` : "Not set"}</dd></div></dl><strong>The AI suggests reinforcements, but you decide whether to use them.</strong></section>
          <section className="friendly-skill"><small>CHANGING ESTIMATES</small><h2>Your play style</h2><p>These estimates change as you play and are used only to select suitable rooms and support options.</p><div>{dimensions.map(([label, value]) => <div key={label}><span>{label}</span><i><em style={{ width: pct(value) }} /></i><b>{skillLabel(value)}</b></div>)}</div></section>
        </div>

        {detail === "detailed" && <section className="director-details"><div><small>LAST ROOM RESULT</small><h2>{latest.roomName}</h2><dl><div><dt>Accuracy</dt><dd>{pct(latest.observedMetrics.accuracy)}</dd></div><div><dt>Enemies cleared</dt><dd>{pct(latest.observedMetrics.killRate)}</dd></div><div><dt>Damage taken</dt><dd>{pct(latest.observedMetrics.damageTakenRatio)}</dd></div><div><dt>Completion</dt><dd>{Math.round(latest.prediction.actualCompletionTimeSeconds)}s</dd></div></dl></div><div><small>PREDICTION CHECK</small><h2>Expected and actual</h2><p>Expected completion: <b>{Math.round(latest.prediction.predictedCompletionTimeSeconds)}s</b></p><p>Actual completion: <b>{Math.round(latest.prediction.actualCompletionTimeSeconds)}s</b></p><p>Expected clear rate: <b>{pct(latest.prediction.predictedKillRate)}</b></p><p>Actual clear rate: <b>{pct(latest.prediction.actualKillRate)}</b></p></div><div><small>HOW WAS IT CREATED?</small><h2>{source.title}</h2><p>{source.text}</p><p>{latest.localAdjustments.length ? `${latest.localAdjustments.length} requested value was adjusted by the game before use.` : "The final room passed the game's local safety checks."}</p></div></section>}
      </>}

      <aside className="privacy-note"><b>WHAT THE DIRECTOR USES</b><p>Room-level accuracy, completion time, damage, enemy clears, movement time, weapon-energy efficiency, and reinforcement use. It does not send recordings, raw controls, messages, save files, or account secrets.</p></aside>
      {props.onDebug && <section className="debug-tools"><h2>Development simulations</h2>{["beginner", "expert", "deaths", "aim-survival", "force-reinforcement", "force-fallback", "unlock-all", "clear-history"].map(action => <button key={action} onClick={() => props.onDebug?.(action)}>{action.replaceAll("-", " ")}</button>)}</section>}
    </div>
  </section>;
}

export function AIDirectorWidget({ record, compact, onOpen }: { record: AIAdaptationRecord | null; compact: boolean; onOpen: () => void }) {
  const next = record?.nextRoom;
  return <button className={`ai-director-widget ${compact ? "compact" : ""}`} onClick={onOpen} aria-label="Open AI Director"><i aria-hidden>◇</i><span><small>AI DIRECTOR</small><b>{next ? `${next.difficultyLabel} · ${next.trend}` : "Learning your play style"}</b>{!compact && <em>{next ? friendlyReason(next.reasonCodes[0] || "").title : "Complete an introductory room"}</em>}</span><strong>VIEW</strong></button>;
}

export function PostRoomDirectorSummary({ record, onOpen }: { record: AIAdaptationRecord; onOpen: () => void }) {
  const observations = playerObservations(record);
  return <aside className="post-room-director"><small>AI DIRECTOR</small><h3>{record.nextRoom ? `${record.nextRoom.difficultyLabel} next` : "Room result recorded"}</h3><p>{observations.map(item => item.text).slice(0, 2).join(" ") || "The room stayed close to its expected result."}</p><strong>{record.nextRoom ? `${record.nextRoom.trend}. AI health and damage modifiers remain unchanged.` : "The Director is preparing later rooms."}</strong><button onClick={onOpen}>VIEW AI DIRECTOR</button></aside>;
}

export function RecordDetail({ record, onClose }: { record: AIAdaptationRecord; onClose: () => void }) {
  const next = record.nextRoom;
  return <div className="overlay record-overlay"><article><button onClick={onClose} aria-label="Close room details">×</button><p className="overline">ROOM {String(record.roomIndex).padStart(2, "0")} · {roomSourceCopy(record.roomSource).title}</p><h2>{record.roomName}</h2><p>{difficultyLabel(record.difficultyTier)} · {record.completionResult}</p><h3>What the Director noticed</h3>{playerObservations(record).map(item => <p key={item.text}>{item.icon} {item.text}</p>)}<h3>{next ? `Next: ${next.roomName}` : "Final applied room"}</h3>{next ? <dl>{next.changes.slice(0, 8).map(change => <div key={change.field}><dt>{change.label}</dt><dd>{change.before} → {change.after}</dd></div>)}</dl> : <p>No later-room preview was recorded for this result.</p>}<h3>Prediction check</h3><p>Expected {Math.round(record.prediction.predictedCompletionTimeSeconds)} seconds · Actual {Math.round(record.prediction.actualCompletionTimeSeconds)} seconds.</p><h3>Room source</h3><p>{roomSourceCopy(next?.roomSource || record.roomSource).text}</p></article></div>;
}

export function SkinMenu({ settings, onEquip, onReturn }: { settings: CustomizationSettings; onEquip: (id: string) => void; onReturn: () => void }) {
  return <section className="armory cosmetic-page"><header><button onClick={onReturn}>← RETURN</button><b>HUNTER SKINS</b><span>{getPlayerSkin(settings.selectedSkinId).name.toUpperCase()}</span></header><div className="cosmetic-inner"><p className="overline">FIELD APPEARANCE</p><h1>Choose your shell.</h1><p>Skins change only color, trail, and portrait. Hitbox and combat stats stay identical.</p><div className="skin-grid">{PLAYER_SKINS.map(skin => { const unlocked = settings.unlockedSkinIds.includes(skin.id); const equipped = settings.selectedSkinId === skin.id; return <button key={skin.id} disabled={!unlocked} onClick={() => onEquip(skin.id)} className={equipped ? "equipped" : ""} title={unlocked ? skin.description : requirementText(skin.unlockRequirementId)}><SkinPreview skinId={skin.id} /><small>{skin.rarity}</small><h2>{skin.name}</h2><p>{skin.description}</p><span>{equipped ? "EQUIPPED" : unlocked ? "EQUIP" : `LOCKED · ${requirementText(skin.unlockRequirementId)}`}</span></button>; })}</div></div></section>;
}

function SkinPreview({ skinId }: { skinId: string }) { const skin = getPlayerSkin(skinId); return <div className="skin-preview" style={{ "--skin-body": skin.colors.body, "--skin-head": skin.colors.head, "--skin-legs": skin.colors.legs, "--skin-glow": skin.colors.glow } as CSSProperties}><i /><b /><em /><span>{skin.portrait}</span></div>; }

export function MapStyleMenu({ settings, onSelect, onMode, onQuality, onReturn }: { settings: CustomizationSettings; onSelect: (id: string) => void; onMode: (mode: MapStyleMode) => void; onQuality: (quality: MapStyleQuality) => void; onReturn: () => void }) {
  return <section className="armory cosmetic-page"><header><button onClick={onReturn}>← RETURN</button><b>MAP STYLES</b><span>{settings.mapStyleMode.toUpperCase()}</span></header><div className="cosmetic-inner"><div className="style-heading"><div><p className="overline">VISUAL CALIBRATION</p><h1>Retune the vault.</h1><p>Styles change palette and decoration only. Layout, collision, visibility, and spawning remain identical.</p></div><div><label>MODE<select value={settings.mapStyleMode} onChange={event => onMode(event.target.value as MapStyleMode)}><option value="selected">Selected</option><option value="random">Random</option><option value="ai">AI selected</option></select></label><label>QUALITY<select value={settings.mapStyleQuality} onChange={event => onQuality(event.target.value as MapStyleQuality)}><option value="auto">Auto</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div></div><div className="style-grid">{MAP_STYLES.map(style => { const unlocked = settings.unlockedMapStyleIds.includes(style.id); const selected = settings.selectedMapStyleId === style.id; return <button key={style.id} disabled={!unlocked} onClick={() => onSelect(style.id)} className={selected ? "equipped" : ""}><div className="style-preview" style={{ "--floor-a": style.palette.floorA, "--floor-b": style.palette.floorB, "--grid": style.palette.grid, "--wall": style.palette.wall, "--accent": style.palette.accent } as CSSProperties}><i /><b /><em /></div><small>{style.performanceTier} LOAD</small><h2>{style.name}</h2><p>{style.description}</p><span>{selected ? "SELECTED" : unlocked ? "SELECT" : `LOCKED · ${requirementText(style.unlockRequirementId)}`}</span></button>; })}</div></div></section>;
}

export function ReinforcementPanel({ decision, charges, cooldown, energy }: { decision: ReinforcementDecision | null; charges: number; cooldown: number; energy: number }) {
  const definition = getReinforcement(decision?.reinforcementTypeId); const ready = Boolean(decision && definition && charges > 0 && cooldown <= 0 && energy >= decision.resourceCost);
  return <div className={`reinforcement-hud ${ready ? "ready" : ""}`} title={decision?.reasonCodes.map(code => REINFORCEMENT_REASON_TEXT[code] || friendlyReason(code).explanation).join(" ")}><kbd>R</kbd><i>{definition?.icon || "·"}</i><span><small>{decision?.source === "openai" ? "AI RECOMMENDED" : "DIRECTOR SUPPORT"}</small><b>{definition?.name || "CALIBRATING"}</b><em>{decision ? `${decision.resourceCost} ENERGY · ${charges} CHARGE${charges === 1 ? "" : "S"}` : "Awaiting room evidence"}</em></span><strong>{cooldown > 0 ? `${Math.ceil(cooldown)}s` : ready ? "READY" : charges <= 0 ? "SPENT" : "ENERGY"}</strong></div>;
}
