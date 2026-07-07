import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PIXEL_SCALE, textStyle, DEPTH_HUD } from '../config';
import { t } from '../i18n';
import type { TextKey } from '../i18n';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../systems/InputManager';
import { DialogueBox } from '../systems/DialogueBox';
import { fadeIn, fadeToScene, showTitleCard, addPauseOverlay } from '../systems/ui';

const WORLD_W = 1600;
const WORLD_H = 1200;
const START = { x: 800, y: 1020 };

interface Echo {
  x: number;
  y: number;
  order: number; // 1..3
  active: boolean;
  orb: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

/** Sueño 3: bosque de niebla donde viven los recuerdos de Iris. */
export class DreamForest extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private iris!: Phaser.GameObjects.Sprite;
  private fog!: Phaser.GameObjects.RenderTexture;
  private fogBrush!: Phaser.GameObjects.Image;
  private prompt!: Phaser.GameObjects.Text;
  private ffText!: Phaser.GameObjects.Text;

  private trees: { x: number; y: number }[] = [];
  private echoes: Echo[] = [];
  private nextEcho = 1;
  private fireflySpots: { x: number; y: number; taken: boolean; img: Phaser.GameObjects.Image }[] = [];
  private fireflies = 0;
  private keySprite?: Phaser.GameObjects.Image;
  private morfeo?: Phaser.GameObjects.Sprite;
  private heartDone = false;
  private started = false;

  constructor() {
    super('DreamForest');
  }

  create(): void {
    this.resetState();
    this.cameras.main.setBackgroundColor(0x0f1a22);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    fadeIn(this);
    AudioManager.playMusic('forest');

    // Suelo con manchas de musgo
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x101d26);
    const rnd = new Phaser.Math.RandomDataGenerator(['bosque']);
    for (let i = 0; i < 90; i++) {
      this.add
        .ellipse(rnd.between(0, WORLD_W), rnd.between(0, WORLD_H), rnd.between(30, 90), rnd.between(14, 30), 0x16242e)
        .setDepth(1);
    }

    this.plantTrees(rnd);
    this.placeEchoes();
    this.placeFireflies(rnd);

    // Iris
    this.iris = this.add.sprite(START.x, START.y, 'iris').setOrigin(0.5, 1).setScale(PIXEL_SCALE).setDepth(START.y);
    this.iris.play('iris-idle');
    this.cameras.main.startFollow(this.iris, true, 0.1, 0.1);

