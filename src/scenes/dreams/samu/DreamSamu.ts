import { DEPTH, FONT, H, W, type DreamId } from '../../../config';
import { LEVELS, PIECES, rotate, solve, type Level, type PieceId } from '../../../data/samu';
import { CELESTE_PAL, PEOPLE, celeste, drawClay, figureTexture, person } from '../../../gfx/figure';
import { T } from '../../../i18n';
import { Audio } from '../../../systems/audio/Audio';
import type { TrackId } from '../../../systems/audio/tracks';
import { debug } from '../../../systems/debug';
import { THEMES } from '../../../systems/dialogue';
import { Juice } from '../../../systems/juice';
import { hint, toast } from '../../../systems/ui';
import { DreamScene } from '../../DreamScene';
import { CELL, latchTexture, pieceTexture, roomTexture, suitcaseTexture } from './art';

interface Piece {
  id: PieceId;
  rot: number;
  img: Phaser.GameObjects.Image;
  placed: { x: number; y: number } | null;
  home: { x: number; y: number };
  ticket: number;
  base: { x: number; y: number; a: number };
}

const CASE_CX = 420;
const CASE_CY = 300;
const TRAY_SCALE = 0.72;

/** Sueño 2 — La Maleta de Plastilina (plastilina · empacar). */
export class DreamSamu extends DreamScene {
  readonly dream: DreamId = 'samu';
  readonly theme = THEMES.clay;
  readonly card = { bg: 0xfff3d6, ink: '#2a1c12', accent: '#d8352e', font: FONT.clay };
  readonly music: TrackId = 'samu';

