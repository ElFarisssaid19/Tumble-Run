import { useEffect } from 'react';
import { input, type MoveKey } from '../game/input';
import { gameStore } from '../game/store';

// Physical key positions (KeyboardEvent.code), so WASD also works as ZQSD on AZERTY keyboards.
const MOVE_KEYS: Partial<Record<string, MoveKey>> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

/** True while the user types in a text field (the Endless seed box), where keys are just text. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * Feeds the keyboard into the shared input: arrows/WASD to roll, Space to jump. Also R to retry
 * the course, N for a new Endless course and Esc for the level select screen.
 */
export function useKeyboardControls() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;

      const game = gameStore.getState();
      // The level select screen keeps the browser's own keys (Space and Enter press buttons).
      if (game.phase === 'menu') return;

      const move = MOVE_KEYS[event.code];
      if (move) {
        event.preventDefault();
        input.setKey(move, true);
      } else if (event.code === 'Space') {
        // Also stops Space from scrolling or pressing a focused button.
        event.preventDefault();
        if (!event.repeat) input.pressJump(performance.now());
      } else if (event.repeat) {
        return;
      } else if (event.code === 'KeyR') {
        game.restart();
      } else if (event.code === 'KeyN' && game.mode === 'endless') {
        game.playEndless();
      } else if (event.code === 'Escape') {
        game.quit();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const move = MOVE_KEYS[event.code];
      if (move) input.setKey(move, false);
      if (event.code === 'Space') event.preventDefault();
    };

    // Keys released while the tab is in the background never send keyup.
    const onBlur = () => input.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
}
