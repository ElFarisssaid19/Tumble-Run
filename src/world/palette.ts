/**
 * Tumble Run's pastel palette for the 3D world (the UI mirrors it with CSS variables). Colours
 * that change from zone to zone (sky, tiles, walls, islands) live in themes.ts.
 */
export const palette = {
  start: '#b8ead6',
  finish: '#ffdcc4',
  checkpoint: '#c9eedc',
  line: '#fffaf5',
  lineDark: '#8a7bb0',

  // Moving parts are pink everywhere: that colour means "this can knock you off".
  obstacle: '#ff8fa7',
  obstacleHub: '#b9adec',
  bumper: '#ff9fb5',
  bumperCap: '#fff4f7',
  disc: '#e7defc',
  ramp: '#ffd9ae',

  deck: '#f1cfae',
  deckEdge: '#dcae8c',
  rail: '#fff3e6',
  lantern: '#ffe08a',
  lanternGlow: '#ffb84d',

  marble: '#6f7df2',
  trophy: '#ffd36b',
  pedestal: '#bfb3ec',
  coin: '#ffc94a',
  coinGlow: '#ff9d2e',
  flag: '#bfb3ec',
  flagReached: '#ff8fa7',
  pole: '#fffaf5',
  stars: '#fff9e8',
  moon: '#fff3d6',
} as const;
