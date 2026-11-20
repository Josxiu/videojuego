import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  DEPTH_HUD,
  FONT_HAND,
  FONT_DISPLAY,
  PIXEL_SCALE,
} from '../../config';
import { t } from '../../i18n';
import { applyWorldFX, type DreamFXPipeline } from '../../gfx/postfx';
import { CHARACTER_TEXTURES, CHARACTER_ANIMS } from '../../gfx/sprites';
import { ensureStyle, addStyled, styledKey } from '../../gfx/stylize';
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
import { burst } from '../../systems/Juice';
import { debug } from '../../systems/debug';
import { buildShadowTextures } from './art';

const STYLE = 'shadow';
const BOOTH = { x: 86, y: 468 };
const GOYO_SPEED = 112;
const ROSA_SPEED = 96;

type FilterColor = 'amber' | 'blue';
type PropKind = 'reel' | 'chair' | 'can';

interface Ledge {
  x0: number;
  x1: number;
  y: number;
}

interface ShadowProp {
  id: number;
  kind: PropKind;
  color: 'any' | 'amber' | 'blue';
  /** Centro de la utilería flotante y puente proyectado debajo. */
  x: number;
  y: number;
  bridgeX: number;
  bridgeY: number;
  span: number;
  sprite: Phaser.GameObjects.Image;
  lit: boolean;
  /** Tiempo de persistencia cálida tras apartar el haz. */
  afterglow: number;
  melt: number;
}

interface FireflyFrame {
  index: number;
  stage: 1 | 2;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  exposed: number;
  taken: boolean;
}

/**
 * Sueño 4 (1B · Don Goyo): Teatro de Sombras Chinescas y Linterna Mágica.
 *
 * - Acto I: proyectar sombras sólidas de utilería para cruzar el patio de butacas.
 * - Acto II: el foco recalienta si se deja quieto y la sombra azul de Rosa
 *   camina al revés desde el telón; hay que alternar filtro ámbar / azul.
 * - Acto III: el telón arde en blanco cegador y derrite cualquier puente; solo
 *   apuntando atrás / apagando el proyector se abre la cortina real del 1B.
 */
