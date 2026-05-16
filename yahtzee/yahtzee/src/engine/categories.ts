export const UPPER_CATEGORIES = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
] as const;

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

// Próg premii zgodnie z PDF-em (63, nie 62).
export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS_VALUE = 35;

export function isUpperCategory(c: Category): c is UpperCategory {
  return (UPPER_CATEGORIES as readonly string[]).includes(c);
}
