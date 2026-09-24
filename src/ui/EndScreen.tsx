import { isLevelUnlocked, levelNumber, nextLevel } from '../game/levels';
import { gameStore, type RunResult } from '../game/store';
import { formatTime } from '../game/timer';
import { useGame } from '../hooks/useGame';
import { useIsTouch } from '../hooks/useIsTouch';
import { StarRow } from './icons';
import { courseTitle, seedLabel } from './labels';

/** Shown once the trophy is reached: the rating and time next to the best, and where to go next. */
export function EndScreen() {
  const phase = useGame((state) => state.phase);
  const result = useGame((state) => state.result);
  const levelId = useGame((state) => state.levelId);
  const seed = useGame((state) => state.seed);
  const records = useGame((state) => state.records);
  const isTouch = useIsTouch();

  if (phase !== 'ended' || !result) return null;

  const next = levelId === null ? undefined : nextLevel(levelId);
  const canGoOn = next !== undefined && isLevelUnlocked(next.id, records);
  const endless = levelId === null;
  // Keyboard hints make no sense on a touch screen.
  const key = (name: string) => (isTouch ? null : <kbd>{name}</kbd>);

  return (
    <div className="overlay">
      <section className="card" role="dialog" aria-modal="true" aria-labelledby="end-title">
        <p id="end-title" className="card-kicker">
          {courseTitle(levelId)}
          {endless && <span className="card-seed">{seedLabel(seed)}</span>}
        </p>

        {result.stars !== null && (
          <StarRow
            className="stars--large"
            count={result.stars}
            bonus={result.timeStars !== null && result.stars > result.timeStars}
          />
        )}
        <p className="card-time">{formatTime(result.timeMs)}</p>
        {result.newBest && <p className="badge">New best!</p>}

        <dl className="card-stats">
          <div>
            <dt>Falls</dt>
            <dd>{result.falls}</dd>
          </div>
          <div>
            <dt>Coins</dt>
            <dd>
              {result.coins} / {result.coinTotal}
            </dd>
          </div>
          <div>
            <dt>{result.newBest ? 'Previous best' : 'Best'}</dt>
            <dd>{bestText(result)}</dd>
          </div>
        </dl>

        {notes(result).map((note) => (
          <p key={note} className="card-note">
            {note}
          </p>
        ))}
        {endless && <p className="card-detail">Share the code to race this course again.</p>}

        <div className="card-actions">
          {canGoOn && (
            <button
              type="button"
              className="button"
              autoFocus
              onClick={() => gameStore.getState().selectLevel(next.id)}
            >
              Next level
            </button>
          )}
          <button
            type="button"
            className={canGoOn ? 'button button--soft' : 'button'}
            // Focused when it's the main action, so Enter retries (R works from anywhere).
            autoFocus={!canGoOn}
            onClick={() => gameStore.getState().restart()}
          >
            Retry {key('R')}
          </button>
          {endless && (
            <button
              type="button"
              className="button button--soft"
              onClick={() => gameStore.getState().playEndless()}
            >
              New course {key('N')}
            </button>
          )}
          <button
            type="button"
            className="button button--ghost"
            onClick={() => gameStore.getState().quit()}
          >
            Level select {key('Esc')}
          </button>
        </div>
      </section>
    </div>
  );
}

function bestText(result: RunResult): string {
  if (result.previousBestMs !== null) return formatTime(result.previousBestMs);
  return 'First finish!';
}

/** Extra lines under the stats: the coin bonus and a newly opened level. */
function notes(result: RunResult): string[] {
  const lines: string[] = [];
  if (result.allCoins && result.stars !== null) {
    lines.push(
      result.timeStars !== null && result.stars > result.timeStars
        ? 'All coins collected: +1 star!'
        : 'All coins collected!',
    );
  }
  if (result.unlocked !== null) lines.push(`Level ${levelNumber(result.unlocked)} unlocked!`);
  return lines;
}
