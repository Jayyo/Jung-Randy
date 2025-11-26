import Phaser from 'phaser';
import { GameCore } from '../core/GameCore';
import { CharacterInstance, MobInstance, Wave, PlayerZone } from '@/types';
import { defaultGameConfig, getZoneCenter, getMapCenter } from '@/data/config';

/**
 * GameScene - Main game scene
 *
 * Redesigned for action defense gameplay:
 * - 4 player zones with circular mob loop paths
 * - Direct hero control with A+click movement
 * - Central boss area
 * - Seoul city plaza theme
 */
export class GameScene extends Phaser.Scene {
  private gameCore!: GameCore;

  // Sprite maps
  private heroSprite: Phaser.GameObjects.Sprite | null = null;
  private mobSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private statueSprites: Map<PlayerZone, Phaser.GameObjects.Sprite> = new Map();
  private bossSprite: Phaser.GameObjects.Sprite | null = null;

  // Loop path graphics (per zone)
  private loopPaths: Map<PlayerZone, Phaser.GameObjects.Graphics> = new Map();

  // UI elements
  private goldText!: Phaser.GameObjects.Text;
  private statueHpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private rollButton!: Phaser.GameObjects.Text;
  private bossIndicator: Phaser.GameObjects.Text | null = null;

  // Hero movement
  private heroMoveTarget: { x: number; y: number } | null = null;
  private isAttackMoveMode: boolean = false;
  private attackMoveCursor: Phaser.GameObjects.Graphics | null = null;

  // HP bars
  private mobHpBars: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private statueHpBars: Map<PlayerZone, Phaser.GameObjects.Graphics> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Initialize game core
    this.gameCore = new GameCore('player1', defaultGameConfig);

    // Setup scene
    this.setupBackground();
    this.setupZones();
    this.setupCentralArea();
    this.setupUI();
    this.setupEventListeners();
    this.setupInputHandlers();

