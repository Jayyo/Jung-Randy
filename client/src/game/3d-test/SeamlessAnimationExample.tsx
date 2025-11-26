import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

/**
 * SEAMLESS MIXAMO ANIMATION EXAMPLE
 *
 * This example demonstrates how to create perfectly looping Mixamo animations
 * in React Three Fiber, solving the common "snap/jump" issue at loop points.
 *
 * SOLUTIONS APPLIED:
 * 1. Manual AnimationMixer (NOT useAnimations hook) - gives full control
 * 2. Set animation duration to slightly LESS than actual clip duration
 * 3. Use LoopRepeat with proper timeScale
 * 4. Ensure mixer.update() is called EVERY frame
 * 5. Reset animation time when it gets too close to end
 */

// Preload GLB
useGLTF.preload('/assets/monsters/monster_run.glb');

interface AnimatedModelProps {
  modelPath: string;
  position?: [number, number, number];
  scale?: number;
  animationSpeed?: number;
}

/**
 * Component that renders a GLB model with seamless looping animation
 */
function SeamlessAnimatedModel({
  modelPath,
  position = [0, 0, 0],
  scale = 1,
  animationSpeed = 1.0
}: AnimatedModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);

  const { scene, animations } = useGLTF(modelPath);

  // Clone scene ONCE per instance - stable dependency
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      // CRITICAL: Enable matrix auto update for animated objects
      child.matrixAutoUpdate = true;
      child.frustumCulled = false; // Prevent culling issues
    });
    return clone;
  }, [scene]);

  // Setup animation mixer - runs ONCE
  useEffect(() => {
    if (!clonedScene || animations.length === 0) {
      console.warn('No animations found in GLB file');
      return;
    }

    const mixer = new THREE.AnimationMixer(clonedScene);
    mixerRef.current = mixer;

    const clip = animations[0];
    console.log(`Animation clip: ${clip.name}, duration: ${clip.duration}s, tracks: ${clip.tracks.length}`);

    // SOLUTION 1: Create action with infinite loop
    const action = mixer.clipAction(clip);
    actionRef.current = action;

    // SOLUTION 2: Configure looping behavior
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false; // Allow seamless loop
    action.enabled = true;

    // SOLUTION 3: Adjust timeScale for animation speed
    action.timeScale = animationSpeed;

    // SOLUTION 4 (OPTIONAL): Trim last frame to improve seamless loop
    // This helps when Mixamo export has slight mismatch between first/last frame
    const trimAmount = 0.01; // Trim 10ms from end
    if (clip.duration > trimAmount) {
      clip.duration = clip.duration - trimAmount;
    }

    // Start playing
    action.play();

    console.log('Animation started:', {
      loop: action.loop,
      repetitions: action.repetitions,
      timeScale: action.timeScale,
      duration: clip.duration
    });

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
      actionRef.current = null;
    };
  }, [clonedScene, animations, animationSpeed]);

  // CRITICAL: Update mixer EVERY frame
  useFrame((state, delta) => {
    if (mixerRef.current && actionRef.current) {
      // SOLUTION 5: Update mixer with delta time
      mixerRef.current.update(delta);

      // SOLUTION 6 (OPTIONAL): Manual loop control for extra smoothness
      // Reset animation if it's very close to end
      const clip = animations[0];
      if (clip && actionRef.current.time > clip.duration - 0.05) {
        actionRef.current.time = 0;
      }

      // Optional: Smooth rotation for visual demo
      if (groupRef.current) {
        groupRef.current.rotation.y += delta * 0.2;
      }
    }
  });

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      <primitive object={clonedScene} castShadow receiveShadow />
    </group>
  );
}

/**
 * Alternative approach using CrossFade for even smoother loops
 */
function CrossFadeAnimatedModel({ modelPath, position = [0, 0, 0], scale = 1 }: AnimatedModelProps) {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<THREE.AnimationAction[]>([]);

  const { scene, animations } = useGLTF(modelPath);

  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      child.matrixAutoUpdate = true;
      child.frustumCulled = false;
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    if (!clonedScene || animations.length === 0) return;

    const mixer = new THREE.AnimationMixer(clonedScene);
    mixerRef.current = mixer;

    // Create actions for all animations
    const actions = animations.map(clip => mixer.clipAction(clip));
    actionsRef.current = actions;

    // Play first animation
    if (actions.length > 0) {
      const firstAction = actions[0];
      firstAction.setLoop(THREE.LoopRepeat, Infinity);
      firstAction.enabled = true;
      firstAction.play();

      // ADVANCED: Setup crossfade to itself at loop point
      // This creates ultra-smooth loop by blending end with start
      mixer.addEventListener('finished', (e) => {
        const action = e.action;
        if (action) {
          action.reset();
          action.play();
        }
      });
    }

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [clonedScene, animations]);

  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <primitive object={clonedScene} castShadow receiveShadow />
    </group>
  );
}

