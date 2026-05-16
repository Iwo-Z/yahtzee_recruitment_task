import { UPPER_CATEGORIES } from './categories';
import { scoreCategory, availableCategories } from './scoring';
import type { Category, Dice, DieValue, GameState, Held, Player } from './types';

function counts(dice: Dice): Map<DieValue, number> {
  const m = new Map<DieValue, number>();
  for (const d of dice) m.set(d, (m.get(d) ?? 0) + 1);
  return m;
}

function modeValue(dice: Dice): DieValue | null {
  const c = counts(dice);
  let best: DieValue | null = null;
  let bestCount = 0;
  for (const [v, n] of c) {
    if (n > bestCount || (n === bestCount && best !== null && v > best)) {
      best = v;
      bestCount = n;
    }
  }
  return best;
}

function isPerfectScoreAvailable(dice: Dice, player: Player): boolean {
  if (player.scorecard.yahtzee === null && scoreCategory('yahtzee', dice) === 50) return true;
  if (player.scorecard.largeStraight === null && scoreCategory('largeStraight', dice) === 40) {
    return true;
  }
  return false;
}

function categoryPotential(category: Category, dice: Dice): number {
  const c = counts(dice);
  switch (category) {
    case 'ones':
      return (c.get(1) ?? 0) * 1 + 3;
    case 'twos':
      return (c.get(2) ?? 0) * 2 + 4;
    case 'threes':
      return (c.get(3) ?? 0) * 3 + 6;
    case 'fours':
      return (c.get(4) ?? 0) * 4 + 8;
    case 'fives':
      return (c.get(5) ?? 0) * 5 + 10;
    case 'sixes':
      return (c.get(6) ?? 0) * 6 + 12;
    case 'threeOfAKind': {
      const max = Math.max(0, ...c.values());
      return max >= 3 ? scoreCategory('threeOfAKind', dice) : max * 6;
    }
    case 'fourOfAKind': {
      const max = Math.max(0, ...c.values());
      return max >= 4 ? scoreCategory('fourOfAKind', dice) : max * 5;
    }
    case 'fullHouse': {
      const groups = [...c.values()].sort((a, b) => b - a);
      if (groups[0] === 5) return 25;
      if (groups[0] >= 3 && (groups[1] ?? 0) >= 2) return 25;
      if (groups[0] >= 3) return 18;
      if (groups[0] === 2 && (groups[1] ?? 0) === 2) return 18;
      return 5;
    }
    case 'smallStraight':
      return scoreCategory('smallStraight', dice) > 0 ? 30 : longestRun(dice) * 6;
    case 'largeStraight':
      return scoreCategory('largeStraight', dice) > 0 ? 40 : longestRun(dice) * 7;
    case 'yahtzee': {
      const max = Math.max(0, ...c.values());
      return max === 5 ? 50 : max * max * 2;
    }
    case 'chance':
      return dice.reduce<number>((a, b) => a + b, 0);
  }
}

function longestRun(dice: Dice): number {
  const uniq = [...new Set(dice)].sort((a, b) => a - b);
  let longest = 1;
  let cur = 1;
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i] === uniq[i - 1] + 1) {
      cur++;
      longest = Math.max(longest, cur);
    } else {
      cur = 1;
    }
  }
  return longest;
}

export function aiDecideHolds(state: GameState): Held {
  const player = state.players[state.currentPlayerIndex];
  const dice = state.dice;
  const available = availableCategories(player.scorecard);

  if (state.rollsLeft === 0) return state.held;

  let target: Category = available[0];
  let bestPotential = -Infinity;
  for (const cat of available) {
    const p = categoryPotential(cat, dice);
    if (p > bestPotential) {
      bestPotential = p;
      target = cat;
    }
  }

  switch (target) {
    case 'ones':
    case 'twos':
    case 'threes':
    case 'fours':
    case 'fives':
    case 'sixes': {
      const value = UPPER_CATEGORIES.indexOf(target) + 1;
      return dice.map((d) => d === value);
    }
    case 'threeOfAKind':
    case 'fourOfAKind':
    case 'yahtzee': {
      const mode = modeValue(dice);
      if (mode === null) return state.held;
      return dice.map((d) => d === mode);
    }
    case 'fullHouse': {
      const c = counts(dice);
      const sorted = [...c.entries()].sort((a, b) => b[1] - a[1]);
      const keepValues = new Set(sorted.slice(0, 2).map(([v]) => v));
      return dice.map((d) => keepValues.has(d));
    }
    case 'smallStraight':
    case 'largeStraight': {
      const uniq = [...new Set(dice)].sort((a, b) => a - b);
      let bestStart = uniq[0];
      let bestLen = 1;
      let curStart = uniq[0];
      let curLen = 1;
      for (let i = 1; i < uniq.length; i++) {
        if (uniq[i] === uniq[i - 1] + 1) {
          curLen++;
        } else {
          curStart = uniq[i];
          curLen = 1;
        }
        if (curLen > bestLen) {
          bestLen = curLen;
          bestStart = curStart;
        }
      }
      const keep = new Set<number>();
      for (let i = 0; i < bestLen; i++) keep.add(bestStart + i);
      const taken = new Set<number>();
      return dice.map((d) => {
        if (keep.has(d) && !taken.has(d)) {
          taken.add(d);
          return true;
        }
        return false;
      });
    }
    case 'chance': {
      return dice.map((d) => d >= 4);
    }
  }
}

export function aiPickCategory(state: GameState): Category {
  const player = state.players[state.currentPlayerIndex];
  const available = availableCategories(player.scorecard);

  let best: Category = available[0];
  let bestScore = -1;
  for (const cat of available) {
    const s = scoreCategory(cat, state.dice);
    if (s > bestScore) {
      best = cat;
      bestScore = s;
    }
  }

  if (bestScore === 0) {
    const sacrificeOrder: Category[] = [
      'ones',         //  max 5
      'twos',         //  max 10
      'threes',       //  max 15
      'fours',        //  max 20
      'fives',        //  max 25
      'fullHouse',    //  25 (lub 0)
      'sixes',        //  max 30
      'threeOfAKind', //  max 30
      'fourOfAKind',  //  max 30
      'smallStraight',//  30 (lub 0)
      'chance',       //  max 30
      'largeStraight',//  40 (lub 0)
      'yahtzee',      //  50 (lub 0) — poświęcamy w ostateczności
    ];
    for (const cat of sacrificeOrder) {
      if (available.includes(cat)) return cat;
    }
  }

  return best;
}

export function aiShouldScoreNow(state: GameState): boolean {
  const player = state.players[state.currentPlayerIndex];
  if (state.rollsLeft === 0) return true;
  return isPerfectScoreAvailable(state.dice, player);
}
