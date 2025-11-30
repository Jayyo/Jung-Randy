// ===== POLITICIAN DATA FOR COMBINATION SYSTEM =====
// Data loaded from JSON files for easy editing

import politiciansData from './politicians.json';
import recipesData from './recipes.json';

// ===== TYPE DEFINITIONS =====
export type Party = 'kuk' | 'min' | 'minor' | 'independent';
export type PoliticianTier = 'lv1' | 'lv2' | 'lv3';

export interface Politician {
  id: string;
  name: string;
  tier: PoliticianTier;
  party: Party;
  partyDetail?: string;
  terms?: number;
  committee?: string;
  role?: string;
  attack: number;
  defense: number;
  hp: number;
  description: string;
  modelPath: string;
  color: string;
  hasSkill: boolean;
  skillName?: string;
  skillDescription?: string;
}

export interface PoliticianRecipe {
  id: string;
  materials: string[];
  result: string | 'random_lv2';
  resultPool?: string[];
}

// ===== UI CONSTANTS =====
export const TIER_COLORS: Record<PoliticianTier, string> = {
  lv1: '#9ca3af',
  lv2: '#22c55e',
  lv3: '#3b82f6',
};

export const TIER_BG_COLORS: Record<PoliticianTier, string> = {
  lv1: '#374151',
  lv2: '#14532d',
  lv3: '#1e3a5f',
};

export const TIER_NAMES: Record<PoliticianTier, string> = {
  lv1: '기초 지지층',
  lv2: '일반 의원',
  lv3: '핵심 중진',
};

export const PARTY_COLORS: Record<Party, string> = {
  kuk: '#E61E2B',
  min: '#004EA2',
  minor: '#FFD700',
  independent: '#808080',
};

export const PARTY_NAMES: Record<Party, string> = {
  kuk: '국민의힘',
  min: '더불어민주당',
  minor: '군소정당',
  independent: '무소속',
};

const DUMMY_MODEL = '/assets/characters/stylized_base.glb';

// ===== LOAD POLITICIANS FROM JSON =====
function loadPoliticians(): Politician[] {
  const result: Politician[] = [];

  // Lv1
  for (const p of politiciansData.lv1) {
    result.push({
      ...p,
      tier: 'lv1' as PoliticianTier,
      party: p.party as Party,
      modelPath: p.modelPath || DUMMY_MODEL,
    });
  }

  // Lv2 - min
  for (const p of politiciansData.lv2.min) {
    result.push({
      ...p,
      tier: 'lv2' as PoliticianTier,
      party: 'min' as Party,
      modelPath: DUMMY_MODEL,
      description: p.description || '',
    });
  }

  // Lv2 - kuk
  for (const p of politiciansData.lv2.kuk) {
    result.push({
      ...p,
      tier: 'lv2' as PoliticianTier,
      party: 'kuk' as Party,
      modelPath: DUMMY_MODEL,
      description: p.description || '',
    });
  }

  // Lv3 - min
  for (const p of politiciansData.lv3.min) {
    result.push({
      ...p,
      tier: 'lv3' as PoliticianTier,
      party: 'min' as Party,
      modelPath: DUMMY_MODEL,
      description: p.description || '',
    });
  }

  // Lv3 - kuk
  for (const p of politiciansData.lv3.kuk) {
    result.push({
      ...p,
      tier: 'lv3' as PoliticianTier,
      party: 'kuk' as Party,
      modelPath: DUMMY_MODEL,
      description: p.description || '',
    });
  }

  // Lv3 - minor
  for (const p of politiciansData.lv3.minor) {
    result.push({
      ...p,
      tier: 'lv3' as PoliticianTier,
      party: 'minor' as Party,
      modelPath: DUMMY_MODEL,
      description: p.description || '',
    });
  }

  return result;
}

