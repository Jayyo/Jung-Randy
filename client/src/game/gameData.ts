// ===== GAME DATA CONFIGURATION =====
// All unit and monster stats are defined here for easy balancing

// ===== CHARACTER TYPES =====
export interface CharacterStats {
  id: string;
  name: string;
  type: 1 | 2;
  maxHp: number;
  attack: number;
  defense: number;
  attackSpeed: number; // attacks per second
  attackRange: number;
  moveSpeed: number;
  skills: {
    passive: PassiveSkill | null;
    active: ActiveSkill | null;
  };
  profileImage: string; // path to profile image
}

export interface PassiveSkill {
  id: string;
  name: string;
  description: string;
  triggerChance: number; // 0-1, probability to trigger during normal attack
  damageMultiplier: number; // multiplier applied to normal attack damage
  animationPath: string; // FBX animation file
}

export interface ActiveSkill {
  id: string;
  name: string;
  description: string;
  cooldown: number; // milliseconds
  damageMultiplier: number;
  range: number; // skill range
  isAoE?: boolean; // Area of Effect - hits all monsters in range
  animationPath: string; // FBX animation file
  manaCost?: number;
}

// Character type 1 (smaller, faster)
export const CHARACTER_1_STATS: CharacterStats = {
  id: 'char1',
  name: 'Fighter A',
  type: 1,
  maxHp: 100,
  attack: 11, // Reduced by 30% (15 * 0.7 = 10.5, rounded to 11)
  defense: 5,
  attackSpeed: 1.2, // 1.2 attacks per second
  attackRange: 2.5,
  moveSpeed: 2.5,
  skills: {
    passive: {
      id: 'chapa',
      name: 'Chapa Strike',
      description: 'Chance to deal extra damage with a special strike',
      triggerChance: 0.2, // 20% chance
      damageMultiplier: 1.8,
      animationPath: '/assets/1_Chapa 2_passive.fbx',
    },
    active: {
      id: 'flying_kick',
      name: 'Flying Kick',
      description: 'Powerful flying kick attack',
      cooldown: 8000, // 8 seconds
      damageMultiplier: 3.0,
      range: 5.0, // skill range
      animationPath: '/assets/1_Flying Kick_active.fbx',
    },
  },
  profileImage: '/assets/profiles/char1.png',
};

// Character type 2 (larger, stronger)
export const CHARACTER_2_STATS: CharacterStats = {
  id: 'char2',
  name: 'Fighter B',
  type: 2,
  maxHp: 150,
  attack: 14, // Reduced by 30% (20 * 0.7 = 14)
  defense: 8,
  attackSpeed: 0.9, // slower but harder hitting
  attackRange: 2.5,
  moveSpeed: 2.0,
  skills: {
    passive: null, // no passive skill yet
    active: {
      id: 'jump_attack',
      name: 'Jump Attack',
      description: 'Leap and slam down on all nearby enemies',
      cooldown: 10000, // 10 seconds
      damageMultiplier: 2.5, // reduced from 3.5 for AoE balance
      range: 6.0, // skill range (slightly longer for jump)
      isAoE: true, // hits all monsters in range
      animationPath: '/assets/2_Jump Attack_active.fbx',
    },
  },
  profileImage: '/assets/profiles/char2.png',
};

export function getCharacterStats(type: 1 | 2): CharacterStats {
  return type === 1 ? CHARACTER_1_STATS : CHARACTER_2_STATS;
}

// ===== MONSTER TYPES =====
export interface MonsterStats {
  baseHp: number;
  baseDamage: number;
  baseDefense: number;
  moveSpeed: number;
  hpPerWave: number; // HP increase per wave
  sizeMultiplierPerWave: number; // size increase per wave (for visual distinction)
}

export const MONSTER_BASE_STATS: MonsterStats = {
  baseHp: 75,
  baseDamage: 5,
  baseDefense: 2,
  moveSpeed: 0.07,
  hpPerWave: 12,
  sizeMultiplierPerWave: 0.06,
};

