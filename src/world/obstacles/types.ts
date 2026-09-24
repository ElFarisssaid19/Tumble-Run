import type { ObstacleSpec } from '../../game/course';

/** What every obstacle component receives: its block position plus its random parameters. */
export interface ObstacleProps extends Omit<ObstacleSpec, 'kind'> {
  /** World Z of the centre of the block the obstacle stands on. */
  z: number;
}
