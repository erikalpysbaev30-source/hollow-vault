import {
  GameplaySession, PlayerProfile, SkillMetric, LevelConfiguration, 
  PreferredPlaystyle, LEVEL_LIMITS, AIRecommendation, ValidationCorrection
} from './types';

// Utility functions
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

// Metric Calculation Functions
export function calculateAccuracy(session: GameplaySession): number {
  return session.shotsFired > 0 ? session.shotsHit / session.shotsFired : 0;
}

export function calculateAverageReactionTime(session: GameplaySession): number {
  if (session.decisions.length === 0) return 300;
  const sum = session.decisions.reduce((acc, d) => acc + d.reactionTimeMs, 0);
  return sum / session.decisions.length;
}

export function calculateDecisionSpeed(session: GameplaySession): number {
  if (session.decisions.length === 0) return 0.5;
  const avgReactionTime = calculateAverageReactionTime(session);
  return 1 - normalize(avgReactionTime, 100, 800);
}

export function calculateFailureRate(sessions: GameplaySession[]): number {
  if (sessions.length === 0) return 0;
  const failed = sessions.filter(s => !s.completed).length;
  return failed / sessions.length;
}

export function calculateMovementEfficiency(session: GameplaySession): number {
  if (session.optimalMovementDistance === 0) return 0.5;
  return clamp(session.optimalMovementDistance / session.movementDistance, 0, 1);
}

export function calculateResourceEfficiency(session: GameplaySession): number {
  if (session.resourcesCollected === 0) return 0.5;
  return clamp(1 - session.resourcesUsed / session.resourcesCollected, 0, 1);
}

export function calculatePuzzlePerformance(session: GameplaySession): number {
  if (session.puzzleAttempts === 0) return 0.5;
  const successRate = 1 - session.puzzleMistakes / session.puzzleAttempts;
  return clamp(successRate, 0, 1);
}

export function detectPlaystyle(sessions: GameplaySession[]): PreferredPlaystyle {
  if (sessions.length === 0) return 'balanced';

  const avgAggressiveness = sessions.reduce((acc, s) => acc + s.optionalRisksTaken, 0) / sessions.length / 5;
  const avgCaution = sessions.reduce((acc, s) => acc + s.safeOptionsChosen, 0) / sessions.length / 5;
  const avgDamageOutput = sessions.reduce((acc, s) => acc + s.damageDealt, 0) / sessions.length / 100;
  const avgResourceConservation = sessions.reduce((acc, s) => acc + calculateResourceEfficiency(s), 0) / sessions.length;

  const scores = {
    aggressive: avgAggressiveness + avgDamageOutput * 0.5,
    cautious: avgCaution + (1 - avgAggressiveness),
    strategic: avgResourceConservation + calculatePuzzlePerformance(sessions[sessions.length - 1]) * 0.5,
    balanced: 0.5,
  };

  const maxScore = Math.max(...Object.values(scores));
  const threshold = 0.55;

  if (scores.aggressive >= maxScore && scores.aggressive > threshold) return 'aggressive';
  if (scores.cautious >= maxScore && scores.cautious > threshold) return 'cautious';
  if (scores.strategic >= maxScore && scores.strategic > threshold) return 'strategic';
  return 'balanced';
}

export function calculateSkillConfidence(samples: number, variance: number): number {
  const requiredSamples = 5;
  const sampleConfidence = clamp(samples / requiredSamples, 0, 1);
  const consistencyConfidence = 1 - normalize(variance, 0, 0.3);
  return clamp(sampleConfidence * 0.7 + consistencyConfidence * 0.3, 0, 1);
}

// Profile Update Function
export function updatePlayerProfile(
  previousProfile: PlayerProfile | null,
  newSessions: GameplaySession[]
): PlayerProfile {
  if (newSessions.length === 0 && previousProfile) return previousProfile;

  const allSessions = previousProfile ? 
    [...(previousProfile as any).sessions || [], ...newSessions] : 
    newSessions;

  const recentSessions = allSessions.slice(-10);
  const completedSessions = recentSessions.filter(s => s.completed);

  const avgReactionTime = recentSessions.length > 0 
    ? recentSessions.reduce((acc, s) => acc + calculateAverageReactionTime(s), 0) / recentSessions.length
    : 300;

  const reactionSpeed: SkillMetric = {
    value: 1 - normalize(avgReactionTime, 100, 800),
    confidence: calculateSkillConfidence(recentSessions.length, 50),
    sampleCount: recentSessions.length,
    trend: 'stable',
  };

  const accuracy: SkillMetric = {
    value: recentSessions.length > 0
      ? recentSessions.reduce((acc, s) => acc + calculateAccuracy(s), 0) / recentSessions.length
      : 0.5,
    confidence: calculateSkillConfidence(recentSessions.length, 0.15),
    sampleCount: recentSessions.length,
    trend: 'stable',
  };

  return {
    reactionSpeed,
    accuracy,
    decisionSpeed: { value: calculateDecisionSpeed(recentSessions[0] || { decisions: [] } as any), confidence: 0.6, sampleCount: recentSessions.length, trend: 'stable' },
    planning: { value: 0.5, confidence: 0.4, sampleCount: recentSessions.length, trend: 'increasing' },
    riskTolerance: { value: detectPlaystyle(recentSessions) === 'aggressive' ? 0.7 : 0.5, confidence: 0.5, sampleCount: recentSessions.length, trend: 'stable' },
    patternRecognition: { value: 0.55, confidence: 0.45, sampleCount: recentSessions.length, trend: 'stable' },
    puzzleSolving: { value: calculatePuzzlePerformance(recentSessions[recentSessions.length - 1] || {} as any), confidence: 0.5, sampleCount: recentSessions.length, trend: 'stable' },
    patience: { value: 0.5, confidence: 0.4, sampleCount: recentSessions.length, trend: 'stable' },
    memory: { value: 0.52, confidence: 0.3, sampleCount: recentSessions.length, trend: 'stable' },
    movementEfficiency: { value: calculateMovementEfficiency(recentSessions[0] || {} as any), confidence: 0.6, sampleCount: recentSessions.length, trend: 'stable' },
    adaptationSpeed: { value: 0.5, confidence: 0.35, sampleCount: recentSessions.length, trend: 'stable' },
    learningRate: { value: 0.55, confidence: 0.4, sampleCount: recentSessions.length, trend: 'increasing' },
    preferredPlaystyle: detectPlaystyle(recentSessions),
    overallConfidence: clamp(recentSessions.length / 10, 0, 1),
    updatedAt: new Date().toISOString(),
  };
}

