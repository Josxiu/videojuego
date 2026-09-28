import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH_HUD, FONT_HAND } from '../../config';
import { t } from '../../i18n';
import { applyWorldFX, type DreamFXPipeline } from '../../gfx/postfx';
import { CHARACTER_TEXTURES, CHARACTER_ANIMS } from '../../gfx/sprites';
import {
  ensureStyle,
  styledKey,
  addStyled,
  stylizeTexture,
  STYLE_DISPLAY,
} from '../../gfx/stylize';
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
} from '../../systems/ui';
import { pop, floatingText } from '../../systems/Juice';
import { debug } from '../../systems/debug';
import { FALL_SKIES, FALL_ITEMS, BOXES_TO_LAND } from '../../data/fallBiomes';
import {
  paintSky,
  paintFallProps,
  paintRoom,
  paintForeground,
  FURNITURE,
  FURNITURE_BOX,
  FAR_H,
  type Furniture,
} from './art';

const STYLE = 'paper';
/** Franja de pantalla en la que Iris se mueve: arriba planea, abajo cae en picada. */
const BAND_TOP = 110;
const BAND_BOTTOM = 330;
const BAND_MID = 200;
const FALL_SLOW = 140;
const FALL_BASE = 240;
const FALL_FAST = 470;
const CHUNK = 540;
const FIREFLIES = 8;

type Kind = 'furniture' | 'tape' | 'box' | 'balloon' | 'firefly' | 'decor';

interface Entity {
  kind: Kind;
  x: number;
  y: number;
  parts: Phaser.GameObjects.GameObject[];
  sprite?: Phaser.GameObjects.Image;
  done?: boolean;
  furniture?: Furniture;
  phase?: number;
  gapX?: number;
  gapW?: number;
  /** Ya destruido: se saca de la lista. */
  gone?: boolean;
}

/**
 * Sueño de Nadia: caída libre por un diorama de papel.
 *
 * La caída no tiene fondo hasta que Iris desempaca lo suficiente: cada caja
 * abierta suelta un objeto de su vida y cambia el cielo por otro papel de su
 * mudanza. Si Iris se lastima demasiado, lo último que sacó vuelve a su caja.
 */
