import Phaser from 'phaser';

/**
 * PreloadScene - Load all game assets
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const { width, height } = this.cameras.main;

    // Loading UI
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 60, '에셋 로딩 중...', {
      fontSize: '24px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff',
    });
    percentText.setOrigin(0.5);

    const assetText = this.add.text(width / 2, height / 2 + 50, '', {
      fontSize: '14px',
      color: '#aaaaaa',
    });
    assetText.setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xe74c3c, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
      percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('fileprogress', (file: { key: string }) => {
      assetText.setText(`Loading: ${file.key}`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();
    });

    // ===== LOAD ASSETS =====

    // 실제 스프라이트 시트 로드
    this.load.spritesheet('mob_corruption_small', 'assets/sprites/mob_corruption_small.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('mob_corruption_small_back', 'assets/sprites/mob_corruption_small_back.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('mob_corruption_small_left', 'assets/sprites/mob_corruption_small_left.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('mob_corruption_small_right', 'assets/sprites/mob_corruption_small_right.png', {
      frameWidth: 256,
      frameHeight: 256,
    });

    // Placeholder sprites (나머지 자리는 추후 교체 예정)
    this.createPlaceholderSprites();

    // Load map/tileset (when available)
    // this.load.tilemapTiledJSON('map', 'assets/maps/defense_map.json');
    // this.load.image('tiles', 'assets/maps/tileset.png');

    // Load UI elements
    // this.load.image('button', 'assets/ui/button.png');
    // this.load.image('panel', 'assets/ui/panel.png');

    // Load sounds (when available)
    // this.load.audio('bgm', 'assets/sounds/bgm.mp3');
    // this.load.audio('attack', 'assets/sounds/attack.wav');
  }

  /**
   * Create placeholder graphics as sprites
   * These will be replaced with actual sprite sheets later
   */
  private createPlaceholderSprites(): void {
    // Character placeholder (blue square)
    const charGraphics = this.make.graphics({ x: 0, y: 0 });
    charGraphics.fillStyle(0x3498db, 1);
    charGraphics.fillRect(0, 0, 32, 32);
    charGraphics.generateTexture('placeholder_char', 32, 32);
    charGraphics.destroy();

    // Mob placeholder (red circle)
    const mobGraphics = this.make.graphics({ x: 0, y: 0 });
    mobGraphics.fillStyle(0xe74c3c, 1);
    mobGraphics.fillCircle(16, 16, 16);
    mobGraphics.generateTexture('placeholder_mob', 32, 32);
    mobGraphics.destroy();

    // Elite mob (larger red circle)
    const eliteGraphics = this.make.graphics({ x: 0, y: 0 });
    eliteGraphics.fillStyle(0xc0392b, 1);
    eliteGraphics.fillCircle(24, 24, 24);
    eliteGraphics.generateTexture('placeholder_elite', 48, 48);
    eliteGraphics.destroy();

    // Boss mob (even larger)
    const bossGraphics = this.make.graphics({ x: 0, y: 0 });
    bossGraphics.fillStyle(0x8e44ad, 1);
    bossGraphics.fillCircle(32, 32, 32);
    bossGraphics.generateTexture('placeholder_boss', 64, 64);
    bossGraphics.destroy();

    // Party-specific placeholders
    // 국힘 (blue shades)
    const kukGraphics = this.make.graphics({ x: 0, y: 0 });
    kukGraphics.fillStyle(0x2980b9, 1);
    kukGraphics.fillRect(0, 0, 32, 32);
    kukGraphics.generateTexture('kuk_common', 32, 32);
    kukGraphics.clear();
    kukGraphics.fillStyle(0x3498db, 1);
    kukGraphics.fillRect(0, 0, 36, 36);
    kukGraphics.generateTexture('kuk_special', 36, 36);
    kukGraphics.clear();
    kukGraphics.fillStyle(0x1abc9c, 1);
    kukGraphics.fillRect(0, 0, 40, 40);
    kukGraphics.generateTexture('kuk_rare', 40, 40);
    kukGraphics.destroy();

    // 민주 (orange/yellow shades)
    const minGraphics = this.make.graphics({ x: 0, y: 0 });
    minGraphics.fillStyle(0xf39c12, 1);
    minGraphics.fillRect(0, 0, 32, 32);
    minGraphics.generateTexture('min_common', 32, 32);
    minGraphics.clear();
    minGraphics.fillStyle(0xe67e22, 1);
    minGraphics.fillRect(0, 0, 36, 36);
    minGraphics.generateTexture('min_special', 36, 36);
    minGraphics.clear();
    minGraphics.fillStyle(0xd35400, 1);
    minGraphics.fillRect(0, 0, 40, 40);
    minGraphics.generateTexture('min_rare', 40, 40);
    minGraphics.destroy();

    // Unique character placeholders
    // 안철수 evolution line
    const ahnGraphics = this.make.graphics({ x: 0, y: 0 });
    ahnGraphics.fillStyle(0x9b59b6, 1);
    ahnGraphics.fillRect(0, 0, 32, 32);
    ahnGraphics.generateTexture('ahn_professor', 32, 32);
    ahnGraphics.clear();
    ahnGraphics.fillStyle(0x8e44ad, 1);
    ahnGraphics.fillRect(0, 0, 36, 36);
    ahnGraphics.generateTexture('ahn_ceo', 36, 36);
    ahnGraphics.clear();
    ahnGraphics.fillStyle(0x7d3c98, 1);
    ahnGraphics.fillRect(0, 0, 40, 40);
    ahnGraphics.generateTexture('ahn_candidate', 40, 40);
    ahnGraphics.clear();
    ahnGraphics.fillStyle(0x6c3483, 1);
    ahnGraphics.fillRect(0, 0, 44, 44);
    ahnGraphics.generateTexture('ahn_assemblyman', 44, 44);
    ahnGraphics.clear();
    ahnGraphics.fillStyle(0x5b2c6f, 1);
    ahnGraphics.fillRect(0, 0, 48, 48);
    ahnGraphics.generateTexture('ahn_presidential', 48, 48);
    ahnGraphics.destroy();

    // 이재명 evolution line
    const leeGraphics = this.make.graphics({ x: 0, y: 0 });
    leeGraphics.fillStyle(0x27ae60, 1);
    leeGraphics.fillRect(0, 0, 32, 32);
    leeGraphics.generateTexture('lee_lawyer', 32, 32);
    leeGraphics.clear();
    leeGraphics.fillStyle(0x229954, 1);
    leeGraphics.fillRect(0, 0, 36, 36);
    leeGraphics.generateTexture('lee_mayor', 36, 36);
    leeGraphics.clear();
    leeGraphics.fillStyle(0x1e8449, 1);
    leeGraphics.fillRect(0, 0, 40, 40);
    leeGraphics.generateTexture('lee_governor', 40, 40);
    leeGraphics.clear();
    leeGraphics.fillStyle(0x196f3d, 1);
    leeGraphics.fillRect(0, 0, 44, 44);
    leeGraphics.generateTexture('lee_leader', 44, 44);
    leeGraphics.clear();
    leeGraphics.fillStyle(0x145a32, 1);
    leeGraphics.fillRect(0, 0, 48, 48);
    leeGraphics.generateTexture('lee_presidential', 48, 48);
    leeGraphics.destroy();

    // Mob placeholders (실제 에셋 없는 항목만 유지)
    const mobPlaceholders = this.make.graphics({ x: 0, y: 0 });
    mobPlaceholders.fillStyle(0xc0392b, 1);
    mobPlaceholders.fillCircle(16, 16, 16);
    mobPlaceholders.generateTexture('mob_scandal', 32, 32);
    mobPlaceholders.clear();
    mobPlaceholders.fillStyle(0x95a5a6, 1);
    mobPlaceholders.fillCircle(14, 14, 14);
    mobPlaceholders.generateTexture('mob_fake_news', 28, 28);
    mobPlaceholders.clear();
    mobPlaceholders.fillStyle(0x922b21, 1);
    mobPlaceholders.fillCircle(24, 24, 24);
    mobPlaceholders.generateTexture('mob_corruption_large', 48, 48);
    mobPlaceholders.clear();
    mobPlaceholders.fillStyle(0x7b241c, 1);
    mobPlaceholders.fillCircle(20, 20, 20);
    mobPlaceholders.generateTexture('mob_lobbying', 40, 40);
    mobPlaceholders.clear();
    mobPlaceholders.fillStyle(0x641e16, 1);
    mobPlaceholders.fillCircle(32, 32, 32);
    mobPlaceholders.generateTexture('mob_major_scandal', 64, 64);
    mobPlaceholders.clear();
    mobPlaceholders.fillStyle(0x4a235a, 1);
    mobPlaceholders.fillCircle(40, 40, 40);
    mobPlaceholders.generateTexture('mob_impeachment', 80, 80);
    mobPlaceholders.destroy();
  }

  private createAnimations(): void {
    const makeRun = (key: string, animKey: string) => {
      if (this.textures.exists(key) && !this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: 19 }),
          frameRate: 12,
          repeat: -1,
        });
      }
    };

    // 기본(정면) 러닝 + 방향별 러닝
    makeRun('mob_corruption_small', 'mob_corruption_small_run');
    makeRun('mob_corruption_small_back', 'mob_corruption_small_run_back');
    makeRun('mob_corruption_small_left', 'mob_corruption_small_run_left');
    makeRun('mob_corruption_small_right', 'mob_corruption_small_run_right');
  }

  create(): void {
    // 실제 스프라이트 애니메이션 등록
    this.createAnimations();

    // Go to main menu or directly to game
    this.scene.start('GameScene');
  }
}
