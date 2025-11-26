import {
  GameState,
  GameConfig,
  CharacterInstance,
  MobInstance,
  Character,
  Wave,
  Party,
  Rarity,
  Stats,
  PlayerState,
  PlayerZone,
} from '@/types';
import { defaultGameConfig, rarityWeights, partyWeights, getZoneCenter, getMapCenter } from '@/data/config';
import { allCharacters, getCharactersByPartyAndRarity } from '@/data/characters';
import { getMobById, getWave } from '@/data/mobs';

/**
 * GameCore - Pure game logic, no rendering
 *
 * Redesigned for 4-player action defense:
 * - Each player has their own zone with a statue to defend
 * - Mobs loop around the statue, dealing damage on each complete loop
 * - Players directly control their hero character
 * - Central boss spawns every N waves for cooperative combat
 */
export class GameCore {
  private state: GameState;
  private config: GameConfig;
  private eventCallbacks: Map<string, Function[]> = new Map();
  private spawnQueue: { mobId: string; zone: PlayerZone; statMultiplier: number }[] = [];
  private spawnTimer: number = 0;
  private currentSpawnInterval: number = 2000;

  constructor(playerId: string, config: GameConfig = defaultGameConfig) {
    this.config = config;
    this.state = this.createInitialState(playerId);
  }

  // ===== STATE INITIALIZATION =====

  private createInitialState(playerId: string): GameState {
    // Create single player for now (expandable to 4)
    const players: PlayerState[] = [
      this.createPlayerState(playerId, 'topLeft'),
    ];

    return {
      gameId: this.generateId(),
      isRunning: false,
      isPaused: false,

      currentWave: 0,
      totalWaves: this.config.totalWaves,
      waveInProgress: false,

      players,
      localPlayerId: playerId,

      activeMobs: [],
      centralBoss: null,
      bossActive: false,

      rollCost: this.config.rollCost,

      elapsedTime: 0,
      waveStartTime: 0,
    };
  }

