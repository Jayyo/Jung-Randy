import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  Sky,
  Stars,
  Text,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import { GameCore } from '../core/GameCore';
import { defaultGameConfig, getZoneCenter } from '@/data/config';
import { PlayerZone, MobInstance, CharacterInstance } from '@/types';

// Scale factor for 3D world - increased for bigger platforms
const SCALE = 0.01;
const ZONES: PlayerZone[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

// Zone positions - closer together
const ZONE_OFFSETS: Record<PlayerZone, { x: number; z: number }> = {
  topLeft: { x: -1, z: -1 },
  topRight: { x: 1, z: -1 },
  bottomRight: { x: 1, z: 1 },
  bottomLeft: { x: -1, z: 1 },
};

// ===== ANIMATED WATER =====
function WaterPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Custom water shader
  const waterShader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#1a3a5c') },
      uColor2: { value: new THREE.Color('#2d5a87') },
    },
    vertexShader: `
      varying vec2 vUv;
      varying float vElevation;
      uniform float uTime;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Create wave effect
        float wave1 = sin(pos.x * 2.0 + uTime) * 0.05;
        float wave2 = sin(pos.y * 3.0 + uTime * 0.8) * 0.03;
        float wave3 = cos(pos.x * 1.5 + pos.y * 2.0 + uTime * 1.2) * 0.02;

        pos.z = wave1 + wave2 + wave3;
        vElevation = pos.z;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uTime;
      varying vec2 vUv;
      varying float vElevation;

      void main() {
        // Mix colors based on wave height and position
        float mixValue = (vElevation + 0.1) * 5.0;
        mixValue += sin(vUv.x * 10.0 + uTime) * 0.1;
        mixValue += cos(vUv.y * 8.0 + uTime * 0.7) * 0.1;

        vec3 color = mix(uColor1, uColor2, clamp(mixValue, 0.0, 1.0));

        // Add foam effect at edges
        float foam = smoothstep(0.4, 0.5, abs(vUv.x - 0.5)) * 0.2;
        foam += smoothstep(0.4, 0.5, abs(vUv.y - 0.5)) * 0.2;
        color += vec3(foam);

        gl_FragColor = vec4(color, 0.9);
      }
    `,
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
      <planeGeometry args={[60, 60, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        {...waterShader}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ===== PLAYER ZONE PLATFORM (4x bigger) =====
function ZonePlatform({ zone, statueHp, maxHp }: { zone: PlayerZone; statueHp: number; maxHp: number }) {
  const config = defaultGameConfig;
  // Platform is now 4x bigger
  const platformSize = config.zoneSize * SCALE * 4;
  const offset = ZONE_OFFSETS[zone];
  // Closer together - smaller gap
  const centerOffset = platformSize * 0.7;

  const x = offset.x * centerOffset;
  const z = offset.z * centerOffset;

  const hpPercent = statueHp / maxHp;
  const hpColor = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f1c40f' : '#e74c3c';

  const zoneLabels: Record<PlayerZone, string> = {
    topLeft: 'P1',
    topRight: 'P2',
    bottomRight: 'P3',
    bottomLeft: 'P4',
  };

  // Mob path size (square path at the very edge of platform)
  const pathWidth = platformSize * 0.12;
  const pathOffset = platformSize * 0.5 - pathWidth * 0.5; // Path at edge

  return (
    <group position={[x, 0, z]}>
      {/* Platform base - stone/concrete look */}
      <mesh position={[0, -0.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[platformSize, 0.3, platformSize]} />
        <meshStandardMaterial color="#3d4a3e" roughness={0.8} />
      </mesh>

      {/* Platform top surface - grass */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[platformSize - 0.2, 0.04, platformSize - 0.2]} />
        <meshStandardMaterial color="#4a6b4a" roughness={0.9} />
      </mesh>

      {/* MOB PATH - 4 sides at the very edge of platform */}
      {/* Top path (north edge) */}
      <mesh position={[0, 0.05, -pathOffset]} receiveShadow>
        <boxGeometry args={[platformSize, 0.08, pathWidth]} />
        <meshStandardMaterial color="#8b6914" roughness={0.7} />
      </mesh>
      {/* Bottom path (south edge) */}
      <mesh position={[0, 0.05, pathOffset]} receiveShadow>
        <boxGeometry args={[platformSize, 0.08, pathWidth]} />
        <meshStandardMaterial color="#8b6914" roughness={0.7} />
      </mesh>
      {/* Left path (west edge) */}
      <mesh position={[-pathOffset, 0.05, 0]} receiveShadow>
        <boxGeometry args={[pathWidth, 0.08, platformSize]} />
        <meshStandardMaterial color="#8b6914" roughness={0.7} />
      </mesh>
      {/* Right path (east edge) */}
      <mesh position={[pathOffset, 0.05, 0]} receiveShadow>
        <boxGeometry args={[pathWidth, 0.08, platformSize]} />
        <meshStandardMaterial color="#8b6914" roughness={0.7} />
      </mesh>

      {/* Path corner towers for visual interest */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([cx, cz], i) => (
        <group key={`corner-tower-${i}`} position={[cx * pathOffset, 0, cz * pathOffset]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.3, 0.4, 8]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.5, 0]} castShadow>
            <coneGeometry args={[0.35, 0.3, 8]} />
            <meshStandardMaterial color="#8b4513" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Statue pedestal */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.8, 0.6, 0.8]} />
        <meshStandardMaterial color="#555555" roughness={0.6} />
      </mesh>

      {/* Statue figure */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Statue head */}
      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>

      {/* HP bar background */}
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[1.2, 0.2, 0.06]} />
        <meshBasicMaterial color="#333333" />
      </mesh>

      {/* HP bar fill */}
      <mesh position={[-0.6 * (1 - hpPercent), 2.4, 0.04]}>
        <boxGeometry args={[1.2 * hpPercent, 0.16, 0.06]} />
        <meshBasicMaterial color={hpColor} />
      </mesh>

      {/* Zone label */}
      <Text
        position={[0, 3.0, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="#000000"
      >
        {zoneLabels[zone]}
      </Text>

      {/* Decorative trees around the inner area */}
      {[
        { x: 0.25, z: 0.25 }, { x: -0.25, z: 0.25 },
        { x: 0.25, z: -0.25 }, { x: -0.25, z: -0.25 },
        { x: 0.35, z: 0 }, { x: -0.35, z: 0 },
        { x: 0, z: 0.35 }, { x: 0, z: -0.35 },
      ].map((pos, i) => (
        <group key={`tree-${i}`} position={[pos.x * platformSize * 0.6, 0, pos.z * platformSize * 0.6]}>
          {/* Tree trunk */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.15, 0.8, 8]} />
            <meshStandardMaterial color="#4a3728" roughness={0.9} />
          </mesh>
          {/* Tree foliage - multiple layers */}
          <mesh position={[0, 1.0, 0]} castShadow>
            <coneGeometry args={[0.5, 0.8, 8]} />
            <meshStandardMaterial color="#2d5a2d" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.5, 0]} castShadow>
            <coneGeometry args={[0.4, 0.7, 8]} />
            <meshStandardMaterial color="#3a6a3a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.9, 0]} castShadow>
            <coneGeometry args={[0.25, 0.5, 8]} />
            <meshStandardMaterial color="#4a7a4a" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Decorative rocks */}
      {[
        { x: 0.15, z: 0.4, scale: 0.15 }, { x: -0.4, z: 0.15, scale: 0.2 },
        { x: 0.38, z: -0.2, scale: 0.12 }, { x: -0.2, z: -0.38, scale: 0.18 },
      ].map((rock, i) => (
        <mesh
          key={`rock-${i}`}
          position={[rock.x * platformSize * 0.6, 0.1, rock.z * platformSize * 0.6]}
          rotation={[0, i * 1.2, 0]}
          castShadow
        >
          <dodecahedronGeometry args={[rock.scale, 0]} />
          <meshStandardMaterial color="#6a6a6a" roughness={0.9} />
        </mesh>
      ))}

      {/* Small fence sections for depth */}
      {[0, 1, 2, 3].map((side) => {
        const fencePositions = [-0.3, 0, 0.3];
        return fencePositions.map((offset, i) => {
          const sideOffset = platformSize * 0.35;
          let fx = 0, fz = 0, ry = 0;
          switch (side) {
            case 0: fx = offset * platformSize * 0.3; fz = -sideOffset; ry = 0; break;
            case 1: fx = sideOffset; fz = offset * platformSize * 0.3; ry = Math.PI / 2; break;
            case 2: fx = offset * platformSize * 0.3; fz = sideOffset; ry = 0; break;
            case 3: fx = -sideOffset; fz = offset * platformSize * 0.3; ry = Math.PI / 2; break;
          }
          return (
            <group key={`fence-${side}-${i}`} position={[fx, 0, fz]} rotation={[0, ry, 0]}>
              {/* Fence post */}
              <mesh position={[0, 0.25, 0]} castShadow>
                <boxGeometry args={[0.08, 0.5, 0.08]} />
                <meshStandardMaterial color="#5d4037" />
              </mesh>
              {/* Fence rail */}
              <mesh position={[0, 0.35, 0]}>
                <boxGeometry args={[0.6, 0.06, 0.04]} />
                <meshStandardMaterial color="#6d4c41" />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <boxGeometry args={[0.6, 0.06, 0.04]} />
                <meshStandardMaterial color="#6d4c41" />
              </mesh>
            </group>
          );
        });
      })}

      {/* Wall segments with raised platforms for more depth */}
      {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([wx, wz], i) => (
        <group key={`wall-${i}`} position={[wx * platformSize * 0.4, 0, wz * platformSize * 0.4]}>
          <mesh position={[0, 0.15, 0]} castShadow>
            <boxGeometry args={[0.8, 0.3, 0.3]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ===== BRIDGE CONNECTING ZONE TO CENTER =====
function Bridge({ zone }: { zone: PlayerZone }) {
  const config = defaultGameConfig;
  const platformSize = config.zoneSize * SCALE * 4;
  const centerOffset = platformSize * 0.7;
  const centralSize = config.centralAreaSize * SCALE * 2;
  const offset = ZONE_OFFSETS[zone];

  // Calculate zone edge to center edge distance
  const zoneEdge = centerOffset - platformSize / 2; // Distance from center to zone's inner edge
  const centerEdge = centralSize * 0.7; // Central area's outer radius
  const gapDistance = zoneEdge - centerEdge;

  const bridgeLength = gapDistance + 1.0; // Bridge length to span the gap with overlap
  const bridgeWidth = 1.8;

  // Bridge midpoint position - exactly between zone edge and center edge
  const midDist = centerEdge + gapDistance / 2;
  const bx = offset.x * midDist;
  const bz = offset.z * midDist;

  // Calculate rotation to face center (along diagonal for corner zones)
  const angle = Math.atan2(offset.z, offset.x);

  return (
    <group position={[bx, 0, bz]} rotation={[0, -angle + Math.PI / 2, 0]}>
      {/* Bridge support structure */}
      <mesh position={[0, -0.2, 0]} castShadow>
        <boxGeometry args={[bridgeWidth * 0.8, 0.15, bridgeLength]} />
        <meshStandardMaterial color="#4a3728" roughness={0.9} />
      </mesh>

      {/* Bridge deck - walkable surface */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[bridgeWidth, 0.12, bridgeLength]} />
        <meshStandardMaterial color="#6d4c41" roughness={0.7} />
      </mesh>

      {/* Bridge top planks texture */}
      <mesh position={[0, 0.07, 0]} receiveShadow>
        <boxGeometry args={[bridgeWidth - 0.15, 0.04, bridgeLength - 0.15]} />
        <meshStandardMaterial color="#8d6e63" roughness={0.8} />
      </mesh>

      {/* Railings */}
      {[-1, 1].map((side, i) => (
        <group key={i}>
          {/* Railing beam */}
          <mesh position={[side * bridgeWidth * 0.45, 0.35, 0]}>
            <boxGeometry args={[0.1, 0.55, bridgeLength]} />
            <meshStandardMaterial color="#5d4037" />
          </mesh>
          {/* Railing posts */}
          {[-1, -0.5, 0, 0.5, 1].map((pos, j) => (
            <mesh key={j} position={[side * bridgeWidth * 0.45, 0.35, pos * bridgeLength * 0.4]} castShadow>
              <boxGeometry args={[0.15, 0.7, 0.15]} />
              <meshStandardMaterial color="#6d4c41" />
            </mesh>
          ))}
          {/* Top rail */}
          <mesh position={[side * bridgeWidth * 0.45, 0.65, 0]}>
            <boxGeometry args={[0.12, 0.08, bridgeLength]} />
            <meshStandardMaterial color="#795548" />
          </mesh>
        </group>
      ))}

      {/* Torches at ends */}
      {[-1, 1].map((end, i) => (
        <group key={i} position={[0, 0, end * bridgeLength * 0.48]}>
          {/* Torch holder */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 0.4, 8]} />
            <meshStandardMaterial color="#3e2723" />
          </mesh>
          {/* Flame glow */}
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={0.8} />
          </mesh>
          <pointLight position={[0, 0.8, 0]} color="#ff8844" intensity={2} distance={5} />
        </group>
      ))}
    </group>
  );
}

// ===== CENTRAL BOSS AREA =====
function CentralArea({ bossActive }: { bossActive: boolean }) {
  const config = defaultGameConfig;
  const size = config.centralAreaSize * SCALE * 2;

  return (
    <group position={[0, 0, 0]}>
      {/* Central platform - elevated octagon */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[size * 0.7, size * 0.75, 0.25, 8]} />
        <meshStandardMaterial color="#4a4a6a" roughness={0.6} />
      </mesh>

      {/* Inner ring */}
      <mesh position={[0, 0.23, 0]} receiveShadow>
        <cylinderGeometry args={[size * 0.5, size * 0.55, 0.08, 8]} />
        <meshStandardMaterial color="#5a5a7a" />
      </mesh>

      {/* Boss spawn pedestal */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.7, 0.3, 6]} />
        <meshStandardMaterial
          color={bossActive ? '#8e44ad' : '#6a6a8a'}
          emissive={bossActive ? '#4a1a5a' : '#000000'}
          emissiveIntensity={bossActive ? 0.5 : 0}
        />
      </mesh>

      {/* Decorative pillars around edge */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i / 8) * Math.PI * 2;
        const px = Math.cos(angle) * size * 0.65;
        const pz = Math.sin(angle) * size * 0.65;
        return (
          <group key={i} position={[px, 0, pz]}>
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.2, 1, 6]} />
              <meshStandardMaterial color="#5a5a7a" />
            </mesh>
            <mesh position={[0, 1.1, 0]}>
              <sphereGeometry args={[0.12, 8, 8]} />
              <meshStandardMaterial
                color={bossActive ? '#aa55dd' : '#7777aa'}
                emissive={bossActive ? '#5500aa' : '#333355'}
                emissiveIntensity={0.5}
              />
            </mesh>
          </group>
        );
      })}

      {/* Glow when boss active */}
      {bossActive && (
        <pointLight position={[0, 1, 0]} color="#8e44ad" intensity={5} distance={8} />
      )}

      {/* Label */}
      <Text
        position={[0, 1.0, 0]}
        fontSize={0.4}
        color={bossActive ? '#ff4444' : '#aaaacc'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {bossActive ? '⚔️ BOSS' : '중앙'}
      </Text>
    </group>
  );
}