    // Start the game
    this.gameCore.startGame();
  }

  // ===== BACKGROUND & MAP SETUP =====

  private setupBackground(): void {
    const { width, height } = this.cameras.main;

    // Dark city background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // City grid pattern (roads)
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(2, 0x2d2d44, 0.3);

    // Vertical roads
    for (let x = 0; x <= width; x += 160) {
      gridGraphics.lineBetween(x, 0, x, height);
    }
    // Horizontal roads
    for (let y = 0; y <= height; y += 120) {
      gridGraphics.lineBetween(0, y, width, y);
    }

    // Building silhouettes on edges
    this.drawBuildingSilhouettes();
  }

  private drawBuildingSilhouettes(): void {
    const { width, height } = this.cameras.main;
    const buildingGraphics = this.add.graphics();
    buildingGraphics.fillStyle(0x0f0f1a, 1);

    // Top edge buildings
    for (let x = 0; x < width; x += 80) {
      const bHeight = 30 + Math.random() * 40;
      buildingGraphics.fillRect(x, 0, 70, bHeight);
    }

    // Bottom edge buildings
    for (let x = 0; x < width; x += 80) {
      const bHeight = 30 + Math.random() * 40;
      buildingGraphics.fillRect(x, height - bHeight, 70, bHeight);
    }

    // Left edge buildings
    for (let y = 60; y < height - 60; y += 60) {
      const bWidth = 20 + Math.random() * 30;
      buildingGraphics.fillRect(0, y, bWidth, 50);
    }

    // Right edge buildings
    for (let y = 60; y < height - 60; y += 60) {
      const bWidth = 20 + Math.random() * 30;
      buildingGraphics.fillRect(width - bWidth, y, bWidth, 50);
    }
  }

  // ===== ZONE SETUP (4 QUADRANTS) =====

  private setupZones(): void {
    const config = this.gameCore.getConfig();
    const { mapWidth, mapHeight } = config;
    const zoneSize = config.zoneSize ?? 800;
    const zones: PlayerZone[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

    for (const zone of zones) {
      const center = getZoneCenter(zone, mapWidth, mapHeight);

      // Draw zone area (park/grass)
      this.drawZoneArea(center, zoneSize / 2 + 40, zone);

      // Draw loop path
      this.drawLoopPath(center, zoneSize * 0.38, zone);

      // Create statue
      this.createStatue(center, zone);
    }
  }

  private drawZoneArea(center: { x: number; y: number }, radius: number, zone: PlayerZone): void {
    const areaGraphics = this.add.graphics();

    // Park ground (grass)
    areaGraphics.fillStyle(0x2d4a3e, 0.6);
    areaGraphics.fillCircle(center.x, center.y, radius);

    // Zone border
    areaGraphics.lineStyle(2, 0x4a7c59, 0.5);
    areaGraphics.strokeCircle(center.x, center.y, radius);

    // Zone label
    const zoneName = this.getZoneDisplayName(zone);
    this.add.text(center.x, center.y - radius - 15, zoneName, {
      fontSize: '14px',
      color: '#7fba8f',
    }).setOrigin(0.5);
  }

  private getZoneDisplayName(zone: PlayerZone): string {
    const names: Record<PlayerZone, string> = {
      topLeft: 'P1 구역',
      topRight: 'P2 구역',
      bottomRight: 'P3 구역',
      bottomLeft: 'P4 구역',
    };
    return names[zone];
  }

  private drawLoopPath(center: { x: number; y: number }, radius: number, zone: PlayerZone): void {
    const pathGraphics = this.add.graphics();
    pathGraphics.lineStyle(3, 0x8b4513, 0.7); // Brown road color
    pathGraphics.strokeCircle(center.x, center.y, radius);

    // Add direction indicators (small arrows)
    const arrowCount = 4;
    for (let i = 0; i < arrowCount; i++) {
      const angle = (i / arrowCount) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;

      // Small triangle pointing clockwise
      const arrowGraphics = this.add.graphics();
      arrowGraphics.fillStyle(0x8b4513, 0.8);
      const nextAngle = angle + 0.2;
      arrowGraphics.fillTriangle(
        x, y,
        x + Math.cos(nextAngle + Math.PI / 2) * 8,
        y + Math.sin(nextAngle + Math.PI / 2) * 8,
        x + Math.cos(nextAngle - Math.PI / 2) * 8,
        y + Math.sin(nextAngle - Math.PI / 2) * 8
      );
    }

    this.loopPaths.set(zone, pathGraphics);
  }

  private createStatue(center: { x: number; y: number }, zone: PlayerZone): void {
    // Statue base
    this.add.rectangle(center.x, center.y + 15, 40, 10, 0x555555);

    // Statue body (placeholder)
    const statue = this.add.sprite(center.x, center.y, 'placeholder_char');
    statue.setScale(1.5);
    statue.setTint(0xaaaaaa); // Gray tint for stone
    this.statueSprites.set(zone, statue);

    // HP bar background
    this.add.rectangle(center.x, center.y - 40, 50, 8, 0x333333);

    // HP bar
    const hpBar = this.add.graphics();
    hpBar.fillStyle(0x2ecc71, 1);
    hpBar.fillRect(center.x - 25, center.y - 44, 50, 8);
    this.statueHpBars.set(zone, hpBar);
  }

  // ===== CENTRAL BOSS AREA =====

  private setupCentralArea(): void {
    const gameConfig = this.gameCore.getConfig();
    const { mapWidth, mapHeight } = gameConfig;
    const centralAreaSize = gameConfig.centralAreaSize ?? 600;
    const center = getMapCenter(mapWidth, mapHeight);

    // Central plaza
    const plazaGraphics = this.add.graphics();

    // Outer plaza ring
    plazaGraphics.fillStyle(0x3d3d5c, 0.7);
    plazaGraphics.fillCircle(center.x, center.y, centralAreaSize / 2 + 30);

    // Inner boss area
    plazaGraphics.fillStyle(0x4a4a6a, 0.8);
    plazaGraphics.fillCircle(center.x, center.y, centralAreaSize / 2);

    // Decorative pattern
    plazaGraphics.lineStyle(2, 0x6a6a8a, 0.5);
    plazaGraphics.strokeCircle(center.x, center.y, centralAreaSize / 2 - 10);
    plazaGraphics.strokeCircle(center.x, center.y, centralAreaSize / 2 - 20);

    // Center marker
    plazaGraphics.fillStyle(0x8a8aaa, 0.6);
    plazaGraphics.fillCircle(center.x, center.y, 15);

    // Label
    this.add.text(center.x, center.y + centralAreaSize / 2 + 20, '중앙 광장', {
      fontSize: '16px',
      color: '#aaaacc',
    }).setOrigin(0.5);
  }

  // ===== UI SETUP =====

  private setupUI(): void {
    const { width, height } = this.cameras.main;

    // Top UI bar
    this.add.rectangle(width / 2, 30, width, 60, 0x1a252f, 0.9);

    // Gold display
    this.goldText = this.add.text(20, 20, '💰 100', {
      fontSize: '24px',
      color: '#f1c40f',
    });

    // Statue HP display
    this.statueHpText = this.add.text(150, 20, '🏛️ 100/100', {
      fontSize: '24px',
      color: '#2ecc71',
    });

    // Wave display
    this.waveText = this.add.text(350, 20, '🌊 Wave 0/20', {
      fontSize: '24px',
      color: '#3498db',
    });

    // Roll button
    this.rollButton = this.add.text(width - 150, 15, '🎲 뽑기 (10g)', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#2ecc71',
      padding: { x: 15, y: 10 },
    });
    this.rollButton.setInteractive({ useHandCursor: true });
    this.rollButton.on('pointerdown', () => this.onRollClick());
    this.rollButton.on('pointerover', () => this.rollButton.setStyle({ backgroundColor: '#27ae60' }));
    this.rollButton.on('pointerout', () => this.rollButton.setStyle({ backgroundColor: '#2ecc71' }));

    // Start wave button
    const startWaveBtn = this.add.text(width - 320, 15, '▶️ 웨이브 시작', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#e74c3c',
      padding: { x: 15, y: 10 },
    });
    startWaveBtn.setInteractive({ useHandCursor: true });
    startWaveBtn.on('pointerdown', () => this.onStartWaveClick());

    // Inventory panel (bottom)
    this.setupInventoryPanel();

    // Control hint
    this.add.text(20, height - 30, '[A] + 클릭: 이동 | [Q/W/E/R]: 스킬', {
      fontSize: '14px',
      color: '#888888',
    });
  }

  private setupInventoryPanel(): void {
    const { width, height } = this.cameras.main;

    // Panel background
    this.add.rectangle(width / 2, height - 50, width, 80, 0x1a252f, 0.9);

    // Label
    this.add.text(20, height - 80, '인벤토리 (클릭하여 영웅 선택):', {
      fontSize: '16px',
      color: '#bdc3c7',
    });
  }

  // ===== EVENT LISTENERS =====

  private setupEventListeners(): void {
    // Gold changed
    this.gameCore.on('goldChanged', ({ total }: { total: number }) => {
      this.goldText.setText(`💰 ${total}`);
    });

    // Roll result
    this.gameCore.on('roll', ({ character }: { character: CharacterInstance }) => {
      this.addCharacterToInventory(character);
    });

    // Wave start
    this.gameCore.on('waveStart', ({ wave, waveNumber, isBossWave }: { wave: Wave; waveNumber: number; isBossWave: boolean }) => {
      this.waveText.setText(`🌊 Wave ${waveNumber}/${this.gameCore.getConfig().totalWaves}`);
      this.startWaveSpawning(wave);

      if (isBossWave) {
        this.showBossIndicator();
      }
    });

    // Mob spawn
    this.gameCore.on('mobSpawn', (mob: MobInstance) => {
      this.createMobSprite(mob);
    });

    // Mob killed
    this.gameCore.on('mobKilled', ({ mob }: { mob: MobInstance }) => {
      this.destroyMobSprite(mob.instanceId);
    });

    // Statue damaged
    this.gameCore.on('statueDamaged', ({ zone, remainingHp }: { zone: PlayerZone; remainingHp: number }) => {
      this.updateStatueHp(zone, remainingHp);
    });

    // Hero selected
    this.gameCore.on('heroSelected', ({ hero }: { hero: CharacterInstance }) => {
      this.createHeroSprite(hero);
    });

    // Hero move command
    this.gameCore.on('heroMoveCommand', ({ targetX, targetY }: { targetX: number; targetY: number }) => {
      this.heroMoveTarget = { x: targetX, y: targetY };
    });

    // Boss spawn
    this.gameCore.on('bossSpawn', (boss: MobInstance) => {
      this.createBossSprite(boss);
    });

    // Boss killed
    this.gameCore.on('bossKilled', () => {
      this.destroyBossSprite();
      this.hideBossIndicator();
    });

    // Game end
    this.gameCore.on('gameEnd', ({ victory }: { victory: boolean }) => {
      this.showGameOver(victory);
    });
  }

  // ===== INPUT HANDLERS =====

  private setupInputHandlers(): void {
    // A key for attack-move mode
    const aKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    aKey?.on('down', () => {
      this.enterAttackMoveMode();
    });

    // ESC to cancel attack-move mode
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey?.on('down', () => {
      this.exitAttackMoveMode();
    });

    // Click handler
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Ignore UI area (top 60px, bottom 80px)
      if (pointer.y < 60 || pointer.y > this.cameras.main.height - 80) return;

      if (this.isAttackMoveMode) {
        this.executeAttackMove(pointer.x, pointer.y);
        this.exitAttackMoveMode();
      }
    });

    // Skill keys (Q, W, E, R)
    this.setupSkillKeys();
  }

  private setupSkillKeys(): void {
    const skillKeys = ['Q', 'W', 'E', 'R'];
    const keyCodes = [
      Phaser.Input.Keyboard.KeyCodes.Q,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.E,
      Phaser.Input.Keyboard.KeyCodes.R,
    ];

    for (let i = 0; i < skillKeys.length; i++) {
      const key = this.input.keyboard?.addKey(keyCodes[i]);
      key?.on('down', () => {
        this.useSkill(i);
      });
    }
  }

  private enterAttackMoveMode(): void {
    this.isAttackMoveMode = true;

    // Show attack-move cursor
    if (!this.attackMoveCursor) {
      this.attackMoveCursor = this.add.graphics();
    }
    this.attackMoveCursor.clear();
    this.attackMoveCursor.lineStyle(2, 0x00ff00, 1);

    // Update cursor position on pointer move
    this.input.on('pointermove', this.updateAttackMoveCursor, this);
  }

  private updateAttackMoveCursor = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isAttackMoveMode || !this.attackMoveCursor) return;

    this.attackMoveCursor.clear();
    this.attackMoveCursor.lineStyle(2, 0x00ff00, 1);
    this.attackMoveCursor.strokeCircle(pointer.x, pointer.y, 15);

    // Crosshair
    this.attackMoveCursor.lineBetween(pointer.x - 20, pointer.y, pointer.x + 20, pointer.y);
    this.attackMoveCursor.lineBetween(pointer.x, pointer.y - 20, pointer.x, pointer.y + 20);
  };

  private exitAttackMoveMode(): void {
    this.isAttackMoveMode = false;
    if (this.attackMoveCursor) {
      this.attackMoveCursor.clear();
    }
    this.input.off('pointermove', this.updateAttackMoveCursor, this);
  }

  private executeAttackMove(targetX: number, targetY: number): void {
    const player = this.gameCore.getLocalPlayer();
    if (!player?.hero) return;

    this.gameCore.moveHero(player.playerId, targetX, targetY);

    // Show move indicator
    const indicator = this.add.circle(targetX, targetY, 10, 0x00ff00, 0.5);
    this.tweens.add({
      targets: indicator,
      alpha: 0,
      scale: 2,
      duration: 500,
      onComplete: () => indicator.destroy(),
    });
  }

  private useSkill(skillIndex: number): void {
    const player = this.gameCore.getLocalPlayer();
    if (!player?.hero) return;

    const skills = player.hero.character.skills;
    if (skillIndex < skills.length) {
      this.gameCore.useSkill(player.playerId, skills[skillIndex].id);
    }
  }

  // ===== INVENTORY =====

  private addCharacterToInventory(char: CharacterInstance): void {
    const { height } = this.cameras.main;
    const player = this.gameCore.getLocalPlayer();
    if (!player) return;

    const inventory = player.inventory.characters;
    const index = inventory.findIndex(c => c.instanceId === char.instanceId);

    const x = 200 + (index % 10) * 60;
    const y = height - 50;

    const sprite = this.add.sprite(x, y, char.character.spriteKey);
    sprite.setScale(1.5);
    sprite.setInteractive({ useHandCursor: true });

    // Click to select as hero
    sprite.on('pointerdown', () => {
      if (!char.isDeployed) {
        this.gameCore.selectHero(player.playerId, char.instanceId);
        sprite.setTint(0x00ff00);
      }
    });

    // Hover tooltip
    sprite.on('pointerover', () => {
      this.showCharacterTooltip(char, x, y - 60);
    });
    sprite.on('pointerout', () => {
      this.hideTooltip();
    });
  }

  private tooltipText: Phaser.GameObjects.Text | null = null;

  private showCharacterTooltip(char: CharacterInstance, x: number, y: number): void {
    this.hideTooltip();

    const info = `${char.character.name}\n` +
      `ATK: ${char.currentStats.atk} | HP: ${char.currentStats.hp}`;

    this.tooltipText = this.add.text(x, y, info, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 },
    });
    this.tooltipText.setOrigin(0.5, 1);
    this.tooltipText.setDepth(100);
  }

  private hideTooltip(): void {
    if (this.tooltipText) {
      this.tooltipText.destroy();
      this.tooltipText = null;
    }
  }

  // ===== SPRITES =====

  private createHeroSprite(hero: CharacterInstance): void {
    // Remove old hero sprite if exists
    if (this.heroSprite) {
      this.heroSprite.destroy();
    }

    this.heroSprite = this.add.sprite(hero.position.x, hero.position.y, hero.character.spriteKey);
    this.heroSprite.setScale(2);
    this.heroSprite.setDepth(50);

    // Selection ring
    const ring = this.add.circle(hero.position.x, hero.position.y + 5, 20, 0x00ff00, 0.3);
    ring.setDepth(49);

    // Store ring reference for updates
    (this.heroSprite as any).selectionRing = ring;
  }

  private createMobSprite(mob: MobInstance): void {
    const sprite = this.add.sprite(mob.position.x, mob.position.y, mob.mob.spriteKey);
    sprite.setOrigin(0.5, 0.5);
    sprite.setDepth(30);

    // Run animation if available
    const runAnimKey = `${mob.mob.spriteKey}_run`;
    if (this.anims.exists(runAnimKey)) {
      sprite.play(runAnimKey);
    }

    this.mobSprites.set(mob.instanceId, sprite);

    // Create HP bar
    const hpBar = this.add.graphics();
    hpBar.setDepth(31);
    this.mobHpBars.set(mob.instanceId, hpBar);
  }

  private destroyMobSprite(instanceId: string): void {
    const sprite = this.mobSprites.get(instanceId);
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        scale: 0,
        duration: 200,
        onComplete: () => sprite.destroy(),
      });
      this.mobSprites.delete(instanceId);
    }

    // Remove HP bar
    const hpBar = this.mobHpBars.get(instanceId);
    if (hpBar) {
      hpBar.destroy();
      this.mobHpBars.delete(instanceId);
    }
  }

  private createBossSprite(boss: MobInstance): void {
    const center = getMapCenter(this.gameCore.getConfig().mapWidth, this.gameCore.getConfig().mapHeight);

    this.bossSprite = this.add.sprite(center.x, center.y, boss.mob.spriteKey);
    this.bossSprite.setScale(3);
    this.bossSprite.setDepth(60);

    // Boss glow effect
    this.tweens.add({
      targets: this.bossSprite,
      scaleX: 3.2,
      scaleY: 3.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private destroyBossSprite(): void {
    if (this.bossSprite) {
      this.tweens.add({
        targets: this.bossSprite,
        alpha: 0,
        scale: 5,
        duration: 500,
        onComplete: () => {
          this.bossSprite?.destroy();
          this.bossSprite = null;
        },
      });
    }
  }

  // ===== UI UPDATES =====

  private updateStatueHp(zone: PlayerZone, remainingHp: number): void {
    const config = this.gameCore.getConfig();
    const center = getZoneCenter(zone, config.mapWidth, config.mapHeight);
    const hpBar = this.statueHpBars.get(zone);

    if (hpBar) {
      hpBar.clear();
      const hpPercent = remainingHp / config.statueMaxHp;
      const color = hpPercent > 0.5 ? 0x2ecc71 : hpPercent > 0.25 ? 0xf1c40f : 0xe74c3c;
      hpBar.fillStyle(color, 1);
      hpBar.fillRect(center.x - 25, center.y - 44, 50 * hpPercent, 8);
    }

    // Update text if it's local player's zone
    const player = this.gameCore.getLocalPlayer();
    if (player?.zone === zone) {
      this.statueHpText.setText(`🏛️ ${remainingHp}/${config.statueMaxHp}`);
    }
  }

  private showBossIndicator(): void {
    if (this.bossIndicator) return;

    const { width } = this.cameras.main;
    this.bossIndicator = this.add.text(width / 2, 80, '⚠️ BOSS WAVE! ⚠️', {
      fontSize: '32px',
      color: '#ff4444',
      fontStyle: 'bold',
    });
    this.bossIndicator.setOrigin(0.5);
    this.bossIndicator.setDepth(100);

    // Pulsing effect
    this.tweens.add({
      targets: this.bossIndicator,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private hideBossIndicator(): void {
    if (this.bossIndicator) {
      this.bossIndicator.destroy();
      this.bossIndicator = null;
    }
  }

  // ===== WAVE SPAWNING =====

  private startWaveSpawning(wave: Wave): void {
    let spawnIndex = 0;
    const flatMobs: string[] = [];

    // Flatten mob list
    for (const waveMob of wave.mobs) {
      for (let i = 0; i < waveMob.count; i++) {
        flatMobs.push(waveMob.mobId);
      }
    }

    // Spawn timer - spawns mobs in local player's zone
    const player = this.gameCore.getLocalPlayer();
    if (!player) return;

    const spawnTimer = this.time.addEvent({
      delay: wave.spawnInterval,
      callback: () => {
        if (spawnIndex < flatMobs.length) {
          const mobId = flatMobs[spawnIndex];
          const waveMobData = wave.mobs.find(w => w.mobId === mobId);
          this.gameCore.spawnMob(mobId, player.zone, waveMobData?.statMultiplier);
          spawnIndex++;
        } else {
          spawnTimer.destroy();
        }
      },
      loop: true,
    });
  }

  // ===== BUTTON HANDLERS =====

  private onRollClick(): void {
    const player = this.gameCore.getLocalPlayer();
    if (player && this.gameCore.canRoll(player.playerId)) {
      this.gameCore.roll(player.playerId);
    }
  }

  private onStartWaveClick(): void {
    const state = this.gameCore.getState();
    if (!state.waveInProgress) {
      this.gameCore.startNextWave();
    }
  }

  // ===== GAME OVER =====

  private showGameOver(victory: boolean): void {
    const { width, height } = this.cameras.main;

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setDepth(200);

    // Result text
    const resultText = this.add.text(
      width / 2,
      height / 2 - 50,
      victory ? '🎉 승리!' : '💀 패배...',
      {
        fontSize: '64px',
        color: victory ? '#2ecc71' : '#e74c3c',
      }
    );
    resultText.setOrigin(0.5);
    resultText.setDepth(201);

    // Stats
    const state = this.gameCore.getState();
    const player = this.gameCore.getLocalPlayer();
    const statsText = this.add.text(
      width / 2,
      height / 2 + 30,
      `클리어 웨이브: ${state.currentWave}/${state.totalWaves}\n` +
      `석상 HP: ${player?.statue.hp ?? 0}/${player?.statue.maxHp ?? 0}\n` +
      `총 골드: ${player?.inventory.gold ?? 0}`,
      {
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      }
    );
    statsText.setOrigin(0.5);
    statsText.setDepth(201);

    // Restart button
    const restartBtn = this.add.text(width / 2, height / 2 + 120, '🔄 다시하기', {
      fontSize: '28px',
      color: '#ffffff',
      backgroundColor: '#3498db',
      padding: { x: 20, y: 10 },
    });
    restartBtn.setOrigin(0.5);
    restartBtn.setDepth(201);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  // ===== UPDATE LOOP =====

  update(_time: number, delta: number): void {
    // Update game core
    this.gameCore.update(delta);

    // Update mob positions along circular loops
    this.updateMobPositions();

    // Update hero movement
    this.updateHeroMovement(delta);

    // Process auto-attacks
    this.processAutoAttacks();

    // Update HP bars
    this.updateHpBars();
  }

  private updateMobPositions(): void {
    const state = this.gameCore.getState();
    const config = this.gameCore.getConfig();

    for (const mob of state.activeMobs) {
      if (mob.zone === 'center') continue;

      const sprite = this.mobSprites.get(mob.instanceId);
      if (!sprite) continue;

      // Get zone center for this mob
      const player = this.gameCore.getPlayerByZone(mob.zone);
      if (!player) continue;

      const center = player.statue.position;

      // Calculate position on square path
      const zoneSize = config.zoneSize ?? 800;
      const pathSize = zoneSize * 0.38;
      const progress = mob.pathProgress % 1;
      const side = Math.floor(progress * 4);
      const sideProgress = (progress * 4) % 1;

      let localX = 0, localY = 0, rotation = 0;
      switch (side) {
        case 0: // Top side (left to right)
          localX = -pathSize + sideProgress * pathSize * 2;
          localY = -pathSize;
          rotation = Math.PI / 2;
          break;
        case 1: // Right side (top to bottom)
          localX = pathSize;
          localY = -pathSize + sideProgress * pathSize * 2;
          rotation = Math.PI;
          break;
        case 2: // Bottom side (right to left)
          localX = pathSize - sideProgress * pathSize * 2;
          localY = pathSize;
          rotation = -Math.PI / 2;
          break;
        case 3: // Left side (bottom to top)
          localX = -pathSize;
          localY = pathSize - sideProgress * pathSize * 2;
          rotation = 0;
          break;
      }

      const x = center.x + localX;
      const y = center.y + localY;

      sprite.x = x;
      sprite.y = y;
      mob.position = { x, y };

      // Rotate sprite to face movement direction
      sprite.rotation = rotation;
    }
  }

  private updateHeroMovement(delta: number): void {
    if (!this.heroSprite || !this.heroMoveTarget) return;

    const player = this.gameCore.getLocalPlayer();
    if (!player?.hero) return;

    const speed = player.hero.currentStats.speed * 2; // pixels per second
    const dx = this.heroMoveTarget.x - this.heroSprite.x;
    const dy = this.heroMoveTarget.y - this.heroSprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      // Reached target
      this.heroMoveTarget = null;
      return;
    }

    // Move towards target
    const moveAmount = speed * (delta / 1000);
    const moveX = (dx / dist) * Math.min(moveAmount, dist);
    const moveY = (dy / dist) * Math.min(moveAmount, dist);

    this.heroSprite.x += moveX;
    this.heroSprite.y += moveY;

    // Update selection ring
    const ring = (this.heroSprite as any).selectionRing;
    if (ring) {
      ring.x = this.heroSprite.x;
      ring.y = this.heroSprite.y + 5;
    }

    // Update game core position
    this.gameCore.updateHeroPosition(player.playerId, this.heroSprite.x, this.heroSprite.y);
  }

  private processAutoAttacks(): void {
    const player = this.gameCore.getLocalPlayer();
    if (!player?.hero || !this.heroSprite) return;

    const state = this.gameCore.getState();
    const hero = player.hero;

    // Find nearest mob or boss in range
    let nearestTarget: MobInstance | null = null;
    let nearestDist = Infinity;

    // Check regular mobs
    for (const mob of state.activeMobs) {
      const dist = Phaser.Math.Distance.Between(
        this.heroSprite.x,
        this.heroSprite.y,
        mob.position.x,
        mob.position.y
      );

      if (dist < hero.currentStats.attackRange * 3 && dist < nearestDist) {
        nearestDist = dist;
        nearestTarget = mob;
      }
    }

    // Check central boss
    if (state.centralBoss) {
      const bossDist = Phaser.Math.Distance.Between(
        this.heroSprite.x,
        this.heroSprite.y,
        state.centralBoss.position.x,
        state.centralBoss.position.y
      );

      if (bossDist < hero.currentStats.attackRange * 3 && bossDist < nearestDist) {
        nearestTarget = state.centralBoss;
      }
    }

    // Attack if in range
    if (nearestTarget) {
      this.gameCore.dealDamage(
        hero.instanceId,
        nearestTarget.instanceId,
        hero.currentStats.atk
      );
    }
  }

  private updateHpBars(): void {
    const state = this.gameCore.getState();

    // Update mob HP bars
    for (const mob of state.activeMobs) {
      const hpBar = this.mobHpBars.get(mob.instanceId);
      if (hpBar) {
        hpBar.clear();
        const hpPercent = mob.currentStats.hp / mob.currentStats.maxHp;
        hpBar.fillStyle(0x333333, 1);
        hpBar.fillRect(mob.position.x - 15, mob.position.y - 25, 30, 4);
        hpBar.fillStyle(0xe74c3c, 1);
        hpBar.fillRect(mob.position.x - 15, mob.position.y - 25, 30 * hpPercent, 4);
      }
    }

    // Update boss HP bar
    if (state.centralBoss && this.bossSprite) {
      const boss = state.centralBoss;
      const hpPercent = boss.currentStats.hp / boss.currentStats.maxHp;

      // Draw boss HP bar at top of screen
      const { width } = this.cameras.main;
      const bossHpGraphics = this.children.getByName('bossHpBar') as Phaser.GameObjects.Graphics;

      if (!bossHpGraphics) {
        const hpBar = this.add.graphics();
        hpBar.setName('bossHpBar');
        hpBar.setDepth(100);
      }

      const hpBar = this.children.getByName('bossHpBar') as Phaser.GameObjects.Graphics;
      if (hpBar) {
        hpBar.clear();
        hpBar.fillStyle(0x333333, 1);
        hpBar.fillRect(width / 2 - 150, 110, 300, 15);
        hpBar.fillStyle(0x8e44ad, 1);
        hpBar.fillRect(width / 2 - 150, 110, 300 * hpPercent, 15);
      }
    }
  }
}