// ===== LOAD RECIPES FROM JSON =====
function loadRecipes(): PoliticianRecipe[] {
  const result: PoliticianRecipe[] = [];

  // Get Lv2 IDs by party for random pools
  const lv2KukIds = politiciansData.lv2.kuk.map(p => p.id);
  const lv2MinIds = politiciansData.lv2.min.map(p => p.id);
  const lv2AllIds = [...lv2KukIds, ...lv2MinIds];

  // Lv1 to Lv2 recipes
  for (const r of recipesData.lv1_to_lv2) {
    let pool: string[] | undefined;
    if (r.resultPool === 'kuk') pool = lv2KukIds;
    else if (r.resultPool === 'min') pool = lv2MinIds;
    else if (r.resultPool === 'all') pool = lv2AllIds;

    result.push({
      id: r.id,
      materials: r.materials,
      result: r.result,
      resultPool: pool,
    });
  }

  // Lv2 to Lv3 recipes
  for (const r of recipesData.lv2_to_lv3.min) {
    result.push({ id: r.id, materials: r.materials, result: r.result });
  }
  for (const r of recipesData.lv2_to_lv3.kuk) {
    result.push({ id: r.id, materials: r.materials, result: r.result });
  }
  for (const r of recipesData.lv2_to_lv3.minor) {
    result.push({ id: r.id, materials: r.materials, result: r.result });
  }

  return result;
}

// ===== EXPORTED DATA =====
export const ALL_POLITICIANS: Politician[] = loadPoliticians();
export const ALL_RECIPES: PoliticianRecipe[] = loadRecipes();

// Filtered lists for convenience
export const LV1_POLITICIANS = ALL_POLITICIANS.filter(p => p.tier === 'lv1');
export const LV2_POLITICIANS = ALL_POLITICIANS.filter(p => p.tier === 'lv2');
export const LV3_POLITICIANS = ALL_POLITICIANS.filter(p => p.tier === 'lv3');

// ===== HELPER FUNCTIONS =====
export function getPoliticianById(id: string): Politician | undefined {
  return ALL_POLITICIANS.find(p => p.id === id);
}

export function getPoliticiansByTier(tier: PoliticianTier): Politician[] {
  return ALL_POLITICIANS.filter(p => p.tier === tier);
}

export function getPoliticiansByParty(party: Party): Politician[] {
  return ALL_POLITICIANS.filter(p => p.party === party);
}

export function getRecipeByResult(resultId: string): PoliticianRecipe | undefined {
  return ALL_RECIPES.find(r => r.result === resultId);
}

export function getRecipesByMaterial(materialId: string): PoliticianRecipe[] {
  return ALL_RECIPES.filter(r => r.materials.includes(materialId));
}

export function findMatchingRecipe(materialIds: string[]): PoliticianRecipe | undefined {
  const sortedInput = [...materialIds].sort();

  return ALL_RECIPES.find(recipe => {
    const sortedRecipe = [...recipe.materials].sort();
    if (sortedInput.length !== sortedRecipe.length) return false;
    return sortedInput.every((id, index) => id === sortedRecipe[index]);
  });
}

export function executeCombination(materialIds: string[]): Politician | null {
  const recipe = findMatchingRecipe(materialIds);
  if (!recipe) return null;

  if (recipe.result === 'random_lv2' && recipe.resultPool) {
    const randomIndex = Math.floor(Math.random() * recipe.resultPool.length);
    const resultId = recipe.resultPool[randomIndex];
    return getPoliticianById(resultId) || null;
  }

  return getPoliticianById(recipe.result) || null;
}

// ===== COMBINATION UI TYPES =====
export interface CombinationOption {
  type: 'lv1_to_lv2_same' | 'lv1_to_lv2_cross' | 'lv2_to_lv3';
  label: string;
  description: string;
  requiredMaterials: { politicianId: string; count: number }[];
  resultDescription: string;
  resultPolitician?: Politician;
  isRandom: boolean;
}

