import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, useGLTF, Html } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import {
  CharacterStats,
  getCharacterStats,
  getMonsterStatsForWave,
  calculateDamage,
  WAVE_CONFIG,
} from './gameData';

// ===== CONSTANTS =====
const PLATFORM_SIZE = 14;
const LANE_OFFSET = PLATFORM_SIZE * 0.44;
const CHARACTER1_SCALE = 0.5;
const CHARACTER2_SCALE = 1.0;
const MONSTER_SCALE = 0.8;
const MONSTER_SPEED = 0.07;
const CHARACTER_SPEED = 2.5;

// ===== PRELOAD GLBs =====
useGLTF.preload('/assets/monsters/monster_run.glb');
useGLTF.preload('/assets/monsters/monster_death.glb');
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

// ===== TYPES =====
interface CharacterData {
  id: string;
  type: 1 | 2;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  waypointQueue: THREE.Vector3[]; // Waypoints for path through bridge
  state: 'idle' | 'running' | 'attacking' | 'active_skill' | 'passive_skill';
  lastAttackTime: number;
  lastActiveSkillTime: number;
  // Stats from gameData
  stats: CharacterStats;
  currentHp: number;
}

interface MonsterData {
  id: string;
  hp: number;
  maxHp: number;
  defense: number;
  damage: number;
  wave: number; // which wave this monster belongs to
  sizeMultiplier: number;
  progress: number;
  isDying: boolean;
}

// Game state type
type GameState = 'playing' | 'gameover';

// Selection target type
type SelectionTarget = {
  type: 'character';
  ids: string[];
} | {
  type: 'monster';
  id: string;
} | null;

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

