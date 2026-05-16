/**
 * Centralny moduł typów stanu gry. Engine i UI używają tych samych nazw —
 * zero duplikacji, a kompilator pilnuje spójności kontraktu między warstwami.
 *
 * Typy `Category` itp. żyją w `./categories` razem ze stałymi, z których są
 * wyprowadzone — re-eksportujemy je tutaj, by warstwa UI miała jedno miejsce
 * importu.
 */

import type { Category } from './categories';

export type { Category, UpperCategory, LowerCategory } from './categories';

/** Wartość pojedynczej kości. Literal types pozwalają złapać "magiczne liczby" w runtime. */
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/** Komplet pięciu kości w rzucie. Rozmiar gwarantowany przez konstruktory w engine/dice.ts. */
export type Dice = readonly DieValue[];

/** Maska "zatrzymania" kości — pozycyjnie powiązana z `Dice`. */
export type Held = readonly boolean[];

/**
 * Kartka punktacji. `null` = nie wpisana, liczba (też 0) = już wykorzystana.
 * Rozróżnienie jest kluczowe: 0 punktów to legalny wpis (np. "Król" przy braku kombinacji),
 * a nie-wpisana kategoria jest wciąż dostępna do wyboru.
 */
export type Scorecard = Record<Category, number | null>;

export interface Player {
  readonly id: string;
  readonly name: string;
  readonly isAI: boolean;
  readonly scorecard: Scorecard;
}

export type GamePhase = 'setup' | 'playing' | 'finished';

export type LogEntryType = 'roll' | 'score' | 'turn-start' | 'game-end';

export interface LogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly playerId: string;
  readonly playerName: string;
  readonly type: LogEntryType;
  readonly message: string;
}

export interface GameState {
  readonly phase: GamePhase;
  readonly players: readonly Player[];
  readonly currentPlayerIndex: number;
  readonly dice: Dice;
  readonly held: Held;
  /**
   * Liczba pozostałych rzutów w bieżącej turze (3..0).
   * 3 = początek tury, nikt jeszcze nie rzucał; 0 = trzeba wpisać do tabelki.
   */
  readonly rollsLeft: number;
  readonly log: readonly LogEntry[];
}

export interface PlayerConfig {
  readonly name: string;
  readonly isAI: boolean;
}

/** Generator liczb pseudolosowych (kompatybilny z `Math.random`). Wstrzykiwany dla testów. */
export type RandomFn = () => number;
