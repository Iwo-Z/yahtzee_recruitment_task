import type { GameState } from '../../engine/types';
import { Die } from './Die';

interface DiceTrayProps {
  state: GameState;
  rollingTick: number;
  onToggleHold: (index: number) => void;
  onRoll: () => void;
  isAITurnActive: boolean;
}

export function DiceTray({
  state,
  rollingTick,
  onToggleHold,
  onRoll,
  isAITurnActive,
}: DiceTrayProps) {
  const beforeFirstRoll = state.rollsLeft === 3;
  const canToggle = !beforeFirstRoll && state.rollsLeft > 0 && !isAITurnActive;
  const canRollNow = state.rollsLeft > 0 && !isAITurnActive;

  return (
    <div className="dice-tray">
      <div className="dice-tray__dice" key={rollingTick}>
        {state.dice.map((v, i) => (
          <Die
            key={i}
            value={v}
            held={state.held[i] && !beforeFirstRoll}
            rolling={!beforeFirstRoll}
            disabled={!canToggle}
            onClick={canToggle ? () => onToggleHold(i) : undefined}
          />
        ))}
      </div>
      <div className="dice-tray__controls">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onRoll}
          disabled={!canRollNow}
        >
          {beforeFirstRoll ? 'Rzuć kośćmi' : `Rzuć (pozostało: ${state.rollsLeft})`}
        </button>
        <p className="dice-tray__hint">
          {beforeFirstRoll
            ? 'Pierwszy rzut — wszystkimi 5 kośćmi.'
            : state.rollsLeft === 0
              ? 'Wpisz wynik do tabelki.'
              : 'Kliknij kość, aby zatrzymać/zwolnić.'}
        </p>
      </div>
    </div>
  );
}
