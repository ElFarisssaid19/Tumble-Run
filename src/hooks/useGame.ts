import { useStore } from 'zustand';
import { gameStore, type GameState } from '../game/store';

/** Subscribes a component to a slice of the game store; it re-renders only when that slice changes. */
export function useGame<T>(selector: (state: GameState) => T): T {
  return useStore(gameStore, selector);
}