export class DreamFall extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private fx?: DreamFXPipeline;
  private iris!: Phaser.GameObjects.Sprite;
  private bg!: Phaser.GameObjects.Image;
  private far!: Phaser.GameObjects.TileSprite;
  private wind!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hearts: Phaser.GameObjects.Image[] = [];
  private boxIcons: Phaser.GameObjects.Image[] = [];
  private ffText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private heldBalloon?: Phaser.GameObjects.Image;

  private running = false;
  private depth = 0;
  private ix = GAME_WIDTH / 2;
  private iy = BAND_MID;
  private hp = 3;
  private invuln = 0;
  private slowFor = 0;
  private unpacked = 0;
  private sky = 0;
  private entities: Entity[] = [];
  private nextChunk = 1;
  private lastBoxChunk = 0;
  private firefliesSpawned = 0;
  private fireflies = 0;
  private floorY?: number;
  private landed = false;
  private boxHintShown = false;
  private runSeed = 0;

  constructor() {
    super('DreamFall');
  }

  create(): void {
    this.resetState();
    this.fx = applyWorldFX(this, 'fall');
    fadeIn(this);
    AudioManager.playMusic('fall', 0);

    paintSky(this, 0, FALL_SKIES[0].thread);
    paintSky(this, 1, FALL_SKIES[1].thread);
    paintFallProps(this);
    paintForeground(this);
    paintRoom(this);
    ensureStyle(
      this,
      STYLE,
      [...CHARACTER_TEXTURES, 'nadia', 'llave', 'heart', 'portrait-iris', 'portrait-morfeo'],
      [...CHARACTER_ANIMS, 'nadia-idle'],
    );

    this.cameras.main.setBackgroundColor(FALL_SKIES[0].base);
    this.bg = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'fall-bg-0')
      .setScrollFactor(0)
      .setDepth(0);
    this.far = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'fall-far-0')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1);

    this.iris = addStyled(this, this.ix, this.iy, 'iris-fall', STYLE, {
      frame: '0',
      scale: 1.3,
    }).setDepth(50);
    this.iris.play(styledKey('iris-falling', STYLE));
    this.wind = this.add.particles(0, 0, 'px', {
      speedY: { min: -260, max: -380 },
      speedX: { min: -20, max: 20 },
      lifespan: 700,
      alpha: { start: 0.5, end: 0 },
      scale: { start: 1.4, end: 0.3 },
      tint: 0xfbf5e4,
      frequency: 45,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-40, -10, 80, 20),
        quantity: 1,
      },
    });
    this.wind.setDepth(49);

    this.buildHud();
    this.dialogue = new DialogueBox(this, 0xc0392b, 'paper');
    this.inp = new InputManager(this);
    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'));

    if (debug.flag('skip')) {
      const at = debug.num('at', 0);
      for (let k = 0; k < at; k++) this.unpack(true);
      this.running = true;
      return;
    }
    showTitleCard(
      this,
      t('fall.title'),
      t('fall.name'),
      () => {
        this.dialogue.say(
          [
            { who: null, text: t('fall.intro.1') },
            { who: null, text: t('fall.intro.2') },
            { who: 'morfeo', text: t('fall.intro.3'), mood: 'smug' },
            { who: 'morfeo', text: t('fall.intro.4') },
          ],
          () => {
            this.showToast(this.inp.isTouch ? t('fall.hint') : t('fall.hintKeys'), 3200);
            this.running = true;
          },
        );
      },
      'paper',
    );
  }

  private resetState(): void {
    this.running = false;
    this.depth = 0;
    this.ix = GAME_WIDTH / 2;
    this.iy = BAND_MID;
    this.hp = 3;
    this.invuln = 0;
    this.slowFor = 0;
    this.unpacked = 0;
    this.sky = 0;
    this.entities = [];
    this.hearts = [];
    this.boxIcons = [];
    this.nextChunk = 1;
    this.lastBoxChunk = 0;
    this.firefliesSpawned = 0;
    this.fireflies = 0;
    this.floorY = undefined;
    this.landed = false;
    this.boxHintShown = false;
    this.heldBalloon = undefined;
    this.runSeed = Math.floor(Math.random() * 1e6);
  }

  // ── HUD ──

  private buildHud(): void {
    const fix = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ) => o.setScrollFactor(0).setDepth(DEPTH_HUD);
    const heartKey = stylizeTexture(this, 'heart', STYLE);
    for (let i = 0; i < 3; i++) {
      this.hearts.push(
        fix(this.add.image(34 + i * 38, 34, heartKey).setScale(STYLE_DISPLAY * 1.3)),
      );
    }
    fix(this.add.image(38, 76, 'fall-firefly').setScale(0.8));
    this.ffText = fix(
      this.add
        .text(60, 76, `0/${FIREFLIES}`, {
          fontFamily: FONT_HAND,
          fontSize: '22px',
          color: '#fbf5e4',
          stroke: '#2a2a44',
          strokeThickness: 4,
        })
        .setOrigin(0, 0.5),
    );
    for (let i = 0; i < BOXES_TO_LAND; i++) {
      this.boxIcons.push(fix(this.add.image(GAME_WIDTH / 2 - 100 + i * 40, 32, 'fall-box-icon')));
    }
    this.toast = fix(
      this.add
        .text(GAME_WIDTH / 2, 470, '', {
          fontFamily: FONT_HAND,
          fontSize: '22px',
          color: '#2a2a44',
          align: 'center',
          backgroundColor: '#fbf5e4',
          padding: { x: 14, y: 8 },
          wordWrap: { width: 700 },
          shadow: { offsetX: 3, offsetY: 4, color: 'rgba(0,0,0,0.3)', blur: 3, fill: true },
        })
        .setOrigin(0.5)
        .setVisible(false),
    );
  }

  private showToast(text: string, ms = 2000): void {
    this.toast.setText(text).setVisible(true).setAlpha(1).setAngle(Phaser.Math.FloatBetween(-2, 2));
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 400 });
  }

  // ── Bucle ──

  update(time: number, deltaMs: number): void {
    this.inp.update();
    const dt = Math.min(deltaMs / 1000, 0.05);
    if (this.running && !this.pause.paused() && !this.dialogue.active && !this.landed) {
      this.steer(dt);
      this.fall(dt);
      this.spawnAhead();
      this.updateEntities(time);
      this.collide();
    }
    const cam = this.cameras.main;
    cam.scrollY = this.depth;
    this.far.tilePositionY = this.depth * 0.35;
    if (!this.landed) this.iris.setPosition(this.ix, this.depth + this.iy);
    this.wind.setPosition(this.iris.x, this.iris.y - 30);
    if (this.heldBalloon) this.heldBalloon.setPosition(this.iris.x + 8, this.iris.y - 70);
  }

  private steer(dt: number): void {
    let vx = 0;
    let vy = 0;
    if (this.inp.isDown('left')) vx -= 380;
    if (this.inp.isDown('right')) vx += 380;
    if (this.inp.isDown('up')) vy -= 280;
    if (this.inp.isDown('down')) vy += 280;
    const p = this.input.activePointer;
    if (p.isDown && !(p.y < 60 && p.x > GAME_WIDTH - 110)) {
      vx = Phaser.Math.Clamp((p.x - this.ix) * 5, -440, 440);
      vy = Phaser.Math.Clamp((p.y - 40 - this.iy) * 5, -320, 320);
    } else if (vy === 0) {
      vy = (BAND_MID - this.iy) * 1.2; // sin tocar nada, vuelve a la altura media
    }
    this.ix = Phaser.Math.Clamp(this.ix + vx * dt, 40, GAME_WIDTH - 40);
    this.iy = Phaser.Math.Clamp(this.iy + vy * dt, BAND_TOP, BAND_BOTTOM);
    const diving = this.iy > BAND_MID + 70;
    if (diving) {
      if (this.iris.anims.isPlaying) this.iris.anims.stop();
      this.iris.setTexture(styledKey('iris-fall', STYLE), '2');
    } else if (!this.iris.anims.isPlaying) {
      this.iris.play(styledKey('iris-falling', STYLE));
    }
    this.iris.setAngle(vx * (diving ? 0.01 : 0.025));
    this.wind.frequency = diving ? 18 : 45;
  }

  private fallSpeed(): number {
    const y = this.iy;
    let v =
      y < BAND_MID
        ? Phaser.Math.Linear(FALL_SLOW, FALL_BASE, (y - BAND_TOP) / (BAND_MID - BAND_TOP))
        : Phaser.Math.Linear(FALL_BASE, FALL_FAST, (y - BAND_MID) / (BAND_BOTTOM - BAND_MID));
    v *= 1 + 0.05 * this.unpacked;
    if (this.slowFor > 0) v *= 0.45;
    return v;
  }

  private fall(dt: number): void {
    this.depth += this.fallSpeed() * dt;
    this.slowFor -= dt;
    if (this.slowFor <= 0 && this.heldBalloon) this.releaseBalloon();
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.iris.setAlpha(Math.sin(this.time.now * 0.03) > 0 ? 0.35 : 1);
    } else {
      this.iris.setAlpha(1);
    }
    if (this.floorY !== undefined && this.depth + this.iy + 40 >= this.floorY) this.land();
  }

  // ── Generación por tramos ──

  private spawnAhead(): void {
    while (this.nextChunk * CHUNK < this.depth + GAME_HEIGHT * 2) {
      this.spawnChunk(this.nextChunk++);
    }
    // Lo que ya quedó muy arriba se destruye
    for (const e of this.entities) {
      if (e.y < this.depth - 700) {
        e.parts.forEach((p) => {
          if (p !== this.heldBalloon) p.destroy();
        });
        e.done = true;
        e.gone = true;
      }
    }
    this.entities = this.entities.filter((e) => !e.gone);
  }

  private spawnChunk(i: number): void {
    const top = i * CHUNK;
    // Tras desempacar todo, un tramo limpio y luego el piso
    if (this.unpacked >= BOXES_TO_LAND) {
      if (this.floorY === undefined) this.spawnFloor(top + CHUNK);
      return;
    }
    const rng = new Rng(`caida-${i}-${this.runSeed}`);
    const d = Math.min(this.unpacked, 5);
    const slots = [top + 90, top + 270, top + 450];
    const wantBox = i - this.lastBoxChunk >= 2 || (i - this.lastBoxChunk >= 1 && rng.chance(0.45));
    const boxSlot = wantBox ? rng.int(0, 2) : -1;
    if (wantBox) this.lastBoxChunk = i;
    slots.forEach((y, s) => {
      if (s === boxSlot) {
        this.spawnBox(rng.range(110, GAME_WIDTH - 110), y);
        return;
      }
      if (d >= 1 && rng.chance(0.18 + 0.07 * d) && s !== boxSlot + 1 && s !== boxSlot - 1) {
        this.spawnTape(y, rng, d);
        return;
      }
      if (rng.chance(0.5 + 0.08 * d)) this.spawnFurniture(rng.range(90, GAME_WIDTH - 90), y, rng);
      if (this.firefliesSpawned < FIREFLIES && rng.chance(0.4)) {
        this.spawnFirefly(rng.range(80, GAME_WIDTH - 80), y + rng.range(-40, 40));
      } else if (rng.chance(this.hp < 3 ? 0.22 : 0.08)) {
        this.spawnBalloon(rng.range(80, GAME_WIDTH - 80), y);
      }
    });
    // Nube de primer plano de vez en cuando (pasa por delante, más rápido)
    if (rng.chance(0.4)) {
      const k = 1.35;
      const cloud = this.add
        .image(rng.range(60, GAME_WIDTH - 60), (top + 200) * k, 'fall-cloud-fg')
        .setScrollFactor(1, k)
        .setAlpha(0.8)
        .setDepth(70)
        .setScale(rng.range(1, 1.5));
      this.entities.push({ kind: 'decor', x: cloud.x, y: top + 200, parts: [cloud], done: true });
    }
  }

  private spawnFurniture(x: number, y: number, rng: Rng): void {
    const f = rng.pick(FURNITURE);
    const sprite = this.add.image(x, y, `fall-${f}`).setOrigin(0.5, 0.05).setDepth(30);
    const thread = this.add
      .rectangle(
        x,
        y + 2,
        1.5,
        900,
        Phaser.Display.Color.HexStringToColor(FALL_SKIES[this.sky].thread).color,
        0.5,
      )
      .setOrigin(0.5, 1)
      .setDepth(29);
    this.entities.push({
      kind: 'furniture',
      x,
      y,
      parts: [sprite, thread],
      sprite,
      furniture: f,
      phase: rng.range(0, 6),
    });
  }

  private spawnTape(y: number, rng: Rng, d: number): void {
    const gapW = Math.max(150, 210 - d * 12);
    const gapX = rng.range(70, GAME_WIDTH - 70 - gapW);
    const left = this.add.tileSprite(0, y, gapX, 34, 'fall-tape').setOrigin(0, 0.5).setDepth(30);
    const right = this.add
      .tileSprite(gapX + gapW, y, GAME_WIDTH - gapX - gapW, 34, 'fall-tape')
      .setOrigin(0, 0.5)
      .setDepth(30);
    const endL = this.add.image(gapX, y, 'fall-tape-end').setDepth(31);
    const endR = this.add
      .image(gapX + gapW, y, 'fall-tape-end')
      .setDepth(31)
      .setFlipX(true);
    this.entities.push({ kind: 'tape', x: 0, y, parts: [left, right, endL, endR], gapX, gapW });
  }

  private spawnBox(x: number, y: number): void {
    const k = Math.min(this.unpacked, FALL_ITEMS.length - 1);
    const sprite = this.add.image(x, y, `fall-box-${k}`).setDepth(35);
    this.tweens.add({
      targets: sprite,
      angle: { from: -7, to: 7 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    const glow = this.add
      .image(x, y, 'glow-soft')
      .setTint(0xffd166)
      .setAlpha(0.25)
      .setScale(1.3)
      .setDepth(34);
    this.tweens.add({ targets: glow, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
    this.entities.push({ kind: 'box', x, y, parts: [sprite, glow], sprite });
    if (!this.boxHintShown) {
      this.boxHintShown = true;
      this.time.delayedCall(1200, () => this.showToast(t('fall.boxHint'), 2000));
    }
  }

  private spawnBalloon(x: number, y: number): void {
    const sprite = this.add
      .image(x, y, 'fall-balloon')
      .setDepth(33)
      .setTint(Phaser.Utils.Array.GetRandom([0xff6a8a, 0xffd23a, 0x6ad0ff, 0x8ae06a]));
    this.tweens.add({
      targets: sprite,
      x: x + 20,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.entities.push({ kind: 'balloon', x, y, parts: [sprite], sprite });
  }

  private spawnFirefly(x: number, y: number): void {
    this.firefliesSpawned++;
    const glow = this.add.image(x, y, 'glow-gold').setScale(1.7).setAlpha(0.55).setDepth(33);
    const sprite = this.add.image(x, y, 'fall-firefly').setDepth(34);
    this.tweens.add({
      targets: [sprite, glow],
      x: x + 26,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: sprite,
      angle: { from: -15, to: 15 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });
    this.entities.push({ kind: 'firefly', x, y, parts: [sprite, glow], sprite });
  }

  private updateEntities(time: number): void {
    for (const e of this.entities) {
      if (e.done || e.kind !== 'furniture' || !e.sprite) continue;
      e.sprite.setAngle(Math.sin(time * 0.0014 + (e.phase ?? 0)) * 10);
    }
  }

  // ── Colisiones ──

  private collide(): void {
    const px = this.ix;
    const py = this.depth + this.iy;
    const pr = new Phaser.Geom.Rectangle(px - 19, py - 32, 38, 62);
    for (const e of this.entities) {
      if (e.done) continue;
      if (Math.abs(e.y - py) > 200) continue;
      switch (e.kind) {
        case 'firefly':
        case 'balloon':
        case 'box': {
          const s = e.sprite;
          if (!s) break;
          const r = e.kind === 'box' ? 46 : 26;
          if (Phaser.Math.Distance.Between(px, py, s.x, s.y) < r + 18) {
            if (e.kind === 'firefly') this.takeFirefly(e);
            else if (e.kind === 'balloon') this.grabBalloon(e);
            else this.openBox(e);
          }
          break;
        }
        case 'furniture': {
          if (this.invuln > 0 || !e.sprite || !e.furniture) break;
          const [w, h] = FURNITURE_BOX[e.furniture];
          const a = Phaser.Math.DegToRad(e.sprite.angle);
          const reach = e.sprite.height * 0.5;
          const cx = e.sprite.x - Math.sin(a) * reach;
          const cy = e.sprite.y + Math.cos(a) * reach;
          const fr = new Phaser.Geom.Rectangle(cx - w * 0.4, cy - h * 0.4, w * 0.8, h * 0.8);
          if (Phaser.Geom.Intersects.RectangleToRectangle(pr, fr)) this.hurt();
          break;
        }
        case 'tape': {
          if (this.invuln > 0 || e.gapX === undefined || e.gapW === undefined) break;
          if (py + 24 > e.y - 13 && py - 26 < e.y + 13) {
            const inGap = px - 12 > e.gapX && px + 12 < e.gapX + e.gapW;
            if (!inGap) this.hurt();
          }
          break;
        }
      }
    }
  }

  private takeFirefly(e: Entity): void {
    e.done = true;
    this.fireflies++;
    this.ffText.setText(`${this.fireflies}/${FIREFLIES}`);
    AudioManager.sfx('collect');
    this.tweens.add({ targets: e.parts, scale: 2.2, alpha: 0, duration: 380 });
  }

  private grabBalloon(e: Entity): void {
    e.done = true;
    AudioManager.sfx('pop');
    this.releaseBalloon();
    this.heldBalloon = e.sprite;
    this.tweens.killTweensOf(e.sprite as Phaser.GameObjects.Image);
    this.slowFor = 2.2;
    if (this.hp < 3) {
      this.hp++;
      this.refreshHearts();
    }
    this.showToast(t('fall.balloon'), 1500);
  }

  private releaseBalloon(): void {
    const b = this.heldBalloon;
    if (!b) return;
    this.heldBalloon = undefined;
    this.tweens.add({
      targets: b,
      y: b.y - 700,
      x: b.x + 60,
      duration: 2000,
      onComplete: () => b.destroy(),
    });
  }

  private hurt(): void {
    AudioManager.sfx('hit');
    AudioManager.sfx('paper');
    this.cameras.main.shake(200, 0.01);
    this.hp--;
    this.invuln = 1.5;
    this.refreshHearts();
    if (this.hp <= 0) this.repack();
  }

  private refreshHearts(): void {
    this.hearts.forEach((h, i) => h.setAlpha(i < this.hp ? 1 : 0.2));
  }

  /** Sin corazones: lo último que salió de una caja vuelve a empacarse. */
  private repack(): void {
    this.hp = 3;
    this.invuln = 2;
    this.refreshHearts();
    this.showToast(t('fall.repack'), 2600);
    if (this.unpacked === 0) return;
    this.unpacked--;
    this.boxIcons[this.unpacked].setTexture('fall-box-icon');
    AudioManager.setMusicLevel(this.unpacked);
    this.changeSky(this.unpacked);
    // La caja reaparece un poco más abajo: se puede volver a abrir
    this.spawnBox(Phaser.Math.Between(140, GAME_WIDTH - 140), this.depth + GAME_HEIGHT + 160);
    this.relabelBoxes();
  }

  // ── Desempacar ──

  private openBox(e: Entity): void {
    e.done = true;
    const s = e.sprite;
    if (!s) return;
    const k = this.unpacked;
    this.tweens.killTweensOf(s);
    s.setTexture('fall-box-open').setAngle(0);
    AudioManager.sfx('rip');
    pop(this, s.x, s.y, 0xffd166, 5);
    const item = this.add
      .image(s.x, s.y - 10, `fall-item-${k}`)
      .setDepth(60)
      .setScale(0.3);
    this.tweens.add({ targets: item, y: s.y - 110, scale: 1.3, duration: 700, ease: 'Back.out' });
    this.tweens.add({
      targets: item,
      x: this.boxIcons[k].x,
      y: this.depth + 32,
      scale: 0.25,
      alpha: 0.2,
      delay: 1600,
      duration: 700,
      ease: 'Cubic.in',
      onComplete: () => item.destroy(),
    });
    const info = FALL_ITEMS[k];
    floatingText(this, s.x, s.y - 170, info.label, {
      fontFamily: FONT_HAND,
      fontSize: '24px',
      color: '#fbf5e4',
      stroke: '#2a2a44',
      strokeThickness: 5,
    });
    this.showToast(`${info.label}: ${info.note}`, 2600);
    this.tweens.add({ targets: e.parts, alpha: 0, delay: 900, duration: 600 });
    this.unpack();
  }

  /** Cuenta una caja desempacada: sube la música y cambia el cielo. */
  private unpack(instant = false): void {
    this.boxIcons[this.unpacked].setTexture('fall-box-icon-open');
    this.unpacked++;
    AudioManager.setMusicLevel(this.unpacked);
    this.changeSky(this.unpacked, instant);
    this.relabelBoxes();
    if (this.unpacked >= BOXES_TO_LAND) {
      this.time.delayedCall(instant ? 0 : 2400, () => this.showToast(t('fall.ground'), 2200));
    }
  }

  private relabelBoxes(): void {
    const k = Math.min(this.unpacked, FALL_ITEMS.length - 1);
    for (const e of this.entities)
      if (e.kind === 'box' && !e.done) e.sprite?.setTexture(`fall-box-${k}`);
  }

  private changeSky(i: number, instant = false): void {
    if (i === this.sky) return;
    this.sky = i;
    const sky = FALL_SKIES[i];
    paintSky(this, i, sky.thread);
    // Pinta el siguiente con calma, para que no haya tirón al abrir otra caja
    if (i + 1 < FALL_SKIES.length)
      this.time.delayedCall(400, () => paintSky(this, i + 1, FALL_SKIES[i + 1].thread));
    const oldBg = this.bg;
    const oldFar = this.far;
    this.bg = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, `fall-bg-${i}`)
      .setScrollFactor(0)
      .setDepth(0)
      .setAlpha(0);
    this.far = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, `fall-far-${i}`)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1)
      .setAlpha(0);
    this.far.tilePositionY = oldFar.tilePositionY % FAR_H;
    const ms = instant ? 1 : 900;
    this.tweens.add({ targets: [this.bg, this.far], alpha: 1, duration: ms });
    this.tweens.add({
      targets: [oldBg, oldFar],
      alpha: 0,
      duration: ms,
      onComplete: () => {
        oldBg.destroy();
        oldFar.destroy();
      },
    });
    this.cameras.main.setBackgroundColor(sky.base);
    if (this.fx) {
      if (instant) this.fx.configure(sky.fx);
      else this.fx.blendTo(this, sky.fx, 900);
    }
    if (!instant) {
      AudioManager.sfx('paper');
      floatingText(this, GAME_WIDTH / 2, this.depth + 120, sky.name, {
        fontFamily: FONT_HAND,
        fontSize: '34px',
        color: '#fbf5e4',
        stroke: '#2a2a44',
        strokeThickness: 6,
      });
    }
  }

  // ── Aterrizaje: el departamento se arma como libro desplegable ──

  private spawnFloor(y: number): void {
    this.floorY = y;
    this.add
      .image(GAME_WIDTH / 2, y, 'fall-room-floor')
      .setOrigin(0.5, 0)
      .setDepth(40);
  }

  private land(): void {
    if (this.landed || this.floorY === undefined) return;
    this.landed = true;
    this.running = false;
    this.releaseBalloon();
    this.wind.stop();
    const floor = this.floorY;
    // La cámara se asienta con el piso abajo de la pantalla
    this.tweens.add({ targets: this, depth: floor - 430, duration: 700, ease: 'Sine.out' });
    this.iris.anims.stop();
    this.iris.setTexture(styledKey('iris', STYLE), '0').setAngle(0).setAlpha(1);
    this.tweens.add({
      targets: this.iris,
      x: 520,
      y: floor + 2 - this.iris.displayHeight * 0.45,
      duration: 700,
      ease: 'Bounce.out',
      onComplete: () => {
        AudioManager.sfx('land');
        this.iris.setOrigin(0.5, 0.5);
        this.iris.play(styledKey('iris-idle', STYLE));
        this.buildRoom(floor);
      },
    });
  }

  private buildRoom(floor: number): void {
    const popUp = (obj: Phaser.GameObjects.Image, delay: number) => {
      const sy = obj.scaleY;
      obj.setScale(obj.scaleX, 0);
      this.tweens.add({
        targets: obj,
        scaleY: sy,
        delay,
        duration: 500,
        ease: 'Back.out',
        onStart: () => AudioManager.sfx('paper'),
      });
      return obj;
    };
    popUp(
      this.add
        .image(240, floor + 8, 'fall-room-wall')
        .setOrigin(0.5, 1)
        .setDepth(38),
      100,
    );
    popUp(
      this.add
        .image(720, floor + 8, 'fall-room-wall')
        .setOrigin(0.5, 1)
        .setDepth(38),
      250,
    );
    popUp(
      this.add
        .image(760, floor - 150, 'fall-room-window')
        .setOrigin(0.5, 1)
        .setDepth(39),
      550,
    );
    const door = popUp(
      this.add
        .image(150, floor + 4, 'fall-room-door')
        .setOrigin(0.5, 1)
        .setDepth(39),
      450,
    );
    popUp(
      this.add
        .image(640, floor + 4, 'fall-room-table')
        .setOrigin(0.5, 1)
        .setDepth(41),
      700,
    );
    // Los objetos desempacados toman su lugar
    const spots: [number, number][] = [
      [610, floor - 88],
      [360, floor - 180],
      [150, floor + 14],
      [860, floor - 30],
      [260, floor - 150],
      [670, floor - 110],
    ];
    FALL_ITEMS.forEach((_, k) => {
      const [x, y] = spots[k];
      popUp(
        this.add.image(x, y, `fall-item-${k}`).setOrigin(0.5, 1).setDepth(42).setScale(0.9),
        900 + k * 160,
      );
    });
    const nail = this.add
      .image(door.x + 70, floor - 150, 'fall-room-nail')
      .setDepth(43)
      .setAlpha(0);
    const nadia = addStyled(this, 400, floor, 'nadia', STYLE, { feet: true, scale: 1.3 })
      .setDepth(45)
      .setAlpha(0);
    nadia.play(styledKey('nadia-idle', STYLE));
    this.tweens.add({ targets: nadia, alpha: 1, delay: 1900, duration: 600 });
    this.time.delayedCall(2600, () => this.landingDialogue(nadia, nail));
  }

  private landingDialogue(nadia: Phaser.GameObjects.Sprite, nail: Phaser.GameObjects.Image): void {
    // En el departamento los personajes están abajo: el diálogo va arriba
    const top = new DialogueBox(this, 0xc0392b, 'paper', 'top');
    this.dialogue = top;
    top.say(
      [
        { who: null, text: t('fall.land.1') },
        { who: 'nadia', text: t('fall.land.2') },
        { who: 'iris', text: t('fall.land.3') },
        { who: 'nadia', text: t('fall.land.4') },
        { who: 'iris', text: t('fall.land.5') },
        { who: 'nadia', text: t('fall.land.6') },
        { who: 'iris', text: t('fall.land.7') },
        { who: 'nadia', text: t('fall.land.8'), mood: 'sad' },
        { who: 'morfeo', text: t('fall.land.9'), mood: 'smug' },
        {
          who: null,
          text: t('fall.land.10'),
          action: () => {
            AudioManager.sfx('knock');
            nail.setAlpha(1);
            const key = addStyled(this, this.iris.x, this.iris.y - 40, 'llave', STYLE).setDepth(46);
            this.tweens.add({
              targets: key,
              x: nail.x,
              y: nail.y + 16,
              duration: 900,
              ease: 'Sine.inOut',
              onComplete: () => {
                key.setAngle(90);
                this.tweens.add({
                  targets: key,
                  angle: { from: 80, to: 100 },
                  duration: 900,
                  yoyo: true,
                  repeat: -1,
                  ease: 'Sine.inOut',
                });
              },
            });
            this.tweens.add({ targets: nadia, x: nail.x + 60, duration: 900 });
          },
        },
        { who: 'nadia', text: t('fall.land.11') },
      ],
      () => this.giveBack(),
    );
  }

  private giveBack(): void {
    AudioManager.sfx('key');
    AudioManager.sfx('win');
    showReturnCard(this, 'paper', t('fall.keyGet'), t('fall.fragment'), 'llave');
    SaveManager.giveKey('fall');
    SaveManager.recordFireflies('fall', this.fireflies);
    this.time.delayedCall(4200, () => fadeToScene(this, 'Hub', undefined, 900));
  }
}
