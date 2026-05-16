import type { GameState } from '../../engine/types';
import { totalScore } from '../../engine/scoring';
import { winners } from '../../engine/game';

interface GameOverProps {
  state: GameState;
  onRestart: () => void;
}

export function GameOver({ state, onRestart }: GameOverProps) {
  const winnerList = winners(state.players);
  const ranking = [...state.players]
    .map((p) => ({ p, score: totalScore(p.scorecard) }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="game-over">
      <h2 className="game-over__title">
        {winnerList.length === 1 ? (
          <>Wygrywa {winnerList[0].name}!</>
        ) : (
          <>Remis: {winnerList.map((w) => w.name).join(', ')}</>
        )}
      </h2>
      <ol className="game-over__rank">
        {ranking.map(({ p, score }, idx) => (
          <li key={p.id} className={idx === 0 ? 'game-over__rank-first' : ''}>
            <span className="game-over__pos">{idx + 1}.</span>
            <span className="game-over__name">
              {p.name}
              {p.isAI && ' (AI)'}
            </span>
            <span className="game-over__score">{score} pkt</span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn--primary btn--big" onClick={onRestart}>
        Zagraj jeszcze raz
      </button>
    </div>
  );
}
