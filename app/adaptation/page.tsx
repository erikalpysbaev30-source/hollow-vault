'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStoredState } from '@/lib/storage';
import { AppState } from '@/lib/types';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdaptationPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('overview');

  useEffect(() => {
    const stored = getStoredState();
    setState(stored);
  }, []);

  if (!state) return null;

  const profile = state.playerProfile;

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-12">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-card rounded-sm transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-4xl font-bold">Adaptation Lab</h1>
            <p className="text-muted-foreground mt-1">
              Understand how missions are chosen for you
            </p>
          </div>
        </div>

        {/* Algorithm Overview */}
        <Card
          className={`tactical-panel rounded-none p-6 mb-6 cursor-pointer transition ${
            expandedSection === 'overview'
              ? 'border-primary/50 bg-primary/5'
              : 'border-border hover:border-primary/30'
          }`}
          onClick={() =>
            setExpandedSection(expandedSection === 'overview' ? '' : 'overview')
          }
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">How Missions Are Chosen</h2>
            {expandedSection === 'overview' ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>

          {expandedSection === 'overview' && (
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <div className="bg-card/50 border border-border/30 p-4 rounded-sm space-y-3">
                <div>
                  <p className="font-mono text-xs text-primary mb-1">STEP 1: MEASURE YOUR SKILLS</p>
                  <p>
                    Assessment missions record gameplay events: reaction time, accuracy, decisions, resource use,
                    movement patterns, and more. These generate 12 skill metrics.
                  </p>
                </div>

                <div className="border-t border-border/30 pt-3">
                  <p className="font-mono text-xs text-primary mb-1">STEP 2: BUILD YOUR PROFILE</p>
                  <p>
                    Your profile is a deterministic snapshot of your abilities. It never changes except when you play
                    missions that generate new data.
                  </p>
                </div>

                <div className="border-t border-border/30 pt-3">
                  <p className="font-mono text-xs text-primary mb-1">STEP 3: SELECT NEXT MISSION</p>
                  <p>
                    Deterministic rules examine your profile and pick a difficulty tier. Optional AI validation suggests
                    refinements. Final mission is always explained.
                  </p>
                </div>
              </div>

              <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-sm text-destructive">
                <p className="font-bold text-sm mb-1">Safety Constraints</p>
                <ul className="text-xs space-y-1">
                  <li>✓ No impossible jumps in difficulty</li>
                  <li>✓ Tier shifts max ±1 per mission</li>
                  <li>✓ All changes validated against profile ranges</li>
                  <li>✓ You control AI toggle and difficulty preference</li>
                </ul>
              </div>
            </div>
          )}
        </Card>

        {/* Your Current Metrics */}
        <Card
          className={`tactical-panel rounded-none p-6 mb-6 cursor-pointer transition ${
            expandedSection === 'metrics'
              ? 'border-primary/50 bg-primary/5'
              : 'border-border hover:border-primary/30'
          }`}
          onClick={() => setExpandedSection(expandedSection === 'metrics' ? '' : 'metrics')}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Your Measured Metrics</h2>
            {expandedSection === 'metrics' ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>

          {expandedSection === 'metrics' && profile && (
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Reaction Speed</p>
                  <p className="font-mono">{(profile.reactionSpeed.value * 100).toFixed(0)} / 100</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Accuracy</p>
                  <p className="font-mono">{(profile.accuracy.value * 100).toFixed(0)} / 100</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Decision Speed</p>
                  <p className="font-mono">{(profile.decisionSpeed.value * 100).toFixed(0)} / 100</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Planning</p>
                  <p className="font-mono">{(profile.planning.value * 100).toFixed(0)} / 100</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Risk Tolerance</p>
                  <p className="font-mono">{(profile.riskTolerance.value * 100).toFixed(0)} / 100</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Pattern Recognition</p>
                  <p className="font-mono">{(profile.patternRecognition.value * 100).toFixed(0)} / 100</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Puzzle Solving</p>
                  <p className="font-mono">{(profile.puzzleSolving.value * 100).toFixed(0)} / 100</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Patience</p>
                  <p className="font-mono">{(profile.patience.value * 100).toFixed(0)} / 100</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Memory</p>
                  <p className="font-mono">{(profile.memory.value * 100).toFixed(0)} / 100</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Movement Efficiency</p>
                  <p className="font-mono">{(profile.movementEfficiency.value * 100).toFixed(0)} / 100</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Adaptation Speed</p>
                  <p className="font-mono">{(profile.adaptationSpeed.value * 100).toFixed(0)} / 100</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Learning Rate</p>
                  <p className="font-mono">{(profile.learningRate.value * 100).toFixed(0)} / 100</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Deterministic Rules */}
        <Card
          className={`tactical-panel rounded-none p-6 mb-6 cursor-pointer transition ${
            expandedSection === 'rules'
              ? 'border-primary/50 bg-primary/5'
              : 'border-border hover:border-primary/30'
          }`}
          onClick={() => setExpandedSection(expandedSection === 'rules' ? '' : 'rules')}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Deterministic Selection Rules</h2>
            {expandedSection === 'rules' ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>

          {expandedSection === 'rules' && (
            <div className="mt-6 space-y-4 text-sm text-muted-foreground font-mono">
              <div className="bg-card/50 border border-border/30 p-4 rounded-sm">
                <p className="text-primary font-bold mb-2">Rule 1: Calculate Average Performance</p>
                <code className="text-xs block overflow-x-auto">
                  avg_skill = mean(all_skill_metrics)
                </code>
                <p className="mt-2 text-xs">
                  Example: If your avg is 0.65, you&apos;re in the upper-intermediate tier.
                </p>
              </div>

              <div className="bg-card/50 border border-border/30 p-4 rounded-sm">
                <p className="text-primary font-bold mb-2">Rule 2: Select Difficulty Tier</p>
                <code className="text-xs block overflow-x-auto">
                  tier = floor(avg_skill * 5)
                  <br />
                  tier = clamp(tier, 0, 4)
                </code>
                <p className="mt-2 text-xs">
                  Tier 0: Beginner | Tier 1: Novice | Tier 2: Intermediate | Tier 3: Advanced | Tier 4:
                  Expert
                </p>
              </div>

              <div className="bg-card/50 border border-border/30 p-4 rounded-sm">
                <p className="text-primary font-bold mb-2">Rule 3: Find Mission at Tier</p>
                <code className="text-xs block overflow-x-auto">
                  candidate_missions = find(
                  <br />
                  &nbsp;&nbsp;difficulty in [tier * 0.2, (tier+1) * 0.2)
                  <br />
                  )
                </code>
                <p className="mt-2 text-xs">All missions within tier range are viable choices.</p>
              </div>

              <div className="bg-card/50 border border-border/30 p-4 rounded-sm">
                <p className="text-primary font-bold mb-2">Rule 4: Optional AI Refinement</p>
                <code className="text-xs block overflow-x-auto">
                  if aiRecommendationEnabled:
                  <br />
                  &nbsp;&nbsp;refined = validate(ai_suggestion)
                  <br />
                  else:
                  <br />
                  &nbsp;&nbsp;refined = candidates[0]
                </code>
                <p className="mt-2 text-xs">AI can suggest refinements but cannot violate safety limits.</p>
              </div>
            </div>
          )}
        </Card>

        {/* Settings */}
        <Card
          className={`tactical-panel rounded-none p-6 mb-6 cursor-pointer transition ${
            expandedSection === 'settings'
              ? 'border-primary/50 bg-primary/5'
              : 'border-border hover:border-primary/30'
          }`}
          onClick={() =>
            setExpandedSection(expandedSection === 'settings' ? '' : 'settings')
          }
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Adaptation Settings</h2>
            {expandedSection === 'settings' ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>

          {expandedSection === 'settings' && (
            <div className="mt-6 space-y-6">
              <div className="bg-card/50 border border-border/30 p-4 rounded-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">AI Recommendations Enabled</span>
                  <span className="text-primary">{state.aiRecommendationsEnabled ? '✓' : '✗'}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, AI can suggest mission refinements within safety limits. Deterministic baseline always
                  applies first.
                </p>
                <Button
                  onClick={() => {}}
                  className="w-full bg-card hover:bg-card border border-primary text-primary mt-2"
                >
                  {state.aiRecommendationsEnabled ? 'Disable' : 'Enable'} AI
                </Button>
              </div>

              <div className="bg-card/50 border border-border/30 p-4 rounded-sm space-y-3">
                <div>
                  <p className="font-medium mb-2">Difficulty Preference</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose your preferred adjustment relative to your measured skill.
                  </p>
                </div>
                {(['easier', 'balanced', 'harder'] as const).map(pref => (
                  <button
                    key={pref}
                    onClick={() => {}}
                    className={`w-full p-2 text-left border rounded-sm text-sm capitalize transition ${
                      state.difficultyPreference === pref
                        ? 'border-primary bg-primary/10'
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
          )}
        </Card>

        {/* Navigation */}
        <div className="flex gap-4 justify-center mt-12">
          <Button
            onClick={() => router.push('/campaign')}
            variant="outline"
            className="border-border hover:bg-card"
          >
            Back to Campaign
          </Button>
          <Button
            onClick={() => router.push('/profile')}
            variant="outline"
            className="border-border hover:bg-card"
          >
            View Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
