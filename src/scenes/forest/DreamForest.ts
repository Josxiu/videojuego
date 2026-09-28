import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH_HUD, FONT_HAND } from '../../config';
import { t } from '../../i18n';
import type { TextKey } from '../../i18n';
import { applyWorldFX, type DreamFXPipeline } from '../../gfx/postfx';
import { CHARACTER_TEXTURES, CHARACTER_ANIMS } from '../../gfx/sprites';
import {
  ensureStyle,
  styledKey,
  addStyled,
  stylizeTexture,
  STYLE_DISPLAY,
} from '../../gfx/stylize';
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
} from '../../systems/ui';
import { debug } from '../../systems/debug';
import {
  PATIO_PLANTS,
  PATIO_PROPS,
  PATIO_FIREFLIES,
  PATIO_MEMORIES,
  PATIO_START_FX,
} from '../../data/patio';
import { paintPatio, WORLD_W, WORLD_H, RES, PILA, TREE, START, BOUNDS } from './art';

const STYLE = 'watercolor';
const SPEED = 190;
/** Cada cuántos píxeles caminados cae una gota del bote. */
const DRIP_EVERY = 26;
const POUR_COST = 25;
const CELL = 40;

interface PlantState {
  x: number;
  y: number;
  kind: string;
  group: number;
  watered: boolean;
  sprite: Phaser.GameObjects.Image;
}

interface PropState {
  key: string;
  x: number;
  y: number;
  r: number;
  painted: boolean;
  sprite: Phaser.GameObjects.Image;
}

interface Firefly {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  shown: boolean;
  taken: boolean;
}

type Facing = 'side' | 'front' | 'back';

/**
 * Sueño de Doña Chuy: el patio de su infancia, despintado.
 *
 * El patio es un boceto a lápiz. Iris carga el bote agujereado: cada gota
 * que cae borra el boceto y deja ver la acuarela de abajo. Hay que llenar el
 * bote en la pila, planear el camino (se vacía caminando) y regar las
 * macetas de cada etapa de su vida para que vuelvan sus recuerdos.
 */
