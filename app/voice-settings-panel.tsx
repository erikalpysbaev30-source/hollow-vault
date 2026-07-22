'use client';

import type { CSSProperties } from 'react';

interface VoiceSettingsPanelProps {
  voiceEnabled: boolean;
  onToggleVoice: (enabled: boolean) => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  rate?: number;
  onRateChange?: (rate: number) => void;
  compact?: boolean;
}

export function VoiceSettingsPanel({
  voiceEnabled,
  onToggleVoice,
  volume = 0.8,
  onVolumeChange,
  rate = 1.0,
  onRateChange,
  compact = false,
}: VoiceSettingsPanelProps) {
  const panelStyle: CSSProperties = {
    padding: compact ? '8px 12px' : '16px',
    borderRadius: '6px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
  };

  const labelStyle: CSSProperties = {
    fontSize: compact ? '12px' : '14px',
    fontWeight: 500,
    marginBottom: compact ? '4px' : '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const sliderStyle: CSSProperties = {
    width: '100%',
    marginBottom: compact ? '8px' : '12px',
    cursor: 'pointer',
  };

  return (
    <div style={panelStyle} className="voice-settings-panel">
      <div style={labelStyle}>
        <input
          type="checkbox"
          id="voice-toggle"
          checked={voiceEnabled}
          onChange={(e) => onToggleVoice(e.target.checked)}
          aria-label="Enable voice narration"
        />
        <label htmlFor="voice-toggle" style={{ margin: 0, cursor: 'pointer' }}>
          <strong>🎤 Voice</strong>
        </label>
      </div>

      {voiceEnabled && (
        <>
          <div style={{ marginBottom: compact ? '8px' : '12px' }}>
            <label htmlFor="voice-volume" style={labelStyle}>
              Volume: {Math.round(volume * 100)}%
            </label>
            <input
              id="voice-volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
              style={sliderStyle}
              aria-label="Voice volume"
            />
          </div>

          <div>
            <label htmlFor="voice-rate" style={labelStyle}>
              Speed: {rate.toFixed(1)}x
            </label>
            <input
              id="voice-rate"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => onRateChange?.(parseFloat(e.target.value))}
              style={sliderStyle}
              aria-label="Voice speed"
            />
          </div>
        </>
      )}

      <p
        style={{
          fontSize: '11px',
          opacity: 0.7,
          margin: compact ? '4px 0 0 0' : '8px 0 0 0',
          lineHeight: 1.3,
        }}
      >
        {voiceEnabled
          ? 'Voice narration is enabled. Adjust volume and speed to your preference.'
          : 'Voice narration is disabled. Enable to hear game narration and audio feedback.'}
      </p>
    </div>
  );
}

export function CompactVoiceToggle({
  voiceEnabled,
  onToggleVoice,
}: {
  voiceEnabled: boolean;
  onToggleVoice: (enabled: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggleVoice(!voiceEnabled)}
      title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: '2px solid #fff',
        backgroundColor: voiceEnabled ? 'rgba(100, 200, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
        color: '#fff',
        fontSize: '20px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
      aria-label={voiceEnabled ? 'Voice enabled' : 'Voice disabled'}
      aria-pressed={voiceEnabled}
    >
      🎤
    </button>
  );
}
