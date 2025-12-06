// ===== POLITICIAN CHARACTER COMPONENT =====
// Uses dummy model for politician units (combination system)
import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { CharacterData, MonsterData } from '../types';
import {
  CHARACTER_SPEED,
  PLATFORM_SIZE,
  BOSS_PLATFORM_SIZE,
  LANE_OFFSET,
  BRIDGE_HEIGHT,
  RAMP_LENGTH,
  BOSS_PLATFORM_X,
  ATTACK_ANIMATION_DURATION_FACTOR,
  GLOBAL_ATTACK_SPEED_MULTIPLIER,
} from '../constants';
import { removeRootMotion } from '../utils';
import { calculateDamage } from '../gameData';
import { CircleLine } from '../components/CircleLine';
import { TIER_COLORS, TIER_NAMES, PARTY_COLORS } from '../data/politicians';

// Preload dummy character GLBs
useGLTF.preload('/assets/characters/dummy_idle.glb');
useGLTF.preload('/assets/characters/dummy_running.glb');
useGLTF.preload('/assets/characters/dummy_punching.glb');

// Scale for dummy character
const DUMMY_SCALE = 0.8;

interface PoliticianCharacterProps {
  data: CharacterData;
  isSelected: boolean;
  onSelect: (id: string, addToSelection: boolean) => void;
  onSelectAllSameType?: (type: 1 | 2) => void;
  monsters: MonsterData[];
  monsterPosRefs: Map<string, THREE.Vector3>;
  onAttackMonster: (attackerId: string, monsterId: string, damage: number) => void;
  onStateChange: (charId: string, state: CharacterData['state']) => void;
  hideOverlay?: boolean;
}

