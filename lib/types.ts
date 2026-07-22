// Domain Types for ADAPTIVE//PROTOCOL

export type PreferredPlaystyle = 'aggressive' | 'balanced' | 'strategic' | 'cautious';
export type ControlMethod = 'keyboard-mouse' | 'controller' | 'touch';
export type MissionType = 'reflex' | 'threat' | 'resource' | 'puzzle' | 'convergence' | 'campaign' | 'boss' | 'training';
export type AdaptationSource = 'deterministic' | 'ai-assisted' | 'local-fallback';

export interface SkillMetric {
  value: number;
  confidence: number;
  sampleCount: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface PlayerProfile {
  reactionSpeed: SkillMetric;
  accuracy: SkillMetric;
  decisionSpeed: SkillMetric;
  planning: SkillMetric;
  riskTolerance: SkillMetric;
  patternRecognition: SkillMetric;
  puzzleSolving: SkillMetric;
  patience: SkillMetric;
  memory: SkillMetric;
  movementEfficiency: SkillMetric;
  adaptationSpeed: SkillMetric;
  learningRate: SkillMetric;
  preferredPlaystyle: PreferredPlaystyle;
  overallConfidence: number;
  updatedAt: string;
}

export interface LevelConfiguration {
  enemyDensity: number;
  enemyAggression: number;
  spawnIntervalSeconds: number;
  reinforcementDelaySeconds: number;
  resourceMultiplier: number;
  puzzleComplexity: number;
  hintFrequency: number;
  timePressure: number;
  distractionCount: number;
  precisionRequirement: number;
  tutorialIntensity: number;
}

export interface GameplayDecision {
  type: string;
  reactionTimeMs: number;
  successful: boolean;
}

export interface GameplaySession {
  missionId: string;
  completed: boolean;
  completionTimeSeconds: number;
  deaths: number;
  shotsFired: number;
  shotsHit: number;
  damageTaken: number;
  damageDealt: number;
  resourcesCollected: number;
  resourcesUsed: number;
  movementDistance: number;
  optimalMovementDistance: number;
  optionalRisksTaken: number;
  safeOptionsChosen: number;
  hintsUsed: number;
  puzzleAttempts: number;
  puzzleMistakes: number;
  memorySequenceLength: number;
  decisions: GameplayDecision[];
}

export interface AIRecommendation {
  enemyDensity: number;
  enemyAggression: number;
  reinforcementDelaySeconds: number;
  resourceMultiplier: number;
  puzzleComplexity: number;
  hintFrequency: number;
  timePressure: number;
  recommendedFocus: string;
  reasonCodes: string[];
  confidence: number;
}

export interface ValidationCorrection {
  field: keyof LevelConfiguration;
  requestedValue: number;
  appliedValue: number;
  reason: string;
}

export interface AdaptationRecord {
  id: string;
  missionId: string;
  createdAt: string;
  profileSnapshot: PlayerProfile;
  deterministicBaseline: LevelConfiguration;
  aiRecommendation: AIRecommendation | null;
  finalConfiguration: LevelConfiguration;
  corrections: ValidationCorrection[];
  source: AdaptationSource;
}

export interface Mission {
  id: string;
  name: string;
  type: MissionType;
  objective: string;
  difficulty: number;
  estimatedDurationSeconds: number;
  skillsTested: string[];
  skillsTrained: string[];
  rewards: string[];
  unlockRequirement?: string;
  locked: boolean;
  completed: boolean;
  adaptationReason?: string;
  adaptationSource?: AdaptationSource;
}

export interface AppState {
  // Onboarding
  onboardingComplete: boolean;
  displayName: string;
  preferredDifficulty: 'easy' | 'normal' | 'hard';
  previousGamingExperience: 'beginner' | 'intermediate' | 'veteran';
  controlMethod: ControlMethod;
  mouseSensitivity: number;
  controllerSensitivity: number;
  
  // Assessment
  completedAssessmentMissions: string[];
  assessmentSkipped: boolean;
  
  // Player Profile
  playerProfile: PlayerProfile | null;
  profileConfidence: number;
  
  // Campaign
  campaignProgress: number;
  completedMissions: AdaptationRecord[];
  selectedMission: string | null;
  
  // Accessibility
  subtitlesEnabled: boolean;
  colorblindMode: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  textScale: number;
  audioVolume: number;
  
  // Preferences
  transparencyPreference: 'detailed' | 'summary' | 'minimal';
  aiEnabled: boolean;
  
  // Developer
  developmentMode: boolean;
}

export const DEFAULT_APP_STATE: AppState = {
  onboardingComplete: false,
  displayName: 'Rook',
  preferredDifficulty: 'normal',
  previousGamingExperience: 'intermediate',
  controlMethod: 'keyboard-mouse',
  mouseSensitivity: 1,
  controllerSensitivity: 1,
  completedAssessmentMissions: [],
  assessmentSkipped: false,
  playerProfile: null,
  profileConfidence: 0,
  campaignProgress: 0,
  completedMissions: [],
  selectedMission: null,
  subtitlesEnabled: true,
  colorblindMode: false,
  reducedMotion: false,
  highContrast: false,
  textScale: 1,
  audioVolume: 0.7,
  transparencyPreference: 'detailed',
  aiEnabled: true,
  developmentMode: false,
};

export const LEVEL_LIMITS = {
  enemyDensity: [0.3, 0.9] as const,
  enemyAggression: [0.25, 0.85] as const,
  spawnIntervalSeconds: [1.2, 4.5] as const,
  reinforcementDelaySeconds: [8, 30] as const,
  resourceMultiplier: [0.7, 1.4] as const,
  puzzleComplexity: [0.15, 0.9] as const,
  hintFrequency: [0.05, 0.8] as const,
  timePressure: [0.1, 0.85] as const,
  distractionCount: [0, 6] as const,
  precisionRequirement: [0.2, 0.9] as const,
  tutorialIntensity: [0, 1] as const,
} as const;
