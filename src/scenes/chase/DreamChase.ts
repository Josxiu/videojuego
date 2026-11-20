import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH_HUD, FONT_KID } from '../../config';
import { t } from '../../i18n';
import type { TextKey } from '../../i18n';
import { applyWorldFX, type DreamFXPipeline, FX_PRESETS } from '../../gfx/postfx';
import { CHARACTER_TEXTURES, CHARACTER_ANIMS, IRIS_FRAME } from '../../gfx/sprites';
import { ensureStyle, styledKey, addStyled, footOriginY } from '../../gfx/stylize';
import { Rng } from '../../gfx/noise';
import { SaveManager } from '../../systems/SaveManager';
import { AudioManager } from '../../systems/AudioManager';
import { InputManager } from '../../systems/InputManager';
import { DialogueBox } from '../../systems/DialogueBox';
import {
  fadeIn,
  fadeToScene,
  showTitleCard,
  addPauseOverlay,
  showReturnCard,
  showActBanner,
  showSecretBanner,
} from '../../systems/ui';
import { floatingText, burst } from '../../systems/Juice';
import { debug } from '../../systems/debug';
import { HIDE_SLOTS, LIGHT_SLOTS, CRAYON_SPOTS, CHASE_START, DOOR_X } from '../../data/chase';
import {
  paintRooms,
  paintHiding,
  paintShadow,
  paintChaseProps,
  ROOM_W,
  ROOMS,
  WORLD_W,
  FLOOR_Y,
  HIDE_SIZE,
  CRAYON_COLORS,
  type HideKind,
} from './art';

const STYLE = 'crayon';
const WALK = 155;
const LIGHT_R = 95;

type Phase = 'run' | 'door' | 'sit' | 'knock' | 'reveal';
type ShadowState = 'stalk' | 'warn' | 'charge' | 'sniff' | 'retreat';

interface Spot {
  kind: HideKind;
  x: number;
  sprite: Phaser.GameObjects.Image;
  eye?: Phaser.GameObjects.Image;
}

interface Light {
  x: number;
  flicker: boolean;
  on: boolean;
  dead: boolean;
  flickersDone: number;
  phase: number;
  glow: Phaser.GameObjects.Image;
  plug: Phaser.GameObjects.Image;
}

/**
 * Pesadilla de Tomás (Sueño 7 · 2A): Crayola sobre papel de noche.
 *
 * - Acto I: huir por los primeros cuartos usando lamparitas y escondites; secreto
 *   detrás de la cama izquierda (cohete de cartón + linterna).
 * - Acto II: al llegar a la sala (x >= 1800), la Sombra trepa AL TECHO boca abajo
 *   dejando huellas y apaga lamparitas parpadeantes a pisotones.
 * - Acto III: en la puerta 2A cerrada, dejar de huir, voltear, sentarse/hacerse
 *   pequeña hasta encoger la Sombra al tamaño de un dibujo y sellar el pacto de 3 golpes.
 */
