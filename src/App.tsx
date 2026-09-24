import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useState } from 'react';
import { NeutralToneMapping } from 'three';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { Credit } from './ui/Credit';
import { EndScreen } from './ui/EndScreen';
import { Hud } from './ui/Hud';
import { TouchControls } from './ui/TouchControls';
import { Scene } from './world/Scene';

// Sharp on high-density screens, but never render more than 2× (phones go up to 3× or more).
const MAX_DPR = Math.min(window.devicePixelRatio, 2);

export function App() {
  useKeyboardControls();
  const [loaded, setLoaded] = useState(false);
  const onReady = useCallback(() => setLoaded(true), []);
  const [dpr, setDpr] = useState(MAX_DPR);

  return (
    <main className="app">
      <Canvas
        className="stage"
        shadows="percentage"
        dpr={dpr}
        // Starts high above the course, then glides down behind the marble.
        camera={{ fov: 50, near: 0.1, far: 120, position: [0, 9, 14] }}
        onCreated={({ gl }) => {
          // Neutral tone mapping keeps pastels soft instead of washing them out.
          gl.toneMapping = NeutralToneMapping;
        }}
      >
        {/* Drops to 1× resolution if the device can't keep a smooth frame rate. */}
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(MAX_DPR)}
          onFallback={() => setDpr(1)}
        />
        <Suspense fallback={null}>
          <Scene onReady={onReady} />
        </Suspense>
      </Canvas>

      <Hud />
      <TouchControls />
      <EndScreen />
      <Credit />

      {!loaded && (
        <div className="loading" role="status">
          <span className="loading-ball" />
          Loading…
        </div>
      )}
    </main>
  );
}
