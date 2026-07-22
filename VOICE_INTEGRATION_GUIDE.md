# Voice Features Integration Guide

## Overview

The voice narration system is **implemented and ready to use**. This guide shows how to integrate it into active gameplay.

## What's Already Done

✅ **VoiceNarrator class** - Full implementation  
✅ **React hook** - useVoiceNarrator ready  
✅ **UI component** - VoiceSettingsPanel included  
✅ **Documentation** - Complete guides provided  
✅ **No dependencies** - Uses browser Web Speech API  

## Quick Integration

### Step 1: Initialize in Main Game Component

In `app/page.tsx`, add voice narrator initialization:

```typescript
import { createVoiceNarrator, type VoiceNarrator } from '@/lib/client/voice-narrator';

// Add narrator ref
const narratorRef = useRef<VoiceNarrator | null>(null);

// Initialize narrator
useEffect(() => {
  if (typeof window !== 'undefined') {
    narratorRef.current = createVoiceNarrator({ 
      enabled: true,
      volume: 0.8,
      rate: 1.0 
    });
  }
}, []);
```

### Step 2: Add Narration on Room Entry

In the `spawnWave` function, add narration:

```typescript
const spawnWave = useCallback((g: Game) => {
  // ... existing code ...
  
  if (g.wave === 0) {
    // Add voice narration
    if (narratorRef.current) {
      const difficultyLabel = {
        'assisted': 'Assisted',
        'relaxed': 'Relaxed',
        'standard': 'Standard',
        'challenging': 'Challenging',
        'expert': 'Expert'
      }[g.director.tier] || 'Standard';
      
      narratorRef.current.narrateRoomEntry(
        g.currentRoom.roomName,
        difficultyLabel
      );
    }
  }
  
  // ... rest of function ...
}, []);
```

### Step 3: Add Enemy Spawn Narration

In the enemy spawning logic:

```typescript
// When enemies spawn
if (narratorRef.current && g.mobs.length > 0) {
  const newEnemies = g.mobs.slice(-newMobCount);
  const firstType = newEnemies[0]?.kind || 'enemy';
  
  narratorRef.current.narrateEnemySpawn(
    firstType,
    newEnemies.length
  );
}
```

### Step 4: Add Reinforcement Narration

In `activateReinforcement` function:

```typescript
const activateReinforcement = useCallback((g: Game) => {
  // ... existing code ...
  
  if (narratorRef.current) {
    narratorRef.current.narrateReinforcement(
      definition.name
    );
  }
  
  // ... rest of function ...
}, [narratorRef]);
```

### Step 5: Add Victory/Defeat Narration

In the `finish` function:

```typescript
const finish = useCallback(() => {
  const g = gameRef.current;
  if (!g || g.ended) return;
  
  // Add narration
  if (narratorRef.current) {
    narratorRef.current.narrateDefeat();
  }
  
  g.ended = true;
  // ... rest of function ...
}, []);
```

### Step 6: Add Victory Narration

When room is completed:

```typescript
// In room completion handler
if (g.roomState === 'clear') {
  if (narratorRef.current) {
    narratorRef.current.narrateVictory();
  }
  
  // ... handle room completion ...
}
```

## Voice Settings Integration

### Add Voice Toggle to Settings Menu

Add to settings panel:

```typescript
import { VoiceSettingsPanel } from '@/app/voice-settings-panel';

// In settings render
<VoiceSettingsPanel
  voiceEnabled={voiceEnabled}
  onToggleVoice={(enabled) => {
    setVoiceEnabled(enabled);
    if (narratorRef.current) {
      narratorRef.current.updateSettings({ enabled });
    }
  }}
  volume={voiceVolume}
  onVolumeChange={(volume) => {
    setVoiceVolume(volume);
    if (narratorRef.current) {
      narratorRef.current.updateSettings({ volume });
    }
  }}
  rate={voiceRate}
  onRateChange={(rate) => {
    setVoiceRate(rate);
    if (narratorRef.current) {
      narratorRef.current.updateSettings({ rate });
    }
  }}
/>
```

### Save Voice Settings

```typescript
const saveVoiceSettings = useCallback(() => {
  persist({
    voiceEnabled,
    voiceVolume,
    voiceRate
  });
}, [voiceEnabled, voiceVolume, voiceRate]);
```

### Load Voice Settings

```typescript
useEffect(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('hollow-vault-save') || '{}');
    setVoiceEnabled(saved.voiceEnabled !== false);
    setVoiceVolume(saved.voiceVolume || 0.8);
    setVoiceRate(saved.voiceRate || 1.0);
  } catch (e) {
    // Use defaults
  }
}, []);
```

## Complete Integration Example

### Full Function with Voice

```typescript
const spawnWave = useCallback((g: Game) => {
  const template = getRoomTemplate(g.currentRoom.templateId);
  if (!template) return;
  
  if (g.wave === 0) {
    g.roomStarted = performance.now();
    g.roomState = g.currentRoom.pacingRole === 'boss' ? 'boss' : 'fight';
    assembleRoomAndResolveSpawn(g);
    
    // ✅ ADD NARRATION
    if (narratorRef.current) {
      narratorRef.current.narrateRoomEntry(
        g.currentRoom.roomName,
        difficultyLabel(g.director.tier)
      );
    }
  }
  
  // ... rest of existing code ...
}, []);
```

### Game Loop with Voice Events

