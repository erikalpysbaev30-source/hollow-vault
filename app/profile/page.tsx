'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStoredState } from '@/lib/storage';
import { PlayerProfile } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    const state = getStoredState();
    setProfile(state.playerProfile);
  }, []);

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No profile data yet.</p>
          <p className="text-sm">Complete assessment missions to generate your skill profile.</p>
          <Button
            onClick={() => router.push('/assessment')}
            className="bg-primary hover:bg-primary/90"
          >
            Start Assessment
          </Button>
        </div>
      </div>
    );
  }

  const metrics = [
    { name: 'Reaction Speed', metric: profile.reactionSpeed },
    { name: 'Accuracy', metric: profile.accuracy },
    { name: 'Decision Speed', metric: profile.decisionSpeed },
    { name: 'Planning', metric: profile.planning },
    { name: 'Risk Tolerance', metric: profile.riskTolerance },
    { name: 'Pattern Recognition', metric: profile.patternRecognition },
    { name: 'Puzzle Solving', metric: profile.puzzleSolving },
    { name: 'Patience', metric: profile.patience },
    { name: 'Memory', metric: profile.memory },
    { name: 'Movement Efficiency', metric: profile.movementEfficiency },
    { name: 'Adaptation Speed', metric: profile.adaptationSpeed },
    { name: 'Learning Rate', metric: profile.learningRate },
  ];

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
            <h1 className="text-4xl font-bold">Your Skill Profile</h1>
            <p className="text-muted-foreground mt-1">
              Based on {Math.round(profile.overallConfidence * 10)} gameplay samples
            </p>
          </div>
        </div>

        {/* Overview */}
        <Card className="tactical-panel rounded-none p-8 mb-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Preferred Playstyle</p>
              <p className="text-2xl font-bold capitalize">{profile.preferredPlaystyle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Overall Confidence</p>
              <p className="text-2xl font-bold">{Math.round(profile.overallConfidence * 100)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm font-mono">{new Date(profile.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="pt-8 border-t border-border/30 space-y-2 text-sm text-muted-foreground">
            <p>✓ Based on gameplay events—not a personality test</p>
            <p>✓ Changes as more missions are completed</p>
            <p>✓ Drives adaptive difficulty adjustments</p>
          </div>
        </Card>

        {/* Metrics Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {metrics.map((item) => (
            <Card key={item.name} className="tactical-panel rounded-none p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium">{item.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(item.metric.confidence * 100)}% confident
                  </span>
                </div>

                {/* Value bar */}
                <div className="bg-card border border-border/30 rounded-sm overflow-hidden h-2">
                  <div
                    className="bg-primary h-full"
                    style={{
                      width: `${item.metric.value * 100}%`,
                    }}
                  />
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground">Score</p>
                    <p className="font-mono font-medium">
                      {(item.metric.value * 100).toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Samples</p>
                    <p className="font-mono font-medium">{item.metric.sampleCount}</p>
                  </div>
                </div>

                {/* Trend */}
                <p className="text-xs text-muted-foreground">
                  Trend:{' '}
                  <span
                    className={
                      item.metric.trend === 'increasing'
                        ? 'text-primary'
                        : item.metric.trend === 'decreasing'
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }
                  >
                    {item.metric.trend}
                  </span>
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => router.push('/campaign')}
            className="bg-primary hover:bg-primary/90"
          >
            Continue to Campaign
          </Button>
          <Button
            onClick={() => router.push('/adaptation')}
            variant="outline"
            className="border-border hover:bg-card"
          >
            View Adaptation Lab
          </Button>
        </div>
      </div>
    </div>
  );
}
