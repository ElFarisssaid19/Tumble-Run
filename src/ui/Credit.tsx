import { useGame } from '../hooks/useGame';

/**
 * Pinned to the bottom of the screen during a race. On the level select it scrolls with the
 * menu instead (`inline`), so it can't cover the menu on short screens.
 */
export function Credit({ inline = false }: { inline?: boolean }) {
  const onMenu = useGame((state) => state.phase === 'menu');
  if (onMenu !== inline) return null;
  return <p className={inline ? 'credit credit--inline' : 'credit'}>by Said El Fariss</p>;
}