// ===== ROUND SCALING CONFIGURATION =====
export interface RoundScalingConfig {
  // HP scaling: can be linear or exponential
  hpScalingType: 'linear' | 'exponential';
  hpLinearMultiplier: number; // for linear: baseHp + (wave - 1) * multiplier
  hpExponentialBase: number; // for exponential: baseHp * (base ^ (wave - 1))
  hpPostExponentialBase?: number; // optional softer base after a soft cap
  hpSoftCapWave?: number; // wave after which growth eases
  bossHpMultiplier?: number; // extra multiplier for world bosses
  worldBossHpMultiplier?: number; // extra multiplier for world boss on platform
  
  // Damage scaling
  damageScalingType: 'linear' | 'exponential';
  damageLinearMultiplier: number;
  damageExponentialBase: number;
  
  // Defense scaling
  defenseScalingType: 'linear' | 'exponential';
  defenseLinearMultiplier: number;
  defenseExponentialBase: number;
  defensePostExponentialBase?: number;
  defenseSoftCapWave?: number;
  bossDefenseMultiplier?: number;
  worldBossDefenseMultiplier?: number;
  
  // Size scaling (always linear for visual consistency)
  sizeMultiplierPerWave: number;
}

export const ROUND_SCALING_CONFIG: RoundScalingConfig = {
  // HP: Hybrid exponential with softer slope after wave 30
  hpScalingType: 'exponential',
  hpLinearMultiplier: 12,
  hpExponentialBase: 1.22,
  hpPostExponentialBase: 1.1,
  hpSoftCapWave: 30,
  bossHpMultiplier: 10,
  worldBossHpMultiplier: 15,
  
  // Damage: Not used (monsters don't attack), but kept for compatibility
  damageScalingType: 'linear',
  damageLinearMultiplier: 0, // Not used
  damageExponentialBase: 1.0, // Not used
  
  // Defense: Hybrid exponential with softer slope after wave 30
  defenseScalingType: 'exponential',
  defenseLinearMultiplier: 0.8,
  defenseExponentialBase: 1.18,
  defensePostExponentialBase: 1.08,
  defenseSoftCapWave: 30,
  bossDefenseMultiplier: 5,
  worldBossDefenseMultiplier: 7,
  
  // Size: Always linear (visual only)
  sizeMultiplierPerWave: 0.04, // +4% size per wave
};

/**
 * Check if a wave is a boss wave (every 10th wave)
 */
export function isBossWave(wave: number): boolean {
  return wave % 10 === 0;
}

/**
 * Get monster stats for a specific wave
 * If it's a boss wave, returns boss stats (10x HP, 5x Defense, 2x Size)
 */
export function getMonsterStatsForWave(wave: number): {
  hp: number;
  damage: number;
  defense: number;
  sizeMultiplier: number;
} {
  const { baseHp, baseDefense } = MONSTER_BASE_STATS;
  const scaling = ROUND_SCALING_CONFIG;
  const isBoss = isBossWave(wave);
  
  // For boss waves, calculate stats based on previous wave
  const referenceWave = isBoss ? wave - 1 : wave;
  
  // Calculate HP based on scaling type
  let hp: number;
  if (scaling.hpScalingType === 'exponential') {
    const totalWaves = Math.max(0, referenceWave - 1);
    const softCapWave = scaling.hpSoftCapWave ?? referenceWave;
    const primaryWaves = Math.min(totalWaves, Math.max(0, softCapWave - 1));
    const postWaves = Math.max(0, totalWaves - primaryWaves);
    const postBase = scaling.hpPostExponentialBase ?? scaling.hpExponentialBase;
    hp = Math.floor(
      baseHp *
      Math.pow(scaling.hpExponentialBase, primaryWaves) *
      Math.pow(postBase, postWaves)
    );
  } else {
    hp = baseHp + (referenceWave - 1) * scaling.hpLinearMultiplier;
  }
  
  // Boss: 10x HP
  if (isBoss) {
    hp = hp * (scaling.bossHpMultiplier ?? 10);
  }
  
  // Calculate Damage - not used (monsters don't attack), but kept for type compatibility
  const damage = 0; // Monsters don't attack in this game
  
  // Calculate Defense based on scaling type
  let defense: number;
  if (scaling.defenseScalingType === 'exponential') {
    const totalWaves = Math.max(0, referenceWave - 1);
    const softCapWave = scaling.defenseSoftCapWave ?? referenceWave;
    const primaryWaves = Math.min(totalWaves, Math.max(0, softCapWave - 1));
    const postWaves = Math.max(0, totalWaves - primaryWaves);
    const postBase = scaling.defensePostExponentialBase ?? scaling.defenseExponentialBase;
    defense = Math.floor(
      baseDefense *
      Math.pow(scaling.defenseExponentialBase, primaryWaves) *
      Math.pow(postBase, postWaves)
    );
  } else {
    defense = baseDefense + Math.floor((referenceWave - 1) * scaling.defenseLinearMultiplier);
  }
  
  // Boss: 5x Defense
  if (isBoss) {
    defense = defense * (scaling.bossDefenseMultiplier ?? 5);
  }
  
  // Size is always linear
  let sizeMultiplier = 1 + (referenceWave - 1) * scaling.sizeMultiplierPerWave;
  
  // Boss: 2x Size
  if (isBoss) {
    sizeMultiplier = sizeMultiplier * 2;
  }
  
  return {
    hp,
    damage,
    defense,
    sizeMultiplier,
  };
}