export function PoliticianCharacter({
  data,
  isSelected,
  onSelect,
  onSelectAllSameType,
  monsters,
  monsterPosRefs,
  onAttackMonster,
  onStateChange,
  hideOverlay = false,
}: PoliticianCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const [currentState, setCurrentState] = useState<'idle' | 'running' | 'attacking'>('idle');
  const [inRange, setInRange] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const currentTargetRef = useRef<string | null>(null);
  const pendingDamageMultiplierRef = useRef<number>(1.0);
  const lastClickTimeRef = useRef<number>(0);

  // Keep monsters in ref to avoid useEffect re-runs
  const monstersRef = useRef(monsters);
  monstersRef.current = monsters;

  // Load dummy models
  const { scene: idleScene, animations: idleAnims } = useGLTF('/assets/characters/dummy_idle.glb');
  const { scene: runScene, animations: runAnims } = useGLTF('/assets/characters/dummy_running.glb');
  const { scene: punchScene, animations: punchAnims } = useGLTF('/assets/characters/dummy_punching.glb');

  // Clone scenes
  const clonedIdle = useMemo(() => {
    const clone = SkeletonUtils.clone(idleScene);
    clone.traverse(child => { child.matrixAutoUpdate = true; });

    // Apply party color tint to the model
    if (data.politician) {
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material.color) {
            const partyColor = new THREE.Color(PARTY_COLORS[data.politician!.party]);
            // Blend with original color (30% party color)
            material.color.lerp(partyColor, 0.3);
          }
        }
      });
    }

    return clone;
  }, [idleScene, data.politician]);

  const clonedRun = useMemo(() => {
    const clone = SkeletonUtils.clone(runScene);
    clone.traverse(child => { child.matrixAutoUpdate = true; });

    // Apply party color tint
    if (data.politician) {
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material.color) {
            const partyColor = new THREE.Color(PARTY_COLORS[data.politician!.party]);
            material.color.lerp(partyColor, 0.3);
          }
        }
      });
    }

    return clone;
  }, [runScene, data.politician]);

  const clonedPunch = useMemo(() => {
    const clone = SkeletonUtils.clone(punchScene);
    clone.traverse(child => { child.matrixAutoUpdate = true; });

    // Apply party color tint
    if (data.politician) {
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material.color) {
            const partyColor = new THREE.Color(PARTY_COLORS[data.politician!.party]);
            material.color.lerp(partyColor, 0.3);
          }
        }
      });
    }

    return clone;
  }, [punchScene, data.politician]);

  const { scene: currentScene, anims: currentAnims } = useMemo(() => {
    switch (currentState) {
      case 'running': return { scene: clonedRun, anims: runAnims };
      case 'attacking': return { scene: clonedPunch, anims: punchAnims };
      default: return { scene: clonedIdle, anims: idleAnims };
    }
  }, [currentState, clonedIdle, clonedRun, clonedPunch, idleAnims, runAnims, punchAnims]);

  // Animation setup
  useEffect(() => {
    if (currentAnims.length === 0) return;

    const mixer = new THREE.AnimationMixer(currentScene);
    mixerRef.current = mixer;

    const clip = removeRootMotion(currentAnims[0].clone());
    const action = mixer.clipAction(clip);
    actionRef.current = action;

    const isAttackState = currentState === 'attacking';

    const onFinished = () => {
      if (currentTargetRef.current) {
        const targetMonster = monstersRef.current.find(m => m.id === currentTargetRef.current && !m.isDying);
        if (targetMonster) {
          const damage = calculateDamage(data.stats.attack, targetMonster.defense, pendingDamageMultiplierRef.current);
          onAttackMonster(data.id, currentTargetRef.current, damage);
        }
      }
      pendingDamageMultiplierRef.current = 1.0;
      setCurrentState('idle');
      onStateChange(data.id, 'idle');
    };

    if (isAttackState) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;

      const effectiveAttackSpeed = data.stats.attackSpeed * GLOBAL_ATTACK_SPEED_MULTIPLIER;
      const targetDuration = (1 / effectiveAttackSpeed) * ATTACK_ANIMATION_DURATION_FACTOR;
      action.timeScale = clip.duration / targetDuration;

      mixer.addEventListener('finished', onFinished);
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
    }

    action.enabled = true;
    action.play();

    return () => {
      if (isAttackState) {
        mixer.removeEventListener('finished', onFinished);
      }
      mixer.stopAllAction();
      mixerRef.current = null;
      actionRef.current = null;
    };
  }, [currentState, currentScene, currentAnims, onAttackMonster, data.stats.attackSpeed, data.stats.attack, data.id, onStateChange]);

  // Movement and attack logic
  useFrame((_, delta) => {
    const MAX_DELTA = 0.1;
    const clampedDelta = Math.min(delta, MAX_DELTA);

    if (mixerRef.current) {
      mixerRef.current.update(clampedDelta);
    }

    if (!groupRef.current) return;

    const currentPos = groupRef.current.position;
    const isAttacking = currentState === 'attacking';

    // Movement logic
    if (data.targetPosition && !isAttacking) {
      const dir = new THREE.Vector3().subVectors(data.targetPosition, currentPos);
      dir.y = 0;
      const distance = dir.length();

      if (distance > 0.1) {
        if (currentState !== 'running') {
          setCurrentState('running');
        }

        dir.normalize();
        const moveAmount = Math.min(clampedDelta * CHARACTER_SPEED, distance);
        currentPos.x += dir.x * moveAmount;
        currentPos.z += dir.z * moveAmount;

        // Calculate Y position based on bridge location
        const bossPlatformX = PLATFORM_SIZE / 2 + 8 + BOSS_PLATFORM_SIZE / 2;
        const rampStartX = LANE_OFFSET - 2;
        const flatStartX = rampStartX + RAMP_LENGTH;
        const rampEndX = bossPlatformX - BOSS_PLATFORM_SIZE / 2;
        const flatEndX = rampEndX - RAMP_LENGTH;
        const bridgeHalfWidth = 1.1;

        if (Math.abs(currentPos.z) <= bridgeHalfWidth) {
          if (currentPos.x >= flatStartX && currentPos.x <= flatEndX) {
            currentPos.y = BRIDGE_HEIGHT;
          } else if (currentPos.x >= rampStartX && currentPos.x < flatStartX) {
            const rampProgress = (currentPos.x - rampStartX) / RAMP_LENGTH;
            currentPos.y = rampProgress * BRIDGE_HEIGHT;
          } else if (currentPos.x > flatEndX && currentPos.x <= rampEndX) {
            const rampProgress = (rampEndX - currentPos.x) / RAMP_LENGTH;
            currentPos.y = rampProgress * BRIDGE_HEIGHT;
          } else {
            currentPos.y = 0;
          }
        } else {
          currentPos.y = 0;
        }

        data.position.copy(currentPos);
        groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      } else {
        if (data.waypointQueue.length > 1) {
          data.waypointQueue.shift();
          data.targetPosition = data.waypointQueue[0];
        } else {
          data.waypointQueue = [];
          data.targetPosition = null;
          const rampStartX = LANE_OFFSET - 2;
          const rampEndX = BOSS_PLATFORM_X - BOSS_PLATFORM_SIZE / 2;
          if (!(currentPos.x >= rampStartX && currentPos.x <= rampEndX && Math.abs(currentPos.z) <= 1.1)) {
            currentPos.y = 0;
          }
          data.position.copy(currentPos);
          if (currentState === 'running') {
            setCurrentState('idle');
          }
        }
      }
    } else if (!data.targetPosition && data.waypointQueue.length === 0 && currentState === 'running') {
      setCurrentState('idle');
    }

    // Find nearest alive monster in range
    let nearestMonster: { id: string; dist: number; pos: THREE.Vector3 } | null = null;
    const attackRange = data.stats.attackRange;

    for (const monster of monsters) {
      if (monster.isDying) continue;
      const monsterPos = monsterPosRefs.get(monster.id);
      if (!monsterPos) continue;

      const dist = currentPos.distanceTo(monsterPos);
      if (dist <= attackRange && (!nearestMonster || dist < nearestMonster.dist)) {
        nearestMonster = { id: monster.id, dist, pos: monsterPos };
      }
    }

    const isInRange = nearestMonster !== null;
    setInRange(isInRange);

    // Trigger attack
    if (isInRange && !isAttacking && !data.targetPosition) {
      const now = Date.now();
      const effectiveAttackSpeed = data.stats.attackSpeed * GLOBAL_ATTACK_SPEED_MULTIPLIER;
      const attackCooldown = 1000 / effectiveAttackSpeed;
      if (now - data.lastAttackTime > attackCooldown) {
        data.targetPosition = null;
        data.lastAttackTime = now;
        currentTargetRef.current = nearestMonster!.id;
        pendingDamageMultiplierRef.current = 1.0;
        setCurrentState('attacking');
        onStateChange(data.id, 'attacking');

        const dir = new THREE.Vector3().subVectors(nearestMonster!.pos, currentPos);
        groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }
  });

  const charScale = DUMMY_SCALE;
  const attackRingRadius = data.stats.attackRange / charScale;
  const selectionRingRadius = 0.6 / charScale;
  const hitboxRadius = 0.3 / charScale;
  const hitboxHeight = 1.0 / charScale;

  const getRingColor = () => {
    if (inRange) return '#ff0000';
    return '#ffff00';
  };

  // Get party-specific selection color
  const getSelectionColor = () => {
    if (data.politician) {
      return PARTY_COLORS[data.politician.party];
    }
    return '#00ff00';
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(true);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(false);
  };

  const handleSelectClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - lastClickTimeRef.current;
    const isDoubleClick = timeSinceLastClick < 300;

    if (isDoubleClick && onSelectAllSameType) {
      onSelectAllSameType(data.type);
      lastClickTimeRef.current = 0;
    } else {
      onSelect(data.id, e.shiftKey);
      lastClickTimeRef.current = currentTime;
    }
  };

  return (
    <group
      ref={groupRef}
      position={[data.position.x, data.position.y, data.position.z]}
      scale={[charScale, charScale, charScale]}
    >
      {/* Hitbox helper ring */}
      <mesh
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleSelectClick}
      >
        <circleGeometry args={[hitboxRadius, 32]} />
        <meshBasicMaterial
          color="#00ffaa"
          transparent
          opacity={isHovered ? 0.25 : 0.01}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Upright cylinder hitbox for easier clicking in the center */}
      <mesh
        position={[0, hitboxHeight / 2, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleSelectClick}
      >
        <cylinderGeometry args={[hitboxRadius, hitboxRadius, hitboxHeight, 12]} />
        <meshBasicMaterial
          color="#00ffaa"
          transparent
          opacity={isHovered ? 0.08 : 0.02}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <primitive
        object={currentScene}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => e.stopPropagation()}
        onClick={(e: ThreeEvent<MouseEvent>) => e.stopPropagation()}
      />

      {/* Selection indicator with party color */}
      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[selectionRingRadius, 32]} />
          <meshBasicMaterial color={getSelectionColor()} transparent opacity={0.5} depthTest={false} />
        </mesh>
      )}

      {/* Attack range ring */}
      <CircleLine
        radius={attackRingRadius}
        color={getRingColor()}
        opacity={0.8}
      />

      {/* Name and tier label for politician units */}
      {data.politician && !hideOverlay && (
        <Html
          position={[0, 2.5 / charScale, 0]}
          center
          distanceFactor={10}
          zIndexRange={[0, 0]} // keep nameplates below UI modals
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            transform: 'translateY(-100%)',
          }}>
            {/* Tier badge */}
            <div style={{
              padding: '2px 6px',
              borderRadius: 4,
              background: TIER_COLORS[data.politician.tier],
              color: 'white',
              fontSize: 10,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}>
              {TIER_NAMES[data.politician.tier]}
            </div>
            {/* Name */}
            <div style={{
              padding: '3px 8px',
              borderRadius: 4,
              background: 'rgba(0,0,0,0.8)',
              border: `2px solid ${PARTY_COLORS[data.politician.party]}`,
              color: 'white',
              fontSize: 12,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            }}>
              {data.politician.name}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
