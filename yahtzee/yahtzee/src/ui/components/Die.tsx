import type { DieValue } from '../../engine/types';

interface DieProps {
  value: DieValue;
  held: boolean;
  rolling: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

// Pozycje oczek w siatce 3×3 (centra). Wiersze i kolumny w {1,2,3}.
const PIP_LAYOUTS: Record<DieValue, ReadonlyArray<readonly [number, number]>> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
};

const SIZE = 60;
const CELL = SIZE / 4; // 15 — środek kolumn/rzędów wypada na CELL * {1,2,3}

export function Die({ value, held, rolling, disabled, onClick }: DieProps) {
  const classes = [
    'die',
    held && 'die--held',
    rolling && !held && 'die--rolling',
    disabled && 'die--disabled',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Kość: ${value}${held ? ', zatrzymana' : ''}`}
      aria-pressed={held}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="die__svg">
        <rect
          x="2"
          y="2"
          width={SIZE - 4}
          height={SIZE - 4}
          rx="10"
          ry="10"
          className="die__face"
        />
        {PIP_LAYOUTS[value].map(([row, col], i) => (
          <circle
            key={i}
            cx={col * CELL}
            cy={row * CELL}
            r="4.5"
            className="die__pip"
          />
        ))}
      </svg>
    </button>
  );
}
