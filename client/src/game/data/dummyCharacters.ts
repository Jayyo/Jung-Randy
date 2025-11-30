// ===== DUMMY CHARACTERS FOR RECIPE SYSTEM =====
// Using stylized_base.glb with different colors for visual distinction

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface DummyCharacter {
  id: string;
  name: string;
  rarity: Rarity;
  color: string; // Tint color for the model
  attack: number;
  defense: number;
  hp: number;
  description: string;
}

export interface Recipe {
  id: string;
  materials: string[]; // character ids
  result: string; // resulting character id
}

// Rarity colors for UI
export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9ca3af',     // gray
  uncommon: '#22c55e',   // green
  rare: '#3b82f6',       // blue
  epic: '#a855f7',       // purple
  legendary: '#f59e0b',  // gold
};

// Rarity background colors (darker)
export const RARITY_BG_COLORS: Record<Rarity, string> = {
  common: '#374151',
  uncommon: '#14532d',
  rare: '#1e3a5f',
  epic: '#4c1d95',
  legendary: '#78350f',
};

// ===== DUMMY CHARACTERS =====
export const DUMMY_CHARACTERS: DummyCharacter[] = [
  // Common (5)
  {
    id: 'soldier_a',
    name: '병사 A',
    rarity: 'common',
    color: '#8B4513',
    attack: 10,
    defense: 5,
    hp: 50,
    description: '기본 병사. 아무런 특수 능력이 없다.',
  },
  {
    id: 'soldier_b',
    name: '병사 B',
    rarity: 'common',
    color: '#556B2F',
    attack: 8,
    defense: 7,
    hp: 60,
    description: '방어에 특화된 병사.',
  },
  {
    id: 'soldier_c',
    name: '병사 C',
    rarity: 'common',
    color: '#4682B4',
    attack: 12,
    defense: 3,
    hp: 45,
    description: '공격에 특화된 병사.',
  },
  {
    id: 'soldier_d',
    name: '병사 D',
    rarity: 'common',
    color: '#CD853F',
    attack: 9,
    defense: 6,
    hp: 55,
    description: '균형 잡힌 병사.',
  },
  {
    id: 'soldier_e',
    name: '병사 E',
    rarity: 'common',
    color: '#708090',
    attack: 11,
    defense: 4,
    hp: 48,
    description: '빠른 공격 속도의 병사.',
  },

  // Uncommon (4)
  {
    id: 'warrior_a',
    name: '전사 알파',
    rarity: 'uncommon',
    color: '#228B22',
    attack: 20,
    defense: 12,
    hp: 100,
    description: '두 병사의 힘이 합쳐진 전사.',
  },
  {
    id: 'warrior_b',
    name: '전사 베타',
    rarity: 'uncommon',
    color: '#2E8B57',
    attack: 18,
    defense: 15,
    hp: 120,
    description: '방어에 특화된 전사.',
  },
  {
    id: 'warrior_c',
    name: '전사 감마',
    rarity: 'uncommon',
    color: '#3CB371',
    attack: 25,
    defense: 8,
    hp: 80,
    description: '공격에 특화된 전사.',
  },
  {
    id: 'warrior_d',
    name: '전사 델타',
    rarity: 'uncommon',
    color: '#20B2AA',
    attack: 22,
    defense: 10,
    hp: 95,
    description: '균형 잡힌 전사.',
  },

  // Rare (3)
  {
    id: 'knight_a',
    name: '기사 아서',
    rarity: 'rare',
    color: '#4169E1',
    attack: 40,
    defense: 25,
    hp: 200,
    description: '두 전사의 힘이 합쳐진 기사.',
  },
  {
    id: 'knight_b',
    name: '기사 랜슬롯',
    rarity: 'rare',
    color: '#1E90FF',
    attack: 50,
    defense: 18,
    hp: 160,
    description: '공격에 특화된 기사.',
  },
  {
    id: 'knight_c',
    name: '기사 갈라하드',
    rarity: 'rare',
    color: '#00BFFF',
    attack: 35,
    defense: 35,
    hp: 250,
    description: '방어에 특화된 기사.',
  },

  // Epic (2)
  {
    id: 'champion_a',
    name: '챔피언 레오',
    rarity: 'epic',
    color: '#9932CC',
    attack: 80,
    defense: 50,
    hp: 400,
    description: '두 기사의 힘이 합쳐진 챔피언.',
  },
  {
    id: 'champion_b',
    name: '챔피언 아리아',
    rarity: 'epic',
    color: '#BA55D3',
    attack: 100,
    defense: 35,
    hp: 320,
    description: '파괴적인 공격력의 챔피언.',
  },

  // Legendary (1)
  {
    id: 'legend_hero',
    name: '전설의 영웅',
    rarity: 'legendary',
    color: '#FFD700',
    attack: 200,
    defense: 100,
    hp: 1000,
    description: '모든 챔피언의 힘이 합쳐진 전설의 영웅.',
  },
];

// ===== RECIPES =====
export const RECIPES: Recipe[] = [
  // Common → Uncommon
  { id: 'recipe_1', materials: ['soldier_a', 'soldier_b'], result: 'warrior_a' },
  { id: 'recipe_2', materials: ['soldier_c', 'soldier_d'], result: 'warrior_b' },
  { id: 'recipe_3', materials: ['soldier_a', 'soldier_c'], result: 'warrior_c' },
  { id: 'recipe_4', materials: ['soldier_b', 'soldier_e'], result: 'warrior_d' },

  // Uncommon → Rare
  { id: 'recipe_5', materials: ['warrior_a', 'warrior_b'], result: 'knight_a' },
  { id: 'recipe_6', materials: ['warrior_c', 'warrior_d'], result: 'knight_b' },
  { id: 'recipe_7', materials: ['warrior_a', 'warrior_d'], result: 'knight_c' },

  // Rare → Epic
  { id: 'recipe_8', materials: ['knight_a', 'knight_b'], result: 'champion_a' },
  { id: 'recipe_9', materials: ['knight_b', 'knight_c'], result: 'champion_b' },

  // Epic → Legendary
  { id: 'recipe_10', materials: ['champion_a', 'champion_b'], result: 'legend_hero' },
];

// Helper functions
export function getCharacterById(id: string): DummyCharacter | undefined {
  return DUMMY_CHARACTERS.find(c => c.id === id);
}

export function getRecipeByResult(resultId: string): Recipe | undefined {
  return RECIPES.find(r => r.result === resultId);
}

export function getRecipesByMaterial(materialId: string): Recipe[] {
  return RECIPES.filter(r => r.materials.includes(materialId));
}

export function getCharactersByRarity(rarity: Rarity): DummyCharacter[] {
  return DUMMY_CHARACTERS.filter(c => c.rarity === rarity);
}
