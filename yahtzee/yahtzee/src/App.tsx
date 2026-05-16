import { useGame } from './ui/hooks/useGame';
import { PlayerSetup } from './ui/components/PlayerSetup';
import { DiceTray } from './ui/components/DiceTray';
import { Scorecard } from './ui/components/Scorecard';
import { GameOver } from './ui/components/GameOver';
import { GameLog } from './ui/components/GameLog';
import { ThemeToggle } from './ui/components/ThemeToggle';
import type { Category, GameState } from './engine/types';

export function App() {
  const game = useGame();

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">🎲 Kości</h1>
        <ThemeToggle />
      </header>

      <main className="app__main">
        {game.view.kind === 'setup' && (
          <PlayerSetup
            hasSaved={game.hasSaved}
            onStart={game.startGame}
            onResume={game.resumeGame}
          />
        )}

        {game.view.kind === 'playing' && (
          <PlayingView
            state={game.view.state}
            rollingTick={game.rollingTick}
            isAITurnActive={game.isAITurnActive}
            onRoll={game.roll}
            onToggleHold={game.toggleHold}
            onScore={game.score}
            onRestart={game.restart}
          />
        )}

        {game.view.kind === 'finished' && (
          <>
            <GameOver state={game.view.state} onRestart={game.restart} />
            <GameLog state={game.view.state} />
          </>
        )}
      </main>

      <footer className="app__footer">
        <small>Zadanie rekrutacyjne VSoft 2026 · React + TypeScript</small>
      </footer>
    </div>
  );
}

interface PlayingViewProps {
  state: GameState;
  rollingTick: number;
  isAITurnActive: boolean;
  onRoll: () => void;
  onToggleHold: (i: number) => void;
  onScore: (cat: Category) => void;
  onRestart: () => void;
}

function PlayingView({
  state,
  rollingTick,
  isAITurnActive,
  onRoll,
  onToggleHold,
  onScore,
  onRestart,
}: PlayingViewProps) {
  const current = state.players[state.currentPlayerIndex];

  return (
    <div className="play">
      <div className="play__topbar">
        <h2 className="play__current">
          Tura: <strong>{current.name}</strong>
          {current.isAI && <span className="play__aitag"> 🤖</span>}
        </h2>
        <button type="button" className="btn btn--ghost" onClick={onRestart}>
          ⟲ Nowa gra
        </button>
      </div>

      <DiceTray
        state={state}
        rollingTick={rollingTick}
        onRoll={onRoll}
        onToggleHold={onToggleHold}
        isAITurnActive={isAITurnActive}
      />

      <Scorecard
        state={state}
        onPickCategory={onScore}
        isAITurnActive={isAITurnActive}
      />

      <GameLog state={state} />
    </div>
  );
}