export function getCombinationOptions(politicianId: string): CombinationOption[] {
  const politician = getPoliticianById(politicianId);
  if (!politician) return [];

  const options: CombinationOption[] = [];

  if (politician.tier === 'lv1') {
    if (politician.party === 'kuk') {
      options.push({
        type: 'lv1_to_lv2_same',
        label: '국힘 일반의원',
        description: '국힘 지지자 2명 → 랜덤 일반의원',
        requiredMaterials: [{ politicianId: 'L1_KH', count: 2 }],
        resultDescription: '랜덤 일반 의원',
        isRandom: true,
      });
      options.push({
        type: 'lv1_to_lv2_cross',
        label: '크로스 조합',
        description: '국힘 + 민주 지지자 → 랜덤 일반의원',
        requiredMaterials: [
          { politicianId: 'L1_KH', count: 1 },
          { politicianId: 'L1_DM', count: 1 },
        ],
        resultDescription: '랜덤 일반 의원',
        isRandom: true,
      });
    } else if (politician.party === 'min') {
      options.push({
        type: 'lv1_to_lv2_same',
        label: '민주 일반의원',
        description: '민주 지지자 2명 → 랜덤 일반의원',
        requiredMaterials: [{ politicianId: 'L1_DM', count: 2 }],
        resultDescription: '랜덤 일반 의원',
        isRandom: true,
      });
      options.push({
        type: 'lv1_to_lv2_cross',
        label: '크로스 조합',
        description: '민주 + 국힘 지지자 → 랜덤 일반의원',
        requiredMaterials: [
          { politicianId: 'L1_DM', count: 1 },
          { politicianId: 'L1_KH', count: 1 },
        ],
        resultDescription: '랜덤 일반 의원',
        isRandom: true,
      });
    }
  } else if (politician.tier === 'lv2') {
    const recipes = getRecipesByMaterial(politicianId);
    for (const recipe of recipes) {
      if (recipe.result === 'random_lv2') continue;

      const resultPolitician = getPoliticianById(recipe.result);
      if (!resultPolitician) continue;

      const materialCounts: Record<string, number> = {};
      for (const mat of recipe.materials) {
        materialCounts[mat] = (materialCounts[mat] || 0) + 1;
      }

      const requiredMaterials = Object.entries(materialCounts).map(([id, count]) => ({
        politicianId: id,
        count,
      }));

      const otherLv2 = recipe.materials.find(m => m !== politicianId && getPoliticianById(m)?.tier === 'lv2');
      const otherLv2Politician = otherLv2 ? getPoliticianById(otherLv2) : null;
      const lv1Material = recipe.materials.find(m => getPoliticianById(m)?.tier === 'lv1');
      const lv1Politician = lv1Material ? getPoliticianById(lv1Material) : null;

      options.push({
        type: 'lv2_to_lv3',
        label: resultPolitician.name,
        description: `${politician.name} + ${otherLv2Politician?.name || '?'} + ${lv1Politician?.name || '?'}`,
        requiredMaterials,
        resultDescription: resultPolitician.description,
        resultPolitician,
        isRandom: false,
      });
    }
  }

  return options;
}

export interface MaterialAvailability {
  politicianId: string;
  name: string;
  required: number;
  available: number;
  characterIds: string[];
}

export function checkMaterialAvailability(
  option: CombinationOption,
  characters: { id: string; politician?: { id: string } }[],
  excludeCharacterId?: string
): { canCombine: boolean; materials: MaterialAvailability[] } {
  const materials: MaterialAvailability[] = [];
  let canCombine = true;

  for (const req of option.requiredMaterials) {
    const politician = getPoliticianById(req.politicianId);
    const matchingChars = characters.filter(c =>
      c.politician?.id === req.politicianId &&
      c.id !== excludeCharacterId
    );

    const selectedIsSameMaterial = excludeCharacterId &&
      characters.find(c => c.id === excludeCharacterId)?.politician?.id === req.politicianId;

    const availableCount = selectedIsSameMaterial
      ? matchingChars.length + 1
      : matchingChars.length;

    const availability: MaterialAvailability = {
      politicianId: req.politicianId,
      name: politician?.name || req.politicianId,
      required: req.count,
      available: availableCount,
      characterIds: selectedIsSameMaterial
        ? [excludeCharacterId!, ...matchingChars.map(c => c.id)].slice(0, req.count)
        : matchingChars.map(c => c.id).slice(0, req.count),
    };

    materials.push(availability);

    if (availableCount < req.count) {
      canCombine = false;
    }
  }

  return { canCombine, materials };
}
