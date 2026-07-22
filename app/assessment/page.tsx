'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameplaySession, SkillMetric } from '@/lib/types';
import { getStoredState, saveState } from '@/lib/storage';
import { updatePlayerProfile } from '@/lib/adaptation';
import { ArrowRight, Play, Check } from 'lucide-react';

const MISSIONS = [
  {
    id: 'reflex-gate',
    name: 'Reflex Gate',
    objective: 'React quickly to incoming threats',
    description: 'Fast-paced reflexive combat. Measures reaction time and accuracy.',
    tests: ['Reaction Time', 'Accuracy', 'Movement Efficiency'],
  },
  {
    id: 'threat-matrix',
    name: 'Threat Matrix',
    objective: 'Prioritize and respond to multiple threats',
    description: 'Complex decision-making under pressure. Measures tactical thinking.',
    tests: ['Decision Speed', 'Pattern Recognition', 'Risk Assessment'],
  },
  {
    id: 'resource-divide',
    name: 'Resource Divide',
    objective: 'Manage limited resources wisely',
    description: 'Resource scarcity and strategic choices. Measures planning.',
    tests: ['Resource Efficiency', 'Planning', 'Patience'],
  },
  {
    id: 'echo-sequence',
    name: 'Echo Sequence',
    objective: 'Solve memory-based puzzles',
    description: 'Pattern memorization and learning. Measures cognitive skills.',
    tests: ['Memory', 'Puzzle Solving', 'Learning Rate'],
  },
  {
    id: 'convergence-trial',
    name: 'Convergence Trial',
    objective: 'Master all previous skills under pressure',
    description: 'Comprehensive final assessment. Measures adaptation speed.',
    tests: ['All Skills', 'Adaptation', 'Cross-Mechanic Planning'],
  },
];

