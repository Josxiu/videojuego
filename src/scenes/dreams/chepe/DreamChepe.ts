import { DEPTH, FONT, H, W, txt, type DreamId } from '../../../config';
import { addTexture, css, makeCanvas, rng } from '../../../gfx/canvas';
import { CELESTE_PAL, PEOPLE, celeste, drawFlat, figureTexture, person } from '../../../gfx/figure';
import { T } from '../../../i18n';
import { Audio } from '../../../systems/audio/Audio';
import type { TrackId } from '../../../systems/audio/tracks';
import { debug } from '../../../systems/debug';
import { THEMES } from '../../../systems/dialogue';
import { Juice } from '../../../systems/juice';
import { closest, polySegs, type Seg } from '../../../systems/physics2d';
import { hint, toast } from '../../../systems/ui';
import { DreamScene } from '../../DreamScene';

const R = 9;
const G = 640;

interface PBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  live: boolean;
  touched: boolean;
  loops: number;
  armed: boolean;
}

interface Flipper {
  px: number;
  py: number;
  len: number;
  rest: number;
  up: number;
  a: number;
  w: number;
  side: -1 | 1;
  pressed: boolean;
  auto: number;
}

interface Bumper {
  x: number;
  y: number;
  r: number;
  lit: boolean;
  flash: number;
  letter: string;
}

const BUMPERS: [number, number][] = [
  [400, 180],
  [480, 146],
  [560, 180],
  [420, 262],
  [540, 262],
  [480, 334],
];
const TICKETS: { i: number; x: number; y: number; act: 1 | 2 }[] = [
  { i: 0, x: 330, y: 150, act: 1 },
  { i: 1, x: 600, y: 230, act: 1 },
  { i: 2, x: 480, y: 70, act: 1 },
  { i: 3, x: 345, y: 390, act: 2 },
  { i: 4, x: 610, y: 120, act: 2 },
];

/** Sueño 5 — La Chiva de la Suerte (pintura de chiva · pinball). */
export class DreamChepe extends DreamScene {
  readonly dream: DreamId = 'chepe';
  readonly theme = THEMES.chiva;
  readonly card = { bg: 0xfff2c2, ink: '#22160e', accent: '#d6262e', font: FONT.chiva };
  readonly music: TrackId = 'chepe';

  private segs: Seg[] = [];
  private balls: PBall[] = [];
  private flippers: Flipper[] = [];
  private bumpers: Bumper[] = [];
  private g!: Phaser.GameObjects.Graphics;
  private letters: Phaser.GameObjects.Text[] = [];
  private bumperText: Phaser.GameObjects.Text[] = [];
  private plata = 1000;
  private plataText!: Phaser.GameObjects.Text;
  private sign!: Phaser.GameObjects.Text;
  private tickets: { i: number; x: number; y: number; taken: boolean }[] = [];
  private tilt = 0;
  private jackpot = { x: 480, y: 214, on: false, hold: 0, ball: null as PBall | null };
  private faces = false;
  private temptations = 0;
  private touchedThisBall = false;
  private drainIdx = 0;
  private secretDone = false;
  private auto = false;
  private keys!: Record<'left' | 'right' | 'a' | 'd', Phaser.Input.Keyboard.Key>;
  private act3Done = false;

  constructor() {
    super('DreamChepe');
  }

  private get C() {
    return T.dreams.chepe;
  }

