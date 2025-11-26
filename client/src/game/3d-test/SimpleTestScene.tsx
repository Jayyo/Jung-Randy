import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, Html } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

// ===== CONSTANTS =====
const PLATFORM_SIZE = 10;
const LANE_OFFSET = PLATFORM_SIZE * 0.4;
const CHARACTER1_SCALE = 0.5;
const CHARACTER2_SCALE = 1.0;
const MONSTER_SCALE = 0.5;
const MONSTER_SPEED = 0.03;
const CHARACTER_SPEED = 2.5;
const ATTACK_RANGE = 2.5;
const ATTACK_COOLDOWN = 1200; // ms

// ===== PRELOAD GLBs =====
useGLTF.preload('/assets/monsters/monster_run.glb');
useGLTF.preload('/assets/monsters/monster_death.glb');
useGLTF.preload('/assets/characters/char1_idle.glb');
useGLTF.preload('/assets/characters/char1_run.glb');
useGLTF.preload('/assets/characters/char1_punch.glb');
useGLTF.preload('/assets/characters/char2_idle.glb');
useGLTF.preload('/assets/characters/char2_run.glb');
useGLTF.preload('/assets/characters/char2_punch.glb');

// ===== TYPES =====
interface CharacterData {
  id: string;
  type: 1 | 2;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  state: 'idle' | 'running' | 'attacking';
  lastAttackTime: number;
}

interface MonsterData {
  id: string;
  hp: number;
  maxHp: number;
  progress: number;
  isDying: boolean;
}

// ===== HELPER FUNCTIONS =====
function getPathPosition(progress: number) {
  const p = progress % 1;
  const side = Math.floor(p * 4);
  const sideProgress = (p * 4) % 1;

  let x = 0, z = 0, rotationY = 0;
  switch (side) {
    case 0:
      x = -LANE_OFFSET + sideProgress * LANE_OFFSET * 2;
      z = -LANE_OFFSET;
      rotationY = Math.PI / 2;
      break;
    case 1:
      x = LANE_OFFSET;
      z = -LANE_OFFSET + sideProgress * LANE_OFFSET * 2;
      rotationY = 0;
      break;
    case 2:
      x = LANE_OFFSET - sideProgress * LANE_OFFSET * 2;
      z = LANE_OFFSET;
      rotationY = -Math.PI / 2;
      break;
    case 3:
      x = -LANE_OFFSET;
      z = LANE_OFFSET - sideProgress * LANE_OFFSET * 2;
      rotationY = Math.PI;
      break;
  }
  return { x, z, rotationY };
}

function removeRootMotion(clip: THREE.AnimationClip) {
  clip.tracks = clip.tracks.filter(track => {
    const isRootPositionTrack =
      track.name.includes('Hips.position') ||
      track.name.includes('mixamorigHips.position');
    return !isRootPositionTrack;
  });
  if (clip.duration > 0.04) {
    clip.duration -= 0.04;
  }
  return clip;
}

// ===== PLATFORM COMPONENT =====
function Platform() {
  const laneWidth = 1.5;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[PLATFORM_SIZE, PLATFORM_SIZE]} />
        <meshStandardMaterial color="#4a6b4a" roughness={0.9} />
      </mesh>

      <mesh position={[0, 0.02, -LANE_OFFSET]} receiveShadow>
        <boxGeometry args={[PLATFORM_SIZE, 0.04, laneWidth]} />
        <meshStandardMaterial color="#8b6914" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.02, LANE_OFFSET]} receiveShadow>
        <boxGeometry args={[PLATFORM_SIZE, 0.04, laneWidth]} />
        <meshStandardMaterial color="#8b6914" roughness={0.7} />
      </mesh>
      <mesh position={[-LANE_OFFSET, 0.02, 0]} receiveShadow>
        <boxGeometry args={[laneWidth, 0.04, PLATFORM_SIZE]} />
        <meshStandardMaterial color="#8b6914" roughness={0.7} />
      </mesh>
      <mesh position={[LANE_OFFSET, 0.02, 0]} receiveShadow>
        <boxGeometry args={[laneWidth, 0.04, PLATFORM_SIZE]} />
        <meshStandardMaterial color="#8b6914" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ===== MONSTER COMPONENT =====
interface MonsterProps {
  data: MonsterData;
  positionRef: React.MutableRefObject<THREE.Vector3>;
  onDeath: () => void;
}

