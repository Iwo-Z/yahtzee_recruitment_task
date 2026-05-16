import { describe, expect, test } from 'vitest';
import {
  emptyScorecard,
  scoreCategory,
  upperSubtotal,
  upperBonus,
  totalScore,
  isScorecardComplete,
  availableCategories,
  pointsToBonus,
} from '../engine/scoring';
import { ALL_CATEGORIES } from '../engine/categories';
import type { Dice, Scorecard } from '../engine/types';

describe('górna sekcja (sumy oczek)', () => {
  test('Jedynki — same jedynki', () => {
    expect(scoreCategory('ones', [1, 1, 1, 1, 1])).toBe(5);
  });

  test('Jedynki — mieszany rzut', () => {
    expect(scoreCategory('ones', [1, 1, 3, 4, 5])).toBe(2);
  });

  test('Jedynki — brak jedynek', () => {
    expect(scoreCategory('ones', [2, 3, 4, 5, 6])).toBe(0);
  });

  test('Szóstki — pełna grupa', () => {
    expect(scoreCategory('sixes', [6, 6, 6, 6, 6])).toBe(30);
  });

  test('Trójki — różne wartości', () => {
    expect(scoreCategory('threes', [3, 3, 3, 1, 2])).toBe(9);
  });
});

describe('3 jednakowe', () => {
  test('dokładnie trzy → suma wszystkich', () => {
    expect(scoreCategory('threeOfAKind', [3, 3, 3, 4, 5])).toBe(18);
  });
  test('cztery jednakowe spełniają warunek', () => {
    expect(scoreCategory('threeOfAKind', [3, 3, 3, 3, 5])).toBe(17);
  });
  test('pięć jednakowych spełnia warunek', () => {
    expect(scoreCategory('threeOfAKind', [3, 3, 3, 3, 3])).toBe(15);
  });
  test('tylko para — 0 pkt', () => {
    expect(scoreCategory('threeOfAKind', [3, 3, 4, 5, 6])).toBe(0);
  });
});

describe('4 jednakowe', () => {
  test('cztery jednakowe → suma wszystkich', () => {
    expect(scoreCategory('fourOfAKind', [5, 5, 5, 5, 2])).toBe(22);
  });
  test('pięć jednakowych spełnia warunek 4 jednakowych', () => {
    expect(scoreCategory('fourOfAKind', [4, 4, 4, 4, 4])).toBe(20);
  });
  test('tylko trzy jednakowe — 0 pkt', () => {
    expect(scoreCategory('fourOfAKind', [5, 5, 5, 2, 3])).toBe(0);
  });
});

describe('Full', () => {
  test('klasyczny full (3+2) → 25', () => {
    expect(scoreCategory('fullHouse', [2, 2, 3, 3, 3])).toBe(25);
  });
  test('inny układ 3+2', () => {
    expect(scoreCategory('fullHouse', [6, 6, 6, 1, 1])).toBe(25);
  });
  test('5 jednakowych spełnia warunek Full (zgodnie ze specyfikacją)', () => {
    expect(scoreCategory('fullHouse', [4, 4, 4, 4, 4])).toBe(25);
  });
  test('4+1 — to NIE jest full', () => {
    expect(scoreCategory('fullHouse', [2, 2, 2, 2, 5])).toBe(0);
  });
  test('3+1+1 — to NIE jest full', () => {
    expect(scoreCategory('fullHouse', [2, 2, 2, 5, 6])).toBe(0);
  });
});

describe('Mały strit', () => {
  test('1-2-3-4 → 30', () => {
    expect(scoreCategory('smallStraight', [1, 2, 3, 4, 4])).toBe(30);
  });
  test('2-3-4-5 → 30', () => {
    expect(scoreCategory('smallStraight', [2, 3, 4, 5, 5])).toBe(30);
  });
  test('3-4-5-6 → 30', () => {
    expect(scoreCategory('smallStraight', [3, 4, 5, 6, 1])).toBe(30);
  });
  test('duży strit zawiera mały → 30', () => {
    expect(scoreCategory('smallStraight', [1, 2, 3, 4, 5])).toBe(30);
    expect(scoreCategory('smallStraight', [2, 3, 4, 5, 6])).toBe(30);
  });
  test('brak 4 kolejnych → 0', () => {
    expect(scoreCategory('smallStraight', [1, 2, 3, 5, 6])).toBe(0);
    expect(scoreCategory('smallStraight', [1, 1, 2, 3, 6])).toBe(0);
  });
});

