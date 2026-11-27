import { DEPTH, FONT, H, W, txt, type DreamId } from '../../../config';
import { addTexture, css, makeCanvas, rng } from '../../../gfx/canvas';
import {
  CELESTE_PAL,
  PEOPLE,
  celeste,
  drawStroke,
  person,
  type Palette,
  type Prim,
} from '../../../gfx/figure';
import { T } from '../../../i18n';
import { Audio } from '../../../systems/audio/Audio';
import { CLAVE_STEPS, type TrackId } from '../../../systems/audio/tracks';
import { debug } from '../../../systems/debug';
import { THEMES } from '../../../systems/dialogue';
import { Juice } from '../../../systems/juice';
import { hint, toast } from '../../../systems/ui';
import { DreamScene } from '../../DreamScene';

const STREET = 492;
const COLORS = [0xff3fa4, 0x3ff0ff, 0xffb23f, 0xb46bff, 0x6bff9a];

interface Sign {
  x: number;
  y: number;
  label: string;
  color: number;
  burnt: boolean;
  clave: boolean;
  text: Phaser.GameObjects.Text;
  ring: Phaser.GameObjects.Arc;
  refl: Phaser.GameObjects.Text;
  moon?: boolean;
}

interface Pickup {
  x: number;
  y: number;
  ticket: number;
  obj: Phaser.GameObjects.GameObject & { x: number; y: number; setVisible(v: boolean): unknown };
  taken: boolean;
}

/** Diseño de cada acto: letreros (x, y) y recogibles. */
const ACTS: {
  len: number;
  signs: [number, number][];
  tickets: [number, number, number][];
  checkpoints: number[];
}[] = [
  {
    len: 3500,
    signs: [
      [300, 200],
      [560, 170],
      [820, 210],
      [1080, 160],
      [1330, 200],
      [1600, 180],
      [1870, 220],
      [2130, 170],
      [2400, 210],
      [2660, 180],
      [2930, 200],
      [3200, 170],
    ],
    tickets: [
      [700, 110, 0],
      [2540, 400, 1],
    ],
    checkpoints: [0, 1330, 2400],
  },
  {
    len: 3600,
    signs: [
      [300, 200],
      [560, 180],
      [820, 200],
      [1080, 170],
      [1340, 210],
      [1600, 180],
      [1880, 190],
      [2140, 170],
      [2400, 200],
      [2660, 175],
      [2920, 195],
      [3200, 180],
    ],
    tickets: [
      [1210, 390, 2],
      [2790, 100, 3],
    ],
    checkpoints: [0, 1600],
  },
  {
    len: 2300,
    signs: [
      [300, 200],
      [570, 180],
      [840, 200],
      [1110, 180],
      [1380, 200],
    ],
    tickets: [[980, 120, 4]],
    checkpoints: [0],
  },
];

/** Sueño 4 — Salsa en la Sexta (neón · columpiarse sin tocar el piso). */
export class DreamJairo extends DreamScene {
  readonly dream: DreamId = 'jairo';
  readonly theme = THEMES.neon;
  readonly card = { bg: 0x0b0716, ink: '#ffe9f6', accent: '#ff3fa4', font: FONT.neon };
  readonly music: TrackId = 'jairo';

  private p = { x: 120, y: 380, vx: 0, vy: 0 };
  private hook: Sign | null = null;
  private ropeLen = 0;
  private holding = false;
  private grounded = true;
  private signs: Sign[] = [];
  private picks: Pickup[] = [];
  private world!: Phaser.GameObjects.Container;
  private cel!: Phaser.GameObjects.Image;
  private rope!: Phaser.GameObjects.Graphics;
  private silenceG!: Phaser.GameObjects.Graphics;
  private silenceX = -9999;
  private actLen = 3500;
  private checkpoint = 0;
  private stageX = 0;
  private fellIdx = 0;
  private landed = false;
  private notes = 0;
  private notesLabel!: Phaser.GameObjects.Text;
  private follow!: Phaser.GameObjects.Zone;
  private auto = false;
  private knocks = 0;
  private knocking = false;
  private secretDone = false;
  private claveOn = false;
  private sky!: Phaser.GameObjects.TileSprite;
  private far!: Phaser.GameObjects.TileSprite;
  private lastHit = 0;

