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
  baseHp: 80, // Increased by 50 (30 + 50 = 80)
  baseDamage: 5,
  baseDefense: 2,
  moveSpeed: 0.07,
  hpPerWave: 15, // +15 HP per wave
  sizeMultiplierPerWave: 0.08, // +8% size per wave
};

// ===== ROUND SCALING CONFIGURATION =====
export interface RoundScalingConfig {
  // HP scaling: can be linear or exponential
  hpScalingType: 'linear' | 'exponential';
  hpLinearMultiplier: number; // for linear: baseHp + (wave - 1) * multiplier
  hpExponentialBase: number; // for exponential: baseHp * (base ^ (wave - 1))
  
  // Damage scaling
  damageScalingType: 'linear' | 'exponential';
  damageLinearMultiplier: number;
  damageExponentialBase: number;
  
  // Defense scaling
  defenseScalingType: 'linear' | 'exponential';
  defenseLinearMultiplier: number;
  defenseExponentialBase: number;
  
  // Size scaling (always linear for visual consistency)
  sizeMultiplierPerWave: number;
}

export const ROUND_SCALING_CONFIG: RoundScalingConfig = {
  // HP: Exponential scaling for 50 rounds (increased difficulty - 50% more than previous)
  // Formula: baseHp * (1.36 ^ (wave - 1))
  // This gives: R1=30, R10=1,200, R25=1,400,000, R50=1,700,000,000 HP (very hard!)
  hpScalingType: 'exponential',
  hpLinearMultiplier: 15, // Not used when exponential
  hpExponentialBase: 1.36, // 36% increase per wave (50% more than previous 24%)
  
  // Damage: Not used (monsters don't attack), but kept for compatibility
  damageScalingType: 'linear',
  damageLinearMultiplier: 0, // Not used
  damageExponentialBase: 1.0, // Not used
  
  // Defense: Exponential scaling (2x the previous rate)
  // Formula: baseDefense * (1.28 ^ (wave - 1))
  // This gives: R1=2, R10=25, R25=1,200, R50=140,000 defense (very hard!)
  defenseScalingType: 'exponential',
  defenseLinearMultiplier: 1, // Not used when exponential
  defenseExponentialBase: 1.28, // 28% increase per wave (2x the previous 14%)
  
  // Size: Always linear (visual only)
  sizeMultiplierPerWave: 0.05, // +5% size per wave (reduced for 50 rounds)
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
    hp = Math.floor(baseHp * Math.pow(scaling.hpExponentialBase, referenceWave - 1));
  } else {
    hp = baseHp + (referenceWave - 1) * scaling.hpLinearMultiplier;
  }
  
  // Boss: 10x HP
  if (isBoss) {
    hp = hp * 10;
  }
  
  // Calculate Damage - not used (monsters don't attack), but kept for type compatibility
  const damage = 0; // Monsters don't attack in this game
  
  // Calculate Defense based on scaling type
  let defense: number;
  if (scaling.defenseScalingType === 'exponential') {
    defense = Math.floor(baseDefense * Math.pow(scaling.defenseExponentialBase, referenceWave - 1));
  } else {
    defense = baseDefense + Math.floor((referenceWave - 1) * scaling.defenseLinearMultiplier);
  }
  
  // Boss: 5x Defense
  if (isBoss) {
    defense = defense * 5;
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
export const MAX_ACTIVE_MONSTERS = 200; // Lose if more than this are alive

export const WAVE_CONFIG: WaveConfig = {
  totalWaves: 50, // 50 rounds for extended gameplay
  baseMonstersPerWave: 30, // 30 monsters per wave
  monstersPerWaveScaling: 'fixed', // Keep the count stable per wave
  monstersPerWaveLinearIncrease: 0,
  monstersPerWaveExponentialBase: 1.0,
  spawnInterval: 3000, // Spread 30 spawns across 90 seconds
  spawnIntervalScaling: 'fixed', // Keep spawn interval constant
  spawnIntervalDecreasePerWave: 0,
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