function Monster({ data, positionRef, onDeath }: MonsterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const progressRef = useRef(data.progress);
  const opacityRef = useRef(1);

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
    }

    action.enabled = true;
    action.play();

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [data.isDying, data.id, clonedRunScene, clonedDeathScene, runAnims, deathAnims]);

  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    if (data.isDying) {
      opacityRef.current = Math.max(0, opacityRef.current - delta * 0.8);

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

    // Update position
    progressRef.current += delta * MONSTER_SPEED;
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
  });

  const initial = getPathPosition(progressRef.current);

  return (
    <group
      ref={groupRef}
      position={[initial.x, 0, initial.z]}
      rotation={[0, initial.rotationY, 0]}
      scale={[MONSTER_SCALE, MONSTER_SCALE, MONSTER_SCALE]}
    >
      <primitive object={currentScene} />

      {!data.isDying && (
        <Html position={[0, 4, 0]} center>
          <div style={{
            width: '60px',
            height: '8px',
            background: '#333',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid #000'
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

// ===== CHARACTER COMPONENT =====
interface CharacterProps {
  data: CharacterData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  monsterPosRef: React.MutableRefObject<THREE.Vector3>;
  monsterIsDying: boolean;
  onAttackMonster: () => void;
}

function Character({ data, isSelected, onSelect, monsterPosRef, monsterIsDying, onAttackMonster }: CharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [currentState, setCurrentState] = useState<'idle' | 'running' | 'attacking'>('idle');
  const [inRange, setInRange] = useState(false);

  const prefix = data.type === 1 ? 'char1' : 'char2';
  const { scene: idleScene, animations: idleAnims } = useGLTF(`/assets/characters/${prefix}_idle.glb`);
  const { scene: runScene, animations: runAnims } = useGLTF(`/assets/characters/${prefix}_run.glb`);
  const { scene: punchScene, animations: punchAnims } = useGLTF(`/assets/characters/${prefix}_punch.glb`);

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

  const { scene: currentScene, anims: currentAnims } = useMemo(() => {
    switch (currentState) {
      case 'running': return { scene: clonedRun, anims: runAnims };
      case 'attacking': return { scene: clonedPunch, anims: punchAnims };
      default: return { scene: clonedIdle, anims: idleAnims };
    }
  }, [currentState, clonedIdle, clonedRun, clonedPunch, idleAnims, runAnims, punchAnims]);

  useEffect(() => {
    if (currentAnims.length === 0) return;

    const mixer = new THREE.AnimationMixer(currentScene);
    mixerRef.current = mixer;

    const clip = removeRootMotion(currentAnims[0].clone());
    const action = mixer.clipAction(clip);

    if (currentState === 'attacking') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;

      mixer.addEventListener('finished', () => {
        onAttackMonster();
        setCurrentState('idle');
      });
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
    }

    action.enabled = true;
    action.play();

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [currentState, currentScene, currentAnims, onAttackMonster]);

  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    if (!groupRef.current) return;

    const currentPos = groupRef.current.position;

    // Movement logic
    if (data.targetPosition && currentState !== 'attacking') {
      const dir = new THREE.Vector3().subVectors(data.targetPosition, currentPos);
      const distance = dir.length();

      if (distance > 0.1) {
        if (currentState !== 'running') {
          setCurrentState('running');
        }

        dir.normalize();
        const moveAmount = Math.min(delta * CHARACTER_SPEED, distance);
        currentPos.add(dir.multiplyScalar(moveAmount));
        data.position.copy(currentPos);

        groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      } else {
        data.targetPosition = null;
        setCurrentState('idle');
      }
    }

    // Attack check - use ref for real-time monster position
    if (!monsterIsDying && currentState !== 'attacking') {
      const dist = currentPos.distanceTo(monsterPosRef.current);
      const now = Date.now();
      const isInRange = dist <= ATTACK_RANGE;

      setInRange(isInRange);

      if (isInRange && now - data.lastAttackTime > ATTACK_COOLDOWN) {
        data.targetPosition = null;
        data.lastAttackTime = now;
        setCurrentState('attacking');

        const dir = new THREE.Vector3().subVectors(monsterPosRef.current, currentPos);
        groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      }
    } else {
      setInRange(false);
    }
  });

  const charScale = data.type === 1 ? CHARACTER1_SCALE : CHARACTER2_SCALE;
  const ringSize = ATTACK_RANGE / charScale;

  return (
    <group
      ref={groupRef}
      position={[data.position.x, data.position.y, data.position.z]}
      scale={[charScale, charScale, charScale]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(data.id);
      }}
    >
      <primitive object={currentScene} />

      {/* Attack range ring - color changes based on state */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringSize - 0.2, ringSize, 48]} />
        <meshBasicMaterial
          color={currentState === 'attacking' ? '#ff0000' : (inRange ? '#ff9900' : '#00ff00')}
          transparent
          opacity={isSelected ? 0.5 : 0.2}
        />
      </mesh>
    </group>
  );
}

// ===== CLICK HANDLER =====
interface ClickHandlerProps {
  selectedCharacterId: string | null;
  characters: CharacterData[];
}

function ClickHandler({ selectedCharacterId, characters }: ClickHandlerProps) {
  const { camera, raycaster } = useThree();

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      if (!selectedCharacterId) return;

      const character = characters.find(c => c.id === selectedCharacterId);
      if (!character) return;

      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);

      if (intersection) {
        const bound = PLATFORM_SIZE / 2 - 0.5;
        intersection.x = Math.max(-bound, Math.min(bound, intersection.x));
        intersection.z = Math.max(-bound, Math.min(bound, intersection.z));

        character.targetPosition = intersection.clone();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, [selectedCharacterId, characters, camera, raycaster]);

  return null;
}