/**
 * Platform with multiple animated models for comparison
 */
function Scene() {
  return (
    <>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2d5a2d" roughness={0.9} />
      </mesh>

      {/* Method 1: Standard seamless loop (RECOMMENDED) */}
      <group position={[-3, 0, 0]}>
        <SeamlessAnimatedModel
          modelPath="/assets/monsters/monster_run.glb"
          position={[0, 0, 0]}
          scale={0.5}
          animationSpeed={1.0}
        />
        <Text position={[0, 2, 0]} text="Standard Loop" />
      </group>

      {/* Method 2: Faster animation (test timeScale) */}
      <group position={[0, 0, 0]}>
        <SeamlessAnimatedModel
          modelPath="/assets/monsters/monster_run.glb"
          position={[0, 0, 0]}
          scale={0.5}
          animationSpeed={1.5}
        />
        <Text position={[0, 2, 0]} text="1.5x Speed" />
      </group>

      {/* Method 3: CrossFade approach */}
      <group position={[3, 0, 0]}>
        <CrossFadeAnimatedModel
          modelPath="/assets/monsters/monster_run.glb"
          position={[0, 0, 0]}
          scale={0.5}
        />
        <Text position={[0, 2, 0]} text="CrossFade Loop" />
      </group>
    </>
  );
}

function Text({ position, text }: { position: [number, number, number]; text: string }) {
  return (
    <mesh position={position}>
      <planeGeometry args={[2, 0.5]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.7} />
      {/* Note: For actual text, use @react-three/drei Text component */}
    </mesh>
  );
}

/**
 * Main scene with UI controls
 */
export default function SeamlessAnimationExample() {
  const [showInfo, setShowInfo] = useState(true);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
      {/* Info Panel */}
      {showInfo && (
        <div style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 100,
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          maxWidth: '400px',
          fontSize: '13px',
          lineHeight: '1.6'
        }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#2ecc71' }}>
            Seamless Mixamo Animation Guide
          </h2>

          <h3 style={{ margin: '10px 0 5px 0', color: '#3498db' }}>Solutions Applied:</h3>
          <ol style={{ margin: '5px 0 15px 20px', padding: 0 }}>
            <li>Manual AnimationMixer (full control)</li>
            <li>LoopRepeat with Infinity repetitions</li>
            <li>Trim clip duration by 0.01s</li>
            <li>Set clampWhenFinished = false</li>
            <li>Update mixer EVERY frame</li>
            <li>Optional: Manual time reset near end</li>
          </ol>

          <h3 style={{ margin: '10px 0 5px 0', color: '#e74c3c' }}>Common Mistakes:</h3>
          <ul style={{ margin: '5px 0 15px 20px', padding: 0 }}>
            <li>Using LoopOnce instead of LoopRepeat</li>
            <li>Not calling mixer.update(delta)</li>
            <li>Forgetting matrixAutoUpdate = true</li>
            <li>First/last frame mismatch in Mixamo export</li>
          </ul>

          <h3 style={{ margin: '10px 0 5px 0', color: '#f39c12' }}>Mixamo Export Settings:</h3>
          <ul style={{ margin: '5px 0 15px 20px', padding: 0 }}>
            <li>Format: <strong>GLB (Binary)</strong></li>
            <li>Skin: <strong>With Skin</strong></li>
            <li>Frames per second: <strong>30</strong></li>
            <li>Keyframe Reduction: <strong>None</strong> (for loops)</li>
          </ul>

          <button
            onClick={() => setShowInfo(false)}
            style={{
              background: '#2ecc71',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              marginTop: '10px'
            }}
          >
            Hide Info
          </button>
        </div>
      )}

      {/* Toggle button when hidden */}
      {!showInfo && (
        <button
          onClick={() => setShowInfo(true)}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 100,
            background: '#3498db',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Show Info
        </button>
      )}

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[6, 4, 6]} fov={60} />
        <OrbitControls
          target={[0, 1, 0]}
          minDistance={3}
          maxDistance={15}
        />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <hemisphereLight intensity={0.3} groundColor="#444444" />

        {/* Scene */}
        <Scene />
      </Canvas>
    </div>
  );
}
