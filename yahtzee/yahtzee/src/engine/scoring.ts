import {
  ALL_CATEGORIES,
  UPPER_CATEGORIES,
  LOWER_CATEGORIES,
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
} from './categories';
import type { Category, Dice, DieValue, Scorecard } from './types';

function counts(dice: Dice): Record<DieValue, number> {
  const c: Record<DieValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of dice) c[d]++;
  return c;
}

function sum(dice: Dice): number {
  return dice.reduce((acc, d) => acc + d, 0);
}

function hasStraight(dice: Dice, length: 4 | 5): boolean {
  const present = new Set(dice);
  const maxStart = 7 - length;
  for (let start = 1; start <= maxStart; start++) {
    let ok = true;
    for (let i = 0; i < length; i++) {
      if (!present.has((start + i) as DieValue)) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export function scoreCategory(category: Category, dice: Dice): number {
  switch (category) {
    case 'ones':
      return counts(dice)[1] * 1;
    case 'twos':
      return counts(dice)[2] * 2;
    case 'threes':
      return counts(dice)[3] * 3;
    case 'fours':
      return counts(dice)[4] * 4;
    case 'fives':
      return counts(dice)[5] * 5;
    case 'sixes':
      return counts(dice)[6] * 6;

    case 'threeOfAKind': {
      const c = counts(dice);
      return (Object.values(c) as number[]).some((n) => n >= 3) ? sum(dice) : 0;
    }

    case 'fourOfAKind': {
      const c = counts(dice);
      return (Object.values(c) as number[]).some((n) => n >= 4) ? sum(dice) : 0;
    }

    case 'fullHouse': {
      const c = counts(dice);
      const groups = (Object.values(c) as number[]).filter((n) => n > 0).sort();
      if (groups.length === 2 && groups[0] === 2 && groups[1] === 3) return 25;
      // 5 jednakowych spełnia warunek Full (zgodnie ze specyfikacją)
      if (groups.length === 1 && groups[0] === 5) return 25;
      return 0;
    }

    case 'smallStraight':
      return hasStraight(dice, 4) ? 30 : 0;

    case 'largeStraight':
      return hasStraight(dice, 5) ? 40 : 0;

    case 'yahtzee': {
      const c = counts(dice);
      return (Object.values(c) as number[]).some((n) => n === 5) ? 50 : 0;
    }

    case 'chance':
      return sum(dice);
  }
}

export function emptyScorecard(): Scorecard {
  const sc = {} as Scorecard;
  for (const c of ALL_CATEGORIES) sc[c] = null;
  return sc;
}

export function availableCategories(scorecard: Scorecard): Category[] {
  return ALL_CATEGORIES.filter((c) => scorecard[c] === null);
}

export function isScorecardComplete(scorecard: Scorecard): boolean {
  return ALL_CATEGORIES.every((c) => scorecard[c] !== null);
}

export function upperSubtotal(scorecard: Scorecard): number {
  return UPPER_CATEGORIES.reduce((acc, c) => acc + (scorecard[c] ?? 0), 0);
}

export function upperBonus(scorecard: Scorecard): number {
  return upperSubtotal(scorecard) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_VALUE : 0;
}

export function pointsToBonus(scorecard: Scorecard): number {
  return Math.max(0, UPPER_BONUS_THRESHOLD - upperSubtotal(scorecard));
}

export function lowerSubtotal(scorecard: Scorecard): number {
  return LOWER_CATEGORIES.reduce((acc, c) => acc + (scorecard[c] ?? 0), 0);
}

export function totalScore(scorecard: Scorecard): number {
  return upperSubtotal(scorecard) + upperBonus(scorecard) + lowerSubtotal(scorecard);
}
