# How Voice Activation Works in Hollow Vault

## Quick Overview

Voice is activated through a **priority-based queue system** that uses the browser's native Web Speech API. When enabled, it automatically narrates game events.

---

## 1. Initialization Flow

```
Game Starts
    ↓
useVoiceNarrator() Hook Called
    ↓
VoiceNarrator Instance Created
    ↓
Voice Settings Loaded from localStorage
    ↓
Ready to Speak
```

### Code Example:
```typescript
// In your React component
import { useVoiceNarrator } from '@/lib/client/use-voice-narrator';

export function GameComponent() {
  const { narrate, narrateVictory } = useVoiceNarrator({
    enabled: true,      // Start with voice on
    volume: 0.8,        // 80% volume
    rate: 1.0           // Normal speed
  });

  // Voice is now active and ready
}
```

---

## 2. How Voice Gets Triggered

### Automatic Events (Ready to Integrate)

Voice fires automatically for these game events:

```typescript
// Room Entry
narrateRoomEntry('Warden\'s Chamber', 'challenging')
// Speaks: "Entering Warden's Chamber. Difficulty: challenging"

// Enemy Spawn Warning
narrateEnemySpawn('Skeleton Knight', 3)
// Speaks: "Three Skeleton Knights incoming!"

// Reinforcement Deployed
narrateReinforcement('Guardian Shield')
// Speaks: "Guardian Shield deployed!"

// Victory
narrateVictory()
// Speaks: "Room cleared. Prepare for the next challenge."

// Defeat
narrateDefeat()
// Speaks: "Defeated. Learn from this encounter."
```

### Manual Narration

You can speak any text:

```typescript
narrate('Custom message here', 'high', false)
// Parameters: (text, priority, interrupt)
```

---

## 3. Priority System

Voice messages are processed by priority:

```
HIGH PRIORITY
├─ Room entry narration
├─ Critical alerts
├─ Game over messages
└─ Interrupts other speech

MEDIUM PRIORITY (Default)
├─ Combat events
├─ Enemy spawns
├─ Reinforcements
└─ Queued after high priority

LOW PRIORITY
├─ General commentary
├─ Tips
└─ Processed last
```

### How Priority Works:

```typescript
// HIGH priority messages jump to front of queue
narrate('Critical alert!', 'high', true)  // interrupt=true stops current speech

// MEDIUM priority queued normally
narrate('Enemy approaching', 'medium')

// LOW priority goes to end
narrate('Nice dodge', 'low')
```

**Result:** High priority messages speak immediately, others wait their turn.

---

## 4. Settings Control

### Voice Settings Panel

Users can control:
- **Enable/Disable** - Turn voice on or off
- **Volume** - 0% to 100%
- **Speed** - 0.5x to 2.0x playback rate
- **Voice Selection** - Choose system voice

### Settings Persist

Settings stored in localStorage:
```json
{
  "voiceEnabled": true,
  "voiceVolume": 0.8,
  "voiceRate": 1.0,
  "voicePitch": 1.0,
  "selectedVoice": "default"
}
```

Load on next session:
```typescript
const narrator = createVoiceNarrator({
  enabled: localStorage.voiceEnabled ?? true,
  volume: localStorage.voiceVolume ?? 0.8,
  rate: localStorage.voiceRate ?? 1.0
});
```

---

## 5. Technical Architecture

### Component Hierarchy

```
React Component
    ↓
useVoiceNarrator Hook
    ↓
VoiceNarrator Instance
    ↓
Web Speech API
    ↓
Browser Speech Synthesis
    ↓
System Voice Engine
    ↓
Speaker
```

### Internal Queue Processing

```
speak() Called with VoiceEvent
    ↓
Check if enabled & supported
    ↓
Create SpeechSynthesisUtterance
    ↓
Sort by priority (high → low)
    ↓
processQueue() runs
    ↓
If not speaking, take first from queue
    ↓
synth.speak(utterance)
    ↓
On end, process next in queue
```

---

## 6. Activation Methods

### Method 1: Manual Narration

```typescript
const { narrate } = useVoiceNarrator();

// Speak immediately
narrate('You enter a dark corridor', 'high', false);

// Interrupt current speech
narrate('Watch out!', 'high', true);
```

### Method 2: Event Callbacks

```typescript
const { narrateVictory, narrateDefeat } = useVoiceNarrator();

// On victory
if (roomCleared) {
  narrateVictory();  // Speaks victory message
}

// On defeat
if (playerDied) {
  narrateDefeat();   // Speaks defeat message
}
```

### Method 3: Settings Panel

```typescript
<VoiceSettingsPanel
  voiceEnabled={isVoiceOn}
  onToggleVoice={(enabled) => setVoiceOn(enabled)}
  volume={volume}
  onVolumeChange={(vol) => setVolume(vol)}
  rate={rate}
  onRateChange={(spd) => setRate(spd)}
/>
```

