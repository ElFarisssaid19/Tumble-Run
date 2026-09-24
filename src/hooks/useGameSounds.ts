import { useEffect } from 'react';
import { playCheckpoint, playCoin, unlockAudio } from '../audio/sfx';
import { gameStore } from '../game/store';

/**
 * Plays the checkpoint and coin sounds. They follow store changes, so each checkpoint chimes
 * exactly once per run: touching it again (or an earlier one) doesn't change the store.
 */
export function useGameSounds() {
  useEffect(() => {
    // Audio may only start after a user gesture: set it up on the first one.
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    const unsubscribe = gameStore.subscribe((state, previous) => {
      if (state.run !== previous.run) return;
      if (state.checkpoint !== null && state.checkpoint !== previous.checkpoint) playCheckpoint();
      if (state.coins.length > previous.coins.length) playCoin();
    });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      unsubscribe();
    };
  }, []);
}
