// ===== CLICKABLE BUILDING COMPONENT =====
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingType, BUILDINGS } from './types';

interface ClickableBuildingProps {
  type: BuildingType;
  position: [number, number, number];
  onSelect: (type: BuildingType) => void;
  isSelected: boolean;
}

export function ClickableBuilding({ type, position, onSelect, isSelected }: ClickableBuildingProps) {
  const building = BUILDINGS[type];
  const { scene } = useGLTF(building.glbPath);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Apply shadow and store original materials
  useEffect(() => {
    cloned.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [cloned]);

  // Update materials based on hover/selected state
  useEffect(() => {
    cloned.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (isSelected) {
          mat.emissive = new THREE.Color(0x00ff00);
          mat.emissiveIntensity = 0.3;
        } else if (hovered) {
          mat.emissive = new THREE.Color(0xffff00);
          mat.emissiveIntensity = 0.2;
        } else {
          mat.emissive = new THREE.Color(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
    });
  }, [cloned, hovered, isSelected]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(type);
  };

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerLeave = () => {
    setHovered(false);
    document.body.style.cursor = 'default';
  };

  return (
    <group ref={groupRef} position={position}>
      <primitive
        object={cloned}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />

      {/* Selection indicator ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Building name label (shown on hover) */}
      {hovered && (
        <sprite position={[0, 2.5, 0]} scale={[2, 0.5, 1]}>
          <spriteMaterial
            transparent
            opacity={0.9}
            depthTest={false}
          />
        </sprite>
      )}
    </group>
  );
}

// Preload all building models
useGLTF.preload('/assets/terrain/third_platform_national_assembly.glb');
useGLTF.preload('/assets/terrain/third_platform_blue_house.glb');
useGLTF.preload('/assets/terrain/third_platform_gyeongbokgung_gate.glb');