  protected build(): void {
    this.auto = debug.flag('auto');
    this.secretDone = false;
    this.temptations = 0;
    this.act3Done = false;
    this.plata = 1000;
    this.add.image(0, 0, this.chivaBg()).setOrigin(0).setDepth(0);
    this.g = this.add.graphics().setDepth(10);
    this.buildTable();
    // tablero lateral: letras SUERTE
    this.letters = this.C.word.split('').map((ch, i) =>
      this.add
        .text(52 + i * 36, 210, ch, txt(38, '#c8b89a', FONT.chiva))
        .setOrigin(0.5)
        .setDepth(5),
    );
    this.sign = this.add
      .text(
        150,
        120,
        this.C.consentida,
        txt(34, '#d6262e', FONT.chiva, { stroke: '#22160e', strokeThickness: 5 }),
      )
      .setOrigin(0.5)
      .setDepth(5)
      .setAngle(-4);
    this.add
      .text(150, 160, this.C.route, txt(15, '#22160e', FONT.display, { fontStyle: '800' }))
      .setOrigin(0.5)
      .setDepth(5);
    this.plataText = this.add
      .text(812, 120, '', txt(26, '#1f9a4a', FONT.chiva, { stroke: '#22160e', strokeThickness: 4 }))
      .setOrigin(0.5)
      .setDepth(5);
    // figuras pintadas de chiva: contorno negro y colores planos
    if (!this.textures.exists('chepe-fig-c')) {
      const mk = (key: string, prims: ReturnType<typeof celeste>, pal: typeof CELESTE_PAL) =>
        figureTexture(
          this,
          key,
          prims,
          1.5,
          (ctx, o) => drawFlat(ctx, prims, { ...o, pal, outline: 0x22160e, outlineWidth: 2 }),
          pal,
        );
      mk('chepe-fig-c', celeste(0, true), { ...CELESTE_PAL, coat: 0x2f5dd6, pants: 0x1b1f3b });
      mk('chepe-fig-ch', person('chepe'), PEOPLE.chepe.pal);
    }
    this.add.image(760, 470, 'chepe-fig-ch').setOrigin(0.5, 1).setDepth(5);
    this.add.image(860, 470, 'chepe-fig-c').setOrigin(0.5, 1).setDepth(5).setFlipX(true);
    this.refreshPlata();
    this.keys = this.input.keyboard!.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      a: 'A',
      d: 'D',
    }) as typeof this.keys;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) =>
      this.press(p.x < W / 2 ? 0 : 1, true),
    );
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.press(p.x < W / 2 ? 0 : 1, false));
  }

  /** La carrocería de la chiva: franjas, filetes y paisajes pintados. */
  private chivaBg(): string {
    const key = 'chepe-bg';
    if (this.textures.exists(key)) return key;
    const [c, ctx] = makeCanvas(W, H);
    ctx.fillStyle = css(0xffd83a);
    ctx.fillRect(0, 0, W, H);
    const stripes = [0xd6262e, 0x1f9a4a, 0x2f5dd6, 0xf28c28];
    stripes.forEach((col, i) => {
      ctx.fillStyle = css(col);
      ctx.fillRect(0, 20 + i * 12, W, 8);
      ctx.fillRect(0, H - 40 - i * 12, W, 8);
    });
    // filetes (volutas)
    const r = rng(7);
    ctx.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = css(stripes[i % 4]);
      const x = r() < 0.5 ? 20 + r() * 240 : 700 + r() * 240;
      const y = 280 + r() * 160;
      ctx.beginPath();
      for (let t = 0; t < 9; t += 0.3) ctx.lineTo(x + Math.cos(t) * t * 3, y + Math.sin(t) * t * 3);
      ctx.stroke();
    }
    // paisaje de vereda en un panel
    const panel = (x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = css(0x8fd0f0);
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = css(0x3aa655);
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.3, x + w * 0.6, y + h * 0.7);
      ctx.quadraticCurveTo(x + w * 0.8, y + h * 0.5, x + w, y + h * 0.6);
      ctx.lineTo(x + w, y + h);
      ctx.fill();
      ctx.fillStyle = css(0xffe14a);
      ctx.beginPath();
      ctx.arc(x + w * 0.8, y + h * 0.25, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = css(0x22160e);
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
    };
    panel(30, 290, 230, 100);
    panel(700, 180, 230, 80);
    ctx.fillStyle = css(0x22160e);
    ctx.font = '22px Sancreek';
    ctx.fillText('Dios me guíe', 60, 440);
    ctx.fillText('y la Virgen me acompañe', 30, 470);
    // la mesa: panel pintado
    ctx.fillStyle = css(0xfff2c2);
    ctx.fillRect(290, 10, 380, 540);
    for (let y = 30; y < H; y += 40) {
      ctx.fillStyle = css(0xffe7a0);
      ctx.fillRect(300, y, 360, 20);
    }
    ctx.strokeStyle = css(0x22160e);
    ctx.lineWidth = 6;
    ctx.strokeRect(290, 10, 380, 540);
    return addTexture(this, key, c);
  }

  private buildTable(): void {
    const arc: number[][] = [];
    for (let k = 0; k <= 18; k++) {
      const a = Math.PI + (k / 18) * Math.PI;
      arc.push([480 + 180 * Math.cos(a), 140 + 110 * Math.sin(a)]);
    }
    this.segs = [
      ...polySegs([[300, 420], [300, 140], ...arc, [660, 140], [660, 545]], 'wall'),
      ...polySegs(
        [
          [300, 420],
          [396, 488],
        ],
        'wall',
      ),
      ...polySegs(
        [
          [622, 200],
          [622, 420],
          [564, 488],
        ],
        'wall',
      ),
      ...polySegs(
        [
          [622, 545],
          [660, 545],
        ],
        'wall',
      ),
      ...polySegs(
        [
          [332, 330],
          [372, 410],
        ],
        'sling',
        1.25,
      ),
      ...polySegs(
        [
          [590, 330],
          [550, 410],
        ],
        'sling',
        1.25,
      ),
    ];
    const len = this.madrugada ? 58 : 68;
    this.flippers = [
      {
        px: 398,
        py: 490,
        len,
        rest: 0.52,
        up: -0.42,
        a: 0.52,
        w: 0,
        side: -1,
        pressed: false,
        auto: 0,
      },
      {
        px: 562,
        py: 490,
        len,
        rest: Math.PI - 0.52,
        up: Math.PI + 0.42,
        a: Math.PI - 0.52,
        w: 0,
        side: 1,
        pressed: false,
        auto: 0,
      },
    ];
    this.bumpers = BUMPERS.map(([x, y], i) => ({
      x,
      y,
      r: 21,
      lit: false,
      flash: 0,
      letter: this.C.word[i],
    }));
    this.bumperText = this.bumpers.map((m) =>
      this.add
        .text(m.x, m.y + 1, m.letter, txt(16, '#22160e', FONT.chiva))
        .setOrigin(0.5)
        .setDepth(11),
    );
  }

  private refreshPlata(): void {
    this.plataText.setText(`${this.C.money}: $${this.plata.toLocaleString('es-CO')}`);
  }

  // ---------------- Actos ----------------

  protected startAct(n: number): void {
    void this.loadAct(n);
  }

  private async loadAct(n: number): Promise<void> {
    this.balls = [];
    this.tickets = TICKETS.filter((t) => t.act === n).map((t) => ({ ...t, taken: false }));
    for (const b of this.bumpers) b.lit = false;
    this.refreshLetters();
    this.tilt = 0;
    this.jackpot.on = n === 2;
    if (n === 2) await this.say(this.C.act2Lines);
    if (n === 3) {
      await this.say(this.C.act3Lines);
      this.temptations = 0;
    }
    if (n === 1) hint(this, this.C.hintFlip, 5500, '#22160e');
    this.launch();
    if (this.madrugada && n < 3) this.time.delayedCall(1500, () => this.launch());
  }

  private launch(): void {
    Audio.sfx('whoosh', 0.8);
    this.balls.push({
      x: 641,
      y: 525,
      vx: 0,
      vy: -1080 - Math.random() * 80,
      live: true,
      touched: false,
      loops: 0,
      armed: true,
    });
    this.touchedThisBall = false;
  }

  private refreshLetters(): void {
    this.bumpers.forEach((b, i) => {
      this.letters[i].setColor(b.lit ? '#d6262e' : '#c8b89a');
      this.bumperText[i]?.setColor(b.lit ? '#d6262e' : '#22160e');
    });
  }

  // ---------------- Paletas ----------------

  private press(side: 0 | 1, down: boolean): void {
    if (!this.canPlay() && down) return;
    const f = this.flippers[side];
    if (down && !f.pressed) {
      Audio.sfx('flip');
      Juice.vibrate(6);
      if (this.act === 3) this.touchedThisBall = true;
    }
    f.pressed = down;
  }

  update(_t: number, dtMs: number): void {
    if (this.paused) return;
    const dt = Math.min(1 / 30, dtMs / 1000);
    if (this.canPlay()) {
      const k = this.keys;
      if (Phaser.Input.Keyboard.JustDown(k.left) || Phaser.Input.Keyboard.JustDown(k.a))
        this.press(0, true);
      if (Phaser.Input.Keyboard.JustUp(k.left) || Phaser.Input.Keyboard.JustUp(k.a))
        this.press(0, false);
      if (Phaser.Input.Keyboard.JustDown(k.right) || Phaser.Input.Keyboard.JustDown(k.d))
        this.press(1, true);
      if (Phaser.Input.Keyboard.JustUp(k.right) || Phaser.Input.Keyboard.JustUp(k.d))
        this.press(1, false);
      if (this.auto) this.autoPlay();
      this.simulate(dt);
    }
    this.draw();
  }

  private simulate(dt: number): void {
    // Acto II: la mesa se ladea con el tren y los agüeros mueven las paletas
    if (this.act === 2) {
      this.tilt = Math.sin(this.time.now / 1300) * 230;
      for (const f of this.flippers) {
        if (f.auto > 0) f.auto -= dt;
        else if (Math.random() < dt * 0.5) {
          f.auto = 0.16;
          Audio.sfx('flip');
        }
      }
    }
    const n = 6;
    const h = dt / n;
    for (let s = 0; s < n; s++) {
      for (const f of this.flippers) {
        const target = f.pressed || f.auto > 0 ? f.up : f.rest;
        const prev = f.a;
        const speed = 22 * h;
        f.a += Phaser.Math.Clamp(target - f.a, -speed, speed);
        f.w = (f.a - prev) / h;
      }
      for (const b of this.balls) if (b.live) this.stepBall(b, h);
    }
    // bolas que se van
    for (const b of this.balls) {
      if (b.live && b.y > H + 10) {
        b.live = false;
        void this.drained(b);
      }
    }
    this.balls = this.balls.filter((b) => b.live);
  }

  private stepBall(b: PBall, h: number): void {
    if (this.jackpot.ball === b) {
      this.jackpot.hold -= h;
      if (this.jackpot.hold <= 0) {
        this.jackpot.ball = null;
        b.vx = (Math.random() - 0.5) * 300;
        b.vy = 380;
      }
      return;
    }
    b.vx += this.tilt * h;
    b.vy += G * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    // paredes
    for (const sg of this.segs) {
      const [cx, cy] = closest(sg, b.x, b.y);
      let nx = b.x - cx;
      let ny = b.y - cy;
      const d = Math.hypot(nx, ny);
      if (d >= R || d === 0) continue;
      nx /= d;
      ny /= d;
      b.x = cx + nx * R;
      b.y = cy + ny * R;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        const e = sg.bounce ?? 0.35;
        b.vx -= (1 + e) * vn * nx;
        b.vy -= (1 + e) * vn * ny;
        if (sg.tag === 'sling') {
          b.vx += nx * 260;
          b.vy += ny * 260;
          Audio.sfx('bumper');
        } else if (-vn > 200) Audio.drum('rim', 0.3);
      }
    }
    // paletas (con la velocidad de su superficie)
    for (const f of this.flippers) {
      const tip = { x: f.px + Math.cos(f.a) * f.len, y: f.py + Math.sin(f.a) * f.len };
      const seg: Seg = { ax: f.px, ay: f.py, bx: tip.x, by: tip.y };
      const [cx, cy] = closest(seg, b.x, b.y);
      let nx = b.x - cx;
      let ny = b.y - cy;
      const d = Math.hypot(nx, ny);
      const rad = R + 5;
      if (d >= rad || d === 0) continue;
      nx /= d;
      ny /= d;
      b.x = cx + nx * rad;
      b.y = cy + ny * rad;
      const sx = -f.w * (cy - f.py);
      const sy = f.w * (cx - f.px);
      const rvx = b.vx - sx;
      const rvy = b.vy - sy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        b.vx = rvx - 1.3 * vn * nx + sx;
        b.vy = rvy - 1.3 * vn * ny + sy;
      }
      b.touched = true;
    }
    // medallones
    this.bumpers.forEach((m, i) => {
      const dx = b.x - m.x;
      const dy = b.y - m.y;
      const d = Math.hypot(dx, dy);
      if (d >= m.r + R) return;
      const nx = dx / d;
      const ny = dy / d;
      b.x = m.x + nx * (m.r + R);
      b.y = m.y + ny * (m.r + R);
      const sp = Math.max(520, Math.hypot(b.vx, b.vy) * 0.85);
      b.vx = nx * sp;
      b.vy = ny * sp;
      m.flash = 0.2;
      Audio.sfx('bumper');
      Juice.vibrate(8);
      this.hitBumper(m, i);
    });
    // premio mayor (Acto II)
    if (
      this.jackpot.on &&
      !this.jackpot.ball &&
      Math.hypot(b.x - this.jackpot.x, b.y - this.jackpot.y) < 14
    ) {
      this.jackpot.ball = b;
      this.jackpot.hold = 1;
      b.x = this.jackpot.x;
      b.y = this.jackpot.y;
      b.vx = 0;
      b.vy = 0;
      this.onJackpot();
    }
    // tiquetes
    for (const t of this.tickets) {
      if (!t.taken && Math.hypot(b.x - t.x, b.y - t.y) < 18) {
        t.taken = true;
        this.foundTicket(t.i, t.x, t.y);
      }
    }
    // vueltas por arriba (secreto)
    if (b.y < 62 && b.armed) {
      b.armed = false;
      b.loops++;
      if (b.loops >= 7 && !this.secretDone && this.act < 3) {
        this.secretDone = true;
        void this.foundSecret();
      }
    } else if (b.y > 200) b.armed = true;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 1350) {
      b.vx = (b.vx / sp) * 1350;
      b.vy = (b.vy / sp) * 1350;
    }
  }

  private hitBumper(m: Bumper, i: number): void {
    this.plata += 100;
    this.refreshPlata();
    if (this.act === 3) return;
    if (!m.lit) {
      m.lit = true;
      this.refreshLetters();
      this.tweens.add({ targets: this.letters[i], scale: 1.5, duration: 120, yoyo: true });
      if (this.act === 2 && !this.faces) {
        this.faces = true;
        void this.say(this.C.facesLine);
      }
      if (this.bumpers.every((x) => x.lit)) this.allLit();
    }
  }

  private allLit(): void {
    Audio.sfx('success');
    Juice.flash(this, 0xffe14a, 200);
    for (const b of this.balls) b.live = false;
    this.balls = [];
    this.time.delayedCall(700, () => this.startActWithBanner(this.act + 1));
  }

  private onJackpot(): void {
    Audio.sfx('secret');
    toast(this, this.C.jackpot, '#d6262e', 120);
    this.plata += 5000;
    this.refreshPlata();
    // y la plata se va por el desagüe
    for (let i = 0; i < 14; i++) {
      const c = this.add
        .circle(480 + (Math.random() - 0.5) * 60, 220, 7, 0xf2c230)
        .setStrokeStyle(2, 0x8a6a10)
        .setDepth(12);
      this.tweens.add({
        targets: c,
        y: H + 20,
        x: 480 + (Math.random() - 0.5) * 30,
        duration: 900 + i * 60,
        ease: 'Quad.easeIn',
        onStart: () => Audio.sfx('coin'),
        onComplete: () => c.destroy(),
      });
    }
    this.time.delayedCall(1300, () => {
      this.plata = Math.max(0, this.plata - 7000);
      this.refreshPlata();
      this.bubble(this.C.jackpotLine);
    });
  }

  private async drained(b: PBall): Promise<void> {
    void b;
    Audio.sfx('drain');
    if (this.act < 3) {
      this.plata = Math.max(0, this.plata - 300);
      this.refreshPlata();
      this.bubble(this.C.drain[this.drainIdx++ % this.C.drain.length]);
      if (!this.balls.some((x) => x.live)) this.time.delayedCall(900, () => this.launch());
      return;
    }
    // Acto III: dejarla caer sin tocar nada
    if (this.act3Done) return;
    if (!this.touchedThisBall) this.temptations++;
    if (this.temptations >= 3) {
      this.act3Done = true;
      await this.say(this.C.letGo);
      await this.repaint();
      return;
    }
    toast(this, this.C.tempt[this.temptations % this.C.tempt.length], '#d6262e', 130);
    for (const f of this.flippers) this.tweens.add({ targets: f, auto: 0, duration: 10 });
    this.time.delayedCall(1200, () => this.launch());
  }

  /** «La Consentida» se repinta: ahora dice «Laura». */
  private async repaint(): Promise<void> {
    Audio.level(0);
    this.tweens.add({ targets: this.sign, alpha: 0, scaleX: 0.2, duration: 700 });
    await new Promise((r) => this.time.delayedCall(800, r));
    this.sign.setText(this.C.laura).setScale(0.2, 1).setColor('#2f5dd6');
    Audio.sfx('chalk', 0.6);
    this.tweens.add({
      targets: this.sign,
      alpha: 1,
      scaleX: 1,
      duration: 900,
      ease: 'Back.easeOut',
    });
    for (const l of this.letters) this.tweens.add({ targets: l, alpha: 0, duration: 600 });
    await new Promise((r) => this.time.delayedCall(1200, r));
    await this.complete();
  }

  private bubble(t: string): void {
    const b = this.add
      .text(
        480,
        96,
        t,
        txt(19, '#22160e', FONT.body, { backgroundColor: '#fff2c2', padding: { x: 10, y: 4 } }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 70, () => Audio.voice('chepe'));
    this.tweens.add({
      targets: b,
      alpha: 0,
      delay: 1500,
      duration: 400,
      onComplete: () => b.destroy(),
    });
  }

  // ---------------- Dibujo ----------------

  private draw(): void {
    const g = this.g;
    g.clear();
    // paredes pintadas
    g.lineStyle(9, 0x22160e, 1);
    for (const s of this.segs) g.lineBetween(s.ax, s.ay, s.bx, s.by);
    g.lineStyle(5, 0xd6262e, 1);
    for (const s of this.segs) if (s.tag === 'wall') g.lineBetween(s.ax, s.ay, s.bx, s.by);
    g.lineStyle(5, 0x1f9a4a, 1);
    for (const s of this.segs) if (s.tag === 'sling') g.lineBetween(s.ax, s.ay, s.bx, s.by);
    // tiquetes
    for (const t of this.tickets) {
      if (t.taken) continue;
      g.fillStyle(0xfff6e0, this.hasTicket(t.i) ? 0.5 : 1);
      g.fillRect(t.x - 13, t.y - 8, 26, 16);
      g.lineStyle(2, 0x22160e, 1);
      g.strokeRect(t.x - 13, t.y - 8, 26, 16);
      g.fillStyle(0xd6262e, 1);
      g.fillRect(t.x - 13, t.y - 8, 26, 4);
    }
    // premio mayor
    if (this.jackpot.on) {
      const pulse = 0.5 + Math.sin(this.time.now / 150) * 0.5;
      g.fillStyle(0x22160e, 1);
      g.fillCircle(this.jackpot.x, this.jackpot.y, 15);
      g.lineStyle(3, 0xf2c230, pulse);
      g.strokeCircle(this.jackpot.x, this.jackpot.y, 20);
    }
    // medallones
    const ring = [0xd6262e, 0xf2c230, 0x2f5dd6];
    for (const m of this.bumpers) {
      m.flash = Math.max(0, m.flash - 0.016);
      const sc = 1 + m.flash;
      g.fillStyle(0x22160e, 1);
      g.fillCircle(m.x, m.y, (m.r + 4) * sc);
      ring.forEach((c, k) => {
        g.fillStyle(c, 1);
        g.fillCircle(m.x, m.y, (m.r - k * 5) * sc);
      });
      g.fillStyle(m.lit ? 0xffe14a : 0xffffff, 1);
      g.fillCircle(m.x, m.y, 11 * sc);
      if (this.faces && this.act === 2) {
        g.fillStyle(0x22160e, 1);
        g.fillCircle(m.x - 3, m.y - 2, 1.5);
        g.fillCircle(m.x + 3, m.y - 2, 1.5);
      }
    }
    // paletas
    for (const f of this.flippers) {
      const tx = f.px + Math.cos(f.a) * f.len;
      const ty = f.py + Math.sin(f.a) * f.len;
      g.lineStyle(16, 0x22160e, 1);
      g.lineBetween(f.px, f.py, tx, ty);
      g.lineStyle(11, this.act === 3 ? 0xffb0a0 : 0xd6262e, 1);
      g.lineBetween(f.px, f.py, tx, ty);
      g.lineStyle(3, 0xffffff, 0.9);
      g.lineBetween(f.px, f.py, tx, ty);
      g.fillStyle(0xf2c230, 1);
      g.fillCircle(f.px, f.py, 7);
    }
    // bolas
    for (const b of this.balls) {
      g.fillStyle(0x22160e, 1);
      g.fillCircle(b.x, b.y, R + 2);
      g.fillStyle(0xd8dce4, 1);
      g.fillCircle(b.x, b.y, R);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(b.x - 3, b.y - 3, 3);
    }
  }

  // ---------------- Modo de prueba ----------------

  private autoPlay(): void {
    if (this.act === 3) return;
    for (const f of this.flippers) f.pressed = false;
    for (const b of this.balls) {
      if (b.y > 430 && b.y < 500 && b.vy > 0) {
        if (b.x < 480) this.flippers[0].pressed = true;
        else this.flippers[1].pressed = true;
      }
    }
    // para no tardar una eternidad en pruebas: un medallón al azar se enciende
    if (Math.random() < 0.004) {
      const off = this.bumpers.find((m) => !m.lit);
      if (off) this.hitBumper(off, this.bumpers.indexOf(off));
    }
  }
}