  private level = 0;
  private lv!: Level;
  private grid: number[] = [];
  private gx0 = 0;
  private gy0 = 0;
  private pieces: Piece[] = [];
  private caseImg?: Phaser.GameObjects.Image;
  private ghost!: Phaser.GameObjects.Graphics;
  private drag?: {
    p: Piece;
    ox: number;
    oy: number;
    sx: number;
    sy: number;
    t: number;
    moved: boolean;
  };
  private latches: Phaser.GameObjects.Image[] = [];
  private opened = 0;
  private stuckAt = 0;
  private fails = 0;
  private stuckShown = false;
  private vacaTaps = 0;
  private secretDone = false;
  private auto = false;
  private autoQueue: { p: Piece; rot: number; x: number; y: number }[] = [];
  private autoAt = 0;
  private boilAt = 0;
  private samuFig!: Phaser.GameObjects.Image;
  private wilmer?: Phaser.GameObjects.Image;
  private giving = false;
  private timeLeft = 0;
  private timerBar?: Phaser.GameObjects.Rectangle;
  private shakeAt = 0;
  private busy = false;
  private critters: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('DreamSamu');
  }

  private get S() {
    return T.dreams.samu;
  }

  protected build(): void {
    this.auto = debug.flag('auto');
    this.pieces = [];
    this.latches = [];
    this.critters = [];
    this.secretDone = false;
    this.vacaTaps = 0;
    this.giving = false;
    this.add.image(0, 0, roomTexture(this)).setOrigin(0).setDepth(0);
    // figuras de plastilina
    if (!this.textures.exists('samu-fig-samu')) {
      const mk = (
        key: string,
        prims: ReturnType<typeof celeste>,
        pal: typeof CELESTE_PAL,
        sc: number,
      ) =>
        figureTexture(
          this,
          key,
          prims,
          sc,
          (ctx, o) => drawClay(ctx, prims, { ...o, pal }, 5),
          pal,
          { w: 70, h: 120 },
        );
      mk('samu-fig-samu', person('samu'), PEOPLE.samu.pal, 1.6);
      mk('samu-fig-cel', celeste(0, true), CELESTE_PAL, 1.45);
      mk('samu-fig-wilmer', person('wilmer'), PEOPLE.wilmer.pal, 1.45);
    }
    this.add.image(64, 526, 'samu-fig-cel').setOrigin(0.5, 1).setDepth(5);
    this.samuFig = this.add.image(150, 526, 'samu-fig-samu').setOrigin(0.5, 1).setDepth(5);
    this.ghost = this.add.graphics().setDepth(40);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onDragMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.keyboard?.on('keydown-R', () => {
      if (this.drag) this.rotateDragged();
    });
  }

  // ---------------- Niveles ----------------

  protected startAct(n: number): void {
    if (n === 1) void this.loadLevel(0);
    else if (n === 2) void this.toAct2();
    else void this.loadLevel(5);
  }

  private async toAct2(): Promise<void> {
    await this.say(this.S.listLines);
    // los juguetes de Samu se aplastan y salen las cosas «de papá»
    for (const p of this.pieces) {
      this.tweens.add({
        targets: p.img,
        scaleY: 0.1,
        scaleX: 1.4,
        alpha: 0,
        duration: 400,
        ease: 'Back.easeIn',
      });
    }
    Audio.sfx('squish', 0.6);
    await this.wait(500);
    void this.loadLevel(3);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  private async loadLevel(i: number): Promise<void> {
    this.level = i;
    this.lv = LEVELS[i];
    for (const p of this.pieces) p.img.destroy();
    this.pieces = [];
    for (const l of this.latches) l.destroy();
    this.latches = [];
    this.caseImg?.destroy();
    this.ghost.clear();
    const { cols, rows } = this.lv;
    this.grid = new Array(cols * rows).fill(-1);
    this.gx0 = CASE_CX - (cols * CELL) / 2;
    this.gy0 = CASE_CY - (rows * CELL) / 2;
    this.caseImg = this.add
      .image(this.gx0 - 22, this.gy0 - 22 - 36, suitcaseTexture(this, cols, rows))
      .setOrigin(0)
      .setDepth(10);
    this.caseImg.setScale(1, 0.2).setAlpha(0);
    this.tweens.add({
      targets: this.caseImg,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
    // broches
    const ly = this.gy0 + rows * CELL + 14;
    for (const lx of [this.gx0 + CELL * 0.7, this.gx0 + cols * CELL - CELL * 0.7]) {
      this.latches.push(this.add.image(lx, ly, latchTexture(this)).setDepth(12));
    }
    // piezas en la bandeja
    const ids: { id: PieceId; ticket: number }[] = [
      ...this.lv.pieces.map((id) => ({ id, ticket: -1 })),
      ...this.lv.tickets.map((t) => ({ id: 'tiquete' as PieceId, ticket: t })),
    ];
    ids.forEach((d, k) => {
      const img = this.add.image(0, 0, pieceTexture(this, d.id)).setDepth(20);
      const piece: Piece = {
        id: d.id,
        rot: 0,
        img,
        placed: null,
        home: { x: 0, y: 0 },
        ticket: d.ticket,
        base: { x: 0, y: 0, a: 0 },
      };
      img.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(0, 0, img.width, img.height),
        hitAreaCallback: (_area: Phaser.Geom.Rectangle, x: number, y: number) =>
          PIECES[d.id].cells.some(
            ([cx, cy]) =>
              x >= cx * CELL && x < (cx + 1) * CELL && y >= cy * CELL && y < (cy + 1) * CELL,
          ),
        useHandCursor: true,
      });
      img.setData('piece', piece);
      this.pieces.push(piece);
      void k;
    });
    this.layoutTray(true);
    this.stuckAt = this.time.now;
    this.fails = 0;
    this.stuckShown = false;
    this.opened = 0;
    if (this.madrugada && !this.lv.impossible) {
      this.timeLeft = i < 3 ? 70 : 85;
      this.timerBar?.destroy();
      this.timerBar = this.add.rectangle(W / 2, 56, 400, 8, 0xd8352e).setDepth(DEPTH.hud);
      this.shakeAt = this.time.now + 9000;
    }
    const lines = this.S.levelLines[i];
    if (i === 4) await this.say(this.S.hideLines);
    else if (i === 5) await this.say(this.S.act3Lines);
    else if (lines && lines.length) await this.say(lines);
    if (i === 0) hint(this, this.S.hintDrag, 5500, '#2a1c12');
    if (this.auto) this.planAuto();
  }

  /** Acomoda las piezas sueltas en la bandeja de la derecha. */
  private layoutTray(appear = false): void {
    let x = 668;
    let y = 96;
    let rowH = 0;
    for (const p of this.pieces) {
      if (p.placed) continue;
      const cells = rotate(PIECES[p.id].cells, p.rot);
      const w = (Math.max(...cells.map((c) => c[0])) + 1) * CELL * TRAY_SCALE;
      const h = (Math.max(...cells.map((c) => c[1])) + 1) * CELL * TRAY_SCALE;
      if (x + w > 950) {
        x = 668;
        y += rowH + 12;
        rowH = 0;
      }
      p.home = { x: x + w / 2, y: y + h / 2 };
      x += w + 12;
      rowH = Math.max(rowH, h);
      if (appear) {
        p.img
          .setPosition(p.home.x, H + 100)
          .setAngle(p.rot * 90)
          .setScale(TRAY_SCALE);
        this.tweens.add({
          targets: p.img,
          y: p.home.y,
          duration: 450,
          delay: Math.random() * 250,
          ease: 'Back.easeOut',
        });
      } else if (p !== this.drag?.p) {
        this.tweens.add({
          targets: p.img,
          x: p.home.x,
          y: p.home.y,
          scale: TRAY_SCALE,
          angle: p.rot * 90,
          duration: 220,
        });
      }
      p.base = { x: p.home.x, y: p.home.y, a: p.rot * 90 };
    }
  }

  // ---------------- Arrastre ----------------

  private pieceAt(p: Phaser.Input.Pointer): Piece | undefined {
    const hits = this.input.hitTestPointer(p) as Phaser.GameObjects.GameObject[];
    const g = hits.find((o) => o.getData && o.getData('piece'));
    return g?.getData('piece') as Piece | undefined;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.canPlay() || this.busy) return;
    if (this.lv?.impossible && this.stuckShown) {
      const l = this.latches.find((x) => x.visible && Math.hypot(x.x - p.x, x.y - p.y) < 34);
      if (l) {
        this.openLatch(l);
        return;
      }
    }
    if (this.giving) {
      const vaca = this.critters.find(
        (c) => c.getData('id') === 'vaca' && Math.hypot(c.x - p.x, c.y - p.y) < 60,
      );
      if (vaca)
        this.drag = {
          p: {
            id: 'vaca',
            rot: 0,
            img: vaca,
            placed: null,
            home: { x: vaca.x, y: vaca.y },
            ticket: -1,
            base: { x: 0, y: 0, a: 0 },
          },
          ox: 0,
          oy: 0,
          sx: p.x,
          sy: p.y,
          t: this.time.now,
          moved: false,
        };
      return;
    }
    const piece = this.pieceAt(p);
    if (!piece) return;
    if (piece.placed) this.unplace(piece);
    piece.img.setDepth(60);
    this.tweens.killTweensOf(piece.img);
    this.tweens.add({ targets: piece.img, scale: 1.04, duration: 120 });
    this.drag = {
      p: piece,
      ox: piece.img.x - p.x,
      oy: piece.img.y - p.y,
      sx: p.x,
      sy: p.y,
      t: this.time.now,
      moved: false,
    };
    Audio.sfx('squish', 1.3);
  }

  private onDragMove(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || !p.isDown) return;
    if (Math.hypot(p.x - d.sx, p.y - d.sy) > 10) d.moved = true;
    d.p.img.setPosition(p.x + d.ox * (d.moved ? 0.4 : 1), p.y + d.oy * (d.moved ? 0.4 : 1));
    d.p.base = { x: d.p.img.x, y: d.p.img.y, a: d.p.rot * 90 };
    if (!this.giving) this.drawGhost(d.p);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    this.drag = undefined;
    this.ghost.clear();
    if (!d) return;
    if (this.giving) {
      if (this.wilmer && Math.hypot(p.x - this.wilmer.x, p.y - (this.wilmer.y - 80)) < 110)
        void this.giveVaca(d.p.img);
      return;
    }
    const piece = d.p;
    if (!d.moved && this.time.now - d.t < 300) {
      this.tapRotate(piece);
      return;
    }
    const spot = this.snapSpot(piece);
    if (spot && this.fits(piece, piece.rot, spot.x, spot.y)) this.place(piece, spot.x, spot.y);
    else {
      if (this.overCase(piece)) {
        toast(this, this.S.noFit, '#d8352e', 120);
        Audio.sfx('fail');
        this.fails++;
      }
      piece.img.setDepth(20);
      this.layoutTray();
    }
  }

  private rotateDragged(): void {
    const d = this.drag;
    if (!d) return;
    d.p.rot = (d.p.rot + 1) % 4;
    d.p.img.setAngle(d.p.rot * 90);
    Audio.sfx('pop');
  }

  private tapRotate(piece: Piece): void {
    piece.rot = (piece.rot + 1) % 4;
    Audio.sfx('pop', 1 + piece.rot * 0.1);
    Juice.vibrate(8);
    if (piece.id === 'vaca') {
      this.vacaTaps++;
      if (this.vacaTaps >= 4 && !this.secretDone) {
        this.secretDone = true;
        Audio.note('tiple', 'C3', 0.7, 0.6);
        Audio.sfx('squish', 0.4);
        void this.foundSecret();
      }
    } else this.vacaTaps = 0;
    piece.img.setDepth(20);
    this.layoutTray();
  }

  private cellsOf(piece: Piece, rot: number): [number, number][] {
    return rotate(PIECES[piece.id].cells, rot);
  }

  private snapSpot(piece: Piece): { x: number; y: number } | null {
    const cells = this.cellsOf(piece, piece.rot);
    const rw = Math.max(...cells.map((c) => c[0])) + 1;
    const rh = Math.max(...cells.map((c) => c[1])) + 1;
    const left = piece.img.x - (rw * CELL) / 2;
    const top = piece.img.y - (rh * CELL) / 2;
    const x = Math.round((left - this.gx0) / CELL);
    const y = Math.round((top - this.gy0) / CELL);
    if (x < -1 || y < -1 || x > this.lv.cols || y > this.lv.rows) return null;
    return { x, y };
  }

  private overCase(piece: Piece): boolean {
    return (
      piece.img.x > this.gx0 - 20 &&
      piece.img.x < this.gx0 + this.lv.cols * CELL + 20 &&
      piece.img.y > this.gy0 - 20 &&
      piece.img.y < this.gy0 + this.lv.rows * CELL + 20
    );
  }

  private fits(piece: Piece, rot: number, x: number, y: number): boolean {
    const { cols, rows } = this.lv;
    return this.cellsOf(piece, rot).every(([cx, cy]) => {
      const gx = x + cx;
      const gy = y + cy;
      return gx >= 0 && gy >= 0 && gx < cols && gy < rows && this.grid[gy * cols + gx] === -1;
    });
  }

  private drawGhost(piece: Piece): void {
    const g = this.ghost;
    g.clear();
    const spot = this.snapSpot(piece);
    if (!spot) return;
    const ok = this.fits(piece, piece.rot, spot.x, spot.y);
    for (const [cx, cy] of this.cellsOf(piece, piece.rot)) {
      const gx = spot.x + cx;
      const gy = spot.y + cy;
      if (gx < 0 || gy < 0 || gx >= this.lv.cols || gy >= this.lv.rows) continue;
      g.fillStyle(ok ? 0x7ed67a : 0xff6a5a, 0.45);
      g.fillRoundedRect(this.gx0 + gx * CELL + 4, this.gy0 + gy * CELL + 4, CELL - 8, CELL - 8, 10);
    }
  }

  private place(piece: Piece, x: number, y: number): void {
    const idx = this.pieces.indexOf(piece);
    const cells = this.cellsOf(piece, piece.rot);
    for (const [cx, cy] of cells) this.grid[(y + cy) * this.lv.cols + (x + cx)] = idx;
    piece.placed = { x, y };
    const rw = Math.max(...cells.map((c) => c[0])) + 1;
    const rh = Math.max(...cells.map((c) => c[1])) + 1;
    const px = this.gx0 + (x + rw / 2) * CELL;
    const py = this.gy0 + (y + rh / 2) * CELL;
    piece.base = { x: px, y: py, a: piece.rot * 90 };
    piece.img.setDepth(30);
    this.tweens.add({
      targets: piece.img,
      x: px,
      y: py,
      scale: 1,
      angle: piece.rot * 90,
      duration: 110,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({ targets: piece.img, scaleY: 0.86, duration: 70, delay: 110, yoyo: true });
    Audio.sfx('squish');
    Juice.vibrate(12);
    this.tweens.add({ targets: this.samuFig, y: 516, duration: 90, yoyo: true });
    if (piece.ticket >= 0 && !this.lv.impossible) this.foundTicket(piece.ticket, px, py);
    this.layoutTray();
    this.checkDone();
  }

  private unplace(piece: Piece): void {
    const idx = this.pieces.indexOf(piece);
    this.grid = this.grid.map((v) => (v === idx ? -1 : v));
    piece.placed = null;
  }

  private checkDone(): void {
    if (this.lv.impossible) {
      const full = this.grid.every((v) => v !== -1);
      if (full && !this.stuckShown) void this.stuck();
      return;
    }
    const req = this.pieces.filter((p) => p.ticket < 0);
    if (req.every((p) => p.placed)) void this.levelDone();
  }

  private async levelDone(): Promise<void> {
    this.busy = true;
    this.timerBar?.destroy();
    this.timerBar = undefined;
    Audio.sfx('success');
    Juice.burst(this, CASE_CX, CASE_CY, 0xf2c230, 20, 200, 4, 50);
    for (const l of this.latches)
      this.tweens.add({ targets: l, scale: 1.4, duration: 120, yoyo: true });
    Audio.drum('clack', 0.8);
    await this.wait(900);
    this.busy = false;
    const next = this.level + 1;
    if (next === 3) this.startActWithBanner(2);
    else if (next === 5) this.startActWithBanner(3);
    else void this.loadLevel(next);
  }

  // ---------------- Acto III: la maleta que no cierra ----------------

  private async stuck(): Promise<void> {
    this.stuckShown = true;
    await this.say(this.S.stuckLines);
    hint(this, this.S.hintLatch, 6000, '#2a1c12');
    for (const l of this.latches) {
      l.setTint(0xfff0a0);
      this.tweens.add({ targets: l, scale: 1.35, duration: 450, yoyo: true, repeat: -1 });
    }
  }

  private openLatch(l: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(l);
    l.setVisible(false);
    Audio.sfx('pop', 0.7);
    Juice.burst(this, l.x, l.y, 0xd9b45a, 8, 80, 3, 50);
    this.opened++;
    if (this.opened >= 2) void this.spill();
  }

  private async spill(): Promise<void> {
    this.busy = true;
    Audio.sfx('whoosh');
    Juice.shake(this, 0.01, 300);
    Audio.level(2);
    // la tapa se abre y todo se sale caminando
    if (this.caseImg)
      this.tweens.add({
        targets: this.caseImg,
        scaleY: 0.4,
        y: this.caseImg.y + 120,
        alpha: 0.6,
        duration: 400,
      });
    this.pieces.forEach((p, i) => {
      const tx = 240 + Math.random() * 520;
      const ty = 470 + Math.random() * 50;
      this.tweens.add({
        targets: p.img,
        x: tx,
        y: ty,
        scale: 0.55,
        angle: (Math.random() - 0.5) * 30,
        duration: 700,
        delay: i * 80,
        ease: 'Bounce.easeOut',
      });
      p.img.setData('id', p.id).setDepth(35);
      p.img.disableInteractive();
      this.critters.push(p.img);
      p.placed = null;
    });
    // ya no son piezas: el «hervor» de stop motion no las devuelve a la bandeja
    this.pieces = [];
    this.samuFig.setDepth(36);
    this.tweens.add({ targets: this.samuFig, x: 300, duration: 900, ease: 'Sine.easeInOut' });
    await this.wait(1200);
    // los juguetes caminan solos
    for (const c of this.critters) this.wander(c);
    this.wilmer = this.add
      .image(W + 80, 526, 'samu-fig-wilmer')
      .setOrigin(0.5, 1)
      .setDepth(36);
    this.tweens.add({ targets: this.wilmer, x: 820, duration: 1400, ease: 'Sine.easeOut' });
    // el morral de Wílmer, sobrecargado
    const bag = this.add
      .image(W + 40, 440, pieceTexture(this, 'camiseta'))
      .setScale(0.5)
      .setDepth(37);
    const ball = this.add
      .image(W + 60, 404, pieceTexture(this, 'balon'))
      .setScale(0.6)
      .setDepth(37);
    this.tweens.add({ targets: [bag, ball], x: '-=200', duration: 1400, ease: 'Sine.easeOut' });
    await this.wait(1500);
    this.busy = false;
    await this.say(this.S.spillLines);
    this.giving = true;
    hint(this, this.S.hintGive, 6000, '#2a1c12');
    const vaca = this.critters.find((c) => c.getData('id') === 'vaca');
    if (vaca) {
      this.tweens.killTweensOf(vaca);
      this.tweens.add({ targets: vaca, scale: 0.8, duration: 300, yoyo: true, repeat: 2 });
    }
  }

  private wander(c: Phaser.GameObjects.Image): void {
    if (!c.active || c.getData('given')) return;
    const tx = Phaser.Math.Clamp(c.x + (Math.random() - 0.5) * 160, 220, 720);
    this.tweens.add({
      targets: c,
      x: tx,
      y: 470 + Math.random() * 50,
      duration: 900 + Math.random() * 600,
      ease: 'Sine.easeInOut',
      onUpdate: () => (c.angle = Math.sin(this.time.now / 90) * 8),
      onComplete: () => {
        if (!this.giving || c.getData('id') !== 'vaca') this.wander(c);
        else this.wander(c);
      },
    });
  }

  private async giveVaca(v: Phaser.GameObjects.Image): Promise<void> {
    if (!this.giving) return;
    this.giving = false;
    v.setData('given', true);
    this.tweens.killTweensOf(v);
    this.tweens.add({ targets: v, x: 790, y: 430, scale: 0.7, angle: 0, duration: 300 });
    Audio.sfx('success');
    Juice.burst(this, 790, 430, 0xf2a0b0, 16, 140, 3, 60);
    await this.wait(500);
    await this.complete();
  }

  // ---------------- Bucle ----------------

  update(_t: number, dtMs: number): void {
    if (this.paused) return;
    const now = this.time.now;
    // stop motion: todo «hierve» a 12 cuadros por segundo
    if (now > this.boilAt) {
      this.boilAt = now + 83;
      for (const p of this.pieces) {
        if (this.drag?.p === p || this.tweens.isTweening(p.img)) continue;
        p.img.setPosition(
          p.base.x + (Math.random() - 0.5) * 1.4,
          p.base.y + (Math.random() - 0.5) * 1.4,
        );
        p.img.setAngle(p.base.a + (Math.random() - 0.5) * 1.6);
      }
      this.samuFig.setAngle((Math.random() - 0.5) * 1.5);
    }
    if (this.lv?.impossible && !this.stuckShown && this.canPlay()) {
      if (this.fails >= 2 || now - this.stuckAt > 26000) void this.stuck();
    }
    if (this.madrugada && this.timerBar && this.canPlay() && !this.busy) {
      this.timeLeft -= dtMs / 1000;
      const total = this.level < 3 ? 70 : 85;
      this.timerBar.setScale(Math.max(0, this.timeLeft / total), 1);
      if (now > this.shakeAt) {
        this.shakeAt = now + 9000;
        const placed = this.pieces.filter((p) => p.placed);
        const victim = placed[Math.floor(Math.random() * placed.length)];
        Juice.shake(this, 0.008, 300);
        Audio.drum('clack', 0.8);
        if (victim) {
          this.unplace(victim);
          this.layoutTray();
        }
      }
      if (this.timeLeft <= 0) {
        this.timerBar.destroy();
        this.timerBar = undefined;
        Audio.sfx('whistle');
        toast(this, this.S.timeUp, '#d8352e', 120);
        void this.loadLevel(this.level);
      }
    }
    if (this.auto) this.autoPlay();
  }

  // ---------------- Modo de prueba ----------------

  private planAuto(): void {
    this.autoQueue = [];
    if (this.lv.impossible) return;
    const ids = this.pieces.map((p) => p.id);
    const sol = solve(this.lv.cols, this.lv.rows, ids);
    if (!sol) return;
    for (const s of sol)
      this.autoQueue.push({ p: this.pieces[s.piece], rot: s.rot, x: s.x, y: s.y });
    // los tiquetes primero, para recogerlos antes de cerrar la maleta
    this.autoQueue.sort((a, b) => (b.p.ticket >= 0 ? 1 : 0) - (a.p.ticket >= 0 ? 1 : 0));
  }

  private autoPlay(): void {
    if (!this.canPlay() || this.busy || this.time.now < this.autoAt) return;
    this.autoAt = this.time.now + 350;
    if (this.giving && this.wilmer) {
      const v = this.critters.find((c) => c.getData('id') === 'vaca');
      if (v) void this.giveVaca(v);
      return;
    }
    if (this.lv.impossible) {
      if (this.stuckShown) {
        const l = this.latches.find((x) => x.visible);
        if (l) this.openLatch(l);
      } else this.fails = 2;
      return;
    }
    const step = this.autoQueue.shift();
    if (!step) return;
    step.p.rot = step.rot;
    step.p.img.setAngle(step.rot * 90);
    this.place(step.p, step.x, step.y);
  }
}