// ===== MAIN SCENE =====
export default function SimpleTestScene() {
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [monster, setMonster] = useState<MonsterData>({
    id: 'monster-1',
    hp: 2,
    maxHp: 2,
    progress: 0,
    isDying: false
  });
  const [monsterCount, setMonsterCount] = useState(1);
  const [spawnCount, setSpawnCount] = useState(0);

  // Shared ref for real-time monster position
  const monsterPosRef = useRef(new THREE.Vector3(-LANE_OFFSET, 0, -LANE_OFFSET));

  // Ref for immediate HP tracking (avoids React state batching issues)
  const monsterHpRef = useRef(2);
  const monsterIsDyingRef = useRef(false);

  const spawnCharacter = useCallback(() => {
    const type = (spawnCount % 2) + 1 as 1 | 2;
    // Spawn near the lane path - always on lane for testing
    const side = spawnCount % 4;
    const sideOffset = (spawnCount % 3 - 1) * 1.5; // -1.5, 0, 1.5 offset along lane
    const lanePos = LANE_OFFSET - 1.5; // Inside the lane, within attack range
    let spawnX: number, spawnZ: number;
    switch (side) {
      case 0: spawnX = sideOffset; spawnZ = -lanePos; break;
      case 1: spawnX = lanePos; spawnZ = sideOffset; break;
      case 2: spawnX = sideOffset; spawnZ = lanePos; break;
      default: spawnX = -lanePos; spawnZ = sideOffset; break;
    }
    const newChar: CharacterData = {
      id: `char-${Date.now()}`,
      type,
      position: new THREE.Vector3(
        spawnX,
        0,
        spawnZ
      ),
      targetPosition: null,
      state: 'idle',
      lastAttackTime: 0
    };

    setCharacters(prev => [...prev, newChar]);
    setSpawnCount(prev => prev + 1);
  }, [spawnCount]);

  const handleAttackMonster = useCallback(() => {
    console.log('[Attack] handleAttackMonster called');

    // Use ref for immediate check (avoids React batching issues)
    if (monsterIsDyingRef.current) {
      console.log('[Attack] Monster already dying (ref check), skip');
      return;
    }

    // Immediately decrement HP in ref
    monsterHpRef.current -= 1;
    const newHp = monsterHpRef.current;
    console.log(`[Attack] newHp=${newHp} (ref updated)`);

    if (newHp <= 0) {
      monsterIsDyingRef.current = true;
      setMonster(prev => ({ ...prev, hp: 0, isDying: true }));
    } else {
      setMonster(prev => ({ ...prev, hp: newHp }));
    }
  }, []);

  const handleMonsterDeath = useCallback(() => {
    const newCount = monsterCount + 1;
    setMonsterCount(newCount);
    // Reset monster refs
    monsterPosRef.current.set(-LANE_OFFSET, 0, -LANE_OFFSET);
    monsterHpRef.current = 2;
    monsterIsDyingRef.current = false;
    setMonster({
      id: `monster-${newCount}`,
      hp: 2,
      maxHp: 2,
      progress: 0,
      isDying: false
    });
  }, [monsterCount]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
      {/* Left UI Panel */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 100,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        fontFamily: 'monospace'
      }}>
        <h2 style={{ margin: '0 0 10px 0' }}>3D Test Scene</h2>
        <p style={{ margin: '5px 0', color: '#888' }}>Characters: {characters.length}</p>
        <p style={{ margin: '5px 0', color: '#888' }}>Monsters killed: {monsterCount - 1}</p>
        <hr style={{ margin: '10px 0', borderColor: '#444' }} />
        <p style={{ margin: '5px 0', color: '#666' }}>Left-click: Select</p>
        <p style={{ margin: '5px 0', color: '#666' }}>Right-click: Move</p>
      </div>

      {/* Spawn Button */}
      <button
        onClick={spawnCharacter}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 100,
          padding: '15px 25px',
          fontSize: '16px',
          fontWeight: 'bold',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}
      >
        Spawn Character {spawnCount % 2 + 1}
      </button>

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={50} />
        <OrbitControls />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <Platform />

        <Monster
          data={monster}
          positionRef={monsterPosRef}
          onDeath={handleMonsterDeath}
        />

        {characters.map(char => (
          <Character
            key={char.id}
            data={char}
            isSelected={selectedCharacterId === char.id}
            onSelect={setSelectedCharacterId}
            monsterPosRef={monsterPosRef}
            monsterIsDying={monster.isDying}
            onAttackMonster={handleAttackMonster}
          />
        ))}

        <ClickHandler
          selectedCharacterId={selectedCharacterId}
          characters={characters}
        />
      </Canvas>
    </div>
  );
}