    // Niebla: capa oscura que se borra alrededor de las luces
    this.fog = this.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0).setScrollFactor(0).setDepth(800);
    this.fogBrush = this.make.image({ key: 'glow-white', add: false }).setOrigin(0.5);

    // UI
    this.prompt = this.add
      .text(0, 0, '', textStyle(14, '#ffd166', { backgroundColor: '#0f1a22cc', padding: { x: 8, y: 4 } }))
      .setOrigin(0.5)
      .setDepth(DEPTH_HUD)
      .setScrollFactor(0)
      .setVisible(false);
    this.add.image(24, 26, 'glow-gold').setScale(1).setScrollFactor(0).setDepth(DEPTH_HUD);
    this.ffText = this.add
      .text(42, 26, '0/6', textStyle(15, '#ffd166'))
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);

    this.dialogue = new DialogueBox(this, 0xffd166);
    this.inp = new InputManager(this);
    if (this.inp.isTouch) {
      this.inp.addJoystick();
      this.inp.addButton(GAME_WIDTH - 100, GAME_HEIGHT - 90, 44, '✦', 'interact');
    }
    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'));

    showTitleCard(this, t('forest.title'), t('forest.name'), () => {
      this.dialogue.say([{ who: null, text: t('forest.intro.1') }], () => {
        this.showHint(this.inp.isTouch ? t('forest.hint') : t('forest.hintKeys'));
        this.started = true;
      });
    });
  }

  private resetState(): void {
    this.trees = [];
    this.echoes = [];
    this.nextEcho = 1;
    this.fireflySpots = [];
    this.fireflies = 0;
    this.keySprite = undefined;
    this.morfeo = undefined;
    this.heartDone = false;
    this.started = false;
  }

  private showHint(text: string): void {
    const hint = this.add
      .text(GAME_WIDTH / 2, 90, text, textStyle(15, '#cfc4ff', { align: 'center', backgroundColor: '#0f1a22dd', padding: { x: 12, y: 6 } }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);
    this.tweens.add({ targets: hint, alpha: 0, delay: 3200, duration: 500, onComplete: () => hint.destroy() });
  }

  private plantTrees(rnd: Phaser.Math.RandomDataGenerator): void {
    const put = (x: number, y: number) => {
      this.trees.push({ x, y });
      this.add.image(x, y, 'tree').setOrigin(0.5, 0.78).setScale(PIXEL_SCALE).setDepth(y);
    };
    // Borde del mundo
    for (let x = 40; x < WORLD_W; x += rnd.between(70, 110)) {
      put(x + rnd.between(-15, 15), rnd.between(30, 80));
      put(x + rnd.between(-15, 15), WORLD_H - rnd.between(10, 60));
    }
    for (let y = 120; y < WORLD_H - 60; y += rnd.between(70, 110)) {
      put(rnd.between(20, 70), y);
      put(WORLD_W - rnd.between(20, 70), y);
    }
    // Bosque interior (evitando claros de inicio, ecos y corazón)
    const clearings = [
      { x: START.x, y: START.y, r: 170 },
      { x: 280, y: 300, r: 150 },
      { x: 1320, y: 340, r: 150 },
      { x: 260, y: 880, r: 150 },
      { x: 800, y: 180, r: 200 },
    ];
    for (let i = 0; i < 60; i++) {
      const x = rnd.between(120, WORLD_W - 120);
      const y = rnd.between(140, WORLD_H - 100);
      if (clearings.some((c) => Phaser.Math.Distance.Between(x, y, c.x, c.y) < c.r)) continue;
      put(x, y);
    }
  }

  private placeEchoes(): void {
    const spots: [number, number, number][] = [
      [280, 300, 1], // patio de la abuela
      [1320, 340, 2], // la mudanza
      [260, 880, 3], // el mensaje
    ];
    for (const [x, y, order] of spots) {
      const glow = this.add.image(x, y - 14, 'glow-cyan').setScale(2.2).setAlpha(0.5).setDepth(y - 1);
      const orb = this.add.image(x, y - 14, 'glow-white').setScale(0.9).setDepth(y);
      const label = this.add
        .text(x, y - 52, ['I', 'II', 'III'][order - 1], textStyle(18, '#86f7ff', { fontStyle: 'bold' }))
        .setOrigin(0.5)
        .setDepth(y);
      this.tweens.add({ targets: [orb, glow], alpha: 0.25, duration: 900, yoyo: true, repeat: -1, delay: order * 200 });
      this.echoes.push({ x, y, order, active: false, orb, glow, label });
    }
  }

  private placeFireflies(rnd: Phaser.Math.RandomDataGenerator): void {
    const spots = [
      [620, 760], [1080, 900], [1380, 640], [980, 420], [520, 480], [180, 560],
    ];
    for (const [x, y] of spots) {
      const img = this.add.image(x, y, 'glow-gold').setScale(1.3).setDepth(y);
      this.tweens.add({
        targets: img,
        x: x + rnd.between(-25, 25),
        y: y + rnd.between(-20, 20),
        alpha: 0.5,
        duration: rnd.between(900, 1600),
        yoyo: true,
        repeat: -1,
      });
      this.fireflySpots.push({ x, y, taken: false, img });
    }
  }

  update(): void {
    this.inp.update();
    this.drawFog();
    if (!this.started || this.pause.paused() || this.dialogue.active) {
      if (this.iris && !this.dialogue.active) this.iris.play('iris-idle', true);
      return;
    }

    // Movimiento en 4 direcciones con colisión contra troncos
    const speed = 3.1;
    let dx = 0;
    let dy = 0;
    if (this.inp.isDown('left')) dx -= 1;
    if (this.inp.isDown('right')) dx += 1;
    if (this.inp.isDown('up')) dy -= 1;
    if (this.inp.isDown('down')) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const nx = this.iris.x + (dx / len) * speed;
      const ny = this.iris.y + (dy / len) * speed;
      if (!this.hitsTree(nx, this.iris.y)) this.iris.x = Phaser.Math.Clamp(nx, 30, WORLD_W - 30);
      if (!this.hitsTree(this.iris.x, ny)) this.iris.y = Phaser.Math.Clamp(ny, 90, WORLD_H - 10);
      if (dx !== 0) this.iris.setFlipX(dx < 0);
      this.iris.play('iris-walk', true);
      this.iris.setDepth(this.iris.y);
    } else {
      this.iris.play('iris-idle', true);
    }

    this.collectFireflies();
    this.updateInteractions();
  }

  private hitsTree(x: number, y: number): boolean {
    // El tronco está en la base del árbol
    return this.trees.some((tr) => Phaser.Math.Distance.Between(x, y - 6, tr.x, tr.y + 14) < 26);
  }

  /** Niebla: oscuridad con claros alrededor de Iris y de las luces activas. */
  private drawFog(): void {
    const cam = this.cameras.main;
    this.fog.clear();
    this.fog.fill(0x050b10, 0.86);
    const erase = (wx: number, wy: number, scale: number) => {
      const sx = wx - cam.scrollX;
      const sy = wy - cam.scrollY;
      if (sx < -200 || sx > GAME_WIDTH + 200 || sy < -200 || sy > GAME_HEIGHT + 200) return;
      this.fogBrush.setScale(scale);
      this.fog.erase(this.fogBrush, sx, sy);
    };
    erase(this.iris.x, this.iris.y - 30, 22); // farol de Iris
    for (const e of this.echoes) erase(e.x, e.y - 14, e.active ? 16 : 7);
    for (const f of this.fireflySpots) if (!f.taken) erase(f.img.x, f.img.y, 3.5);
    if (this.keySprite) erase(this.keySprite.x, this.keySprite.y, 18);
  }

  private collectFireflies(): void {
    for (const f of this.fireflySpots) {
      if (f.taken) continue;
      if (Phaser.Math.Distance.Between(this.iris.x, this.iris.y - 20, f.img.x, f.img.y) < 34) {
        f.taken = true;
        f.img.destroy();
        this.fireflies += 1;
        this.ffText.setText(`${this.fireflies}/6`);
        AudioManager.sfx('collect');
      }
    }
  }

  private updateInteractions(): void {
    // Eco cercano
    const near = this.echoes.find(
      (e) => !e.active && Phaser.Math.Distance.Between(this.iris.x, this.iris.y - 20, e.x, e.y - 14) < 60,
    );
    if (near) {
      this.showPrompt(near.x, near.y - 80, '✦');
      if (this.inp.justDown('interact')) this.activateEcho(near);
      return;
    }
    // Llave final
    if (this.keySprite && Phaser.Math.Distance.Between(this.iris.x, this.iris.y - 20, this.keySprite.x, this.keySprite.y) < 60) {
      this.showPrompt(this.keySprite.x, this.keySprite.y - 60, t('hub.interact'));
      if (this.inp.justDown('interact')) this.takeKey();
      return;
    }
    this.prompt.setVisible(false);
  }

  private showPrompt(wx: number, wy: number, text: string): void {
    const cam = this.cameras.main;
    this.prompt.setPosition(wx - cam.scrollX, wy - cam.scrollY).setText(text).setVisible(true);
  }

  private activateEcho(echo: Echo): void {
    if (echo.order !== this.nextEcho) {
      AudioManager.sfx('hit');
      this.dialogue.say([
        { who: null, text: t('forest.echoLocked') },
        { who: null, text: t('forest.lanternHint') },
      ]);
      return;
    }
    AudioManager.sfx('echo');
    this.cameras.main.flash(600, 255, 209, 102);
    echo.active = true;
    echo.orb.setTexture('glow-gold').setScale(1.4);
    echo.glow.setTexture('glow-gold').setScale(3);
    echo.label.setColor('#ffd166');
    this.nextEcho += 1;

    const memoryKey = (`forest.memory.${echo.order}`) as TextKey;
    this.dialogue.say([{ who: null, text: t(memoryKey) }], () => {
      if (this.nextEcho > 3) {
        this.time.delayedCall(400, () => this.heartMoment());
      } else {
        this.showHint(t('forest.gateOpen'));
      }
    });
  }

  /** El momento emotivo: Morfeo aparece y se abre el claro del corazón. */
  private heartMoment(): void {
    if (this.heartDone) return;
    this.heartDone = true;

    this.morfeo = this.add.sprite(this.iris.x + 60, this.iris.y, 'morfeo').setOrigin(0.5, 1).setScale(PIXEL_SCALE).setDepth(this.iris.y).setAlpha(0);
    this.morfeo.play('morfeo-idle');
    this.tweens.add({ targets: this.morfeo, alpha: 1, duration: 900 });
    AudioManager.sfx('meow');

    this.dialogue.say(
      [
        { who: 'morfeo', text: t('forest.heart.1') },
        { who: 'iris', text: t('forest.heart.2') },
        { who: 'morfeo', text: t('forest.heart.3') },
        { who: 'morfeo', text: t('forest.heart.4') },
        { who: null, text: t('forest.win.1') },
      ],
      () => {
        // El bosque se enciende
        AudioManager.sfx('win');
        for (let i = 0; i < 40; i++) {
          const fx = Phaser.Math.Between(this.iris.x - 380, this.iris.x + 380);
          const fy = Phaser.Math.Between(this.iris.y - 260, this.iris.y + 200);
          const g = this.add.image(fx, fy, 'glow-gold').setScale(0).setDepth(fy);
          this.tweens.add({
            targets: g,
            scale: Phaser.Math.FloatBetween(0.6, 1.4),
            alpha: { from: 1, to: 0.4 },
            duration: Phaser.Math.Between(800, 1800),
            yoyo: true,
            repeat: -1,
            delay: i * 60,
          });
        }
        // La llave aparece en el claro del corazón (arriba, entre los árboles)
        const kx = 800;
        const ky = 200;
        this.keySprite = this.add.image(kx, ky, 'key').setScale(4).setDepth(ky);
        this.add.image(kx, ky, 'glow-gold').setScale(5).setAlpha(0.5).setDepth(ky - 1);
        this.tweens.add({ targets: this.keySprite, y: ky - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        AudioManager.sfx('key');
        this.showHint('✦ una luz nueva brilla al norte del bosque...');
      },
    );
  }

  private takeKey(): void {
    if (!this.keySprite) return;
    this.keySprite.destroy();
    this.keySprite = undefined;
    this.add
      .text(GAME_WIDTH / 2, 150, t('forest.keyGet'), textStyle(24, '#ffd166', { fontStyle: 'bold', backgroundColor: '#0f1a22ee', padding: { x: 14, y: 8 } }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);
    SaveManager.giveKey('forest');
    SaveManager.recordFireflies('forest', this.fireflies);
    AudioManager.sfx('key');
    AudioManager.sfx('win');
    this.time.delayedCall(2400, () => fadeToScene(this, 'Hub', undefined, 800));
  }
}
