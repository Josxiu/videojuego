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
import { T, fmt } from '../../../i18n';
import { Audio } from '../../../systems/audio/Audio';
import type { TrackId } from '../../../systems/audio/tracks';
import { debug } from '../../../systems/debug';
import { THEMES } from '../../../systems/dialogue';
import { Juice } from '../../../systems/juice';
import { hint, toast } from '../../../systems/ui';
import { DreamScene } from '../../DreamScene';

const SILVER = 0xd8dce6;
const BOAT_Y = 400;
type CharmId = 'anillo' | 'bocachico' | 'topitos' | 'iglesia' | 'flor' | 'mariposa';
const CHARMS: CharmId[] = ['anillo', 'bocachico', 'topitos', 'iglesia', 'flor', 'mariposa'];

interface Thing {
  kind: 'whirl' | 'tarulla' | 'charm' | 'ticket' | 'false' | 'true' | 'secret';
  x: number;
  y: number;
  r: number;
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Container;
  id?: string;
  ticket?: number;
  done: boolean;
  junction?: number;
}

/** Sueño 6 — El Río de Plata (filigrana · guiar el champán). */
export class DreamEfrain extends DreamScene {
  readonly dream: DreamId = 'efrain';
  readonly theme = THEMES.filigree;
  readonly card = { bg: 0x0c0c14, ink: '#eef0f4', accent: '#cfd3dc', font: FONT.filigree };
  readonly music: TrackId = 'efrain';

  /** Distancia recorrida (mundo). El mundo baja por la pantalla. */
  private dist = 0;
  private speed = 150;
  private boat = { x: W / 2, vx: 0, vy: 0, y: BOAT_Y, spin: 0 };
  private targetX = W / 2;
  private things: Thing[] = [];
  private gBanks!: Phaser.GameObjects.Graphics;
  private gWater!: Phaser.GameObjects.Graphics;
  private boatImg!: Phaser.GameObjects.Container;
  private necklace: CharmId[] = [];
  private neckG!: Phaser.GameObjects.Graphics;
  private neckIcons: Phaser.GameObjects.Image[] = [];
  private yearText!: Phaser.GameObjects.Text;
  private distText!: Phaser.GameObjects.Text;
  private actLen = 4200;
  private keys!: Record<'left' | 'right' | 'space', Phaser.Input.Keyboard.Key>;
  private rowing = 0;
  private rights = 0;
  private secretDone = false;
  private auto = false;
  private finished = false;
  private islands: { y0: number; y1: number }[] = [];
  private flow = 1;

  constructor() {
    super('DreamEfrain');
  }

  private get E() {
    return T.dreams.efrain;
  }