// ===== WAVE CONFIGURATION =====
export interface WaveConfig {
  totalWaves: number;
  baseMonstersPerWave: number; // Starting number of monsters
  monstersPerWaveScaling: 'linear' | 'exponential' | 'fixed'; // How monsters increase per wave
  monstersPerWaveLinearIncrease: number; // For linear: base + (wave - 1) * increase
  monstersPerWaveExponentialBase: number; // For exponential: base * (base ^ (wave - 1))
  spawnInterval: number; // ms between monster spawns
  spawnIntervalScaling: 'fixed' | 'decreasing'; // Can decrease spawn interval for faster waves
  spawnIntervalDecreasePerWave: number; // ms decrease per wave
  waveDelay: number; // ms before next wave starts after current wave ends
}

export const WAVE_SPAWN_DURATION_MS = 90_000; // Spawn window per wave (1m 30s)
export const WAVE_TOTAL_DURATION_MS = 120_000; // Full wave length (2 minutes)
export const MAX_ACTIVE_MONSTERS = 120; // Lose if more than this are alive

export const WAVE_CONFIG: WaveConfig = {
  totalWaves: 50, // 50 rounds for extended gameplay
  baseMonstersPerWave: 24, // lighter start
  monstersPerWaveScaling: 'linear',
  monstersPerWaveLinearIncrease: 1,
  monstersPerWaveExponentialBase: 1.0,
  spawnInterval: 2600, // faster pace
  spawnIntervalScaling: 'decreasing',
  spawnIntervalDecreasePerWave: 40,
  waveDelay: 30_000, // Rest window after spawns (not used directly, kept for reference)
};

/**
 * Calculate the number of monsters for a specific wave
 */
export function getMonstersPerWave(wave: number): number {
  const config = WAVE_CONFIG;
  
  if (config.monstersPerWaveScaling === 'fixed') {
    return config.baseMonstersPerWave;
  } else if (config.monstersPerWaveScaling === 'exponential') {
    return Math.floor(config.baseMonstersPerWave * Math.pow(config.monstersPerWaveExponentialBase, wave - 1));
  } else {
    // linear - for 1.5 increase, we alternate between +1 and +2
    const totalIncrease = (wave - 1) * config.monstersPerWaveLinearIncrease;
    return Math.floor(config.baseMonstersPerWave + totalIncrease);
  }
}

/**
 * Calculate the spawn interval for a specific wave
 */
export function getSpawnIntervalForWave(wave: number): number {
  const config = WAVE_CONFIG;
  
  if (config.spawnIntervalScaling === 'fixed') {
    return config.spawnInterval;
  } else {
    // decreasing
    const decrease = (wave - 1) * config.spawnIntervalDecreasePerWave;
    return Math.max(500, config.spawnInterval - decrease); // Minimum 500ms
  }
}

// ===== DAMAGE CALCULATION =====
export function calculateDamage(
  attackerAttack: number,
  defenderDefense: number,
  multiplier: number = 1.0
): number {
  // Simple damage formula: (attack - defense/2) * multiplier
  // Minimum damage is 1
  const baseDamage = Math.max(1, attackerAttack - defenderDefense / 2);
  return Math.floor(baseDamage * multiplier);
}
