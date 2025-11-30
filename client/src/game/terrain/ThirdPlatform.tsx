// ===== THIRD PLATFORM (Separate isolated land with buildings) =====
import { PLATFORM_SIZE } from '../constants';
import { ClickableBuilding, BUILDING_ORDER, BuildingType } from '../buildings';

interface ThirdPlatformProps {
  position: [number, number, number];
  selectedBuilding: BuildingType | null;
  onBuildingSelect: (type: BuildingType) => void;
}

export function ThirdPlatform({ position, selectedBuilding, onBuildingSelect }: ThirdPlatformProps) {
  const height = PLATFORM_SIZE / 4; // Quarter of the vertical size
  const xOffset = PLATFORM_SIZE / 3; // Spacing between buildings

  // Building positions: left, center, right
  const buildingPositions: [number, number, number][] = [
    [-xOffset, 0.01, 0],
    [0, 0.01, 0],
    [xOffset, 0.01, 0],
  ];

  return (
    <group position={position}>
      {/* Base ground - simple gray plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[PLATFORM_SIZE, height]} />
        <meshStandardMaterial color="#4a4a5a" roughness={0.9} />
      </mesh>

      {/* Simple border */}
      <mesh position={[0, 0.05, -height / 2]} receiveShadow>
        <boxGeometry args={[PLATFORM_SIZE, 0.1, 0.2]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.05, height / 2]} receiveShadow>
        <boxGeometry args={[PLATFORM_SIZE, 0.1, 0.2]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.8} />
      </mesh>
      <mesh position={[-PLATFORM_SIZE / 2, 0.05, 0]} receiveShadow>
        <boxGeometry args={[0.2, 0.1, height]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.8} />
      </mesh>
      <mesh position={[PLATFORM_SIZE / 2, 0.05, 0]} receiveShadow>
        <boxGeometry args={[0.2, 0.1, height]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.8} />
      </mesh>

      {/* Clickable buildings */}
      {BUILDING_ORDER.map((buildingType, idx) => (
        <ClickableBuilding
          key={buildingType}
          type={buildingType}
          position={buildingPositions[idx]}
          onSelect={onBuildingSelect}
          isSelected={selectedBuilding === buildingType}
        />
      ))}
    </group>
  );
}
