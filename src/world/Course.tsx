import { Fragment, createElement, useMemo } from 'react';
import { generateCourse } from '../game/course';
import { useGame } from '../hooks/useGame';
import { FinishBlock, ObstacleBlock, StartBlock, TrackColliders } from './Block';
import { OBSTACLE_KINDS, obstacleRegistry } from './obstacles/registry';

/** Turns the generated course (pure data) into blocks and obstacles. */
export function Course() {
  const seed = useGame((state) => state.seed);
  const course = useMemo(() => generateCourse({ seed, kinds: OBSTACLE_KINDS }), [seed]);

  const blocks = course.blocks.map((block) => {
    switch (block.type) {
      case 'start':
        return <StartBlock key={block.index} z={block.z} />;
      case 'finish':
        return <FinishBlock key={block.index} z={block.z} />;
      case 'obstacle': {
        const { kind, ...params } = block.obstacle;
        return (
          <Fragment key={block.index}>
            <ObstacleBlock z={block.z} index={block.index} />
            {/* Keyed by seed so every new course starts its obstacles fresh. */}
            {createElement(obstacleRegistry[kind], { key: seed, z: block.z, ...params })}
          </Fragment>
        );
      }
    }
  });

  return (
    <>
      <TrackColliders length={course.length} />
      {blocks}
    </>
  );
}
