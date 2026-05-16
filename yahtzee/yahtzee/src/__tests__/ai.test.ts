import { describe, expect, test } from 'vitest';
import { aiDecideHolds, aiPickCategory, aiShouldScoreNow } from '../engine/ai';
import { createGame, rollAction, scoreAction } from '../engine/game';
import type { Dice } from '../engine/types';

const PLAYERS = [
  { name: 'AI-1', isAI: true },
  { name: 'AI-2', isAI: true },
] as const;

function withDice(dice: Dice, rollsLeft = 2) {
  const g = createGame(PLAYERS);
  // Mockujemy stan jak po pierwszym rzucie:
  return {
    ...g,
    dice,
    rollsLeft,
    held: [false, false, false, false, false] as const,
  };
}

describe('aiDecideHolds', () => {
  test('trzyma wszystkie kości tego samego typu przy 4 jednakowych', () => {
    const state = withDice([6, 6, 6, 6, 2]);
    const held = aiDecideHolds(state);
    expect(held).toEqual([true, true, true, true, false]);
  });

  test('trzyma piątkę przy wyrzuconym Królu', () => {
    const state = withDice([3, 3, 3, 3, 3]);
    const held = aiDecideHolds(state);
    expect(held).toEqual([true, true, true, true, true]);
  });

  test('po ostatnim rzucie nic nie zmienia', () => {
    const state = withDice([1, 2, 3, 4, 5], 0);
    expect(aiDecideHolds(state)).toEqual(state.held);
  });
});

describe('aiPickCategory', () => {
  test('wybiera Króla gdy 5 jednakowych', () => {
    const state = withDice([5, 5, 5, 5, 5], 0);
    expect(aiPickCategory(state)).toBe('yahtzee');
  });

  test('wybiera duży strit dla 1-2-3-4-5', () => {
    const state = withDice([1, 2, 3, 4, 5], 0);
    expect(aiPickCategory(state)).toBe('largeStraight');
  });

  test('przy zerowych wszędzie poświęca kategorię nisko-ryzykowną', () => {
    // Dice 2,3,4,5,6 — nie ma yahtzee, nie ma fullHouse, ale chance daje >0.
    // Robimy więc stan, gdzie również chance jest niedostępne (już wykorzystane),
    // a wszystkie pozostałe dają 0.
    let state = withDice([1, 2, 3, 5, 6], 0);
    // Wymuszamy: zostały tylko kategorie z wynikiem 0.
    const sc = { ...state.players[0].scorecard };
    sc.ones = 1;
    sc.twos = 2;
    sc.threes = 3;
    sc.fives = 5;
    sc.sixes = 6;
    sc.chance = 17;
    sc.threeOfAKind = 0;
    sc.fourOfAKind = 0;
    sc.fullHouse = 0;
    sc.smallStraight = 0;
    sc.largeStraight = 40;
    // Pozostały: fours, yahtzee
    state = {
      ...state,
      players: state.players.map((p, i) => (i === 0 ? { ...p, scorecard: sc } : p)),
    };
    // Z poniższych: fours daje 4, yahtzee daje 0. Algorytm powinien wybrać fours (najwyższy >0).
    expect(aiPickCategory(state)).toBe('fours');
  });
});

describe('aiShouldScoreNow', () => {
  test('po ostatnim rzucie zawsze tak', () => {
    const state = withDice([1, 2, 3, 4, 5], 0);
    expect(aiShouldScoreNow(state)).toBe(true);
  });

  test('przy wyrzuconym Królu — zapisz teraz', () => {
    const state = withDice([6, 6, 6, 6, 6], 2);
    expect(aiShouldScoreNow(state)).toBe(true);
  });

  test('w innych przypadkach — rzucamy dalej', () => {
    const state = withDice([1, 2, 3, 4, 6], 2);
    expect(aiShouldScoreNow(state)).toBe(false);
  });
});

describe('AI gra całą grę bez wyjątku', () => {
  test('symulacja pełnej gry 2 botów się kończy poprawnie', () => {
    let g = createGame(PLAYERS);
    let safety = 1000;
    while (g.phase !== 'finished' && safety-- > 0) {
      if (aiShouldScoreNow(g)) {
        if (g.rollsLeft === 3) {
          // Bez rzutu nie da się wpisać — wymuś jeden.
          g = rollAction(g);
        }
        const cat = aiPickCategory(g);
        g = scoreAction(g, cat);
      } else {
        const holds = aiDecideHolds(g);
        g = { ...g, held: holds };
        g = rollAction(g);
      }
    }
    expect(g.phase).toBe('finished');
    expect(safety).toBeGreaterThan(0);
  });
});
