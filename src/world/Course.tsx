import { Fragment, createElement } from 'react';
import { useGame } from '../hooks/useGame';
import { CheckpointBlock, FinishBlock, ObstacleBlock, StartBlock, TrackColliders } from './Block';
import { Coins } from './Coins';
import { obstacleRegistry } from './obstacles/registry';

/** Turns the current course (pure data from the store) into blocks, obstacles and coins. */
export function Course() {
  const course = useGame((state) => state.course);
  const courseKey = useGame((state) => `${state.levelId ?? 'endless'}:${state.seed}`);
  const run = useGame((state) => state.run);

  const blocks = course.blocks.map((block) => {
    switch (block.type) {
      case 'start':
        return <StartBlock key={block.index} z={block.z} />;
      case 'finish':
        return <FinishBlock key={block.index} z={block.z} />;
      case 'checkpoint':
        return <CheckpointBlock key={block.index} z={block.z} id={block.checkpoint} />;
      case 'obstacle': {
        const { kind, ...params } = block.obstacle;
        return (
          <Fragment key={block.index}>
            <ObstacleBlock z={block.z} index={block.index} />
            {/* Keyed by run so every attempt starts the obstacles from the same timing. */}
            {createElement(obstacleRegistry[kind], { key: run, z: block.z, ...params })}
          </Fragment>
        );
      }
      default: {
        // Fails to compile when a new block type is added without a case above.
        const unhandled: never = block;
        throw new Error(`Unknown course block: ${JSON.stringify(unhandled)}`);
      }
    }
  });

  return (
    // Keyed by course so a new level or seed rebuilds every collider from scratch.
    <Fragment key={courseKey}>
      <TrackColliders length={course.length} />
      {blocks}
      <Coins coins={course.coins} />
    </Fragment>
  );
}
