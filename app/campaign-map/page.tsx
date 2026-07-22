'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStoredState } from '@/lib/storage';
import { AppState, Mission } from '@/lib/types';

interface CampaignMission extends Mission {
  x: number;
  y: number;
  branches?: string[];
  difficulty: number;
}

const CAMPAIGN_MAP: CampaignMission[] = [
  {
    id: 'campaign-1',
    name: 'Outpost Alpha',
    x: 10,
    y: 20,
    type: 'combat',
    objective: 'Clear the first outpost',
    difficulty: 0.4,
    estimatedDurationSeconds: 120,
    skillsTested: ['Reaction Time', 'Accuracy'],
    skillsTrained: ['Aiming'],
    rewards: ['Baseline Weapon', 'Health Module'],
    locked: false,
    completed: false,
    adaptationReason: 'Your skill profile suggests starting here',
    adaptationSource: 'deterministic',
    branches: ['campaign-2a', 'campaign-2b'],
  },
  {
    id: 'campaign-2a',
    name: 'Shadow Corridor (Easy Path)',
    x: 30,
    y: 10,
    type: 'stealth',
    objective: 'Navigate quietly through restricted zone',
    difficulty: 0.5,
    estimatedDurationSeconds: 150,
    skillsTested: ['Patience', 'Planning'],
    skillsTrained: ['Stealth'],
    rewards: ['Stealth Gadget', 'Reconnaissance Data'],
    locked: true,
    completed: false,
    adaptationReason: 'Path recommended for cautious players',
    adaptationSource: 'deterministic',
    branches: ['campaign-3'],
  },
  {
    id: 'campaign-2b',
    name: 'Combat Convergence (Hard Path)',
    x: 50,
    y: 10,
    type: 'combat',
    objective: 'Fight through direct opposition',
    difficulty: 0.6,
    estimatedDurationSeconds: 200,
    skillsTested: ['Reaction Time', 'Risk Tolerance'],
    skillsTrained: ['Weapon Mastery'],
    rewards: ['Advanced Weapon', 'Armor Upgrade'],
    locked: true,
    completed: false,
    adaptationReason: 'Path recommended for aggressive players',
    adaptationSource: 'deterministic',
    branches: ['campaign-3'],
  },
  {
    id: 'campaign-3',
    name: 'Central Hub',
    x: 40,
    y: 50,
    type: 'puzzle',
    objective: 'Solve the central control puzzle',
    difficulty: 0.65,
    estimatedDurationSeconds: 180,
    skillsTested: ['Puzzle Solving', 'Decision Speed'],
    skillsTrained: ['Problem Solving'],
    rewards: ['Master Key', 'System Access'],
    locked: true,
    completed: false,
    adaptationReason: 'Convergence point for all paths',
    adaptationSource: 'deterministic',
    branches: ['campaign-4a', 'campaign-4b', 'campaign-4c'],
  },
  {
    id: 'campaign-4a',
    name: 'Research Archive',
    x: 20,
    y: 75,
    type: 'exploration',
    objective: 'Uncover hidden knowledge',
    difficulty: 0.55,
    estimatedDurationSeconds: 160,
    skillsTested: ['Pattern Recognition', 'Memory'],
    skillsTrained: ['Lore'],
    rewards: ['Research Notes', 'Artifact'],
    locked: true,
    completed: false,
  },
  {
    id: 'campaign-4b',
    name: 'Tactical Vault',
    x: 40,
    y: 75,
    type: 'combat',
    objective: 'Breach the tactical operations center',
    difficulty: 0.7,
    estimatedDurationSeconds: 220,
    skillsTested: ['All Skills', 'Adaptation Speed'],
    skillsTrained: ['Mastery'],
    rewards: ['Tactical Upgrade', 'Command Authorization'],
    locked: true,
    completed: false,
  },
  {
    id: 'campaign-4c',
    name: 'Neural Nexus',
    x: 60,
    y: 75,
    type: 'puzzle',
    objective: 'Navigate AI-controlled network',
    difficulty: 0.75,
    estimatedDurationSeconds: 240,
    skillsTested: ['Decision Speed', 'Pattern Recognition'],
    skillsTrained: ['Hacking'],
    rewards: ['Neural Interface', 'AI Fragment'],
    locked: true,
    completed: false,
  },
];