// ===== MOB 3D MODEL =====
function Mob3D({ mob }: { mob: MobInstance }) {
  const meshRef = useRef<THREE.Group>(null);
  const config = defaultGameConfig;
  const platformSize = config.zoneSize * SCALE * 4;
  const centerOffset = platformSize * 0.7;

  const zone = mob.zone;
  if (zone === 'center') return null;
  const playerZone = zone as PlayerZone;

  const offset = ZONE_OFFSETS[playerZone];
  const zoneX = offset.x * centerOffset;
  const zoneZ = offset.z * centerOffset;

  // Square path at the very edge of platform (matching ZonePlatform)
  const pathOffset = platformSize * 0.5 - platformSize * 0.06; // Path at edge
  const progress = mob.pathProgress % 1;
  const side = Math.floor(progress * 4);
  const sideProgress = (progress * 4) % 1;

  let localX = 0, localZ = 0;
  switch (side) {
    case 0: // Top edge (north): left to right
      localX = -pathOffset + sideProgress * pathOffset * 2;
      localZ = -pathOffset;
      break;
    case 1: // Right edge (east): top to bottom
      localX = pathOffset;
      localZ = -pathOffset + sideProgress * pathOffset * 2;
      break;
    case 2: // Bottom edge (south): right to left
      localX = pathOffset - sideProgress * pathOffset * 2;
      localZ = pathOffset;
      break;
    case 3: // Left edge (west): bottom to top
      localX = -pathOffset;
      localZ = pathOffset - sideProgress * pathOffset * 2;
      break;
  }

  const x = zoneX + localX;
  const z = zoneZ + localZ;

  const hpPercent = mob.currentStats.hp / mob.currentStats.maxHp;

  useFrame(() => {
    if (meshRef.current) {
      // Face movement direction
      let rotationY = 0;
      switch (side) {
        case 0: rotationY = Math.PI / 2; break;  // Moving right
        case 1: rotationY = 0; break;            // Moving down
        case 2: rotationY = -Math.PI / 2; break; // Moving left
        case 3: rotationY = Math.PI; break;      // Moving up
      }
      meshRef.current.rotation.y = rotationY;
    }
  });

  // Simple mob visual - placeholder for future GLB implementation
  const mobScale = mob.mob.type === 'boss' ? 1.5 : mob.mob.type === 'elite' ? 1.2 : 1.0;

  return (
    <group ref={meshRef} position={[x, 0.1, z]}>
      {/* Simple capsule placeholder */}
      <mesh castShadow position={[0, 0.4 * mobScale, 0]}>
        <capsuleGeometry args={[0.25 * mobScale, 0.5 * mobScale, 8, 16]} />
        <meshStandardMaterial color="#e74c3c" roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 0.9 * mobScale, 0]}>
        <sphereGeometry args={[0.2 * mobScale, 16, 16]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>

      {/* HP bar */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.8, 0.12, 0.04]} />
        <meshBasicMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.4 * (1 - hpPercent), 1.2, 0.03]}>
        <boxGeometry args={[0.8 * hpPercent, 0.1, 0.04]} />
        <meshBasicMaterial color="#e74c3c" />
      </mesh>
    </group>
  );
}

