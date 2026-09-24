import { useEffect, useRef } from 'react';
import { gameStore } from '../game/store';
import { elapsedMs, formatTime } from '../game/timer';
import { useGame } from '../hooks/useGame';
import { useIsTouch } from '../hooks/useIsTouch';

/** Race clock at the top, a restart button, and hints before the first move. */
export function Hud() {
  const phase = useGame((state) => state.phase);
  const falls = useGame((state) => state.falls);
  const isTouch = useIsTouch();
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

  return (
    <header className="hud">
      <div className={`hud-clock hud-clock--${phase}`}>
        <span ref={clock} role="timer">
          0.00
        </span>
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

      {/* Re-keyed on every fall so the fade-out animation replays. */}
      {phase === 'playing' && falls > 0 && (
        <p key={falls} className="hud-toast" role="status">
          Oops! Back to the start
        </p>
      )}

      <button
        type="button"
        className="hud-restart"
        onClick={(event) => {
          event.currentTarget.blur();
          gameStore.getState().restart();
        }}
        aria-label="Restart (R)"
        title="Restart (R)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5" />
        </svg>
      </button>
    </header>
  );
}