  private createPlayerState(playerId: string, zone: PlayerZone): PlayerState {
    const center = getZoneCenter(zone, this.config.mapWidth, this.config.mapHeight);

    return {
      playerId,
      zone,
      statue: {
        zoneId: zone,
        hp: this.config.statueMaxHp,
        maxHp: this.config.statueMaxHp,
        position: center,
      },
      hero: null,
      inventory: {
        characters: [],
        gold: this.config.startingGold,
        freeRolls: this.config.freeRollsPerWave,
      },
      isAlive: true,
      passiveGoldTimer: 0,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===== STATE ACCESS =====

  getState(): Readonly<GameState> {
    return this.state;
  }

  getConfig(): Readonly<GameConfig> {
    return this.config;
  }

  getLocalPlayer(): PlayerState | undefined {
    return this.state.players.find(p => p.playerId === this.state.localPlayerId);
  }

  getPlayerByZone(zone: PlayerZone): PlayerState | undefined {
    return this.state.players.find(p => p.zone === zone);
  }

  // ===== GAME FLOW =====

  startGame(): void {
    this.state.isRunning = true;
    this.state.currentWave = 0;
    this.emit('gameStart', this.state);

    // Give initial free rolls to all players
    for (const player of this.state.players) {
      player.inventory.freeRolls = 3;
    }
  }

  pauseGame(): void {
    this.state.isPaused = true;
    this.emit('gamePause', this.state);
  }

  resumeGame(): void {
    this.state.isPaused = false;
    this.emit('gameResume', this.state);
  }

  endGame(victory: boolean): void {
    this.state.isRunning = false;
    this.emit('gameEnd', { state: this.state, victory });
  }

  // ===== WAVE MANAGEMENT =====

  startNextWave(): Wave | null {
    if (this.state.waveInProgress) return null;

    this.state.currentWave++;
    const wave = getWave(this.state.currentWave);

    if (!wave) {
      this.endGame(true);
      return null;
    }

    this.state.waveInProgress = true;
    this.state.waveStartTime = this.state.elapsedTime;
    this.currentSpawnInterval = wave.spawnInterval;

    // Grant free rolls to all players
    for (const player of this.state.players) {
      if (player.isAlive) {
        player.inventory.freeRolls += this.config.freeRollsPerWave;
      }
    }

    // Check if this is a boss wave
    const isBossWave = this.state.currentWave % this.config.bossWaveInterval === 0;
    if (isBossWave) {
      this.spawnCentralBoss();
    }

    // Build spawn queue from wave mobs
    this.spawnQueue = [];
    for (const mobDef of wave.mobs) {
      for (let i = 0; i < mobDef.count; i++) {
        // Spawn mobs to player zones
        for (const player of this.state.players) {
          if (player.isAlive) {
            this.spawnQueue.push({
              mobId: mobDef.mobId,
              zone: player.zone,
              statMultiplier: mobDef.statMultiplier ?? 1.0,
            });
          }
        }
      }
    }
    // Shuffle the spawn queue for variety
    this.shuffleArray(this.spawnQueue);
    this.spawnTimer = 0;

    this.emit('waveStart', { wave, waveNumber: this.state.currentWave, isBossWave });
    return wave;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Spawn a mob in a specific player zone
   * Mobs will loop around the player's statue
   */
  spawnMob(mobId: string, zone: PlayerZone, statMultiplier: number = 1.0): MobInstance | null {
    const mob = getMobById(mobId);
    if (!mob) return null;

    const player = this.getPlayerByZone(zone);
    if (!player || !player.isAlive) return null;

    // Start position is on the loop path (top-left corner of square path)
    const center = player.statue.position;
    const pathOffset = (this.config.zoneSize ?? 800) * 0.38;
    const startX = center.x - pathOffset;
    const startY = center.y - pathOffset;

    const instance: MobInstance = {
      instanceId: this.generateId(),
      mob,
      currentStats: this.scaleStats(mob.baseStats, statMultiplier),
      position: { x: startX, y: startY },
      pathProgress: 0,
      loopCount: 0,
      zone,
      activeDebuffs: [],
    };

    this.state.activeMobs.push(instance);
    this.emit('mobSpawn', instance);
    return instance;
  }

  /**
   * Spawn central boss for cooperative combat
   */
  private spawnCentralBoss(): void {
    const bossMob = getMobById('mob_major_scandal');
    if (!bossMob) return;

    const center = getMapCenter(this.config.mapWidth, this.config.mapHeight);

    // Scale boss based on current wave
    const waveMultiplier = 1 + (this.state.currentWave / 10);

    const boss: MobInstance = {
      instanceId: this.generateId(),
      mob: bossMob,
      currentStats: this.scaleStats(bossMob.baseStats, waveMultiplier),
      position: center,
      pathProgress: 0,
      loopCount: 0,
      zone: 'center',
      activeDebuffs: [],
    };

    this.state.centralBoss = boss;
    this.state.bossActive = true;
    this.emit('bossSpawn', boss);
  }

  private scaleStats(base: Stats, multiplier: number): Stats {
    return {
      ...base,
      hp: Math.floor(base.hp * multiplier),
      maxHp: Math.floor(base.maxHp * multiplier),
      atk: Math.floor(base.atk * multiplier),
      def: Math.floor(base.def * multiplier),
    };
  }

  /**
   * Called when a mob completes one loop around the statue
   */
  onMobCompletedLoop(mobId: string): void {
    const mob = this.state.activeMobs.find(m => m.instanceId === mobId);
    if (!mob || mob.zone === 'center') return;

    mob.loopCount++;
    mob.pathProgress = 0;

    // Deal damage to the statue
    const player = this.getPlayerByZone(mob.zone);
    if (player) {
      player.statue.hp -= this.config.statueDamagePerLoop;
      this.emit('statueDamaged', {
        zone: mob.zone,
        damage: this.config.statueDamagePerLoop,
        remainingHp: player.statue.hp,
      });

      // Check if statue destroyed
      if (player.statue.hp <= 0) {
        this.onPlayerDefeated(player.playerId);
      }
    }
  }

  onMobKilled(mobId: string, killerId: string): void {
    // Check if it's the central boss
    if (this.state.centralBoss?.instanceId === mobId) {
      this.onBossKilled(killerId);
      return;
    }

    const index = this.state.activeMobs.findIndex(m => m.instanceId === mobId);
    if (index === -1) return;

    const mob = this.state.activeMobs[index];
    this.state.activeMobs.splice(index, 1);

    // Award gold to the player who killed it
    const killer = this.state.players.find(p => p.hero?.instanceId === killerId);
    if (killer) {
      killer.inventory.gold += mob.mob.goldReward;
      this.emit('goldChanged', {
        playerId: killer.playerId,
        amount: mob.mob.goldReward,
        total: killer.inventory.gold,
      });
    }

    this.emit('mobKilled', { mob, killerId });

    // Check wave complete (no mobs, no boss, no pending spawns)
    if (this.state.activeMobs.length === 0 && !this.state.bossActive && this.state.waveInProgress && this.spawnQueue.length === 0) {
      this.completeWave();
    }
  }

  private onBossKilled(killerId: string): void {
    if (!this.state.centralBoss) return;

    const boss = this.state.centralBoss;

    // Award bonus gold to ALL alive players
    const bonusGold = boss.mob.goldReward;
    for (const player of this.state.players) {
      if (player.isAlive) {
        player.inventory.gold += bonusGold;
        this.emit('goldChanged', {
          playerId: player.playerId,
          amount: bonusGold,
          total: player.inventory.gold,
        });
      }
    }

    this.state.centralBoss = null;
    this.state.bossActive = false;
    this.emit('bossKilled', { boss, killerId });

    // Check wave complete (no mobs, no pending spawns)
    if (this.state.activeMobs.length === 0 && this.state.waveInProgress && this.spawnQueue.length === 0) {
      this.completeWave();
    }
  }

  private onPlayerDefeated(playerId: string): void {
    const player = this.state.players.find(p => p.playerId === playerId);
    if (!player) return;

    player.isAlive = false;
    this.emit('playerDefeated', { playerId, zone: player.zone });

    // Check if all players defeated
    const alivePlayers = this.state.players.filter(p => p.isAlive);
    if (alivePlayers.length === 0) {
      this.endGame(false);
    }
  }

  private completeWave(): void {
    this.state.waveInProgress = false;
    const wave = getWave(this.state.currentWave);

    // Award bonus gold to all alive players
    if (wave?.bonusGold) {
      for (const player of this.state.players) {
        if (player.isAlive) {
          player.inventory.gold += wave.bonusGold;
          this.emit('goldChanged', {
            playerId: player.playerId,
            amount: wave.bonusGold,
            total: player.inventory.gold,
          });
        }
      }
    }

    this.emit('waveComplete', { waveNumber: this.state.currentWave });

    // Check victory
    if (this.state.currentWave >= this.state.totalWaves) {
      this.endGame(true);
    }
  }

  // ===== GACHA / ROLLING =====

  canRoll(playerId: string): boolean {
    const player = this.state.players.find(p => p.playerId === playerId);
    if (!player || !player.isAlive) return false;

    return player.inventory.freeRolls > 0 || player.inventory.gold >= this.state.rollCost;
  }

  roll(playerId: string): CharacterInstance | null {
    const player = this.state.players.find(p => p.playerId === playerId);
    if (!player || !this.canRoll(playerId)) return null;

    // Deduct cost
    if (player.inventory.freeRolls > 0) {
      player.inventory.freeRolls--;
    } else {
      player.inventory.gold -= this.state.rollCost;
      this.emit('goldChanged', {
        playerId,
        amount: -this.state.rollCost,
        total: player.inventory.gold,
      });
    }

    // Roll for character
    const character = this.rollCharacter();
    const instance = this.createCharacterInstance(character);

    // Place character directly on map in player's zone
    const center = player.statue.position;
    const zoneSize = this.config.zoneSize ?? 800;
    // Random position within the zone (inside the path area)
    const halfZone = zoneSize * 0.3;
    instance.position = {
      x: center.x + (Math.random() - 0.5) * halfZone * 2,
      y: center.y + (Math.random() - 0.5) * halfZone * 2,
    };
    instance.isDeployed = true;

    player.inventory.characters.push(instance);
    this.emit('roll', { playerId, character: instance });

    return instance;
  }

  private rollCharacter(): Character {
    const rarity = this.rollRarity();
    const party = this.rollParty();

    let candidates = getCharactersByPartyAndRarity(party, rarity);

    if (candidates.length === 0) {
      candidates = allCharacters.filter(c => c.party === party && c.rarity === rarity);
    }

    if (candidates.length === 0) {
      candidates = allCharacters.filter(c => c.party === party && c.rarity === Rarity.COMMON);
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private rollRarity(): Rarity {
    const roll = Math.random() * 100;
    let cumulative = 0;

    const rarities: [Rarity, number][] = [
      [Rarity.COMMON, rarityWeights.common],
      [Rarity.SPECIAL, rarityWeights.special],
      [Rarity.RARE, rarityWeights.rare],
      [Rarity.LEGENDARY, rarityWeights.legendary],
      [Rarity.MYTHIC, rarityWeights.mythic],
    ];

    for (const [rarity, weight] of rarities) {
      cumulative += weight;
      if (roll < cumulative) {
        return rarity;
      }
    }

    return Rarity.COMMON;
  }

  private rollParty(): Party {
    const roll = Math.random() * 100;
    return roll < partyWeights.kuk ? Party.KUK : Party.MIN;
  }

  private createCharacterInstance(character: Character): CharacterInstance {
    return {
      instanceId: this.generateId(),
      character,
      currentStats: { ...character.baseStats },
      position: { x: 0, y: 0 },
      skillCooldowns: new Map(),
      activeBuffs: [],
      isDeployed: false,
    };
  }

  // ===== HERO MANAGEMENT =====

  /**
   * Select a character from inventory to be the active hero
   */
  selectHero(playerId: string, characterInstanceId: string): boolean {
    const player = this.state.players.find(p => p.playerId === playerId);
    if (!player || !player.isAlive) return false;

    const char = player.inventory.characters.find(c => c.instanceId === characterInstanceId);
    if (!char) return false;

    // Place hero at statue position
    const center = player.statue.position;
    char.position = { x: center.x, y: center.y - 30 };
    char.isDeployed = true;

    player.hero = char;
    this.emit('heroSelected', { playerId, hero: char });
    return true;
  }

  /**
   * Move hero to a target position
   */
  moveHero(playerId: string, targetX: number, targetY: number): boolean {
    const player = this.state.players.find(p => p.playerId === playerId);
    if (!player || !player.hero) return false;

    // Store target for movement interpolation in update loop
    this.emit('heroMoveCommand', {
      playerId,
      hero: player.hero,
      targetX,
      targetY,
    });
    return true;
  }

  /**
   * Update hero position (called from renderer during movement)
   */
  updateHeroPosition(playerId: string, x: number, y: number): void {
    const player = this.state.players.find(p => p.playerId === playerId);
    if (!player || !player.hero) return;

    player.hero.position = { x, y };
  }

  // ===== COMBAT =====

  dealDamage(attackerId: string, targetId: string, damage: number): void {
    // Check if targeting central boss
    if (this.state.centralBoss?.instanceId === targetId) {
      const actualDamage = Math.max(1, damage - this.state.centralBoss.currentStats.def);
      this.state.centralBoss.currentStats.hp -= actualDamage;

      this.emit('damage', { attackerId, targetId, damage: actualDamage, isBoss: true });

      if (this.state.centralBoss.currentStats.hp <= 0) {
        this.onBossKilled(attackerId);
      }
      return;
    }

    // Regular mob
    const target = this.state.activeMobs.find(m => m.instanceId === targetId);
    if (!target) return;

    const actualDamage = Math.max(1, damage - target.currentStats.def);
    target.currentStats.hp -= actualDamage;

    this.emit('damage', { attackerId, targetId, damage: actualDamage, isBoss: false });

    if (target.currentStats.hp <= 0) {
      this.onMobKilled(targetId, attackerId);
    }
  }

  useSkill(playerId: string, skillId: string, targetX?: number, targetY?: number): boolean {
    const player = this.state.players.find(p => p.playerId === playerId);
    if (!player || !player.hero) return false;

    const skill = player.hero.character.skills.find(s => s.id === skillId);
    if (!skill) return false;

    // Check cooldown
    const cooldownEnd = player.hero.skillCooldowns.get(skillId) ?? 0;
    if (this.state.elapsedTime < cooldownEnd) return false;

    // Set cooldown
    player.hero.skillCooldowns.set(skillId, this.state.elapsedTime + skill.cooldown);

    this.emit('skillUsed', { playerId, skill, targetX, targetY });
    return true;
  }

  // ===== GAME LOOP UPDATE =====

  update(deltaTime: number): void {
    if (!this.state.isRunning || this.state.isPaused) return;

    this.state.elapsedTime += deltaTime;

    // Process spawn queue
    this.processSpawnQueue(deltaTime);

    // Update mob positions along loop paths
    this.updateMobs(deltaTime);

    // Update passive gold income
    this.updatePassiveGold(deltaTime);
  }

  private processSpawnQueue(deltaTime: number): void {
    if (this.spawnQueue.length === 0) return;

    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.currentSpawnInterval) {
      this.spawnTimer -= this.currentSpawnInterval;

      const toSpawn = this.spawnQueue.shift();
      if (toSpawn) {
        this.spawnMob(toSpawn.mobId, toSpawn.zone, toSpawn.statMultiplier);
      }
    }
  }

  private updateMobs(deltaTime: number): void {
    for (const mob of this.state.activeMobs) {
      if (mob.zone === 'center') continue; // Boss doesn't move

      // Path progress (0 to 1 represents one full loop)
      const progressPerSecond = mob.currentStats.speed / 1000;
      mob.pathProgress += progressPerSecond * (deltaTime / 1000);

      // Check if completed a loop
      if (mob.pathProgress >= 1) {
        this.onMobCompletedLoop(mob.instanceId);
      }
    }
  }

  private updatePassiveGold(deltaTime: number): void {
    for (const player of this.state.players) {
      if (!player.isAlive) continue;

      player.passiveGoldTimer += deltaTime;
      if (player.passiveGoldTimer >= this.config.passiveGoldInterval) {
        player.passiveGoldTimer -= this.config.passiveGoldInterval;
        player.inventory.gold += this.config.passiveGoldAmount;
        this.emit('goldChanged', {
          playerId: player.playerId,
          amount: this.config.passiveGoldAmount,
          total: player.inventory.gold,
          isPassive: true,
        });
      }
    }
  }

  // ===== EVENT SYSTEM =====

  on(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: unknown): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(data);
      }
    }
  }
}
