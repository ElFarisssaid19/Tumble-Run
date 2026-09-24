import { useSyncExternalStore } from 'react';

const coarsePointer = window.matchMedia('(pointer: coarse)');
let touchSeen = false;

function subscribe(onChange: () => void) {
  const onTouch = () => {
    touchSeen = true;
    onChange();
  };
  coarsePointer.addEventListener('change', onChange);
  window.addEventListener('touchstart', onTouch, { once: true, passive: true });
  return () => {
    coarsePointer.removeEventListener('change', onChange);
    window.removeEventListener('touchstart', onTouch);
  };
}

const isTouch = () => touchSeen || coarsePointer.matches;

/** True on phones and tablets, or as soon as the screen is touched on a hybrid device. */
export function useIsTouch(): boolean {
  return useSyncExternalStore(subscribe, isTouch);
}