export class DreamChase extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private fx?: DreamFXPipeline;
  private iris!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Sprite;
  private vignette!: Phaser.GameObjects.Image;
  private fearBar!: Phaser.GameObjects.Graphics;
  private toast!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private actText!: Phaser.GameObjects.Text;
  private sitBtn?: Phaser.GameObjects.Text;
  private crayonIcons: Phaser.GameObjects.Image[] = [];
  private peek: Phaser.GameObjects.Image[] = [];
  private door!: Phaser.GameObjects.Image;
  private rocketSprite!: Phaser.GameObjects.Graphics;
  private drawing?: Phaser.GameObjects.Image;
  private tomas?: Phaser.GameObjects.Sprite;

  private layoutItems: Phaser.GameObjects.GameObject[] = [];
  private spots: Spot[] = [];
  private nightlights: Light[] = [];
  private crayons: { x: number; i: number; sprite: Phaser.GameObjects.Image; taken: boolean }[] =
    [];

  private act: 1 | 2 | 3 = 1;
  private insomnia = false;
  private phase: Phase = 'run';
  private started = false;
  private hiddenIn?: Spot;
  private fear = 0;
  private catches = 0;
  private ceilingWalk = false;
  private secretDone = false;
  private shadowState: ShadowState = 'stalk';
  private shadowX = -400;
  private stateTimer = 0;
  private surgeIn = 6;
  private heartIn = 0;
  private stepAcc = 0;
  private ceilStepAcc = 0;
  private learned = new Set<HideKind>();
  private usedThisRun = new Set<HideKind>();
  private collected = 0;
  private shrink = 0;
  private knocks = 0;
  private knockGuardUntil = 0;
  private holdTouchSit = false;
  private smallerTold = false;
  private lightHintShown = false;

  constructor() {
    super('DreamChase');
  }

  create(data: { insomnia?: boolean } = {}): void {
    this.resetState(Boolean(data.insomnia) || debug.flag('insomnia'));
    this.fx = applyWorldFX(this, 'chase');
    this.applyColor(true);
    this.cameras.main.setBackgroundColor(0x1f2560);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    fadeIn(this, 900);
    AudioManager.playMusic('chase', 0);

    paintRooms(this);
    paintHiding(this);
    paintShadow(this);
    paintChaseProps(this);
    ensureStyle(
      this,
      STYLE,
      [...CHARACTER_TEXTURES, 'tomas', 'dibujo', 'portrait-iris', 'portrait-morfeo'],
      [...CHARACTER_ANIMS, 'tomas-idle'],
    );

    for (let i = 0; i < ROOMS; i++)
      this.add
        .image(i * ROOM_W, 0, `chase-room-${i}`)
        .setOrigin(0)
        .setDepth(0);

    // Secreto visual: cohete de cartón detrás de la cama en x=68
    this.rocketSprite = this.add.graphics().setDepth(4);
    this.drawRocket(false);

    this.door = this.add
      .image(DOOR_X + 5, FLOOR_Y + 2, 'chase-door')
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    this.door.on('pointerdown', () => {
      if (this.phase === 'door') this.turnAround();
    });

    CRAYON_SPOTS.forEach((x, i) => {
      const owned = SaveManager.hasFirefly('chase', i);
      const sprite = this.add
        .image(x, FLOOR_Y - 10, `chase-crayon-${i}`)
        .setDepth(25)
        .setAngle(-12)
        .setAlpha(owned ? 0.45 : 1);
      this.tweens.add({
        targets: sprite,
        y: FLOOR_Y - 18,
        angle: 12,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.crayons.push({ x, i, sprite, taken: false });
    });

    this.iris = addStyled(this, CHASE_START, FLOOR_Y + 4, 'iris', STYLE, {
      frame: IRIS_FRAME.idle,
      feet: true,
    }).setDepth(30);
    this.iris.play(styledKey('iris-idle', STYLE));
    for (let i = 0; i < 2; i++)
      this.peek.push(
        this.add.image(0, 0, 'glow-white').setScale(0.22).setDepth(26).setVisible(false),
      );

    this.shadow = this.add
      .sprite(this.shadowX, FLOOR_Y + 8, 'chase-shadow', '0')
      .setOrigin(0.5, 1)
      .setDepth(40);
    this.shadow.play('chase-shadow-boil');
    this.cameras.main.startFollow(this.iris, true, 0.08, 0.08, 0, 40);

    this.buildLayout();
    this.buildHud();

    this.dialogue = new DialogueBox(this, 0xd8453a, 'crayon');
    this.inp = new InputManager(this);
    this.bindTouchAndClick();
    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'), {
      onRestart: () => this.scene.restart({ insomnia: this.insomnia }),
    });

    if (debug.flag('skip')) {
      this.iris.x = debug.num('at', CHASE_START);
      this.shadowX = this.iris.x - 420;
      if (this.iris.x >= ROOM_W * 2) this.enterAct2();
      this.started = true;
      return;
    }

    showTitleCard(
      this,
      t('chase.title'),
      t('chase.name'),
      () => {
        this.dialogue.say(
          [
            { who: null, text: t('chase.intro.1') },
            { who: null, text: t('chase.intro.2') },
            { who: 'morfeo', text: t('chase.intro.3') },
          ],
          () => {
            showActBanner(this, t('chase.act1'), '#ffd23a');
            this.showToast(this.inp.isTouch ? t('chase.hint') : t('chase.hintKeys'), 3800);
            this.started = true;
          },
        );
      },
      'crayon',
      this.insomnia ? t('chase.insomnia') : undefined,
    );
  }

  private resetState(insomnia: boolean): void {
    this.layoutItems = [];
    this.spots = [];
    this.nightlights = [];
    this.crayons = [];
    this.crayonIcons = [];
    this.peek = [];
    this.act = 1;
    this.insomnia = insomnia;
    this.phase = 'run';
    this.started = false;
    this.hiddenIn = undefined;
    this.fear = 0;
    this.catches = 0;
    this.ceilingWalk = false;
    this.secretDone = false;
    this.shadowState = 'stalk';
    this.shadowX = -400;
    this.stateTimer = 0;
    this.surgeIn = insomnia ? 4.2 : 6;
    this.heartIn = 0;
    this.stepAcc = 0;
    this.ceilStepAcc = 0;
    this.learned = new Set();
    this.usedThisRun = new Set();
    this.collected = 0;
    this.shrink = 0;
    this.knocks = 0;
    this.holdTouchSit = false;
    this.smallerTold = false;
    this.lightHintShown = false;
    this.sitBtn = undefined;
    this.drawing = undefined;
    this.tomas = undefined;
  }

  private drawRocket(glow: boolean): void {
    const g = this.rocketSprite;
    g.clear();
    g.fillStyle(glow ? 0xffd23a : 0x5c4b3a, glow ? 0.92 : 0.72);
    g.fillTriangle(72, FLOOR_Y - 82, 54, FLOOR_Y - 12, 90, FLOOR_Y - 12);
    g.fillStyle(0xd8453a, glow ? 0.9 : 0.55);
    g.fillTriangle(72, FLOOR_Y - 94, 58, FLOOR_Y - 72, 86, FLOOR_Y - 72);
    g.lineStyle(2, 0x2b2340, 0.85).strokeTriangle(
      72,
      FLOOR_Y - 82,
      54,
      FLOOR_Y - 12,
      90,
      FLOOR_Y - 12,
    );
    if (glow) g.fillStyle(0x86f7ff, 0.9).fillCircle(72, FLOOR_Y - 46, 8);
  }

  private bindTouchAndClick(): void {
    if (this.inp.isTouch) {
      this.inp.addOneFingerStick(() => {
        if (this.phase === 'knock') {
          this.registerKnock();
          return;
        }
        if (this.phase === 'door' || this.prompt.visible || this.hiddenIn) {
          this.inp.pulse('interact');
        }
      });
    }
    this.input.on('pointerdown', () => {
      if (this.phase === 'knock') this.registerKnock();
    });
  }

  // ── La casa de este intento ──

  /** Reparte escondites y lamparitas: Tomás redibuja su casa en cada intento. */
  private buildLayout(): void {
    this.layoutItems.forEach((o) => o.destroy());
    this.layoutItems = [];
    this.spots = [];
    this.nightlights = [];
    const rng = new Rng(`casa-${this.catches}-${Date.now() % 1000}`);
    for (const slot of HIDE_SLOTS) {
      const x = rng.pick(slot.xs) + rng.range(-30, 30);
      const [, h] = HIDE_SIZE[slot.kind];
      const sprite = this.add
        .image(x, slot.kind === 'cortina' ? FLOOR_Y - h + 20 : FLOOR_Y + 10, `hide-${slot.kind}`)
        .setOrigin(0.5, slot.kind === 'cortina' ? 0 : 1)
        .setDepth(20)
        .setInteractive({ useHandCursor: true });
      const spot: Spot = { kind: slot.kind, x, sprite };
      sprite.on('pointerdown', () => {
        if (this.phase !== 'run' || !this.started || this.dialogue.active) return;
        if (this.hiddenIn === spot) this.unhide();
        else if (!this.hiddenIn && Math.abs(this.iris.x - spot.x) < HIDE_SIZE[spot.kind][0] + 40) {
          this.hide(spot);
        }
      });
      this.layoutItems.push(sprite);
      if (this.learned.has(slot.kind)) this.markLearned(spot);
      this.spots.push(spot);
    }

    // Lamparitas: en Desvelo hay menos estables y algunas se funden tras 2 parpadeos
    const count = this.insomnia ? 4 : 5;
    const slots = [...LIGHT_SLOTS].sort(() => rng.next() - 0.5).slice(0, count);
    slots.forEach((x, i) => {
      const glow = this.add
        .image(x, FLOOR_Y - 60, 'chase-light')
        .setDepth(5)
        .setBlendMode(Phaser.BlendModes.ADD);
      const plug = this.add.image(x, FLOOR_Y - 34, 'chase-nightlight').setDepth(6);
      this.layoutItems.push(glow, plug);
      this.nightlights.push({
        x,
        flicker: i < (this.insomnia ? 3 : 1 + Math.min(this.catches, 3)),
        on: true,
        dead: false,
        flickersDone: 0,
        phase: rng.range(0, 7),
        glow,
        plug,
      });
    });
  }

  private markLearned(spot: Spot): void {
    if (spot.eye) return;
    const [, h] = HIDE_SIZE[spot.kind];
    const y = spot.kind === 'cortina' ? FLOOR_Y - h + 40 : FLOOR_Y - h - 6;
    spot.eye = this.add.image(spot.x, y, 'chase-eye').setDepth(21);
    this.tweens.add({
      targets: spot.eye,
      scaleY: 0.2,
      duration: 160,
      yoyo: true,
      repeat: -1,
      repeatDelay: 2200,
    });
    this.layoutItems.push(spot.eye);
  }

  // ── HUD ──

  private buildHud(): void {
    const fix = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ) => o.setScrollFactor(0).setDepth(DEPTH_HUD);
    this.vignette = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'chase-vignette')
      .setDisplaySize(GAME_WIDTH * 1.2, GAME_HEIGHT * 1.4)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD - 10)
      .setAlpha(0.3);
    this.fearBar = fix(this.add.graphics());
    fix(
      this.add
        .text(GAME_WIDTH / 2 - 160, 29, 'miedo', {
          fontFamily: FONT_KID,
          fontSize: '20px',
          color: '#fffdf6',
        })
        .setOrigin(1, 0.5),
    );
    this.actText = fix(
      this.add
        .text(GAME_WIDTH - 92, 30, this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'), {
          fontFamily: FONT_KID,
          fontSize: '20px',
          color: this.insomnia ? '#ff8a66' : '#fffdf6',
        })
        .setOrigin(1, 0.5),
    );

    CRAYON_COLORS.forEach((_, i) => {
      const owned = SaveManager.hasFirefly('chase', i);
      this.crayonIcons.push(
        fix(
          this.add
            .image(34 + i * 22, 40, `chase-crayon-${i}`)
            .setScale(0.6)
            .setAlpha(owned ? 1 : 0.3)
            .setAngle(-70),
        ),
      );
    });
    this.toast = fix(
      this.add
        .text(GAME_WIDTH / 2, 162, '', {
          fontFamily: FONT_KID,
          fontSize: '22px',
          color: '#2b2340',
          align: 'center',
          backgroundColor: '#fffdf6',
          padding: { x: 14, y: 6 },
          wordWrap: { width: 720 },
        })
        .setOrigin(0.5)
        .setVisible(false),
    );
    this.prompt = this.add
      .text(0, 0, '', {
        fontFamily: FONT_KID,
        fontSize: '22px',
        color: '#2b2340',
        backgroundColor: '#fffdf6',
        padding: { x: 10, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_HUD - 1)
      .setVisible(false);
    this.drawFear();
  }

  private drawFear(): void {
    const g = this.fearBar;
    const x0 = GAME_WIDTH / 2 - 150;
    g.clear();
    g.fillStyle(0xfffdf6, 0.25);
    g.fillRoundedRect(x0, 22, 300, 14, 7);
    g.fillStyle(0xe8433a, 0.95);
    g.fillRoundedRect(x0, 22, Math.max(8, 300 * this.fear), 14, 7);
  }

  private showToast(text: string, ms = 1800): void {
    this.toast.setText(text).setVisible(true).setAlpha(1).setAngle(Phaser.Math.FloatBetween(-2, 2));
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 400 });
  }

  /** Cada crayola le devuelve color al dibujo. */
  private applyColor(instant = false): void {
    const owned = SaveManager.data.fireflies.chase;
    const base = FX_PRESETS.chase;
    const target = {
      ...base,
      desat: Math.max(0, 0.72 - Math.max(this.collected, owned) * 0.12),
    };
    if (instant || !this.fx) this.fx?.configure(target);
    else this.fx.blendTo(this, target, 900);
  }

  // ── Bucle ──

  update(_time: number, deltaMs: number): void {
    this.inp.update();
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.updateLights(dt);
    if (!this.started || this.pause.paused() || this.dialogue.active) return;
    switch (this.phase) {
      case 'run':
        this.move(dt);
        if (this.act === 1 && this.iris.x >= ROOM_W * 2) this.enterAct2();
        this.updateShadow(dt);
        this.updateFear(dt);
        this.updateInteractions();
        this.collectCrayons();
        if (this.iris.x > DOOR_X - 110) this.reachDoor();
        break;
      case 'door':
        this.approachSlowly(dt);
        if (this.inp.justDown('interact')) this.turnAround();
        break;
      case 'sit':
        this.updateSit(dt);
        break;
      case 'knock':
        if (this.inp.justDown('interact') || this.inp.justDown('down')) this.registerKnock();
        break;
    }
  }

  private enterAct2(): void {
    if (this.act >= 2) return;
    this.act = 2;
    this.ceilingWalk = true;
    this.actText.setText(this.insomnia ? `${t('ui.act2')} · ☾` : t('ui.act2')).setColor('#ff9f43');
    showActBanner(this, t('chase.act2'), '#ff9f43');
    this.showToast(t('chase.twist'), 4600);
    AudioManager.sfx('screech');
    this.shadow.setFlipY(true);
    // Tomás borra en vivo un escondite aún no aprendido si hay varios
    const victim = this.spots.find((s) => s.x > ROOM_W * 2 && !this.learned.has(s.kind));
    if (victim) {
      this.learned.add(victim.kind);
      this.markLearned(victim);
    }
  }

  private move(dt: number): void {
    const left = this.inp.isDown('left') || this.inp.joyX < -0.25;
    const right = this.inp.isDown('right') || this.inp.joyX > 0.25;
    if (this.hiddenIn) {
      if (left || right) this.unhide();
      else return;
    }
    let vx = 0;
    if (left) vx = -WALK;
    else if (right) vx = WALK;
    this.iris.x = Phaser.Math.Clamp(this.iris.x + vx * dt, 56, WORLD_W - 60);

    // Secreto: detrás de la cama de Tomás (cohete de cartón con linterna)
    if (!this.secretDone && this.iris.x <= 82) {
      this.secretDone = true;
      SaveManager.markSecret('chase');
      AudioManager.sfx('secret');
      this.drawRocket(true);
      this.fear = Math.max(0, this.fear - 0.5);
      this.drawFear();
      showSecretBanner(this, t('chase.secret'));
      burst(this, 72, FLOOR_Y - 40, 0xffd23a, 18, 42);
    }

    if (vx !== 0) {
      this.iris.setFlipX(vx < 0);
      this.iris.play(styledKey('iris-walk', STYLE), true);
      this.stepAcc += Math.abs(vx * dt);
      if (this.stepAcc > 38) {
        this.stepAcc = 0;
        this.footprint();
      }
    } else {
      this.iris.play(styledKey('iris-idle', STYLE), true);
    }
  }

  /** Huellas de crayola: por ahí te sigue. */
  private footprint(): void {
    const step = this.add
      .image(
        this.iris.x + (Math.random() - 0.5) * 8,
        FLOOR_Y + 14 + (Math.random() > 0.5 ? 4 : -2),
        'chase-step',
      )
      .setDepth(15)
      .setFlipX(this.iris.flipX);
    this.tweens.add({
      targets: step,
      alpha: 0,
      delay: 2500,
      duration: 3000,
      onComplete: () => step.destroy(),
    });
    AudioManager.sfx('step');
  }

  private ceilingFootprint(): void {
    const step = this.add
      .image(this.shadowX + (Math.random() - 0.5) * 14, 72, 'chase-step')
      .setDepth(15)
      .setFlipY(true)
      .setTint(0x0c0a14);
    this.tweens.add({
      targets: step,
      alpha: 0,
      delay: 2000,
      duration: 2500,
      onComplete: () => step.destroy(),
    });
    AudioManager.sfx('step');
  }

  private updateLights(dt: number): void {
    for (const l of this.nightlights) {
      if (!l.flicker || l.dead) continue;
      l.phase = (l.phase + dt) % 7.8;
      const blinking = l.phase > 5 && l.phase < 5.8;
      const wasOn = l.on;
      l.on = l.phase < 5.8 && !(blinking && Math.sin(l.phase * 40) < 0);
      l.glow.setAlpha(l.on ? (blinking ? 0.5 : 1) : 0);
      l.plug.setAlpha(l.on ? 1 : 0.4);
      if (wasOn && !l.on && l.phase >= 5.8) {
        l.flickersDone++;
        if (this.insomnia && l.flickersDone >= 2) {
          l.dead = true;
          l.glow.setAlpha(0);
          l.plug.setAlpha(0.2);
        }
        if (this.inLight(l) && this.phase === 'run') {
          this.showToast(t('chase.flicker'), 1200);
        }
      }
    }
  }

  private inLight(l: Light): boolean {
    return Math.abs(this.iris.x - l.x) < LIGHT_R;
  }

  /** ¿Iris está a salvo en la luz? */
  private safeInLight(): boolean {
    return this.nightlights.some((l) => l.on && this.inLight(l));
  }

  // ── La Sombra ──

  private updateShadow(dt: number): void {
    const ix = this.iris.x;
    this.stateTimer -= dt;
    let target = this.shadowX;
    let speed = 0;
    switch (this.shadowState) {
      case 'stalk':
        target = ix - (this.ceilingWalk ? 260 : 380);
        speed = this.insomnia ? 205 : 170;
        this.surgeIn -= dt;
        if (this.surgeIn <= 0 || this.fear >= 1) {
          this.shadowState = 'warn';
          this.stateTimer = this.insomnia ? 1.0 : 1.3;
          this.showToast(t('chase.surge'), 1100);
          AudioManager.sfx('screech');
          this.cameras.main.shake(260, 0.005);
          AudioManager.setMusicLevel(1);
        }
        break;
      case 'warn':
        if (this.stateTimer <= 0) {
          this.shadowState = 'charge';
          this.stateTimer = 3.2;
          AudioManager.setMusicLevel(2);
        }
        break;
      case 'charge':
        target = this.hiddenIn ? this.hiddenIn.x : ix;
        speed = this.insomnia ? 495 : 430;
        if (this.stateTimer <= 0) this.startRetreat();
        break;
      case 'sniff':
        if (this.stateTimer <= 0) this.startRetreat();
        break;
      case 'retreat':
        target = ix - 480;
        speed = 320;
        if (this.stateTimer <= 0) {
          this.shadowState = 'stalk';
          this.surgeIn =
            Phaser.Math.FloatBetween(this.insomnia ? 4.5 : 6, this.insomnia ? 7 : 9) -
            this.fear * 2 +
            this.catches * 0.5;
          AudioManager.setMusicLevel(0);
        }
        break;
    }

    const dir = Math.sign(target - this.shadowX);
    let next = this.shadowX + dir * Math.min(speed * dt, Math.abs(target - this.shadowX));
    // En suelo la frena toda luz; en el techo apaga lamparitas parpadeantes si pasa encima
    if (this.ceilingWalk && this.shadowState !== 'charge') {
      for (const l of this.nightlights) {
        if (l.on && l.flicker && !l.dead && Math.abs(next - l.x) < 28 && !this.hiddenIn) {
          l.on = false;
          l.phase = 5.9;
          l.glow.setAlpha(0);
          l.plug.setAlpha(0.4);
          AudioManager.sfx('hit');
        }
      }
    } else {
      for (const l of this.nightlights) {
        if (!l.on) continue;
        const edge = l.x - LIGHT_R - 40;
        if (this.shadowX <= edge && next > edge) next = edge;
      }
    }

    this.ceilStepAcc += Math.abs(next - this.shadowX);
    this.shadowX = next;
    const bob = Math.sin(this.time.now * 0.004) * 6;
    const isCeil = this.ceilingWalk && this.shadowState !== 'charge';
    this.shadow.setFlipY(isCeil);
    this.shadow.setPosition(this.shadowX, (isCeil ? 220 : FLOOR_Y + 8) + bob);
    if (isCeil && this.ceilStepAcc > 55) {
      this.ceilStepAcc = 0;
      this.ceilingFootprint();
    }

    const angry = this.shadowState === 'warn' || this.shadowState === 'charge';
    this.shadow.setScale(angry ? 1.08 : 1);

    const close = Math.abs(this.shadowX - ix) < 60 && !isCeil;
    if (!close) return;
    if (this.hiddenIn && !this.learned.has(this.hiddenIn.kind)) {
      if (this.shadowState === 'charge') {
        this.shadowState = 'sniff';
        this.stateTimer = 1.2;
        this.tweens.add({
          targets: this.hiddenIn.sprite,
          x: this.hiddenIn.x + 4,
          duration: 60,
          yoyo: true,
          repeat: 8,
        });
      }
      return;
    }
    if (this.safeInLight()) return;
    this.caught();
  }

  private startRetreat(): void {
    this.shadowState = 'retreat';
    this.stateTimer = 1.6;
    this.fear = Math.max(0, this.fear - 0.3);
  }

  private updateFear(dt: number): void {
    const dist = Math.abs(this.shadowX - this.iris.x);
    let delta = 0;
    if (this.shadowState === 'warn' || this.shadowState === 'charge') delta += 0.16;
    if (dist < 300) delta += 0.1;
    if (this.hiddenIn || this.safeInLight()) delta = -0.2;
    else if (this.shadowState === 'stalk' && dist >= 300) delta = -0.05;
    this.fear = Phaser.Math.Clamp(this.fear + delta * dt, 0, 1);
    this.drawFear();
    this.vignette.setAlpha(0.25 + this.fear * 0.6);
    this.heartIn -= dt;
    if (this.heartIn <= 0) {
      AudioManager.sfx('heartbeat');
      this.heartIn = 1.6 - this.fear * 1.1;
    }
  }

  // ── Escondites y crayolas ──

  private updateInteractions(): void {
    const spot = this.spots.find((s) => Math.abs(this.iris.x - s.x) < HIDE_SIZE[s.kind][0] / 2 + 6);
    if (this.hiddenIn) {
      this.prompt.setVisible(false);
      if (this.inp.justDown('interact')) this.unhide();
      return;
    }
    if (!this.lightHintShown && this.safeInLight()) {
      this.lightHintShown = true;
      this.showToast(t('chase.light'), 1800);
    }
    if (spot) {
      this.prompt
        .setPosition(spot.x, FLOOR_Y - HIDE_SIZE[spot.kind][1] - 40)
        .setText('✦')
        .setVisible(true);
      if (this.inp.justDown('interact')) this.hide(spot);
    } else {
      this.prompt.setVisible(false);
    }
  }

  private hide(spot: Spot): void {
    this.hiddenIn = spot;
    this.usedThisRun.add(spot.kind);
    AudioManager.sfx('hide');
    this.iris.x = spot.x;
    this.iris.setDepth(19).setAlpha(0.15);
    this.iris.play(styledKey('iris-idle', STYLE), true);
    this.peek.forEach((p, i) => p.setPosition(spot.x - 8 + i * 16, FLOOR_Y - 58).setVisible(true));
    this.showToast(this.learned.has(spot.kind) ? t('chase.learned') : t('chase.hidden'), 1300);
  }

  private unhide(): void {
    this.hiddenIn = undefined;
    AudioManager.sfx('hide');
    this.iris.setDepth(30).setAlpha(1);
    this.peek.forEach((p) => p.setVisible(false));
  }

  private collectCrayons(): void {
    for (const c of this.crayons) {
      if (c.taken || Math.abs(this.iris.x - c.x) > 30) continue;
      c.taken = true;
      this.collected++;
      SaveManager.collectFirefly('chase', c.i);
      AudioManager.sfx('collect');
      AudioManager.sfx('scribble');
      this.tweens.killTweensOf(c.sprite);
      this.tweens.add({ targets: c.sprite, y: c.sprite.y - 60, alpha: 0, duration: 500 });
      this.crayonIcons[c.i].setAlpha(1);
      this.fear = Math.max(0, this.fear - 0.3);
      this.applyColor();
      this.showToast(t('chase.crayon'), 1400);
    }
  }

  // ── Atrapada: Tomás redibuja su casa ──

  private caught(): void {
    this.catches++;
    for (const k of this.usedThisRun) {
      if (this.learned.size < HIDE_SLOTS.length - 2) this.learned.add(k);
    }
    this.usedThisRun.clear();
    if (this.hiddenIn) this.unhide();
    this.started = false;
    AudioManager.sfx('screech');
    AudioManager.sfx('hit');
    this.cameras.main.shake(350, 0.02);
    this.scribbleOver(() => {
      const key = `chase.caught.${Math.min(this.catches, 3)}` as TextKey;
      this.dialogue.say([{ who: null, text: t(key) }], () => {
        this.buildLayout();
        this.iris.setPosition(CHASE_START, FLOOR_Y + 4).setFlipX(false);
        this.shadowX = -420;
        this.ceilingWalk = false;
        this.shadow.setFlipY(false);
        this.shadowState = 'stalk';
        this.surgeIn = 7;
        this.fear = 0;
        AudioManager.setMusicLevel(0);
        this.cameras.main.fadeIn(400, 20, 16, 40);
        this.started = true;
      });
    });
  }

  /** Transición: la pantalla se llena de garabatos negros, como un niño tachando. */
  private scribbleOver(then: () => void): void {
    const g = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 20);
    let n = 0;
    AudioManager.sfx('scribble');
    this.time.addEvent({
      delay: 30,
      repeat: 24,
      callback: () => {
        n++;
        g.lineStyle(Phaser.Math.Between(6, 14), 0x0c0a14, 0.9);
        g.beginPath();
        let x = Phaser.Math.Between(0, GAME_WIDTH);
        let y = Phaser.Math.Between(0, GAME_HEIGHT);
        g.moveTo(x, y);
        for (let k = 0; k < 12; k++) {
          x += Phaser.Math.Between(-260, 260);
          y += Phaser.Math.Between(-160, 160);
          g.lineTo(x, y);
        }
        g.strokePath();
        if (n === 25) {
          g.fillStyle(0x0c0a14, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
          this.time.delayedCall(250, () => {
            g.destroy();
            then();
          });
        }
      },
    });
  }

  // ── El final: dejar de correr + 3 golpes suaves ──

  private reachDoor(): void {
    this.act = 3;
    this.phase = 'door';
    this.ceilingWalk = false;
    this.shadow.setFlipY(false);
    this.actText.setText(this.insomnia ? `${t('ui.act3')} · ☾` : t('ui.act3')).setColor('#ffd166');
    showActBanner(this, t('chase.act3'), '#ffd166');

    if (this.hiddenIn) this.unhide();
    this.iris.play(styledKey('iris-idle', STYLE), true);
    AudioManager.sfx('knock');
    this.time.delayedCall(250, () => AudioManager.sfx('knock'));
    this.showToast(t('chase.door'), 2600);
    this.shadowState = 'stalk';
    AudioManager.setMusicLevel(1);
    this.time.delayedCall(1400, () => {
      if (this.phase !== 'door') return;
      this.prompt
        .setPosition(this.iris.x, FLOOR_Y - 120)
        .setText(`✦ ${t('chase.turn')}`)
        .setVisible(true)
        .setInteractive({ useHandCursor: true });
      this.prompt.once('pointerdown', () => this.turnAround());
    });
  }

  private approachSlowly(dt: number): void {
    const target = this.iris.x - 170;
    if (this.shadowX < target) this.shadowX = Math.min(target, this.shadowX + 90 * dt);
    this.shadow.setPosition(this.shadowX, FLOOR_Y + 8 + Math.sin(this.time.now * 0.004) * 6);
    this.fear = Math.min(1, this.fear + 0.05 * dt);
    this.drawFear();
    this.vignette.setAlpha(0.25 + this.fear * 0.6);
  }

  private turnAround(): void {
    if (this.phase !== 'door') return;
    this.phase = 'reveal';
    this.prompt.setVisible(false).removeInteractive();
    this.iris.setFlipX(true);
    this.dialogue.say(
      [
        { who: null, text: t('chase.reveal.1') },
        { who: null, text: t('chase.reveal.2') },
      ],
      () => {
        this.phase = 'sit';
        this.showToast(this.inp.isTouch ? t('chase.sitTouch') : t('chase.sit'), 4500);
        this.shadowX = Math.min(this.shadowX, this.iris.x - 160);
        // Botón táctil explícito para agacharse / hacerse pequeña con 1 dedo
        this.sitBtn = this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT - 64, '▼', {
            fontFamily: FONT_KID,
            fontSize: '30px',
            color: '#2b2340',
            backgroundColor: '#fffdf6ee',
            padding: { x: 24, y: 8 },
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(DEPTH_HUD)
          .setInteractive({ useHandCursor: true });
        this.sitBtn.on('pointerdown', () => (this.holdTouchSit = true));
        this.sitBtn.on('pointerup', () => (this.holdTouchSit = false));
        this.sitBtn.on('pointerout', () => (this.holdTouchSit = false));
      },
    );
  }

  /** Mientras Iris se queda sentada, la sombra se encoge; si se levanta, vuelve a crecer. */
  private updateSit(dt: number): void {
    const sitting = this.inp.isDown('down') || this.holdTouchSit || this.inp.joyY > 0.35;
    if (sitting) {
      this.iris.anims.stop();
      this.iris
        .setTexture(styledKey('iris', STYLE), IRIS_FRAME.sit)
        .setOrigin(0.5, footOriginY(24));
      this.shrink = Math.min(1, this.shrink + dt / 4.2);
      this.fear = Math.max(0, this.fear - 0.25 * dt);
      if (!this.smallerTold && this.shrink > 0.3) {
        this.smallerTold = true;
        floatingText(this, this.iris.x - 80, FLOOR_Y - 200, t('chase.smaller'), {
          fontFamily: FONT_KID,
          fontSize: '22px',
          color: '#fffdf6',
          stroke: '#2b2340',
          strokeThickness: 5,
          wordWrap: { width: 380 },
          align: 'center',
        });
      }
    } else {
      if (!this.iris.anims.isPlaying) this.iris.play(styledKey('iris-idle', STYLE));
      this.shrink = Math.max(0, this.shrink - dt / 9);
      this.fear = Math.min(1, this.fear + 0.08 * dt);
    }
    const s = 1 - this.shrink * 0.72;
    this.shadow.setScale(s);
    this.shadowX = this.iris.x - 110 - 60 * s;
    this.shadow.setPosition(this.shadowX, FLOOR_Y + 8);
    this.drawFear();
    this.vignette.setAlpha(0.25 + this.fear * 0.6);
    this.fx?.configure({
      ...FX_PRESETS.chase,
      desat: Math.max(0, 0.72 - this.collected * 0.12) * (1 - this.shrink),
    });
    if (this.shrink >= 1) this.reveal();
  }

  private reveal(): void {
    this.phase = 'reveal';
    this.sitBtn?.destroy();
    this.sitBtn = undefined;
    AudioManager.setMusicLevel(0);
    AudioManager.sfx('echo');
    this.drawing = this.add
      .image(this.shadowX, FLOOR_Y + 6, 'chase-drawing-scary')
      .setOrigin(0.5, 1)
      .setScale(0.2)
      .setAngle(-8)
      .setDepth(35)
      .setAlpha(0);
    this.tweens.add({
      targets: this.shadow,
      alpha: 0,
      scale: 0.05,
      duration: 1200,
      onComplete: () => this.shadow.setVisible(false),
    });
    this.tweens.add({
      targets: this.drawing,
      alpha: 1,
      scale: 0.55,
      duration: 1200,
      ease: 'Back.out',
    });
    this.tweens.add({ targets: this.vignette, alpha: 0.1, duration: 2000 });
    this.tomas = addStyled(this, this.shadowX - 110, FLOOR_Y + 4, 'tomas', STYLE, {
      feet: true,
      scale: 1.1,
    })
      .setDepth(34)
      .setAlpha(0);
    this.tomas.play(styledKey('tomas-idle', STYLE));
    this.time.delayedCall(1200, () => {
      this.iris.play(styledKey('iris-idle', STYLE));
      this.dialogue.say(
        [
          { who: null, text: t('chase.reveal.3') },
          {
            who: 'tomas',
            text: t('chase.tomas.1'),
            action: () => this.tweens.add({ targets: this.tomas, alpha: 1, duration: 700 }),
          },
          { who: 'iris', text: t('chase.tomas.2'), mood: 'wow' },
          { who: 'tomas', text: t('chase.tomas.3') },
          { who: 'iris', text: t('chase.tomas.4'), mood: 'sad' },
          { who: 'tomas', text: t('chase.tomas.5') },
          { who: 'iris', text: t('chase.tomas.6'), mood: 'sad' },
          { who: 'tomas', text: t('chase.tomas.7') },
          { who: 'iris', text: t('chase.tomas.8') },
        ],
        () => this.beginKnockPact(),
      );
    });
  }

  /** Pacto interactivo de 3 golpes suaves en el piso (`chase.knockPrompt`). */
  private beginKnockPact(): void {
    this.phase = 'knock';
    this.knocks = 0;
    this.knockGuardUntil = this.time.now + 240;
    this.prompt
      .setPosition(this.iris.x - 40, FLOOR_Y - 120)
      .setText(t('chase.knockPrompt', { n: 0 }))
      .setVisible(true);
  }

  private registerKnock(): void {
    if (this.phase !== 'knock' || this.time.now < this.knockGuardUntil) return;
    this.knockGuardUntil = this.time.now + 120;
    this.knocks++;
    AudioManager.sfx('knock');
    burst(this, this.iris.x - 20, FLOOR_Y - 6, 0xffd23a, 10, 26);
    this.prompt.setText(t('chase.knockPrompt', { n: Math.min(3, this.knocks) }));
    if (this.knocks < 3) return;

    this.phase = 'reveal';
    this.prompt.setVisible(false);
    this.dialogue.say(
      [
        {
          who: null,
          text: t('chase.tomas.9'),
          action: () => {
            AudioManager.sfx('scribble');
            if (!this.drawing) return;
            this.tweens.add({
              targets: this.drawing,
              scaleX: 0,
              duration: 250,
              yoyo: true,
              onYoyo: () => this.drawing?.setTexture('chase-drawing-nice'),
            });
          },
        },
        {
          who: null,
          text: t('chase.tomas.10'),
          action: () => {
            if (this.tomas && this.drawing) {
              this.tweens.add({
                targets: this.tomas,
                angle: -80,
                y: FLOOR_Y + 10,
                x: this.drawing.x - 50,
                duration: 900,
              });
            }
            this.fx?.blendTo(
              this,
              { ...FX_PRESETS.chase, desat: 0, vignette: 0.3, boil: 0.6 },
              1500,
            );
          },
        },
      ],
      () => this.finish(),
    );
  }

  private finish(): void {
    AudioManager.sfx('win');
    AudioManager.sfx('key');
    const light = this.add
      .image(DOOR_X + 5, FLOOR_Y - 170, 'glow-soft')
      .setTint(0xffd166)
      .setScale(0)
      .setDepth(1)
      .setAlpha(0.9);
    this.tweens.add({ targets: light, scale: 5, duration: 1600 });
    this.tweens.add({ targets: this.door, scaleX: 0.1, duration: 1200, ease: 'Sine.inOut' });
    showReturnCard(this, 'crayon', t('chase.keyGet'), t('chase.fragment'), 'dibujo');
    SaveManager.markCompleted('chase', this.insomnia);
    SaveManager.data.nightmareDone = true;
    SaveManager.recordFireflies('chase', this.collected);
    SaveManager.save();
    this.time.delayedCall(4600, () => fadeToScene(this, 'Hub', undefined, 900));
  }
}
