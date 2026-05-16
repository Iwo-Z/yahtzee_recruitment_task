import {
  ALL_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  LOWER_CATEGORIES,
  UPPER_BONUS_THRESHOLD,
  UPPER_CATEGORIES,
} from '../../engine/categories';
import type { Category, GameState } from '../../engine/types';
import {
  lowerSubtotal,
  pointsToBonus,
  scoreCategory,
  totalScore,
  upperBonus,
  upperSubtotal,
} from '../../engine/scoring';
import { canScore } from '../../engine/game';

interface ScorecardProps {
  state: GameState;
  onPickCategory: (cat: Category) => void;
  isAITurnActive: boolean;
}

/**
 * Pełna tabela wyników — gracze jako kolumny, kategorie jako wiersze.
 * W aktywnej kolumnie wyświetlamy *podgląd* punktów dla niewypełnionych kategorii,
 * by gracz wiedział ile zdobędzie zanim kliknie.
 */
export function Scorecard({ state, onPickCategory, isAITurnActive }: ScorecardProps) {
  const currentIndex = state.currentPlayerIndex;
  const allowPick = canScore(state) && !isAITurnActive;

  function renderCell(playerIndex: number, cat: Category) {
    const player = state.players[playerIndex];
    const written = player.scorecard[cat];
    const isCurrent = playerIndex === currentIndex && state.phase === 'playing';

    if (written !== null) {
      return <td className="sc__cell sc__cell--written">{written}</td>;
    }

    if (isCurrent && allowPick) {
      const preview = scoreCategory(cat, state.dice);
      return (
        <td className="sc__cell sc__cell--clickable">
          <button
            type="button"
            className={`sc__pick ${preview === 0 ? 'sc__pick--zero' : ''}`}
            onClick={() => onPickCategory(cat)}
            title={`Wpisz ${preview} pkt do "${CATEGORY_LABELS[cat]}"`}
          >
            {preview}
          </button>
        </td>
      );
    }

    return <td className="sc__cell sc__cell--empty">—</td>;
  }

  return (
    <div className="sc__wrapper">
      <table className="sc">
        <thead>
          <tr>
            <th className="sc__rowhead">Kategoria</th>
            {state.players.map((p, i) => (
              <th
                key={p.id}
                className={`sc__playerhead ${
                  i === currentIndex && state.phase === 'playing' ? 'sc__playerhead--active' : ''
                }`}
              >
                {p.name}
                {p.isAI && <span className="sc__aitag" title="Sterowany przez komputer"> 🤖</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="sc__section">
            <td colSpan={1 + state.players.length}>Tabelka 1 — górna sekcja</td>
          </tr>
          {UPPER_CATEGORIES.map((cat) => (
            <tr key={cat}>
              <th className="sc__rowhead" title={CATEGORY_DESCRIPTIONS[cat]}>
                {CATEGORY_LABELS[cat]}
              </th>
              {state.players.map((_, i) => (
                <td key={i} className="sc__td">
                  {renderCell(i, cat)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="sc__subtotal">
            <th className="sc__rowhead">Suma górnej</th>
            {state.players.map((p, i) => (
              <td key={i}>{upperSubtotal(p.scorecard)}</td>
            ))}
          </tr>
          <tr className="sc__subtotal">
            <th className="sc__rowhead">
              Bonus (≥{UPPER_BONUS_THRESHOLD} pkt → +35)
            </th>
            {state.players.map((p, i) => {
              const bonus = upperBonus(p.scorecard);
              const needed = pointsToBonus(p.scorecard);
              return (
                <td key={i}>
                  {bonus > 0 ? `+${bonus}` : needed > 0 ? `−${needed} pkt` : '—'}
                </td>
              );
            })}
          </tr>

          <tr className="sc__section">
            <td colSpan={1 + state.players.length}>Tabelka 2 — kombinacje</td>
          </tr>
          {LOWER_CATEGORIES.map((cat) => (
            <tr key={cat}>
              <th className="sc__rowhead" title={CATEGORY_DESCRIPTIONS[cat]}>
                {CATEGORY_LABELS[cat]}
              </th>
              {state.players.map((_, i) => (
                <td key={i} className="sc__td">
                  {renderCell(i, cat)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="sc__subtotal">
            <th className="sc__rowhead">Suma dolnej</th>
            {state.players.map((p, i) => (
              <td key={i}>{lowerSubtotal(p.scorecard)}</td>
            ))}
          </tr>

          <tr className="sc__total">
            <th className="sc__rowhead">SUMA</th>
            {state.players.map((p, i) => (
              <td key={i}>{totalScore(p.scorecard)}</td>
            ))}
          </tr>
        </tbody>
      </table>
      {/* zapobiegamy ostrzeżeniu o unused import — kategorię używamy w pętli wyżej */}
      <span hidden>{ALL_CATEGORIES.length}</span>
    </div>
  );
}
