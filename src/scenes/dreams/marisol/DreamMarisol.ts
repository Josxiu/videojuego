import { DEPTH, FONT, H, W, txt, type DreamId } from '../../../config';
import { MARBLE, PLANS, kick, type Plan } from '../../../data/marisol';
import {
  CELESTE_PAL,
  PEOPLE,
  celeste,
  drawStroke,
  figureTexture,
  person,
} from '../../../gfx/figure';
import { css } from '../../../gfx/canvas';
import { T } from '../../../i18n';
import { Audio } from '../../../systems/audio/Audio';
import type { TrackId } from '../../../systems/audio/tracks';
import { debug } from '../../../systems/debug';
import { THEMES } from '../../../systems/dialogue';
import { Juice } from '../../../systems/juice';
import { distToSeg, polySegs, stepBall, type Ball, type Seg } from '../../../systems/physics2d';
import { Button, hint } from '../../../systems/ui';
import { DreamScene } from '../../DreamScene';
import { BLUE, LINE, blueprintBg, bridgeElevation, childDrawing } from './art';

interface Drawn {
  pts: number[][];
  len: number;
  contact: number;
  draft?: boolean;
  solid: boolean;
}

/** Sueño 3 — Planos para un Puente (cianotipia · trazar el camino de una canica). */
export class DreamMarisol extends DreamScene {
  readonly dream: DreamId = 'marisol';
  readonly theme = THEMES.blueprint;
  readonly card = { bg: BLUE, ink: '#eaf2ff', accent: '#9cc2ff', font: FONT.blueprint };
  readonly music: TrackId = 'marisol';

  private planIdx = 0;
  private plan!: Plan;
  private lines: Drawn[] = [];
  /** Intentos fallidos de toda la noche: el material del Acto III. */
  private ghosts: number[][][] = [];
  private ink = 0;
  private stroke: number[][] | null = null;
  private running = false;
  private ball: Ball = { x: 0, y: 0, vx: 0, vy: 0, r: MARBLE.r };
  private still = 0;
  private river = 480;
  private gStatic!: Phaser.GameObjects.Graphics;
  private gLines!: Phaser.GameObjects.Graphics;
  private gBall!: Phaser.GameObjects.Graphics;
  private inkBar!: Phaser.GameObjects.Rectangle;
  private inkLabel!: Phaser.GameObjects.Text;
  private planLabel!: Phaser.GameObjects.Text;
  private btnGo!: Button;
  private btnUndo!: Button;
  private ticketTaken = false;
  private labels: Phaser.GameObjects.Text[] = [];
  private figs: Phaser.GameObjects.Image[] = [];
  private secretDone = false;
  private failIdx = 0;
  private auto = false;
  private autoAt = 0;
  private spin = 0;
  private breakT = 1.2;
  private crackT = 0.7;

  constructor() {
    super('DreamMarisol');
  }

  private get M() {
    return T.dreams.marisol;
  }

