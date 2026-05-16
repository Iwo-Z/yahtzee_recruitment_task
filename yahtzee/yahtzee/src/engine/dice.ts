import type { Dice, DieValue, Held, RandomFn } from './types';

export const DICE_COUNT = 5;

/** Domyślny stan kości na początku tury — wszystkie "1". Wartość neutralna do wyświetlenia. */
export function defaultDice(): Dice {
  return [1, 1, 1, 1, 1];
}

/** Domyślna maska — żadna kość nie jest zatrzymana. */
export function defaultHeld(): Held {
  return [false, false, false, false, false];
}

export function rollDie(random: RandomFn = Math.random): DieValue {
  return (Math.floor(random() * 6) + 1) as DieValue;
}

/**
 * Rzuca tymi kośćmi, które NIE są zatrzymane.
 * Pozostałe pozycje zachowują dotychczasową wartość.
 */
export function rollDice(
  current: Dice,
  held: Held,
  random: RandomFn = Math.random,
): Dice {
  if (current.length !== DICE_COUNT || held.length !== DICE_COUNT) {
    throw new Error(`Oczekiwano ${DICE_COUNT} kości i ${DICE_COUNT} flag zatrzymania`);
  }
  return current.map((value, i) => (held[i] ? value : rollDie(random)));
}