describe('Duży strit', () => {
  test('1-2-3-4-5 → 40', () => {
    expect(scoreCategory('largeStraight', [1, 2, 3, 4, 5])).toBe(40);
  });
  test('2-3-4-5-6 → 40', () => {
    expect(scoreCategory('largeStraight', [2, 3, 4, 5, 6])).toBe(40);
  });
  test('mały strit nie wystarcza', () => {
    expect(scoreCategory('largeStraight', [1, 2, 3, 4, 6])).toBe(0);
  });
  test('powtórzenia psują dużego strita', () => {
    expect(scoreCategory('largeStraight', [1, 2, 3, 4, 4])).toBe(0);
  });
});

describe('Król (yahtzee)', () => {
  test('pięć jednakowych → 50', () => {
    expect(scoreCategory('yahtzee', [4, 4, 4, 4, 4])).toBe(50);
  });
  test('cztery jednakowe — 0', () => {
    expect(scoreCategory('yahtzee', [4, 4, 4, 4, 5])).toBe(0);
  });
});

describe('Szansa', () => {
  test('zawsze suma wszystkich', () => {
    expect(scoreCategory('chance', [1, 2, 3, 4, 5])).toBe(15);
    expect(scoreCategory('chance', [6, 6, 6, 6, 6])).toBe(30);
    expect(scoreCategory('chance', [1, 1, 1, 1, 1])).toBe(5);
  });
});

describe('premia w górnej sekcji', () => {
  function build(values: Partial<Scorecard>): Scorecard {
    return { ...emptyScorecard(), ...values };
  }

  test('poniżej progu — brak premii', () => {
    const sc = build({ ones: 5, twos: 10, threes: 15, fours: 20, fives: 10 }); // = 60
    expect(upperSubtotal(sc)).toBe(60);
    expect(upperBonus(sc)).toBe(0);
  });

  test('dokładnie próg 63 — premia 35', () => {
    const sc = build({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 }); // 63
    expect(upperSubtotal(sc)).toBe(63);
    expect(upperBonus(sc)).toBe(35);
  });

  test('powyżej progu — premia 35', () => {
    const sc = build({ ones: 5, twos: 10, threes: 15, fours: 20, fives: 25, sixes: 30 });
    expect(upperSubtotal(sc)).toBe(105);
    expect(upperBonus(sc)).toBe(35);
  });

  test('pointsToBonus liczy ile brakuje', () => {
    expect(pointsToBonus(build({ ones: 5 }))).toBe(58);
    expect(pointsToBonus(build({ ones: 5, twos: 10, threes: 15, fours: 20, fives: 25 }))).toBe(0);
  });
});

describe('suma całkowita', () => {
  test('suma = góra + premia + dół', () => {
    const sc: Scorecard = {
      ...emptyScorecard(),
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
      yahtzee: 50,
      chance: 20,
    };
    // 63 + 35 (premia) + 50 + 20 = 168
    expect(totalScore(sc)).toBe(168);
  });

  test('pusta tabelka — 0', () => {
    expect(totalScore(emptyScorecard())).toBe(0);
  });
});

describe('stan tabelki', () => {
  test('isScorecardComplete — pusta = false', () => {
    expect(isScorecardComplete(emptyScorecard())).toBe(false);
  });

  test('isScorecardComplete — pełna (zero też się liczy)', () => {
    const sc = emptyScorecard();
    for (const c of ALL_CATEGORIES) sc[c] = 0;
    expect(isScorecardComplete(sc)).toBe(true);
  });

  test('availableCategories zwraca tylko niewypełnione', () => {
    const sc = emptyScorecard();
    sc.ones = 5;
    sc.yahtzee = 0;
    const avail = availableCategories(sc);
    expect(avail).not.toContain('ones');
    expect(avail).not.toContain('yahtzee');
    expect(avail.length).toBe(11);
  });
});

describe('dice — sanity', () => {
  test('wszystkie kości w zakresie 1..6', () => {
    const dice: Dice = [1, 2, 3, 4, 5];
    expect(dice.every((d) => d >= 1 && d <= 6)).toBe(true);
  });
});