export default function AssessmentPage() {
  const router = useRouter();
  const [currentMission, setCurrentMission] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [completed, setCompleted] = useState<string[]>(() => {
    const state = getStoredState();
    return state.completedAssessmentMissions;
  });

  const generateMockGameplaySession = (missionId: string): GameplaySession => {
    // Deterministic but varied mock gameplay based on mission
    const missionIndex = MISSIONS.findIndex(m => m.id === missionId);
    const seed = missionIndex * 17 + 42;

    return {
      missionId,
      completed: true,
      completionTimeSeconds: 45 + (missionIndex * 15),
      deaths: Math.max(0, missionIndex - 1),
      shotsFired: 80 + missionIndex * 30,
      shotsHit: 65 + missionIndex * 20,
      damageTaken: 20 + missionIndex * 10,
      damageDealt: 150 + missionIndex * 40,
      resourcesCollected: 30 + missionIndex * 10,
      resourcesUsed: 20 + missionIndex * 8,
      movementDistance: 500 + missionIndex * 100,
      optimalMovementDistance: 450 + missionIndex * 90,
      optionalRisksTaken: missionIndex * 2,
      safeOptionsChosen: 5 - missionIndex,
      hintsUsed: Math.max(0, 3 - missionIndex),
      puzzleAttempts: 8 + missionIndex * 5,
      puzzleMistakes: Math.max(0, 4 - missionIndex),
      memorySequenceLength: 3 + missionIndex,
      decisions: Array.from({ length: 10 + missionIndex * 5 }).map((_, i) => ({
        type: ['react', 'decide', 'aim'][i % 3],
        reactionTimeMs: 200 + (seed * i) % 300,
        successful: Math.random() > 0.2,
      })),
    };
  };

  const handleStartMission = useCallback(() => {
    setGameRunning(true);
  }, []);

  const handleCompleteMission = useCallback(() => {
    const mission = MISSIONS[currentMission];
    const session = generateMockGameplaySession(mission.id);

    // Update state
    const state = getStoredState();
    const newCompleted = [...state.completedAssessmentMissions, mission.id];
    setCompleted(newCompleted);

    // Update profile
    const sessions = [session];
    const updatedProfile = updatePlayerProfile(state.playerProfile, sessions);

    // Save state
    const newState = {
      ...state,
      completedAssessmentMissions: newCompleted,
      playerProfile: updatedProfile,
    };
    saveState(newState);

    setGameRunning(false);

    // Move to next mission or complete assessment
    if (currentMission < MISSIONS.length - 1) {
      setCurrentMission(currentMission + 1);
    } else {
      router.push('/campaign');
    }
  }, [currentMission, router]);

  if (gameRunning) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <Card className="tactical-panel rounded-none p-12 text-center space-y-8">
            <h2 className="text-3xl font-bold">{MISSIONS[currentMission].name}</h2>
            
            <div className="bg-card/50 border border-primary/30 p-8 rounded-sm min-h-48 flex flex-col items-center justify-center space-y-4">
              <div className="text-6xl">⚔️</div>
              <p className="text-lg text-muted-foreground">Mission in progress...</p>
              <p className="text-sm text-muted-foreground">{MISSIONS[currentMission].objective}</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-sm">
                {MISSIONS[currentMission].tests.map((test) => (
                  <div key={test} className="bg-primary/10 border border-primary/30 p-2 rounded-sm">
                    {test}
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCompleteMission}
              className="bg-primary hover:bg-primary/90 text-primary-foreground w-full py-3"
            >
              Complete Mission
              <Check className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Assessment Missions</h1>
          <p className="text-muted-foreground">
            Complete five missions to establish your skill profile. You&apos;ll measure reaction time, accuracy, decision-making, planning, and more.
          </p>
        </div>

        {/* Missions Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MISSIONS.map((mission, idx) => {
            const isCompleted = completed.includes(mission.id);
            const isCurrent = idx === currentMission;
            const isLocked = idx > currentMission && !isCompleted;

            return (
              <Card
                key={mission.id}
                className={`tactical-panel rounded-none p-6 transition cursor-pointer ${
                  isLocked
                    ? 'opacity-50 cursor-not-allowed'
                    : isCurrent
                    ? 'border-primary/50 bg-primary/5'
                    : isCompleted
                    ? 'border-border/50'
                    : 'border-border hover:border-border/70'
                }`}
                onClick={() => !isLocked && setCurrentMission(idx)}
              >
                {/* Mission number and status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl font-bold text-muted-foreground opacity-30">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  {isCompleted && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>

                {/* Mission info */}
                <h3 className="text-xl font-bold mb-2">{mission.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {mission.description}
                </p>

                {/* Skills tested */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-primary">Measures:</p>
                  {mission.tests.map((test) => (
                    <div
                      key={test}
                      className="text-xs bg-card/50 border border-border/30 rounded-sm px-2 py-1"
                    >
                      {test}
                    </div>
                  ))}
                </div>

                {/* Action */}
                {isCurrent && !isCompleted && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartMission();
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Start Mission
                    <Play className="w-4 h-4 ml-2" />
                  </Button>
                )}

                {isCompleted && (
                  <div className="text-xs text-primary font-medium">✓ Completed</div>
                )}

                {isLocked && (
                  <div className="text-xs text-muted-foreground">
                    Complete previous missions to unlock
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Progress */}
        <Card className="tactical-panel rounded-none p-6 mt-12">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Assessment Progress</p>
              <h2 className="text-2xl font-bold">
                {completed.length} of {MISSIONS.length} missions completed
              </h2>
            </div>

            {completed.length === MISSIONS.length && (
              <Button
                onClick={() => router.push('/campaign')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                View Profile & Campaign
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-6 bg-card border border-border/50 rounded-sm overflow-hidden h-2">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{
                width: `${(completed.length / MISSIONS.length) * 100}%`,
              }}
            />
          </div>
        </Card>

        {/* Skip option */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              const state = getStoredState();
              saveState({
                ...state,
                assessmentSkipped: true,
                playerProfile: updatePlayerProfile(null, []),
              });
              router.push('/campaign');
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition underline"
          >
            Skip assessment (creates balanced profile)
          </button>
        </div>
      </div>
    </div>
  );
}
