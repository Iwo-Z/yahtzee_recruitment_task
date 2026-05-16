import { describe, expect, test } from 'vitest';
import {
  canRoll,
  canScore,
  createGame,
  rollAction,
  scoreAction,
  toggleHoldAction,
  winners,
} from '../engine/game';
import { totalScore } from '../engine/scoring';
import { ALL_CATEGORIES } from '../engine/categories';
import type { Category } from '../engine/types';

const TWO_PLAYERS = [
  { name: 'Anna', isAI: false },
  { name: 'Bartek', isAI: false },
] as const;

describe('createGame', () => {
  test('inicjuje fazę playing i pierwszego gracza', () => {
    const g = createGame(TWO_PLAYERS);
    expect(g.phase).toBe('playing');
    expect(g.players).toHaveLength(2);
    expect(g.currentPlayerIndex).toBe(0);
    expect(g.rollsLeft).toBe(3);
    expect(g.dice).toHaveLength(5);
    expect(g.held).toEqual([false, false, false, false, false]);
    expect(g.log).toHaveLength(1);
    expect(g.log[0].type).toBe('turn-start');
  });

  test('odrzuca <2 graczy', () => {
    expect(() => createGame([{ name: 'A', isAI: false }])).toThrow();
  });

  test('odrzuca >4 graczy', () => {
    expect(() =>
      createGame([
        { name: 'A', isAI: false },
        { name: 'B', isAI: false },
        { name: 'C', isAI: false },
        { name: 'D', isAI: false },
        { name: 'E', isAI: false },
      ]),
    ).toThrow();
  });

  test('puste imiona dostają domyślne', () => {
    const g = createGame([
      { name: '   ', isAI: false },
      { name: '', isAI: true },
    ]);
    expect(g.players[0].name).toBe('Gracz 1');
    expect(g.players[1].name).toBe('Gracz 2');
  });
});

describe('rollAction', () => {
  test('zmniejsza liczbę pozostałych rzutów', () => {
    let g = createGame(TWO_PLAYERS);
    g = rollAction(g);
    expect(g.rollsLeft).toBe(2);
  });

  test('pierwszy rzut ignoruje flagę held', () => {
    let g = createGame(TWO_PLAYERS);
    // Próbujemy wymusić held przed pierwszym rzutem (powinno być no-op):
    g = toggleHoldAction(g, 0);
    expect(g.held[0]).toBe(false); // toggleHold nie działa przed pierwszym rzutem

    // Wymusiamy stan z `held[0] = true` ręcznie i wywołujemy rollAction:
    const tampered = { ...g, held: [true, false, false, false, false] as const };
    const result = rollAction(tampered, () => 0); // RNG zwraca 1
    expect(result.dice).toEqual([1, 1, 1, 1, 1]); // first roll → all 1s, ignore held
  });

  test('drugi rzut respektuje held', () => {
    let g = createGame(TWO_PLAYERS);
    g = rollAction(g, () => 0.5); // RNG → wartość 4
    // Teraz wszystkie kości to 4
    expect(g.dice).toEqual([4, 4, 4, 4, 4]);
    // Trzymamy 0 i 1
    g = toggleHoldAction(g, 0);
    g = toggleHoldAction(g, 1);
    // Rzut ponownie z innym RNG
    g = rollAction(g, () => 0); // → wartość 1
    expect(g.dice[0]).toBe(4);
    expect(g.dice[1]).toBe(4);
    expect(g.dice[2]).toBe(1);
    expect(g.dice[3]).toBe(1);
    expect(g.dice[4]).toBe(1);
  });

  test('po trzech rzutach rzucanie rzuca błędem', () => {
    let g = createGame(TWO_PLAYERS);
    g = rollAction(g);
    g = rollAction(g);
    g = rollAction(g);
    expect(g.rollsLeft).toBe(0);
    expect(() => rollAction(g)).toThrow(/Brak/);
  });
});

describe('toggleHoldAction', () => {
  test('nie działa przed pierwszym rzutem', () => {
    const g = createGame(TWO_PLAYERS);
    const after = toggleHoldAction(g, 2);
    expect(after.held[2]).toBe(false);
  });

  test('nie działa po trzecim rzucie', () => {
    let g = createGame(TWO_PLAYERS);
    g = rollAction(g);
    g = rollAction(g);
    g = rollAction(g);
    const after = toggleHoldAction(g, 0);
    expect(after.held[0]).toBe(false);
  });

  test('działa między rzutami', () => {
    let g = createGame(TWO_PLAYERS);
    g = rollAction(g);
    g = toggleHoldAction(g, 2);
    expect(g.held[2]).toBe(true);
    g = toggleHoldAction(g, 2);
    expect(g.held[2]).toBe(false);
  });

  test('odrzuca nieprawidłowy indeks', () => {
    let g = createGame(TWO_PLAYERS);
    g = rollAction(g);
    expect(() => toggleHoldAction(g, -1)).toThrow();
    expect(() => toggleHoldAction(g, 5)).toThrow();
  });
});

