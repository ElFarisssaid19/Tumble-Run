import type { ComponentType } from 'react';
import type { ObstacleKind } from '../../game/config';
import { Limbo } from './Limbo';
import { Spinner } from './Spinner';
import { Sweeper } from './Sweeper';
import type { ObstacleProps } from './types';

/**
 * The component for every obstacle kind the course generator can pick (OBSTACLE_KINDS in
 * src/game/config.ts). To add one: name it there, create a component that takes
 * `ObstacleProps`, then register it here; the type check fails until both sides match.
 */
export const obstacleRegistry = {
  spinner: Spinner,
  limbo: Limbo,
  sweeper: Sweeper,
} satisfies Record<ObstacleKind, ComponentType<ObstacleProps>>;
