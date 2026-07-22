'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setHealth(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex w-full max-w-4xl flex-col items-center gap-8 px-6 py-16">
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-5xl font-bold tracking-tight">
            Hollow Vault
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            An adaptive AI Director backend system for roguelite games. Dynamically adjusts difficulty, prepares rooms, and provides optional reinforcement support based on player performance.
          </p>
        </div>

        <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-8">
          <h2 className="text-2xl font-bold mb-6">API Health Status</h2>
          
          {loading && (
            <div className="text-muted-foreground">Checking API health...</div>
          )}

          {error && (
            <div className="text-destructive">Error: {error}</div>
          )}

          {health && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Service Status: <code className="bg-muted px-2 py-1 rounded">{health.status}</code></span>
              </div>
              
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold">Features:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={health.adaptiveRooms?.enabled ? '✓' : '✗'}>Adaptive Rooms:</span>
                    <span className="text-muted-foreground">
                      {health.adaptiveRooms?.configured ? 'OpenAI configured' : 'Local fallback active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={health.adaptiveReinforcements?.enabled ? '✓' : '✗'}>Adaptive Reinforcements:</span>
                    <span className="text-muted-foreground">
                      {health.adaptiveReinforcements?.configured ? 'OpenAI configured' : 'Local fallback active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-semibold mb-3">API Endpoints:</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="text-muted-foreground">POST <code className="bg-muted px-2 py-1 rounded">/api/adaptive-rooms</code></div>
                  <div className="text-muted-foreground">POST <code className="bg-muted px-2 py-1 rounded">/api/adaptive-reinforcements</code></div>
                  <div className="text-muted-foreground">GET <code className="bg-muted px-2 py-1 rounded">/api/adaptive-difficulty</code></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full max-w-2xl rounded-lg border border-border bg-card/50 p-6 text-sm">
          <h3 className="font-semibold mb-2">How It Works</h3>
          <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
            <li>Game client sends player performance metrics to the API</li>
            <li>AI Director analyzes play style, difficulty trends, and performance</li>
            <li>System generates or selects appropriate next room with bounded adjustments</li>
            <li>Optional reinforcement suggestions provided based on room context</li>
            <li>Room source can be AI-generated (with OpenAI API) or locally prepared</li>
          </ol>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          <p>For details, see the <a href="https://github.com/erikalpysbaev30-source/hollow-vault" className="underline hover:text-foreground">GitHub repository</a></p>
        </div>
      </main>
    </div>
  );
}