// ===== UNIT 3D MODEL =====
function Unit3D({
  unit,
  isSelected,
  onClick,
  targetPosition
}: {
  unit: CharacterInstance;
  isSelected: boolean;
  onClick: () => void;
  targetPosition: { x: number; y: number } | null;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [currentPos, setCurrentPos] = useState({ x: unit.position.x, y: unit.position.y });
  const config = defaultGameConfig;
  const platformSize = config.zoneSize * SCALE * 4;
  const centerOffset = platformSize * 0.7;

  useFrame((state, delta) => {
    if (targetPosition && isSelected) {
      const dx = targetPosition.x - currentPos.x;
      const dy = targetPosition.y - currentPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const speed = 200;
        const moveX = (dx / dist) * speed * delta;
        const moveY = (dy / dist) * speed * delta;

        // Update current position state
        const newX = currentPos.x + moveX;
        const newY = currentPos.y + moveY;
        setCurrentPos({ x: newX, y: newY });

        // Update unit position in GameCore
        unit.position.x = newX;
        unit.position.y = newY;

        // Convert to world position and update mesh directly
        const newWorldPos = gameToWorld(newX, newY);
        if (meshRef.current) {
          meshRef.current.position.set(newWorldPos.x, 0.2, newWorldPos.z);
          meshRef.current.rotation.y = Math.atan2(dx, dy);
        }
      }
    } else {
      setCurrentPos({ x: unit.position.x, y: unit.position.y });
    }

    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.05;
      meshRef.current.scale.setScalar(isSelected ? pulse : 1);
    }
  });

  const gameToWorld = (gx: number, gy: number) => {
    const zones = Object.entries(ZONE_OFFSETS);
    let closestZone: PlayerZone = 'topLeft';
    let minDist = Infinity;

    for (const [z] of zones) {
      const zoneCenter = getZoneCenter(z as PlayerZone, config.mapWidth, config.mapHeight);
      const d = Math.sqrt(Math.pow(gx - zoneCenter.x, 2) + Math.pow(gy - zoneCenter.y, 2));
      if (d < minDist) {
        minDist = d;
        closestZone = z as PlayerZone;
      }
    }

    const zoneCenter = getZoneCenter(closestZone, config.mapWidth, config.mapHeight);
    const zoneOffset = ZONE_OFFSETS[closestZone];

    // Convert game coordinates (pixels) to 3D world coordinates
    // Game coordinates are relative to zone center, scale them to match platform size
    const localX = (gx - zoneCenter.x) * SCALE;
    const localZ = (gy - zoneCenter.y) * SCALE;

    const result = {
      x: zoneOffset.x * centerOffset + localX,
      z: zoneOffset.z * centerOffset + localZ,
    };

    return result;
  };

  const worldPos = gameToWorld(currentPos.x, currentPos.y);
  const partyColor = unit.character.party === 'kuk' ? '#3498db' : '#f39c12';
  const rarityScale = unit.character.rarity === 'mythic' ? 1.8 : unit.character.rarity === 'legendary' ? 1.5 : 1.2;

  return (
    <group
      ref={meshRef}
      position={[worldPos.x, 0.2, worldPos.z]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.5 * rarityScale, 0.65 * rarityScale, 32]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.7} />
        </mesh>
      )}

      {/* Simple character placeholder - future GLB implementation */}
      <group>
        {/* Body */}
        <mesh position={[0, 0.5 * rarityScale, 0]} castShadow>
          <capsuleGeometry args={[0.16 * rarityScale, 0.4 * rarityScale, 8, 16]} />
          <meshStandardMaterial color={partyColor} roughness={0.5} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.0 * rarityScale, 0]} castShadow>
          <sphereGeometry args={[0.14 * rarityScale, 16, 16]} />
          <meshStandardMaterial color="#ffeaa7" />
        </mesh>
      </group>

      <Html position={[0, 1.6 * rarityScale, 0]} center>
        <div style={{
          background: isSelected ? 'rgba(0,255,0,0.9)' : 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          border: isSelected ? '2px solid #00ff00' : 'none',
        }}>
          {unit.character.name}
        </div>
      </Html>
    </group>
  );
}

