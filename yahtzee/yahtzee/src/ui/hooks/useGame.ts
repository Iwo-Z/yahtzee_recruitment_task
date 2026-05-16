import { useCallback, useEffect, useRef, useState } from 'react';
import type { Category, GameState, PlayerConfig } from '../../engine/types';
import {
  canRoll,
  canScore,
  createGame,
  rollAction,
  scoreAction,
  toggleHoldAction,
  winners,
} from '../../engine/game';
import { aiDecideHolds, aiPickCategory, aiShouldScoreNow } from '../../engine/ai';
import { clearState, loadState, saveState } from '../../engine/storage';

/**
 * Hook spinający czysty engine z React-owym stanem.
 *
 * - Wszystkie mutacje przechodzą przez czyste reducery (`rollAction`, `scoreAction`, ...).
 * - Stan synchronizowany do localStorage przez efekt — by wznowienie gry działało.
 * - Tury AI uruchamiane są w efekcie zależnym od `state.phase`/`currentPlayerIndex`/`rollsLeft`,
 *   z opóźnieniem dla efektu wizualnego (gracz widzi co się dzieje, a nie błyskawiczny skok).
 */

const AI_STEP_DELAY_MS = 900;

export type GameView =
  | { kind: 'setup' }
  | { kind: 'playing'; state: GameState }
  | { kind: 'finished'; state: GameState };

export interface UseGameApi {
  view: GameView;
  isAITurnActive: boolean;
  startGame: (configs: PlayerConfig[]) => void;
  resumeGame: () => boolean;
  hasSaved: boolean;
  roll: () => void;
  toggleHold: (index: number) => void;
  score: (category: Category) => void;
  restart: () => void;
  rollingTick: number; // monotonicznie rosnący licznik dla animacji rzutu
}

export function useGame(): UseGameApi {
  const [state, setState] = useState<GameState | null>(null);
  const [rollingTick, setRollingTick] = useState(0);
  const [isAITurnActive, setIsAITurnActive] = useState(false);
  const [hasSaved, setHasSaved] = useState<boolean>(() => loadState() !== null);

  // Trzymamy świeży stan w refie — pomocne w pętli AI, by uniknąć stale-closure
  // przy łańcuchu setTimeoutów.
  const stateRef = useRef<GameState | null>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Zapis do localStorage przy każdej zmianie stanu (i czyszczenie po zakończeniu).
  useEffect(() => {
    if (!state) return;
    if (state.phase === 'finished') {
      clearState();
      setHasSaved(false);
    } else {
      saveState(state);
      setHasSaved(true);
    }
  }, [state]);

  const startGame = useCallback((configs: PlayerConfig[]) => {
    const fresh = createGame(configs);
    setState(fresh);
  }, []);

  const resumeGame = useCallback((): boolean => {
    const loaded = loadState();
    if (loaded) {
      setState(loaded);
      return true;
    }
    return false;
  }, []);

  const restart = useCallback(() => {
    clearState();
    setHasSaved(false);
    setState(null);
  }, []);

  const roll = useCallback(() => {
    setState((prev) => {
      if (!prev || !canRoll(prev)) return prev;
      return rollAction(prev);
    });
    setRollingTick((t) => t + 1);
  }, []);

  const toggleHold = useCallback((index: number) => {
    setState((prev) => {
      if (!prev) return prev;
      // Pierwszy rzut i po ostatnim rzucie — hold nieaktywny.
      if (prev.rollsLeft === 3 || prev.rollsLeft === 0) return prev;
      return toggleHoldAction(prev, index);
    });
  }, []);

  const score = useCallback((category: Category) => {
    setState((prev) => {
      if (!prev || !canScore(prev)) return prev;
      return scoreAction(prev, category);
    });
  }, []);

  // Pętla AI: jeśli aktualny gracz jest AI, sterujemy turą krok po kroku.
  useEffect(() => {
    if (!state || state.phase !== 'playing') {
      setIsAITurnActive(false);
      return;
    }
    const current = state.players[state.currentPlayerIndex];
    if (!current.isAI) {
      setIsAITurnActive(false);
      return;
    }
    setIsAITurnActive(true);

    let cancelled = false;
    const timers: number[] = [];

    function step(): void {
      if (cancelled) return;
      const s = stateRef.current;
      if (!s || s.phase !== 'playing') return;
      const player = s.players[s.currentPlayerIndex];
      if (!player.isAI) return;

      // Decyzja: zapisać teraz, czy rzucać?
      if (s.rollsLeft < 3 && aiShouldScoreNow(s)) {
        const cat = aiPickCategory(s);
        const t = window.setTimeout(() => {
          if (cancelled) return;
          setState((prev) => (prev && canScore(prev) ? scoreAction(prev, cat) : prev));
        }, AI_STEP_DELAY_MS);
        timers.push(t);
        return;
      }

      // Przed rzutem ustawiamy holdy (oprócz pierwszego rzutu — tam i tak są ignorowane).
      if (s.rollsLeft < 3) {
        const wantHolds = aiDecideHolds(s);
        const t1 = window.setTimeout(() => {
          if (cancelled) return;
          setState((prev) => {
            if (!prev) return prev;
            let next = prev;
            for (let i = 0; i < wantHolds.length; i++) {
              if (next.held[i] !== wantHolds[i]) {
                next = toggleHoldAction(next, i);
              }
            }
            return next;
          });
          const t2 = window.setTimeout(() => {
            if (cancelled) return;
            setState((prev) => (prev && canRoll(prev) ? rollAction(prev) : prev));
            setRollingTick((t) => t + 1);
            const t3 = window.setTimeout(step, AI_STEP_DELAY_MS);
            timers.push(t3);
          }, AI_STEP_DELAY_MS);
          timers.push(t2);
        }, AI_STEP_DELAY_MS / 2);
        timers.push(t1);
      } else {
        // Pierwszy rzut — od razu rzucamy.
        const t = window.setTimeout(() => {
          if (cancelled) return;
          setState((prev) => (prev && canRoll(prev) ? rollAction(prev) : prev));
          setRollingTick((tk) => tk + 1);
          const t2 = window.setTimeout(step, AI_STEP_DELAY_MS);
          timers.push(t2);
        }, AI_STEP_DELAY_MS / 2);
        timers.push(t);
      }
    }

    step();

    return () => {
      cancelled = true;
      for (const t of timers) window.clearTimeout(t);
    };
    // Reagujemy tylko na zmiany "skoku" w turze AI, nie na cały obiekt state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.currentPlayerIndex, state?.rollsLeft, state?.players]);

  const view: GameView = !state
    ? { kind: 'setup' }
    : state.phase === 'finished'
      ? { kind: 'finished', state }
      : { kind: 'playing', state };

  return {
    view,
    isAITurnActive,
    startGame,
    resumeGame,
    hasSaved,
    roll,
    toggleHold,
    score,
    restart,
    rollingTick,
  };
}

export { winners };
