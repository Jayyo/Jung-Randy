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
  attack: 15,
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
  attack: 20,
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
  baseHp: 30,
  baseDamage: 5,
  baseDefense: 2,
  moveSpeed: 0.07,
  hpPerWave: 15, // +15 HP per wave
  sizeMultiplierPerWave: 0.08, // +8% size per wave
};

export function getMonsterStatsForWave(wave: number): {
  hp: number;
  damage: number;
  defense: number;
  sizeMultiplier: number;
} {
  const { baseHp, baseDamage, baseDefense, hpPerWave, sizeMultiplierPerWave } = MONSTER_BASE_STATS;
  return {
    hp: baseHp + (wave - 1) * hpPerWave,
    damage: baseDamage + Math.floor((wave - 1) * 2),
    defense: baseDefense + Math.floor((wave - 1) * 1),
    sizeMultiplier: 1 + (wave - 1) * sizeMultiplierPerWave,
  };
}

// ===== WAVE CONFIGURATION =====
export interface WaveConfig {
  totalWaves: number;
  monstersPerWave: number;
  spawnInterval: number; // ms between monster spawns
  waveDelay: number; // ms before next wave starts after current wave ends
}

export const WAVE_CONFIG: WaveConfig = {
  totalWaves: 5,
  monstersPerWave: 15,
  spawnInterval: 1500, // spawn a monster every 1.5 seconds
  waveDelay: 3000, // 3 second delay between waves
};

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
