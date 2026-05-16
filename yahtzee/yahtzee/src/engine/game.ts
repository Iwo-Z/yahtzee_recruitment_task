import { CATEGORY_LABELS } from './categories';
import { DICE_COUNT, defaultDice, defaultHeld, rollDice } from './dice';
import {
  emptyScorecard,
  isScorecardComplete,
  scoreCategory,
  totalScore,
} from './scoring';
import type {
  Category,
  GameState,
  Held,
  LogEntry,
  LogEntryType,
  Player,
  PlayerConfig,
  RandomFn,
} from './types';

/**
 * Architektura: czyste reducery `state -> state`. Brak klas, brak mutacji.
 * UI wywołuje je przez `setState(fn)` w hooku `useGame`, dzięki czemu
 * silnik można testować jednostkowo bez Reacta.
 */

let _idCounter = 0;
function nextId(): string {
  // Identyfikatory monotoniczne — proste, deterministyczne (wygodne w testach).
  return `e${++_idCounter}`;
}

/** Wyłącznie do testów — reset stanu modułu. */
export function _resetIdCounterForTests(): void {
  _idCounter = 0;
}

function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

function appendLog(
  state: GameState,
  player: Player,
  type: LogEntryType,
  message: string,
): readonly LogEntry[] {
  const entry: LogEntry = {
    id: nextId(),
    timestamp: Date.now(),
    playerId: player.id,
    playerName: player.name,
    type,
    message,
  };
  return [...state.log, entry];
}

export function createGame(configs: readonly PlayerConfig[]): GameState {
  if (configs.length < 2 || configs.length > 4) {
    throw new Error('Wymagane 2-4 graczy');
  }
  const players: Player[] = configs.map((cfg, i) => ({
    id: `p${i}`,
    name: cfg.name.trim() || `Gracz ${i + 1}`,
    isAI: cfg.isAI,
    scorecard: emptyScorecard(),
  }));

  const initialLog: LogEntry = {
    id: nextId(),
    timestamp: Date.now(),
    playerId: players[0].id,
    playerName: players[0].name,
    type: 'turn-start',
    message: `Tura: ${players[0].name}`,
  };

  return {
    phase: 'playing',
    players,
    currentPlayerIndex: 0,
    dice: defaultDice(),
    held: defaultHeld(),
    rollsLeft: 3,
    log: [initialLog],
  };
}

/**
 * Wykonuje rzut. Walidacja:
 *  - gra musi być w fazie 'playing'
 *  - muszą zostać dostępne rzuty
 * Pierwszy rzut tury (rollsLeft === 3) ignoruje flagi `held` i rzuca wszystkimi
 * kośćmi zgodnie ze specyfikacją.
 */
export function rollAction(state: GameState, random: RandomFn = Math.random): GameState {
  if (state.phase !== 'playing') {
    throw new Error('Gra nie jest w fazie rozgrywki');
  }
  if (state.rollsLeft <= 0) {
    throw new Error('Brak pozostałych rzutów — wybierz kategorię');
  }

  const isFirstRoll = state.rollsLeft === 3;
  const effectiveHeld: Held = isFirstRoll ? defaultHeld() : state.held;
  const newDice = rollDice(state.dice, effectiveHeld, random);
  const player = currentPlayer(state);

  return {
    ...state,
    dice: newDice,
    held: effectiveHeld,
    rollsLeft: state.rollsLeft - 1,
    log: appendLog(
      state,
      player,
      'roll',
      `Rzut ${4 - state.rollsLeft}: [${newDice.join(', ')}]`,
    ),
  };
}

/**
 * Przełącza flagę "zatrzymaj" dla jednej kości. Możliwe tylko między rzutami,
 * tj. gdy mamy rzucone kości (rollsLeft < 3), ale jeszcze możemy rzucać (rollsLeft > 0).
 */