describe('scoreAction', () => {
  test('wymaga wcześniejszego rzutu', () => {
    const g = createGame(TWO_PLAYERS);
    expect(() => scoreAction(g, 'ones')).toThrow(/rzut/);
  });

  test('nie można wpisać do już użytej kategorii', () => {
    let g = createGame(TWO_PLAYERS);
    g = rollAction(g, () => 0); // wszystkie jedynki
    g = scoreAction(g, 'ones');
    // Tura B
    g = rollAction(g, () => 0);
    g = scoreAction(g, 'ones');
    // Tura A znów
    g = rollAction(g, () => 0);
    expect(() => scoreAction(g, 'ones')).toThrow(/wykorzystana/);
  });

  test('przekazuje turę kolejnemu graczowi i resetuje stan rzutów', () => {
    let g = createGame(TWO_PLAYERS);
    g = rollAction(g);
    g = scoreAction(g, 'chance');
    expect(g.currentPlayerIndex).toBe(1);
    expect(g.rollsLeft).toBe(3);
    expect(g.held).toEqual([false, false, false, false, false]);
  });

  test('po wypełnieniu wszystkich kategorii — koniec gry', () => {
    let g = createGame(TWO_PLAYERS);
    // Wypełniamy całkowicie obu graczy: 13 kategorii × 2 graczy = 26 wpisów.
    for (let round = 0; round < 13; round++) {
      const cat: Category = ALL_CATEGORIES[round];
      for (let p = 0; p < 2; p++) {
        g = rollAction(g, () => 0); // wszystkie jedynki, ale to bez znaczenia
        g = scoreAction(g, cat);
      }
    }
    expect(g.phase).toBe('finished');
    expect(g.players.every((p) => Object.values(p.scorecard).every((v) => v !== null))).toBe(true);
    // Log powinien zawierać wpis o końcu gry
    expect(g.log.some((l) => l.type === 'game-end')).toBe(true);
  });
});

describe('winners', () => {
  test('jeden zwycięzca', () => {
    const g = createGame(TWO_PLAYERS);
    const modified = {
      ...g,
      players: [
        { ...g.players[0], scorecard: { ...g.players[0].scorecard, chance: 30 } },
        { ...g.players[1], scorecard: { ...g.players[1].scorecard, chance: 10 } },
      ],
    };
    const w = winners(modified.players);
    expect(w).toHaveLength(1);
    expect(w[0].name).toBe('Anna');
  });

  test('remis', () => {
    const g = createGame(TWO_PLAYERS);
    const tied = {
      ...g,
      players: g.players.map((p) => ({
        ...p,
        scorecard: { ...p.scorecard, chance: 30 },
      })),
    };
    const w = winners(tied.players);
    expect(w).toHaveLength(2);
  });
});

describe('canRoll / canScore', () => {
  test('w fazie setup nie można rzucać ani wpisywać', () => {
    const g = createGame(TWO_PLAYERS);
    const setup = { ...g, phase: 'setup' as const };
    expect(canRoll(setup)).toBe(false);
    expect(canScore(setup)).toBe(false);
  });

  test('początek tury — można rzucać, nie można wpisywać', () => {
    const g = createGame(TWO_PLAYERS);
    expect(canRoll(g)).toBe(true);
    expect(canScore(g)).toBe(false);
  });

  test('po rzucie — można rzucać i wpisywać', () => {
    let g = createGame(TWO_PLAYERS);
    g = rollAction(g);
    expect(canRoll(g)).toBe(true);
    expect(canScore(g)).toBe(true);
  });

  test('po trzecim rzucie — tylko wpisywać', () => {
    let g = createGame(TWO_PLAYERS);
    g = rollAction(g);
    g = rollAction(g);
    g = rollAction(g);
    expect(canRoll(g)).toBe(false);
    expect(canScore(g)).toBe(true);
  });
});

describe('integracja: pełna tura', () => {
  test('Anna gra jedną pełną turę', () => {
    let g = createGame(TWO_PLAYERS);

    // Rzut 1: wszystkie 5
    g = rollAction(g, () => 0); // → wszystkie jedynki
    expect(g.dice).toEqual([1, 1, 1, 1, 1]);

    // Trzymamy 3 jedynki, resztę rzucamy ponownie
    g = toggleHoldAction(g, 0);
    g = toggleHoldAction(g, 1);
    g = toggleHoldAction(g, 2);

    g = rollAction(g, () => 0.5); // → czwórki na pozycji 3 i 4
    expect(g.dice[0]).toBe(1);
    expect(g.dice[3]).toBe(4);

    g = rollAction(g, () => 0); // pozycje 3 i 4 → jedynki
    expect(g.dice).toEqual([1, 1, 1, 1, 1]);

    // To jest Król!
    g = scoreAction(g, 'yahtzee');
    expect(g.players[0].scorecard.yahtzee).toBe(50);
    expect(g.currentPlayerIndex).toBe(1);
    expect(totalScore(g.players[0].scorecard)).toBe(50);
  });
});
