import { useState } from 'react';
import type { PlayerConfig } from '../../engine/types';

interface PlayerSetupProps {
  onStart: (configs: PlayerConfig[]) => void;
}

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

export function PlayerSetup({ onStart }: PlayerSetupProps) {
  const [configs, setConfigs] = useState<PlayerConfig[]>([
    { name: 'Gracz 1', isAI: false },
    { name: 'Gracz 2', isAI: true },
  ]);

  function setCount(n: number) {
    const next: PlayerConfig[] = [];
    for (let i = 0; i < n; i++) {
      next.push(
        configs[i] ?? { name: `Gracz ${i + 1}`, isAI: false },
      );
    }
    setConfigs(next);
  }

  function updateConfig(index: number, patch: Partial<PlayerConfig>) {
    setConfigs((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  }

  function handleStart() {
    onStart(
      configs.map((c, i) => ({
        name: c.name.trim() || `Gracz ${i + 1}`,
        isAI: c.isAI,
      })),
    );
  }

  return (
    <div className="setup">
      <h1 className="setup__title">Kości</h1>
      <p className="setup__lead">
        Klasyczna gra w kości dla 2–4 graczy. Wybierz konfigurację i zaczynamy.
      </p>

      <div className="setup__count">
        <label htmlFor="player-count">Liczba graczy:</label>
        <div className="setup__count-buttons" role="radiogroup" aria-labelledby="player-count">
          {[MIN_PLAYERS, 3, MAX_PLAYERS].map((n) => (
            <button
              key={n}
              type="button"
              className={`btn ${configs.length === n ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setCount(n)}
              aria-pressed={configs.length === n}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="setup__players">
        {configs.map((cfg, i) => (
          <div key={i} className="setup__player">
            <input
              type="text"
              value={cfg.name}
              onChange={(e) => updateConfig(i, { name: e.target.value })}
              placeholder={`Gracz ${i + 1}`}
              maxLength={20}
              aria-label={`Imię gracza ${i + 1}`}
            />
            <label className="setup__ai">
              <input
                type="checkbox"
                checked={cfg.isAI}
                onChange={(e) => updateConfig(i, { isAI: e.target.checked })}
              />
              <span>Komputer (AI)</span>
            </label>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--primary btn--big" onClick={handleStart}>
        Rozpocznij grę
      </button>
    </div>
  );
}
