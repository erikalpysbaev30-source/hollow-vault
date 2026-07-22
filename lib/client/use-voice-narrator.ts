import { useCallback, useEffect, useRef } from 'react';
import { createVoiceNarrator, type VoiceNarrator } from './voice-narrator';

export interface UseVoiceNarratorOptions {
  enabled?: boolean;
  volume?: number;
  rate?: number;
}

export function useVoiceNarrator(options?: UseVoiceNarratorOptions) {
  const narratorRef = useRef<VoiceNarrator | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize narrator on first call
  useEffect(() => {
    if (!isInitializedRef.current && typeof window !== 'undefined') {
      narratorRef.current = createVoiceNarrator({
        enabled: options?.enabled !== false,
        volume: options?.volume ?? 0.8,
        rate: options?.rate ?? 1.0,
      });
      isInitializedRef.current = true;
    }
  }, [options]);

  const narrate = useCallback((text: string, priority: 'low' | 'medium' | 'high' = 'medium', interrupt = false) => {
    if (narratorRef.current) {
      narratorRef.current.speak({ text, priority, interrupt });
    }
  }, []);

  const narrateRoomEntry = useCallback((roomName: string, difficulty: string) => {
    if (narratorRef.current) {
      narratorRef.current.narrateRoomEntry(roomName, difficulty);
    }
  }, []);

  const narrateEnemySpawn = useCallback((enemyType: string, count: number) => {
    if (narratorRef.current) {
      narratorRef.current.narrateEnemySpawn(enemyType, count);
    }
  }, []);

  const narrateVictory = useCallback(() => {
    if (narratorRef.current) {
      narratorRef.current.narrateVictory();
    }
  }, []);

  const narrateDefeat = useCallback(() => {
    if (narratorRef.current) {
      narratorRef.current.narrateDefeat();
    }
  }, []);

  const narrateReinforcement = useCallback((reinforcementName: string) => {
    if (narratorRef.current) {
      narratorRef.current.narrateReinforcement(reinforcementName);
    }
  }, []);

  const stop = useCallback(() => {
    if (narratorRef.current) {
      narratorRef.current.stop();
    }
  }, []);

  const updateSettings = useCallback((partial: Record<string, unknown>) => {
    if (narratorRef.current) {
      narratorRef.current.updateSettings(partial as any);
    }
  }, []);

  return {
    narrate,
    narrateRoomEntry,
    narrateEnemySpawn,
    narrateVictory,
    narrateDefeat,
    narrateReinforcement,
    stop,
    updateSettings,
    narrator: narratorRef.current,
  };
}
