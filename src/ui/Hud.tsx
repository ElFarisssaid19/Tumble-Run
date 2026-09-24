import { useEffect, useRef, useState } from 'react';
import { gameStore } from '../game/store';
import { elapsedMs, formatTime } from '../game/timer';
import { useGame } from '../hooks/useGame';
import { useIsTouch } from '../hooks/useIsTouch';
import { CoinIcon, FlagIcon, LevelsIcon, RestartIcon } from './icons';
import { courseTitle, seedLabel } from './labels';

/**
 * Race clock at the top with the course name, coin and checkpoint counters below it, buttons for
 * the level select and restart, and hints before the first move. Hidden on the level select.
 */
export function Hud() {
  const phase = useGame((state) => state.phase);
  const levelId = useGame((state) => state.levelId);
  const seed = useGame((state) => state.seed);
  const coins = useGame((state) => state.coins.length);
  const coinTotal = useGame((state) => state.course.coins.length);
  const checkpoints = useGame((state) => (state.checkpoint === null ? 0 : state.checkpoint + 1));
  const checkpointTotal = useGame((state) => state.course.checkpoints.length);
  const isTouch = useIsTouch();
  const toast = useToast();
  const clock = useRef<HTMLSpanElement>(null);

  // The clock changes every frame: write it straight to the DOM instead of re-rendering React.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const text = formatTime(elapsedMs(gameStore.getState().timer, performance.now()));
      if (clock.current && clock.current.textContent !== text) clock.current.textContent = text;
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, []);

  if (phase === 'menu') return null;

  return (
    <header className="hud">
      <div className={`hud-clock hud-clock--${phase}`}>
        <span ref={clock} role="timer">
          0.00
        </span>
      </div>

      <div className="hud-stats">
        <span className="pill pill--course">
          {courseTitle(levelId)}
          {levelId === null && <span className="pill-seed">{seedLabel(seed)}</span>}
        </span>
        <span className="pill" aria-label={`${coins} of ${coinTotal} coins collected`}>
          <CoinIcon />
          {/* Re-keyed so the count pops each time it changes. */}
          <span key={coins} className={coins > 0 ? 'pill-count pill-count--bump' : 'pill-count'}>
            {coins} / {coinTotal}
          </span>
        </span>
        {checkpointTotal > 0 && (
          <span
            className={checkpoints > 0 ? 'pill pill--lit' : 'pill'}
            aria-label={`${checkpoints} of ${checkpointTotal} checkpoints reached`}
          >
            <FlagIcon />
            <span
              key={checkpoints}
              className={checkpoints > 0 ? 'pill-count pill-count--bump' : 'pill-count'}
            >
              {checkpoints} / {checkpointTotal}
            </span>
          </span>
        )}
      </div>

      {phase === 'ready' && (
        <p className="hud-hint">
          {isTouch ? (
            'Drag the stick to roll · Jump to hop'
          ) : (
            <>
              <kbd>WASD</kbd> or <kbd>arrows</kbd> to roll · <kbd>Space</kbd> to jump
            </>
          )}
        </p>
      )}

      {/* Re-keyed on every event so the fade-out animation replays. */}
      {phase === 'playing' && toast && (
        <p key={toast.id} className="hud-toast" role="status">
          {toast.text}
        </p>
      )}

      <button
        type="button"
        className="hud-button hud-button--left"
        onClick={(event) => {
          event.currentTarget.blur();
          gameStore.getState().quit();
        }}
        aria-label="Level select (Esc)"
        title="Level select (Esc)"
      >
        <LevelsIcon />
      </button>
      <button
        type="button"
        className="hud-button hud-button--right"
        onClick={(event) => {
          event.currentTarget.blur();
          gameStore.getState().restart();
        }}
        aria-label="Restart (R)"
        title="Restart (R)"
      >
        <RestartIcon />
      </button>
    </header>
  );
}

interface Toast {
  id: number;
  text: string;
}

/** The latest fall or checkpoint message of the current run. */
function useToast(): Toast | null {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(
    () =>
      gameStore.subscribe((state, previous) => {
        if (state.run !== previous.run) {
          setToast(null);
        } else if (state.falls > previous.falls) {
          const where = state.checkpoint === null ? 'the start' : 'the checkpoint';
          setToast({ id: performance.now(), text: `Oops! Back to ${where}` });
        } else if (state.checkpoint !== null && state.checkpoint !== previous.checkpoint) {
          setToast({ id: performance.now(), text: 'Checkpoint!' });
        }
      }),
    [],
  );

  return toast;
}