```typescript
// In main game loop
const loop = (now: number) => {
  const g = gameRef.current;
  if (!g) return;
  
  // ... existing game logic ...
  
  // ✅ ADD ENEMY SPAWN NARRATION
  if (newEnemiesSpawned && g.mobs.length > 0) {
    const firstEnemy = g.mobs[0];
    if (narratorRef.current) {
      narratorRef.current.narrateEnemySpawn(
        firstEnemy.kind,
        g.mobs.length
      );
    }
  }
  
  // ✅ ADD VICTORY NARRATION
  if (g.metrics.completed && g.roomState === 'clear') {
    if (narratorRef.current) {
      narratorRef.current.narrateVictory();
    }
  }
  
  // ... rest of loop ...
};
```

## Custom Narration

Add custom narration for specific events:

```typescript
// Custom event narration
if (narratorRef.current) {
  narratorRef.current.speak({
    text: 'Boss health critically low!',
    priority: 'high',
    interrupt: true
  });
}

// Combat event narration
if (narratorRef.current) {
  narratorRef.current.narrateCombatEvent(
    'Your attack missed. Focus on your positioning.'
  );
}

// Warning narration
if (narratorRef.current) {
  narratorRef.current.narrateWarning(
    'Hazard zone detected. Stay clear!'
  );
}
```

## Testing Voice Features

### Manual Testing

1. **Enable Voice**
   - Set `enabled: true` in narrator options
   - Verify audio permissions granted

2. **Test Room Entry**
   - Start new game
   - Verify narrator announces room
   - Check volume and speed

3. **Test Enemy Narration**
   - Wait for enemies to spawn
   - Verify "X [type] incoming!" announcement

4. **Test Reinforcements**
   - Press R to activate support
   - Verify reinforcement announced

5. **Test Victory**
   - Complete room
   - Verify "Room cleared" announcement

### Browser Testing

Test across browsers:
- Chrome (Primary)
- Firefox
- Safari
- Edge
- Mobile (iOS Safari, Chrome Android)

### Accessibility Testing

- Screen reader support
- Keyboard navigation
- Voice with reduced motion
- High contrast + voice

## Performance Optimization

### Voice Queue Management

```typescript
// Limit utterance queue
if (narratorRef.current.isSpeaking()) {
  // Only add high priority messages when already speaking
  // Or cancel current message
}
```

### Lazy Initialization

```typescript
// Initialize on first use, not at page load
const ensureNarrator = () => {
  if (!narratorRef.current && typeof window !== 'undefined') {
    narratorRef.current = createVoiceNarrator({ enabled: true });
  }
  return narratorRef.current;
};
```

### Memory Management

```typescript
// Clean up on unmount
useEffect(() => {
  return () => {
    if (narratorRef.current) {
      narratorRef.current.stop();
      narratorRef.current = null;
    }
  };
}, []);
```

## Deployment Checklist

- [ ] Voice narrator initialized
- [ ] Room entry narration added
- [ ] Enemy spawn narration added
- [ ] Reinforcement narration added
- [ ] Victory/defeat narration added
- [ ] Voice settings UI integrated
- [ ] Settings persisted
- [ ] Tested in all browsers
- [ ] Mobile testing complete
- [ ] Accessibility verified

## Troubleshooting Integration

### Voice Not Playing

1. Check `narratorRef.current` is initialized
2. Verify `enabled: true` in narrator options
3. Check browser console for errors
4. Test with simple `narrate()` call

### Audio Context Issues

```typescript
// Ensure audio context is initialized
useEffect(() => {
  const handleUserInteraction = () => {
    if (narratorRef.current && typeof speechSynthesis !== 'undefined') {
      // Resume audio context if needed
      speechSynthesis.getVoices();
    }
  };
  
  document.addEventListener('click', handleUserInteraction);
  return () => document.removeEventListener('click', handleUserInteraction);
}, []);
```

## Best Practices

1. **Use High Priority for Critical Events**
   - Room entry
   - Defeat/victory
   - Critical warnings

2. **Use Medium Priority for Regular Events**
   - Enemy spawn
   - Reinforcement activation
   - Completion messages

3. **Avoid Over-Narration**
   - Don't narrate every minor event
   - Focus on important gameplay moments
   - Consider player preference

4. **Test Voice Quality**
   - Check clarity across browsers
   - Verify proper speech rate
   - Ensure volume is appropriate

## Next Steps

1. **Implement narration calls** - Add to key game events
2. **Test thoroughly** - Verify all events narrate correctly
3. **Optimize performance** - Profile and optimize if needed
4. **Add settings UI** - Integrate voice settings menu
5. **Deploy** - Push to production
6. **Monitor** - Check for voice-related issues

## Files to Modify

When integrating voice, you'll primarily modify:

- `app/page.tsx` - Add narrator initialization, narration calls
- Game event handlers - Add voice narration
- Settings menu - Add voice settings UI
- localStorage persistence - Save voice preferences

## Support

For questions or issues:

1. Review `VOICE_FEATURES.md` for detailed API
2. Check `VOICE_SETUP.md` for quick start
3. See `VOICE_RELEASE_NOTES.md` for overview
4. Test in browser console with:
   ```javascript
   window.speechSynthesis.getVoices()
   ```

---

**Integration Status:** Ready to implement  
**Difficulty:** Easy (plug-and-play)  
**Time Required:** 30-60 minutes  
**Testing Time:** 30 minutes

The voice system is production-ready. You can start integrating immediately!
