// ===== GAME CONSTANTS =====
// All magic numbers and configuration values in one place

// Platform dimensions
export const PLATFORM_SIZE = 14;
export const LANE_OFFSET = PLATFORM_SIZE * 0.44;
export const LANE_WIDTH = 1.2;

// Boss platform
export const BOSS_PLATFORM_SIZE = PLATFORM_SIZE;
export const BOSS_PLATFORM_GAP = 8;
export const BOSS_PLATFORM_X = PLATFORM_SIZE / 2 + BOSS_PLATFORM_GAP + BOSS_PLATFORM_SIZE / 2;

// Bridge
export const BRIDGE_HEIGHT = 1.5;
export const RAMP_LENGTH = 2;
export const BRIDGE_ENTRY_X = LANE_OFFSET - 2;
export const BRIDGE_EXIT_X = BOSS_PLATFORM_X - BOSS_PLATFORM_SIZE / 2;
export const BRIDGE_HALF_WIDTH = 1.0;

// Character scales
export const CHARACTER1_SCALE = 0.5;
export const CHARACTER2_SCALE = 1.0;

// Monster
export const MONSTER_SCALE = 0.8;
export const MONSTER_SPEED = 0.07;
export const TARGET_CLUSTER_RADIUS = 3.5;
export const WORLD_BOSS_SCALE_MULTIPLIER = 3;

// Movement
export const CHARACTER_SPEED = 2.5;

// Walkable area bounds
export const INNER_BOUND = LANE_OFFSET - 0.8;
export const BOSS_PLATFORM_HALF_SIZE = BOSS_PLATFORM_SIZE / 2 - 0.5;

// Combat
export const ATTACK_ANIMATION_DURATION_FACTOR = 0.75; // Shorten attack animation length to land hits faster
export const GLOBAL_ATTACK_SPEED_MULTIPLIER = 1.2; // 20% faster attacks globally
