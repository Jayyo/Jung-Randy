// ===== BUILDING TYPES =====

export type BuildingType = 'gacha' | 'upgrade' | 'quest';

export interface BuildingData {
  id: BuildingType;
  name: string;
  description: string;
  icon: string;
  glbPath: string;
}

export const BUILDINGS: Record<BuildingType, BuildingData> = {
  gacha: {
    id: 'gacha',
    name: '뽑기소',
    description: '랜덤 캐릭터를 뽑을 수 있습니다.',
    icon: '🎰',
    glbPath: '/assets/terrain/third_platform_national_assembly.glb',
  },
  upgrade: {
    id: 'upgrade',
    name: '강화소',
    description: '유닛을 업그레이드할 수 있습니다.',
    icon: '⬆️',
    glbPath: '/assets/terrain/third_platform_blue_house.glb',
  },
  quest: {
    id: 'quest',
    name: '퀘스트',
    description: '퀘스트를 확인하고 보상을 받을 수 있습니다.',
    icon: '📜',
    glbPath: '/assets/terrain/third_platform_gyeongbokgung_gate.glb',
  },
};

// Building order on the platform (left to right)
export const BUILDING_ORDER: BuildingType[] = ['gacha', 'upgrade', 'quest'];
