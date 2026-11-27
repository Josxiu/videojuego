import { DEPTH, FONT, H, W, txt, type DreamId } from '../../../config';
import { drawDots, figureTexture, celeste, person, PEOPLE, CELESTE_PAL } from '../../../gfx/figure';
import { fmt, T } from '../../../i18n';
import { Audio } from '../../../systems/audio/Audio';
import type { TrackId } from '../../../systems/audio/tracks';
import { debug } from '../../../systems/debug';
import { THEMES } from '../../../systems/dialogue';
import { Juice } from '../../../systems/juice';
import { hint } from '../../../systems/ui';
import { DreamScene } from '../../DreamScene';
import {
  KITCHEN_ITEMS,
  PATIO_ITEMS,
  itemTextures,
  paintKitchen,
  paintPatio,
  paintSea,
  paintTicket,
  pointillize,
  type ItemDef,
} from './art';

type ItemId = keyof typeof T.dreams.reme.items;

interface Item {
  def: ItemDef;
  s: Phaser.GameObjects.Image;
  b: Phaser.GameObjects.Image;
  taken: boolean;
}

interface Tk {
  i: number;
  img: Phaser.GameObjects.Image;
  taken: boolean;
}

interface SoundTarget {
  id: ItemId;
  x: number;
  y: number;
  kind: 'tick' | 'clink' | 'wave';
  every: number;
}

const TICKETS: { i: number; x: number; y: number; act: 1 | 2 }[] = [
  { i: 0, x: 548, y: 312, act: 1 },
  { i: 1, x: 300, y: 512, act: 1 },
  { i: 2, x: 742, y: 486, act: 1 },
  { i: 3, x: 214, y: 266, act: 2 },
  { i: 4, x: 820, y: 508, act: 2 },
];

/** Sueño 1 — La Finca de los Puntos (puntillismo · lupa). */
export class DreamReme extends DreamScene {
  readonly dream: DreamId = 'reme';
  readonly theme = THEMES.dots;
  readonly card = { bg: 0xf1e6cf, ink: '#2e2418', accent: '#a4502e', font: FONT.serif };
  readonly music: TrackId = 'reme';