export function toggleHoldAction(state: GameState, index: number): GameState {
  if (state.phase !== 'playing') return state;
  if (state.rollsLeft === 3) return state; // jeszcze nie rzucono — nie ma czego trzymać
  if (state.rollsLeft === 0) return state; // już bez rzutów — held nie ma znaczenia
  if (index < 0 || index >= DICE_COUNT) {
    throw new Error(`Nieprawidłowy indeks kości: ${index}`);
  }
  const newHeld = state.held.map((h, i) => (i === index ? !h : h));
  return { ...state, held: newHeld };
}

/**
 * Wpisuje punkty do wybranej kategorii bieżącego gracza i przekazuje turę dalej.
 * Walidacja:
 *  - gra w fazie 'playing'
 *  - kategoria jeszcze niewykorzystana
 *  - gracz musi mieć co najmniej jeden rzut wykonany (rollsLeft < 3)
 */
export function scoreAction(state: GameState, category: Category): GameState {
  if (state.phase !== 'playing') {
    throw new Error('Gra nie jest w fazie rozgrywki');
  }
  if (state.rollsLeft === 3) {
    throw new Error('Najpierw wykonaj rzut');
  }
  const player = currentPlayer(state);
  if (player.scorecard[category] !== null) {
    throw new Error(`Kategoria "${CATEGORY_LABELS[category]}" jest już wykorzystana`);
  }

  const points = scoreCategory(category, state.dice);
  const newScorecard = { ...player.scorecard, [category]: points };
  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, scorecard: newScorecard } : p,
  );

  const updatedPlayer = newPlayers[state.currentPlayerIndex];
  const allComplete = newPlayers.every((p) => isScorecardComplete(p.scorecard));
  const nextIndex = allComplete
    ? state.currentPlayerIndex
    : (state.currentPlayerIndex + 1) % newPlayers.length;

  const logAfterScore = appendLog(
    state,
    updatedPlayer,
    'score',
    `Wpisano ${points} pkt → "${CATEGORY_LABELS[category]}"`,
  );

  // Po zapisie: albo kończymy grę, albo zaczynamy turę kolejnego gracza.
  let finalLog = logAfterScore;
  if (allComplete) {
    const wins = winners(newPlayers);
    const winnerNames = wins.map((p) => p.name).join(', ');
    finalLog = [
      ...logAfterScore,
      {
        id: nextId(),
        timestamp: Date.now(),
        playerId: updatedPlayer.id,
        playerName: updatedPlayer.name,
        type: 'game-end',
        message:
          wins.length === 1
            ? `Koniec gry. Zwycięża: ${winnerNames}`
            : `Koniec gry. Remis: ${winnerNames}`,
      },
    ];
  } else {
    const nextPlayer = newPlayers[nextIndex];
    finalLog = [
      ...logAfterScore,
      {
        id: nextId(),
        timestamp: Date.now(),
        playerId: nextPlayer.id,
        playerName: nextPlayer.name,
        type: 'turn-start',
        message: `Tura: ${nextPlayer.name}`,
      },
    ];
  }

  return {
    ...state,
    players: newPlayers,
    currentPlayerIndex: nextIndex,
    dice: defaultDice(),
    held: defaultHeld(),
    rollsLeft: allComplete ? 0 : 3,
    phase: allComplete ? 'finished' : 'playing',
    log: finalLog,
  };
}

/** Zwycięzca(y) — może być więcej niż jeden w razie remisu. */
export function winners(players: readonly Player[]): Player[] {
  if (players.length === 0) return [];
  const totals = players.map((p) => totalScore(p.scorecard));
  const max = Math.max(...totals);
  return players.filter((_, i) => totals[i] === max);
}

/** Pomocnicze: czy gracz aktualnie ruszający może wykonać rzut. */
export function canRoll(state: GameState): boolean {
  return state.phase === 'playing' && state.rollsLeft > 0;
}

/** Pomocnicze: czy gracz może już wpisać punkty (wykonał ≥1 rzut). */
export function canScore(state: GameState): boolean {
  return state.phase === 'playing' && state.rollsLeft < 3;
}
