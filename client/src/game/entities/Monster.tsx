// ===== MONSTER COMPONENT =====
import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { MonsterData } from '../types';
import { MONSTER_SCALE, MONSTER_SPEED } from '../constants';
import { getPathPosition, removeRootMotion } from '../utils';

// Preload monster GLBs
useGLTF.preload('/assets/monsters/monster_run.glb');
useGLTF.preload('/assets/monsters/monster_death.glb');

interface MonsterProps {
  data: MonsterData;
  positionRef: React.MutableRefObject<THREE.Vector3>;
  onDeath: () => void;
  onClick: () => void;
  isSelected: boolean;
  hideOverlay?: boolean;
}

export function Monster({
  data,
  positionRef,
  onDeath,
  onClick,
  isSelected,
  hideOverlay = false,
}: MonsterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const progressRef = useRef(data.progress);
  const opacityRef = useRef(1);

  // Apply wave-based size multiplier (world boss already scaled up at spawn)
  const finalScale = MONSTER_SCALE * data.sizeMultiplier;

  const { scene: runScene, animations: runAnims } = useGLTF('/assets/monsters/monster_run.glb');
  const { scene: deathScene, animations: deathAnims } = useGLTF('/assets/monsters/monster_death.glb');

  const clonedRunScene = useMemo(() => {
    const clone = SkeletonUtils.clone(runScene);
    clone.traverse(child => { child.matrixAutoUpdate = true; });
    return clone;
  }, [runScene]);

  const clonedDeathScene = useMemo(() => {
    const clone = SkeletonUtils.clone(deathScene);
    clone.traverse(child => { child.matrixAutoUpdate = true; });
    return clone;
  }, [deathScene]);

  const [currentScene, setCurrentScene] = useState<THREE.Object3D>(clonedRunScene);

  // Reset on new monster
  useEffect(() => {
    progressRef.current = 0;
    opacityRef.current = 1;
    setCurrentScene(clonedRunScene);
  }, [data.id, clonedRunScene]);

  // Setup animation
  useEffect(() => {
    const scene = data.isDying ? clonedDeathScene : clonedRunScene;
    const anims = data.isDying ? deathAnims : runAnims;

    setCurrentScene(scene);

    if (anims.length === 0) return;

    const mixer = new THREE.AnimationMixer(scene);
    mixerRef.current = mixer;

    const clip = removeRootMotion(anims[0].clone());
    const action = mixer.clipAction(clip);

    if (data.isDying) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;

      // World boss: keep animation frozen
      if (data.isWorldBoss) {
        action.paused = true;
        action.time = 0;
      }
    }

    action.enabled = true;
    action.play();

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [data.isDying, data.id, clonedRunScene, clonedDeathScene, runAnims, deathAnims]);

  useFrame((_, delta) => {
    // Clamp delta to prevent large jumps when browser is in background
    // This prevents monsters from bunching up when the tab is inactive
    const MAX_DELTA = 0.1; // Maximum 100ms per frame
    const clampedDelta = Math.min(delta, MAX_DELTA);

    // World boss stays anchored with no movement/animation
    if (data.isWorldBoss && !data.isDying) {
      if (groupRef.current) {
        const pos = positionRef.current;
        groupRef.current.position.set(pos.x, pos.y, pos.z);
        groupRef.current.rotation.y = 0;
      }
      return;
    }

    if (mixerRef.current) {
      mixerRef.current.update(clampedDelta);
    }

    if (data.isDying) {
      opacityRef.current = Math.max(0, opacityRef.current - clampedDelta * 0.8);

      if (groupRef.current) {
        groupRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach(mat => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.transparent = true;
                  mat.opacity = opacityRef.current;
                }
              });
            }
          }
        });
      }

      if (opacityRef.current <= 0.05) {
        onDeath();
      }
      return;
    }

    if (!data.isWorldBoss) {
      // Update position with clamped delta
      progressRef.current += clampedDelta * MONSTER_SPEED;
      if (progressRef.current >= 1) {
        progressRef.current = 0;
      }

      if (groupRef.current) {
        const { x, z, rotationY } = getPathPosition(progressRef.current);
        groupRef.current.position.set(x, 0, z);
        groupRef.current.rotation.y = rotationY;

        // Update shared position ref for attack checks
        positionRef.current.set(x, 0, z);
      }
    }
  });

  const initial = data.isWorldBoss
    ? { x: positionRef.current.x, z: positionRef.current.z, rotationY: 0 }
    : getPathPosition(progressRef.current);

  return (
    <group
      ref={groupRef}
      position={[initial.x, 0, initial.z]}
      rotation={[0, initial.rotationY, 0]}
      scale={[finalScale, finalScale, finalScale]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <primitive object={currentScene} />

      {/* Selection ring for monster */}
      {isSelected && !data.isDying && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2 / finalScale * MONSTER_SCALE, 1.5 / finalScale * MONSTER_SCALE, 32]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.6} depthTest={false} />
        </mesh>
      )}

      {!data.isDying && !hideOverlay && (
        <Html position={[0, 4, 0]} center>
          <div style={{
            width: '60px',
            height: '8px',
            background: '#333',
            borderRadius: '4px',
            overflow: 'hidden',
            border: isSelected ? '2px solid #ff0000' : '1px solid #000'
          }}>
            <div style={{
              width: `${(data.hp / data.maxHp) * 100}%`,
              height: '100%',
              background: data.hp > data.maxHp / 2 ? '#4CAF50' : '#f44336',
              transition: 'width 0.2s'
            }} />
          </div>
        </Html>
      )}
    </group>
  );
}
