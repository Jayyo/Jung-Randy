// ===== ENUMS =====

/** Political party affiliation */
export enum Party {
  KUK = 'kuk',       // People Power Party (국민의힘)
  MIN = 'min',       // Democratic Party (더불어민주당)
  NEUTRAL = 'neutral' // Cross-party / Independent
}

/** Character rarity tier */
export enum Rarity {
  COMMON = 'common',       // 일반
  SPECIAL = 'special',     // 특별
  RARE = 'rare',           // 고급
  LEGENDARY = 'legendary', // 전설
  MYTHIC = 'mythic'        // 신화
}

/** Character role in combat */
export enum Role {
  DEALER = 'dealer',     // Damage dealer
  TANK = 'tank',         // Front-line / defensive
  SUPPORT = 'support',   // Buff / heal / utility
  DEBUFFER = 'debuffer'  // Enemy debuff specialist
}

/** Skill target type */
export enum TargetType {
  SELF = 'self',
  SINGLE_ENEMY = 'single_enemy',
  SINGLE_ALLY = 'single_ally',
  AOE_ENEMY = 'aoe_enemy',
  AOE_ALLY = 'aoe_ally',
  ALL_ENEMIES = 'all_enemies',
  ALL_ALLIES = 'all_allies'
}

/** Skill effect type */
export enum EffectType {
  DAMAGE = 'damage',
  HEAL = 'heal',
  BUFF = 'buff',
  DEBUFF = 'debuff',
  SUMMON = 'summon',
  SPECIAL = 'special'
}

// ===== INTERFACES =====

/** Base stats for characters and mobs */
export interface Stats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;        // Movement speed
  attackSpeed: number;  // Attacks per second
  attackRange: number;  // Attack range in pixels
  critRate: number;     // 0-100
  critDamage: number;   // Multiplier (e.g., 150 = 150%)
}

/** Skill effect definition */
export interface SkillEffect {
  type: EffectType;
  value: number;           // Base value (damage, heal amount, etc.)
  duration?: number;       // Duration in ms for buffs/debuffs
  statModifier?: Partial<Stats>; // Stat changes for buff/debuff
}

/** Skill definition */
export interface Skill {
  id: string;
  name: string;
  description: string;
  cooldown: number;       // Cooldown in ms
  manaCost: number;       // Mana cost (if using mana system)
  targetType: TargetType;
  range: number;          // Skill range in pixels
  effects: SkillEffect[];
  animation?: string;     // Animation key
}

/** Passive ability definition */
export interface Passive {
  id: string;
  name: string;
  description: string;
  effects: SkillEffect[];
  trigger?: 'always' | 'on_attack' | 'on_hit' | 'on_kill' | 'on_wave_start';
}

/** Character definition (politician card) */
export interface Character {
  id: string;
  name: string;            // Display name
  party: Party;
  rarity: Rarity;
  role: Role;

  // For unique politicians with evolution forms
  isUnique: boolean;
  uniqueId?: string;       // Base unique ID (e.g., 'ahn_cheolsoo')
  formIndex?: number;      // Evolution stage (0 = base)
  formName?: string;       // Form name (e.g., '교수', 'CEO', '대선후보')

  baseStats: Stats;
  skills: Skill[];
  passives: Passive[];

  // Sprite/visual info
  spriteKey: string;
  portraitKey: string;
}

/** Recipe for combining characters */
export interface Recipe {
  id: string;
  name: string;
  description: string;

  // Input requirements
  ingredients: RecipeIngredient[];

  // Output
  resultCharacterId: string;
}

/** Recipe ingredient specification */
export interface RecipeIngredient {
  // Can specify exact character OR party+rarity combo
  characterId?: string;    // Specific character required
  party?: Party;           // OR: any character from this party
  rarity?: Rarity;         // AND: with this rarity
  count: number;           // How many needed
}

/** Mob (enemy) definition */
export interface Mob {
  id: string;
  name: string;
  type: 'normal' | 'elite' | 'boss';
  baseStats: Stats;
  goldReward: number;
  spriteKey: string;
}

/** Wave definition */
export interface Wave {
  waveNumber: number;
  mobs: WaveMob[];
  spawnInterval: number;  // ms between spawns
  bonusGold?: number;
}

export interface WaveMob {
  mobId: string;
  count: number;
  statMultiplier?: number; // Scale stats for difficulty
}

// ===== RUNTIME ENTITIES =====

/** Runtime character instance (in-game) */
export interface CharacterInstance {
  instanceId: string;
  character: Character;
  currentStats: Stats;
  position: { x: number; y: number };
  skillCooldowns: Map<string, number>;
  activeBuffs: ActiveBuff[];
  isDeployed: boolean;
}

/** Runtime mob instance */
export interface MobInstance {
  instanceId: string;
  mob: Mob;
  currentStats: Stats;
  position: { x: number; y: number };
  pathProgress: number;  // 0-1, progress along loop path
  loopCount: number;     // How many loops completed
  zone: PlayerZone | 'center';  // Which zone this mob belongs to
  activeDebuffs: ActiveBuff[];
}

/** Active buff/debuff on a unit */
export interface ActiveBuff {
  id: string;
  name: string;
  effects: SkillEffect[];
  remainingDuration: number;
  sourceId: string;
}

// ===== GAME STATE =====

/** Player zone position (4 quadrants) */
export type PlayerZone = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

/** Player statue (base) that must be defended */
export interface Statue {
  zoneId: PlayerZone;
  hp: number;
  maxHp: number;
  position: { x: number; y: number };
}

/** Player inventory */
export interface PlayerInventory {
  characters: CharacterInstance[];
  gold: number;
  freeRolls: number;
}

/** Individual player state (for 4-player support) */
export interface PlayerState {
  playerId: string;
  zone: PlayerZone;
  statue: Statue;
  hero: CharacterInstance | null;  // Active hero controlled by player
  inventory: PlayerInventory;
  isAlive: boolean;
  passiveGoldTimer: number;  // Timer for passive gold income
}

/** Current game state */
export interface GameState {
  // Meta
  gameId: string;
  isRunning: boolean;
  isPaused: boolean;

  // Wave info
  currentWave: number;
  totalWaves: number;
  waveInProgress: boolean;

  // Players (up to 4)
  players: PlayerState[];
  localPlayerId: string;  // Current player's ID (for local play)

  // Enemies - now per zone
  activeMobs: MobInstance[];

  // Central boss
  centralBoss: MobInstance | null;
  bossActive: boolean;

  // Economy (shared config)
  rollCost: number;

  // Timing
  elapsedTime: number;
  waveStartTime: number;
}

/** Game configuration */
export interface GameConfig {
  // Economy
  startingGold: number;
  rollCost: number;
  freeRollsPerWave: number;
  passiveGoldInterval: number;  // ms between passive gold ticks
  passiveGoldAmount: number;    // Gold per tick

  // Statue
  statueMaxHp: number;
  statueDamagePerLoop: number;  // Damage when mob completes loop

  // Game
  totalWaves: number;
  bossWaveInterval: number;  // Boss spawns every N waves

  // Map dimensions (in pixels)
  mapWidth: number;
  mapHeight: number;

  // Zone configuration - rectangular separated platforms
  zoneSize: number;         // Size of each player zone (square)
  pathWidth: number;        // Width of mob walking path
  bridgeWidth: number;      // Width of bridges to center
  bridgeLength: number;     // Length of bridges
  centralAreaSize: number;  // Size of central boss area

  // Legacy (for backward compatibility)
  loopRadius?: number;       // Deprecated: use zoneSize instead
  centralBossRadius?: number; // Deprecated: use centralAreaSize instead
}