  protected build(): void {
    this.auto = debug.flag('auto');
    this.ghosts = [];
    this.secretDone = false;
    this.add.image(0, 0, blueprintBg(this)).setOrigin(0).setDepth(0);
    this.gStatic = this.add.graphics().setDepth(5);
    this.gLines = this.add.graphics().setDepth(8);
    this.gBall = this.add.graphics().setDepth(12);
    // figuras «para escala», como en los planos
    if (!this.textures.exists('mari-fig-m')) {
      const white = () => css(LINE);
      const mk = (key: string, prims: ReturnType<typeof celeste>, pal: typeof CELESTE_PAL) =>
        figureTexture(
          this,
          key,
          prims,
          0.8,
          (ctx, o) => drawStroke(ctx, prims, { ...o, pal }, 1.6, white),
          pal,
        );
      mk('mari-fig-m', person('marisol'), PEOPLE.marisol.pal);
      mk('mari-fig-c', celeste(0, true), CELESTE_PAL);
    }
    this.add
      .text(W - 30, H - 26, this.M.titleBlock, txt(14, '#eaf2ff', FONT.blueprint))
      .setOrigin(1, 1)
      .setDepth(6)
      .setAlpha(0.8);
    this.planLabel = this.add
      .text(30, H - 26, '', txt(16, '#eaf2ff', FONT.blueprint))
      .setOrigin(0, 1)
      .setDepth(6);
    // tinta
    this.add.text(24, 60, this.M.ink, txt(15, '#eaf2ff', FONT.blueprint)).setDepth(DEPTH.hud);
    this.add
      .rectangle(80, 70, 160, 10, 0x000000, 0.3)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, LINE)
      .setDepth(DEPTH.hud);
    this.inkBar = this.add
      .rectangle(80, 70, 160, 10, LINE)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 1);
    this.inkLabel = this.add
      .text(248, 62, '', txt(14, '#eaf2ff', FONT.blueprint))
      .setDepth(DEPTH.hud);
    const st = {
      fill: 0x0f2f63,
      stroke: LINE,
      text: '#eaf2ff',
      font: FONT.blueprint,
      size: 20,
      w: 130,
      h: 40,
    };
    this.btnGo = new Button(this, W - 150, 30, this.M.release, () => this.release(), st);
    this.btnUndo = new Button(this, W - 290, 30, this.M.undo, () => this.undo(), { ...st, w: 120 });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', () => this.onUp());
    this.input.keyboard?.on('keydown-SPACE', () => this.release());
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.undo());
  }

  // ---------------- Planos ----------------

  protected startAct(n: number): void {
    if (n === 1) this.loadPlan(0);
    else if (n === 2) void this.toAct(2);
    else void this.toAct(3);
  }

  private async toAct(n: number): Promise<void> {
    if (n === 2) {
      await this.say(this.M.act2Lines);
      this.loadPlan(4);
    } else {
      this.loadPlan(6);
      await this.say(this.M.act3Lines);
      hint(this, this.M.ghostHint, 6000, '#eaf2ff');
    }
  }

  private loadPlan(i: number): void {
    this.planIdx = i;
    this.plan = PLANS[i];
    this.running = false;
    this.lines = [];
    this.ticketTaken = false;
    this.ink = this.madrugada ? Math.round(this.plan.ink * 0.62) : this.plan.ink;
    this.river = this.plan.river;
    this.breakT = this.madrugada ? 0.55 : 1.2;
    this.crackT = this.madrugada ? 0.3 : 0.7;
    for (const l of this.labels) l.destroy();
    this.labels = [];
    for (const f of this.figs) f.destroy();
    this.figs = [];
    if (this.plan.drafts) {
      // borradores de Marisol + los intentos fallidos de esta noche
      for (const d of this.plan.drafts)
        this.lines.push({ pts: d, len: this.len(d), contact: 0, draft: true, solid: false });
      for (const g of this.ghosts.slice(-10))
        this.lines.push({ pts: g, len: this.len(g), contact: 0, draft: true, solid: false });
    }
    this.planLabel.setText(this.M.plans[i]);
    this.resetBall();
    this.drawStatic();
    // figuras en la orilla de salida
    const [sx, sy] = this.plan.start;
    const dir = this.plan.goal.x > sx ? -1 : 1;
    this.figs.push(
      this.add
        .image(sx + dir * 18, sy + 12, 'mari-fig-m')
        .setOrigin(0.5, 1)
        .setDepth(7)
        .setFlipX(dir > 0),
    );
    this.figs.push(
      this.add
        .image(sx + dir * -10 + dir * 40, sy + 12, 'mari-fig-c')
        .setOrigin(0.5, 1)
        .setDepth(7)
        .setFlipX(dir > 0),
    );
    this.labels.push(
      this.add
        .text(
          Math.max(80, sx + dir * 20),
          sy + 30,
          this.M.scaleFig,
          txt(11, '#eaf2ff', FONT.blueprint),
        )
        .setOrigin(0.5)
        .setDepth(7)
        .setAlpha(0.7),
    );
    this.figs.forEach((f) => {
      f.setAlpha(0);
      this.tweens.add({ targets: f, alpha: 1, duration: 500 });
    });
    if (i === 0) hint(this, this.M.hintDraw, 6500, '#eaf2ff');
    this.refreshInk();
    this.btnUndo.setVisible(!this.plan.drafts);
    this.btnGo.setText(this.M.release);
  }

  private len(pts: number[][]): number {
    let n = 0;
    for (let k = 1; k < pts.length; k++)
      n += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    return n;
  }

  private resetBall(): void {
    const [x, y] = this.plan.start;
    this.ball = { x, y, vx: 0, vy: 0, r: MARBLE.r };
    this.still = 0;
    this.river = this.plan.river;
    this.running = false;
  }

  private drawStatic(): void {
    const g = this.gStatic;
    g.clear();
    g.lineStyle(4, LINE, 1);
    for (const poly of this.plan.statics) {
      g.beginPath();
      g.moveTo(poly[0][0], poly[0][1]);
      for (const [x, y] of poly.slice(1)) g.lineTo(x, y);
      g.strokePath();
      // achurado bajo las orillas
      g.lineStyle(1, LINE, 0.35);
      for (let k = 1; k < poly.length; k++) {
        const [ax, ay] = poly[k - 1];
        const [bx, by] = poly[k];
        if (Math.abs(by - ay) > Math.abs(bx - ax)) continue;
        for (let x = Math.min(ax, bx); x < Math.max(ax, bx); x += 12) {
          const t = (x - ax) / (bx - ax || 1);
          const y = ay + (by - ay) * t;
          g.lineBetween(x, y + 2, x - 10, y + 14);
        }
      }
      g.lineStyle(4, LINE, 1);
    }
    // meta: banderín y cota
    const m = this.plan.goal;
    g.lineStyle(2, LINE, 1);
    g.lineBetween(m.x + m.w - 20, m.y + m.h, m.x + m.w - 20, m.y - 30);
    g.fillStyle(LINE, 1);
    g.fillTriangle(m.x + m.w - 20, m.y - 30, m.x + m.w - 50, m.y - 22, m.x + m.w - 20, m.y - 14);
    // tiquete
    const tk = this.plan.ticket;
    if (tk) {
      const has = this.hasTicket(tk.i);
      g.lineStyle(2, 0xffd36b, has ? 0.4 : 1);
      g.strokeRect(tk.x - 14, tk.y - 9, 28, 18);
      g.lineBetween(tk.x + 4, tk.y - 9, tk.x + 4, tk.y + 9);
    }
  }

  private drawRiver(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(2, 0x9cc2ff, 0.55);
    for (let k = 0; k < 4; k++) {
      const y = this.river + k * 14;
      g.beginPath();
      for (let x = 20; x <= W - 20; x += 16)
        g.lineTo(x, y + Math.sin(x / 40 + this.time.now / 500 + k) * 3);
      g.strokePath();
    }
  }

  // ---------------- Dibujar ----------------

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.canPlay() || this.running) return;
    if (p.y < 52) return;
    // tocar una línea: borrarla (o pasar un borrador en limpio)
    const hit = this.lines.find((l) => polySegs(l.pts).some((s) => distToSeg(s, p.x, p.y) < 12));
    if (hit) {
      if (hit.draft) {
        hit.solid = !hit.solid;
        Audio.sfx('chalk', hit.solid ? 1.2 : 0.8);
        Juice.vibrate(10);
      } else {
        this.lines.splice(this.lines.indexOf(hit), 1);
        this.ink = Math.min(this.plan.ink, this.ink + hit.len);
        Audio.sfx('whoosh', 1.6);
        this.refreshInk();
      }
      return;
    }
    if (this.ink <= 1) return;
    this.stroke = [[p.x, p.y]];
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.stroke || !p.isDown) return;
    const last = this.stroke[this.stroke.length - 1];
    const d = Math.hypot(p.x - last[0], p.y - last[1]);
    if (d < 12) return;
    const use = Math.min(d, this.ink);
    if (use <= 0) return;
    const k = use / d;
    this.stroke.push([last[0] + (p.x - last[0]) * k, last[1] + (p.y - last[1]) * k]);
    this.ink -= use;
    this.refreshInk();
    if (Math.random() < 0.4) Audio.sfx('chalk', 0.9 + Math.random() * 0.4);
  }

  private onUp(): void {
    const s = this.stroke;
    this.stroke = null;
    if (!s) return;
    if (s.length < 2) return;
    const length = this.len(s);
    // ¿un círculo cerrado? (el secreto)
    const [x0, y0] = s[0];
    const [x1, y1] = s[s.length - 1];
    const xs = s.map((q) => q[0]);
    const ys = s.map((q) => q[1]);
    const bw = Math.max(...xs) - Math.min(...xs);
    const bh = Math.max(...ys) - Math.min(...ys);
    if (
      !this.secretDone &&
      length > 160 &&
      Math.hypot(x1 - x0, y1 - y0) < 34 &&
      bw > 50 &&
      bh > 50 &&
      bw / bh < 1.8 &&
      bh / bw < 1.8
    ) {
      this.ink = Math.min(this.plan.ink, this.ink + length);
      this.refreshInk();
      void this.secret();
      return;
    }
    this.lines.push({ pts: s, len: length, contact: 0, solid: true });
    Audio.sfx('tap', 1.4);
  }

  private undo(): void {
    if (this.running || !this.canPlay()) return;
    const idx = [...this.lines].reverse().findIndex((l) => !l.draft);
    if (idx < 0) return;
    const l = this.lines.splice(this.lines.length - 1 - idx, 1)[0];
    this.ink = Math.min(this.plan.ink, this.ink + l.len);
    this.refreshInk();
    Audio.sfx('whoosh', 1.6);
  }

  private refreshInk(): void {
    const max = this.madrugada ? Math.round(this.plan.ink * 0.62) : this.plan.ink;
    const f = max > 0 ? this.ink / max : 0;
    this.inkBar.setScale(Math.max(0, f), 1);
    this.inkLabel.setText(`${(this.ink / 100).toFixed(2).replace('.', ',')} m`);
  }

  private async secret(): Promise<void> {
    this.secretDone = true;
    const img = this.add
      .image(W / 2, H / 2 - 20, childDrawing(this))
      .setDepth(DEPTH.overlay - 5)
      .setAngle(-4);
    Juice.pop(this, img);
    await this.foundSecret();
    this.tweens.add({
      targets: img,
      alpha: 0,
      scale: 0.5,
      duration: 500,
      onComplete: () => img.destroy(),
    });
  }

  // ---------------- Canica ----------------

  private release(): void {
    if (this.running || !this.canPlay()) return;
    this.running = true;
    this.ball.vx = kick(this.plan);
    Audio.sfx('pop', 0.8);
    for (const l of this.lines) l.contact = 0;
  }

  private segs(): Seg[] {
    const out: Seg[] = this.plan.statics.flatMap((p) => polySegs(p, 'static'));
    this.lines.forEach((l, i) => {
      if (l.solid) out.push(...polySegs(l.pts, i));
    });
    return out;
  }

  private fail(): void {
    this.running = false;
    Audio.sfx('splash');
    Juice.shake(this, 0.005, 200);
    // el intento queda en la hoja como borrador
    for (const l of this.lines)
      if (!l.draft && l.pts.length > 1) this.ghosts.push(l.pts.map((p) => [...p]));
    this.bubble(this.M.fail[this.failIdx++ % this.M.fail.length]);
    // las líneas rotas se pierden; las demás se quedan
    this.lines = this.lines.filter((l) => l.contact < this.breakT || l.draft);
    this.time.delayedCall(500, () => this.resetBall());
  }

  private async succeed(): Promise<void> {
    this.running = false;
    Audio.sfx('success');
    Juice.burst(this, this.ball.x, this.ball.y, LINE, 16, 140, 3, 20);
    this.bubble(this.M.ok[this.planIdx % this.M.ok.length]);
    await new Promise((r) => this.time.delayedCall(1100, r));
    const next = this.planIdx + 1;
    if (this.planIdx === 6) {
      await this.reveal();
      return;
    }
    if (next === 4) this.startActWithBanner(2);
    else if (next === 6) this.startActWithBanner(3);
    else this.loadPlan(next);
  }

  /** La «grieta» del puente era la junta de dilatación. */
  private async reveal(): Promise<void> {
    const img = this.add
      .image(W / 2, 140, bridgeElevation(this))
      .setDepth(20)
      .setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 800 });
    await new Promise((r) => this.time.delayedCall(900, r));
    const g = this.add.graphics().setDepth(21);
    g.lineStyle(2, 0xffd36b, 1);
    g.strokeCircle(W / 2 - 2, 107, 18);
    g.lineBetween(W / 2 + 12, 120, W / 2 + 90, 220);
    const t = this.add
      .text(W / 2 + 96, 222, this.M.joint, txt(18, '#ffd36b', FONT.blueprint))
      .setDepth(21);
    Juice.pop(this, t);
    Audio.sfx('open');
    Audio.level(2);
    await new Promise((r) => this.time.delayedCall(1200, r));
    await this.complete();
  }

  private bubble(text: string): void {
    const b = this.add
      .text(
        W / 2,
        112,
        text,
        txt(20, '#eaf2ff', FONT.blueprint, {
          backgroundColor: '#0f2f63',
          padding: { x: 10, y: 4 },
        }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 60, () => Audio.voice('marisol'));
    this.tweens.add({
      targets: b,
      alpha: 0,
      delay: 1500,
      duration: 400,
      onComplete: () => b.destroy(),
    });
  }

  // ---------------- Bucle ----------------

  update(_t: number, dtMs: number): void {
    if (this.paused) return;
    const dt = Math.min(1 / 30, dtMs / 1000);
    if (this.auto) this.autoPlay();
    if (this.running && !this.ended) this.physics2d(dt);
    this.render();
  }

  private physics2d(dt: number): void {
    const b = this.ball;
    const hits = stepBall(
      b,
      this.segs(),
      dt,
      { x: 0, y: MARBLE.g },
      { bounce: MARBLE.bounce, friction: MARBLE.friction },
    );
    this.spin += (b.vx * dt) / b.r;
    const touched = new Set<number>();
    for (const h of hits) {
      if (typeof h.tag === 'number') touched.add(h.tag);
      if (h.impact > 220) Audio.drum('rim', Math.min(0.5, h.impact / 1500));
    }
    // fatiga del material (Acto II en adelante)
    if (this.planIdx >= 4 || this.madrugada) {
      for (const i of touched) {
        const l = this.lines[i];
        if (!l || l.draft) continue;
        const before = l.contact;
        l.contact += dt;
        if (before < this.crackT && l.contact >= this.crackT) Audio.sfx('crack');
        if (l.contact >= this.breakT) {
          l.solid = false;
          Juice.shake(this, 0.004, 120);
        }
      }
    }
    // el río crece durante el intento
    if (this.plan.riverTop !== undefined && this.river > this.plan.riverTop) this.river -= dt * 14;
    // tiquete
    const tk = this.plan.ticket;
    if (tk && !this.ticketTaken && Math.hypot(b.x - tk.x, b.y - tk.y) < 24) {
      this.ticketTaken = true;
      this.foundTicket(tk.i, tk.x, tk.y);
    }
    const g = this.plan.goal;
    if (b.x > g.x && b.x < g.x + g.w && b.y > g.y && b.y < g.y + g.h) {
      void this.succeed();
      return;
    }
    if (b.y > this.river - 4 || b.x < -20 || b.x > W + 20) {
      this.fail();
      return;
    }
    const sp = Math.hypot(b.vx, b.vy);
    this.still = sp < 10 ? this.still + dt : 0;
    if (this.still > 1.4) this.fail();
  }

  private render(): void {
    const g = this.gLines;
    g.clear();
    this.drawRiver(g);
    for (const l of this.lines) {
      if (l.draft && !l.solid) {
        // borrador: trazo punteado y pálido
        g.lineStyle(2, LINE, 0.3);
        for (const s of polySegs(l.pts)) {
          const n = Math.max(1, Math.floor(Math.hypot(s.bx - s.ax, s.by - s.ay) / 10));
          for (let k = 0; k < n; k += 2) {
            const t0 = k / n;
            const t1 = Math.min(1, (k + 1) / n);
            g.lineBetween(
              s.ax + (s.bx - s.ax) * t0,
              s.ay + (s.by - s.ay) * t0,
              s.ax + (s.bx - s.ax) * t1,
              s.ay + (s.by - s.ay) * t1,
            );
          }
        }
        continue;
      }
      if (!l.solid) continue;
      const cracked = l.contact >= this.crackT;
      g.lineStyle(cracked ? 2 : 3.2, cracked ? 0xffc8a0 : LINE, 1);
      g.beginPath();
      g.moveTo(l.pts[0][0], l.pts[0][1]);
      for (const [x, y] of l.pts.slice(1)) g.lineTo(x, y);
      g.strokePath();
      // marcas de cota en los extremos
      g.lineStyle(1, LINE, 0.7);
      for (const [x, y] of [l.pts[0], l.pts[l.pts.length - 1]])
        g.lineBetween(x - 5, y + 5, x + 5, y - 5);
      if (cracked) {
        g.lineStyle(2, BLUE, 1);
        const mid = l.pts[Math.floor(l.pts.length / 2)];
        g.lineBetween(mid[0] - 4, mid[1] - 6, mid[0] + 3, mid[1] + 6);
      }
    }
    if (this.stroke && this.stroke.length > 1) {
      g.lineStyle(3, LINE, 0.85);
      g.beginPath();
      g.moveTo(this.stroke[0][0], this.stroke[0][1]);
      for (const [x, y] of this.stroke.slice(1)) g.lineTo(x, y);
      g.strokePath();
    }
    // canica
    const b = this.ball;
    const gb = this.gBall;
    gb.clear();
    gb.fillStyle(LINE, 1);
    gb.fillCircle(b.x, b.y, b.r);
    gb.lineStyle(2, BLUE, 1);
    gb.lineBetween(
      b.x,
      b.y,
      b.x + Math.cos(this.spin) * b.r * 0.8,
      b.y + Math.sin(this.spin) * b.r * 0.8,
    );
    gb.lineStyle(1, LINE, 0.5);
    gb.strokeCircle(b.x, b.y, b.r + 4);
  }

  // ---------------- Modo de prueba ----------------

  private autoPlay(): void {
    if (!this.canPlay() || this.running || this.time.now < this.autoAt) return;
    this.autoAt = this.time.now + 700;
    if (this.plan.drafts) {
      this.lines.forEach((l, i) => (l.solid = i < 4));
      this.release();
      return;
    }
    if (!this.lines.some((l) => !l.draft)) {
      for (const sol of this.plan.solution)
        this.lines.push({ pts: sol, len: this.len(sol), contact: 0, solid: true });
      this.ink = Math.max(0, this.ink - this.plan.solution.reduce((n, s) => n + this.len(s), 0));
      this.refreshInk();
      return;
    }
    this.release();
  }
}
