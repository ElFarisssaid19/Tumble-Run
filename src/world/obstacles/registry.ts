import type { ComponentType } from 'react';
import { Limbo } from './Limbo';
import { Spinner } from './Spinner';
import { Sweeper } from './Sweeper';
import type { ObstacleProps } from './types';

/**
 * Every obstacle the course generator can pick from, by name.
 * To add one: create a component that takes `ObstacleProps`, then register it here.
 */
export const obstacleRegistry = {
  spinner: Spinner,
  limbo: Limbo,
  sweeper: Sweeper,
} satisfies Record<string, ComponentType<ObstacleProps>>;

export type ObstacleKind = keyof typeof obstacleRegistry;

export const OBSTACLE_KINDS = Object.keys(obstacleRegistry) as ObstacleKind[];
