import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PIXEL_SCALE, textStyle, DEPTH_HUD } from '../config';
import { t } from '../i18n';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../systems/InputManager';
import { DialogueBox } from '../systems/DialogueBox';
import { fadeIn, fadeToScene, showTitleCard, addPauseOverlay } from '../systems/ui';

const PLAYER_Y = 170;
const FALL_LEN = 22000; // profundidad total en px (1 m = 10 px)
const CHECKPOINTS = [0, 7500, 15000];

type ObType = 'clock' | 'door' | 'window' | 'firefly' | 'ring';

interface Spawn {
  depth: number;
  x: number;
  type: ObType;
  id: number;
  drift: number;
  sprite?: Phaser.GameObjects.Image;
  taken?: boolean;
}

/** Sueño 2: caes por un cielo nocturno infinito esquivando restos de sueños. */
export class DreamFall extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private iris!: Phaser.GameObjects.Sprite;
  private starsFar!: Phaser.GameObjects.TileSprite;
  private starsNear!: Phaser.GameObjects.TileSprite;
  private depthText!: Phaser.GameObjects.Text;
  private ffText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private toast!: Phaser.GameObjects.Text;

  private running = false;
  private finished = false;
  private depth = 0;
  private hp = 3;
  private invuln = 0;
  private slowUntil = 0;
  private spawns: Spawn[] = [];
  private fireflies = new Set<number>();

  constructor() {
    super('DreamFall');
  }

  create(): void {
    this.resetState();
    this.cameras.main.setBackgroundColor(0x0d0a2e);
    fadeIn(this);
    AudioManager.playMusic('fall');
    this.makeTextures();

    // Cielo con dos capas de estrellas subiendo (sensación de caer)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d0a2e);
    const grad = this.add.graphics();
    grad.fillGradientStyle(0x0d0a2e, 0x0d0a2e, 0x241a55, 0x241a55, 1);
    grad.fillRect(0, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT / 2);
    this.starsFar = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'fall-stars').setAlpha(0.5);
    this.starsNear = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'fall-stars').setAlpha(0.9).setTileScale(1.8);

    // Luna
    this.add.image(790, 100, 'glow-white').setScale(7).setAlpha(0.25);
    this.add.circle(790, 100, 34, 0xfff3d0, 0.9);
    this.add.circle(778, 92, 8, 0xe8dcc0, 0.9);
    this.add.circle(800, 112, 5, 0xe8dcc0, 0.9);

    // Iris cayendo
    this.iris = this.add.sprite(GAME_WIDTH / 2, PLAYER_Y, 'iris-fall').setScale(PIXEL_SCALE).setDepth(50);
    this.iris.play('iris-falling');
    // Estela de viento
    this.add.particles(0, 0, 'px', {
      follow: this.iris,
      followOffset: { x: 0, y: -40 },
      speedY: { min: -180, max: -260 },
      speedX: { min: -20, max: 20 },
      lifespan: 500,
      alpha: { start: 0.35, end: 0 },
      scale: { start: 1, end: 0.4 },
      tint: 0x9d7bff,
      frequency: 60,
    });

    this.buildCourse();
    this.buildHud();

    this.dialogue = new DialogueBox(this);
    this.inp = new InputManager(this);
    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'));

    showTitleCard(this, t('fall.title'), t('fall.name'), () => {
      this.dialogue.say([{ who: null, text: t('fall.intro.1') }], () => {
        this.showToast(this.inp.isTouch ? t('fall.hint') : t('fall.hintKeys'), 2600);
        this.running = true;
      });
    });
  }

  private resetState(): void {
    this.running = false;
    this.finished = false;
    this.depth = 0;
    this.hp = 3;
    this.invuln = 0;
    this.slowUntil = 0;
    this.spawns = [];
    this.fireflies.clear();
    this.hearts = [];
  }

  private makeTextures(): void {
    if (!this.textures.exists('fall-stars')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      const rnd = new Phaser.Math.RandomDataGenerator(['duermevela']);
      for (let i = 0; i < 40; i++) {
        const a = rnd.realInRange(0.2, 0.9);
        g.fillStyle(0xffffff, a);
        g.fillRect(rnd.between(0, 255), rnd.between(0, 255), 2, 2);
      }
      g.generateTexture('fall-stars', 256, 256);
      g.destroy();
    }
    if (!this.textures.exists('ring')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.lineStyle(5, 0x86f7ff, 0.9);
      g.strokeEllipse(60, 24, 110, 38);
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeEllipse(60, 24, 96, 30);
      g.generateTexture('ring', 120, 48);
      g.destroy();
    }
    if (!this.textures.exists('cloud')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xf3ecff, 1);
      g.fillEllipse(70, 46, 130, 34);
      g.fillEllipse(40, 34, 60, 30);
      g.fillEllipse(95, 30, 70, 32);
      g.fillStyle(0xd8c8f8, 1);
      g.fillEllipse(70, 54, 126, 18);
      g.generateTexture('cloud', 140, 64);
      g.destroy();
    }
  }

  /** Genera el recorrido: obstáculos procedurales + luciérnagas y anillos fijos. */
  private buildCourse(): void {
    let id = 0;
    const rnd = new Phaser.Math.RandomDataGenerator([String(Date.now())]);
    const types: ObType[] = ['clock', 'door', 'window'];

    for (let d = 900; d < FALL_LEN - 600; d += rnd.between(300, 460)) {
      this.spawns.push({
        depth: d,
        x: rnd.between(90, GAME_WIDTH - 90),
        type: types[rnd.between(0, 2)],
        drift: rnd.realInRange(-40, 40),
        id: id++,
      });
    }
    // Anillos de viento que frenan la caída
    for (const d of [3200, 6500, 9800, 13200, 16500, 19500]) {
      this.spawns.push({ depth: d, x: rnd.between(150, GAME_WIDTH - 150), type: 'ring', drift: 0, id: id++ });
    }
    // Luciérnagas de memoria (8)
    [1800, 4300, 6900, 9200, 11800, 14600, 17400, 20200].forEach((d) => {
      this.spawns.push({ depth: d, x: rnd.between(120, GAME_WIDTH - 120), type: 'firefly', drift: 0, id: id++ });
    });
  }

  private buildHud(): void {
    this.depthText = this.add
      .text(GAME_WIDTH / 2, 26, '0 m', textStyle(18, '#cfc4ff'))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);
    for (let i = 0; i < 3; i++) {
      this.hearts.push(
        this.add.image(26 + i * 30, 26, 'heart').setScale(2.4).setScrollFactor(0).setDepth(DEPTH_HUD),
      );
    }
    this.add.image(26, 60, 'glow-gold').setScale(0.9).setScrollFactor(0).setDepth(DEPTH_HUD);
    this.ffText = this.add
      .text(44, 60, '0/8', textStyle(15, '#ffd166'))
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);
    this.toast = this.add
      .text(GAME_WIDTH / 2, 110, '', textStyle(17, '#cfc4ff', { align: 'center', backgroundColor: '#0d0a2ecc', padding: { x: 12, y: 6 } }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setVisible(false);
  }

  private showToast(text: string, ms = 1800): void {
    this.toast.setText(text).setVisible(true).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 400 });
  }

  update(time: number, deltaMs: number): void {
    this.inp.update();
    if (!this.running || this.pause.paused() || this.dialogue.active) return;
    const dt = Math.min(deltaMs / 1000, 0.05);

    // Velocidad de caída (los anillos la frenan un momento)
    const base = 300 + 160 * Math.min(this.depth / FALL_LEN, 1);
    const speed = time < this.slowUntil ? base * 0.45 : base;
    this.depth += speed * dt;

    // Movimiento horizontal: teclas o arrastrar el dedo/mouse
    const hSpeed = 420;
    let vx = 0;
    if (this.inp.isDown('left')) vx = -hSpeed;
    else if (this.inp.isDown('right')) vx = hSpeed;
    const p = this.input.activePointer;
    if (p.isDown && p.y > 60) {
      const dx = p.x - this.iris.x;
      vx = Phaser.Math.Clamp(dx * 6, -hSpeed, hSpeed);
    }
    this.iris.x = Phaser.Math.Clamp(this.iris.x + vx * dt, 40, GAME_WIDTH - 40);
    this.iris.setAngle(vx * 0.02);

    // Fondo
    this.starsFar.tilePositionY -= speed * dt * 0.25;
    this.starsNear.tilePositionY -= speed * dt * 0.6;

    if (this.invuln > 0) {
      this.invuln -= dt;
      this.iris.setAlpha(Math.sin(time * 0.03) > 0 ? 0.35 : 0.9);
    } else {
      this.iris.setAlpha(1);
    }

    this.updateSpawns(dt, speed);
    this.checkCollisions(time);

    this.depthText.setText(t('fall.depth', { n: Math.floor(this.depth / 10) }));
    if (this.depth >= FALL_LEN && !this.finished) this.finish();
  }

  private updateSpawns(dt: number, speed: number): void {
    for (const s of this.spawns) {
      // pantalla: el objeto está a (depth objeto - depth jugador) por debajo
      const screenY = s.depth - this.depth + PLAYER_Y;
      if (screenY < -140 || s.taken) {
        s.sprite?.setVisible(false);
        continue;
      }
      if (screenY > GAME_HEIGHT + 140) {
        s.sprite?.setVisible(false);
        continue;
      }
      if (!s.sprite) s.sprite = this.makeSprite(s);
      s.sprite.setVisible(true);
      if (s.drift !== 0) {
        s.x += s.drift * dt;
        if (s.x < 60 || s.x > GAME_WIDTH - 60) s.drift *= -1;
      }
      s.sprite.setPosition(s.x, screenY);
      void speed;
    }
  }

  private makeSprite(s: Spawn): Phaser.GameObjects.Image {
    switch (s.type) {
      case 'clock': {
        const img = this.add.image(s.x, 0, 'clock').setScale(PIXEL_SCALE).setDepth(40).setTint(0xb8a8ff);
        this.tweens.add({ targets: img, angle: { from: -12, to: 12 }, duration: 900, yoyo: true, repeat: -1 });
        return img;
      }
      case 'door':
        return this.add.image(s.x, 0, 'door').setScale(PIXEL_SCALE * 0.9).setDepth(40).setTint(0x8f7bff).setAngle(Phaser.Math.Between(-20, 20));
      case 'window':
        return this.add.image(s.x, 0, 'window').setScale(PIXEL_SCALE * 0.9).setDepth(40).setAngle(Phaser.Math.Between(-15, 15));
      case 'ring': {
        const img = this.add.image(s.x, 0, 'ring').setScale(1.4).setDepth(35).setAlpha(0.9);
        this.tweens.add({ targets: img, scale: 1.55, duration: 700, yoyo: true, repeat: -1 });
        return img;
      }
      case 'firefly': {
        const img = this.add.image(s.x, 0, 'glow-gold').setScale(1.6).setDepth(45);
        this.tweens.add({ targets: img, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });
        return img;
      }
    }
  }

  private checkCollisions(time: number): void {
    const playerRect = new Phaser.Geom.Rectangle(this.iris.x - 18, this.iris.y - 28, 36, 56);
    for (const s of this.spawns) {
      if (s.taken || !s.sprite || !s.sprite.visible) continue;
      const sy = s.sprite.y;
      let rect: Phaser.Geom.Rectangle;
      switch (s.type) {
        case 'clock':
          rect = new Phaser.Geom.Rectangle(s.x - 24, sy - 24, 48, 48);
          break;
        case 'door':
          rect = new Phaser.Geom.Rectangle(s.x - 26, sy - 40, 52, 80);
          break;
        case 'window':
          rect = new Phaser.Geom.Rectangle(s.x - 22, sy - 30, 44, 60);
          break;
        case 'ring':
          rect = new Phaser.Geom.Rectangle(s.x - 70, sy - 20, 140, 40);
          break;
        case 'firefly':
          rect = new Phaser.Geom.Rectangle(s.x - 22, sy - 22, 44, 44);
          break;
      }
      if (!Phaser.Geom.Intersects.RectangleToRectangle(playerRect, rect)) continue;

      if (s.type === 'firefly') {
        s.taken = true;
        s.sprite.setVisible(false);
        this.fireflies.add(s.id);
        this.ffText.setText(`${this.fireflies.size}/8`);
        AudioManager.sfx('collect');
      } else if (s.type === 'ring') {
        s.taken = true;
        this.tweens.add({ targets: s.sprite, scale: 2.4, alpha: 0, duration: 500, onComplete: () => s.sprite?.setVisible(false) });
        this.slowUntil = time + 1700;
        AudioManager.sfx('ring');
        this.showToast(t('fall.ring'), 1200);
      } else if (this.invuln <= 0) {
        this.hit();
        return;
      }
    }
  }

  private hit(): void {
    AudioManager.sfx('hit');
    this.cameras.main.shake(200, 0.012);
    this.hp -= 1;
    this.hearts.forEach((h, i) => h.setAlpha(i < this.hp ? 1 : 0.2));
    this.invuln = 1.5;
    if (this.hp <= 0) {
      // El cielo te recoge: vuelves al último checkpoint
      this.depth = CHECKPOINTS.filter((c) => c <= this.depth).pop() ?? 0;
      this.hp = 3;
      this.hearts.forEach((h) => h.setAlpha(1));
      this.invuln = 2;
      this.cameras.main.flash(400, 40, 30, 90);
      this.showToast(t('fall.fail'), 1600);
    }
  }

  private finish(): void {
    this.finished = true;
    this.running = false;

    // El colchón de nubes sube desde abajo y atrapa a Iris
    const cloud = this.add.image(this.iris.x, GAME_HEIGHT + 80, 'cloud').setScale(3).setDepth(48);
    this.add.tween({
      targets: cloud,
      y: 420,
      duration: 1100,
      ease: 'Sine.out',
    });
    this.tweens.add({
      targets: this.iris,
      y: 420 - 58,
      duration: 1100,
      ease: 'Sine.inOut',
      onComplete: () => {
        this.iris.anims.stop();
        this.iris.setTexture('iris', '0');
        this.iris.setAngle(0);
        AudioManager.sfx('door');
        this.dialogue.say(
          [
            { who: 'iris', text: t('fall.win.1') },
            { who: 'morfeo', text: t('fall.win.2') },
            { who: 'morfeo', text: t('fall.win.3') },
          ],
          () => this.giveKey(),
        );
      },
    });
  }

  private giveKey(): void {
    const key = this.add.image(this.iris.x, this.iris.y - 120, 'key').setScale(5).setDepth(70).setAlpha(0);
    this.add.image(this.iris.x, this.iris.y - 120, 'glow-gold').setScale(4).setDepth(69).setAlpha(0.5);
    AudioManager.sfx('key');
    this.tweens.add({ targets: key, alpha: 1, y: this.iris.y - 90, duration: 800, ease: 'Bounce.out' });
    this.add
      .text(GAME_WIDTH / 2, 150, t('fall.keyGet'), textStyle(24, '#cfc4ff', { fontStyle: 'bold', backgroundColor: '#241a55ee', padding: { x: 14, y: 8 } }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);
    SaveManager.giveKey('fall');
    SaveManager.recordFireflies('fall', this.fireflies.size);
    AudioManager.sfx('win');
    this.time.delayedCall(2600, () => fadeToScene(this, 'Hub', undefined, 800));
  }
}