---

## 7. Flow Diagram: Complete Activation

```
┌─────────────────────────────────────────────────────────┐
│ Game Event Occurs (Enemy Spawn, Victory, etc.)          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │ narrateEnemySpawn()   │
         │ narrateVictory()      │
         │ narrateRoomEntry()    │
         └───────────┬───────────┘
                     │
                     ↓
         ┌───────────────────────────────────┐
         │ VoiceNarrator.speak()             │
         │ Creates SpeechSynthesisUtterance  │
         └───────────┬───────────────────────┘
                     │
                     ↓
    ┌────────────────────────────────────┐
    │ Check: Voice Enabled & Supported?  │
    └────────┬───────────────┬───────────┘
             │ YES           │ NO
             ↓               ↓
    ┌──────────────┐   (No speech)
    │ Add to Queue │   (Silently skip)
    │ by Priority  │
    └──────┬───────┘
           │
           ↓
    ┌──────────────────────┐
    │ processQueue()       │
    │ Check if Speaking?   │
    └──────┬─────────┬─────┘
           │ NO      │ YES
           ↓         ↓
    ┌────────────┐  (Queue waiting)
    │ Take from  │
    │ Queue      │
    └────────┬───┘
             │
             ↓
    ┌──────────────────────────┐
    │ Apply Settings:          │
    │ • Rate                   │
    │ • Volume                 │
    │ • Pitch                  │
    │ • Selected Voice         │
    └────────┬─────────────────┘
             │
             ↓
    ┌──────────────────────────┐
    │ speechSynthesis.speak()  │
    │ Start speaking           │
    └────────┬─────────────────┘
             │
             ↓
    ┌──────────────────────────┐
    │ On End Event             │
    │ Process Next in Queue    │
    └──────────────────────────┘
```

---

## 8. Real-World Example

### Game Event → Voice Output

```typescript
// Game detects room clear
if (allEnemiesDefeated) {
  // Call victory narration
  narrateVictory();
  // Queue: ["Room cleared. Prepare for the next challenge."]
  
  // Add experience message
  narrate(`You gained 250 experience!`, 'medium');
  // Queue: [
  //   "Room cleared. Prepare for the next challenge.",
  //   "You gained 250 experience!"
  // ]
}

// Voice Output:
// 1. Speaks: "Room cleared. Prepare for the next challenge."
// 2. Waits for completion
// 3. Speaks: "You gained 250 experience!"
// 4. Queue empty, ready for next event
```

---

## 9. Supported Voices by Platform

### Windows
- Cortana
- David
- Zira

### macOS / iOS
- Samantha
- Victoria
- Aaron
- Moira

### Android
- Google English (TTS)
- System voices

### Linux
- System TTS available

---

## 10. Disabling Voice

### Programmatically
```typescript
const { stop, updateSettings } = useVoiceNarrator();

// Stop current speech
stop();

// Disable voice entirely
updateSettings({ enabled: false });
```

### Via UI
- Click voice toggle in settings
- Set volume to 0%
- Disable in accessibility settings

---

## 11. Troubleshooting Voice Activation

| Issue | Cause | Solution |
|-------|-------|----------|
| No sound | Voice disabled | Enable in settings |
| No sound | Volume at 0% | Increase volume slider |
| Silent first message | Browser policy | Try again (delayed initialization) |
| Robotic quality | System voice | Try different voice in settings |
| Slow speech | Speed too low | Increase rate to 1.0-1.5x |

---

## 12. Performance Notes

- **Non-blocking** - Voice runs asynchronously
- **Zero FPS impact** - Separate from game loop
- **Lightweight** - ~5KB code addition
- **Memory efficient** - Reuses single SpeechSynthesis instance
- **Queued properly** - Messages don't overlap

---

## Integration Checklist

To add voice narration to any game event:

```typescript
// 1. Import hook
import { useVoiceNarrator } from '@/lib/client/use-voice-narrator';

// 2. Initialize in component
const { narrate, narrateVictory } = useVoiceNarrator();

// 3. Call narration on event
const handleRoomEntry = () => {
  narrateRoomEntry('Throne Room', 'epic');
};

// 4. Add settings UI (optional)
<VoiceSettingsPanel
  voiceEnabled={voiceOn}
  onToggleVoice={setVoiceOn}
/>

// 5. Done! Voice is now active
```

---

## Summary

**Voice activation** is a simple 4-step process:

1. **Enable** - User enables voice in settings
2. **Trigger** - Game event calls narration function
3. **Queue** - Message added to priority queue
4. **Speak** - Browser speaks with user's selected settings

All automatic. All client-side. Zero network calls. Works everywhere.

