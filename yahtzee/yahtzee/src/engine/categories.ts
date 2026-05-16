/**
 * Kategorie punktacji — single source of truth.
 *
 * Stałe `*_CATEGORIES` to `as const` tuple, dzięki czemu można z nich wyprowadzić
 * typy literalne (`UpperCategory`, `LowerCategory`, `Category`) bez ręcznego
 * duplikowania nazw. Iteracja po tablicy zawsze obejmuje wszystkie kategorie —
 * jeśli dodamy nową, kompilator wskaże miejsca do uzupełnienia.
 */

/** Górna sekcja tabelki (jedynki..szóstki). */
export const UPPER_CATEGORIES = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
] as const;

/** Dolna sekcja tabelki (kombinacje). */
export const LOWER_CATEGORIES = [
  'threeOfAKind',
  'fourOfAKind',
  'fullHouse',
  'smallStraight',
  'largeStraight',
  'yahtzee',
  'chance',
] as const;

export const ALL_CATEGORIES = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES] as const;

export type UpperCategory = (typeof UPPER_CATEGORIES)[number];
export type LowerCategory = (typeof LOWER_CATEGORIES)[number];
export type Category = UpperCategory | LowerCategory;

/** Polskie nazwy wyświetlane w UI — w jednym miejscu. */
export const CATEGORY_LABELS: Record<Category, string> = {
  ones: 'Jedynki',
  twos: 'Dwójki',
  threes: 'Trójki',
  fours: 'Czwórki',
  fives: 'Piątki',
  sixes: 'Szóstki',
  threeOfAKind: '3 jednakowe',
  fourOfAKind: '4 jednakowe',
  fullHouse: 'Full',
  smallStraight: 'Mały strit',
  largeStraight: 'Duży strit',
  yahtzee: 'Król',
  chance: 'Szansa',
};

/** Krótki opis pomocniczy do tooltipów. */
export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  ones: 'Suma wyrzuconych jedynek',
  twos: 'Suma wyrzuconych dwójek',
  threes: 'Suma wyrzuconych trójek',
  fours: 'Suma wyrzuconych czwórek',
  fives: 'Suma wyrzuconych piątek',
  sixes: 'Suma wyrzuconych szóstek',
  threeOfAKind: '≥3 jednakowe → suma wszystkich kości',
  fourOfAKind: '≥4 jednakowe → suma wszystkich kości',
  fullHouse: 'Trójka + para → 25 pkt',
  smallStraight: '4 kolejne wartości → 30 pkt',
  largeStraight: '5 kolejnych wartości → 40 pkt',
  yahtzee: '5 jednakowych → 50 pkt',
  chance: 'Suma wszystkich kości (bez warunku)',
};

/**
 * Próg punktów w górnej sekcji aktywujący premię.
 *
 * UWAGA — rozbieżność w specyfikacji:
 *   PDF zadania:    "co najmniej 63 punkty"
 *   Wiadomość mail: "co najmniej 62 punkty"
 *
 * Wybieram 63 zgodnie z dokumentem PDF, który jest źródłem prawdy w tabelkach
 * (klasyczny próg w Yahtzee wynosi 63 = 3·1 + 3·2 + ... + 3·6, więc liczba ma sens
 * matematyczny — to średnio trzy "swoje" kości w każdym wierszu górnej sekcji).
 * Jeśli okaże się, że poprawny próg to 62, wystarczy zmienić tę stałą.
 */
export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS_VALUE = 35;

export function isUpperCategory(c: Category): c is UpperCategory {
  return (
    c === 'ones' ||
    c === 'twos' ||
    c === 'threes' ||
    c === 'fours' ||
    c === 'fives' ||
    c === 'sixes'
  );
}

export function isLowerCategory(c: Category): c is LowerCategory {
  return !isUpperCategory(c);
}
