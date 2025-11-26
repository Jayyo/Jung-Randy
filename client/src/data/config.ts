import { GameConfig, PlayerZone } from '@/types';

/**
 * Default game configuration
 * These values can be adjusted for balancing
 */
export const defaultGameConfig: GameConfig = {
  // Economy
  startingGold: 100,
  rollCost: 10,
  freeRollsPerWave: 1,
  passiveGoldInterval: 10000,  // 10 seconds
  passiveGoldAmount: 5,        // 5 gold per tick

  // Statue (player base)
  statueMaxHp: 100,
  statueDamagePerLoop: 10,  // Damage when mob completes one loop

  // Game
  totalWaves: 20,
  bossWaveInterval: 5,  // Boss every 5 waves

  // Map dimensions (in pixels) - much larger for 4 separated zones
  mapWidth: 4000,
  mapHeight: 4000,

  // Zone configuration - rectangular zones
  zoneSize: 800,         // Size of each player zone (square)
  pathWidth: 60,         // Width of mob walking path
  bridgeWidth: 120,      // Width of bridges to center
  bridgeLength: 400,     // Length of bridges
  centralAreaSize: 600,  // Size of central boss area
};

/**
 * Zone center positions (relative to map dimensions)
 * Each zone is in one of the 4 quadrants
 */
export const zonePositions: Record<PlayerZone, { xRatio: number; yRatio: number }> = {
  topLeft: { xRatio: 0.25, yRatio: 0.3 },
  topRight: { xRatio: 0.75, yRatio: 0.3 },
  bottomRight: { xRatio: 0.75, yRatio: 0.7 },
  bottomLeft: { xRatio: 0.25, yRatio: 0.7 },
};

/**
 * Get zone center position in pixels
 */
export function getZoneCenter(zone: PlayerZone, mapWidth: number, mapHeight: number) {
  const pos = zonePositions[zone];
  return {
    x: mapWidth * pos.xRatio,
    y: mapHeight * pos.yRatio,
  };
}

/**
 * Get map center (for central boss area)
 */
export function getMapCenter(mapWidth: number, mapHeight: number) {
  return {
    x: mapWidth / 2,
    y: mapHeight / 2,
  };
}

/**
 * Rarity weights for gacha/rolling
 * Higher number = more common
 */
export const rarityWeights = {
  common: 60,     // 60%
  special: 25,    // 25%
  rare: 12,       // 12%
  legendary: 2.5, // 2.5%
  mythic: 0.5,    // 0.5%
};

/**
 * Party weights for rolling
 * 50/50 by default
 */
export const partyWeights = {
  kuk: 50,
  min: 50,
};

/**
 * Level scaling multipliers
 * Applied per wave for difficulty progression
 */
export const difficultyScaling = {
  hpPerWave: 1.08,      // 8% HP increase per wave
  atkPerWave: 1.05,     // 5% ATK increase per wave
  speedPerWave: 1.02,   // 2% speed increase per wave
};

/**
 * Synergy thresholds
 * Number of same-party characters needed for bonus
 */
export const synergyThresholds = {
  tier1: 2,  // 2 of same party
  tier2: 3,  // 3 of same party
  tier3: 5,  // 5 of same party
};

/**
 * Synergy bonuses by tier
 */
export const synergyBonuses = {
  // 국민의힘 synergy: Attack focused
  kuk: {
    tier1: { atk: 5 },        // +5% ATK
    tier2: { atk: 10, critRate: 5 },  // +10% ATK, +5% Crit
    tier3: { atk: 20, critRate: 10, critDamage: 20 }, // +20% ATK, +10% Crit, +20% Crit DMG
  },
  // 민주당 synergy: Survival focused
  min: {
    tier1: { maxHp: 5 },      // +5% HP
    tier2: { maxHp: 10, def: 5 },     // +10% HP, +5% DEF
    tier3: { maxHp: 20, def: 15, speed: 10 }, // +20% HP, +15% DEF, +10% Speed
  },
};

/**
 * Animation frame rates
 */
export const animationConfig = {
  idle: { frameRate: 8, repeat: -1 },
  walk: { frameRate: 12, repeat: -1 },
  attack: { frameRate: 16, repeat: 0 },
  skill: { frameRate: 16, repeat: 0 },
  death: { frameRate: 10, repeat: 0 },
};

/**
 * Combat timing (in ms)
 */
export const combatConfig = {
  globalCooldown: 200,        // Minimum time between actions
  projectileSpeed: 400,       // Pixels per second
  damageNumberDuration: 1000, // How long damage numbers show
  buffIconSize: 24,           // Size of buff icons
};
