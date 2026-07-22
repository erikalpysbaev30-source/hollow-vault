'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Zap, Lock, Gamepad2, Settings } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="font-bold text-lg tracking-tight">ADAPTIVE//PROTOCOL</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="text-muted-foreground hover:text-foreground transition text-sm">
              About
            </button>
            <button className="text-muted-foreground hover:text-foreground transition text-sm">
              Learn
            </button>
            <Button
              onClick={() => router.push('/onboarding')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Enter
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                  The game studies how you play
                </h1>
                <p className="text-xl text-muted-foreground">
                  Not who you claim to be. Every mission adapts to your measured skill, learning speed, and playstyle.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => router.push('/onboarding')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg"
                >
                  Start Assessment
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  className="border-border hover:bg-card px-8 py-6 text-lg"
                >
                  Continue Campaign
                </Button>
              </div>

              <div className="pt-8 space-y-3 text-sm text-muted-foreground">
                <p>• Five deterministic assessment missions</p>
                <p>• Gameplay-derived skill profile</p>
                <p>• Adaptive campaign map</p>
                <p>• Fully playable without API keys</p>
              </div>
            </div>

            {/* Tactical Background Visualization */}
            <div className="relative h-96 tactical-panel rounded-none">
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full opacity-30"
              >
                <defs>
                  <linearGradient id="tactical-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-primary)" />
                    <stop offset="100%" stopColor="var(--color-accent)" />
                  </linearGradient>
                </defs>

                {/* Grid pattern */}
                {Array.from({ length: 20 }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1="0"
                    y1={i * 20}
                    x2="400"
                    y2={i * 20}
                    stroke="url(#tactical-gradient)"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                ))}
                {Array.from({ length: 20 }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * 20}
                    y1="0"
                    x2={i * 20}
                    y2="400"
                    stroke="url(#tactical-gradient)"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                ))}

                {/* Tactical markers */}
                <circle cx="100" cy="100" r="3" fill="var(--color-primary)" />
                <circle cx="300" cy="150" r="2" fill="var(--color-accent)" />
                <circle cx="150" cy="300" r="2.5" fill="var(--color-primary)" />
                <line
                  x1="100"
                  y1="100"
                  x2="300"
                  y2="150"
                  stroke="var(--color-accent)"
                  strokeWidth="1"
                  opacity="0.4"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="tactical-panel p-8 space-y-4">
              <div className="w-12 h-12 border border-primary/50 flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Gameplay Events</h3>
              <p className="text-muted-foreground text-sm">
                Every action—movement, aim, decisions, resource use—is recorded deterministically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="tactical-panel p-8 space-y-4">
              <div className="w-12 h-12 border border-primary/50 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Metric Aggregation</h3>
              <p className="text-muted-foreground text-sm">
                Reaction time, accuracy, decision speed, planning, and 8 other skill dimensions emerge from play.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="tactical-panel p-8 space-y-4">
              <div className="w-12 h-12 border border-primary/50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Adaptation Rules</h3>
              <p className="text-muted-foreground text-sm">
                Deterministic baseline adjusts gradually. Optional AI recommendation validates through safety limits.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="tactical-panel p-8 space-y-4">
              <div className="w-12 h-12 border border-primary/50 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Safety Limits</h3>
              <p className="text-muted-foreground text-sm">
                No impossible jumps. Difficulty shifts one tier per update. Validated against known ranges.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="tactical-panel p-8 space-y-4">
              <div className="w-12 h-12 border border-primary/50 flex items-center justify-center">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Player Control</h3>
              <p className="text-muted-foreground text-sm">
                Toggle AI. Adjust difficulty preference. View adaptation reasoning. Control all data locally.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="tactical-panel p-8 space-y-4">
              <div className="w-12 h-12 border border-primary/50 flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Next Mission</h3>
              <p className="text-muted-foreground text-sm">
                Final configuration is explained. You understand why you face what comes next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline Visualization */}
      <section className="py-20 px-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12">The Adaptation Pipeline</h2>

          <div className="tactical-panel p-8 rounded-none">
            <div className="overflow-x-auto">
              <div className="flex items-center gap-4 min-w-max py-8 px-4">
                <div className="text-center min-w-max">
                  <div className="bg-card border border-primary/30 px-4 py-3 rounded-sm mb-2">
                    <span className="text-sm font-mono">Gameplay Events</span>
                  </div>
                </div>

                <div className="text-primary">→</div>

                <div className="text-center min-w-max">
                  <div className="bg-card border border-primary/30 px-4 py-3 rounded-sm mb-2">
                    <span className="text-sm font-mono">Metric Aggregation</span>
                  </div>
                </div>

                <div className="text-primary">→</div>

                <div className="text-center min-w-max">
                  <div className="bg-card border border-primary/30 px-4 py-3 rounded-sm mb-2">
                    <span className="text-sm font-mono">Player Profile</span>
                  </div>
                </div>

                <div className="text-primary">→</div>

                <div className="text-center min-w-max">
                  <div className="bg-card border border-primary/30 px-4 py-3 rounded-sm mb-2">
                    <span className="text-sm font-mono">Deterministic Rules</span>
                  </div>
                </div>

                <div className="text-primary">→</div>

                <div className="text-center min-w-max">
                  <div className="bg-card border border-primary/30 px-4 py-3 rounded-sm mb-2">
                    <span className="text-sm font-mono">AI Recommendation</span>
                  </div>
                </div>

                <div className="text-primary">→</div>

                <div className="text-center min-w-max">
                  <div className="bg-card border border-primary/30 px-4 py-3 rounded-sm mb-2">
                    <span className="text-sm font-mono">Safety Validation</span>
                  </div>
                </div>

                <div className="text-primary">→</div>

                <div className="text-center min-w-max">
                  <div className="bg-card border border-primary/30 px-4 py-3 rounded-sm mb-2">
                    <span className="text-sm font-mono">Final Mission</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/30 text-center text-sm text-muted-foreground">
        <p>All player data persists locally. No registration required. No API keys necessary.</p>
        <p className="mt-2">Built with deterministic algorithms. Reproducible, transparent, fair.</p>
      </footer>
    </div>
  );
}