  private blurLayer!: Phaser.GameObjects.Container;
  private sharpLayer!: Phaser.GameObjects.Container;
  private maskG!: Phaser.GameObjects.Graphics;
  private ring!: Phaser.GameObjects.Graphics;
  private bgBlur!: Phaser.GameObjects.Image;
  private bgSharp!: Phaser.GameObjects.Image;
  private items = new Map<string, Item>();
  private tks: Tk[] = [];
  private lens = { x: W / 2, y: H / 2, r: 95 };
  private lensTarget = { x: W / 2, y: H / 2 };
  private lensBase = 95;
  private cracked = false;
  private ask: ItemId | null = null;
  private queue: ItemId[] = [];
  private askBox!: Phaser.GameObjects.Container;
  private askText!: Phaser.GameObjects.Text;
  private askSince = 0;
  private hintRing?: Phaser.GameObjects.Arc;
  private mode: 'find' | 'escort' | 'listen' | 'idle' = 'idle';
  private down?: { x: number; y: number; t: number };
  private touch = false;
  private keys!: Record<'left' | 'right' | 'up' | 'down' | 'space', Phaser.Input.Keyboard.Key>;
  private wind = 0;
  private windTimer?: Phaser.Time.TimerEvent;
  private ananias?: Phaser.GameObjects.Container;
  private ananiasAlpha = 1;
  private lostTimer = 0;
  private hen?: Item;
  private henTarget = { x: 300, y: 450 };
  private dark?: Phaser.GameObjects.Rectangle;
  private sounds: SoundTarget[] = [];
  private soundIdx = 0;
  private nextCue = 0;
  private proximity!: Phaser.GameObjects.Graphics;
  private costal!: Phaser.GameObjects.Text;
  private got = 0;
  private wrongIdx = 0;
  private bubble?: Phaser.GameObjects.Text;
  private auto = false;
  private autoAt = 0;
  private secretShown = false;
  private figures: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('DreamReme');
  }

  private get R() {
    return T.dreams.reme;
  }

  protected build(): void {
    this.items.clear();
    this.tks = [];
    this.got = 0;
    this.cracked = false;
    this.wind = 0;
    this.secretShown = false;
    this.auto = debug.flag('auto');
    this.lensBase = this.madrugada ? 52 : 95;
    this.lens.r = this.lensBase;
    this.makeTextures();
    this.cameras.main.setBackgroundColor(0xf1e6cf);

    this.blurLayer = this.add.container(0, 0).setDepth(10);
    this.sharpLayer = this.add.container(0, 0).setDepth(20);
    this.bgBlur = this.add.image(0, 0, 'reme-kitchen-b').setOrigin(0);
    this.bgSharp = this.add.image(0, 0, 'reme-kitchen-s').setOrigin(0);
    this.blurLayer.add(this.bgBlur);
    this.sharpLayer.add(this.bgSharp);
    this.maskG = this.make.graphics({}, false);
    this.sharpLayer.setMask(this.maskG.createGeometryMask());

    this.ring = this.add.graphics().setDepth(30);
    this.proximity = this.add.graphics().setDepth(29);

    // Celeste y Reme, en puntos, abajo a la izquierda
    const fig = (
      key: string,
      prims: ReturnType<typeof celeste>,
      pal: typeof CELESTE_PAL,
      seed: number,
    ) =>
      figureTexture(
        this,
        key,
        prims,
        1.5,
        (ctx, o) => drawDots(ctx, prims, { ...o, pal }, 0.9, 1.8, seed),
        pal,
      );
    if (!this.textures.exists('reme-fig-reme')) {
      fig('reme-fig-reme', person('reme'), PEOPLE.reme.pal, 3);
      fig('reme-fig-cel', celeste(0, true), CELESTE_PAL, 4);
    }
    this.figures = [
      this.add.image(70, 536, 'reme-fig-reme').setOrigin(0.5, 1).setDepth(25),
      this.add.image(142, 536, 'reme-fig-cel').setOrigin(0.5, 1).setDepth(25),
    ];

    // pregunta de Reme
    this.askBox = this.add
      .container(W / 2, 70)
      .setDepth(DEPTH.hud)
      .setVisible(false);
    const ab = this.add.rectangle(0, 0, 520, 46, 0xf3ead6, 0.95).setStrokeStyle(2, 0x7a5a3a);
    this.askText = this.add
      .text(0, 0, '', txt(22, '#2e2418', FONT.serif, { fontStyle: '600' }))
      .setOrigin(0.5);
    this.askBox.add([ab, this.askText]);
    this.costal = this.add
      .text(W - 20, H - 18, '', txt(20, '#5a3a22', FONT.serif, { fontStyle: '600' }))
      .setOrigin(1, 1)
      .setDepth(DEPTH.hud);

    this.keys = this.input.keyboard!.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      up: 'UP',
      down: 'DOWN',
      space: 'SPACE',
    }) as typeof this.keys;
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.touch = p.wasTouch;
      this.down = { x: p.x, y: p.y, t: this.time.now };
      this.onMove(p, true);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const d = this.down;
      this.down = undefined;
      if (!d) return;
      if (Math.hypot(p.x - d.x, p.y - d.y) < 16 && this.time.now - d.t < 400) {
        if (!p.wasTouch) {
          // con ratón la lupa está bajo el cursor: se recoge ahí mismo
          this.lens.x = this.lensTarget.x = p.x;
          this.lens.y = this.lensTarget.y = p.y;
        }
        this.pick(this.lens.x, this.lens.y);
      }
    });
  }

  private makeTextures(): void {
    if (this.textures.exists('reme-kitchen-s')) return;
    pointillize(this, 'reme-kitchen-s', W, H, paintKitchen, false, 1);
    pointillize(this, 'reme-kitchen-b', W, H, paintKitchen, true, 2);
    pointillize(this, 'reme-patio-s', W, H, paintPatio, false, 3);
    pointillize(this, 'reme-patio-b', W, H, paintPatio, true, 4);
    pointillize(this, 'reme-sea-s', W, H, paintSea, false, 5);
    itemTextures(this, 'reme-k', KITCHEN_ITEMS);
    itemTextures(this, 'reme-p', PATIO_ITEMS);
    pointillize(this, 'reme-ticket', 32, 24, paintTicket, false, 9, false);
    // Ananías hecho de puntos (nítido y deshecho)
    const prims = person('ananias');
    figureTexture(this, 'reme-ananias', prims, 1.5, (ctx, o) =>
      drawDots(ctx, prims, { ...o, pal: PEOPLE.ananias.pal }, 1.1, 1.6, 12),
    );
  }

  // ---------------- Lupa ----------------

  private onMove(p: Phaser.Input.Pointer, force = false): void {
    if (p.wasTouch) {
      if (!p.isDown && !force) return;
      this.lensTarget = { x: p.x, y: p.y - 80 };
    } else {
      this.lensTarget = { x: p.x, y: p.y };
    }
  }

  private drawLens(): void {
    const { x, y, r } = this.lens;
    this.maskG.clear();
    this.maskG.fillStyle(0xffffff);
    if (!this.cracked) this.maskG.fillCircle(x, y, r);
    const g = this.ring;
    g.clear();
    if (this.mode === 'idle' && !this.playing) return;
    g.lineStyle(7, 0x6a4a1a, 1);
    g.strokeCircle(x, y, r + 3);
    g.lineStyle(3, 0xd9b45a, 1);
    g.strokeCircle(x, y, r + 1);
    g.lineStyle(10, 0x5a3a22, 1);
    g.lineBetween(x + (r + 4) * 0.7, y + (r + 4) * 0.7, x + (r + 50) * 0.7, y + (r + 50) * 0.7);
    if (this.cracked) {
      g.lineStyle(2, 0xf4ead5, 0.7);
      g.lineBetween(x - r * 0.6, y - r * 0.2, x + r * 0.1, y + r * 0.1);
      g.lineBetween(x + r * 0.1, y + r * 0.1, x + r * 0.5, y - r * 0.5);
      g.lineBetween(x + r * 0.1, y + r * 0.1, x + r * 0.2, y + r * 0.7);
    }
  }

  // ---------------- Actos ----------------

  protected startAct(n: number): void {
    if (n === 1) this.act1();
    else if (n === 2) void this.act2();
    else void this.act3();
  }

  private act1(): void {
    this.setScene('kitchen');
    this.queue = ['olla', 'radio', 'santo', 'foto', 'llaves'];
    this.mode = 'find';
    if (this.madrugada) this.startWind(0.6);
    else hint(this, this.R.hintLens, 5000, '#2e2418');
    this.nextAsk();
  }

  private setScene(which: 'kitchen' | 'patio'): void {
    for (const it of this.items.values()) {
      it.s.destroy();
      it.b.destroy();
    }
    this.items.clear();
    for (const t of this.tks) t.img.destroy();
    this.tks = [];
    this.bgBlur.setTexture(`reme-${which}-b`);
    this.bgSharp.setTexture(`reme-${which}-s`);
    const defs = which === 'kitchen' ? KITCHEN_ITEMS : PATIO_ITEMS;
    const prefix = which === 'kitchen' ? 'reme-k' : 'reme-p';
    for (const def of defs) {
      const b = this.add.image(def.x, def.y, `${prefix}-${def.id}-b`);
      const s = this.add.image(def.x, def.y, `${prefix}-${def.id}-s`);
      this.blurLayer.add(b);
      this.sharpLayer.add(s);
      this.items.set(def.id, { def, s, b, taken: false });
    }
    const act = which === 'kitchen' ? 1 : 2;
    for (const t of TICKETS.filter((x) => x.act === act)) {
      const img = this.add.image(t.x, t.y, 'reme-ticket').setAlpha(this.hasTicket(t.i) ? 0.55 : 1);
      this.sharpLayer.add(img);
      this.tks.push({ i: t.i, img, taken: false });
    }
    if (which === 'patio') {
      this.hen = this.items.get('gallina');
      this.henTarget = { x: 300, y: 450 };
    }
  }

  private setAsk(id: ItemId | null): void {
    this.ask = id;
    this.askSince = this.time.now;
    this.hintRing?.destroy();
    this.hintRing = undefined;
    if (!id) {
      this.askBox.setVisible(false);
      return;
    }
    const name = this.R.items[id].name;
    this.askText.setText(fmt(this.R.ask, { item: name }));
    this.askBox.setVisible(true).setScale(0.9);
    this.tweens.add({ targets: this.askBox, scale: 1, duration: 200, ease: 'Back.easeOut' });
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 70, () => Audio.voice('reme'));
  }

  private nextAsk(): void {
    const id = this.queue.shift();
    if (!id) {
      this.setAsk(null);
      this.startActWithBanner(2);
      return;
    }
    this.setAsk(id);
  }

  private async act2(): Promise<void> {
    this.mode = 'idle';
    this.startWind(1);
    // los puntos se vuelan y aparece el patio
    Audio.sfx('whoosh', 0.7);
    Juice.shake(this, 0.004, 400);
    this.tweens.add({
      targets: [this.blurLayer],
      alpha: 0,
      duration: 500,
      yoyo: true,
      onYoyo: () => this.setScene('patio'),
    });
    await this.wait(1100);
    await this.say(this.R.act2);
    this.mode = 'find';
    this.queue = ['gallina', 'ruana'];
    this.nextAsk2();
  }

  private nextAsk2(): void {
    const id = this.queue.shift();
    if (!id) return;
    this.setAsk(id);
  }

  private async act3(): Promise<void> {
    this.mode = 'idle';
    this.windTimer?.remove();
    this.wind = 0;
    this.setScene('kitchen');
    for (const it of this.items.values()) it.b.setVisible(false);
    // la lupa se raja
    Audio.sfx('crack');
    Juice.shake(this, 0.01, 260);
    Juice.vibrate([30, 40, 60]);
    this.cracked = true;
    this.dark = this.add.rectangle(0, 0, W, H, 0x0c0906, 0.0).setOrigin(0).setDepth(26);
    this.tweens.add({ targets: this.dark, fillAlpha: 0.88, duration: 1400 });
    this.tweens.add({ targets: this.figures, alpha: 0.25, duration: 1400 });
    Audio.muffle(500, 1);
    await this.wait(1500);
    await this.say(this.R.act3);
    this.sounds = [
      { id: 'reloj', x: 180, y: 150, kind: 'tick', every: 520 },
      { id: 'taza', x: 884, y: 256, kind: 'clink', every: 1150 },
      { id: 'mar', x: 410, y: 170, kind: 'wave', every: 2700 },
    ];
    if (this.madrugada)
      this.sounds[1] = { id: 'gallina', x: 620, y: 470, kind: 'clink', every: 1300 };
    this.soundIdx = 0;
    this.mode = 'listen';
    this.lens.r = this.lensBase;
    hint(this, this.R.listen, 5000, '#f4ead5');
    this.setAsk(null);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, res));
  }

  // ---------------- Viento (Acto II) ----------------

  private startWind(strength: number): void {
    this.wind = strength;
    this.windTimer?.remove();
    this.windTimer = this.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        if (this.paused) return;
        const y = Math.random() * H;
        const col = Phaser.Display.Color.GetColor(
          120 + Math.random() * 120,
          100 + Math.random() * 120,
          60 + Math.random() * 100,
        );
        const d = this.add.circle(-10, y, 3 + Math.random() * 4, col, 0.8).setDepth(28);
        this.tweens.add({
          targets: d,
          x: W + 20,
          y: y + (Math.random() - 0.5) * 120,
          duration: 1400 + Math.random() * 900,
          onComplete: () => d.destroy(),
        });
      },
    });
  }

  // ---------------- Recoger ----------------

  private pick(x: number, y: number): void {
    if (!this.canPlay()) return;
    if (this.mode === 'listen') {
      this.tryHear();
      return;
    }
    // tiquetes: solo se ven bajo la lupa
    if (!this.cracked) {
      for (const t of this.tks) {
        if (t.taken) continue;
        if (Math.hypot(t.img.x - x, t.img.y - y) < 26) {
          t.taken = true;
          this.tweens.add({ targets: t.img, y: t.img.y - 40, alpha: 0, scale: 1.8, duration: 400 });
          this.foundTicket(t.i, t.img.x, t.img.y);
          return;
        }
      }
    }
    if (this.mode !== 'find') return;
    const it = [...this.items.values()].find((i) => {
      if (i.taken) return false;
      const d = i.def;
      const ix = i.s.x;
      const iy = i.s.y;
      return Math.abs(x - ix) < d.w / 2 + 8 && Math.abs(y - iy) < d.h / 2 + 8;
    });
    if (!it) return;
    const id = it.def.id;
    if (id === this.ask) {
      void this.found(it);
    } else if (id === 'azucar' && !this.secretShown && this.act === 1) {
      void this.secret();
    } else {
      Audio.sfx('tap', 0.6);
      this.say1(this.R.wrong[this.wrongIdx++ % this.R.wrong.length]);
    }
  }

  /** Comentario corto de Reme que no detiene el juego. */
  private say1(text: string): void {
    this.bubble?.destroy();
    const b = this.add
      .text(
        W / 2,
        118,
        text,
        txt(19, '#5a3a22', FONT.serif, {
          fontStyle: '600',
          backgroundColor: '#f3ead6',
          padding: { x: 10, y: 4 },
        }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.bubble = b;
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 70, () => Audio.voice('reme'));
    this.tweens.add({
      targets: b,
      alpha: 0,
      delay: 1700,
      duration: 400,
      onComplete: () => b.destroy(),
    });
  }

  private async found(it: Item): Promise<void> {
    it.taken = true;
    this.got++;
    Audio.sfx('pickup');
    Juice.vibrate(15);
    Juice.burst(this, it.s.x, it.s.y, 0xa4502e, 12, 120, 3, 40);
    this.costal.setText(`${this.R.costal} ${this.got}`);
    const id = it.def.id as ItemId;
    this.tweens.add({
      targets: [it.s, it.b],
      x: W - 40,
      y: H - 40,
      scale: 0.2,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeIn',
    });
    this.setAsk(null);
    if (id === 'ruana') {
      await this.startEscort();
      return;
    }
    const line = this.R.items[id].line;
    if (line) await this.say([['reme', line]]);
    if (this.act === 1) this.nextAsk();
    else this.nextAsk2();
  }

  private async secret(): Promise<void> {
    this.secretShown = true;
    await this.foundSecret();
    // por un momento, la cocina entera nítida
    this.sharpLayer.clearMask();
    this.ring.setVisible(false);
    Audio.sfx('open');
    await this.wait(3000);
    this.sharpLayer.setMask(this.maskG.createGeometryMask());
    this.ring.setVisible(true);
  }

  // ---------------- Ananías ----------------

  private async startEscort(): Promise<void> {
    const c = this.add.container(690, 470);
    const sharp = this.add.image(0, 0, 'reme-ananias').setOrigin(0.5, 1);
    c.add(sharp);
    this.sharpLayer.add(c);
    // en la capa borrosa, apenas una mancha
    this.ananias = c;
    this.ananiasAlpha = 1;
    this.lens.r = this.lensBase;
    this.lensTarget = { x: 690, y: 420 };
    await this.say(this.R.ananias);
    this.mode = 'escort';
    this.lostTimer = 0;
  }

  private updateEscort(dt: number): void {
    const a = this.ananias;
    if (!a) return;
    const inLens = Math.hypot(a.x - this.lens.x, a.y - 70 - this.lens.y) < this.lens.r + 30;
    if (inLens) {
      a.x += (this.madrugada ? 30 : 24) * dt;
      a.y = 470 + Math.sin(a.x / 20) * 2;
      this.ananiasAlpha = Math.min(1, this.ananiasAlpha + dt * 1.5);
      this.lostTimer = 0;
    } else {
      this.lostTimer += dt;
      this.ananiasAlpha = Math.max(0, this.ananiasAlpha - dt * 0.45);
      if (this.ananiasAlpha <= 0) {
        a.x = Math.max(690, a.x - 90);
        this.ananiasAlpha = 0.6;
        Audio.sfx('whoosh', 0.5);
        this.say1(this.R.ananiasLost);
      }
    }
    a.setAlpha(this.ananiasAlpha);
    if (a.x >= 905) {
      this.mode = 'idle';
      void (async () => {
        await this.say(this.R.ananiasGo);
        this.tweens.add({ targets: a, alpha: 0, x: a.x + 40, duration: 1200 });
        await this.wait(800);
        this.startActWithBanner(3);
      })();
    }
  }

  // ---------------- Escuchar (Acto III) ----------------

  private updateListen(): void {
    const tgt = this.sounds[this.soundIdx];
    if (!tgt) return;
    const d = Math.hypot(tgt.x - this.lens.x, tgt.y - this.lens.y);
    const near = Phaser.Math.Clamp(1 - d / 650, 0, 1);
    if (this.time.now > this.nextCue) {
      this.nextCue = this.time.now + tgt.every;
      Audio.cue(tgt.kind, 0.08 + near * near * 1.1, (tgt.x - this.lens.x) / 380);
      if (near > 0.8) Juice.vibrate(Math.round(10 + near * 20));
    }
    // indicador visible para quien no oye: anillos alrededor de la lupa
    const g = this.proximity;
    g.clear();
    const pulse = (this.time.now % 900) / 900;
    g.lineStyle(3, 0xf2c27a, near * (1 - pulse));
    g.strokeCircle(this.lens.x, this.lens.y, this.lens.r + 8 + pulse * 40 * near);
  }

  private async tryHear(): Promise<void> {
    const tgt = this.sounds[this.soundIdx];
    if (!tgt || this.mode !== 'listen') return;
    const d = Math.hypot(tgt.x - this.lens.x, tgt.y - this.lens.y);
    if (d > 80) {
      Audio.sfx('tap', 0.5);
      return;
    }
    this.mode = 'idle';
    this.proximity.clear();
    Audio.sfx('pickup');
    Juice.burst(this, tgt.x, tgt.y, 0xf2c27a, 18, 140, 3, 40);
    if (tgt.id === 'mar') {
      await this.seaReveal();
      return;
    }
    const line = this.R.items[tgt.id].line;
    if (line) await this.say([['reme', line]]);
    this.soundIdx++;
    if (this.sounds[this.soundIdx]?.id === 'mar') await this.say([['reme', this.R.seaAsk]]);
    this.mode = 'listen';
  }

  private async seaReveal(): Promise<void> {
    Audio.muffle(null, 2);
    Audio.level(2);
    const sea = this.add.image(0, 0, 'reme-sea-s').setOrigin(0).setDepth(27);
    const m = this.make.graphics({}, false);
    sea.setMask(m.createGeometryMask());
    const st = { r: 0 };
    this.tweens.add({
      targets: st,
      r: 1200,
      duration: 3200,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        m.clear();
        m.fillStyle(0xffffff);
        m.fillCircle(410, 170, st.r);
      },
    });
    this.ring.setVisible(false);
    for (let i = 0; i < 4; i++)
      this.time.delayedCall(i * 700, () => Audio.cue('wave', 0.8, Math.sin(i)));
    await this.wait(3400);
    this.dark?.destroy();
    await this.complete();
  }

  // ---------------- Bucle ----------------

  update(_t: number, dtMs: number): void {
    const dt = Math.min(0.05, dtMs / 1000);
    if (this.paused) return;
    // teclado mueve la lupa
    const k = this.keys;
    const kx = (k.right.isDown ? 1 : 0) - (k.left.isDown ? 1 : 0);
    const ky = (k.down.isDown ? 1 : 0) - (k.up.isDown ? 1 : 0);
    if (kx || ky) {
      this.lensTarget.x = Phaser.Math.Clamp(this.lensTarget.x + kx * 320 * dt, 0, W);
      this.lensTarget.y = Phaser.Math.Clamp(this.lensTarget.y + ky * 320 * dt, 0, H);
    }
    if (Phaser.Input.Keyboard.JustDown(k.space)) this.pick(this.lens.x, this.lens.y);
    if (this.auto) this.autoPlay();
    const follow = this.auto ? 0.6 : this.touch ? 0.5 : 0.35;
    this.lens.x += (this.lensTarget.x - this.lens.x) * follow;
    this.lens.y += (this.lensTarget.y - this.lens.y) * follow;
    // la lupa se encoge en el Acto II (la vista empeora)
    if (this.act === 2 && this.playing)
      this.lens.r = Math.max(this.lensBase * 0.72, this.lens.r - dt * 1.2);
    // el viento sacude la vista borrosa
    if (this.wind > 0) {
      this.blurLayer.x = Math.sin(this.time.now / 260) * 6 * this.wind;
      this.blurLayer.y = Math.cos(this.time.now / 380) * 3 * this.wind;
    }
    // la gallina camina
    if (this.hen && !this.hen.taken) {
      const h = this.hen;
      const dx = this.henTarget.x - h.s.x;
      const dy = this.henTarget.y - h.s.y;
      if (Math.hypot(dx, dy) < 4) {
        this.henTarget = { x: 60 + Math.random() * 760, y: 400 + Math.random() * 110 };
        if (Math.random() < 0.3) Audio.cue('hen', 0.25, (h.s.x - W / 2) / 480);
      } else {
        const sp = (this.madrugada ? 90 : 60) * dt;
        const len = Math.hypot(dx, dy);
        h.s.x += (dx / len) * sp;
        h.s.y += (dy / len) * sp;
        h.s.setFlipX(dx < 0);
      }
      h.b.setPosition(h.s.x, h.s.y).setFlipX(h.s.flipX);
    }
    if (this.mode === 'escort' && this.canPlay()) this.updateEscort(dt);
    if (this.mode === 'listen' && this.canPlay()) this.updateListen();
    // pista suave si tarda mucho (no en Madrugada)
    if (
      this.ask &&
      this.mode === 'find' &&
      !this.madrugada &&
      !this.hintRing &&
      this.time.now - this.askSince > 14000
    ) {
      const it = this.items.get(this.ask);
      if (it) {
        this.hintRing = this.add
          .circle(it.s.x, it.s.y, 40)
          .setStrokeStyle(3, 0xd9a040)
          .setDepth(15);
        this.blurLayer.add(this.hintRing);
        this.tweens.add({
          targets: this.hintRing,
          scale: 1.6,
          alpha: 0.2,
          duration: 900,
          yoyo: true,
          repeat: -1,
        });
      }
    }
    this.drawLens();
  }

  /** Modo de prueba: el sueño se juega solo. */
  private autoPlay(): void {
    if (!this.canPlay() || this.time.now < this.autoAt) return;
    let tx: number | undefined;
    let ty: number | undefined;
    const tk = this.mode === 'find' ? this.tks.find((t) => !t.taken) : undefined;
    if (tk) {
      tx = tk.img.x;
      ty = tk.img.y;
    } else if (this.mode === 'find' && this.ask) {
      const it = this.items.get(this.ask);
      if (it) {
        tx = it.s.x;
        ty = it.s.y;
      }
    } else if (this.mode === 'escort' && this.ananias) {
      this.lensTarget = { x: this.ananias.x + 20, y: this.ananias.y - 70 };
      return;
    } else if (this.mode === 'listen') {
      const s = this.sounds[this.soundIdx];
      if (s) {
        tx = s.x;
        ty = s.y;
      }
    }
    if (tx === undefined || ty === undefined) return;
    this.lensTarget = { x: tx, y: ty };
    if (Math.hypot(this.lens.x - tx, this.lens.y - ty) < 6) {
      this.autoAt = this.time.now + 300;
      this.pick(tx, ty);
    }
  }

  protected onPause(p: boolean): void {
    if (this.windTimer) this.windTimer.paused = p;
  }
}
