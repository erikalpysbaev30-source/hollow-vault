'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { AppState, ControlMethod, DEFAULT_APP_STATE } from '@/lib/types';
import { getStoredState, saveState } from '@/lib/storage';

const STEPS = [
  'Display Name',
  'Experience',
  'Controls',
  'Accessibility',
  'Review',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<AppState>(() => {
    const stored = getStoredState();
    return stored.onboardingComplete ? DEFAULT_APP_STATE : stored;
  });

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      const newState = { ...state, onboardingComplete: true };
      setState(newState);
      saveState(newState);
      router.push('/assessment');
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex gap-2 mb-4">
            {STEPS.map((stepName, idx) => (
              <div
                key={idx}
                className={`flex-1 h-1 rounded-sm transition ${
                  idx <= step ? 'bg-primary' : 'bg-border/30'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
        </div>

        {/* Content */}
        <Card className="tactical-panel rounded-none p-8 mb-8">
          <h1 className="text-3xl font-bold mb-8">
            {step === 0 && 'What should we call you?'}
            {step === 1 && 'Your gaming background'}
            {step === 2 && 'How do you like to play?'}
            {step === 3 && 'Accessibility & Preferences'}
            {step === 4 && 'Ready to begin?'}
          </h1>

          <div className="space-y-6">
            {/* Step 0: Display Name */}
            {step === 0 && (
              <div className="space-y-4">
                <label className="block text-sm font-medium mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={state.displayName}
                  onChange={(e) =>
                    setState({ ...state, displayName: e.target.value })
                  }
                  placeholder="Rook"
                  className="w-full bg-card border border-border px-4 py-2 rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Used for your profile and save files.
                </p>
              </div>
            )}

            {/* Step 1: Gaming Experience */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  How many hours have you spent gaming?
                </p>
                {['Beginner', 'Intermediate', 'Veteran'].map((level) => (
                  <button
                    key={level}
                    onClick={() =>
                      setState({
                        ...state,
                        previousGamingExperience: level.toLowerCase() as any,
                      })
                    }
                    className={`w-full p-4 text-left border rounded-sm transition ${
                      state.previousGamingExperience === level.toLowerCase()
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/70'
                    }`}
                  >
                    <div className="font-medium">{level}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {level === 'Beginner' && 'Less than 50 hours'}
                      {level === 'Intermediate' && '50-500 hours'}
                      {level === 'Veteran' && 'Over 500 hours'}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Control Method */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  What's your preferred control method?
                </p>
                {['Keyboard & Mouse', 'Controller', 'Touch'].map((method) => {
                  const methodKey = (
                    method === 'Keyboard & Mouse'
                      ? 'keyboard-mouse'
                      : method === 'Controller'
                      ? 'controller'
                      : 'touch'
                  ) as ControlMethod;
                  return (
                    <button
                      key={method}
                      onClick={() =>
                        setState({
                          ...state,
                          controlMethod: methodKey,
                        })
                      }
                      className={`w-full p-4 text-left border rounded-sm transition ${
                        state.controlMethod === methodKey
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-border/70'
                      }`}
                    >
                      <div className="font-medium">{method}</div>
                    </button>
                  );
                })}

                <label className="block text-sm font-medium mt-6 mb-2">
                  Mouse Sensitivity
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={state.mouseSensitivity}
                  onChange={(e) =>
                    setState({
                      ...state,
                      mouseSensitivity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {state.mouseSensitivity.toFixed(1)}x
                </p>
              </div>
            )}

            {/* Step 3: Accessibility */}
            {step === 3 && (
              <div className="space-y-6">
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
                        setState({
                          ...state,
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

                <label className="block text-sm font-medium mt-6 mb-2">
                  Text Scale
                </label>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.1"
                  value={state.textScale}
                  onChange={(e) =>
                    setState({
                      ...state,
                      textScale: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {Math.round(state.textScale * 100)}%
                </p>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="bg-card/50 border border-border/50 p-6 rounded-sm space-y-4">
                  <h3 className="font-bold text-lg mb-4">Your Settings</h3>

                  <div className="grid gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Display Name
                      </p>
                      <p className="font-medium">{state.displayName}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Experience
                      </p>
                      <p className="font-medium capitalize">
                        {state.previousGamingExperience}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Control Method
                      </p>
                      <p className="font-medium capitalize">
                        {state.controlMethod.replace('-', ' & ')}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Accessibility
                      </p>
                      <div className="space-y-1">
                        {state.subtitlesEnabled && (
                          <p className="text-sm flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary" />
                            Subtitles
                          </p>
                        )}
                        {state.reducedMotion && (
                          <p className="text-sm flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary" />
                            Reduced Motion
                          </p>
                        )}
                        {state.highContrast && (
                          <p className="text-sm flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary" />
                            High Contrast
                          </p>
                        )}
                        {!state.subtitlesEnabled &&
                          !state.reducedMotion &&
                          !state.highContrast && (
                            <p className="text-sm text-muted-foreground">
                              Standard settings
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  You can adjust these settings anytime in the Settings menu.
                </p>
                <p className="text-sm text-muted-foreground">
                  Ready to start five assessment missions to measure your skills?
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex gap-4 justify-between">
          <Button
            onClick={handleBack}
            disabled={step === 0}
            variant="outline"
            className="border-border hover:bg-card"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {step === STEPS.length - 1 ? 'Start Assessment' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
