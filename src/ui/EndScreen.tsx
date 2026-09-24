import { gameStore } from '../game/store';
import { finalTimeMs, formatTime } from '../game/timer';
import { useGame } from '../hooks/useGame';

/** Shown once the trophy is reached: the final time and a way to go again. */
export function EndScreen() {
  const phase = useGame((state) => state.phase);
  const time = useGame((state) => finalTimeMs(state.timer));
  const falls = useGame((state) => state.falls);

  if (phase !== 'ended' || time === null) return null;

  return (
    <div className="overlay">
      <section className="card" role="dialog" aria-modal="true" aria-labelledby="end-title">
        <p id="end-title" className="card-kicker">
          Finished!
        </p>
        <p className="card-time">{formatTime(time)}</p>
        <p className="card-detail">
          {falls === 0 ? 'Clean run, no falls' : `${falls} ${falls === 1 ? 'fall' : 'falls'}`}
        </p>
        <button
          type="button"
          className="button"
          // Focused so Enter restarts too (R works from anywhere).
          autoFocus
          onClick={() => gameStore.getState().restart()}
        >
          Restart <kbd>R</kbd>
        </button>
      </section>
    </div>
  );
}