// ===== LANE FRAME (Square frame without cross) =====
function LaneFrame({ laneOffset, laneWidth }: { laneOffset: number; laneWidth: number }) {
  // Calculate outer and inner bounds
  const outerSize = laneOffset + laneWidth / 2;
  const innerSize = laneOffset - laneWidth / 2;

  return (
    <group>
      {/* Top side */}
      <mesh position={[0, 0.03, -laneOffset]} receiveShadow>
        <boxGeometry args={[outerSize * 2, 0.06, laneWidth]} />
        <meshStandardMaterial color="#6b5a4a" roughness={0.85} />
      </mesh>
      {/* Bottom side */}
      <mesh position={[0, 0.03, laneOffset]} receiveShadow>
        <boxGeometry args={[outerSize * 2, 0.06, laneWidth]} />
        <meshStandardMaterial color="#6b5a4a" roughness={0.85} />
      </mesh>
      {/* Left side (shorter to not overlap corners) */}
      <mesh position={[-laneOffset, 0.03, 0]} receiveShadow>
        <boxGeometry args={[laneWidth, 0.06, innerSize * 2]} />
        <meshStandardMaterial color="#6b5a4a" roughness={0.85} />
      </mesh>
      {/* Right side (shorter to not overlap corners) */}
      <mesh position={[laneOffset, 0.03, 0]} receiveShadow>
        <boxGeometry args={[laneWidth, 0.06, innerSize * 2]} />
        <meshStandardMaterial color="#6b5a4a" roughness={0.85} />
      </mesh>

      {/* Inner border (darker) */}
      <mesh position={[0, 0.02, -innerSize]} receiveShadow>
        <boxGeometry args={[innerSize * 2, 0.04, 0.1]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.02, innerSize]} receiveShadow>
        <boxGeometry args={[innerSize * 2, 0.04, 0.1]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
      <mesh position={[-innerSize, 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.1, 0.04, innerSize * 2]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
      <mesh position={[innerSize, 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.1, 0.04, innerSize * 2]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>

      {/* Outer border (darker) */}
      <mesh position={[0, 0.02, -outerSize]} receiveShadow>
        <boxGeometry args={[outerSize * 2 + 0.1, 0.04, 0.1]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.02, outerSize]} receiveShadow>
        <boxGeometry args={[outerSize * 2 + 0.1, 0.04, 0.1]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
      <mesh position={[-outerSize, 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.1, 0.04, outerSize * 2 + 0.1]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
      <mesh position={[outerSize, 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.1, 0.04, outerSize * 2 + 0.1]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ===== WALL SEGMENT =====
function WallSegment({ position, rotation = 0, length = 2 }: {
  position: [number, number, number];
  rotation?: number;
  length?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Main wall */}
      <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
        <boxGeometry args={[length, 0.8, 0.3]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.85} />
      </mesh>
      {/* Wall top cap */}
      <mesh position={[0, 0.82, 0]} receiveShadow castShadow>
        <boxGeometry args={[length + 0.1, 0.08, 0.4]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ===== CORNER POST =====
function CornerPost({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Post base */}
      <mesh position={[0, 0.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
      </mesh>
      {/* Post cap */}
      <mesh position={[0, 1.05, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.6, 0.12, 0.6]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.75} />
      </mesh>
      {/* Torch flame effect */}
      <pointLight position={[0, 1.3, 0]} color="#ff9944" intensity={0.5} distance={4} />
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshBasicMaterial color="#ffaa44" />
      </mesh>
    </group>
  );
}

// ===== BOSS PLATFORM =====
const BOSS_PLATFORM_SIZE = PLATFORM_SIZE; // Same size as main platform
const BRIDGE_HEIGHT = 1.5; // Height of the elevated bridge (monsters pass under)
const RAMP_LENGTH = 2; // Length of ramps on each side

function BossPlatform({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Elevated base */}
      <mesh position={[0, -0.3, 0]} receiveShadow castShadow>
        <boxGeometry args={[BOSS_PLATFORM_SIZE + 1, 0.6, BOSS_PLATFORM_SIZE + 1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </mesh>

      {/* Main platform floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[BOSS_PLATFORM_SIZE, BOSS_PLATFORM_SIZE]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.85} />
      </mesh>

      {/* Outer ritual circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[BOSS_PLATFORM_SIZE / 2 - 1, BOSS_PLATFORM_SIZE / 2 - 0.6, 32]} />
        <meshStandardMaterial color="#8b0000" roughness={0.7} emissive="#330000" emissiveIntensity={0.3} />
      </mesh>

      {/* Middle ritual circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[BOSS_PLATFORM_SIZE / 4 - 0.3, BOSS_PLATFORM_SIZE / 4, 32]} />
        <meshStandardMaterial color="#8b0000" roughness={0.7} emissive="#330000" emissiveIntensity={0.3} />
      </mesh>

      {/* Inner circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshStandardMaterial color="#8b0000" roughness={0.7} emissive="#440000" emissiveIntensity={0.5} />
      </mesh>

      {/* Corner pillars */}
      {[0, 1, 2, 3].map(i => {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const radius = BOSS_PLATFORM_SIZE / 2 - 0.5;
        return (
          <group key={i} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
            <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.3, 0.4, 1.6, 6]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
            </mesh>
            {/* Glowing top */}
            <pointLight position={[0, 1.8, 0]} color="#ff3333" intensity={0.6} distance={5} />
            <mesh position={[0, 1.7, 0]}>
              <sphereGeometry args={[0.18, 8, 6]} />
              <meshBasicMaterial color="#ff4444" />
            </mesh>
          </group>
        );
      })}

    </group>
  );
}

// ===== ELEVATED BRIDGE (crosses over monster lane) =====
function ElevatedBridge() {
  // Bridge goes from inside main green area to boss platform
  const bossPlatformX = PLATFORM_SIZE / 2 + 8 + BOSS_PLATFORM_SIZE / 2; // Boss platform center X (using gap of 8)
  const bridgeStartX = LANE_OFFSET - 2; // Start inside main green area
  const bridgeEndX = bossPlatformX - BOSS_PLATFORM_SIZE / 2; // End at boss platform edge
  const flatSectionLength = bridgeEndX - bridgeStartX - RAMP_LENGTH * 2;
  const bridgeCenterX = (bridgeStartX + RAMP_LENGTH + bridgeEndX - RAMP_LENGTH) / 2;

  return (
    <group>
      {/* Left ramp (going up from main platform) */}
      <mesh
        position={[bridgeStartX + RAMP_LENGTH / 2, BRIDGE_HEIGHT / 2, 0]}
        rotation={[0, 0, Math.atan2(BRIDGE_HEIGHT, RAMP_LENGTH)]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[Math.sqrt(RAMP_LENGTH * RAMP_LENGTH + BRIDGE_HEIGHT * BRIDGE_HEIGHT), 0.2, 2.2]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.85} />
      </mesh>

      {/* Flat elevated section */}
      <mesh position={[bridgeCenterX, BRIDGE_HEIGHT, 0]} receiveShadow castShadow>
        <boxGeometry args={[flatSectionLength, 0.2, 2.2]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.85} />
      </mesh>

      {/* Right ramp (going down to boss platform) */}
      <mesh
        position={[bridgeEndX - RAMP_LENGTH / 2, BRIDGE_HEIGHT / 2, 0]}
        rotation={[0, 0, -Math.atan2(BRIDGE_HEIGHT, RAMP_LENGTH)]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[Math.sqrt(RAMP_LENGTH * RAMP_LENGTH + BRIDGE_HEIGHT * BRIDGE_HEIGHT), 0.2, 2.2]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.85} />
      </mesh>

      {/* Support pillars under flat section */}
      {[0.25, 0.5, 0.75].map((t, i) => {
        const pillarX = bridgeStartX + RAMP_LENGTH + flatSectionLength * t;
        return (
          <group key={`pillar-${i}`}>
            {[-0.9, 0.9].map((zSide) => (
              <mesh key={`pillar-${i}-${zSide}`} position={[pillarX, BRIDGE_HEIGHT / 2, zSide]} castShadow>
                <boxGeometry args={[0.3, BRIDGE_HEIGHT, 0.3]} />
                <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Bridge rails */}
      <mesh position={[bridgeCenterX, BRIDGE_HEIGHT + 0.4, 1]} receiveShadow castShadow>
        <boxGeometry args={[flatSectionLength + 1, 0.15, 0.08]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>
      <mesh position={[bridgeCenterX, BRIDGE_HEIGHT + 0.4, -1]} receiveShadow castShadow>
        <boxGeometry args={[flatSectionLength + 1, 0.15, 0.08]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>

      {/* Rail posts */}
      {Array.from({ length: 5 }).map((_, i) => {
        const postX = bridgeStartX + RAMP_LENGTH + (flatSectionLength / 4) * i;
        return (
          <group key={`post-${i}`}>
            <mesh position={[postX, BRIDGE_HEIGHT + 0.2, 1]} castShadow>
              <boxGeometry args={[0.1, 0.5, 0.1]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
            </mesh>
            <mesh position={[postX, BRIDGE_HEIGHT + 0.2, -1]} castShadow>
              <boxGeometry args={[0.1, 0.5, 0.1]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ===== PLATFORM COMPONENT =====
function Platform() {
  const laneWidth = 1.2;

  // Wall segments
  const wallLength = 0.5;
  const wallCount = Math.floor(PLATFORM_SIZE / wallLength);

  return (
    <group>
      {/* Base ground - solid grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[PLATFORM_SIZE, PLATFORM_SIZE]} />
        <meshStandardMaterial color="#3d5c3d" roughness={0.9} />
      </mesh>

      {/* Lane frame (square, no cross) */}
      <LaneFrame laneOffset={LANE_OFFSET} laneWidth={laneWidth} />

      {/* Corner posts with torches */}
      <CornerPost position={[-PLATFORM_SIZE / 2 + 0.3, 0, -PLATFORM_SIZE / 2 + 0.3]} />
      <CornerPost position={[PLATFORM_SIZE / 2 - 0.3, 0, -PLATFORM_SIZE / 2 + 0.3]} />
      <CornerPost position={[-PLATFORM_SIZE / 2 + 0.3, 0, PLATFORM_SIZE / 2 - 0.3]} />
      <CornerPost position={[PLATFORM_SIZE / 2 - 0.3, 0, PLATFORM_SIZE / 2 - 0.3]} />

      {/* Walls on each side */}
      {Array.from({ length: wallCount - 1 }).map((_, i) => {
        const offset = -PLATFORM_SIZE / 2 + wallLength / 2 + (i + 0.5) * wallLength;
        return (
          <group key={`walls-${i}`}>
            {/* Top wall */}
            <WallSegment position={[offset, 0, -PLATFORM_SIZE / 2 + 0.15]} rotation={0} length={wallLength * 0.9} />
            {/* Bottom wall */}
            <WallSegment position={[offset, 0, PLATFORM_SIZE / 2 - 0.15]} rotation={0} length={wallLength * 0.9} />
            {/* Left wall */}
            <WallSegment position={[-PLATFORM_SIZE / 2 + 0.15, 0, offset]} rotation={Math.PI / 2} length={wallLength * 0.9} />
            {/* Right wall (with gap for boss bridge) */}
            {Math.abs(offset) > 1.5 && (
              <WallSegment position={[PLATFORM_SIZE / 2 - 0.15, 0, offset]} rotation={Math.PI / 2} length={wallLength * 0.9} />
            )}
          </group>
        );
      })}

      {/* Elevated bridge from main area to boss zone */}
      <ElevatedBridge />

      {/* Boss platform - positioned to the right */}
      <BossPlatform position={[PLATFORM_SIZE / 2 + 8 + BOSS_PLATFORM_SIZE / 2, 0, 0]} />
    </group>
  );
}

// ===== STATUS PANEL UI (Bottom Panel) =====
interface StatusPanelProps {
  selectionTarget: SelectionTarget;
  characters: CharacterData[];
  monsters: MonsterData[];
  onUseActiveSkill: (charId: string) => void;
  onSelectCharacter: (id: string) => void;
}

function StatusPanel({ selectionTarget, characters, monsters, onUseActiveSkill, onSelectCharacter }: StatusPanelProps) {
  if (!selectionTarget) return null;

  // Monster selected
  if (selectionTarget.type === 'monster') {
    const monster = monsters.find(m => m.id === selectionTarget.id);
    if (!monster || monster.isDying) return null;

    return (
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(40, 10, 10, 0.95)',
        border: '2px solid #8b0000',
        borderRadius: '12px',
        padding: '15px 25px',
        color: 'white',
        fontFamily: 'monospace',
        minWidth: '300px',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Monster portrait placeholder */}
          <div style={{
            width: '64px',
            height: '64px',
            background: '#1a1a1a',
            border: '2px solid #660000',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
          }}>
            👹
          </div>
          {/* Monster info */}
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#ff6666' }}>
              Wave {monster.wave} Monster
            </h3>
            {/* HP bar */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '2px' }}>
                HP: {monster.hp} / {monster.maxHp}
              </div>
              <div style={{
                width: '100%',
                height: '12px',
                background: '#333',
                borderRadius: '6px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(monster.hp / monster.maxHp) * 100}%`,
                  height: '100%',
                  background: monster.hp > monster.maxHp / 2 ? '#4CAF50' : '#f44336',
                  transition: 'width 0.2s',
                }} />
              </div>
            </div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#ccc' }}>
              <span>⚔️ ATK: {monster.damage}</span>
              <span>🛡️ DEF: {monster.defense}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Characters selected
  const selectedChars = characters.filter(c => selectionTarget.ids.includes(c.id));
  if (selectedChars.length === 0) return null;

  // Multi-select: show portrait grid
  if (selectedChars.length > 1) {
    return (
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 30, 10, 0.95)',
        border: '2px solid #4a7c4a',
        borderRadius: '12px',
        padding: '15px 20px',
        color: 'white',
        fontFamily: 'monospace',
        zIndex: 100,
      }}>
        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '10px' }}>
          Selected: {selectedChars.length} units
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '8px',
          maxWidth: '400px',
        }}>
          {selectedChars.slice(0, 12).map(char => (
            <div
              key={char.id}
              onClick={() => onSelectCharacter(char.id)}
              style={{
                width: '48px',
                height: '48px',
                background: '#1a3a1a',
                border: '2px solid #4a7c4a',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: '20px' }}>
                {char.type === 1 ? '🥊' : '💪'}
              </div>
              {/* Mini HP bar */}
              <div style={{
                position: 'absolute',
                bottom: '2px',
                left: '2px',
                right: '2px',
                height: '4px',
                background: '#333',
                borderRadius: '2px',
              }}>
                <div style={{
                  width: `${(char.currentHp / char.stats.maxHp) * 100}%`,
                  height: '100%',
                  background: char.currentHp > char.stats.maxHp / 2 ? '#4CAF50' : '#f44336',
                }} />
              </div>
            </div>
          ))}
          {/* Show +N indicator if more than 12 units selected */}
          {selectedChars.length > 12 && (
            <div style={{
              width: '48px',
              height: '48px',
              background: '#2a2a2a',
              border: '2px solid #666',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#aaa',
              fontWeight: 'bold',
            }}>
              +{selectedChars.length - 12}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Single character selected - detailed view
  const char = selectedChars[0];
  const stats = char.stats;
  const activeSkill = stats.skills.active;
  const passiveSkill = stats.skills.passive;
  const canUseActive = activeSkill && (Date.now() - char.lastActiveSkillTime > activeSkill.cooldown);
  const activeCooldownRemaining = activeSkill
    ? Math.max(0, activeSkill.cooldown - (Date.now() - char.lastActiveSkillTime))
    : 0;

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(10, 30, 10, 0.95)',
      border: '2px solid #4a7c4a',
      borderRadius: '12px',
      padding: '15px 25px',
      color: 'white',
      fontFamily: 'monospace',
      minWidth: '400px',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Character portrait */}
        <div style={{
          width: '80px',
          height: '80px',
          background: '#1a3a1a',
          border: '2px solid #4a7c4a',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
        }}>
          {char.type === 1 ? '🥊' : '💪'}
        </div>

        {/* Character info */}
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#90EE90' }}>
            {stats.name}
          </h3>
          {/* HP bar */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '2px' }}>
              HP: {char.currentHp} / {stats.maxHp}
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              background: '#333',
              borderRadius: '6px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(char.currentHp / stats.maxHp) * 100}%`,
                height: '100%',
                background: char.currentHp > stats.maxHp / 2 ? '#4CAF50' : '#f44336',
                transition: 'width 0.2s',
              }} />
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#ccc' }}>
            <span>⚔️ ATK: {stats.attack}</span>
            <span>🛡️ DEF: {stats.defense}</span>
            <span>⚡ SPD: {stats.attackSpeed.toFixed(1)}/s</span>
          </div>
        </div>

        {/* Skills section */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Passive skill */}
          {passiveSkill && (
            <div
              title={`${passiveSkill.name}: ${passiveSkill.description}\n${Math.round(passiveSkill.triggerChance * 100)}% chance, ${passiveSkill.damageMultiplier}x damage`}
              style={{
                width: '50px',
                height: '50px',
                background: '#2a2a4a',
                border: '2px solid #6a6a8a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                cursor: 'help',
              }}
            >
              ⚡
            </div>
          )}
          {/* Active skill */}
          {activeSkill && (
            <div
              onClick={() => canUseActive && onUseActiveSkill(char.id)}
              title={`${activeSkill.name}: ${activeSkill.description}\nCooldown: ${activeSkill.cooldown / 1000}s, ${activeSkill.damageMultiplier}x damage`}
              style={{
                width: '50px',
                height: '50px',
                background: canUseActive ? '#4a2a2a' : '#2a2a2a',
                border: `2px solid ${canUseActive ? '#ff6666' : '#666'}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                cursor: canUseActive ? 'pointer' : 'not-allowed',
                position: 'relative',
                opacity: canUseActive ? 1 : 0.6,
              }}
            >
              🔥
              {/* Cooldown overlay */}
              {activeCooldownRemaining > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '-18px',
                  fontSize: '10px',
                  color: '#ff6666',
                }}>
                  {(activeCooldownRemaining / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== MONSTER COMPONENT =====
interface MonsterProps {
  data: MonsterData;
  positionRef: React.MutableRefObject<THREE.Vector3>;
  onDeath: () => void;
  onClick: () => void;
  isSelected: boolean;
}

function Monster({ data, positionRef, onDeath, onClick, isSelected }: MonsterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const progressRef = useRef(data.progress);
  const opacityRef = useRef(1);

  // Apply wave-based size multiplier
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

      {!data.isDying && (
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

// ===== CIRCLE LINE COMPONENT =====
function CircleLine({ radius, color, opacity, segments = 48 }: {
  radius: number;
  color: string;
  opacity: number;
  segments?: number;
}) {
  const points = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    }
    return new Float32Array(pts);
  }, [radius, segments]);

  return (
    <group position={[0, 0.15, 0]}>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[points, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={opacity} depthTest={false} />
      </line>
    </group>
  );
}

// ===== MOVE CLICK INDICATOR (Warcraft style) =====
interface MoveIndicatorData {
  id: string;
  position: THREE.Vector3;
  startTime: number;
}

function MoveIndicator({ data, onComplete }: { data: MoveIndicatorData; onComplete: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const [scale, setScale] = useState(0.3);
  const [opacity, setOpacity] = useState(1);

  useFrame(() => {
    const elapsed = (Date.now() - data.startTime) / 1000;
    const duration = 0.5; // Animation duration in seconds

    if (elapsed >= duration) {
      onComplete();
      return;
    }

    const progress = elapsed / duration;
    // Expand outward
    setScale(0.3 + progress * 0.7);
    // Fade out
    setOpacity(1 - progress);
  });

  const points = useMemo(() => {
    const pts: number[] = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(Math.cos(angle), 0, Math.sin(angle));
    }
    return new Float32Array(pts);
  }, []);

  return (
    <group ref={groupRef} position={[data.position.x, 0.1, data.position.z]} scale={[scale, 1, scale]}>
      {/* Outer ring */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <lineBasicMaterial ref={materialRef} color="#00ff00" transparent opacity={opacity} linewidth={2} />
      </line>
      {/* Inner filled circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 32]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={opacity * 0.3} />
      </mesh>
    </group>
  );
}

// ===== CHARACTER COMPONENT =====
interface CharacterProps {
  data: CharacterData;
  isSelected: boolean;
  onSelect: (id: string, addToSelection: boolean) => void;
  monsters: MonsterData[];
  monsterPosRefs: Map<string, THREE.Vector3>;
  onAttackMonster: (attackerId: string, monsterId: string, damage: number) => void;
  onStateChange: (charId: string, state: CharacterData['state']) => void;
}

function Character({ data, isSelected, onSelect, monsters, monsterPosRefs, onAttackMonster, onStateChange }: CharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const [currentState, setCurrentState] = useState<'idle' | 'running' | 'attacking' | 'passive_skill' | 'active_skill'>('idle');
  const [inRange, setInRange] = useState(false);
  const currentTargetRef = useRef<string | null>(null); // Track which monster we're attacking
  const aoeTargetsRef = useRef<string[]>([]); // Track multiple targets for AoE skills
  const pendingDamageMultiplierRef = useRef<number>(1.0); // Damage multiplier for current attack
  const isPlayingSkillRef = useRef(false); // Prevent skill interruption
  const cancelAttackRef = useRef(false); // Flag to cancel current attack/skill
  const isAoESkillRef = useRef(false); // Track if current skill is AoE

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
  // Use ref to track if we've already started this skill to prevent double execution
  const activeSkillStartedRef = useRef(false);

  useEffect(() => {
    // Reset the flag when data.state changes away from active_skill
    if (data.state !== 'active_skill') {
      activeSkillStartedRef.current = false;
      return;
    }

    // Only trigger once per active skill press
    if (activeSkillStartedRef.current) return;
    if (currentState === 'active_skill') return;

    activeSkillStartedRef.current = true;

    // Lock state to prevent interruption
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
        // Sort by distance to find nearest
        monstersInRange.sort((a, b) => a.dist - b.dist);
        const nearest = monstersInRange[0];

        if (isAoE) {
          // AoE: target all monsters in range
          aoeTargetsRef.current = monstersInRange.map(m => m.id);
          currentTargetRef.current = nearest.id; // Still track nearest for facing
        } else {
          // Single target: only nearest
          currentTargetRef.current = nearest.id;
        }

        pendingDamageMultiplierRef.current = activeSkill?.damageMultiplier || 1.0;

        // Face the nearest monster
        const dir = new THREE.Vector3().subVectors(nearest.pos, currentPos);
        groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      } else {
        // No monster in range - skill still plays but no damage
        currentTargetRef.current = null;
        aoeTargetsRef.current = [];
      }
    }
    setCurrentState('active_skill');
  }, [data.state, currentState, monsters, monsterPosRefs, data.stats.skills.active]);

  // Handle cancel attack request (from right-click move command)
  // Note: active_skill is NOT cancelled by movement - it has priority
  useEffect(() => {
    if (data.targetPosition && (currentState === 'attacking' || currentState === 'passive_skill')) {
      // Cancel current attack/skill and switch to movement
      cancelAttackRef.current = true;
      isPlayingSkillRef.current = false;
      pendingDamageMultiplierRef.current = 1.0;

      // Stop current animation
      if (actionRef.current) {
        actionRef.current.stop();
      }

      setCurrentState('running');
      onStateChange(data.id, 'running');
    }
  }, [data.targetPosition, currentState, data.id, onStateChange]);

  useEffect(() => {
    if (currentAnims.length === 0) return;

    // Reset cancel flag at start of new animation
    cancelAttackRef.current = false;

    const mixer = new THREE.AnimationMixer(currentScene);
    mixerRef.current = mixer;

    const clip = removeRootMotion(currentAnims[0].clone());
    const action = mixer.clipAction(clip);
    actionRef.current = action;

    const isAttackState = currentState === 'attacking' || currentState === 'passive_skill' || currentState === 'active_skill';

    // Define finished handler outside so we can remove it in cleanup
    const onFinished = () => {
      // Skip if attack was cancelled (player moved during attack)
      if (cancelAttackRef.current) {
        cancelAttackRef.current = false;
        return;
      }

      // Deal damage to target monster(s)
      if (isAoESkillRef.current && aoeTargetsRef.current.length > 0) {
        // AoE: damage all targets in range
        for (const targetId of aoeTargetsRef.current) {
          const targetMonster = monstersRef.current.find(m => m.id === targetId && !m.isDying);
          if (targetMonster) {
            const damage = calculateDamage(data.stats.attack, targetMonster.defense, pendingDamageMultiplierRef.current);
            onAttackMonster(data.id, targetId, damage);
          }
        }
        aoeTargetsRef.current = [];
      } else if (currentTargetRef.current) {
        // Single target attack
        const targetMonster = monstersRef.current.find(m => m.id === currentTargetRef.current && !m.isDying);
        if (targetMonster) {
          const damage = calculateDamage(data.stats.attack, targetMonster.defense, pendingDamageMultiplierRef.current);
          onAttackMonster(data.id, currentTargetRef.current, damage);
        }
      }
      pendingDamageMultiplierRef.current = 1.0; // Reset multiplier
      isPlayingSkillRef.current = false; // Unlock skill protection
      isAoESkillRef.current = false; // Reset AoE flag
      setCurrentState('idle');
      onStateChange(data.id, 'idle');
    };

    if (isAttackState) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;

      // Normalize attack animation to fixed duration based on attack speed
      // Skill animations play faster for better game feel
      if (currentState === 'attacking') {
        const targetDuration = 1 / data.stats.attackSpeed;
        action.timeScale = clip.duration / targetDuration;
      } else if (currentState === 'active_skill') {
        action.timeScale = 2.0; // Active skills play at 2x speed
      } else {
        action.timeScale = 1.5; // Passive skills play at 1.5x speed
      }

      mixer.addEventListener('finished', onFinished);
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
    }

    action.enabled = true;
    action.play();

    return () => {
      // Remove listener before stopping to prevent stale callbacks
      if (isAttackState) {
        mixer.removeEventListener('finished', onFinished);
      }
      mixer.stopAllAction();
      mixerRef.current = null;
      actionRef.current = null;
    };
  // Note: monsters removed from deps - use monstersRef.current instead to prevent animation restart
  }, [currentState, currentScene, currentAnims, onAttackMonster, data.stats.attackSpeed, data.stats.attack, data.id, onStateChange]);

  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    if (!groupRef.current) return;

    const currentPos = groupRef.current.position;
    const isAttacking = currentState === 'attacking' || currentState === 'passive_skill' || currentState === 'active_skill';

    // Movement logic
    if (data.targetPosition && !isAttacking) {
      const dir = new THREE.Vector3().subVectors(data.targetPosition, currentPos);
      dir.y = 0; // Ignore Y for distance calculation
      const distance = dir.length();

      if (distance > 0.1) {
        if (currentState !== 'running') {
          setCurrentState('running');
        }

        dir.normalize();
        const moveAmount = Math.min(delta * CHARACTER_SPEED, distance);
        currentPos.x += dir.x * moveAmount;
        currentPos.z += dir.z * moveAmount;

        // Calculate Y position based on bridge location
        // Bridge starts inside main green area and goes to boss platform
        const bossPlatformX = PLATFORM_SIZE / 2 + 8 + BOSS_PLATFORM_SIZE / 2;
        const rampStartX = LANE_OFFSET - 2; // Left ramp starts inside green area
        const flatStartX = rampStartX + RAMP_LENGTH; // Flat section starts after left ramp
        const rampEndX = bossPlatformX - BOSS_PLATFORM_SIZE / 2; // Right ramp ends at boss platform
        const flatEndX = rampEndX - RAMP_LENGTH; // Flat section ends before right ramp
        const bridgeHalfWidth = 1.1;

        // Check if on bridge area (within Z bounds)
        if (Math.abs(currentPos.z) <= bridgeHalfWidth) {
          if (currentPos.x >= flatStartX && currentPos.x <= flatEndX) {
            // On flat elevated section
            currentPos.y = BRIDGE_HEIGHT;
          } else if (currentPos.x >= rampStartX && currentPos.x < flatStartX) {
            // On left ramp (going up from main platform)
            const rampProgress = (currentPos.x - rampStartX) / RAMP_LENGTH;
            currentPos.y = rampProgress * BRIDGE_HEIGHT;
          } else if (currentPos.x > flatEndX && currentPos.x <= rampEndX) {
            // On right ramp (going down to boss platform)
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
        // Reached current waypoint - check for more
        if (data.waypointQueue.length > 1) {
          // Remove completed waypoint and move to next
          data.waypointQueue.shift();
          data.targetPosition = data.waypointQueue[0];
        } else {
          // Final destination reached
          data.waypointQueue = [];
          data.targetPosition = null;
          // Only reset Y if not on bridge
          const rampStartX = LANE_OFFSET - 2;
          const rampEndX = BOSS_PLATFORM_X - BOSS_PLATFORM_SIZE / 2;
          if (!(currentPos.x >= rampStartX && currentPos.x <= rampEndX && Math.abs(currentPos.z) <= 1.1)) {
            currentPos.y = 0;
          }
          data.position.copy(currentPos);
          setCurrentState('idle');
        }
      }
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

    // Always update inRange for visual feedback
    setInRange(isInRange);

    // Only trigger attack if not already attacking AND not protected by skill lock AND no active move command
    if (isInRange && !isAttacking && !isPlayingSkillRef.current && !data.targetPosition) {
      const now = Date.now();
      const attackCooldown = 1000 / data.stats.attackSpeed;
      if (now - data.lastAttackTime > attackCooldown) {
        data.targetPosition = null;
        data.lastAttackTime = now;
        currentTargetRef.current = nearestMonster!.id;

        // Check for passive skill trigger
        const passiveSkill = data.stats.skills.passive;
        if (passiveSkill && Math.random() < passiveSkill.triggerChance) {
          // Trigger passive skill!
          isPlayingSkillRef.current = true; // Lock for passive skill too
          pendingDamageMultiplierRef.current = passiveSkill.damageMultiplier;
          setCurrentState('passive_skill');
          onStateChange(data.id, 'passive_skill');
        } else {
          // Normal attack
          pendingDamageMultiplierRef.current = 1.0;
          setCurrentState('attacking');
          onStateChange(data.id, 'attacking');
        }

        // Face the target monster
        const dir = new THREE.Vector3().subVectors(nearestMonster!.pos, currentPos);
        groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }
  });

  const charScale = data.type === 1 ? CHARACTER1_SCALE : CHARACTER2_SCALE;
  // Divide by charScale so the ring appears the same size in world coordinates
  const attackRingRadius = data.stats.attackRange / charScale;
  const selectionRingRadius = 0.6 / charScale; // Same world size for both characters
  const skillRingRadius = (data.stats.skills.active?.range || 5.0) / charScale;

  // Determine ring color based on state
  const getRingColor = () => {
    if (currentState === 'passive_skill') return '#aa00ff'; // Purple for passive
    if (currentState === 'active_skill') return '#ff6600'; // Orange for active
    if (inRange) return '#ff0000'; // Red when in range
    return '#ffff00'; // Yellow default
  };

  return (
    <group
      ref={groupRef}
      position={[data.position.x, data.position.y, data.position.z]}
      scale={[charScale, charScale, charScale]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(data.id, e.shiftKey);
      }}
    >
      <primitive object={currentScene} />

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
    </group>
  );
}

// ===== PATH CALCULATION (Bridge waypoint system) =====
const BOSS_PLATFORM_X = PLATFORM_SIZE / 2 + 8 + BOSS_PLATFORM_SIZE / 2;
const BRIDGE_ENTRY_X = LANE_OFFSET - 2; // Start of bridge ramp inside green area
const BRIDGE_EXIT_X = BOSS_PLATFORM_X - BOSS_PLATFORM_SIZE / 2; // End of bridge at boss platform

function calculatePath(startPos: THREE.Vector3, targetPos: THREE.Vector3): THREE.Vector3[] {
  const innerBound = LANE_OFFSET - 0.8;
  const bossPlatformHalfSize = BOSS_PLATFORM_SIZE / 2 - 0.5;

  // Determine which zone each position is in
  const isInMain = (pos: THREE.Vector3) =>
    Math.abs(pos.x) <= innerBound && Math.abs(pos.z) <= innerBound;
  const isInBoss = (pos: THREE.Vector3) =>
    Math.abs(pos.x - BOSS_PLATFORM_X) <= bossPlatformHalfSize &&
    Math.abs(pos.z) <= bossPlatformHalfSize;
  const isOnBridge = (pos: THREE.Vector3) =>
    pos.x >= BRIDGE_ENTRY_X && pos.x <= BRIDGE_EXIT_X && Math.abs(pos.z) <= 1.0;

  const startInMain = isInMain(startPos);
  const startInBoss = isInBoss(startPos);
  const startOnBridge = isOnBridge(startPos);

  const targetInMain = isInMain(targetPos);
  const targetInBoss = isInBoss(targetPos);
  const targetOnBridge = isOnBridge(targetPos);

  // Bridge waypoints
  const bridgeEntry = new THREE.Vector3(BRIDGE_ENTRY_X + 0.5, 0, 0);
  const bridgeExit = new THREE.Vector3(BRIDGE_EXIT_X - 0.5, 0, 0);

  // Main to Boss: go through bridge
  if (startInMain && targetInBoss) {
    return [bridgeEntry, bridgeExit, targetPos];
  }

  // Boss to Main: go through bridge
  if (startInBoss && targetInMain) {
    return [bridgeExit, bridgeEntry, targetPos];
  }

  // Main to Bridge
  if (startInMain && targetOnBridge) {
    return [bridgeEntry, targetPos];
  }

  // Boss to Bridge
  if (startInBoss && targetOnBridge) {
    return [bridgeExit, targetPos];
  }

  // Bridge to Main
  if (startOnBridge && targetInMain) {
    return [bridgeEntry, targetPos];
  }

  // Bridge to Boss
  if (startOnBridge && targetInBoss) {
    return [bridgeExit, targetPos];
  }

  // Same zone or already on bridge - direct path
  return [targetPos];
}

// ===== SELECTION HANDLER (Multi-select + RTS controls) =====
interface SelectionHandlerProps {
  selectedCharacterIds: Set<string>;
  setSelectedCharacterIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  characters: CharacterData[];
  selectionBox: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
  setSelectionBox: React.Dispatch<React.SetStateAction<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>>;
  onMoveCommand: (position: THREE.Vector3) => void;
}

function SelectionHandler({ selectedCharacterIds, setSelectedCharacterIds, characters, selectionBox, setSelectionBox, onMoveCommand }: SelectionHandlerProps) {
  const { camera, raycaster, gl } = useThree();
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = gl.domElement;

    // Right-click: Move selected characters
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      if (selectedCharacterIds.size === 0) return;

      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);

      // Multi-plane raycasting: check ground and bridge height
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const bridgePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BRIDGE_HEIGHT);

      const groundIntersect = new THREE.Vector3();
      const bridgeIntersect = new THREE.Vector3();

      const hasGroundHit = raycaster.ray.intersectPlane(groundPlane, groundIntersect);
      const hasBridgeHit = raycaster.ray.intersectPlane(bridgePlane, bridgeIntersect);

      // Check if bridge intersection is valid (within bridge bounds)
      const bridgeStartX = LANE_OFFSET - 2;
      const bridgeEndX = BOSS_PLATFORM_X - BOSS_PLATFORM_SIZE / 2;
      const bridgeHalfWidth = 1.0;

      let intersection: THREE.Vector3 | null = null;

      if (hasBridgeHit &&
          bridgeIntersect.x >= bridgeStartX &&
          bridgeIntersect.x <= bridgeEndX &&
          Math.abs(bridgeIntersect.z) <= bridgeHalfWidth) {
        // Valid bridge click - use bridge intersection
        intersection = bridgeIntersect;
        intersection.y = BRIDGE_HEIGHT; // Keep the bridge height
      } else if (hasGroundHit) {
        // Ground click
        intersection = groundIntersect;
      }

      if (intersection) {
        // Define walkable areas
        const innerBound = LANE_OFFSET - 0.8; // Main green area inner edge
        const bossPlatformX = PLATFORM_SIZE / 2 + 8 + BOSS_PLATFORM_SIZE / 2;
        const bossPlatformHalfSize = BOSS_PLATFORM_SIZE / 2 - 0.5;

        // Check which area the click is in
        const isInMainArea = Math.abs(intersection.x) <= innerBound && Math.abs(intersection.z) <= innerBound;
        const isOnBridge = intersection.x >= bridgeStartX &&
                          intersection.x <= bridgeEndX &&
                          Math.abs(intersection.z) <= bridgeHalfWidth;
        const isInBossArea = Math.abs(intersection.x - bossPlatformX) <= bossPlatformHalfSize &&
                            Math.abs(intersection.z) <= bossPlatformHalfSize;

        let targetPoint: THREE.Vector3;

        if (isInMainArea || isOnBridge || isInBossArea) {
          // Click is in a valid area - use exact position
          targetPoint = intersection.clone();
        } else {
          // Click is outside - find nearest valid point
          // First, try to clamp to main area
          let clampedX = Math.max(-innerBound, Math.min(innerBound, intersection.x));
          let clampedZ = Math.max(-innerBound, Math.min(innerBound, intersection.z));

          // Check if boss area is closer
          const distToMain = Math.sqrt(
            Math.pow(intersection.x - clampedX, 2) + Math.pow(intersection.z - clampedZ, 2)
          );

          const bossClampedX = Math.max(bossPlatformX - bossPlatformHalfSize, Math.min(bossPlatformX + bossPlatformHalfSize, intersection.x));
          const bossClampedZ = Math.max(-bossPlatformHalfSize, Math.min(bossPlatformHalfSize, intersection.z));
          const distToBoss = Math.sqrt(
            Math.pow(intersection.x - bossClampedX, 2) + Math.pow(intersection.z - bossClampedZ, 2)
          );

          // Check if bridge is closer
          const bridgeClampedX = Math.max(bridgeStartX, Math.min(bridgeEndX, intersection.x));
          const bridgeClampedZ = Math.max(-bridgeHalfWidth, Math.min(bridgeHalfWidth, intersection.z));
          const distToBridge = intersection.x >= bridgeStartX && intersection.x <= bridgeEndX
            ? Math.abs(intersection.z) > bridgeHalfWidth ? Math.abs(intersection.z) - bridgeHalfWidth : 0
            : Infinity;

          if (distToBoss < distToMain && distToBoss < distToBridge) {
            clampedX = bossClampedX;
            clampedZ = bossClampedZ;
          } else if (distToBridge < distToMain && distToBridge !== Infinity) {
            clampedX = bridgeClampedX;
            clampedZ = bridgeClampedZ;
          }

          targetPoint = new THREE.Vector3(clampedX, 0, clampedZ);
        }

        // Trigger move indicator effect at the target position
        onMoveCommand(targetPoint.clone());

        // Move all selected characters using waypoint system
        const selectedChars = characters.filter(c => selectedCharacterIds.has(c.id));
        const count = selectedChars.length;

        selectedChars.forEach((char, index) => {
          const offsetAngle = (index / count) * Math.PI * 2;
          const offsetDist = count > 1 ? 0.5 : 0;
          const finalTarget = targetPoint.clone();
          finalTarget.x += Math.cos(offsetAngle) * offsetDist;
          finalTarget.z += Math.sin(offsetAngle) * offsetDist;

          // Calculate path with waypoints for cross-zone movement
          const path = calculatePath(char.position, finalTarget);
          char.waypointQueue = path;
          char.targetPosition = path[0] || null;
        });
      }
    };

    // Left-click drag: Selection box
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click

      dragStartRef.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      // Start drag if moved enough
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDraggingRef.current = true;
        setSelectionBox({
          start: dragStartRef.current,
          end: { x: e.clientX, y: e.clientY }
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return;

      if (isDraggingRef.current && selectionBox) {
        // Select characters within the box
        const box = {
          left: Math.min(selectionBox.start.x, selectionBox.end.x),
          right: Math.max(selectionBox.start.x, selectionBox.end.x),
          top: Math.min(selectionBox.start.y, selectionBox.end.y),
          bottom: Math.max(selectionBox.start.y, selectionBox.end.y)
        };

        const newSelection = new Set<string>();

        characters.forEach(char => {
          // Project character position to screen
          const pos = char.position.clone();
          pos.project(camera);

          const screenX = (pos.x + 1) / 2 * window.innerWidth;
          const screenY = (-pos.y + 1) / 2 * window.innerHeight;

          if (screenX >= box.left && screenX <= box.right &&
              screenY >= box.top && screenY <= box.bottom) {
            newSelection.add(char.id);
          }
        });

        if (e.shiftKey) {
          // Add to existing selection
          setSelectedCharacterIds(prev => new Set([...prev, ...newSelection]));
        } else {
          setSelectedCharacterIds(newSelection);
        }
      } else if (!isDraggingRef.current) {
        // Simple click on empty space - deselect all
        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        raycaster.setFromCamera(mouse, camera);

        // Check if clicked on a character (handled by Character component)
        // If not, clear selection
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          // Check if any character is at this position
          const clickedChar = characters.find(c => {
            const dist = c.position.distanceTo(intersection);
            return dist < 1; // Within click range
          });

          if (!clickedChar && !e.shiftKey) {
            setSelectedCharacterIds(new Set());
          }
        }
      }

      dragStartRef.current = null;
      isDraggingRef.current = false;
      setSelectionBox(null);
    };

    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [selectedCharacterIds, setSelectedCharacterIds, characters, camera, raycaster, gl, selectionBox, setSelectionBox, onMoveCommand]);

  return null;
}

// ===== RTS CAMERA CONTROLLER =====
function RTSCameraController() {
  const { camera, gl } = useThree();
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef(new THREE.Vector3(0, 0, 0)); // Camera look target

  // Zoom control
  const targetDistance = useRef(15); // Distance from target
  const minDistance = 8;
  const maxDistance = 30;

  // Angle control (Ctrl+wheel)
  const targetAngle = useRef(50); // Angle in degrees (0=horizontal, 90=top-down)
  const currentAngle = useRef(50);
  const minAngle = 10; // Almost horizontal
  const maxAngle = 85; // Almost top-down

  // Current distance for smooth lerp
  const currentDistance = useRef(15);

  // Smooth zoom and angle animation
  useFrame(() => {
    let needsUpdate = false;

    // Lerp distance
    if (Math.abs(currentDistance.current - targetDistance.current) > 0.01) {
      currentDistance.current += (targetDistance.current - currentDistance.current) * 0.1;
      needsUpdate = true;
    }

    // Lerp angle
    if (Math.abs(currentAngle.current - targetAngle.current) > 0.1) {
      currentAngle.current += (targetAngle.current - currentAngle.current) * 0.1;
      needsUpdate = true;
    }

    if (needsUpdate) {
      // Calculate camera position based on angle and distance
      const angleRad = (currentAngle.current * Math.PI) / 180;
      const y = Math.sin(angleRad) * currentDistance.current;
      const z = Math.cos(angleRad) * currentDistance.current;

      camera.position.y = y;
      camera.position.z = targetRef.current.z + z;
      camera.position.x = targetRef.current.x;

      camera.lookAt(targetRef.current);
    }
  });

  useEffect(() => {
    const canvas = gl.domElement;

    // Wheel: Zoom in/out or Ctrl+Wheel: Angle adjustment
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey) {
        // Ctrl+Wheel: Adjust angle
        const angleSpeed = 5;
        const delta = e.deltaY > 0 ? -angleSpeed : angleSpeed;
        targetAngle.current = Math.max(minAngle, Math.min(maxAngle, targetAngle.current + delta));
      } else {
        // Normal wheel: Zoom
        const zoomSpeed = 2;
        const delta = e.deltaY > 0 ? zoomSpeed : -zoomSpeed;
        targetDistance.current = Math.max(minDistance, Math.min(maxDistance, targetDistance.current + delta));
      }
    };

    // Middle mouse: Pan
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) { // Middle click
        e.preventDefault();
        isPanningRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;

      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;

      // Pan speed scales with distance for consistent feel
      const panSpeed = 0.02 * (currentDistance.current / 15);

      // Move target, camera follows via useFrame
      targetRef.current.x -= dx * panSpeed;
      targetRef.current.z -= dy * panSpeed;

      // Also move camera immediately for responsive feel
      camera.position.x -= dx * panSpeed;
      camera.position.z -= dy * panSpeed;

      camera.lookAt(targetRef.current);

      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        isPanningRef.current = false;
      }
    };

    // Prevent context menu on middle click
    const handleContextMenuPrevention = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('auxclick', handleContextMenuPrevention);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('auxclick', handleContextMenuPrevention);
    };
  }, [camera, gl]);

  // Set initial camera look direction
  useEffect(() => {
    camera.lookAt(targetRef.current);
  }, [camera]);

  return null;
}

// ===== MAIN SCENE =====
export default function SimpleTestScene() {
  // Game state
  const [gameState, setGameState] = useState<GameState>('playing');
  const [currentWave, setCurrentWave] = useState(1);
  const [monstersSpawnedInWave, setMonstersSpawnedInWave] = useState(0);
  const [monstersKilledInWave, setMonstersKilledInWave] = useState(0);
  const [totalMonstersKilled, setTotalMonstersKilled] = useState(0);

  // Character state
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [spawnCount, setSpawnCount] = useState(0);

  // Monster state (multiple monsters)
  const [monsters, setMonsters] = useState<MonsterData[]>([]);
  const monsterPosRefs = useRef<Map<string, THREE.Vector3>>(new Map());

  // Selection state
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [selectionTarget, setSelectionTarget] = useState<SelectionTarget>(null);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

  // UI state
  const [moveIndicators, setMoveIndicators] = useState<MoveIndicatorData[]>([]);

  // Refs for tracking
  const monsterIdCounterRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waveTransitioningRef = useRef(false);

  // Sync selection target with selectedCharacterIds
  useEffect(() => {
    if (selectedCharacterIds.size > 0) {
      setSelectionTarget({ type: 'character', ids: Array.from(selectedCharacterIds) });
    } else if (selectionTarget?.type === 'character') {
      setSelectionTarget(null);
    }
  }, [selectedCharacterIds]);

  // Create a monster with wave-based stats
  const createMonster = useCallback((wave: number): MonsterData => {
    const stats = getMonsterStatsForWave(wave);
    const id = `monster-${monsterIdCounterRef.current++}`;
    monsterPosRefs.current.set(id, new THREE.Vector3(-LANE_OFFSET, 0, -LANE_OFFSET));
    return {
      id,
      hp: stats.hp,
      maxHp: stats.hp,
      defense: stats.defense,
      damage: stats.damage,
      wave,
      sizeMultiplier: stats.sizeMultiplier,
      progress: 0,
      isDying: false,
    };
  }, []);

  // Spawn monsters for current wave
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (currentWave > WAVE_CONFIG.totalWaves) return;

    // Reset counters for new wave
    setMonstersSpawnedInWave(0);
    setMonstersKilledInWave(0);

    // Start spawning monsters
    let spawned = 0;
    let cancelled = false;

    const spawnNext = () => {
      if (cancelled) return;
      if (spawned >= WAVE_CONFIG.monstersPerWave) {
        return;
      }
      const newMonster = createMonster(currentWave);
      setMonsters(prev => [...prev, newMonster]);
      spawned++;
      setMonstersSpawnedInWave(spawned);

      if (spawned < WAVE_CONFIG.monstersPerWave) {
        spawnTimerRef.current = setTimeout(spawnNext, WAVE_CONFIG.spawnInterval);
      }
    };

    // Start spawning after a small delay
    spawnTimerRef.current = setTimeout(spawnNext, 500);

    return () => {
      cancelled = true;
      if (spawnTimerRef.current) {
        clearTimeout(spawnTimerRef.current);
      }
    };
  }, [currentWave, gameState, createMonster]);

  // Check for wave completion
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (waveTransitioningRef.current) return; // Prevent double-trigger
    if (monstersKilledInWave >= WAVE_CONFIG.monstersPerWave && monstersSpawnedInWave >= WAVE_CONFIG.monstersPerWave) {
      // Wave complete
      if (currentWave >= WAVE_CONFIG.totalWaves) {
        // All waves complete - Game Over
        setGameState('gameover');
      } else {
        // Start next wave after delay
        waveTransitioningRef.current = true;
        setTimeout(() => {
          waveTransitioningRef.current = false;
          setCurrentWave(currentWave + 1); // Use explicit value, not prev
        }, WAVE_CONFIG.waveDelay);
      }
    }
  }, [monstersKilledInWave, monstersSpawnedInWave, currentWave, gameState]);

  // Handle move command - create indicator effect
  const handleMoveCommand = useCallback((position: THREE.Vector3) => {
    const newIndicator: MoveIndicatorData = {
      id: `move-${Date.now()}`,
      position,
      startTime: Date.now()
    };
    setMoveIndicators(prev => [...prev, newIndicator]);
  }, []);

  // Remove completed indicator
  const handleIndicatorComplete = useCallback((id: string) => {
    setMoveIndicators(prev => prev.filter(ind => ind.id !== id));
  }, []);

  // Spawn character
  const spawnCharacter = useCallback(() => {
    const type = (spawnCount % 2) + 1 as 1 | 2;
    const stats = getCharacterStats(type);
    const innerBound = LANE_OFFSET - 1.5;
    const spawnX = (Math.random() - 0.5) * innerBound * 1.5;
    const spawnZ = (Math.random() - 0.5) * innerBound * 1.5;

    const newChar: CharacterData = {
      id: `char-${Date.now()}`,
      type,
      position: new THREE.Vector3(spawnX, 0, spawnZ),
      targetPosition: null,
      waypointQueue: [],
      state: 'idle',
      lastAttackTime: 0,
      lastActiveSkillTime: -10000, // Allow immediate use
      stats,
      currentHp: stats.maxHp,
    };

    setCharacters(prev => [...prev, newChar]);
    setSpawnCount(prev => prev + 1);
  }, [spawnCount]);

  // Select character
  const handleSelectCharacter = useCallback((id: string, addToSelection: boolean) => {
    // Clear monster selection when selecting character
    setSelectionTarget(null);
    if (addToSelection) {
      setSelectedCharacterIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    } else {
      setSelectedCharacterIds(new Set([id]));
    }
  }, []);

  // Select single character from multi-select panel
  const handleSelectSingleCharacter = useCallback((id: string) => {
    setSelectedCharacterIds(new Set([id]));
  }, []);

  // Select monster
  const handleSelectMonster = useCallback((id: string) => {
    setSelectedCharacterIds(new Set()); // Clear character selection
    setSelectionTarget({ type: 'monster', id });
  }, []);

  // Attack monster (called when character attack animation finishes)
  const handleAttackMonster = useCallback((_attackerId: string, monsterId: string, damage: number) => {
    setMonsters(prev => prev.map(m => {
      if (m.id !== monsterId || m.isDying) return m;
      const newHp = Math.max(0, m.hp - damage);
      if (newHp <= 0) {
        return { ...m, hp: 0, isDying: true };
      }
      return { ...m, hp: newHp };
    }));
  }, []);

  // Monster death callback
  const handleMonsterDeath = useCallback((id: string) => {
    setMonsters(prev => prev.filter(m => m.id !== id));
    monsterPosRefs.current.delete(id);
    setMonstersKilledInWave(prev => prev + 1);
    setTotalMonstersKilled(prev => prev + 1);

    // If the dead monster was selected, clear selection
    if (selectionTarget?.type === 'monster' && selectionTarget.id === id) {
      setSelectionTarget(null);
    }
  }, [selectionTarget]);

  // Use active skill
  const handleUseActiveSkill = useCallback((charId: string) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const skill = c.stats.skills.active;
      if (!skill) return c;
      if (Date.now() - c.lastActiveSkillTime < skill.cooldown) return c;
      return {
        ...c,
        lastActiveSkillTime: Date.now(),
        state: 'active_skill' as const,
        targetPosition: null, // Stop movement - active skill has priority
      };
    }));
  }, []);

  // Handle character state changes
  const handleStateChange = useCallback((charId: string, state: CharacterData['state']) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      return { ...c, state };
    }));
  }, []);

  // Restart game
  const handleRestart = useCallback(() => {
    waveTransitioningRef.current = false;
    setGameState('playing');
    setCurrentWave(0); // Set to 0, then immediately set to 1 to trigger useEffect
    setMonstersSpawnedInWave(0);
    setMonstersKilledInWave(0);
    setTotalMonstersKilled(0);
    setMonsters([]);
    monsterPosRefs.current.clear();
    monsterIdCounterRef.current = 0;
    // Trigger wave 1 start
    setTimeout(() => setCurrentWave(1), 100);
    // Keep characters for now
  }, []);

  // Selection box style
  const selectionBoxStyle = selectionBox ? {
    position: 'absolute' as const,
    left: Math.min(selectionBox.start.x, selectionBox.end.x),
    top: Math.min(selectionBox.start.y, selectionBox.end.y),
    width: Math.abs(selectionBox.end.x - selectionBox.start.x),
    height: Math.abs(selectionBox.end.y - selectionBox.start.y),
    border: '1px solid #00ff00',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    pointerEvents: 'none' as const,
    zIndex: 1000
  } : null;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
      {/* Selection Box Overlay */}
      {selectionBoxStyle && <div style={selectionBoxStyle} />}

      {/* Game Over Overlay */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
        }}>
          <h1 style={{ color: '#ff6666', fontSize: '48px', marginBottom: '20px', fontFamily: 'monospace' }}>
            GAME OVER
          </h1>
          <p style={{ color: '#ccc', fontSize: '24px', marginBottom: '10px', fontFamily: 'monospace' }}>
            All waves completed!
          </p>
          <p style={{ color: '#888', fontSize: '18px', marginBottom: '30px', fontFamily: 'monospace' }}>
            Monsters killed: {totalMonstersKilled}
          </p>
          <button
            onClick={handleRestart}
            style={{
              padding: '15px 40px',
              fontSize: '20px',
              fontWeight: 'bold',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            }}
          >
            Restart Game
          </button>
        </div>
      )}

      {/* Top UI - Wave Info */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px 30px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9900' }}>
          Wave {currentWave} / {WAVE_CONFIG.totalWaves}
        </div>
        <div style={{ fontSize: '14px', color: '#888' }}>
          Monsters: {monstersKilledInWave} / {WAVE_CONFIG.monstersPerWave} killed
        </div>
      </div>

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
        <p style={{ margin: '5px 0', color: '#888' }}>Monsters alive: {monsters.filter(m => !m.isDying).length}</p>
        <p style={{ margin: '5px 0', color: '#888' }}>Total kills: {totalMonstersKilled}</p>
        <hr style={{ margin: '10px 0', borderColor: '#444' }} />
        <p style={{ margin: '5px 0', color: '#666' }}>Left-drag: Box select</p>
        <p style={{ margin: '5px 0', color: '#666' }}>Right-click: Move</p>
        <p style={{ margin: '5px 0', color: '#666' }}>Wheel: Zoom</p>
        <p style={{ margin: '5px 0', color: '#666' }}>Ctrl+Wheel: Angle</p>
        <p style={{ margin: '5px 0', color: '#666' }}>Middle-drag: Pan</p>
        <p style={{ margin: '5px 0', color: '#666' }}>Shift+click: Add to selection</p>
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

      {/* Status Panel */}
      <StatusPanel
        selectionTarget={selectionTarget}
        characters={characters}
        monsters={monsters}
        onUseActiveSkill={handleUseActiveSkill}
        onSelectCharacter={handleSelectSingleCharacter}
      />

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 12, 10]} fov={50} />
        <RTSCameraController />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <Platform />

        {/* Render all monsters */}
        {monsters.map(monster => {
          // Get or create position ref for this monster
          if (!monsterPosRefs.current.has(monster.id)) {
            monsterPosRefs.current.set(monster.id, new THREE.Vector3(-LANE_OFFSET, 0, -LANE_OFFSET));
          }
          const posRef = { current: monsterPosRefs.current.get(monster.id)! };
          return (
            <Monster
              key={monster.id}
              data={monster}
              positionRef={posRef}
              onDeath={() => handleMonsterDeath(monster.id)}
              onClick={() => handleSelectMonster(monster.id)}
              isSelected={selectionTarget?.type === 'monster' && selectionTarget.id === monster.id}
            />
          );
        })}

        {characters.map(char => (
          <Character
            key={char.id}
            data={char}
            isSelected={selectedCharacterIds.has(char.id)}
            onSelect={handleSelectCharacter}
            monsters={monsters}
            monsterPosRefs={monsterPosRefs.current}
            onAttackMonster={handleAttackMonster}
            onStateChange={handleStateChange}
          />
        ))}

        <SelectionHandler
          selectedCharacterIds={selectedCharacterIds}
          setSelectedCharacterIds={setSelectedCharacterIds}
          characters={characters}
          selectionBox={selectionBox}
          setSelectionBox={setSelectionBox}
          onMoveCommand={handleMoveCommand}
        />

        {/* Move indicators (Warcraft-style click effect) */}
        {moveIndicators.map(indicator => (
          <MoveIndicator
            key={indicator.id}
            data={indicator}
            onComplete={() => handleIndicatorComplete(indicator.id)}
          />
        ))}
      </Canvas>
    </div>
  );
}
