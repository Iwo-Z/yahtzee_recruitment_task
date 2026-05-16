import type { GameState } from '../../engine/types';

interface GameLogProps {
  state: GameState;
}

const TYPE_ICON: Record<string, string> = {
  'turn-start': '▶',
  roll: '🎲',
  score: '📝',
  'game-end': '🏁',
};

/**
 * Historia ruchów. Najnowsze na górze, ograniczamy do 50 wpisów —
 * starsze są w pamięci, ale nie potrzebne w UI (i tak głównie do debugowania).
 */
export function GameLog({ state }: GameLogProps) {
  const visible = state.log.slice(-50).reverse();
  return (
    <aside className="log">
      <h3 className="log__title">Historia</h3>
      <ul className="log__list">
        {visible.map((entry) => (
          <li key={entry.id} className={`log__item log__item--${entry.type}`}>
            <span className="log__icon" aria-hidden="true">
              {TYPE_ICON[entry.type] ?? '•'}
            </span>
            <span className="log__msg">{entry.message}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
