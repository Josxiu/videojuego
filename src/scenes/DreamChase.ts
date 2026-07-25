import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PIXEL_SCALE, textStyle, DEPTH_HUD } from '../config';
import { t } from '../i18n';
import type { TextKey } from '../i18n';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../systems/InputManager';
import { DialogueBox } from '../systems/DialogueBox';
import { fadeIn, fadeToScene, showTitleCard, addPauseOverlay } from '../systems/ui';

const WORLD_W = 3200;
const GROUND_Y = 462;
const DOOR_X = WORLD_W - 130;
const IRIS_TINT = 0x30303f; // Iris es apenas una silueta en este mundo

type Phase = 'run' | 'finale' | 'reveal';
type SurgeState = 'idle' | 'warning' | 'attack';

/**
 * Pesadilla: La Persecución. Mundo de siluetas sin color.
 * Roguelike: cada vez que la Sombra te atrapa, el sueño se reorganiza.
 */
export class DreamChase extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private iris!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Sprite;
  private shadowGlowL!: Phaser.GameObjects.Image;
  private shadowGlowR!: Phaser.GameObjects.Image;
  private vignette!: Phaser.GameObjects.Image;
  private fearBar!: Phaser.GameObjects.Rectangle;
  private toast!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private door!: Phaser.GameObjects.Image;

  private worldItems: Phaser.GameObjects.GameObject[] = [];
  private wardrobes: { x: number; img: Phaser.GameObjects.Image }[] = [];

  private phase: Phase = 'run';
  private started = false;
  private hidden = false;
  private fear = 0;
  private catches = 0;
  private surge: SurgeState = 'idle';
  private surgeTimer = 0; // segundos hasta el siguiente cambio de estado
  private heartbeatIn = 0;
  private shadowX = 0;

  constructor() {
    super('DreamChase');
  }

  create(): void {
    this.resetRunState();
    this.catches = 0;
    this.phase = 'run';
    this.started = false;

    this.cameras.main.setBackgroundColor(0x9a9aad);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    fadeIn(this, 900);
    AudioManager.playMusic('chase');
    this.makeTextures();

    // Cielo pálido con gradiente (el único "color" es la ausencia de él)
    const grad = this.add.graphics().setScrollFactor(0);
    grad.fillGradientStyle(0xb8b8c8, 0xb8b8c8, 0x6e6e84, 0x6e6e84, 1);
    grad.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Siluetas lejanas (colinas y casas torcidas) en dos capas parallax
    this.add
      .tileSprite(GAME_WIDTH / 2, 330, GAME_WIDTH, 260, 'chase-far')
      .setScrollFactor(0.25)
      .setAlpha(0.4);
    this.add
      .tileSprite(GAME_WIDTH / 2, 400, GAME_WIDTH, 220, 'chase-near')
      .setScrollFactor(0.55)
      .setAlpha(0.75);

    // Niebla baja que deriva
    for (let i = 0; i < 10; i++) {
      const fog = this.add
        .image(Phaser.Math.Between(0, WORLD_W), Phaser.Math.Between(400, 500), 'glow-white')
        .setScale(Phaser.Math.FloatBetween(5, 10), 1.6)
        .setAlpha(0.08);
      this.tweens.add({
        targets: fog,
        x: fog.x + Phaser.Math.Between(-120, 120),
        duration: Phaser.Math.Between(5000, 9000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    // Suelo negro
    this.add.rectangle(
      WORLD_W / 2,
      (GROUND_Y + GAME_HEIGHT) / 2 + 6,
      WORLD_W,
      GAME_HEIGHT - GROUND_Y + 12,
      0x0a0a12,
    );

    // La puerta al fondo: la única luz cálida del sueño
    this.add
      .image(DOOR_X, GROUND_Y - 60, 'glow-gold')
      .setScale(5)
      .setAlpha(0.2);
    this.door = this.add
      .image(DOOR_X, GROUND_Y, 'door')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setTint(0x8c8c9e);

    // Iris silueta
    this.iris = this.add
      .sprite(120, GROUND_Y, 'iris')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setDepth(50)
      .setTint(IRIS_TINT);
    this.iris.play('iris-idle');
    this.cameras.main.startFollow(this.iris, true, 0.09, 0.09);

    // La Sombra
    this.shadow = this.add
      .sprite(-300, GROUND_Y - 6, 'shadow')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 1.4)
      .setDepth(60);
    this.shadow.play('shadow-idle');
    this.shadowGlowL = this.add.image(0, 0, 'glow-red').setScale(0.8).setAlpha(0.5).setDepth(61);
    this.shadowGlowR = this.add.image(0, 0, 'glow-red').setScale(0.8).setAlpha(0.5).setDepth(61);
    this.shadowX = -300;

    this.buildLayout(this.catches);
    this.buildHud();

    this.dialogue = new DialogueBox(this, 0xb33939);
    this.inp = new InputManager(this);
    if (this.inp.isTouch) {
      this.inp.addButton(90, GAME_HEIGHT - 80, 40, '◀', 'left');
      this.inp.addButton(200, GAME_HEIGHT - 80, 40, '▶', 'right');
      this.inp.addButton(GAME_WIDTH - 100, GAME_HEIGHT - 80, 44, '✦', 'interact');
    }
    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'));

    showTitleCard(this, t('chase.title'), t('chase.name'), () => {
      this.dialogue.say(
        [
          { who: null, text: t('chase.intro.1') },
          { who: null, text: t('chase.intro.2') },
        ],
        () => {
          this.showToast(this.inp.isTouch ? t('chase.hint') : t('chase.hintKeys'), 3000);
          this.started = true;
        },
      );
    });
  }

  private resetRunState(): void {
    this.hidden = false;
    this.fear = 0;
    this.surge = 'idle';
    this.surgeTimer = 5;
    this.heartbeatIn = 0;
    this.wardrobes = [];
    this.worldItems = [];
  }

  private makeTextures(): void {
    if (!this.textures.exists('chase-far')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x3a3a4c, 1);
      // colinas
      g.fillEllipse(90, 260, 320, 220);
      g.fillEllipse(330, 280, 380, 260);
      // casa torcida
      g.fillRect(180, 120, 70, 140);
      g.fillTriangle(165, 125, 265, 125, 215, 70);
      g.generateTexture('chase-far', 480, 260);
      g.destroy();
    }
    if (!this.textures.exists('chase-near')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x1c1c28, 1);
      g.fillEllipse(120, 240, 360, 200);
      g.fillEllipse(420, 260, 420, 240);
      // árbol seco
      g.fillRect(300, 90, 10, 130);
      g.lineStyle(8, 0x1c1c28);
      g.lineBetween(305, 110, 260, 60);
      g.lineBetween(305, 130, 350, 70);
      g.generateTexture('chase-near', 560, 220);
      g.destroy();
    }
    if (!this.textures.exists('vignette')) {
      const size = 320;
      const tex = this.textures.createCanvas('vignette', size, size);
      if (tex) {
        const ctx = tex.getContext();
        const grd = ctx.createRadialGradient(
          size / 2,
          size / 2,
          size * 0.22,
          size / 2,
          size / 2,
          size * 0.5,
        );
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, size, size);
        tex.refresh();
      }
    }
  }

  /** Coloca armarios y postes según la "semilla" del intento (roguelike). */
  private buildLayout(attempt: number): void {
    this.worldItems.forEach((o) => o.destroy());
    this.worldItems = [];
    this.wardrobes = [];
    const rnd = new Phaser.Math.RandomDataGenerator([`pesadilla-${attempt}-${Date.now()}`]);

    // Armarios para esconderse, repartidos con huecos variables
    let x = rnd.between(330, 470);
    while (x < WORLD_W - 420) {
      const img = this.add
        .image(x, GROUND_Y + 2, 'wardrobe')
        .setOrigin(0.5, 1)
        .setScale(PIXEL_SCALE)
        .setDepth(40);
      this.worldItems.push(img);
      this.wardrobes.push({ x, img });
      x += rnd.between(300, 520);
    }

    // Postes/lámparas muertas decorativas
    for (let i = 0; i < 8; i++) {
      const px = rnd.between(200, WORLD_W - 200);
      const pole = this.add
        .rectangle(px, GROUND_Y, 6, rnd.between(70, 120), 0x101018)
        .setOrigin(0.5, 1)
        .setDepth(30);
      this.worldItems.push(pole);
    }

    // Cadencia de oleadas propia de cada intento
    this.surgeTimer = rnd.realInRange(4, 6);
  }

  private buildHud(): void {
    // Medidor de miedo
    this.add
      .rectangle(GAME_WIDTH / 2, 26, 300, 10, 0x0a0a12, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setStrokeStyle(2, 0x1c1c28);
    this.fearBar = this.add
      .rectangle(GAME_WIDTH / 2 - 148, 26, 296, 6, 0xb33939)
      .setOrigin(0, 0.5)
      .setScale(0.01, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);
    this.add
      .text(GAME_WIDTH / 2, 44, 'miedo', textStyle(11, '#2a2a38'))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);

    // Viñeta que respira con el miedo
    this.vignette = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'vignette')
      .setDisplaySize(GAME_WIDTH * 1.15, GAME_HEIGHT * 1.3)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD - 10)
      .setAlpha(0.35);

    this.toast = this.add
      .text(
        GAME_WIDTH / 2,
        110,
        '',
        textStyle(18, '#e8e8f0', {
          align: 'center',
          backgroundColor: '#0a0a12dd',
          padding: { x: 12, y: 6 },
        }),
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setVisible(false);

    this.prompt = this.add
      .text(
        0,
        0,
        '',
        textStyle(14, '#e8c8c8', { backgroundColor: '#0a0a12cc', padding: { x: 8, y: 4 } }),
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

  update(_time: number, deltaMs: number): void {
    this.inp.update();
    if (!this.started || this.pause.paused() || this.dialogue.active || this.phase === 'reveal')
      return;
    const dt = Math.min(deltaMs / 1000, 0.05);

    this.updateMovement(dt);
    this.updateSurge(dt);
    this.updateShadow(dt);
    this.updateFearAndMood(dt);
    this.updateInteractions();

    // Llegar a la puerta dispara el acorralamiento final
    if (this.phase === 'run' && this.iris.x > DOOR_X - 90) this.startFinale();
  }

  private updateMovement(dt: number): void {
    if (this.hidden) {
      // Salir del escondite moviéndose
      if (this.inp.isDown('left') || this.inp.isDown('right')) this.setHidden(false);
      else return;
    }
    const speed = 150; // piernas pesadas: más lenta que en otros sueños
    let vx = 0;
    if (this.inp.isDown('left')) vx = -speed;
    else if (this.inp.isDown('right')) vx = speed;
    this.iris.x = Phaser.Math.Clamp(this.iris.x + vx * dt, 60, WORLD_W - 60);
    if (vx !== 0) {
      this.iris.setFlipX(vx < 0);
      this.iris.play('iris-walk', true);
    } else {
      this.iris.play('iris-idle', true);
    }
  }

  private updateSurge(dt: number): void {
    this.surgeTimer -= dt;
    if (this.surge === 'idle' && (this.surgeTimer <= 0 || this.fear >= 1)) {
      this.surge = 'warning';
      this.surgeTimer = 1.8;
      this.showToast(t('chase.surge'), 1400);
      AudioManager.sfx('heartbeat');
      this.cameras.main.shake(150, 0.004);
    } else if (this.surge === 'warning' && this.surgeTimer <= 0) {
      this.surge = 'attack';
      this.surgeTimer = 3.2;
      AudioManager.sfx('screech');
    } else if (this.surge === 'attack' && this.surgeTimer <= 0) {
      this.surge = 'idle';
      this.surgeTimer = Phaser.Math.FloatBetween(5, 8) + this.catches; // cada intento da un respiro más largo
      this.fear = Math.max(this.fear - 0.35, 0);
    }
  }

  private updateShadow(dt: number): void {
    const target = this.phase === 'finale' ? this.iris.x - 60 : this.iris.x - 420;
    let speed = 60;
    if (this.surge === 'attack') speed = this.phase === 'finale' ? 26 : 480;
    else if (this.surge === 'warning') speed = 20;
    if (this.phase === 'finale') speed = 32;

    // La Sombra flota hacia su objetivo
    if (this.shadowX < target) this.shadowX = Math.min(this.shadowX + speed * dt, target);
    else this.shadowX = Math.max(this.shadowX - 40 * dt, target);

    // Durante el ataque barre hacia adelante sin importar el objetivo
    if (this.surge === 'attack' && this.phase === 'run') {
      this.shadowX += 480 * dt;
    }

    this.shadow.setPosition(this.shadowX, GROUND_Y - 6 + Math.sin(this.time.now * 0.004) * 6);
    // Ojos brillantes (se encienden en aviso/ataque)
    const eyesOn = this.surge !== 'idle' || this.phase === 'finale';
    const eyeAlpha = eyesOn ? 0.9 : 0.35;
    const s = this.shadow;
    this.shadowGlowL
      .setPosition(s.x - 18, s.y - s.displayHeight + 26)
      .setAlpha(eyeAlpha)
      .setScale(eyesOn ? 1.1 : 0.7);
    this.shadowGlowR
      .setPosition(s.x + 20, s.y - s.displayHeight + 26)
      .setAlpha(eyeAlpha)
      .setScale(eyesOn ? 1.1 : 0.7);

    // ¿Te alcanzó?
    if (this.phase === 'run' && this.surge === 'attack' && !this.hidden) {
      if (Math.abs(this.shadowX - this.iris.x) < 46) this.caught();
    }
  }

  private updateFearAndMood(dt: number): void {
    const dist = Math.abs(this.shadowX - this.iris.x);
    let delta = 0;
    if (this.surge !== 'idle') delta += 0.16;
    if (dist < 350) delta += 0.1;
    if (this.hidden) delta = -0.22;
    if (this.surge === 'idle' && dist >= 350) delta = -0.08;
    this.fear = Phaser.Math.Clamp(this.fear + delta * dt, 0, 1);

    this.fearBar.setScale(Math.max(this.fear, 0.01), 1);
    this.vignette.setAlpha(0.3 + this.fear * 0.55);

    // Latido cuyo ritmo sigue al miedo
    this.heartbeatIn -= dt;
    if (this.heartbeatIn <= 0) {
      AudioManager.sfx('heartbeat');
      this.heartbeatIn = 1.6 - this.fear * 1.1;
    }
  }

  private updateInteractions(): void {
    if (this.phase !== 'run') {
      this.prompt.setVisible(false);
      return;
    }
    const near = this.wardrobes.find((w) => Math.abs(this.iris.x - w.x) < 42);
    if (near && !this.hidden) {
      this.showPrompt(near.x, GROUND_Y - 110, '✦');
      if (this.inp.justDown('interact')) this.setHidden(true, near.x);
    } else if (this.hidden) {
      this.prompt.setVisible(false);
      if (this.inp.justDown('interact')) this.setHidden(false);
    } else {
      this.prompt.setVisible(false);
    }
  }

  private showPrompt(wx: number, wy: number, text: string): void {
    const cam = this.cameras.main;
    this.prompt
      .setPosition(wx - cam.scrollX, wy - cam.scrollY)
      .setText(text)
      .setVisible(true);
  }

  private setHidden(hidden: boolean, atX?: number): void {
    this.hidden = hidden;
    AudioManager.sfx('hide');
    if (hidden && atX !== undefined) {
      this.iris.x = atX;
      this.iris.setAlpha(0.25);
      this.iris.play('iris-idle', true);
      this.showToast(t('chase.hidden'), 1200);
    } else {
      this.iris.setAlpha(1);
    }
  }

  /** Atrapada: el sueño se reorganiza (roguelike) y vuelves a empezar. */
  private caught(): void {
    this.catches += 1;
    AudioManager.sfx('screech');
    AudioManager.sfx('hit');
    this.cameras.main.shake(350, 0.02);
    this.cameras.main.flash(500, 10, 5, 15);

    const lineKey = `chase.caught.${Math.min(this.catches, 3)}` as TextKey;
    this.started = false;
    this.time.delayedCall(500, () => {
      this.dialogue.say([{ who: null, text: t(lineKey) }], () => {
        // Reorganización del sueño
        this.resetRunState();
        this.buildLayout(this.catches);
        this.iris.setPosition(120, GROUND_Y).setAlpha(1);
        this.shadowX = -300;
        this.fear = 0;
        this.started = true;
      });
    });
  }

  /** La puerta está cerrada: la Sombra se acerca lentamente. Hay que voltear. */
  private startFinale(): void {
    this.phase = 'finale';
    this.surge = 'idle';
    this.setHiddenSafe();
    this.showToast(t('chase.door'), 2200);
    AudioManager.sfx('door');

    // Prompt permanente para voltear
    this.time.delayedCall(1400, () => {
      if (this.phase !== 'finale') return;
      const check = this.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          if (this.phase !== 'finale') {
            check.remove();
            return;
          }
          this.showPrompt(this.iris.x, GROUND_Y - 130, `✦ ${t('chase.turn')}`);
          if (this.inp.justDown('interact')) {
            check.remove();
            this.reveal();
          }
          // Si la dejas llegar sin voltear, te atrapa (y el sueño se reordena)
          if (Math.abs(this.shadowX - this.iris.x) < 40) {
            check.remove();
            this.phase = 'run';
            this.surge = 'attack';
            this.caught();
          }
        },
      });
    });
  }

  private setHiddenSafe(): void {
    if (this.hidden) this.setHidden(false);
  }

  /** La revelación: la sombra es la pequeña Iris que solo quiere descansar. */
  private reveal(): void {
    this.phase = 'reveal';
    this.prompt.setVisible(false);
    this.iris.setFlipX(true); // voltea a mirarla
    this.iris.play('iris-idle', true);

    this.dialogue.say(
      [
        { who: null, text: t('chase.reveal.1') },
        { who: null, text: t('chase.reveal.2') },
      ],
      () => {
        // La sombra se encoge hasta ser una niña
        this.tweens.add({ targets: [this.shadowGlowL, this.shadowGlowR], alpha: 0, duration: 900 });
        this.tweens.add({
          targets: this.shadow,
          scaleX: 0.001,
          scaleY: 0.001,
          x: this.iris.x - 120,
          duration: 1400,
          ease: 'Sine.in',
          onComplete: () => {
            this.shadow.setVisible(false);
            const child = this.add
              .sprite(this.iris.x - 120, GROUND_Y, 'iris')
              .setOrigin(0.5, 1)
              .setScale(PIXEL_SCALE * 0.62)
              .setDepth(55)
              .setTint(0x8a8a9e);
            child.play('iris-idle');
            this.tweens.add({ targets: child, tint: 0xffffff, duration: 2200 });

            this.dialogue.say(
              [
                { who: 'iris', text: t('chase.reveal.3') },
                { who: 'shadow', text: t('chase.reveal.4') },
                { who: 'iris', text: t('chase.reveal.5') },
                { who: null, text: t('chase.reveal.6') },
              ],
              () => this.hug(child),
            );
          },
        });
      },
    );
  }

  private hug(child: Phaser.GameObjects.Sprite): void {
    // Se acercan y el mundo recupera un poco de calidez
    this.tweens.add({ targets: child, x: this.iris.x - 34, duration: 1200, ease: 'Sine.inOut' });
    this.tweens.add({
      targets: this.iris,
      tint: { from: IRIS_TINT, to: 0xffffff },
      duration: 2000,
    });
    this.tweens.add({ targets: this.vignette, alpha: 0, duration: 2500 });
    this.tweens.add({ targets: this.door, tint: { from: 0x8c8c9e, to: 0xffd166 }, duration: 2500 });
    AudioManager.sfx('win');

    const glow = this.add
      .image(this.iris.x - 17, GROUND_Y - 40, 'glow-gold')
      .setScale(0)
      .setDepth(54)
      .setAlpha(0.6);
    this.tweens.add({ targets: glow, scale: 8, alpha: 0.35, duration: 2500 });

    this.time.delayedCall(2800, () => {
      this.add
        .text(
          GAME_WIDTH / 2,
          150,
          t('chase.done'),
          textStyle(24, '#e8e8f0', {
            fontStyle: 'bold',
            backgroundColor: '#0a0a12ee',
            padding: { x: 14, y: 8 },
          }),
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH_HUD);
      SaveManager.data.nightmareDone = true;
      SaveManager.save();
      this.time.delayedCall(2400, () => fadeToScene(this, 'Hub', undefined, 900));
    });
  }
}
