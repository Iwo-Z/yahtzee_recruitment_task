import type { Category } from './categories';

export type { Category, UpperCategory, LowerCategory } from './categories';

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export type Dice = readonly DieValue[];

export type Held = readonly boolean[];

/**
 * null = nie wpisana (dostępna do wyboru).
 * liczba (też 0) = już wykorzystana.
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
  readonly rollsLeft: number;
  readonly log: readonly LogEntry[];
}

export interface PlayerConfig {
  readonly name: string;
  readonly isAI: boolean;
}

export type RandomFn = () => number;
