import { useFrame } from '@react-three/fiber';
import { BallCollider, RigidBody, type IntersectionEnterPayload } from '@react-three/rapier';
import { useRef } from 'react';
import { CylinderGeometry, type Mesh } from 'three';
import type { Coin as CoinData } from '../game/course';
import { gameStore } from '../game/store';
import { useGame } from '../hooks/useGame';
import { MARBLE_NAME } from './layout';
import { materials } from './materials';

/** Radius of the pickup zone around a coin's centre (the marble only has to brush it). */
const PICKUP_RADIUS = 0.4;

// Ten-sided disc standing on its edge, facing down the course.
const coinGeometry = new CylinderGeometry(0.24, 0.24, 0.07, 10).rotateX(Math.PI / 2);

/** The course's coins that are still to collect; a coin leaves the scene when picked up. */
export function Coins({ coins }: { coins: readonly CoinData[] }) {
  const collected = useGame((state) => state.coins);
  return coins
    .filter((coin) => !collected.includes(coin.id))
    .map((coin) => <Coin key={coin.id} coin={coin} />);
}

function Coin({ coin }: { coin: CoinData }) {
  const mesh = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime + coin.id;
    mesh.current.rotation.y = t * 2.4;
    mesh.current.position.y = Math.sin(t * 2.2) * 0.05;
  });

  const onTouch = ({ other }: IntersectionEnterPayload) => {
    if (other.rigidBodyObject?.name === MARBLE_NAME) {
      gameStore.getState().collectCoin(coin.id);
    }
  };

  return (
    <group position={[coin.x, coin.y, coin.z]}>
      <RigidBody type="fixed" colliders={false}>
        <BallCollider sensor args={[PICKUP_RADIUS]} onIntersectionEnter={onTouch} />
      </RigidBody>
      <mesh ref={mesh} geometry={coinGeometry} material={materials.coin} castShadow />
    </group>
  );
}
