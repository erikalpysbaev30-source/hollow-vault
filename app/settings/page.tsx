'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStoredState, saveState } from '@/lib/storage';
import { AppState } from '@/lib/types';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const stored = getStoredState();
    setState(stored);
  }, []);

  if (!state) return null;

  const handleSaveSettings = (updates: Partial<AppState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    saveState(newState);
  };

  const handleClearData = () => {
    localStorage.clear();
    sessionStorage.clear();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-12">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-card rounded-sm transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-4xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Customize your ADAPTIVE//PROTOCOL experience
            </p>
          </div>
        </div>

        {/* Display & Profile */}
        <Card className="tactical-panel rounded-none p-6 mb-6 space-y-6">
          <h2 className="text-2xl font-bold">Display & Profile</h2>

          <div className="space-y-3">
            <label className="block">
              <p className="text-sm font-medium mb-2">Display Name</p>
              <input
                type="text"
                value={state.displayName}
                onChange={(e) =>
                  handleSaveSettings({ displayName: e.target.value })
                }
                className="w-full bg-card border border-border px-4 py-2 rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Gaming Experience</p>
              <p className="font-medium capitalize">
                {state.previousGamingExperience}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Control Method</p>
              <p className="font-medium capitalize">
                {state.controlMethod.replace('-', ' & ')}
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/onboarding')}
            className="text-sm text-primary hover:underline"
          >
            Re-run onboarding
          </button>
        </Card>

        {/* Controls */}
        <Card className="tactical-panel rounded-none p-6 mb-6 space-y-6">
          <h2 className="text-2xl font-bold">Controls</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Mouse Sensitivity
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={state.mouseSensitivity}
                onChange={(e) =>
                  handleSaveSettings({
                    mouseSensitivity: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {state.mouseSensitivity.toFixed(1)}x
              </p>
            </div>
          </div>
        </Card>

        {/* Accessibility */}
        <Card className="tactical-panel rounded-none p-6 mb-6 space-y-6">
          <h2 className="text-2xl font-bold">Accessibility</h2>

          <div className="space-y-3">
            {[
              {
                key: 'subtitlesEnabled',
                label: 'Subtitles',
                desc: 'Show text for dialogue and important events',
              },
              {
                key: 'colorblindMode',
                label: 'Colorblind Mode',
                desc: 'Adjust colors for better contrast',
              },
              {
                key: 'reducedMotion',
                label: 'Reduced Motion',
                desc: 'Minimize animations and screen effects',
              },
              {
                key: 'highContrast',
                label: 'High Contrast',
                desc: 'Increase UI contrast for clarity',
              },
            ].map((option) => (
              <label
                key={option.key}
                className="flex items-center gap-3 cursor-pointer p-3 border border-border rounded-sm hover:bg-card/50 transition"
              >
                <input
                  type="checkbox"
                  checked={(state as any)[option.key]}
                  onChange={(e) =>
                    handleSaveSettings({
                      [option.key]: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Text Scale</label>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.1"
              value={state.textScale}
              onChange={(e) =>
                handleSaveSettings({ textScale: parseFloat(e.target.value) })
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(state.textScale * 100)}%
            </p>
          </div>
        </Card>

        {/* Adaptation Settings */}
        <Card className="tactical-panel rounded-none p-6 mb-6 space-y-6">
          <h2 className="text-2xl font-bold">Adaptation</h2>

          <div className="space-y-4">
            <div className="bg-card/50 border border-border/30 p-4 rounded-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">AI Recommendations</span>
                <span className="text-sm text-muted-foreground">
                  {state.aiRecommendationsEnabled ? '✓ Enabled' : '✗ Disabled'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Optional AI can suggest mission refinements within safety limits. Deterministic baseline always applies.
              </p>
              <Button
                onClick={() =>
                  handleSaveSettings({
                    aiRecommendationsEnabled: !state.aiRecommendationsEnabled,
                  })
                }
                className="w-full bg-card hover:bg-card border border-primary text-primary mt-2"
              >
                {state.aiRecommendationsEnabled ? 'Disable' : 'Enable'} AI
              </Button>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Difficulty Preference</p>
              {(['easier', 'balanced', 'harder'] as const).map(pref => (
                <button
                  key={pref}
                  onClick={() =>
                    handleSaveSettings({ difficultyPreference: pref })
                  }
                  className={`w-full p-3 text-left border rounded-sm text-sm capitalize transition mb-2 ${
                    state.difficultyPreference === pref
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {pref === 'easier' && '← Prefer easier missions'}
                  {pref === 'balanced' && '= Balanced challenge'}
                  {pref === 'harder' && '→ Prefer harder missions'}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Data & Privacy */}
        <Card className="tactical-panel rounded-none p-6 mb-6 space-y-6">
          <h2 className="text-2xl font-bold">Data & Privacy</h2>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>✓ All player data is stored locally in browser storage</p>
            <p>✓ No data is sent to external servers without your permission</p>
            <p>
              ✓ You can export your data at any time
            </p>
            <p>✓ Clearing data below will permanently delete all progress</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                const dataStr = JSON.stringify(state, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `adaptive-profile-${new Date().toISOString()}.json`;
                link.click();
              }}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Export My Data
            </Button>

            <Button
              onClick={() => setShowClearConfirm(true)}
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </div>

          {showClearConfirm && (
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-sm space-y-3">
              <p className="text-sm font-medium text-destructive">
                Are you sure? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleClearData}
                  className="flex-1 bg-destructive hover:bg-destructive/90"
                >
                  Delete All Data
                </Button>
                <Button
                  onClick={() => setShowClearConfirm(false)}
                  variant="outline"
                  className="flex-1 border-border hover:bg-card"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Information */}
        <Card className="tactical-panel rounded-none p-6">
          <h2 className="text-2xl font-bold mb-4">About</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>ADAPTIVE//PROTOCOL v1.0</p>
            <p>Gameplay-based skill assessment with deterministic adaptation</p>
            <p className="text-xs mt-4">
              Built with TypeScript, React, Next.js, and localStorage persistence
            </p>
          </div>
        </Card>

        {/* Navigation */}
        <div className="mt-12 text-center">
          <Button
            onClick={() => router.push('/campaign')}
            variant="outline"
            className="border-border hover:bg-card"
          >
            Back to Campaign
          </Button>
        </div>
      </div>
    </div>
  );
}
