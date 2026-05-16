import { ALL_CATEGORIES, UPPER_CATEGORIES } from './categories';
import { scoreCategory, availableCategories } from './scoring';
import type { Category, Dice, DieValue, GameState, Held, Player } from './types';

/**
 * Strategia AI — celowo nieskomplikowana, ale niegłupia:
 *
 *   1. Po rzucie liczymy "potencjał" każdej dostępnej kategorii (najlepszy wynik
 *      jaki realistycznie można uzyskać, gdyby zatrzymać sensowny podzbiór kości).
 *   2. Zatrzymujemy kości, które wnoszą wkład do kategorii z najwyższym potencjałem.
 *   3. Jeśli mamy "pewniaka" (np. wyrzuconego Króla, gdy kategoria jest otwarta) —
 *      nie marnujemy rzutów, od razu zapisujemy.
 *   4. Po trzecim rzucie wybieramy kategorię z najwyższym aktualnym wynikiem; gdy
 *      wszystkie dają 0 — poświęcamy najtańszą (Jedynki/Dwójki, ewentualnie Króla).
 *
 * Nie staramy się zaprogramować mistrza świata — celem jest, by AI grało rozsądnie
 * i było weryfikowalne testem (sanity).
 */

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

/** Czy obecny rzut już daje yahtzee / duży strit — wtedy nie warto rzucać dalej. */
function isPerfectScoreAvailable(dice: Dice, player: Player): boolean {
  if (player.scorecard.yahtzee === null && scoreCategory('yahtzee', dice) === 50) return true;
  if (player.scorecard.largeStraight === null && scoreCategory('largeStraight', dice) === 40) {
    return true;
  }
  return false;
}

/**
 * Heurystyczna wycena "ile pewnie da się tu jeszcze ugrać" — używana do priorytetyzacji
 * kategorii przy decyzji co trzymać. Im wyższy zwrot, tym bardziej kategoria jest "warta"
 * zachowania na nią rzutów.
 */
function categoryPotential(category: Category, dice: Dice): number {
  const c = counts(dice);
  switch (category) {
    case 'ones':
      return (c.get(1) ?? 0) * 1 + 3; // bonus za to, że można jeszcze dorzucić
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
      // im więcej "rdzenia" tym lepszy potencjał
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

/** Zatrzymywane kości jako pozycyjna maska zgodna z `state.held`. */
export function aiDecideHolds(state: GameState): Held {
  const player = state.players[state.currentPlayerIndex];
  const dice = state.dice;
  const available = availableCategories(player.scorecard);

  // Po ostatnim rzucie nie ma czego zatrzymywać.
  if (state.rollsLeft === 0) return state.held;

  // Wybór kategorii docelowej: najwyższy potencjał spośród dostępnych.
  let target: Category = available[0];
  let bestPotential = -Infinity;
  for (const cat of available) {
    const p = categoryPotential(cat, dice);
    if (p > bestPotential) {
      bestPotential = p;
      target = cat;
    }
  }

  // Decyzja "co trzymać" w zależności od kategorii docelowej.
  switch (target) {
    case 'ones':
    case 'twos':
    case 'threes':
    case 'fours':
    case 'fives':
    case 'sixes': {
      // Trzymamy wszystkie kości z wartością odpowiadającą kategorii.
      const value = UPPER_CATEGORIES.indexOf(target) + 1;
      return dice.map((d) => d === value);
    }
    case 'threeOfAKind':
    case 'fourOfAKind':
    case 'yahtzee': {
      // Trzymamy największą grupę identycznych wartości.
      const mode = modeValue(dice);
      if (mode === null) return state.held;
      return dice.map((d) => d === mode);
    }
    case 'fullHouse': {
      // Trzymamy dwie największe grupy.
      const c = counts(dice);
      const sorted = [...c.entries()].sort((a, b) => b[1] - a[1]);
      const keepValues = new Set(sorted.slice(0, 2).map(([v]) => v));
      return dice.map((d) => keepValues.has(d));
    }
    case 'smallStraight':
    case 'largeStraight': {
      // Trzymamy jedyne wystąpienia kości tworzących najdłuższy ciąg.
      const uniq = [...new Set(dice)].sort((a, b) => a - b);
      // Znajdujemy maksymalny ciąg w uniq.
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
      // Trzymamy 4-ki, 5-ki, 6-ki — dolne wartości warto przerzucić.
      return dice.map((d) => d >= 4);
    }
  }
}

/** Wybór kategorii do wpisania na końcu tury AI. */
export function aiPickCategory(state: GameState): Category {
  const player = state.players[state.currentPlayerIndex];
  const available = availableCategories(player.scorecard);

  // Najpierw: szukamy najwyższego natychmiastowego wyniku.
  let best: Category = available[0];
  let bestScore = -1;
  for (const cat of available) {
    const s = scoreCategory(cat, state.dice);
    if (s > bestScore) {
      best = cat;
      bestScore = s;
    }
  }

  // Jeśli wszystko dałoby 0 — poświęcamy kategorię o najmniejszej "wartości oczekiwanej",
  // którą przybliżamy maksymalnym możliwym wynikiem w danym wierszu.
  // Sortowanie rosnące: Jedynki (max 5) najpierw, Król (max 50) na końcu.
  if (bestScore === 0) {
    const sacrificeOrder: Category[] = [
      'ones', //  max 5
      'twos', //  max 10
      'threes', // max 15
      'fours', //  max 20
      'fives', //  max 25
      'fullHouse', // 25 (lub 0)
      'sixes', // max 30
      'threeOfAKind', // max 30
      'fourOfAKind', // max 30
      'smallStraight', // 30 (lub 0)
      'chance', // max 30
      'largeStraight', // 40 (lub 0)
      'yahtzee', // 50 (lub 0) — najcenniejsza, poświęcamy w ostateczności
    ];
    for (const cat of sacrificeOrder) {
      if (available.includes(cat)) return cat;
    }
  }

  return best;
}

/**
 * Decyduje, czy AI chce rzucać dalej, czy od razu zapisać wynik.
 * Zwraca `true` = zapisz teraz; `false` = jeszcze rzuć.
 */
export function aiShouldScoreNow(state: GameState): boolean {
  const player = state.players[state.currentPlayerIndex];
  if (state.rollsLeft === 0) return true;
  return isPerfectScoreAvailable(state.dice, player);
}

// Re-export ALL_CATEGORIES po stronie tego modułu, aby nie sięgać do `categories` z UI.
export { ALL_CATEGORIES };
