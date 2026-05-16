import { describe, expect, test } from 'vitest';
import { DICE_COUNT, defaultDice, defaultHeld, rollDice, rollDie } from '../engine/dice';

/**
 * Seedowany RNG (Mulberry32). Deterministyczny — testy są stabilne w CI.
 * Implementacja klasyczna, w pełni mieści się w jednym zamknięciu.
 */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('dice', () => {
  test('rollDie zwraca wartość 1..6', () => {
    const rng = seededRandom(42);
    for (let i = 0; i < 1000; i++) {
      const v = rollDie(rng);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  test('rollDie pokrywa wszystkie ścianki w dużej próbie', () => {
    const rng = seededRandom(1);
    const seen = new Set<number>();
    for (let i = 0; i < 10000; i++) seen.add(rollDie(rng));
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  test('rollDice rzuca tylko niezatrzymanymi', () => {
    const rng = seededRandom(7);
    const start = defaultDice();
    const held = [true, false, true, false, true] as const;
    const result = rollDice(start, held, rng);
    // Trzymane — wartość się nie zmienia (z defaultDice są to jedynki)
    expect(result[0]).toBe(start[0]);
    expect(result[2]).toBe(start[2]);
    expect(result[4]).toBe(start[4]);
    // Wszystkie wartości legalne
    for (const v of result) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  test('rollDice — wszystkie zatrzymane = identyczny wynik', () => {
    const rng = seededRandom(99);
    const start = [3, 5, 2, 6, 1] as const;
    const result = rollDice([...start], [true, true, true, true, true], rng);
    expect(result).toEqual([3, 5, 2, 6, 1]);
  });

  test('rollDice — zła długość rzuca błąd', () => {
    expect(() => rollDice([1, 2, 3] as never, defaultHeld())).toThrow();
    expect(() => rollDice(defaultDice(), [true, false] as never)).toThrow();
  });

  test('defaultDice ma rozmiar 5', () => {
    expect(defaultDice().length).toBe(DICE_COUNT);
  });

  test('defaultHeld ma 5 wartości false', () => {
    expect(defaultHeld()).toEqual([false, false, false, false, false]);
  });

  test('rozkład rzutów jest w przybliżeniu jednostajny', () => {
    // Sanity test rozkładu — nie ścisły test statystyczny, ale wykryłby grubą wadę.
    const rng = seededRandom(2024);
    const counts = new Map<number, number>();
    const N = 60000;
    for (let i = 0; i < N; i++) {
      const v = rollDie(rng);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    for (const v of [1, 2, 3, 4, 5, 6]) {
      const c = counts.get(v) ?? 0;
      // Oczekiwane ~10000; tolerancja ±15%.
      expect(c).toBeGreaterThan(8500);
      expect(c).toBeLessThan(11500);
    }
  });
});
