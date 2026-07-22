"use client";

import { useState } from "react";

export function VoiceToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [testPlaying, setTestPlaying] = useState(false);

  const handleTest = () => {
    if (!("speechSynthesis" in window)) return;
    setTestPlaying(true);
    const utterance = new SpeechSynthesisUtterance("Voice narration enabled");
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => setTestPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-slate-900 p-4 border border-slate-700">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm font-medium text-slate-200">
            🎤 Voice Narration
          </span>
        </label>
        {enabled && (
          <button
            onClick={handleTest}
            disabled={testPlaying}
            className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 transition-colors"
          >
            {testPlaying ? "Testing..." : "Test Voice"}
          </button>
        )}
      </div>
      {enabled && (
        <p className="text-xs text-slate-400">
          Voice will narrate room entries, victories, defeats, and reinforcements
        </p>
      )}
    </div>
  );
}
