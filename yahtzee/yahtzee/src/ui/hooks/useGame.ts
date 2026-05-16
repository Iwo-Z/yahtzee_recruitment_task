import { useCallback, useEffect, useRef, useState } from 'react';
import type { Category, GameState, PlayerConfig } from '../../engine/types';
import {
  canRoll,
  canScore,
  createGame,
  rollAction,
  scoreAction,
  toggleHoldAction,
} from '../../engine/game';
import { aiDecideHolds, aiPickCategory, aiShouldScoreNow } from '../../engine/ai';

const AI_STEP_DELAY_MS = 900;

export type GameView =
  | { kind: 'setup' }
  | { kind: 'playing'; state: GameState }
  | { kind: 'finished'; state: GameState };

export interface UseGameApi {
  view: GameView;
  isAITurnActive: boolean;
  startGame: (configs: PlayerConfig[]) => void;
  roll: () => void;
  toggleHold: (index: number) => void;
  score: (category: Category) => void;
  restart: () => void;
  rollingTick: number;
}

export function useGame(): UseGameApi {
  const [state, setState] = useState<GameState | null>(null);
  const [rollingTick, setRollingTick] = useState(0);
  const [isAITurnActive, setIsAITurnActive] = useState(false);

  // stateRef żyje obok state, bo pętla setTimeout AI czyta go po zamknięciu
  const stateRef = useRef<GameState | null>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const startGame = useCallback((configs: PlayerConfig[]) => {
    const fresh = createGame(configs);
    setState(fresh);
  }, []);

  const restart = useCallback(() => {
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

      if (s.rollsLeft < 3 && aiShouldScoreNow(s)) {
        const cat = aiPickCategory(s);
        const t = window.setTimeout(() => {
          if (cancelled) return;
          setState((prev) => (prev && canScore(prev) ? scoreAction(prev, cat) : prev));
        }, AI_STEP_DELAY_MS);
        timers.push(t);
        return;
      }

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
    // deps celowo ograniczone do pól zmieniających turę AI
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
    roll,
    toggleHold,
    score,
    restart,
    rollingTick,
  };
}
