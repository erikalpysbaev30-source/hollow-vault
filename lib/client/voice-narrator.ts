/**
 * Voice Narrator System
 * Provides text-to-speech narration for Hollow Vault gameplay
 */

export interface VoiceSettings {
  enabled: boolean;
  volume: number;
  rate: number;
  pitch: number;
  voice: string;
}

export interface VoiceEvent {
  text: string;
  priority: 'low' | 'medium' | 'high';
  interrupt?: boolean;
}

export class VoiceNarrator {
  private synth: SpeechSynthesis;
  private utteranceQueue: SpeechSynthesisUtterance[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private settings: VoiceSettings;
  private isSupported: boolean;

  constructor(settings: VoiceSettings = this.defaultSettings()) {
    this.synth = window.speechSynthesis;
    this.settings = settings;
    this.isSupported = 'speechSynthesis' in window;
  }

  private defaultSettings(): VoiceSettings {
    return {
      enabled: true,
      volume: 0.8,
      rate: 1.0,
      pitch: 1.0,
      voice: 'default',
    };
  }

  updateSettings(partial: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...partial };
  }

  speak(event: VoiceEvent): void {
    if (!this.isSupported || !this.settings.enabled) return;

    if (event.interrupt && this.currentUtterance) {
      this.synth.cancel();
      this.utteranceQueue = [];
      this.currentUtterance = null;
    }

    const utterance = new SpeechSynthesisUtterance(event.text);
    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;

    // Select voice
    if (this.settings.voice !== 'default') {
      const voices = this.synth.getVoices();
      const selectedVoice = voices.find(
        (v) => v.name.toLowerCase().includes(this.settings.voice.toLowerCase())
      );
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      this.processQueue();
    };

    if (event.priority === 'high') {
      this.utteranceQueue.unshift(utterance);
    } else {
      this.utteranceQueue.push(utterance);
    }

    this.processQueue();
  }

  private processQueue(): void {
    if (this.currentUtterance || this.utteranceQueue.length === 0) return;

    this.currentUtterance = this.utteranceQueue.shift() || null;
    if (this.currentUtterance) {
      this.synth.speak(this.currentUtterance);
    }
  }

  stop(): void {
    this.synth.cancel();
    this.utteranceQueue = [];
    this.currentUtterance = null;
  }

  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  // Narration helpers
  narrateRoomEntry(roomName: string, difficulty: string): void {
    this.speak({
      text: `Entering ${roomName}. Difficulty: ${difficulty}. Stay sharp.`,
      priority: 'high',
      interrupt: true,
    });
  }

  narrateEnemySpawn(enemyType: string, count: number): void {
    const plural = count > 1 ? 's' : '';
    this.speak({
      text: `${count} ${enemyType}${plural} incoming!`,
      priority: 'high',
    });
  }

  narrateCombatEvent(event: string): void {
    this.speak({
      text: event,
      priority: 'medium',
    });
  }

  narrateVictory(): void {
    this.speak({
      text: 'Room cleared. Preparing next challenge.',
      priority: 'high',
      interrupt: true,
    });
  }

  narrateDefeat(): void {
    this.speak({
      text: 'Defeated. Learn from this encounter.',
      priority: 'high',
      interrupt: true,
    });
  }

  narrateReinforcement(reinforcementName: string): void {
    this.speak({
      text: `${reinforcementName} deployed!`,
      priority: 'high',
      interrupt: true,
    });
  }

  narrateWarning(warning: string): void {
    this.speak({
      text: warning,
      priority: 'high',
    });
  }
}

export function createVoiceNarrator(
  settings?: Partial<VoiceSettings>
): VoiceNarrator {
  return new VoiceNarrator({
    enabled: true,
    volume: 0.8,
    rate: 1.0,
    pitch: 1.0,
    voice: 'default',
    ...settings,
  });
}
