/**
 * Material Test Viewer - Debug GLB material export
 * Access at: http://localhost:3000/material-test
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Grid, Stats } from '@react-three/drei';
import React, { Suspense, useState } from 'react';
import * as THREE from 'three';

function TestModel({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const { scene } = useGLTF('/assets/terrain/material_test.glb');

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

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="gray" wireframe />
    </mesh>
  );
}

// Light presets
const LIGHT_PRESETS = {
  white: {
    name: 'White (Neutral)',
    ambient: { intensity: 0.5, color: '#ffffff' },
    directional: { intensity: 1.0, color: '#ffffff' },
  },
  warm: {
    name: 'Warm',
    ambient: { intensity: 0.4, color: '#fff5e6' },
    directional: { intensity: 1.0, color: '#ffeecc' },
  },
  cool: {
    name: 'Cool (Blue)',
    ambient: { intensity: 0.3, color: '#e6f0ff' },
    directional: { intensity: 0.8, color: '#aaccff' },
  },
  dark: {
    name: 'Dark Dungeon',
    ambient: { intensity: 0.15, color: '#2a2a3e' },
    directional: { intensity: 0.5, color: '#6688cc' },
  },
  none: {
    name: 'No Lights (Emission Only)',
    ambient: { intensity: 0.0, color: '#000000' },
    directional: { intensity: 0.0, color: '#000000' },
  },
};

type LightPreset = keyof typeof LIGHT_PRESETS;

function Scene({ lightPreset }: { lightPreset: LightPreset }) {
  const preset = LIGHT_PRESETS[lightPreset];

  return (
    <>
      <ambientLight intensity={preset.ambient.intensity} color={preset.ambient.color} />

      <directionalLight
        position={[10, 20, 10]}
        intensity={preset.directional.intensity}
        color={preset.directional.color}
        castShadow
      />

      <directionalLight
        position={[-10, 10, -10]}
        intensity={preset.directional.intensity * 0.5}
        color={preset.directional.color}
      />

      <Grid
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#333333"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={50}
        position={[0, -1, 0]}
      />

      <Suspense fallback={<LoadingFallback />}>
        <TestModel position={[0, 0, 0]} />
      </Suspense>
    </>
  );
}

export default function MaterialTestViewer() {
  const [lightPreset, setLightPreset] = useState<LightPreset>('white');
  const [bgColor, setBgColor] = useState('#1a1a2e');

  return (
    <div style={{ width: '100vw', height: '100vh', background: bgColor }}>
      {/* UI Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100,
        background: 'rgba(0,0,0,0.9)',
        padding: '20px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'monospace',
        maxWidth: '300px',
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>🧪 Material Test</h2>

        <div style={{ marginBottom: '15px' }}>
          <strong>Light Preset:</strong>
          <div style={{ marginTop: '8px' }}>
            {Object.entries(LIGHT_PRESETS).map(([key, value]) => (
              <label key={key} style={{
                display: 'block',
                marginBottom: '4px',
                cursor: 'pointer',
              }}>
                <input
                  type="radio"
                  name="lightPreset"
                  checked={lightPreset === key}
                  onChange={() => setLightPreset(key as LightPreset)}
                  style={{ marginRight: '8px' }}
                />
                {value.name}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>Background:</strong>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['#000000', '#1a1a2e', '#333333', '#666666', '#ffffff'].map((color) => (
              <button
                key={color}
                onClick={() => setBgColor(color)}
                style={{
                  width: '30px',
                  height: '30px',
                  background: color,
                  border: bgColor === color ? '3px solid cyan' : '1px solid #666',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #444', margin: '15px 0' }} />

        <div style={{ fontSize: '11px', color: '#888' }}>
          <strong>Test Layout:</strong><br />
          Row 1: Gray 0.1→0.8<br />
          Row 2: Solid colors<br />
          Row 3: Red emit 1→20<br />
          Row 4: Color emits @ 5
        </div>
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 15, 20], fov: 50 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ReinhardToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ReinhardToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <Stats />
        <Scene lightPreset={lightPreset} />
        <OrbitControls
          makeDefault
          minDistance={5}
          maxDistance={50}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload('/assets/terrain/material_test.glb');