export class DreamForest extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private fx?: DreamFXPipeline;
  private cover!: Phaser.GameObjects.RenderTexture;
  private brush!: Phaser.GameObjects.Image;
  private iris!: Phaser.GameObjects.Sprite;
  private can!: Phaser.GameObjects.Image;
  private prompt!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private waterBar!: Phaser.GameObjects.Graphics;
  private ffText!: Phaser.GameObjects.Text;
  private memoryIcons: Phaser.GameObjects.Text[] = [];

  private plants: PlantState[] = [];
  private props: PropState[] = [];
  private fireflies: Firefly[] = [];
  private wet = new Uint8Array(0);
  private jaula!: Phaser.GameObjects.Image;
  private started = false;
  private ending = false;
  private water = 0;
  private walked = 0;
  private group = 0;
  private collected = 0;
  private facing: Facing = 'back';

  constructor() {
    super('DreamForest');
  }

  create(): void {
    this.resetState();
    this.fx = applyWorldFX(this, 'forest');
    this.fx?.configure(PATIO_START_FX);
    this.cameras.main.setBackgroundColor(0xf4ecd8);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    fadeIn(this, 700);
    AudioManager.playMusic('forest', 0);

    paintPatio(this);
    ensureStyle(
      this,
      STYLE,
      [
        ...CHARACTER_TEXTURES,
        'bote',
        'chuy',
        'chuynina',
        'chuymama',
        'hijo',
        'portrait-iris',
        'portrait-morfeo',
      ],
      [...CHARACTER_ANIMS, 'chuy-idle'],
    );

    // Abajo la acuarela, encima el boceto que se irá borrando
    this.add
      .image(0, 0, 'patio-paint')
      .setOrigin(0)
      .setScale(1 / RES)
      .setDepth(0);
    this.cover = this.add
      .renderTexture(0, 0, WORLD_W * RES, WORLD_H * RES)
      .setOrigin(0)
      .setScale(1 / RES)
      .setDepth(5);
    this.cover.draw('patio-sketch', 0, 0);
    this.brush = this.make.image({ key: 'wc-stamp-0', add: false }).setOrigin(0.5);
    this.wet = new Uint8Array(Math.ceil(WORLD_W / CELL) * Math.ceil(WORLD_H / CELL));

    this.buildProps();
    this.buildPlants();
    this.buildFireflies();

    this.iris = addStyled(this, START.x, START.y, 'iris', STYLE, {
      frame: '14',
      feet: true,
    }).setDepth(START.y);
    this.can = addStyled(this, START.x, START.y, 'bote', STYLE, { scale: 0.8 }).setDepth(
      START.y + 1,
    );
    this.cameras.main.startFollow(this.iris, true, 0.09, 0.09);
    // La pila siempre tiene color: de ahí sale el agua
    this.paint(PILA.x, PILA.y, 130, 5);

    this.buildHud();
    this.dialogue = new DialogueBox(this, 0x7a5a9a, 'watercolor');
    this.inp = new InputManager(this);
    if (this.inp.isTouch) {
      this.inp.addJoystick();
      this.inp.addButton(GAME_WIDTH - 100, GAME_HEIGHT - 90, 44, '✦', 'interact');
    }
    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'));

    if (debug.flag('skip')) {
      const at = debug.num('at', 0);
      for (let g = 0; g < at; g++) {
        for (const p of this.plants.filter((pp) => pp.group === g)) this.bloom(p, true);
        this.group = g + 1;
      }
      this.refreshPlants();
      this.water = 100;
      this.started = true;
      if (at >= 3) this.heartMoment();
      return;
    }
    showTitleCard(
      this,
      t('forest.title'),
      t('forest.name'),
      () => {
        this.dialogue.say(
          [
            { who: null, text: t('forest.intro.1') },
            { who: null, text: t('forest.intro.2') },
            { who: 'morfeo', text: t('forest.intro.3') },
            { who: 'morfeo', text: t('forest.intro.4'), mood: 'smug' },
          ],
          () => {
            this.showToast(this.inp.isTouch ? t('forest.hint') : t('forest.hintKeys'), 4000);
            this.started = true;
          },
        );
      },
      'watercolor',
    );
  }

  private resetState(): void {
    this.plants = [];
    this.props = [];
    this.fireflies = [];
    this.memoryIcons = [];
    this.started = false;
    this.ending = false;
    this.water = 0;
    this.walked = 0;
    this.group = 0;
    this.collected = 0;
    this.facing = 'back';
  }

  // ── Construcción ──

  private buildProps(): void {
    for (const [key, x, y, r] of PATIO_PROPS) {
      const sprite = this.add.image(x, y, `${key}-sketch`).setOrigin(0.5, 1).setDepth(y);
      this.props.push({ key, x, y, r, painted: false, sprite });
    }
    this.jaula = this.add.image(330, 40, 'jaula-sketch').setOrigin(0.5, 0).setDepth(20);
  }

  private buildPlants(): void {
    for (const p of PATIO_PLANTS) {
      const sprite = this.add
        .image(p.x, p.y, `maceta-${p.kind}-seca`)
        .setOrigin(0.5, 0.95)
        .setDepth(p.y)
        .setScale(1.35);
      this.plants.push({ ...p, watered: false, sprite });
    }
    this.refreshPlants();
  }

  /** Las macetas de recuerdos futuros apenas se insinúan en el boceto. */
  private refreshPlants(): void {
    for (const p of this.plants) {
      if (p.watered) continue;
      const target = p.group === this.group ? 1 : 0.18;
      if (p.sprite.alpha !== target) {
        this.tweens.add({ targets: p.sprite, alpha: target, duration: 900 });
      }
    }
  }

  private buildFireflies(): void {
    for (const [x, y] of PATIO_FIREFLIES) {
      const sprite = this.add
        .image(x, y, 'wc-firefly')
        .setDepth(y + 40)
        .setAlpha(0);
      this.fireflies.push({ x, y, sprite, shown: false, taken: false });
    }
  }

  private buildHud(): void {
    const fix = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ) => o.setScrollFactor(0).setDepth(DEPTH_HUD);
    fix(this.add.image(36, 40, stylizeTexture(this, 'bote', STYLE)).setScale(STYLE_DISPLAY * 1.2));
    this.waterBar = fix(this.add.graphics());
    fix(this.add.image(40, 92, 'wc-firefly').setScale(0.9));
    this.ffText = fix(
      this.add
        .text(62, 92, `0/${PATIO_FIREFLIES.length}`, {
          fontFamily: FONT_HAND,
          fontSize: '22px',
          color: '#4a3a2a',
        })
        .setOrigin(0, 0.5),
    );
    ['I', 'II', 'III'].forEach((n, i) => {
      this.memoryIcons.push(
        fix(
          this.add
            .text(GAME_WIDTH / 2 - 50 + i * 50, 30, n, {
              fontFamily: FONT_HAND,
              fontSize: '26px',
              color: '#b8ac98',
            })
            .setOrigin(0.5),
        ),
      );
    });
    this.prompt = this.add
      .text(0, 0, '', {
        fontFamily: FONT_HAND,
        fontSize: '20px',
        color: '#4a3a2a',
        backgroundColor: '#f6efdcdd',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_HUD - 1)
      .setVisible(false);
    this.toast = fix(
      this.add
        .text(GAME_WIDTH / 2, 88, '', {
          fontFamily: FONT_HAND,
          fontSize: '21px',
          color: '#4a3a2a',
          align: 'center',
          backgroundColor: '#f6efdcee',
          padding: { x: 14, y: 6 },
          wordWrap: { width: 720 },
        })
        .setOrigin(0.5)
        .setVisible(false),
    );
    this.drawWater();
  }

  private drawWater(): void {
    const g = this.waterBar;
    g.clear();
    g.fillStyle(0x4a3a2a, 0.15);
    g.fillRoundedRect(62, 32, 110, 14, 7);
    g.fillStyle(0x4a9ad8, 0.85);
    g.fillRoundedRect(62, 32, Math.max(0, 110 * (this.water / 100)), 14, 7);
  }

  private showToast(text: string, ms = 2200): void {
    this.toast.setText(text).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 400 });
  }

  // ── Pintar ──

  /** Borra el boceto con manchas irregulares: aparece la acuarela de abajo. */
  private paint(x: number, y: number, r: number, stamps = 1): void {
    for (let i = 0; i < stamps; i++) {
      const ox = stamps > 1 ? Phaser.Math.Between(-r * 0.5, r * 0.5) : 0;
      const oy = stamps > 1 ? Phaser.Math.Between(-r * 0.4, r * 0.4) : 0;
      const rr = stamps > 1 ? r * Phaser.Math.FloatBetween(0.5, 0.8) : r;
      this.brush
        .setTexture(`wc-stamp-${Phaser.Math.Between(0, 2)}`)
        .setScale((rr * RES) / 20)
        .setAngle(Phaser.Math.Between(0, 360));
      this.cover.erase(this.brush, (x + ox) * RES, (y + oy) * RES);
    }
    this.markWet(x, y, r);
  }

  private markWet(x: number, y: number, r: number): void {
    const cols = Math.ceil(WORLD_W / CELL);
    const rows = Math.ceil(WORLD_H / CELL);
    const c0 = Math.max(0, Math.floor((x - r) / CELL));
    const c1 = Math.min(cols - 1, Math.floor((x + r) / CELL));
    const r0 = Math.max(0, Math.floor((y - r) / CELL));
    const r1 = Math.min(rows - 1, Math.floor((y + r) / CELL));
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        if (Math.hypot(cx * CELL + CELL / 2 - x, cy * CELL + CELL / 2 - y) < r)
          this.wet[cy * cols + cx] = 1;
      }
    }
    for (const p of this.props) {
      if (!p.painted && Math.hypot(p.x - x, p.y - y) < r + 60) this.paintProp(p);
    }
  }

  private isWet(x: number, y: number): boolean {
    const cols = Math.ceil(WORLD_W / CELL);
    return this.wet[Math.floor(y / CELL) * cols + Math.floor(x / CELL)] === 1;
  }

  private paintProp(p: PropState): void {
    p.painted = true;
    const painted = this.add
      .image(p.x, p.y, `${p.key}-paint`)
      .setOrigin(0.5, 1)
      .setDepth(p.y)
      .setAlpha(0);
    this.tweens.add({ targets: painted, alpha: 1, duration: 900 });
    this.tweens.add({
      targets: p.sprite,
      alpha: 0,
      duration: 900,
      onComplete: () => p.sprite.destroy(),
    });
    p.sprite = painted;
  }

  // ── Bucle ──

  update(_time: number, deltaMs: number): void {
    this.inp.update();
    const dt = Math.min(deltaMs / 1000, 0.05);
    if (!this.started || this.pause.paused() || this.dialogue.active || this.ending) {
      this.idlePose();
      this.syncCan();
      return;
    }
    this.move(dt);
    this.syncCan();
    this.updateFireflies();
    this.updateInteractions();
  }

  private move(dt: number): void {
    let dx = 0;
    let dy = 0;
    if (this.inp.isDown('left')) dx -= 1;
    if (this.inp.isDown('right')) dx += 1;
    if (this.inp.isDown('up')) dy -= 1;
    if (this.inp.isDown('down')) dy += 1;
    if (this.inp.joyX || this.inp.joyY) {
      dx = this.inp.joyX;
      dy = this.inp.joyY;
    }
    const len = Math.hypot(dx, dy);
    if (len < 0.2) {
      this.idlePose();
      return;
    }
    const nx = this.iris.x + (dx / len) * SPEED * dt;
    const ny = this.iris.y + (dy / len) * SPEED * dt;
    const ox = this.iris.x;
    const oy = this.iris.y;
    if (!this.blocked(nx, this.iris.y)) this.iris.x = Phaser.Math.Clamp(nx, BOUNDS.x0, BOUNDS.x1);
    if (!this.blocked(this.iris.x, ny)) this.iris.y = Phaser.Math.Clamp(ny, BOUNDS.y0, BOUNDS.y1);
    this.iris.setDepth(this.iris.y);

    this.facing = Math.abs(dx) > Math.abs(dy) ? 'side' : dy > 0 ? 'front' : 'back';
    const anim = { side: 'iris-walk', front: 'iris-front-walk', back: 'iris-back-walk' }[
      this.facing
    ];
    this.iris.play(styledKey(anim, STYLE), true);
    if (this.facing === 'side') this.iris.setFlipX(dx < 0);
    else this.iris.setFlipX(false);

    // El bote gotea mientras caminas
    this.walked += Math.hypot(this.iris.x - ox, this.iris.y - oy);
    if (this.walked >= DRIP_EVERY) {
      this.walked = 0;
      if (this.water > 0) this.drip();
    }
  }

  private idlePose(): void {
    if (!this.iris) return;
    const anim = { side: 'iris-idle', front: 'iris-front-idle', back: 'iris-back-idle' }[
      this.facing
    ];
    this.iris.play(styledKey(anim, STYLE), true);
  }

  private blocked(x: number, y: number): boolean {
    if (Math.hypot((x - PILA.x) / 1.3, y - (PILA.y + 10)) < 70) return true;
    for (const p of this.props) if (p.r && Math.hypot(x - p.x, y - p.y) < p.r) return true;
    for (const p of this.plants) if (Math.hypot(x - p.x, y - p.y) < 18) return true;
    return false;
  }

  private syncCan(): void {
    if (!this.iris) return;
    const off = { side: this.iris.flipX ? -20 : 20, front: 18, back: -18 }[this.facing];
    const swing = this.iris.anims.isPlaying ? Math.sin(this.time.now * 0.012) * 8 : 0;
    this.can.setPosition(this.iris.x + off, this.iris.y - 26).setAngle(swing);
    this.can.setDepth(this.facing === 'back' ? this.iris.depth - 1 : this.iris.depth + 1);
  }

  private drip(): void {
    this.water = Math.max(0, this.water - 1);
    this.drawWater();
    const x = this.can.x + Phaser.Math.Between(-4, 4);
    const y = this.iris.y + Phaser.Math.Between(-2, 6);
    const drop = this.add
      .image(this.can.x, this.can.y + 10, 'wc-drop')
      .setDepth(this.iris.depth + 2)
      .setScale(0.8);
    this.tweens.add({
      targets: drop,
      y,
      duration: 180,
      ease: 'Quad.in',
      onComplete: () => {
        drop.destroy();
        this.paint(x, y, 24);
        const puddle = this.add.image(x, y, 'wc-puddle').setDepth(6).setAlpha(0.8).setScale(0.6);
        this.tweens.add({
          targets: puddle,
          alpha: 0,
          scale: 1.1,
          delay: 1200,
          duration: 2000,
          onComplete: () => puddle.destroy(),
        });
      },
    });
    if (Math.random() < 0.35) AudioManager.sfx('drip');
  }

  // ── Interacciones ──

  private updateInteractions(): void {
    const ix = this.iris.x;
    const iy = this.iris.y;
    const nearPila = Math.hypot((ix - PILA.x) / 1.3, iy - (PILA.y + 10)) < 115;
    let target: PlantState | undefined;
    let best = 80;
    for (const p of this.plants) {
      const d = Math.hypot(ix - p.x, iy - p.y);
      if (d < best) {
        best = d;
        target = p;
      }
    }
    if (target) {
      const label = target.watered
        ? ''
        : target.group === this.group
          ? `✦ ${t('forest.water')}`
          : '…';
      if (label) this.showPrompt(target.x, target.y - 100, label);
      else this.prompt.setVisible(false);
      if (this.inp.justDown('interact')) this.useOnPlant(target);
      return;
    }
    if (nearPila) {
      this.showPrompt(PILA.x, PILA.y - 90, `✦ ${t('forest.fill')}`);
      if (this.inp.justDown('interact')) this.fill();
      return;
    }
    this.prompt.setVisible(false);
  }

  private showPrompt(x: number, y: number, text: string): void {
    this.prompt.setPosition(x, y).setText(text).setVisible(true);
  }

  private fill(): void {
    this.water = 100;
    this.drawWater();
    AudioManager.sfx('fill');
    this.paint(PILA.x, PILA.y + 40, 150, 4);
    this.splash(PILA.x, PILA.y, 14);
  }

  private useOnPlant(p: PlantState): void {
    if (p.watered) {
      this.showToast(t('forest.done'), 1400);
      return;
    }
    if (p.group !== this.group) {
      this.showToast(t('forest.later'), 1600);
      return;
    }
    if (this.water < 10) {
      AudioManager.sfx('wrong');
      this.showToast(t('forest.empty'), 2000);
      return;
    }
    this.water = Math.max(0, this.water - POUR_COST);
    this.drawWater();
    AudioManager.sfx('pour');
    this.tweens.add({ targets: this.can, angle: 70, duration: 180, yoyo: true, hold: 500 });
    this.splash(p.x, p.y - 30, 12);
    this.time.delayedCall(350, () => this.bloom(p));
    if (this.plants.filter((pp) => pp.group === this.group).every((pp) => pp.watered || pp === p)) {
      this.time.delayedCall(1500, () => this.memory(this.group));
    }
  }

  /** La maceta florece y todo alrededor recupera el color. */
  private bloom(p: PlantState, instant = false): void {
    p.watered = true;
    p.sprite.setTexture(`maceta-${p.kind}-flor`).setAlpha(1);
    this.paint(p.x, p.y, 120, instant ? 3 : 6);
    if (instant) return;
    AudioManager.sfx('bloom');
    p.sprite.setScale(0.8);
    this.tweens.add({ targets: p.sprite, scale: 1.35, duration: 600, ease: 'Back.out' });
  }

  private splash(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const d = this.add
        .image(x, y, 'wc-drop')
        .setDepth(y + 50)
        .setScale(Phaser.Math.FloatBetween(0.5, 0.9));
      this.tweens.add({
        targets: d,
        x: x + Phaser.Math.Between(-60, 60),
        y: y + Phaser.Math.Between(-50, 40),
        alpha: 0,
        duration: Phaser.Math.Between(400, 800),
        ease: 'Quad.out',
        onComplete: () => d.destroy(),
      });
    }
  }

  private updateFireflies(): void {
    for (const f of this.fireflies) {
      if (f.taken) continue;
      if (!f.shown && this.isWet(f.x, f.y)) {
        f.shown = true;
        this.tweens.add({ targets: f.sprite, alpha: 1, duration: 800 });
        this.tweens.add({
          targets: f.sprite,
          y: f.y - 12,
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
        AudioManager.sfx('echo');
      }
      if (
        f.shown &&
        Phaser.Math.Distance.Between(this.iris.x, this.iris.y - 20, f.sprite.x, f.sprite.y) < 40
      ) {
        f.taken = true;
        this.collected++;
        this.ffText.setText(`${this.collected}/${PATIO_FIREFLIES.length}`);
        AudioManager.sfx('collect');
        this.tweens.add({ targets: f.sprite, scale: 2.5, alpha: 0, duration: 500 });
      }
    }
  }

  // ── Recuerdos ──

  private memory(g: number): void {
    const mem = PATIO_MEMORIES[g];
    AudioManager.sfx('echo');
    this.cameras.main.flash(700, 255, 240, 200);
    const ghosts = mem.ghosts.map(([key, x, y]) => {
      this.paint(x, y, 150, 6);
      const halo = this.add
        .image(x, y - 40, 'glow-soft')
        .setTint(0xfff4d0)
        .setAlpha(0)
        .setScale(1.4)
        .setDepth(y - 1);
      const s = addStyled(this, x, y, key, STYLE, { feet: true, scale: key === 'hijo' ? 1 : 1.15 })
        .setDepth(y)
        .setAlpha(0);
      this.tweens.add({ targets: s, alpha: 0.85, duration: 1200 });
      this.tweens.add({ targets: halo, alpha: 0.5, duration: 1200 });
      return [s, halo];
    });
    this.memoryIcons[g].setColor('#b0506a');
    AudioManager.setMusicLevel(g + 1);
    this.fx?.blendTo(this, mem.fx, 2000);
    if (g === 0) {
      // El canario de la jaula se pinta y canta
      this.jaula.setTexture('jaula-paint');
      this.time.delayedCall(900, () => AudioManager.sfx('bloom'));
    }
    const n = g + 1;
    this.dialogue.say(
      [
        { who: null, text: t(`forest.memory.${n}` as TextKey) },
        { who: null, text: t(`forest.memory.${n}b` as TextKey) },
      ],
      () => {
        // Los fantasmas del recuerdo se quedan tenues, como manchas de agua
        ghosts.flat().forEach((o) => this.tweens.add({ targets: o, alpha: 0.35, duration: 1500 }));
        if (g < PATIO_MEMORIES.length - 1) {
          this.group = g + 1;
          this.refreshPlants();
          AudioManager.sfx('scribble');
          this.showToast(t('forest.nextGroup'), 2000);
        } else {
          this.group = PATIO_MEMORIES.length;
          this.time.delayedCall(600, () => this.heartMoment());
        }
      },
    );
  }

  /** Morfeo explica; Doña Chuy aparece bajo el limonero. */
  private heartMoment(): void {
    this.ending = true;
    this.prompt.setVisible(false);
    const morfeo = addStyled(this, this.iris.x + 70, this.iris.y, 'morfeo', STYLE, { feet: true })
      .setDepth(this.iris.y)
      .setAlpha(0);
    morfeo.play(styledKey('morfeo-idle', STYLE));
    this.tweens.add({ targets: morfeo, alpha: 1, duration: 900 });
    AudioManager.sfx('meow');
    this.dialogue.say(
      [
        { who: 'morfeo', text: t('forest.heart.1') },
        { who: 'iris', text: t('forest.heart.2') },
        { who: 'morfeo', text: t('forest.heart.3') },
        { who: 'morfeo', text: t('forest.heart.4'), mood: 'smug' },
      ],
      () => this.meetChuy(),
    );
  }

  private meetChuy(): void {
    const cx = TREE.x - 40;
    const cy = TREE.y + 110;
    this.paint(cx, cy, 170, 8);
    const chuy = addStyled(this, cx, cy, 'chuy', STYLE, { feet: true, scale: 1.2 })
      .setDepth(cy)
      .setAlpha(0);
    chuy.play(styledKey('chuy-idle', STYLE));
    this.tweens.add({ targets: chuy, alpha: 1, duration: 1400 });
    this.cameras.main.stopFollow();
    this.cameras.main.pan(cx - 120, cy - 60, 1600, 'Sine.easeInOut');
    // Iris camina hacia ella
    this.facing = 'side';
    this.iris.setFlipX(this.iris.x > cx);
    this.iris.play(styledKey('iris-walk', STYLE), true);
    const tx = cx + (this.iris.x > cx ? 90 : -90);
    this.tweens.add({
      targets: this.iris,
      x: tx,
      y: cy,
      duration: Math.min(2400, Math.hypot(this.iris.x - tx, this.iris.y - cy) * 5),
      onUpdate: () => this.iris.setDepth(this.iris.y),
      onComplete: () => {
        this.iris.setFlipX(this.iris.x > cx);
        this.idlePose();
        this.dialogue.say(
          [
            { who: 'chuy', text: t('forest.chuy.1') },
            { who: 'iris', text: t('forest.chuy.2'), mood: 'wow' },
            { who: 'chuy', text: t('forest.chuy.3') },
            { who: 'chuy', text: t('forest.chuy.4') },
            {
              who: 'iris',
              text: t('forest.chuy.5'),
              action: () => {
                this.tweens.add({
                  targets: this.can,
                  x: chuy.x + 16,
                  y: chuy.y - 40,
                  duration: 900,
                  ease: 'Sine.inOut',
                });
              },
            },
            { who: 'chuy', text: t('forest.chuy.6') },
            { who: null, text: t('forest.win.1'), action: () => this.floodWithColor(cx, cy) },
          ],
          () => this.giveBack(),
        );
      },
    });
  }

  /** El boceto desaparece desde Doña Chuy hacia afuera: el patio entero se pinta. */
  private floodWithColor(x: number, y: number): void {
    AudioManager.sfx('win');
    AudioManager.setMusicLevel(3);
    this.fx?.blendTo(
      this,
      { ...PATIO_START_FX, tint: 0xffe8b0, tintAmount: 0.05, vignette: 0.2 },
      2500,
    );
    const state = { r: 0 };
    this.tweens.add({
      targets: state,
      r: 1900,
      duration: 2600,
      ease: 'Sine.in',
      onUpdate: () => {
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 + Math.random();
          this.paint(
            x + Math.cos(a) * state.r,
            y + Math.sin(a) * state.r * 0.7,
            140 + state.r * 0.15,
          );
        }
      },
      onComplete: () => {
        this.cover.setVisible(false);
        for (const p of this.props) if (!p.painted) this.paintProp(p);
        this.jaula.setTexture('jaula-paint');
      },
    });
  }

  private giveBack(): void {
    AudioManager.sfx('key');
    showReturnCard(this, 'watercolor', t('forest.keyGet'), t('forest.fragment'), 'bote');
    SaveManager.giveKey('forest');
    SaveManager.recordFireflies('forest', this.collected);
    this.time.delayedCall(4400, () => fadeToScene(this, 'Hub', undefined, 900));
  }
}
