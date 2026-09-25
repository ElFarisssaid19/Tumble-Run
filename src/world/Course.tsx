import { Fragment, createElement } from 'react';
import { useGame } from '../hooks/useGame';
import { CheckpointBlock, FinishBlock, StartBlock } from './Block';
import { Bridge } from './Bridge';
import { Coins } from './Coins';
import { obstacleRegistry } from './obstacles/registry';
import { Track } from './Track';

/** Turns the current course (pure data from the store) into track, obstacles, bridges and coins. */
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
        // Keyed by run so every attempt starts the obstacles from the same timing.
        return createElement(obstacleRegistry[kind], {
          key: `${block.index}:${run}`,
          z: block.z,
          ...params,
        });
      }
      case 'bridge':
        return <Bridge key={`${block.index}:${run}`} z={block.z} spec={block.bridge} />;
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
      <Track course={course} />
      {blocks}
      <Coins coins={course.coins} />
    </Fragment>
  );
}
