import type { GameState } from './types';

const STORAGE_KEY = 'yahtzee-kosci:state:v1';

/**
 * Zapisuje stan gry w localStorage. Cicho się nie wywala gdy storage jest niedostępny
 * (np. tryb prywatny w przeglądarce, środowisko SSR/Node) — gra dalej będzie działać,
 * tylko bez wznawiania po odświeżeniu.
 */
export function saveState(state: GameState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignorujemy QuotaExceededError i podobne
  }
}

export function loadState(): GameState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    // Minimalna walidacja — chronimy się przed uszkodzonym wpisem ze starych wersji.
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.players) ||
      !Array.isArray(parsed.dice) ||
      !Array.isArray(parsed.held)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearState(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
