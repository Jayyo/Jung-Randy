/**
 * Test Map Viewer - Preview 3D terrain assets
 * Access at: http://localhost:3000/test
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Grid, Stats } from '@react-three/drei';
import React, { Suspense, useState, useMemo } from 'react';
import * as THREE from 'three';

// Boss Platform Model - use GLB materials as-is (V4 script exports correct colors)
function BossPlatform({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const { scene } = useGLTF('/assets/terrain/boss_platform.glb');

  // Clone scene and enable shadows
  const processedScene = React.useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return cloned;
  }, [scene]);

  return <primitive object={processedScene} position={position} />;
}

// Loading fallback
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="gray" wireframe />
    </mesh>
  );
}

// Scene with lighting
function Scene() {
  return (
    <>
      {/* Ambient light - warm white for visibility */}
      <ambientLight intensity={0.4} color="#ffffff" />

      {/* Main directional light - neutral white */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.5}
        color="#ffffff"
      />

      {/* Central red/orange glow from the altar */}
      <pointLight
        position={[0, 1.5, 0]}
        intensity={2}
        color="#ff4400"
        distance={12}
      />

      {/* Subtle purple accents from crystals */}
      <pointLight
        position={[0, 3, 0]}
        intensity={0.5}
        color="#8833ff"
        distance={10}
      />

      {/* Ground plane for reference */}
      <Grid
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#333333"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={50}
        position={[0, -0.01, 0]}
      />

      {/* Boss Platform */}
      <Suspense fallback={<LoadingFallback />}>
        <BossPlatform position={[0, 0, 0]} />
      </Suspense>
    </>
  );
}

// Main component
export default function TestMapViewer() {
  const [showStats, setShowStats] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
      {/* UI Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100,
        background: 'rgba(0,0,0,0.8)',
        padding: '20px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'monospace',
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>🗺️ Map Asset Viewer</h2>

        <div style={{ marginBottom: '10px' }}>
          <strong>Boss Platform</strong>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
            Size: 14x14 units<br />
            File: boss_platform.glb
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #444', margin: '15px 0' }} />

        <div style={{ fontSize: '12px', color: '#aaa' }}>
          <strong>Controls:</strong><br />
          • Left drag: Rotate<br />
          • Right drag: Pan<br />
          • Scroll: Zoom<br />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #444', margin: '15px 0' }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
          <input
            type="checkbox"
            checked={showStats}
            onChange={(e) => setShowStats(e.target.checked)}
          />
          Show FPS Stats
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          Show Grid
        </label>
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [15, 15, 15], fov: 50 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ReinhardToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        {showStats && <Stats />}

        {/* Remove bright environment - use dark background only */}
        {/* No Environment component = darker scene */}

        {/* Fog for atmosphere */}
        <fog attach="fog" args={['#1a1a2e', 20, 60]} />

        <Scene />

        {/* Camera controls */}
        <OrbitControls
          makeDefault
          minDistance={5}
          maxDistance={50}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.1}
        />
      </Canvas>

      {/* Asset info */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.8)',
        padding: '15px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}>
        <strong>Loaded Assets:</strong><br />
        ✅ boss_platform.glb
      </div>
    </div>
  );
}

// Preload the model
useGLTF.preload('/assets/terrain/boss_platform.glb');