  constructor() {
    super('DreamJairo');
  }

  private get J() {
    return T.dreams.jairo;
  }

  protected build(): void {
    this.auto = debug.flag('auto');
    this.secretDone = false;
    this.notes = 0;
    this.makeTextures();
    this.sky = this.add
      .tileSprite(0, 0, W, H, 'jai-sky')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(0);
    this.far = this.add
      .tileSprite(0, 140, W, 360, 'jai-far')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1);
    this.world = this.add.container(0, 0).setDepth(5);
    this.rope = this.add.graphics().setDepth(9);
    this.cel = this.add.image(0, 0, 'jai-cel').setOrigin(0.5, 0.85).setDepth(10);
    this.silenceG = this.add.graphics().setDepth(11);
    this.follow = this.add.zone(0, H / 2, 2, 2);
    this.cameras.main.startFollow(this.follow, true, 0.12, 0.08, -160, 0);
    this.notesLabel = this.add
      .text(24, 58, '', txt(18, '#3ff0ff', FONT.display, { fontStyle: '800' }))
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.input.on('pointerdown', () => (this.holding = true));
    this.input.on('pointerup', () => (this.holding = false));
    this.input.keyboard?.on('keydown-SPACE', () => (this.holding = true));
    this.input.keyboard?.on('keyup-SPACE', () => (this.holding = false));
  }

  private makeTextures(): void {
    if (this.textures.exists('jai-sky')) return;
    const [c, ctx] = makeCanvas(512, 540);
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, '#0b0716');
    g.addColorStop(0.7, '#2a0f3a');
    g.addColorStop(1, '#4a1040');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 540);
    const r = rng(2);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.6})`;
      ctx.fillRect(r() * 512, r() * 260, 1.5, 1.5);
    }
    addTexture(this, 'jai-sky', c);
    // ciudad lejana: siluetas con ventanas
    const [c2, ctx2] = makeCanvas(640, 360);
    let x = 0;
    while (x < 640) {
      const w = 40 + r() * 70;
      const h = 120 + r() * 200;
      ctx2.fillStyle = '#140a24';
      ctx2.fillRect(x, 360 - h, w, h);
      for (let wy = 360 - h + 10; wy < 350; wy += 16) {
        for (let wx = x + 6; wx < x + w - 8; wx += 12) {
          if (r() < 0.3) {
            ctx2.fillStyle = r() < 0.5 ? 'rgba(255,190,90,0.5)' : 'rgba(120,220,255,0.35)';
            ctx2.fillRect(wx, wy, 5, 7);
          }
        }
      }
      x += w + 6;
    }
    addTexture(this, 'jai-far', c2);
    // Celeste en neón: contorno brillante, bufanda naranja
    const neonFig = (key: string, prims: Prim[], pal: Palette, glow: number) => {
      const [c3, ctx3] = makeCanvas(90, 150);
      ctx3.shadowColor = css(glow);
      ctx3.shadowBlur = 10;
      const o = { scale: 1.25, pal, ox: 45, oy: 142 };
      drawStroke(ctx3, prims, o, 2.6, (role) =>
        css(role === 'scarf' ? 0xf2862b : (pal[role] ?? glow)),
      );
      ctx3.shadowBlur = 0;
      drawStroke(ctx3, prims, o, 1, () => 'rgba(255,255,255,0.8)');
      addTexture(this, key, c3);
    };
    const celPal: Palette = {
      ...CELESTE_PAL,
      coat: 0x3ff0ff,
      coatDark: 0x2ab0ff,
      pants: 0x2ab0ff,
      cap: 0x3ff0ff,
      capBand: 0x3ff0ff,
      hair: 0xff3fa4,
      skin: 0xffd0b0,
      metal: 0xffd36b,
      shoe: 0x3ff0ff,
      eye: 0xffffff,
    };
    neonFig('jai-cel', celeste(0, true, { arms: -2.2 }), celPal, 0x3ff0ff);
    neonFig('jai-cel-stand', celeste(0, true), celPal, 0x3ff0ff);
    neonFig(
      'jai-jairo',
      person('jairo'),
      {
        ...PEOPLE.jairo.pal,
        coat: 0xffe9f6,
        coatDark: 0xffb0e0,
        a: 0xff3fa4,
        pants: 0xffb0e0,
        hair: 0xffd36b,
        skin: 0xffd0b0,
      },
      0xff3fa4,
    );
    neonFig(
      'jai-dani',
      person('daniela'),
      {
        ...PEOPLE.daniela.pal,
        coat: 0xffffff,
        a: 0xffffff,
        hair: 0xffb23f,
        skin: 0xffd0b0,
        pants: 0xffffff,
      },
      0xffffff,
    );
  }

  // ---------------- Actos ----------------

  protected startAct(n: number): void {
    void this.loadAct(n);
  }

  private async loadAct(n: number): Promise<void> {
    if (n === 2) await this.say(this.J.act2Lines);
    if (n === 3) await this.say(this.J.act3Lines);
    this.buildLevel(n - 1);
    this.respawn();
    if (n === 1) hint(this, this.J.hintSwing, 6000, '#ffe9f6');
  }

  private buildLevel(i: number): void {
    this.world.removeAll(true);
    this.signs = [];
    this.picks = [];
    const a = ACTS[i];
    this.actLen = a.len;
    this.silenceX = -9999;
    this.landed = false;
    this.cameras.main.setBounds(-200, 0, a.len + 400 + (i === 2 ? 900 : 0), H);
    // calle mojada
    const street = this.add.rectangle(-400, STREET, a.len + 2400, 120, 0x120818).setOrigin(0);
    const curb = this.add.rectangle(-400, STREET, a.len + 2400, 4, 0xff3fa4, 0.6).setOrigin(0);
    this.world.add([street, curb]);
    // tarima de salida
    const stage = this.add.rectangle(40, 400, 160, 14, 0xffb23f).setOrigin(0);
    const stageTxt = this.add.text(
      60,
      412,
      'TARIMA',
      txt(14, '#ffb23f', FONT.display, { fontStyle: '800' }),
    );
    this.world.add([stage, stageTxt]);
    this.stageX = 40;
    a.signs.forEach(([x, y], k) => {
      const label = this.J.signs[(k + i * 5) % this.J.signs.length];
      const color = COLORS[(k + i) % COLORS.length];
      this.addSign(x, y, label, color, i === 1 && k >= 6);
    });
    if (i === 0) this.addSign(1460, 46, this.J.moon, 0xfff3b0, false, true);
    // notas en arcos entre letreros
    for (let k = 0; k < a.signs.length - 1; k++) {
      const [x1, y1] = a.signs[k];
      const [x2] = a.signs[k + 1];
      const nx = (x1 + x2) / 2;
      const ny = y1 + 150;
      const note = this.add
        .text(nx, ny, '♪', txt(30, '#ffd36b', FONT.body, { fontStyle: '700' }))
        .setOrigin(0.5);
      note.setShadow(0, 0, '#ffb23f', 10, true, true);
      this.world.add(note);
      this.picks.push({ x: nx, y: ny, ticket: -1, obj: note, taken: false });
      this.tweens.add({ targets: note, y: ny - 8, duration: 600 + k * 30, yoyo: true, repeat: -1 });
    }
    for (const [x, y, t] of a.tickets) {
      const tk = this.add.rectangle(x, y, 30, 18, 0x0b0716).setStrokeStyle(3, 0xffd36b);
      this.world.add(tk);
      this.picks.push({ x, y, ticket: t, obj: tk, taken: false });
      if (this.hasTicket(t)) tk.setAlpha(0.45);
    }
    // final del Acto III: calle tranquila, farol y puerta
    if (i === 2) {
      const end = a.signs[a.signs.length - 1][0] + 300;
      for (let x = end; x < end + 900; x += 220) {
        const post = this.add.rectangle(x, STREET - 150, 6, 150, 0x8a7a6a).setOrigin(0.5, 0);
        const lamp = this.add.circle(x, STREET - 154, 12, 0xffd890);
        const halo = this.add.circle(x, STREET - 154, 60, 0xffd890, 0.07);
        this.world.add([post, halo, lamp]);
      }
      const house = this.add
        .rectangle(end + 560, STREET - 170, 220, 170, 0x3a2a3a)
        .setOrigin(0.5, 0);
      const door = this.add
        .rectangle(end + 560, STREET - 100, 60, 100, 0x7a4a2a)
        .setOrigin(0.5, 0)
        .setStrokeStyle(2, 0xffd890);
      door.setName('door');
      this.world.add([house, door]);
    }
    this.checkpoint = 0;
  }

  private addSign(
    x: number,
    y: number,
    label: string,
    color: number,
    clave: boolean,
    moon = false,
  ): void {
    const hex = `#${color.toString(16).padStart(6, '0')}`;
    const text = this.add
      .text(x, y - 34, label, txt(moon ? 20 : 26, hex, FONT.neon))
      .setOrigin(0.5);
    text.setShadow(0, 0, hex, 14, true, true);
    const ring = this.add.circle(x, y, 9).setStrokeStyle(3, color);
    const refl = this.add
      .text(x, 2 * STREET - (y - 34) + 18, label, txt(moon ? 20 : 26, hex, FONT.neon))
      .setOrigin(0.5)
      .setFlipY(true)
      .setAlpha(0.16);
    const cable = this.add.rectangle(x, y - 60, 2, 30, 0x5a4a6a).setOrigin(0.5, 1);
    this.world.add([cable, text, ring, refl]);
    this.signs.push({ x, y, label, color, burnt: false, clave, text, ring, refl, moon });
  }

  private respawn(): void {
    const a = ACTS[this.act - 1];
    const cx = a.checkpoints[this.checkpoint] ?? 0;
    if (cx === 0) {
      this.p = { x: this.stageX + 90, y: 400, vx: 0, vy: 0 };
      this.grounded = true;
    } else {
      // reaparece colgada del letrero del punto de control
      const s = this.signs.find((q) => q.x >= cx && !q.moon) ?? this.signs[0];
      this.p = { x: s.x - 40, y: s.y + 150, vx: 200, vy: 0 };
      this.grounded = false;
      this.attach(s);
    }
    for (const s of this.signs) {
      s.burnt = false;
      s.text.setAlpha(1);
      s.ring.setAlpha(1);
    }
    if (this.act === 2 && this.checkpoint >= 1) this.silenceX = this.p.x - 700;
    this.holding = false;
    this.hook = this.hook && !this.grounded ? this.hook : null;
  }

  // ---------------- Física del columpio ----------------

  private bestSign(): Sign | null {
    let best: Sign | null = null;
    let score = Infinity;
    for (const s of this.signs) {
      if (s.burnt) continue;
      if (s.clave && !this.claveOn) continue;
      const dx = s.x - this.p.x;
      const dy = this.p.y - s.y;
      const d = Math.hypot(dx, dy);
      if (dy < 30 || d > 380 || dx < -60) continue;
      const sc = Math.abs(dx - 120) + Math.abs(dy - 160) * 0.6;
      if (sc < score) {
        score = sc;
        best = s;
      }
    }
    return best;
  }

  private attach(s: Sign): void {
    this.hook = s;
    this.ropeLen = Phaser.Math.Clamp(Math.hypot(s.x - this.p.x, s.y - this.p.y), 110, 290);
    this.grounded = false;
    Audio.sfx('zap');
    Juice.vibrate(10);
    this.tweens.add({ targets: s.ring, scale: 1.8, duration: 120, yoyo: true });
    if (s.moon && !this.secretDone) {
      this.secretDone = true;
      void this.foundSecret();
    }
  }

  private detach(): void {
    const s = this.hook;
    this.hook = null;
    this.p.vx *= 1.08;
    this.p.vy *= 1.08;
    Audio.sfx('whoosh', 1.3);
    // Acto II: cada letrero aguanta una sola vez (como la voz)
    if (s && (this.act >= 2 || this.madrugada) && !s.moon) {
      s.burnt = true;
      Audio.sfx('buzz');
      this.tweens.add({
        targets: [s.text, s.ring],
        alpha: 0.12,
        duration: 250,
        ease: 'Bounce.easeOut',
      });
      s.refl.setAlpha(0.03);
    }
  }

  update(_t: number, dtMs: number): void {
    if (this.paused) return;
    const dt = Math.min(1 / 30, dtMs / 1000);
    this.updateClave();
    if (this.auto) this.autoPlay();
    if (this.canPlay() && !this.landed && this.act > 0) this.step(dt);
    this.render();
  }

  private updateClave(): void {
    const c = Audio.clock();
    let on: boolean;
    if (c) {
      const pos = (Audio.now() - c.start) / c.stepDur;
      const step = ((pos % 32) + 32) % 32;
      on = CLAVE_STEPS.some((k) => step >= k - 0.4 && step < k + 4.4);
    } else {
      on = Math.floor(this.time.now / 600) % 2 === 0;
    }
    this.claveOn = on;
    for (const s of this.signs) {
      if (!s.clave || s.burnt) continue;
      s.text.setAlpha(on ? 1 : 0.18);
      s.ring.setAlpha(on ? 1 : 0.2);
    }
  }

  private step(dt: number): void {
    const p = this.p;
    if (this.holding && !this.hook) {
      const s = this.bestSign();
      if (s) this.attach(s);
    } else if (!this.holding && this.hook) {
      this.detach();
    }
    if (this.grounded) {
      // en la tarima, quieta hasta engancharse
      p.vx = 0;
      p.vy = 0;
    } else {
      p.vy += 1300 * dt;
      if (this.hook) {
        const s = this.hook;
        // impulso hacia adelante mientras cuelga (un solo dedo no puede «columpiar»)
        const ax = p.x - s.x;
        const ay = p.y - s.y;
        const d = Math.hypot(ax, ay) || 1;
        const tx = -ay / d;
        const ty = ax / d;
        const dir = tx > 0 ? 1 : -1;
        p.vx += tx * dir * 280 * dt;
        p.vy += ty * dir * 280 * dt;
      }
      p.vx *= 0.999;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (this.hook) {
        const s = this.hook;
        const ax = p.x - s.x;
        const ay = p.y - s.y;
        const d = Math.hypot(ax, ay) || 1;
        if (d > this.ropeLen) {
          const nx = ax / d;
          const ny = ay / d;
          p.x = s.x + nx * this.ropeLen;
          p.y = s.y + ny * this.ropeLen;
          const vn = p.vx * nx + p.vy * ny;
          if (vn > 0) {
            p.vx -= vn * nx;
            p.vy -= vn * ny;
          }
        }
      }
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 1100) {
        p.vx = (p.vx / sp) * 1100;
        p.vy = (p.vy / sp) * 1100;
      }
    }
    // recoger notas y tiquetes
    for (const k of this.picks) {
      if (k.taken || Math.hypot(k.x - p.x, k.y - (p.y - 50)) > 40) continue;
      k.taken = true;
      k.obj.setVisible(false);
      if (k.ticket >= 0) this.foundTicket(k.ticket, k.x - this.cameras.main.scrollX, k.y);
      else {
        this.notes++;
        this.notesLabel.setText(`♪ ${this.notes}`);
        const scale = ['A4', 'C5', 'D5', 'E5', 'G5', 'A5'];
        Audio.note('brass', scale[this.notes % scale.length], 0.35, 0.18);
      }
    }
    // puntos de control
    const a = ACTS[this.act - 1];
    while (
      this.checkpoint + 1 < a.checkpoints.length &&
      p.x > a.checkpoints[this.checkpoint + 1] + 100
    ) {
      this.checkpoint++;
      if (this.act === 2 && this.checkpoint === 1)
        void this.say(this.J.silenceLines).then(() => (this.silenceX = this.p.x - 760));
    }
    // el silencio avanza (Acto II, segunda mitad)
    if (this.silenceX > -9000) {
      this.silenceX += (this.madrugada ? 210 : 150) * dt;
      if (p.x < this.silenceX + 40) {
        toast(this, this.J.silence, '#ff3fa4', 120);
        this.fall();
        return;
      }
    }
    // tocar la calle
    if (p.y > STREET - 4) {
      if (this.act === 3) {
        void this.land();
        return;
      }
      this.fall();
      return;
    }
    // fin del nivel (Actos I y II)
    if (this.act < 3 && p.x > this.actLen - 60) {
      this.landed = true;
      this.hook = null;
      Audio.sfx('success');
      this.time.delayedCall(600, () => this.startActWithBanner(this.act + 1));
    }
    // Acto III: los últimos letreros se apagan solos al acercarse
    if (this.act === 3) {
      for (const s of this.signs) {
        if (!s.burnt && s.x - p.x < 150 && s.x > 1000 && this.hook !== s) {
          s.burnt = true;
          Audio.sfx('buzz');
          this.tweens.add({ targets: [s.text, s.ring], alpha: 0.08, duration: 400 });
        }
      }
    }
  }

  private fall(): void {
    Audio.sfx('fail');
    Juice.shake(this, 0.008, 200);
    Juice.flash(this, 0xff3fa4, 120);
    this.hook = null;
    this.say1(this.J.fell[this.fellIdx++ % this.J.fell.length]);
    this.respawn();
  }

  private say1(t: string): void {
    const b = this.add
      .text(
        W / 2,
        110,
        t,
        txt(20, '#ffe9f6', FONT.body, { backgroundColor: '#2a0f3a', padding: { x: 10, y: 5 } }),
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 80, () => Audio.voice('jairo'));
    this.tweens.add({
      targets: b,
      alpha: 0,
      delay: 1500,
      duration: 400,
      onComplete: () => b.destroy(),
    });
  }

  // ---------------- Acto III: la calle ----------------

  private async land(): Promise<void> {
    this.landed = true;
    this.hook = null;
    this.p.y = STREET;
    this.p.vx = 0;
    this.p.vy = 0;
    Audio.sfx('thud');
    Juice.vibrate(30);
    Audio.level(0);
    Audio.muffle(1200, 1.5);
    this.cel.setTexture('jai-cel-stand');
    // los neones se apagan; queda la calle
    for (const s of this.signs)
      this.tweens.add({ targets: [s.text, s.ring, s.refl], alpha: 0.05, duration: 1500 });
    this.tweens.add({ targets: [this.far], alpha: 0.3, duration: 1500 });
    await new Promise((r) => this.time.delayedCall(900, r));
    const jairo = this.add
      .image(this.p.x - 50, STREET, 'jai-jairo')
      .setOrigin(0.5, 0.95)
      .setDepth(10);
    jairo.setAlpha(0);
    this.tweens.add({ targets: jairo, alpha: 1, duration: 600 });
    await this.say(this.J.landLines);
    // caminar hasta la puerta
    const door = this.world.getByName('door') as Phaser.GameObjects.Rectangle | null;
    const dx = door ? door.x : this.p.x + 400;
    this.tweens.add({ targets: jairo, x: dx - 50, duration: 2000, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.p, x: dx - 110, duration: 2000, ease: 'Sine.easeInOut' });
    await new Promise((r) => this.time.delayedCall(2100, r));
    this.knocking = true;
    this.knocks = 0;
    hint(this, this.J.hintKnock, 6000, '#ffe9f6');
    this.input.on('pointerdown', () => this.knock());
    this.input.keyboard?.on('keydown-SPACE', () => this.knock());
    if (this.auto)
      for (let i = 0; i < 5; i++) this.time.delayedCall(400 + i * 420, () => this.knock());
  }

  private knock(): void {
    if (!this.knocking || this.dlg.open) return;
    this.knocks++;
    Audio.drum('clave', 0.8);
    Juice.shake(this, 0.003, 80);
    const door = this.world.getByName('door') as Phaser.GameObjects.Rectangle | null;
    if (door) this.tweens.add({ targets: door, scaleX: 0.96, duration: 50, yoyo: true });
    if (this.knocks >= 5) {
      this.knocking = false;
      void this.finale(door);
    }
  }

  private async finale(door: Phaser.GameObjects.Rectangle | null): Promise<void> {
    Audio.muffle(null, 1);
    Audio.level(2);
    if (door) {
      door.setFillStyle(0xffd890);
      const dani = this.add
        .image(door.x, STREET, 'jai-dani')
        .setOrigin(0.5, 0.95)
        .setDepth(10)
        .setAlpha(0);
      this.tweens.add({ targets: dani, alpha: 1, duration: 500 });
    }
    await new Promise((r) => this.time.delayedCall(700, r));
    await this.complete();
  }

  // ---------------- Dibujo ----------------

  private render(): void {
    const cam = this.cameras.main;
    this.follow.setPosition(this.p.x, H / 2);
    this.sky.tilePositionX = cam.scrollX * 0.05;
    this.far.tilePositionX = cam.scrollX * 0.3;
    this.cel.setPosition(this.p.x, this.p.y);
    if (this.hook) {
      const ang = Math.atan2(this.hook.x - this.p.x, this.p.y - this.hook.y);
      this.cel.setRotation(ang * 0.6);
    } else {
      this.cel.setRotation(Phaser.Math.Clamp(this.p.vx / 2400, -0.4, 0.4));
    }
    const g = this.rope;
    g.clear();
    if (this.hook) {
      g.lineStyle(5, this.hook.color, 0.3);
      g.lineBetween(this.hook.x, this.hook.y, this.p.x, this.p.y - 70);
      g.lineStyle(2, 0xffffff, 0.95);
      g.lineBetween(this.hook.x, this.hook.y, this.p.x, this.p.y - 70);
    } else if (!this.grounded && !this.landed) {
      // ayuda: marca el letrero que se engancharía
      const s = this.bestSign();
      if (s) {
        g.lineStyle(2, s.color, 0.35 + Math.sin(this.time.now / 90) * 0.15);
        g.strokeCircle(s.x, s.y, 16);
      }
    }
    // parpadeo de neones
    if (this.time.now - this.lastHit > 120) {
      this.lastHit = this.time.now;
      const s = this.signs[Math.floor(Math.random() * this.signs.length)];
      if (s && !s.burnt && !s.clave && Math.random() < 0.3) {
        s.text.setAlpha(0.55);
        this.time.delayedCall(60, () => !s.burnt && s.text.setAlpha(1));
      }
    }
    const sg = this.silenceG;
    sg.clear();
    if (this.silenceX > -9000) {
      sg.fillStyle(0x000000, 0.96);
      sg.fillRect(this.silenceX - 1400, 0, 1400, H);
      for (let y = 0; y < H; y += 20) {
        const w = 20 + Math.sin(y / 30 + this.time.now / 200) * 18;
        sg.fillRect(this.silenceX, y, w, 20);
      }
    }
  }

  // ---------------- Modo de prueba ----------------

  private autoPlay(): void {
    if (!this.canPlay() || this.landed) return;
    const p = this.p;
    if (this.grounded) {
      this.holding = true;
      return;
    }
    if (this.hook) {
      // soltar al pasar adelante del letrero y subiendo un poco
      const ahead = p.x - this.hook.x;
      this.holding = !(ahead > 60 && p.vy < 120);
      if (this.act === 3 && this.hook.x > 1000) this.holding = false;
    } else {
      this.holding = !!this.bestSign() && p.vy > -50;
    }
  }
}