export class DreamShadow extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private fx?: DreamFXPipeline;

  private warmBackdrop!: Phaser.GameObjects.Image;
  private beamGfx!: Phaser.GameObjects.Graphics;
  private bridgeGfx!: Phaser.GameObjects.Graphics;
  private glareOverlay!: Phaser.GameObjects.Rectangle;
  private goyo!: Phaser.GameObjects.Sprite;
  private rosa?: Phaser.GameObjects.Image;
  private booth!: Phaser.GameObjects.Image;
  private rabbitSprite!: Phaser.GameObjects.Image;
  private scissorsSprite?: Phaser.GameObjects.Image;

  private actText!: Phaser.GameObjects.Text;
  private filterBtn!: Phaser.GameObjects.Text;
  private ffText!: Phaser.GameObjects.Text;
  private heatGfx!: Phaser.GameObjects.Graphics;
  private toast!: Phaser.GameObjects.Text;
  private turnOffBtn?: Phaser.GameObjects.Text;

  private act: 1 | 2 | 3 = 1;
  private insomnia = false;
  private started = false;
  private ending = false;
  private filter: FilterColor = 'amber';

  private aimX = 300;
  private aimY = 300;
  private beamX = 300;
  private beamY = 300;
  private downPos: { x: number; y: number; t: number } | null = null;
  private clickGuardUntil = 0;

  private ledges: Ledge[] = [];
  private props: ShadowProp[] = [];
  private fireflies: FireflyFrame[] = [];
  private collected = 0;

  private goyoX = 110;
  private goyoY = 378;
  private rosaX = 850;
  private rosaY = 378;
  private rosaAnimTimer = 0;
  private rosaFrame = 0;
  private goyoSafeX = 110;
  private goyoSafeY = 378;
  private rosaSafeX = 850;

  private heat = 0;
  private heatWarned = false;
  private backAimTime = 0;
  private rabbitHold = 0;
  private secretDone = false;
  private dustTimer = 0;
  private stepSoundTimer = 0;
  private scissorsX = 360;
  private scissorsDir = 1;

  constructor() {
    super('DreamShadow');
  }

  create(data: { insomnia?: boolean } = {}): void {
    this.resetState(Boolean(data.insomnia) || debug.flag('insomnia'));
    this.fx = applyWorldFX(this, 'shadow');
    this.cameras.main.setBackgroundColor(0x120a06);
    fadeIn(this, 650);
    AudioManager.playMusic('shadow', 0);

    buildShadowTextures(this);
    ensureStyle(
      this,
      STYLE,
      [
        ...CHARACTER_TEXTURES,
        'goyo',
        'boleto',
        'portrait-goyo',
        'portrait-iris',
        'portrait-morfeo',
      ],
      [...CHARACTER_ANIMS, 'goyo-idle'],
    );

    this.add.image(0, 0, 'shadow-backdrop').setOrigin(0).setDepth(0);
    this.warmBackdrop = this.add.image(0, 0, 'shadow-warmup').setOrigin(0).setDepth(1).setAlpha(0);

    this.bridgeGfx = this.add.graphics().setDepth(14);
    this.beamGfx = this.add.graphics().setDepth(28);
    this.glareOverlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xfff8e6, 0)
      .setDepth(26);

    this.rabbitSprite = this.add.image(335, 250, 'shadow-morfeo-rabbit').setDepth(12).setAlpha(0);

    this.booth = this.add
      .image(BOOTH.x, BOOTH.y + 8, 'shadow-booth')
      .setDepth(42)
      .setInteractive({ useHandCursor: true });
    this.booth.on('pointerdown', () => {
      if (this.act === 3 && this.started && !this.ending) {
        this.clickGuardUntil = this.time.now + 220;
        this.shatterGlareAndReveal();
      }
    });

    this.goyo = addStyled(this, this.goyoX, this.goyoY, 'goyo', STYLE, {
      feet: true,
      scale: 1.05,
    }).setDepth(22);
    this.goyo.play(styledKey('goyo-idle', STYLE));

    this.buildFireflies();
    this.buildHud();
    this.dialogue = new DialogueBox(this, 0x4a2410, STYLE);
    this.inp = new InputManager(this);
    this.bindPointerAim();

    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'), {
      onRestart: () => this.scene.restart({ insomnia: this.insomnia }),
    });

    const at = debug.flag('skip') ? debug.num('at', 0) : 0;
    this.setupStage(at >= 3 ? 3 : at >= 2 ? 2 : 1);

    if (debug.flag('skip')) {
      this.started = true;
      return;
    }

    showTitleCard(
      this,
      t('shadow.title'),
      t('shadow.name'),
      () => {
        this.dialogue.say(
          [
            { who: null, text: t('shadow.intro.1') },
            { who: null, text: t('shadow.intro.2') },
            { who: 'morfeo', text: t('shadow.intro.3') },
            { who: 'morfeo', text: t('shadow.intro.4'), mood: 'smug' },
          ],
          () => {
            showActBanner(this, t('shadow.act1'), '#ffbe55');
            this.showToast(t('shadow.hint'), 4200);
            this.started = true;
          },
        );
      },
      STYLE,
      this.insomnia ? t('shadow.insomnia') : undefined,
    );
  }

  private resetState(insomnia: boolean): void {
    this.act = 1;
    this.insomnia = insomnia;
    this.started = false;
    this.ending = false;
    this.filter = 'amber';
    this.aimX = 300;
    this.aimY = 300;
    this.beamX = 300;
    this.beamY = 300;
    this.downPos = null;
    this.clickGuardUntil = 0;
    this.ledges = [];
    this.props = [];
    this.fireflies = [];
    this.collected = 0;
    this.goyoX = 110;
    this.goyoY = 378;
    this.rosaX = 850;
    this.rosaY = 378;
    this.rosa = undefined;
    this.scissorsSprite = undefined;
    this.turnOffBtn = undefined;
    this.heat = 0;
    this.heatWarned = false;
    this.backAimTime = 0;
    this.rabbitHold = 0;
    this.secretDone = false;
    this.dustTimer = 0;
    this.stepSoundTimer = 0;
    this.scissorsX = 360;
    this.scissorsDir = 1;
  }

  // ── Controles 1 dedo y PC ──

  private bindPointerAim(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.started || this.dialogue.active || this.pause.paused() || this.ending) return;
      if (this.time.now < this.clickGuardUntil) return;
      if (p.rightButtonDown()) {
        this.toggleFilter();
        return;
      }
      this.downPos = { x: p.x, y: p.y, t: this.time.now };
      this.aimX = Phaser.Math.Clamp(p.x, 30, GAME_WIDTH - 30);
      this.aimY = Phaser.Math.Clamp(p.y, 40, GAME_HEIGHT - 30);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.started || this.dialogue.active || this.pause.paused() || this.ending) return;
      if (p.isDown || !this.inp.isTouch) {
        this.aimX = Phaser.Math.Clamp(p.x, 30, GAME_WIDTH - 30);
        this.aimY = Phaser.Math.Clamp(p.y, 40, GAME_HEIGHT - 30);
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.downPos) return;
      const dist = Math.hypot(p.x - this.downPos.x, p.y - this.downPos.y);
      const dt = this.time.now - this.downPos.t;
      this.downPos = null;
      if (!this.started || this.dialogue.active || this.pause.paused() || this.ending) return;
      if (this.time.now < this.clickGuardUntil) return;
      if (dist < 16 && dt < 280) this.toggleFilter();
    });
    // Evitar menú contextual con clic derecho al alternar acetato
    this.input.mouse?.disableContextMenu();
  }

  private toggleFilter(): void {
    if (this.act === 3 && this.ending) return;
    this.filter = this.filter === 'amber' ? 'blue' : 'amber';
    AudioManager.sfx('snip');
    this.updateFilterHud();
  }

  private updateFilterHud(): void {
    const amber = this.filter === 'amber';
    this.filterBtn
      .setText(amber ? `◐ ${t('shadow.filterAmber')}` : `◑ ${t('shadow.filterBlue')}`)
      .setColor(amber ? '#ffbe55' : '#5aa8ff');
    this.fx?.blendTo(
      this,
      {
        tint: amber ? 0xffb855 : 0x5aa8ff,
        tintAmount: amber ? 0.05 : 0.08,
      },
      260,
    );
  }

  // ── HUD y Luciérnagas ──

  private buildHud(): void {
    const fix = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ) => o.setScrollFactor(0).setDepth(DEPTH_HUD);

    fix(this.add.image(34, 34, 'shadow-ff').setScale(0.95));
    this.ffText = fix(
      this.add
        .text(60, 34, `${SaveManager.data.fireflies.shadow}/6`, {
          fontFamily: FONT_HAND,
          fontSize: '21px',
          color: '#ffeacc',
          stroke: '#120a06',
          strokeThickness: 4,
        })
        .setOrigin(0, 0.5),
    );

    this.filterBtn = fix(
      this.add
        .text(140, 34, `◐ ${t('shadow.filterAmber')}`, {
          fontFamily: FONT_DISPLAY,
          fontSize: '12px',
          color: '#ffbe55',
          backgroundColor: '#1f1108dd',
          padding: { x: 10, y: 6 },
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true }),
    );
    this.filterBtn.on('pointerdown', () => {
      this.clickGuardUntil = this.time.now + 240;
      this.toggleFilter();
    });

    this.heatGfx = fix(this.add.graphics());

    this.actText = fix(
      this.add
        .text(GAME_WIDTH - 92, 34, this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'), {
          fontFamily: FONT_HAND,
          fontSize: '19px',
          color: this.insomnia ? '#ff8a66' : '#ffeacc',
          stroke: '#120a06',
          strokeThickness: 4,
        })
        .setOrigin(1, 0.5),
    );

    this.toast = fix(
      this.add
        .text(GAME_WIDTH / 2, 116, '', {
          fontFamily: FONT_HAND,
          fontSize: '20px',
          color: '#ffeacc',
          backgroundColor: '#1f1108ee',
          padding: { x: 14, y: 6 },
          align: 'center',
          wordWrap: { width: 720 },
        })
        .setOrigin(0.5)
        .setVisible(false),
    );
  }

  private showToast(text: string, ms = 2800): void {
    this.toast.setText(text).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 450 });
  }

  private buildFireflies(): void {
    const coords: [1 | 2, number, number][] = [
      [1, 245, 135],
      [1, 515, 125],
      [1, 835, 175],
      [2, 200, 155],
      [2, 480, 120],
      [2, 780, 160],
    ];
    coords.forEach(([stage, x, y], index) => {
      const got = SaveManager.hasFirefly('shadow', index);
      const sprite = this.add
        .image(x, y, 'shadow-ff')
        .setDepth(32)
        .setAlpha(got ? 0.2 : 0)
        .setVisible(stage === 1);
      this.fireflies.push({ index, stage, x, y, sprite, exposed: 0, taken: false });
    });
  }

  // ── Escenarios por Acto ──

  private clearStage(): void {
    for (const p of this.props) p.sprite.destroy();
    this.props = [];
    this.rosa?.destroy();
    this.rosa = undefined;
    this.scissorsSprite?.destroy();
    this.scissorsSprite = undefined;
    this.turnOffBtn?.destroy();
    this.turnOffBtn = undefined;
    this.heat = 0;
    this.heatWarned = false;
    this.backAimTime = 0;
  }

  private addProp(
    id: number,
    kind: PropKind,
    color: 'any' | 'amber' | 'blue',
    x: number,
    y: number,
    bridgeY: number,
    span: number,
  ): void {
    const tex =
      color === 'any'
        ? `shadow-prop-${kind === 'can' ? 'reel' : kind}-any`
        : `shadow-prop-${kind}-${color}`;
    const sprite = this.add.image(x, y, tex).setDepth(20).setAlpha(0.72);
    this.props.push({
      id,
      kind,
      color,
      x,
      y,
      bridgeX: x,
      bridgeY,
      span,
      sprite,
      lit: false,
      afterglow: 0,
      melt: 0,
    });
  }

  private setupStage(stage: 1 | 2 | 3): void {
    this.clearStage();
    this.act = stage;
    for (const ff of this.fireflies) {
      if (!ff.taken) ff.sprite.setVisible(ff.stage === stage);
    }

    if (stage === 1) {
      this.actText.setText(this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'));
      this.ledges = [
        { x0: 40, x1: 205, y: 378 },
        { x0: 440, x1: 550, y: 365 },
        { x0: 770, x1: 915, y: 358 },
      ];
      this.goyoSafeX = 110;
      this.goyoSafeY = 378;
      this.goyoX = 110;
      this.goyoY = 378;
      this.addProp(0, 'reel', 'any', 268, 332, 374, 150);
      this.addProp(1, 'chair', 'any', 385, 326, 370, 150);
      this.addProp(2, 'reel', 'any', 602, 320, 362, 145);
      this.addProp(3, 'chair', 'any', 720, 316, 360, 150);
      AudioManager.setMusicLevel(0);
      return;
    }

    if (stage === 2) {
      this.actText
        .setText(this.insomnia ? `${t('ui.act2')} · ☾` : t('ui.act2'))
        .setColor('#5aa8ff');
      this.ledges = [
        { x0: 40, x1: 180, y: 378 },
        { x0: 432, x1: 528, y: 374 },
        { x0: 785, x1: 920, y: 378 },
      ];
      this.goyoSafeX = 105;
      this.goyoSafeY = 378;
      this.goyoX = 105;
      this.goyoY = 378;
      this.rosaSafeX = 855;
      this.rosaX = 855;
      this.rosaY = 378;
      this.goyo.setPosition(this.goyoX, this.goyoY).setFlipX(false);

      this.rosa = this.add
        .image(this.rosaX, this.rosaY, 'shadow-rosa-0')
        .setOrigin(0.5, 1)
        .setDepth(22);

      // Lado de Goyo: ámbar + azul
      this.addProp(0, 'can', 'amber', 242, 330, 376, 152);
      this.addProp(1, 'chair', 'blue', 370, 330, 375, 152);
      // Lado de Rosa: azul + ámbar
      this.addProp(2, 'can', 'blue', 722, 330, 376, 152);
      this.addProp(3, 'reel', 'amber', 592, 330, 375, 152);

      if (this.insomnia) {
        this.scissorsSprite = this.add
          .image(360, 305, 'shadow-scissors')
          .setDepth(25)
          .setAlpha(0.95);
      }

      AudioManager.setMusicLevel(1);
      showActBanner(this, t('shadow.act2'), '#5aa8ff');
      this.showToast(t('shadow.twist'), 5200);
      return;
    }

    // Acto III: el telón arde en blanco cegador y derrite cualquier puente
    this.actText.setText(this.insomnia ? `${t('ui.act3')} · ☾` : t('ui.act3')).setColor('#fff5d6');
    this.ledges = [{ x0: 360, x1: 580, y: 376 }];
    this.goyoX = 470;
    this.goyoY = 376;
    this.goyo.setPosition(this.goyoX, this.goyoY).setFlipX(false);
    this.addProp(0, 'reel', 'amber', 640, 330, 376, 140);
    this.addProp(1, 'chair', 'blue', 300, 330, 376, 140);

    this.tweens.add({ targets: this.glareOverlay, alpha: 0.78, duration: 700 });
    this.fx?.blendTo(this, { tint: 0xfff8eb, tintAmount: 0.34, vignette: 0.16 }, 700);
    AudioManager.setMusicLevel(2);
    AudioManager.sfx('projector');
    showActBanner(this, t('shadow.act3'), '#ffeacc');
    this.showToast(t('shadow.ruleBreakHint'), 6000);

    this.turnOffBtn = this.add
      .text(205, 492, `⏏ ${t('shadow.turnOff')}`, {
        fontFamily: FONT_DISPLAY,
        fontSize: '12px',
        color: '#120a06',
        backgroundColor: '#ffcf66',
        padding: { x: 10, y: 7 },
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH_HUD)
      .setInteractive({ useHandCursor: true });
    this.turnOffBtn.on('pointerdown', () => {
      this.clickGuardUntil = this.time.now + 240;
      this.shatterGlareAndReveal();
    });
    this.tweens.add({
      targets: this.turnOffBtn,
      scale: 1.06,
      duration: 550,
      yoyo: true,
      repeat: -1,
    });
  }

  // ── Bucle Principal ──

  update(time: number, deltaMs: number): void {
    this.inp.update();
    const dt = Math.min(deltaMs / 1000, 0.05);
    if (!this.started || this.pause.paused() || this.dialogue.active || this.ending) {
      this.drawBeamAndBridges();
      return;
    }

    if (this.inp.justDown('interact')) this.toggleFilter();
    this.updateAimFromKeys(dt);

    const prevX = this.beamX;
    const prevY = this.beamY;
    this.beamX = Phaser.Math.Linear(this.beamX, this.aimX, Math.min(1, dt * 16));
    this.beamY = Phaser.Math.Linear(this.beamY, this.aimY, Math.min(1, dt * 16));
    const speed = Math.hypot(this.beamX - prevX, this.beamY - prevY) / Math.max(dt, 0.001);

    this.updateProps(dt);
    this.updateFireflies(dt);
    this.updateWalkers(dt);
    this.updateActEvents(time, dt, speed);
    this.drawBeamAndBridges();
  }

  private updateAimFromKeys(dt: number): void {
    let kx = 0;
    let ky = 0;
    if (this.inp.isDown('left')) kx -= 1;
    if (this.inp.isDown('right')) kx += 1;
    if (this.inp.isDown('up')) ky -= 1;
    if (this.inp.isDown('down')) ky += 1;
    if (kx || ky) {
      const len = Math.hypot(kx, ky);
      this.aimX = Phaser.Math.Clamp(this.aimX + (kx / len) * 420 * dt, 30, GAME_WIDTH - 30);
      this.aimY = Phaser.Math.Clamp(this.aimY + (ky / len) * 420 * dt, 40, GAME_HEIGHT - 30);
    }
  }

  private updateProps(dt: number): void {
    for (const p of this.props) {
      const match = p.color === 'any' || p.color === this.filter;
      p.sprite.setAlpha(match ? 0.92 : 0.22);
      const d = Math.hypot(this.beamX - p.x, this.beamY - p.y);
      const db = Math.hypot(this.beamX - p.bridgeX, this.beamY - p.bridgeY);
      const inCone = match && (d < 135 || db < 130);

      if (this.act === 3) {
        if (inCone) {
          p.melt = Math.min(1, p.melt + dt * 2.8);
          p.lit = p.melt < 0.75;
          if (p.melt >= 0.75 && Math.random() < 0.2) {
            burst(this, p.bridgeX, p.bridgeY, 0xffd166, 4, 24);
          }
        } else {
          p.lit = false;
          p.melt = Math.max(0, p.melt - dt * 1.5);
        }
        continue;
      }

      if (inCone) {
        p.lit = true;
        p.afterglow = this.insomnia ? 1.5 : 2.5;
      } else {
        p.afterglow = Math.max(0, p.afterglow - dt);
        p.lit = p.afterglow > 0;
      }
    }
  }

  private hasGroundAt(x: number): number | null {
    for (const l of this.ledges) {
      if (x >= l.x0 - 8 && x <= l.x1 + 8) return l.y;
    }
    for (const p of this.props) {
      if (p.lit && x >= p.bridgeX - p.span / 2 && x <= p.bridgeX + p.span / 2) return p.bridgeY;
    }
    return null;
  }

  private updateWalkers(dt: number): void {
    if (this.act === 3) return;
    // Don Goyo camina hacia la derecha si hay suelo firme delante
    const nextGoyo = this.goyoX + GOYO_SPEED * dt;
    const aheadGoyo = this.hasGroundAt(this.goyoX + 18);
    if (aheadGoyo !== null) {
      this.goyoX = nextGoyo;
      this.goyoY = Phaser.Math.Linear(this.goyoY, aheadGoyo, Math.min(1, dt * 12));
      this.goyo.setAngle(Math.sin(this.time.now * 0.015) * 4);
      this.stepSoundTimer -= dt;
      if (this.stepSoundTimer <= 0) {
        this.stepSoundTimer = 0.34;
        AudioManager.sfx('step');
      }
    } else {
      this.goyo.setAngle(0);
    }
    this.goyo.setPosition(this.goyoX, this.goyoY);

    if (this.act === 1 && this.goyoX >= 820) {
      AudioManager.sfx('collect');
      burst(this, this.goyoX, this.goyoY - 30, 0xffbe55, 16, 42);
      this.setupStage(2);
      return;
    }

    // Acto II: Rosa camina en sentido contrario desde el telón
    if (this.act === 2 && this.rosa) {
      const aheadRosa = this.hasGroundAt(this.rosaX - 18);
      if (aheadRosa !== null && this.rosaX > 488) {
        this.rosaX -= ROSA_SPEED * dt;
        this.rosaY = Phaser.Math.Linear(this.rosaY, aheadRosa, Math.min(1, dt * 12));
        this.rosaAnimTimer += dt;
        if (this.rosaAnimTimer > 0.22) {
          this.rosaAnimTimer = 0;
          this.rosaFrame = 1 - this.rosaFrame;
          this.rosa.setTexture(`shadow-rosa-${this.rosaFrame}`);
        }
      }
      this.rosa.setPosition(this.rosaX, this.rosaY);

      if (this.goyoX >= 460 && this.rosaX <= 502) {
        this.goyo.setAngle(0);
        AudioManager.sfx('bloom');
        burst(this, 480, 340, 0x5aa8ff, 22, 46);
        this.showToast(t('shadow.reunited'), 2800);
        this.time.delayedCall(900, () => {
          if (!this.ending && this.act === 2) this.setupStage(3);
        });
      }
    }
  }

  private updateFireflies(dt: number): void {
    for (const ff of this.fireflies) {
      if (ff.taken || ff.stage !== this.act) continue;
      const dist = Math.hypot(this.beamX - ff.x, this.beamY - ff.y);
      if (this.filter === 'blue' && dist < 115) {
        ff.exposed += dt;
        ff.sprite.setAlpha(Math.min(1, ff.sprite.alpha + dt * 4));
        if (ff.exposed >= 0.22) {
          ff.taken = true;
          this.collected++;
          SaveManager.collectFirefly('shadow', ff.index);
          this.ffText.setText(`${SaveManager.data.fireflies.shadow}/6`);
          AudioManager.sfx('collect');
          burst(this, ff.x, ff.y, 0xffcf66, 16, 40);
          this.tweens.add({ targets: ff.sprite, scale: 2, alpha: 0, duration: 420 });
        }
      } else if (!SaveManager.hasFirefly('shadow', ff.index)) {
        ff.sprite.setAlpha(Math.max(0, ff.sprite.alpha - dt * 1.4));
      }
    }
  }

  private updateActEvents(time: number, dt: number, beamSpeed: number): void {
    // Polvo flotante en el cono de luz
    this.dustTimer += dt;
    if (this.dustTimer > 0.16) {
      this.dustTimer = 0;
      const p = this.add
        .circle(
          this.beamX + Phaser.Math.Between(-50, 50),
          this.beamY + Phaser.Math.Between(-50, 50),
          1.8,
          this.filter === 'amber' ? 0xffe4a0 : 0x8cc7ff,
          0.7,
        )
        .setDepth(27);
      this.tweens.add({
        targets: p,
        y: p.y - 18,
        alpha: 0,
        duration: 900,
        onComplete: () => p.destroy(),
      });
    }

    if (this.act === 2) {
      // Secreto: Morfeo haciendo orejas de conejo si iluminas la esquina inferior izquierda en ámbar 2s
      const onBoothCorner = this.beamX < 215 && this.beamY > 360 && this.filter === 'amber';
      if (!this.secretDone && onBoothCorner) {
        this.rabbitHold += dt;
        if (this.rabbitHold >= 1.8) {
          this.secretDone = true;
          SaveManager.markSecret('shadow');
          AudioManager.sfx('secret');
          showSecretBanner(this, t('shadow.secret'));
          this.rabbitSprite.setAlpha(0);
          this.tweens.add({
            targets: this.rabbitSprite,
            alpha: 0.92,
            yoyo: true,
            hold: 2600,
            duration: 600,
          });
          burst(this, this.rabbitSprite.x, this.rabbitSprite.y, 0xffbe55, 22, 48);
        }
      } else {
        this.rabbitHold = Math.max(0, this.rabbitHold - dt * 1.5);
      }

      // Tijeras de censura en Modo Desvelo
      if (this.insomnia && this.scissorsSprite) {
        this.scissorsX += this.scissorsDir * 105 * dt;
        if (this.scissorsX > 660 || this.scissorsX < 300) this.scissorsDir *= -1;
        this.scissorsSprite
          .setPosition(this.scissorsX, 326 + Math.sin(time * 0.005) * 32)
          .setAngle(Math.sin(time * 0.01) * 14);
        for (const p of this.props) {
          if (p.lit && Math.abs(this.scissorsX - p.bridgeX) < 34) {
            p.lit = false;
            p.afterglow = 0;
            AudioManager.sfx('snip');
          }
        }
      }

      // Sobrecalentamiento si dejas quieto el foco fuera del rincón del secreto
      const rate = this.insomnia ? 22 : 12;
      if (beamSpeed < 22 && !onBoothCorner) {
        this.heat = Math.min(100, this.heat + rate * dt);
        if (this.heat >= 70 && !this.heatWarned) {
          this.heatWarned = true;
          AudioManager.sfx('screech');
          this.showToast(t('shadow.heatWarn'), 2200);
        }
        if (this.heat >= 100) {
          this.burnCelluloid();
        }
      } else {
        this.heat = Math.max(0, this.heat - 26 * dt);
        if (this.heat < 40) this.heatWarned = false;
      }
      this.drawHeatBar();
    } else {
      this.heatGfx.clear();
    }

    // Acto III: apuntar hacia atrás a la cabina apaga el arco eléctrico
    if (this.act === 3 && this.beamX < 185 && this.beamY > 380) {
      this.backAimTime += dt;
      if (this.backAimTime >= 0.85) this.shatterGlareAndReveal();
    } else {
      this.backAimTime = 0;
    }
  }

  private drawHeatBar(): void {
    const g = this.heatGfx;
    g.clear();
    if (this.act !== 2 || this.heat <= 2) return;
    const w = 130;
    g.fillStyle(0x1f1108, 0.85).fillRoundedRect(380, 26, w, 12, 6);
    const col = this.heat >= 70 ? 0xff4d3b : 0xffbe55;
    g.fillStyle(col, 0.95).fillRoundedRect(380, 26, (w * this.heat) / 100, 12, 6);
  }

  private burnCelluloid(): void {
    this.heat = 0;
    this.heatWarned = false;
    AudioManager.sfx('screech');
    burst(this, this.beamX, this.beamY, 0xff6a2a, 24, 54);
    this.cameras.main.shake(220, 0.008);
    this.showToast(t('shadow.burn'), 2400);
    this.goyoX = this.goyoSafeX;
    this.goyoY = this.goyoSafeY;
    this.rosaX = this.rosaSafeX;
  }

  private drawBeamAndBridges(): void {
    const bg = this.bridgeGfx;
    bg.clear();

    // Repisas permanentes en el telón
    for (const l of this.ledges) {
      bg.fillStyle(0x0b0604, 0.96).fillRoundedRect(l.x0, l.y, l.x1 - l.x0, 16, 4);
      bg.lineStyle(2, 0xffbe55, 0.55).strokeRoundedRect(l.x0, l.y, l.x1 - l.x0, 16, 4);
    }

    // Sombras puente proyectadas desde la utilería iluminada
    for (const p of this.props) {
      if (!p.lit) continue;
      const alpha = this.act === 3 ? Math.max(0.15, 1 - p.melt) : Math.min(1, p.afterglow + 0.35);
      const rim = p.color === 'blue' ? 0x5aa8ff : 0xffbe55;
      bg.fillStyle(0x090503, 0.95 * alpha).fillRoundedRect(
        p.bridgeX - p.span / 2,
        p.bridgeY,
        p.span,
        15,
        4,
      );
      bg.lineStyle(2, rim, 0.85 * alpha).strokeRoundedRect(
        p.bridgeX - p.span / 2,
        p.bridgeY,
        p.span,
        15,
        4,
      );
      // Rayos de proyección del objeto al puente
      bg.lineStyle(1, rim, 0.22 * alpha);
      bg.lineBetween(p.x - 24, p.y, p.bridgeX - p.span / 2, p.bridgeY);
      bg.lineBetween(p.x + 24, p.y, p.bridgeX + p.span / 2, p.bridgeY);
    }

    // Cono de luz de la linterna mágica
    const lm = this.beamGfx;
    lm.clear();
    if (this.ending && this.warmBackdrop.alpha > 0.5) return;

    const col = this.filter === 'amber' ? 0xffbe55 : 0x5aa8ff;
    const lx = BOOTH.x + 48;
    const ly = BOOTH.y - 8;
    const dx = this.beamX - lx;
    const dy = this.beamY - ly;
    const dist = Math.hypot(dx, dy);
    const R = 120;

    lm.fillStyle(col, this.act === 3 ? 0.22 : 0.14);
    if (dist > R + 6) {
      const ang = Math.atan2(dy, dx);
      const half = Math.asin(R / dist);
      const t1 = ang - (Math.PI / 2 + half);
      const t2 = ang + (Math.PI / 2 + half);
      lm.beginPath();
      lm.moveTo(lx, ly);
      lm.lineTo(this.beamX + Math.cos(t1) * R, this.beamY + Math.sin(t1) * R);
      lm.arc(this.beamX, this.beamY, R, t1, t2, false);
      lm.closePath();
      lm.fillPath();
    } else {
      lm.fillCircle(this.beamX, this.beamY, R);
    }

    lm.fillStyle(col, 0.08);
    lm.fillCircle(this.beamX, this.beamY, 62);
    lm.lineStyle(2, col, 0.55);
    lm.strokeCircle(this.beamX, this.beamY, R);
  }

  // ── Acto III Ruptura de Regla y Final ──

  private shatterGlareAndReveal(): void {
    if (this.ending) return;
    this.ending = true;
    this.turnOffBtn?.destroy();
    this.turnOffBtn = undefined;
    this.heatGfx.clear();

    AudioManager.sfx('click');
    AudioManager.sfx('door');
    AudioManager.setMusicLevel(3);

    this.tweens.add({ targets: this.glareOverlay, alpha: 0, duration: 900 });
    this.tweens.add({ targets: this.warmBackdrop, alpha: 1, duration: 1500 });
    this.tweens.add({ targets: this.props.map((p) => p.sprite), alpha: 0, duration: 900 });
    this.fx?.blendTo(this, { tint: 0xffe4b5, tintAmount: 0.04, vignette: 0.22 }, 1500);

    // Iris entra en color real y Goyo deja de ser silueta para verse de frente
    const iris = this.add
      .sprite(240, 382, 'iris', '0')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 1.05)
      .setDepth(24)
      .setAlpha(0);
    const realGoyo = this.add
      .sprite(470, 382, 'goyo', '0')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 1.05)
      .setDepth(24)
      .setAlpha(0);
    realGoyo.play('goyo-idle');
    this.tweens.add({ targets: this.goyo, alpha: 0, duration: 800 });
    this.tweens.add({ targets: [iris, realGoyo], alpha: 1, duration: 1200 });

    this.dialogue.say(
      [
        { who: 'goyo', text: t('shadow.goyo.1') },
        { who: 'goyo', text: t('shadow.goyo.2') },
        { who: 'goyo', text: t('shadow.goyo.3') },
        { who: 'iris', text: t('shadow.goyo.4') },
        { who: 'goyo', text: t('shadow.goyo.5') },
        { who: 'goyo', text: t('shadow.goyo.6') },
      ],
      () => this.win(),
    );
  }

  private win(): void {
    AudioManager.sfx('win');
    AudioManager.sfx('key');
    showReturnCard(this, STYLE, t('shadow.keyGet'), t('shadow.fragment'), 'boleto');
    SaveManager.markCompleted('shadow', this.insomnia);
    SaveManager.recordFireflies('shadow', this.collected);
    this.time.delayedCall(4400, () => fadeToScene(this, 'Hub', undefined, 900));
  }
}
