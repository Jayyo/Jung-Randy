// ===== CHARACTER COMPONENT =====
import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { CharacterData, MonsterData } from '../types';
import {
  CHARACTER1_SCALE,
  CHARACTER2_SCALE,
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

// Preload character GLBs
useGLTF.preload('/assets/characters/char1_idle.glb');
useGLTF.preload('/assets/characters/char1_run.glb');
useGLTF.preload('/assets/characters/char1_punch.glb');
useGLTF.preload('/assets/characters/char2_idle.glb');
useGLTF.preload('/assets/characters/char2_run.glb');
useGLTF.preload('/assets/characters/char2_punch.glb');
// Skill animations
useGLTF.preload('/assets/characters/skills/char1_chapa.glb');
useGLTF.preload('/assets/characters/skills/char1_flying_kick.glb');
useGLTF.preload('/assets/characters/skills/char2_jump_attack.glb');

interface CharacterProps {
  data: CharacterData;
  isSelected: boolean;
  onSelect: (id: string, addToSelection: boolean) => void;
  onSelectAllSameType?: (type: 1 | 2) => void; // For double-click to select all same type
  monsters: MonsterData[];
  monsterPosRefs: Map<string, THREE.Vector3>;
  onAttackMonster: (attackerId: string, monsterId: string, damage: number) => void;
  onStateChange: (charId: string, state: CharacterData['state']) => void;
  hideOverlay?: boolean;
}

export function Character({
  data,
  isSelected,
  onSelect,
  onSelectAllSameType,
  monsters,
  monsterPosRefs,
  onAttackMonster,
  onStateChange,
  hideOverlay = false,
}: CharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const [currentState, setCurrentState] = useState<'idle' | 'running' | 'attacking' | 'passive_skill' | 'active_skill'>('idle');
  const [inRange, setInRange] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const currentTargetRef = useRef<string | null>(null);
  const aoeTargetsRef = useRef<string[]>([]);
  const pendingDamageMultiplierRef = useRef<number>(1.0);
  const isPlayingSkillRef = useRef(false);
  const cancelAttackRef = useRef(false);
  const isAoESkillRef = useRef(false);
  const lastClickTimeRef = useRef<number>(0);

  // Keep monsters in ref to avoid useEffect re-runs when monsters change
  const monstersRef = useRef(monsters);
  monstersRef.current = monsters;

  const prefix = data.type === 1 ? 'char1' : 'char2';
  const { scene: idleScene, animations: idleAnims } = useGLTF(`/assets/characters/${prefix}_idle.glb`);
  const { scene: runScene, animations: runAnims } = useGLTF(`/assets/characters/${prefix}_run.glb`);
  const { scene: punchScene, animations: punchAnims } = useGLTF(`/assets/characters/${prefix}_punch.glb`);

  // Skill animations
  const { scene: passiveScene, animations: passiveAnims } = useGLTF(
    data.type === 1 ? '/assets/characters/skills/char1_chapa.glb' : '/assets/characters/skills/char2_jump_attack.glb'
  );
  const { scene: activeScene, animations: activeAnims } = useGLTF(
    data.type === 1 ? '/assets/characters/skills/char1_flying_kick.glb' : '/assets/characters/skills/char2_jump_attack.glb'
  );

  const clonedIdle = useMemo(() => {
    const clone = SkeletonUtils.clone(idleScene);
    clone.traverse(child => { child.matrixAutoUpdate = true; });
    return clone;
  }, [idleScene]);

  const clonedRun = useMemo(() => {
    const clone = SkeletonUtils.clone(runScene);
    clone.traverse(child => { child.matrixAutoUpdate = true; });
    return clone;
  }, [runScene]);

  const clonedPunch = useMemo(() => {
    const clone = SkeletonUtils.clone(punchScene);
    clone.traverse(child => { child.matrixAutoUpdate = true; });
    return clone;
  }, [punchScene]);

  const clonedPassive = useMemo(() => {
    const clone = SkeletonUtils.clone(passiveScene);
    clone.traverse(child => { child.matrixAutoUpdate = true; });
    return clone;
  }, [passiveScene]);

  const clonedActive = useMemo(() => {
    const clone = SkeletonUtils.clone(activeScene);
    clone.traverse(child => { child.matrixAutoUpdate = true; });
    return clone;
  }, [activeScene]);

  const { scene: currentScene, anims: currentAnims } = useMemo(() => {
    switch (currentState) {
      case 'running': return { scene: clonedRun, anims: runAnims };
      case 'attacking': return { scene: clonedPunch, anims: punchAnims };
      case 'passive_skill': return { scene: clonedPassive, anims: passiveAnims };
      case 'active_skill': return { scene: clonedActive, anims: activeAnims };
      default: return { scene: clonedIdle, anims: idleAnims };
    }
  }, [currentState, clonedIdle, clonedRun, clonedPunch, clonedPassive, clonedActive, idleAnims, runAnims, punchAnims, passiveAnims, activeAnims]);

  // Handle external state changes (e.g., active skill button press)
  const activeSkillStartedRef = useRef(false);

  useEffect(() => {
    if (data.state !== 'active_skill') {
      activeSkillStartedRef.current = false;
      return;
    }

    if (activeSkillStartedRef.current) return;
    if (currentState === 'active_skill') return;

    activeSkillStartedRef.current = true;

    isPlayingSkillRef.current = true;
    cancelAttackRef.current = false;

    const activeSkill = data.stats.skills.active;
    const isAoE = activeSkill?.isAoE || false;
    isAoESkillRef.current = isAoE;
    aoeTargetsRef.current = [];

    // Find monsters for active skill targeting (within skill range)
    if (groupRef.current) {
      const currentPos = groupRef.current.position;
      const skillRange = activeSkill?.range || 5.0;
      const monstersInRange: { id: string; pos: THREE.Vector3; dist: number }[] = [];

      for (const monster of monsters) {
        if (monster.isDying) continue;
        const monsterPos = monsterPosRefs.get(monster.id);
        if (!monsterPos) continue;

        const dist = currentPos.distanceTo(monsterPos);
        if (dist <= skillRange) {
          monstersInRange.push({ id: monster.id, pos: monsterPos, dist });
        }
      }

      if (monstersInRange.length > 0) {
        monstersInRange.sort((a, b) => a.dist - b.dist);
        const nearest = monstersInRange[0];

        if (isAoE) {
          aoeTargetsRef.current = monstersInRange.map(m => m.id);
          currentTargetRef.current = nearest.id;
        } else {
          currentTargetRef.current = nearest.id;
        }

        pendingDamageMultiplierRef.current = activeSkill?.damageMultiplier || 1.0;

        const dir = new THREE.Vector3().subVectors(nearest.pos, currentPos);
        groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      } else {
        currentTargetRef.current = null;
        aoeTargetsRef.current = [];
      }
    }
    setCurrentState('active_skill');
  }, [data.state, currentState, monsters, monsterPosRefs, data.stats.skills.active]);

  // Handle cancel attack request (from right-click move command)
  useEffect(() => {
    if (data.targetPosition && (currentState === 'attacking' || currentState === 'passive_skill')) {
      cancelAttackRef.current = true;
      isPlayingSkillRef.current = false;
      pendingDamageMultiplierRef.current = 1.0;

      if (actionRef.current) {
        actionRef.current.stop();
      }

      setCurrentState('running');
      onStateChange(data.id, 'running');
    }
  }, [data.targetPosition, currentState, data.id, onStateChange]);

  useEffect(() => {
    if (currentAnims.length === 0) return;

    cancelAttackRef.current = false;

    const mixer = new THREE.AnimationMixer(currentScene);
    mixerRef.current = mixer;

    const clip = removeRootMotion(currentAnims[0].clone());
    const action = mixer.clipAction(clip);
    actionRef.current = action;

    const isAttackState = currentState === 'attacking' || currentState === 'passive_skill' || currentState === 'active_skill';

    const onFinished = () => {
      if (cancelAttackRef.current) {
        cancelAttackRef.current = false;
        return;
      }

      if (isAoESkillRef.current && aoeTargetsRef.current.length > 0) {
        for (const targetId of aoeTargetsRef.current) {
          const targetMonster = monstersRef.current.find(m => m.id === targetId && !m.isDying);
          if (targetMonster) {
            const damage = calculateDamage(data.stats.attack, targetMonster.defense, pendingDamageMultiplierRef.current);
            onAttackMonster(data.id, targetId, damage);
          }
        }
        aoeTargetsRef.current = [];
      } else if (currentTargetRef.current) {
        const targetMonster = monstersRef.current.find(m => m.id === currentTargetRef.current && !m.isDying);
        if (targetMonster) {
          const damage = calculateDamage(data.stats.attack, targetMonster.defense, pendingDamageMultiplierRef.current);
          onAttackMonster(data.id, currentTargetRef.current, damage);
        }
      }
      pendingDamageMultiplierRef.current = 1.0;
      isPlayingSkillRef.current = false;
      isAoESkillRef.current = false;
      setCurrentState('idle');
      onStateChange(data.id, 'idle');
    };

    if (isAttackState) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;

      if (currentState === 'attacking') {
        const effectiveAttackSpeed = data.stats.attackSpeed * GLOBAL_ATTACK_SPEED_MULTIPLIER;
        const targetDuration = (1 / effectiveAttackSpeed) * ATTACK_ANIMATION_DURATION_FACTOR;
        action.timeScale = clip.duration / targetDuration;
      } else if (currentState === 'active_skill') {
        action.timeScale = 2.0;
      } else {
        action.timeScale = 1.5;
      }

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

  useFrame((_, delta) => {
    // Clamp delta to prevent large jumps when browser is in background
    // This prevents characters from teleporting when the tab is inactive
    const MAX_DELTA = 0.1; // Maximum 100ms per frame
    const clampedDelta = Math.min(delta, MAX_DELTA);

    if (mixerRef.current) {
      mixerRef.current.update(clampedDelta);
    }

    if (!groupRef.current) return;

    const currentPos = groupRef.current.position;
    const isAttacking = currentState === 'attacking' || currentState === 'passive_skill' || currentState === 'active_skill';

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
          // Only change to idle if not attacking
          if (currentState === 'running') {
            setCurrentState('idle');
          }
        }
      }
    } else if (!data.targetPosition && data.waypointQueue.length === 0 && currentState === 'running') {
      // If stopped (no target and no waypoints), change to idle
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

    // Only trigger attack if not already attacking AND not protected by skill lock AND no active move command
    if (isInRange && !isAttacking && !isPlayingSkillRef.current && !data.targetPosition) {
      const now = Date.now();
      const effectiveAttackSpeed = data.stats.attackSpeed * GLOBAL_ATTACK_SPEED_MULTIPLIER;
      const attackCooldown = 1000 / effectiveAttackSpeed;
      if (now - data.lastAttackTime > attackCooldown) {
        data.targetPosition = null;
        data.lastAttackTime = now;
        currentTargetRef.current = nearestMonster!.id;

        const passiveSkill = data.stats.skills.passive;
        if (passiveSkill && Math.random() < passiveSkill.triggerChance) {
          isPlayingSkillRef.current = true;
          pendingDamageMultiplierRef.current = passiveSkill.damageMultiplier;
          setCurrentState('passive_skill');
          onStateChange(data.id, 'passive_skill');
        } else {
          pendingDamageMultiplierRef.current = 1.0;
          setCurrentState('attacking');
          onStateChange(data.id, 'attacking');
        }

        const dir = new THREE.Vector3().subVectors(nearestMonster!.pos, currentPos);
        groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }
  });

  const charScale = data.type === 1 ? CHARACTER1_SCALE : CHARACTER2_SCALE;
  const attackRingRadius = data.stats.attackRange / charScale;
  const selectionRingRadius = 0.6 / charScale;
  const hitboxRadius = 0.3 / charScale;
  const hitboxHeight = 1.0 / charScale;
  const skillRingRadius = (data.stats.skills.active?.range || 5.0) / charScale;

  const getRingColor = () => {
    if (currentState === 'passive_skill') return '#aa00ff';
    if (currentState === 'active_skill') return '#ff6600';
    if (inRange) return '#ff0000';
    return '#ffff00';
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
      {/* Hitbox helper ring - appears on hover to guide selection */}
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

      {/* Selection indicator - solid circle under character */}
      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[selectionRingRadius, 32]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.4} depthTest={false} />
        </mesh>
      )}

      {/* Attack range ring - color changes based on state */}
      <CircleLine
        radius={attackRingRadius}
        color={getRingColor()}
        opacity={0.8}
      />

      {/* Active skill range ring - only shown when selected */}
      {isSelected && data.stats.skills.active && (
        <CircleLine
          radius={skillRingRadius}
          color="#ff6600"
          opacity={0.4}
        />
      )}

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
