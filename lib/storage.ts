import { AppState, DEFAULT_APP_STATE } from './types';

const STORAGE_KEY = 'adaptive_protocol_v1';
const VERSION = 1;

interface StorageData {
  version: number;
  data: AppState;
  lastUpdated: string;
}

export function getStoredState(): AppState {
  if (typeof window === 'undefined') return DEFAULT_APP_STATE;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_APP_STATE;

    const parsed: StorageData = JSON.parse(stored);
    
    if (parsed.version !== VERSION) {
      console.warn('Storage version mismatch, using defaults');
      return DEFAULT_APP_STATE;
    }

    return { ...DEFAULT_APP_STATE, ...parsed.data };
  } catch (error) {
    console.error('Failed to read stored state:', error);
    return DEFAULT_APP_STATE;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;

  try {
    const data: StorageData = {
      version: VERSION,
      data: state,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

export function resetDemo(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