export default function CampaignMapPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredState();
    setState(stored);
  }, []);

  if (!state) return null;

  const selectedMissionData = CAMPAIGN_MAP.find(m => m.id === selectedMission);

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Campaign Map</h1>
          <p className="text-muted-foreground">
            Navigate through adaptive branching missions
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Map Visualization */}
          <div className="lg:col-span-2">
            <Card className="tactical-panel rounded-none p-8 relative aspect-video min-h-96">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full absolute inset-0 p-8"
              >
                {/* Background grid */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1="0"
                    y1={i * 10}
                    x2="100"
                    y2={i * 10}
                    stroke="var(--color-border)"
                    strokeWidth="0.1"
                    opacity="0.2"
                  />
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * 10}
                    y1="0"
                    x2={i * 10}
                    y2="100"
                    stroke="var(--color-border)"
                    strokeWidth="0.1"
                    opacity="0.2"
                  />
                ))}

                {/* Connection lines */}
                {CAMPAIGN_MAP.map(mission => {
                  if (!mission.branches) return null;
                  return mission.branches.map(branchId => {
                    const targetMission = CAMPAIGN_MAP.find(m => m.id === branchId);
                    if (!targetMission) return null;
                    return (
                      <line
                        key={`${mission.id}-${branchId}`}
                        x1={mission.x}
                        y1={mission.y}
                        x2={targetMission.x}
                        y2={targetMission.y}
                        stroke="var(--color-primary)"
                        strokeWidth="0.3"
                        opacity="0.3"
                      />
                    );
                  });
                })}

                {/* Mission nodes */}
                {CAMPAIGN_MAP.map((mission) => {
                  const isSelected = selectedMission === mission.id;
                  const isCompleted = state.completedCampaignMissions?.includes(mission.id);
                  const isLocked = mission.locked;

                  return (
                    <g key={mission.id}>
                      <circle
                        cx={mission.x}
                        cy={mission.y}
                        r="3"
                        fill={
                          isCompleted
                            ? 'var(--color-primary)'
                            : isSelected
                            ? 'var(--color-accent)'
                            : isLocked
                            ? 'var(--color-muted)'
                            : 'var(--color-primary)'
                        }
                        opacity={isLocked ? 0.4 : 1}
                        style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                        onClick={() => !isLocked && setSelectedMission(mission.id)}
                      />
                      <circle
                        cx={mission.x}
                        cy={mission.y}
                        r="3"
                        fill="none"
                        stroke={isSelected ? 'var(--color-accent)' : 'transparent'}
                        strokeWidth="1"
                        style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                        onClick={() => !isLocked && setSelectedMission(mission.id)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 text-xs space-y-1 text-muted-foreground">
                <p>● Active Mission</p>
                <p>● Available</p>
                <p>● Locked</p>
              </div>
            </Card>
          </div>

          {/* Mission Details */}
          <div>
            {selectedMissionData ? (
              <Card className="tactical-panel rounded-none p-6 sticky top-20 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedMissionData.name}</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedMissionData.objective}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-primary/10 border border-primary/30 px-2 py-1 rounded-sm capitalize">
                      {selectedMissionData.type}
                    </span>
                    <span className="text-xs bg-card border border-border/30 px-2 py-1 rounded-sm">
                      Difficulty: {(selectedMissionData.difficulty * 100).toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Skills */}
                <div className="border-t border-border/30 pt-4">
                  <p className="text-xs font-medium text-primary mb-2">TESTS</p>
                  <div className="space-y-1">
                    {selectedMissionData.skillsTested.map(skill => (
                      <p key={skill} className="text-sm text-muted-foreground">
                        • {skill}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Rewards */}
                <div className="border-t border-border/30 pt-4">
                  <p className="text-xs font-medium text-primary mb-2">REWARDS</p>
                  <div className="space-y-1">
                    {selectedMissionData.rewards.map(reward => (
                      <p key={reward} className="text-sm text-muted-foreground">
                        🎁 {reward}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-border/30 pt-4 space-y-2">
                  {!selectedMissionData.locked && (
                    <Button className="w-full bg-primary hover:bg-primary/90">
                      Start Mission
                    </Button>
                  )}
                  {selectedMissionData.locked && (
                    <div className="text-xs text-muted-foreground p-2 bg-card/50 border border-border/30 rounded-sm">
                      Complete prerequisites to unlock
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="tactical-panel rounded-none p-6 text-center text-muted-foreground">
                <p>Click a mission for details</p>
              </Card>
            )}
          </div>
        </div>

        {/* Campaign Summary */}
        <Card className="tactical-panel rounded-none p-8 mt-8">
          <h2 className="text-2xl font-bold mb-4">Campaign Structure</h2>
          <p className="text-muted-foreground text-sm mb-4">
            This campaign demonstrates adaptive branching based on playstyle:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>
              ✓ <strong>Early Choice:</strong> After Outpost Alpha, choose between stealth and combat paths
            </li>
            <li>
              ✓ <strong>Convergence:</strong> Both paths lead to Central Hub where difficulty equalizes
            </li>
            <li>
              ✓ <strong>Specialization:</strong> Final missions split by skill tier and playstyle
            </li>
            <li>
              ✓ <strong>Replay:</strong> Different choices lead to unique challenge combinations
            </li>
          </ul>
        </Card>

        {/* Navigation */}
        <div className="mt-12 flex gap-4 justify-center">
          <Button
            onClick={() => router.push('/campaign')}
            variant="outline"
            className="border-border hover:bg-card"
          >
            Campaign List View
          </Button>
          <Button
            onClick={() => router.push('/adaptation')}
            variant="outline"
            className="border-border hover:bg-card"
          >
            Adaptation Lab
          </Button>
        </div>
      </div>
    </div>
  );
}