// Deterministic Baseline Configuration
export function createDeterministicBaseline(
  profile: PlayerProfile,
  missionDifficulty: number
): LevelConfiguration {
  const difficultyMultiplier = missionDifficulty;
  
  return {
    enemyDensity: clamp(0.4 + profile.riskTolerance.value * 0.3, ...LEVEL_LIMITS.enemyDensity),
    enemyAggression: clamp(0.35 + profile.riskTolerance.value * 0.25, ...LEVEL_LIMITS.enemyAggression),
    spawnIntervalSeconds: clamp(4.5 - profile.reactionSpeed.value * 1.5, ...LEVEL_LIMITS.spawnIntervalSeconds),
    reinforcementDelaySeconds: clamp(12 + (1 - profile.riskTolerance.value) * 10, ...LEVEL_LIMITS.reinforcementDelaySeconds),
    resourceMultiplier: clamp(0.9 + profile.planning.value * 0.3, ...LEVEL_LIMITS.resourceMultiplier),
    puzzleComplexity: clamp(0.3 + profile.puzzleSolving.value * 0.4, ...LEVEL_LIMITS.puzzleComplexity),
    hintFrequency: clamp(0.5 - profile.patience.value * 0.3, ...LEVEL_LIMITS.hintFrequency),
    timePressure: clamp(0.3 + profile.decisionSpeed.value * 0.4, ...LEVEL_LIMITS.timePressure),
    distractionCount: clamp(Math.round(2 + profile.focus.value * 2), ...LEVEL_LIMITS.distractionCount),
    precisionRequirement: clamp(0.4 + profile.accuracy.value * 0.3, ...LEVEL_LIMITS.precisionRequirement),
    tutorialIntensity: profile.overallConfidence < 0.4 ? 0.8 : 0.2,
  };
}

// Mock AI Recommendation
export function createMockAIRecommendation(
  profile: PlayerProfile,
  recentSessions: GameplaySession[],
  seed: string
): AIRecommendation {
  const hash = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 100;
  
  return {
    enemyDensity: 0.6 + (hash % 20) / 100,
    enemyAggression: 0.5 + ((hash + 15) % 20) / 100,
    reinforcementDelaySeconds: 12 + ((hash + 30) % 15),
    resourceMultiplier: 0.95 + ((hash + 45) % 15) / 100,
    puzzleComplexity: 0.5 + ((hash + 60) % 20) / 100,
    hintFrequency: 0.4 - ((hash + 75) % 15) / 100,
    timePressure: 0.45 + ((hash + 90) % 20) / 100,
    recommendedFocus: detectPlaystyle(recentSessions) === 'aggressive' ? 'flanking threats' : 'resource management',
    reasonCodes: ['profile_match', 'recent_performance', 'playstyle_preference'],
    confidence: 0.78,
  };
}

// Validation
export function validateRecommendation(
  recommendation: AIRecommendation,
  baseline: LevelConfiguration
): ValidationCorrection[] {
  const corrections: ValidationCorrection[] = [];

  const fields: (keyof LevelConfiguration)[] = [
    'enemyDensity', 'enemyAggression', 'reinforcementDelaySeconds',
    'resourceMultiplier', 'puzzleComplexity', 'hintFrequency',
    'timePressure'
  ];

  for (const field of fields) {
    if (field in recommendation) {
      const value = (recommendation as any)[field];
      const [min, max] = LEVEL_LIMITS[field] || [0, 1];
      if (value < min || value > max) {
        corrections.push({
          field,
          requestedValue: value,
          appliedValue: clamp(value, min, max),
          reason: `Value ${value} outside safe range [${min}, ${max}]`,
        });
      }
    }
  }

  return corrections;
}

// Final Configuration
export function createFinalLevelConfiguration(
  baseline: LevelConfiguration,
  validatedRecommendation: LevelConfiguration | null
): LevelConfiguration {
  if (!validatedRecommendation) return baseline;

  return {
    ...baseline,
    ...Object.fromEntries(
      Object.entries(validatedRecommendation).map(([k, v]) => [k, clamp(v as number, 0, 1)])
    ),
  };
}
