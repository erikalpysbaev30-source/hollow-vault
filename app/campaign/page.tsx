'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStoredState, saveState } from '@/lib/storage';
import { AppState, Mission } from '@/lib/types';
import { Play, BookOpen } from 'lucide-react';

const CAMPAIGN_MISSIONS: Mission[] = [
  {
    id: 'campaign-1',
    name: 'Outpost Alpha',
    type: 'campaign',
    objective: 'Clear the first outpost',
    difficulty: 0.5,
    estimatedDurationSeconds: 120,
    skillsTested: ['Reaction Time', 'Accuracy'],
    skillsTrained: ['Movement Efficiency'],
    rewards: ['Upgraded Weapon', 'Health Module'],
    locked: false,
    completed: false,
    adaptationReason: 'Your skill profile suggests balanced difficulty',
    adaptationSource: 'deterministic',
  },
  {
    id: 'campaign-2',
    name: 'Ruin Sector',
    type: 'puzzle',
    objective: 'Solve environmental puzzles',
    difficulty: 0.6,
    estimatedDurationSeconds: 180,
    skillsTested: ['Puzzle Solving', 'Planning'],
    skillsTrained: ['Memory'],
    rewards: ['Puzzle Key', 'Ancient Relic'],
    locked: false,
    completed: false,
    adaptationReason: 'Building on puzzle performance from assessment',
    adaptationSource: 'deterministic',
  },
  {
    id: 'campaign-3',
    name: 'Containment Facility',
    type: 'combat',
    objective: 'Survive resource-limited combat',
    difficulty: 0.7,
    estimatedDurationSeconds: 200,
    skillsTested: ['Resource Efficiency', 'Decision Speed'],
    skillsTrained: ['Risk Tolerance'],
    rewards: ['Resource Cache', 'Energy Amplifier'],
    locked: true,
    completed: false,
    unlockRequirement: 'Complete Outpost Alpha',
  },
];

export default function CampaignPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredState();
    setState(stored);
  }, []);

  if (!state) return null;

  const selectedMissionData = CAMPAIGN_MISSIONS.find(m => m.id === selectedMission);

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Campaign</h1>
          <p className="text-muted-foreground">
            Progress through missions tailored to your skill level
          </p>
        </div>

        {/* Mission Map and Details */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Mission List */}
          <div className="lg:col-span-2 space-y-4">
            {CAMPAIGN_MISSIONS.map((mission, idx) => (
              <Card
                key={mission.id}
                className={`tactical-panel rounded-none p-6 cursor-pointer transition ${
                  mission.locked
                    ? 'opacity-50 cursor-not-allowed'
                    : selectedMission === mission.id
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
                onClick={() => !mission.locked && setSelectedMission(mission.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-muted-foreground opacity-30">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-xl font-bold">{mission.name}</h3>
                      <span className="text-xs bg-card px-2 py-1 rounded-sm capitalize">
                        {mission.type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{mission.objective}</p>
                  </div>
                  {mission.completed && (
                    <div className="text-primary font-bold">✓</div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs mt-4">
                  <div>
                    <p className="text-muted-foreground mb-1">Difficulty</p>
                    <p className="font-mono">{(mission.difficulty * 100).toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Duration</p>
                    <p className="font-mono">{mission.estimatedDurationSeconds}s</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Tests</p>
                    <p className="font-mono">{mission.skillsTested.length} skills</p>
                  </div>
                </div>

                {mission.locked && (
                  <p className="text-xs text-muted-foreground mt-3">
                    🔒 {mission.unlockRequirement}
                  </p>
                )}
              </Card>
            ))}
          </div>

          {/* Mission Details Panel */}
          <div>
            {selectedMissionData ? (
              <Card className="tactical-panel rounded-none p-6 sticky top-20 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedMissionData.name}</h2>
                  <p className="text-muted-foreground text-sm">
                    {selectedMissionData.objective}
                  </p>
                </div>

                {/* Skills */}
                <div>
                  <p className="text-xs font-medium text-primary mb-2">SKILLS TESTED</p>
                  <div className="space-y-1">
                    {selectedMissionData.skillsTested.map(skill => (
                      <p key={skill} className="text-sm text-muted-foreground">• {skill}</p>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-primary mb-2">SKILLS TRAINED</p>
                  <div className="space-y-1">
                    {selectedMissionData.skillsTrained.map(skill => (
                      <p key={skill} className="text-sm text-muted-foreground">• {skill}</p>
                    ))}
                  </div>
                </div>

                {/* Adaptation Info */}
                {selectedMissionData.adaptationReason && (
                  <div className="bg-card/50 border border-border/30 p-3 rounded-sm text-xs space-y-1">
                    <p className="text-muted-foreground">Why this mission?</p>
                    <p>{selectedMissionData.adaptationReason}</p>
                    <p className="text-primary font-mono text-xs mt-2">
                      Source: {selectedMissionData.adaptationSource}
                    </p>
                  </div>
                )}

                {/* Rewards */}
                <div>
                  <p className="text-xs font-medium text-primary mb-2">REWARDS</p>
                  <div className="space-y-1">
                    {selectedMissionData.rewards.map(reward => (
                      <p key={reward} className="text-sm text-muted-foreground">🎁 {reward}</p>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t border-border/30">
                  {!selectedMissionData.locked && (
                    <>
                      <Button
                        onClick={() => router.push(`/mission/${selectedMissionData.id}`)}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Mission
                      </Button>
                      <Button
                        onClick={() => router.push(`/mission/${selectedMissionData.id}?briefing=true`)}
                        variant="outline"
                        className="w-full border-border hover:bg-card"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Briefing
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="tactical-panel rounded-none p-6 text-center text-muted-foreground">
                <p>Select a mission for details</p>
              </Card>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-12 flex gap-4 justify-center">
          <Button
            onClick={() => router.push('/profile')}
            variant="outline"
            className="border-border hover:bg-card"
          >
            View Profile
          </Button>
          <Button
            onClick={() => router.push('/adaptation')}
            variant="outline"
            className="border-border hover:bg-card"
          >
            Adaptation Lab
          </Button>
          <Button
            onClick={() => router.push('/settings')}
            variant="outline"
            className="border-border hover:bg-card"
          >
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