// ===== BOSS 3D MODEL =====
function Boss3D({ boss }: { boss: MobInstance }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  const hpPercent = boss.currentStats.hp / boss.currentStats.maxHp;

  return (
    <group position={[0, 0.6, 0]}>
      <mesh ref={meshRef} position={[0, 1.2, 0]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#8e44ad"
          roughness={0.3}
          metalness={0.5}
          emissive="#4a235a"
          emissiveIntensity={0.4}
        />
      </mesh>

      <mesh position={[0, 2.6, 0]}>
        <coneGeometry args={[0.4, 0.8, 5]} />
        <meshStandardMaterial color="#f1c40f" metalness={0.8} />
      </mesh>

      {[-0.4, 0.4].map((xOff, i) => (
        <mesh key={i} position={[xOff, 1.4, 0.8]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      ))}

      <mesh position={[0, 3.6, 0]}>
        <boxGeometry args={[2, 0.2, 0.06]} />
        <meshBasicMaterial color="#333333" />
      </mesh>
      <mesh position={[-1 * (1 - hpPercent), 3.6, 0.04]}>
        <boxGeometry args={[2 * hpPercent, 0.16, 0.06]} />
        <meshBasicMaterial color="#8e44ad" />
      </mesh>

      <pointLight position={[0, 1.2, 0]} color="#8e44ad" intensity={6} distance={5} />
    </group>
  );
}

// ===== CAMERA CONTROLLER =====
function CameraController({
  cameraMode,
  focusedZone,
}: {
  cameraMode: 'free' | 'top' | 'default' | 'zone';
  focusedZone: PlayerZone | null;
}) {
  const { camera } = useThree();
  const config = defaultGameConfig;
  const platformSize = config.zoneSize * SCALE * 4;
  const centerOffset = platformSize * 0.7;
  const viewDistance = platformSize * 1.5;

  useEffect(() => {
    if (cameraMode === 'top') {
      camera.position.set(0, viewDistance * 2, 0.1);
      camera.lookAt(0, 0, 0);
    } else if (cameraMode === 'default') {
      camera.position.set(0, viewDistance * 1.2, viewDistance * 1.5);
      camera.lookAt(0, 0, 0);
    } else if (cameraMode === 'zone' && focusedZone) {
      // Focus on specific zone - same angle as default view but zoomed in
      const offset = ZONE_OFFSETS[focusedZone];
      const zoneX = offset.x * centerOffset;
      const zoneZ = offset.z * centerOffset;

      // Use same camera angle ratio as default view (y:z = 1.2:1.5)
      // but positioned to look at the specific zone
      const zoomDistance = platformSize * 0.7;
      camera.position.set(
        zoneX,                        // Centered on zone X
        zoomDistance * 1.2,           // Same height ratio as default
        zoneZ + zoomDistance * 1.5    // Same angle ratio as default
      );
      camera.lookAt(zoneX, 0, zoneZ);
    }
  }, [cameraMode, focusedZone, camera, centerOffset, viewDistance, platformSize]);

  return null;
}

// ===== MAIN 3D GAME SCENE =====
interface Game3DSceneProps {
  onBackToLobby: () => void;
}

export function Game3DScene({ onBackToLobby }: Game3DSceneProps) {
  const gameCoreRef = useRef<GameCore | null>(null);
  const [gameState, setGameState] = useState<ReturnType<GameCore['getState']> | null>(null);
  const [cameraMode, setCameraMode] = useState<'free' | 'top' | 'default' | 'zone'>('default');
  const [focusedZone, setFocusedZone] = useState<PlayerZone | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [moveTarget, setMoveTarget] = useState<{ x: number; y: number } | null>(null);
  const orbitControlsRef = useRef<any>(null);

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);

  // Keyboard hotkeys for zone switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const zoneMap: Record<string, PlayerZone> = {
        '1': 'topLeft',
        '2': 'topRight',
        '3': 'bottomLeft',
        '4': 'bottomRight',
      };

      if (zoneMap[e.key]) {
        setFocusedZone(zoneMap[e.key]);
        setCameraMode('zone');
      } else if (e.key === '0' || e.key === 'Escape') {
        // Reset to default view
        setFocusedZone(null);
        setCameraMode('default');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const gameCore = new GameCore('player1', defaultGameConfig);
    gameCoreRef.current = gameCore;

    const updateState = () => setGameState({ ...gameCore.getState() });

    gameCore.on('goldChanged', updateState);
    gameCore.on('roll', updateState);
    gameCore.on('waveStart', updateState);
    gameCore.on('mobSpawn', updateState);
    gameCore.on('mobKilled', updateState);
    gameCore.on('statueDamaged', updateState);
    gameCore.on('bossSpawn', updateState);
    gameCore.on('bossKilled', updateState);
    gameCore.on('gameEnd', updateState);

    gameCore.startGame();
    updateState();

    let lastTime = performance.now();
    let animationId: number;

    function gameLoop() {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;
      gameCore.update(delta);
      updateState();
      animationId = requestAnimationFrame(gameLoop);
    }

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleRoll = useCallback(() => {
    const player = gameCoreRef.current?.getLocalPlayer();
    if (player && gameCoreRef.current?.canRoll(player.playerId)) {
      gameCoreRef.current.roll(player.playerId);
    }
  }, []);

  const handleStartWave = useCallback(() => {
    if (gameState && !gameState.waveInProgress) {
      gameCoreRef.current?.startNextWave();
    }
  }, [gameState]);

  const handleUnitSelect = useCallback((unitId: string, addToSelection = false) => {
    if (addToSelection) {
      setSelectedUnitIds(prev =>
        prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
      );
    } else {
      setSelectedUnitIds([unitId]);
    }
    setMoveTarget(null);
  }, []);

  const handleRightClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (selectedUnitIds.length === 0) return;
    e.stopPropagation();

    const player = gameCoreRef.current?.getLocalPlayer();
    if (!player) return;

    const point = e.point;
    const config = defaultGameConfig;
    const platformSize = config.zoneSize * SCALE * 4;
    const centerOffset = platformSize * 0.7;

    const zoneCenter = getZoneCenter(player.zone, config.mapWidth, config.mapHeight);
    const offset = ZONE_OFFSETS[player.zone];

    const localX = point.x - offset.x * centerOffset;
    const localZ = point.z - offset.z * centerOffset;

    // Clamp to platform boundaries
    const halfPlatform = platformSize * 0.45;
    const clampedLocalX = Math.max(-halfPlatform, Math.min(halfPlatform, localX));
    const clampedLocalZ = Math.max(-halfPlatform, Math.min(halfPlatform, localZ));

    const gameX = zoneCenter.x + clampedLocalX / (SCALE * 4);
    const gameY = zoneCenter.y + clampedLocalZ / (SCALE * 4);

    setMoveTarget({ x: gameX, y: gameY });
  }, [selectedUnitIds]);

  const handleResetView = useCallback(() => {
    setCameraMode('default');
    setFocusedZone(null);
    if (orbitControlsRef.current) {
      orbitControlsRef.current.reset();
    }
  }, []);

  // Drag selection handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragEnd({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setDragEnd({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && isDragging && dragStart && dragEnd) {
      // If it was just a click (not drag), clear selection
      const dragDist = Math.sqrt(
        Math.pow(dragEnd.x - dragStart.x, 2) + Math.pow(dragEnd.y - dragStart.y, 2)
      );

      if (dragDist < 10) {
        // Just a click - clear selection unless clicking on a unit
        setSelectedUnitIds([]);
      }
      // Selection box logic would be handled in 3D space

      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  }, [isDragging, dragStart, dragEnd]);

  const player = gameState?.players.find(p => p.playerId === gameState.localPlayerId);
  const config = defaultGameConfig;
  const platformSize = config.zoneSize * SCALE * 4;
  const viewDistance = platformSize * 3;

  return (
    <div
      style={{ width: '100vw', height: '100vh', position: 'relative' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Canvas
        shadows
        onContextMenu={(e) => e.preventDefault()}
      >
        <CameraController cameraMode={cameraMode} focusedZone={focusedZone} />
        <PerspectiveCamera
          makeDefault
          position={[0, viewDistance * 0.8, viewDistance * 1.0]}
          fov={50}
        />
        <OrbitControls
          ref={orbitControlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={4}
          maxDistance={viewDistance * 3}
          maxPolarAngle={Math.PI / 2.1}
          mouseButtons={{
            LEFT: undefined,           // Left click for unit selection
            MIDDLE: THREE.MOUSE.ROTATE, // Middle click (wheel click) for rotation
            RIGHT: undefined,           // Right click for movement
          }}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[20, 40, 20]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={4096}
          shadow-mapSize-height={4096}
          shadow-camera-far={150}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        <pointLight position={[-20, 20, -20]} intensity={0.5} color="#6a9ad9" />

        {/* Sky */}
        <Sky sunPosition={[100, 30, 100]} turbidity={8} rayleigh={0.4} />
        <Stars radius={200} depth={100} count={3000} factor={4} />

        {/* Animated Water */}
        <WaterPlane />

        {/* Player Zone Platforms */}
        {ZONES.map((zone) => {
          const zonePlayer = gameState?.players.find(p => p.zone === zone);
          return (
            <ZonePlatform
              key={zone}
              zone={zone}
              statueHp={zonePlayer?.statue.hp ?? config.statueMaxHp}
              maxHp={config.statueMaxHp}
            />
          );
        })}

        {/* Bridges */}
        {ZONES.map((zone) => (
          <Bridge key={`bridge-${zone}`} zone={zone} />
        ))}

        {/* Central Boss Area */}
        <CentralArea bossActive={gameState?.bossActive ?? false} />

        {/* Clickable plane for right-click movement */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.05, 0]}
          onPointerDown={(e) => {
            if (e.button === 2) handleRightClick(e);
          }}
        >
          <planeGeometry args={[80, 80]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>

        {/* Units */}
        {player?.inventory.characters.filter(c => c.isDeployed).map((unit) => (
          <Unit3D
            key={unit.instanceId}
            unit={unit}
            isSelected={selectedUnitIds.includes(unit.instanceId)}
            onClick={() => handleUnitSelect(unit.instanceId)}
            targetPosition={selectedUnitIds.includes(unit.instanceId) ? moveTarget : null}
          />
        ))}

        {/* Mobs */}
        {gameState?.activeMobs.map((mob) => {
          if (mob.zone === 'center') return null;
          return (
            <Mob3D
              key={mob.instanceId}
              mob={mob}
            />
          );
        })}

        {/* Boss */}
        {gameState?.centralBoss && <Boss3D boss={gameState.centralBoss} />}
      </Canvas>

      {/* UI Overlay - Top Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 80%, transparent 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button onClick={onBackToLobby} style={btnStyle('#2ecc71')}>← 로비로</button>
          <span style={{ color: '#f1c40f', fontSize: '18px', fontWeight: 'bold' }}>💰 {player?.inventory.gold ?? 0}</span>
          <span style={{ color: '#2ecc71', fontSize: '18px' }}>🏛️ {player?.statue.hp ?? 0}/{config.statueMaxHp}</span>
          <span style={{ color: '#3498db', fontSize: '18px' }}>🌊 Wave {gameState?.currentWave ?? 0}/{config.totalWaves}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleStartWave}
            disabled={gameState?.waveInProgress}
            style={btnStyle(gameState?.waveInProgress ? '#555' : '#e74c3c')}
          >
            ▶️ 웨이브 시작
          </button>
          <button onClick={handleRoll} style={btnStyle('#2ecc71')}>
            🎲 뽑기 (10g)
          </button>
        </div>
      </div>

      {/* Camera Controls */}
      <div style={{
        position: 'absolute',
        top: '70px',
        right: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
      }}>
        <button onClick={handleResetView} style={btnStyle('#e67e22', true)}>
          🏠 기본 뷰
        </button>
        <button
          onClick={() => setCameraMode('top')}
          style={btnStyle(cameraMode === 'top' ? '#3498db' : '#555', true)}
        >
          ⬆️ 탑다운
        </button>
        <button
          onClick={() => setCameraMode('free')}
          style={btnStyle(cameraMode === 'free' ? '#3498db' : '#555', true)}
        >
          🔄 자유
        </button>
      </div>

      {/* Boss Wave Alert */}
      {gameState?.bossActive && (
        <div style={{
          position: 'absolute',
          top: '65px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(142, 68, 173, 0.95)',
          padding: '12px 40px',
          borderRadius: '8px',
          color: 'white',
          fontSize: '20px',
          fontWeight: 'bold',
          animation: 'pulse 1s infinite',
          boxShadow: '0 0 20px rgba(142, 68, 173, 0.5)',
        }}>
          ⚠️ BOSS WAVE! - 중앙으로 이동하세요! ⚠️
        </div>
      )}

      {/* Bottom Panel */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '15px 20px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 80%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ color: '#bdc3c7', fontSize: '13px', marginBottom: '8px' }}>
              배치된 유닛: {player?.inventory.characters.filter(c => c.isDeployed).length ?? 0}
              {selectedUnitIds.length > 0 && ` (선택: ${selectedUnitIds.length})`}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {player?.inventory.characters.filter(c => c.isDeployed).map((char) => (
                <div
                  key={char.instanceId}
                  onClick={() => handleUnitSelect(char.instanceId)}
                  style={{
                    padding: '5px 10px',
                    background: selectedUnitIds.includes(char.instanceId) ? '#27ae60' : char.character.party === 'kuk' ? '#3498db' : '#f39c12',
                    borderRadius: '5px',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer',
                    border: selectedUnitIds.includes(char.instanceId) ? '2px solid #2ecc71' : '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {char.character.party === 'kuk' ? '🔵' : '🟠'} {char.character.name}
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ color: selectedUnitIds.length > 0 ? '#2ecc71' : '#888', fontSize: '13px', marginBottom: '4px' }}>
              {selectedUnitIds.length > 0 ? `✅ ${selectedUnitIds.length}개 유닛 선택됨 - 우클릭으로 이동` : '유닛을 클릭하여 선택'}
            </div>
            <div style={{ color: '#666', fontSize: '11px' }}>
              휠 드래그: 회전 | 휠 스크롤: 줌 | 우클릭: 유닛 이동 | 1-4: 진영 뷰 | 0/ESC: 전체 뷰
            </div>
          </div>
        </div>
      </div>

      {/* Drag Selection Box */}
      {isDragging && dragStart && dragEnd && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(dragStart.x, dragEnd.x),
            top: Math.min(dragStart.y, dragEnd.y),
            width: Math.abs(dragEnd.x - dragStart.x),
            height: Math.abs(dragEnd.y - dragStart.y),
            border: '2px solid #2ecc71',
            background: 'rgba(46, 204, 113, 0.2)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Zone Focus Indicator */}
      {focusedZone && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(52, 152, 219, 0.9)',
          padding: '8px 20px',
          borderRadius: '5px',
          color: 'white',
          fontSize: '14px',
        }}>
          🎯 {focusedZone === 'topLeft' ? 'P1' : focusedZone === 'topRight' ? 'P2' : focusedZone === 'bottomLeft' ? 'P3' : 'P4'} 진영 뷰 (0 또는 ESC로 복귀)
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.8; transform: translateX(-50%) scale(1.02); }
        }
      `}</style>
    </div>
  );
}

// Button style helper
const btnStyle = (bg: string, small = false): React.CSSProperties => ({
  padding: small ? '6px 12px' : '8px 16px',
  background: bg,
  border: 'none',
  borderRadius: '5px',
  color: 'white',
  cursor: bg === '#555' ? 'not-allowed' : 'pointer',
  fontSize: small ? '12px' : '14px',
  fontWeight: 'bold',
});

export default Game3DScene;
