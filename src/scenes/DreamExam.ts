import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PIXEL_SCALE,
  textStyle,
  DEPTH_HUD,
  hex,
  palette,
} from '../config';
import { t } from '../i18n';
import { applyWorldFX } from '../gfx/postfx';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../systems/InputManager';
import { DialogueBox } from '../systems/DialogueBox';
import { fadeIn, fadeToScene, showTitleCard, addPauseOverlay } from '../systems/ui';

const GROUND_Y = 452;
const PLAYER_X = 190;
const COURSE_LEN = 7000; // distancia total del sueño
const SEGMENTS = [0, 2400, 4700]; // checkpoints

type ObType = 'locker' | 'coffee' | 'paper' | 'bell' | 'firefly';

interface Spawn {
  worldX: number;
  y: number;
  type: ObType;
  id: number;
  sprite?: Phaser.GameObjects.Image;
  taken?: boolean;
}

/** Sueño 1: auto-runner por una escuela surrealista. */
export class DreamExam extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private iris!: Phaser.GameObjects.Sprite;
  private clock!: Phaser.GameObjects.Image;
  private wallTiles!: Phaser.GameObjects.TileSprite;
  private floorTiles!: Phaser.GameObjects.TileSprite;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private ffText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;

  private running = false;
  private finished = false;
  private dist = 0;
  private checkpoint = 0;
  private speed = 330;
  private vy = 0;
  private grounded = true;
  private sliding = 0; // tiempo restante de deslizamiento
  private invuln = 0;
  private spawns: Spawn[] = [];
  private fireflies = new Set<number>();
  private sectionShown = new Set<number>();

  constructor() {
    super('DreamExam');
  }

  create(): void {
    this.resetState();
    this.cameras.main.setBackgroundColor(0xffe9b3);
    applyWorldFX(this, 'exam');
    fadeIn(this);
    AudioManager.playMusic('exam');
    this.makePatternTextures();

    // Fondo: pared con ventanas y piso de losetas (parallax)
    this.wallTiles = this.add
      .tileSprite(GAME_WIDTH / 2, 240, GAME_WIDTH, 380, 'exam-wall')
      .setAlpha(0.95);
    this.floorTiles = this.add.tileSprite(
      GAME_WIDTH / 2,
      (GROUND_Y + GAME_HEIGHT) / 2 + 4,
      GAME_WIDTH,
      GAME_HEIGHT - GROUND_Y + 8,
      'exam-floor',
    );
    this.add.rectangle(GAME_WIDTH / 2, GROUND_Y + 2, GAME_WIDTH, 4, 0x8a5a2b);

    // Reloj gigante que "persigue" desde la izquierda
    this.clock = this.add.image(60, 300, 'clock').setScale(4).setDepth(60);
    this.tweens.add({
      targets: this.clock,
      y: 320,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Iris corriendo
    this.iris = this.add
      .sprite(PLAYER_X, GROUND_Y, 'iris')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setDepth(50);
    this.iris.play('iris-run');

    this.buildCourse();
    this.buildHud();

    this.dialogue = new DialogueBox(this, 0xff8c42);
    this.inp = new InputManager(this);
    this.inp.addTapAndSwipe(
      () => this.tryJump(),
      () => this.trySlide(),
    );
    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'));

    showTitleCard(this, t('exam.title'), t('exam.name'), () => {
      this.dialogue.say(
        [
          { who: null, text: t('exam.intro.1') },
          { who: null, text: t('exam.intro.2') },
        ],
        () => {
          this.showToast(this.inp.isTouch ? t('exam.hint') : t('exam.hintKeys'), 2600);
          this.running = true;
        },
      );
    });
  }

  private resetState(): void {
    this.running = false;
    this.finished = false;
    this.dist = 0;
    this.checkpoint = 0;
    this.speed = 330;
    this.vy = 0;
    this.grounded = true;
    this.sliding = 0;
    this.invuln = 0;
    this.spawns = [];
    this.fireflies.clear();
    this.sectionShown.clear();
  }

  /** Texturas de patrón (pared con ventanas, piso) generadas al vuelo. */
  private makePatternTextures(): void {
    if (!this.textures.exists('exam-wall')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffd98a);
      g.fillRect(0, 0, 240, 380);
      g.fillStyle(0xffc46b);
      g.fillRect(0, 300, 240, 80);
      // ventana
      g.fillStyle(0xaee6ff);
      g.fillRect(40, 60, 90, 110);
      g.lineStyle(6, 0xb8742c);
      g.strokeRect(40, 60, 90, 110);
      g.lineBetween(85, 60, 85, 170);
      // cartel torcido
      g.fillStyle(0xfff3d0);
      g.fillRect(160, 90, 50, 64);
      g.lineStyle(4, 0xb8742c);
      g.strokeRect(160, 90, 50, 64);
      g.generateTexture('exam-wall', 240, 380);
      g.destroy();
    }
    if (!this.textures.exists('coffee')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x4a2a12);
      g.fillEllipse(14, 8, 28, 7);
      g.fillStyle(0x6b3e1f);
      g.fillEllipse(14, 7, 24, 5);
      g.fillStyle(0x8a5a3a);
      g.fillEllipse(11, 6, 10, 2);
      // taza volcada
      g.fillStyle(0xffffff);
      g.fillRect(20, 0, 8, 6);
      g.lineStyle(1, 0x999999);
      g.strokeRect(20, 0, 8, 6);
      g.generateTexture('coffee', 30, 12);
      g.destroy();
    }
    if (!this.textures.exists('exam-floor')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xc98d4a);
      g.fillRect(0, 0, 96, 96);
      g.fillStyle(0xb87a3a);
      g.fillRect(0, 0, 48, 48);
      g.fillRect(48, 48, 48, 48);
      g.generateTexture('exam-floor', 96, 96);
      g.destroy();
    }
  }

  /** Diseña el recorrido completo: obstáculos y luciérnagas. */
  private buildCourse(): void {
    let id = 0;
    const add = (worldX: number, type: ObType, y = 0) => {
      this.spawns.push({ worldX, type, y, id: id++ });
    };

    // Patrón de cada tramo: [offset, tipo] — alterna saltar/deslizar con aire
    // suficiente entre obstáculos (el salto dura ~0.85 s en el aire)
    const seg1: [number, ObType][] = [
      [600, 'coffee'],
      [1050, 'paper'],
      [1500, 'locker'],
      [1950, 'coffee'],
      [2300, 'bell'],
    ];
    const seg2: [number, ObType][] = [
      [2750, 'locker'],
      [3200, 'paper'],
      [3650, 'coffee'],
      [4090, 'bell'],
      [4530, 'locker'],
    ];
    const seg3: [number, ObType][] = [
      [5000, 'bell'],
      [5490, 'locker'],
      [5980, 'paper'],
      [6460, 'coffee'],
      [6800, 'bell'],
    ];
    [...seg1, ...seg2, ...seg3].forEach(([x, type]) => add(x, type));

    // Luciérnagas de memoria: en arcos de salto o pasillos seguros
    [820, 1720, 2980, 3870, 5240, 6230].forEach((x) => add(x, 'firefly', GROUND_Y - 150));
  }

  private buildHud(): void {
    // Barra de progreso hacia el aula
    this.add
      .rectangle(GAME_WIDTH / 2, 26, 420, 12, 0x0d0a1e, 0.35)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setStrokeStyle(2, 0x8a5a2b);
    this.progressFill = this.add
      .rectangle(GAME_WIDTH / 2 - 208, 26, 414, 8, 0xff8c42)
      .setOrigin(0, 0.5)
      .setScale(0.005, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);
    this.add
      .text(GAME_WIDTH / 2 + 224, 26, '🏫', textStyle(16))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);

    this.add.image(24, 26, 'glow-gold').setScale(1).setScrollFactor(0).setDepth(DEPTH_HUD);
    this.ffText = this.add
      .text(42, 26, '0/6', textStyle(15, '#8a5a2b'))
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);

    this.toast = this.add
      .text(
        GAME_WIDTH / 2,
        120,
        '',
        textStyle(18, '#8a5a2b', {
          align: 'center',
          backgroundColor: '#fff3d0dd',
          padding: { x: 12, y: 6 },
        }),
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setVisible(false);
  }

  private showToast(text: string, ms = 1800): void {
    this.toast.setText(text).setVisible(true).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 400 });
  }

  private tryJump(): void {
    if (!this.running || this.pause.paused() || this.dialogue.active) return;
    if (this.grounded && this.sliding <= 0) {
      this.vy = -640;
      this.grounded = false;
      AudioManager.sfx('jump');
    }
  }

  private trySlide(): void {
    if (!this.running || this.pause.paused() || this.dialogue.active) return;
    if (this.grounded && this.sliding <= 0) {
      this.sliding = 0.55;
      AudioManager.sfx('slide');
    }
  }

  update(_time: number, deltaMs: number): void {
    this.inp.update();
    if (this.inp.justDown('jump')) this.tryJump();
    if (this.inp.justDown('down')) this.trySlide();
    if (!this.running || this.pause.paused() || this.dialogue.active) return;

    const dt = Math.min(deltaMs / 1000, 0.05);
    this.dist += this.speed * dt;

    // Parallax
    this.wallTiles.tilePositionX += this.speed * dt * 0.5;
    this.floorTiles.tilePositionX += this.speed * dt;

    // Física del salto
    if (!this.grounded) {
      this.vy += 1500 * dt;
      this.iris.y += this.vy * dt;
      if (this.iris.y >= GROUND_Y) {
        this.iris.y = GROUND_Y;
        this.grounded = true;
        this.vy = 0;
      }
    }

    // Estados visuales
    if (this.sliding > 0) {
      this.sliding -= dt;
      this.iris.setTexture('iris-slide');
      this.iris.anims.stop();
    } else if (!this.grounded) {
      this.iris.setTexture('iris', '4');
      this.iris.anims.stop();
    } else if (!this.iris.anims.isPlaying) {
      this.iris.play('iris-run');
    }
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.iris.setAlpha(Math.sin(this.dist * 0.3) > 0 ? 0.35 : 0.9);
    } else {
      this.iris.setAlpha(1);
    }

    this.updateSpawns();
    this.updateProgressAndSections();
    this.checkCollisions();
    if (this.dist >= COURSE_LEN && !this.finished) this.finish();
  }

  private updateSpawns(): void {
    for (const s of this.spawns) {
      const screenX = s.worldX - this.dist + PLAYER_X;
      if (screenX < -120 || s.taken) {
        s.sprite?.setVisible(false);
        continue;
      }
      if (screenX > GAME_WIDTH + 120) {
        s.sprite?.setVisible(false);
        continue;
      }
      if (!s.sprite) s.sprite = this.makeObstacleSprite(s);
      s.sprite.setVisible(true);
      s.sprite.x = screenX;
    }
  }

  private makeObstacleSprite(s: Spawn): Phaser.GameObjects.Image {
    switch (s.type) {
      case 'locker': {
        const img = this.add
          .image(0, GROUND_Y, 'locker')
          .setOrigin(0.5, 1)
          .setScale(PIXEL_SCALE * 0.8)
          .setDepth(40);
        return img;
      }
      case 'coffee': {
        const img = this.add
          .image(0, GROUND_Y + 2, 'coffee')
          .setOrigin(0.5, 1)
          .setScale(PIXEL_SCALE)
          .setDepth(40);
        return img;
      }
      case 'paper': {
        const img = this.add
          .image(0, GROUND_Y - 118, 'paper')
          .setScale(PIXEL_SCALE)
          .setDepth(40);
        this.tweens.add({ targets: img, angle: 360, duration: 1400, repeat: -1 });
        return img;
      }
      case 'bell': {
        const img = this.add
          .image(0, GROUND_Y - 128, 'bell')
          .setScale(PIXEL_SCALE)
          .setDepth(40);
        this.tweens.add({
          targets: img,
          angle: { from: -14, to: 14 },
          duration: 380,
          yoyo: true,
          repeat: -1,
        });
        return img;
      }
      case 'firefly': {
        const img = this.add.image(0, s.y, 'glow-gold').setScale(1.5).setDepth(45);
        this.tweens.add({
          targets: img,
          y: s.y - 14,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
        return img;
      }
    }
  }

  /** Cajas de colisión del jugador y del obstáculo. */
  private checkCollisions(): void {
    const px = PLAYER_X;
    const playerRect =
      this.sliding > 0
        ? new Phaser.Geom.Rectangle(px - 30, GROUND_Y - 36, 60, 36)
        : new Phaser.Geom.Rectangle(px - 16, this.iris.y - 66, 32, 64);

    for (const s of this.spawns) {
      if (s.taken || !s.sprite || !s.sprite.visible) continue;
      const sx = s.sprite.x;
      let rect: Phaser.Geom.Rectangle;
      switch (s.type) {
        case 'locker':
          rect = new Phaser.Geom.Rectangle(sx - 14, GROUND_Y - 58, 28, 58);
          break;
        case 'coffee':
          rect = new Phaser.Geom.Rectangle(sx - 18, GROUND_Y - 10, 36, 10);
          break;
        case 'paper':
          rect = new Phaser.Geom.Rectangle(sx - 12, GROUND_Y - 130, 24, 26);
          break;
        case 'bell':
          rect = new Phaser.Geom.Rectangle(sx - 15, GROUND_Y - 142, 30, 32);
          break;
        case 'firefly':
          rect = new Phaser.Geom.Rectangle(sx - 20, (s.sprite.y ?? s.y) - 20, 40, 40);
          break;
      }
      if (!Phaser.Geom.Intersects.RectangleToRectangle(playerRect, rect)) continue;

      if (s.type === 'firefly') {
        s.taken = true;
        s.sprite.setVisible(false);
        this.fireflies.add(s.id);
        this.ffText.setText(`${this.fireflies.size}/6`);
        AudioManager.sfx('collect');
      } else if (this.invuln <= 0) {
        this.stumble();
        return;
      }
    }
  }

  private stumble(): void {
    AudioManager.sfx('hit');
    this.cameras.main.shake(220, 0.012);
    this.cameras.main.flash(160, 255, 120, 80);
    // Vuelve al último checkpoint
    this.dist = this.checkpoint;
    this.invuln = 1.6;
    this.vy = 0;
    this.iris.y = GROUND_Y;
    this.grounded = true;
    this.sliding = 0;
    this.showToast(t('exam.fail'), 1400);
    // El reloj se acerca amenazante un momento
    this.tweens.add({ targets: this.clock, x: 120, duration: 300, yoyo: true, hold: 500 });
  }

  private updateProgressAndSections(): void {
    const p = Math.min(this.dist / COURSE_LEN, 1);
    this.progressFill.setScale(Math.max(p, 0.005), 1);

    SEGMENTS.forEach((segStart, i) => {
      if (i === 0) return;
      if (this.dist >= segStart && !this.sectionShown.has(i)) {
        this.sectionShown.add(i);
        this.checkpoint = segStart;
        this.speed = 330 + i * 32;
        AudioManager.sfx('ring');
        this.showToast(i === 1 ? t('exam.section2') : t('exam.section3'), 1800);
      }
    });
  }

  private finish(): void {
    this.finished = true;
    this.running = false;
    this.iris.play('iris-idle');

    // El aula: una puerta al final del pasillo
    const door = this.add
      .image(GAME_WIDTH + 90, GROUND_Y, 'door')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setTint(0xffb020)
      .setDepth(30);
    this.tweens.add({ targets: door, x: PLAYER_X + 240, duration: 900, ease: 'Sine.out' });
    this.tweens.add({
      targets: this.iris,
      x: PLAYER_X + 160,
      duration: 1100,
      delay: 500,
      onComplete: () => {
        AudioManager.sfx('door');
        this.dialogue.say(
          [
            { who: 'iris', text: t('exam.win.1') },
            { who: 'iris', text: t('exam.win.2') },
            { who: 'morfeo', text: t('exam.win.3') },
            { who: 'morfeo', text: t('exam.win.4') },
          ],
          () => this.giveKey(),
        );
      },
    });
  }

  private giveKey(): void {
    const key = this.add
      .image(this.iris.x, this.iris.y - 160, 'key')
      .setScale(5)
      .setDepth(70)
      .setAlpha(0);
    this.add
      .image(this.iris.x, this.iris.y - 160, 'glow-gold')
      .setScale(4)
      .setDepth(69)
      .setAlpha(0.5);
    AudioManager.sfx('key');
    this.tweens.add({
      targets: key,
      alpha: 1,
      y: this.iris.y - 120,
      duration: 800,
      ease: 'Bounce.out',
    });
    this.add
      .text(
        GAME_WIDTH / 2,
        150,
        t('exam.keyGet'),
        textStyle(24, '#8a5a2b', {
          fontStyle: 'bold',
          backgroundColor: '#fff3d0ee',
          padding: { x: 14, y: 8 },
        }),
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);
    // El objeto concreto que se devuelve: la historia vive en los detalles
    this.add
      .text(GAME_WIDTH / 2, 190, t('exam.fragment'), {
        ...textStyle(14, hex(palette('exam').ink), {
          align: 'center',
          wordWrap: { width: 560 },
        }),
        backgroundColor: hex(palette('exam').paper) + 'ee',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);
    SaveManager.giveKey('exam');
    SaveManager.recordFireflies('exam', this.fireflies.size);
    AudioManager.sfx('win');
    this.time.delayedCall(2600, () => fadeToScene(this, 'Hub', undefined, 800));
  }
}