  protected build(): void {
    this.auto = debug.flag('auto');
    this.secretDone = false;
    this.necklace = [];
    this.neckIcons = [];
    this.makeTextures();
    this.add.image(0, 0, 'efr-velvet').setOrigin(0).setDepth(0);
    this.gWater = this.add.graphics().setDepth(2);
    this.gBanks = this.add.graphics().setDepth(4);
    this.boatImg = this.add.container(W / 2, BOAT_Y).setDepth(10);
    this.boatImg.add([
      this.add.image(0, 0, 'efr-boat'),
      this.add.image(-14, -6, 'efr-efrain').setScale(0.55),
      this.add.image(16, -6, 'efr-cel').setScale(0.55),
    ]);
    this.neckG = this.add.graphics().setDepth(DEPTH.hud);
    this.yearText = this.add
      .text(W - 30, 70, '', txt(24, '#cfd3dc', FONT.filigree))
      .setOrigin(1, 0)
      .setDepth(DEPTH.hud);
    this.distText = this.add
      .text(W / 2, 70, '', txt(20, '#cfd3dc', FONT.filigree))
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud);
    this.keys = this.input.keyboard!.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      space: 'SPACE',
    }) as typeof this.keys;
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown || !p.wasTouch) this.targetX = p.x;
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.targetX = p.x;
      if (this.act === 3 && this.canPlay()) this.row();
    });
    this.drawNecklace();
  }

  private makeTextures(): void {
    if (this.textures.exists('efr-velvet')) return;
    // terciopelo negro azulado
    const [c, ctx] = makeCanvas(W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 600);
    g.addColorStop(0, '#191a26');
    g.addColorStop(1, '#07070c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const r = rng(4);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.035})`;
      ctx.fillRect(r() * W, r() * H, 2, 2);
    }
    addTexture(this, 'efr-velvet', c);
    // espiral de filigrana
    const spiral = (key: string, size: number, turns: number, lw = 1.6) => {
      const [c2, ctx2] = makeCanvas(size, size);
      ctx2.strokeStyle = css(SILVER);
      ctx2.lineWidth = lw;
      ctx2.shadowColor = 'rgba(255,255,255,0.6)';
      ctx2.shadowBlur = 3;
      ctx2.beginPath();
      for (let t = 0; t < turns * Math.PI * 2; t += 0.12) {
        const rad = (t / (turns * Math.PI * 2)) * (size / 2 - 2);
        ctx2.lineTo(size / 2 + Math.cos(t) * rad, size / 2 + Math.sin(t) * rad);
      }
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx2.stroke();
      addTexture(this, key, c2);
    };
    spiral('efr-spiral', 34, 3);
    spiral('efr-whirl', 84, 5, 2.2);
    // tarulla: racimo de flores de filigrana
    const [c3, ctx3] = makeCanvas(70, 50);
    ctx3.strokeStyle = css(0xb8bcc8);
    ctx3.lineWidth = 1.5;
    for (let k = 0; k < 7; k++) {
      const x = 10 + r() * 50;
      const y = 10 + r() * 30;
      for (let p = 0; p < 5; p++) {
        ctx3.beginPath();
        ctx3.ellipse(
          x + Math.cos((p / 5) * Math.PI * 2) * 5,
          y + Math.sin((p / 5) * Math.PI * 2) * 5,
          4,
          2.5,
          (p / 5) * Math.PI * 2,
          0,
          Math.PI * 2,
        );
        ctx3.stroke();
      }
    }
    addTexture(this, 'efr-tarulla', c3);
    // champán con techo de palma
    const [c4, ctx4] = makeCanvas(90, 50);
    ctx4.strokeStyle = css(SILVER);
    ctx4.lineWidth = 2;
    ctx4.beginPath();
    ctx4.moveTo(4, 26);
    ctx4.quadraticCurveTo(45, 54, 86, 26);
    ctx4.lineTo(4, 26);
    ctx4.stroke();
    for (let x = 14; x < 80; x += 8) {
      ctx4.beginPath();
      ctx4.arc(x, 34, 3, 0, Math.PI * 2);
      ctx4.stroke();
    }
    addTexture(this, 'efr-boat', c4);
    // dijes
    const charm = (key: string, draw: (x: CanvasRenderingContext2D) => void) => {
      const [c5, x5] = makeCanvas(44, 44);
      x5.strokeStyle = css(SILVER);
      x5.lineWidth = 1.6;
      x5.shadowColor = 'rgba(255,255,255,0.8)';
      x5.shadowBlur = 4;
      draw(x5);
      addTexture(this, key, c5);
    };
    const loop = (x: CanvasRenderingContext2D, cx: number, cy: number, rr: number) => {
      x.beginPath();
      for (let t = 0; t < Math.PI * 5; t += 0.2)
        x.lineTo(cx + Math.cos(t) * rr * (t / 16), cy + Math.sin(t) * rr * (t / 16));
      x.stroke();
    };
    charm('efr-anillo', (x) => {
      x.beginPath();
      x.arc(22, 24, 13, 0, Math.PI * 2);
      x.stroke();
      loop(x, 22, 9, 6);
    });
    charm('efr-bocachico', (x) => {
      x.beginPath();
      x.ellipse(20, 22, 14, 8, 0, 0, Math.PI * 2);
      x.moveTo(34, 22);
      x.lineTo(42, 14);
      x.lineTo(42, 30);
      x.closePath();
      x.stroke();
      loop(x, 18, 22, 5);
    });
    charm('efr-topitos', (x) => {
      loop(x, 13, 22, 9);
      loop(x, 31, 22, 9);
    });
    charm('efr-iglesia', (x) => {
      x.strokeRect(10, 18, 24, 22);
      x.beginPath();
      x.moveTo(10, 18);
      x.lineTo(22, 6);
      x.lineTo(34, 18);
      x.stroke();
      loop(x, 22, 28, 5);
    });
    charm('efr-flor', (x) => {
      for (let p = 0; p < 6; p++) {
        x.beginPath();
        x.ellipse(
          22 + Math.cos((p / 6) * Math.PI * 2) * 9,
          22 + Math.sin((p / 6) * Math.PI * 2) * 9,
          7,
          4,
          (p / 6) * Math.PI * 2,
          0,
          Math.PI * 2,
        );
        x.stroke();
      }
    });
    charm('efr-mariposa', (x) => {
      loop(x, 13, 18, 9);
      loop(x, 31, 18, 9);
      loop(x, 15, 30, 6);
      loop(x, 29, 30, 6);
    });
    charm('efr-ticket', (x) => {
      x.strokeRect(6, 14, 32, 18);
      x.beginPath();
      x.moveTo(26, 14);
      x.lineTo(26, 32);
      x.stroke();
    });
    charm('efr-pez', (x) => {
      x.beginPath();
      x.ellipse(20, 22, 12, 7, 0.1, 0, Math.PI * 2);
      x.moveTo(31, 22);
      x.lineTo(40, 12);
      x.lineTo(37, 31);
      x.closePath();
      x.stroke();
    });
    // figuras de filigrana
    const fig = (key: string, prims: Prim[], pal: Palette) => {
      const [c6, x6] = makeCanvas(70, 120);
      x6.shadowColor = 'rgba(255,255,255,0.6)';
      x6.shadowBlur = 3;
      drawStroke(x6, prims, { scale: 1, pal, ox: 35, oy: 114 }, 1.6, (role) =>
        css(role === 'scarf' ? 0xf2862b : SILVER),
      );
      addTexture(this, key, c6);
    };
    fig('efr-efrain', person('efrain'), PEOPLE.efrain.pal);
    fig('efr-cel', celeste(0, true), CELESTE_PAL);
    fig('efr-carmenza', person('carmenza'), PEOPLE.carmenza.pal);
  }

  // ---------------- El río ----------------

  /** Centro y medio ancho del río a una distancia del mundo. */
  private river(y: number): { c: number; hw: number } {
    return {
      c: W / 2 + Math.sin(y / 700) * 110 + Math.sin(y / 260) * 30,
      hw: 200 + Math.sin(y / 500) * 34,
    };
  }

  /** Pantalla ← mundo: lo que está más adelante aparece más arriba. */
  private sy(wy: number): number {
    return BOAT_Y - (wy - this.dist);
  }

  // ---------------- Actos ----------------

  protected startAct(n: number): void {
    void this.loadAct(n);
  }

  private async loadAct(n: number): Promise<void> {
    for (const t of this.things) t.obj.destroy();
    this.things = [];
    this.islands = [];
    this.dist = 0;
    this.finished = false;
    this.flow = 1;
    this.boat = { x: this.river(0).c, vx: 0, vy: 0, y: BOAT_Y, spin: 0 };
    this.targetX = this.boat.x;
    this.speed = this.madrugada ? 200 : 150;
    if (n === 1) {
      this.actLen = 4300;
      this.spawnAct1();
      hint(this, this.E.hintSteer, 5000, '#eef0f4');
    } else if (n === 2) {
      await this.say(this.E.act2Lines);
      this.actLen = 5200;
      this.rights = 0;
      this.spawnAct2();
    } else {
      await this.say(this.E.seaLines);
      this.actLen = 2600;
      this.flow = -1;
      this.spawnAct3();
      hint(this, this.E.hintRow, 6000, '#eef0f4');
    }
  }

  private add1(kind: Thing['kind'], y: number, xOff: number, extra: Partial<Thing> = {}): Thing {
    const rv = this.river(y);
    const x = rv.c + xOff * rv.hw;
    let obj: Thing['obj'];
    let r = 20;
    if (kind === 'whirl') {
      obj = this.add.image(x, 0, 'efr-whirl').setDepth(3);
      r = 42;
    } else if (kind === 'tarulla') {
      obj = this.add.image(x, 0, 'efr-tarulla').setDepth(5);
      r = 28;
    } else if (kind === 'ticket') {
      obj = this.add.image(x, 0, 'efr-ticket').setDepth(6);
      if (extra.ticket !== undefined && this.hasTicket(extra.ticket)) obj.setAlpha(0.5);
    } else if (kind === 'secret') {
      obj = this.add.image(x, 0, 'efr-pez').setDepth(6).setScale(1.3);
    } else {
      const key = `efr-${extra.id ?? 'anillo'}`;
      const im = this.add.image(0, 0, key);
      const cont = this.add.container(x, 0, [im]).setDepth(6);
      if (kind === 'false') im.setTint(0x6a6e78);
      if (kind === 'true' || kind === 'false') {
        const label = this.add
          .text(
            0,
            30,
            extra.id === 'label' ? '' : '',
            txt(14, '#eef0f4', FONT.serif, { fontStyle: '600' }),
          )
          .setOrigin(0.5);
        cont.add(label);
      }
      obj = cont;
    }
    const t: Thing = { kind, x, y, r, obj, done: false, ...extra };
    this.things.push(t);
    return t;
  }

  private spawnAct1(): void {
    const rr = rng(11);
    let y = 500;
    let ci = 0;
    while (y < this.actLen - 300) {
      const roll = rr();
      if (roll < 0.35) this.add1('whirl', y, (rr() - 0.5) * 1.2);
      else if (roll < 0.7) this.add1('tarulla', y, (rr() - 0.5) * 1.4);
      if (y > 700 && ci < CHARMS.length && y > 600 + ci * 560) {
        this.add1('charm', y + 120, (rr() - 0.5) * 1.1, { id: CHARMS[ci] });
        ci++;
      }
      y += this.madrugada ? 150 : 190;
    }
    this.add1('ticket', 1500, -0.85, { ticket: 0 });
    this.add1('ticket', 3100, 0.85, { ticket: 1 });
    // el caño escondido del taller (pegado a la orilla izquierda)
    this.add1('secret', 2300, -0.93);
  }

  private spawnAct2(): void {
    const rr = rng(23);
    const qs = this.E.junctions;
    const junctions = qs.map((_q, j) => 900 + j * 900);
    junctions.forEach((y, j) => {
      // isla: el río se parte en dos brazos con un recuerdo en cada uno
      this.islands.push({ y0: y, y1: y + 420 });
      const trueLeft = rr() < 0.5;
      const q = qs[j];
      const a = this.add1(trueLeft ? 'true' : 'false', y + 260, -0.55, {
        id: CHARMS[j % CHARMS.length],
        junction: j,
      });
      const b = this.add1(trueLeft ? 'false' : 'true', y + 260, 0.55, {
        id: CHARMS[(j + 2) % CHARMS.length],
        junction: j,
      });
      this.labelThing(a, trueLeft ? q.t : q.f);
      this.labelThing(b, trueLeft ? q.f : q.t);
    });
    // obstáculos entre una isla y otra
    for (let y = 500; y < this.actLen - 300; y += 200) {
      if (junctions.some((j) => y > j - 120 && y < j + 520)) continue;
      if (rr() < 0.4) this.add1('whirl', y, (rr() - 0.5) * 1.2);
      else this.add1('tarulla', y, (rr() - 0.5) * 1.3);
    }
    this.add1('ticket', 1500, 0.8, { ticket: 2 });
    this.add1('ticket', 3400, -0.8, { ticket: 3 });
  }

  private labelThing(t: Thing, text: string): void {
    const c = t.obj as Phaser.GameObjects.Container;
    const label = c.list[1] as Phaser.GameObjects.Text;
    label.setText(text);
    if (t.kind === 'false') label.setColor('#8a8e98');
  }

  private spawnAct3(): void {
    const rr = rng(37);
    for (let y = 400; y < this.actLen - 200; y += this.madrugada ? 140 : 170) {
      if (rr() < 0.45) this.add1('tarulla', y, (rr() - 0.5) * 1.3);
      else if (rr() < 0.4) this.add1('whirl', y, (rr() - 0.5) * 1.1);
    }
    this.add1('ticket', 1300, 0.7, { ticket: 4 });
  }

  // ---------------- Bucle ----------------

  update(_t: number, dtMs: number): void {
    if (this.paused) return;
    const dt = Math.min(1 / 30, dtMs / 1000);
    if (this.canPlay() && !this.finished && this.act > 0) {
      if (this.auto) this.autoPlay();
      this.step(dt);
    }
    this.render();
  }

  private row(): void {
    this.rowing = Math.min(1.6, this.rowing + 0.42);
    Audio.sfx('splash', 1.4);
    Juice.vibrate(6);
  }

  private step(dt: number): void {
    const k = this.keys;
    if (k.left.isDown) this.targetX -= 420 * dt;
    if (k.right.isDown) this.targetX += 420 * dt;
    const rv = this.river(this.dist);
    this.targetX = Phaser.Math.Clamp(this.targetX, rv.c - rv.hw + 30, rv.c + rv.hw - 30);
    const b = this.boat;
    b.vx += (this.targetX - b.x) * 6 * dt;
    b.vx *= 0.9;
    b.x += b.vx * dt * 10;
    // avance
    if (this.act === 3) {
      if (k.space.isDown) this.rowing = Math.min(1.6, this.rowing + dt * 1.6);
      this.rowing = Math.max(0, this.rowing - dt * 0.9);
      const v = this.rowing * 230 - (this.madrugada ? 150 : 110);
      this.dist = Math.max(0, this.dist + v * dt);
      this.distText.setText(
        fmt(this.E.distance, { n: Math.max(0, Math.round((this.actLen - this.dist) / 2)) }),
      );
    } else {
      this.dist += this.speed * dt;
      this.speed = Math.min(this.madrugada ? 240 : 190, this.speed + dt * 3);
    }
    // orillas
    const left = rv.c - rv.hw + 26;
    const right = rv.c + rv.hw - 26;
    if (b.x < left || b.x > right) {
      b.x = Phaser.Math.Clamp(b.x, left, right);
      b.vx *= -0.4;
      if (Math.random() < 0.2) Audio.sfx('chalk', 0.5);
    }
    // islas (Acto II): no se puede atravesar el centro
    for (const is of this.islands) {
      if (this.dist > is.y0 + 60 && this.dist < is.y1 - 60) {
        const c = this.river(this.dist).c;
        if (Math.abs(b.x - c) < 50) {
          b.x = b.x < c ? c - 50 : c + 50;
          b.vx *= -0.3;
        }
      }
    }
    b.spin *= 0.94;
    // objetos
    for (const t of this.things) {
      if (t.done) continue;
      const dy = t.y - this.dist;
      if (Math.abs(dy) > 60) continue;
      const d = Math.hypot(t.x - b.x, dy);
      if (t.kind === 'whirl') {
        if (d < t.r + 30) {
          // el remolino jala hacia su centro y marea
          b.vx += Math.sign(t.x - b.x) * 2.4;
          b.spin += dt * 9;
          if (this.act !== 3) this.speed = Math.max(80, this.speed - 60 * dt);
          else this.dist -= 60 * dt;
          if (Math.random() < 0.03) Audio.sfx('whoosh', 0.6);
        }
      } else if (d < t.r + 18) {
        this.touch(t);
      }
    }
    // fin del acto
    if (this.dist >= this.actLen) {
      this.finished = true;
      void this.endAct();
    }
    // años en la orilla (Acto II hacia atrás, Acto III hacia adelante)
    if (this.act === 2) {
      const year = Math.round(2026 - (this.dist / this.actLen) * 55);
      this.yearText.setText(String(year));
      if (year < 2005 && !this.data.get('years')) {
        this.data.set('years', true);
        void this.say(this.E.yearsLine);
      }
    } else if (this.act === 3)
      this.yearText.setText(String(Math.round(1971 + (this.dist / this.actLen) * 55)));
    else this.yearText.setText('');
  }

  private touch(t: Thing): void {
    if (t.kind === 'tarulla') {
      t.done = true;
      this.boat.vx += Math.sign(this.boat.x - t.x || 1) * 18;
      if (this.act === 3) this.dist -= 50;
      else this.speed = Math.max(70, this.speed - 50);
      Audio.sfx('thud');
      Juice.shake(this, 0.004, 120);
      this.tweens.add({ targets: t.obj, alpha: 0.2, duration: 300 });
      return;
    }
    t.done = true;
    this.tweens.add({ targets: t.obj, scale: 1.8, alpha: 0, duration: 350 });
    const sx = t.x;
    const sy = this.sy(t.y);
    if (t.kind === 'ticket' && t.ticket !== undefined) this.foundTicket(t.ticket, sx, sy);
    else if (t.kind === 'secret' && !this.secretDone) {
      this.secretDone = true;
      void this.foundSecret();
    } else if (t.kind === 'charm' && t.id) {
      this.addCharm(t.id as CharmId);
      void this.say([['efrain', this.E.charms[t.id as CharmId]]]);
    } else if (t.kind === 'true') {
      this.rights++;
      this.addCharm((t.id as CharmId) ?? 'anillo');
      this.bubble(this.E.right);
      this.retireJunction(t.junction);
    } else if (t.kind === 'false') {
      Audio.sfx('fail');
      this.bubble(this.E.wrong);
      this.retireJunction(t.junction);
    }
  }

  private retireJunction(j?: number): void {
    for (const o of this.things)
      if (o.junction === j && !o.done) {
        o.done = true;
        this.tweens.add({ targets: o.obj, alpha: 0.15, duration: 400 });
      }
  }

  private addCharm(id: CharmId): void {
    this.necklace.push(id);
    Audio.sfx('pickup');
    Audio.note('bell', ['E5', 'G5', 'B5', 'D6', 'E6', 'G6'][this.necklace.length % 6], 0.3);
    Juice.vibrate(12);
    this.drawNecklace();
  }

  private drawNecklace(): void {
    const g = this.neckG;
    g.clear();
    g.lineStyle(2, SILVER, 0.6);
    g.beginPath();
    for (let k = 0; k <= 20; k++) {
      const x = 22 + k * 9;
      g.lineTo(x, 66 + Math.sin((k / 20) * Math.PI) * 16);
    }
    g.strokePath();
    for (const i of this.neckIcons) i.destroy();
    this.neckIcons = this.necklace.map((id, k) => {
      const x = 34 + k * 22;
      const y = 70 + Math.sin(((x - 22) / 180) * Math.PI) * 16;
      return this.add
        .image(x, y, `efr-${id}`)
        .setScale(0.5)
        .setDepth(DEPTH.hud + 1);
    });
  }

  private bubble(t: string): void {
    toast(this, t, '#eef0f4', 120);
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 90, () => Audio.voice('efrain'));
  }

  private async endAct(): Promise<void> {
    if (this.act === 1) this.startActWithBanner(2);
    else if (this.act === 2) {
      // el mar de 1971
      Audio.sfx('splash', 0.6);
      this.startActWithBanner(3);
    } else {
      await this.arrive();
    }
  }

  private async arrive(): Promise<void> {
    Audio.level(2);
    this.distText.setVisible(false);
    const alb = this.add
      .rectangle(W / 2, 120, W, 90, 0x1a1b26)
      .setStrokeStyle(2, SILVER)
      .setDepth(8);
    const carm = this.add
      .image(W / 2 + 20, 165, 'efr-carmenza')
      .setOrigin(0.5, 1)
      .setDepth(9)
      .setAlpha(0);
    this.add
      .text(W / 2, 92, 'MOMPOX · ALBARRADA', txt(18, '#cfd3dc', FONT.filigree))
      .setOrigin(0.5)
      .setDepth(9);
    this.tweens.add({ targets: carm, alpha: 1, duration: 800 });
    this.tweens.add({ targets: this.boatImg, y: 240, duration: 1500, ease: 'Sine.easeOut' });
    void alb;
    await new Promise((r) => this.time.delayedCall(1600, r));
    await this.say(this.E.arriveLines);
    await this.complete();
  }

  // ---------------- Dibujo ----------------

  private render(): void {
    const g = this.gBanks;
    const wg = this.gWater;
    g.clear();
    wg.clear();
    // orillas: doble hilo de plata
    g.lineStyle(2, SILVER, 0.9);
    for (const side of [-1, 1]) {
      g.beginPath();
      for (let y = -20; y <= H + 20; y += 12) {
        const wy = this.dist + (BOAT_Y - y);
        const rv = this.river(wy);
        g.lineTo(rv.c + side * rv.hw, y);
      }
      g.strokePath();
      g.lineStyle(1, SILVER, 0.4);
      g.beginPath();
      for (let y = -20; y <= H + 20; y += 12) {
        const wy = this.dist + (BOAT_Y - y);
        const rv = this.river(wy);
        g.lineTo(rv.c + side * (rv.hw + 14), y);
      }
      g.strokePath();
      g.lineStyle(2, SILVER, 0.9);
    }
    // espirales de filigrana en la orilla (pintadas con círculos)
    const step = 70;
    const base = Math.floor(this.dist / step) * step;
    g.lineStyle(1.4, SILVER, 0.7);
    for (let wy = base - 300; wy < base + 700; wy += step) {
      const y = this.sy(wy);
      if (y < -40 || y > H + 40) continue;
      const rv = this.river(wy);
      for (const side of [-1, 1]) {
        const cx = rv.c + side * (rv.hw + 40);
        g.beginPath();
        for (let t = 0; t < Math.PI * 4.5; t += 0.3) {
          const rr = t * 2.2;
          g.lineTo(cx + Math.cos(t + wy) * rr, y + Math.sin(t + wy) * rr);
        }
        g.strokePath();
      }
    }
    // islas
    for (const is of this.islands) {
      const y0 = this.sy(is.y0);
      const y1 = this.sy(is.y1);
      if (y0 < -50 || y1 > H + 50) continue;
      g.lineStyle(2, SILVER, 0.9);
      g.beginPath();
      for (let wy = is.y0; wy <= is.y1; wy += 14) {
        const t = (wy - is.y0) / (is.y1 - is.y0);
        const w = Math.sin(t * Math.PI) * 48;
        g.lineTo(this.river(wy).c - w, this.sy(wy));
      }
      for (let wy = is.y1; wy >= is.y0; wy -= 14) {
        const t = (wy - is.y0) / (is.y1 - is.y0);
        const w = Math.sin(t * Math.PI) * 48;
        g.lineTo(this.river(wy).c + w, this.sy(wy));
      }
      g.closePath();
      g.strokePath();
    }
    // agua: hilos que corren (al revés en el Acto III)
    wg.lineStyle(1, SILVER, 0.25);
    const off = (this.time.now / 1000) * 120 * this.flow;
    for (let k = 0; k < 40; k++) {
      const wy = this.dist + 600 - k * 30 - ((off + k * 13) % 30);
      const y = this.sy(wy);
      const rv = this.river(wy);
      const x = rv.c + (((k * 37) % 100) / 50 - 1) * rv.hw * 0.8;
      wg.lineBetween(x, y, x + 2, y + 14 * this.flow);
    }
    // objetos
    for (const t of this.things) {
      const y = this.sy(t.y);
      t.obj.setPosition(t.x, y);
      t.obj.setVisible(y > -60 && y < H + 60);
      if (t.kind === 'whirl') (t.obj as Phaser.GameObjects.Image).rotation += 0.05;
    }
    const b = this.boat;
    this.boatImg.setPosition(b.x, this.boatImg.y);
    this.boatImg.setRotation(
      Math.sin(b.spin) * 0.6 + b.vx * 0.02 + (this.act === 3 ? Math.PI : 0) * 0,
    );
  }

  // ---------------- Modo de prueba ----------------

  private autoPlay(): void {
    const rv = this.river(this.dist + 120);
    let tx = rv.c;
    // buscar lo bueno y esquivar lo malo
    const ahead = this.things.filter((t) => !t.done && t.y > this.dist && t.y < this.dist + 260);
    const good = ahead.find((t) => t.kind === 'charm' || t.kind === 'true' || t.kind === 'ticket');
    if (good) tx = good.x;
    else {
      const bad = ahead.find((t) => t.kind === 'whirl' || t.kind === 'tarulla');
      if (bad) tx = bad.x < rv.c ? rv.c + rv.hw * 0.5 : rv.c - rv.hw * 0.5;
    }
    this.targetX = tx;
    if (this.act === 3 && Math.random() < 0.25) this.row();
  }
}
