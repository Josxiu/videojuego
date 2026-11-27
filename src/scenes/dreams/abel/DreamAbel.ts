import { DEPTH, FONT, H, W, txt, type DreamId } from '../../../config';
import {
  NEXT,
  PLATFORM,
  SEGMENTS,
  STATIONS,
  TICKETS,
  pointAt,
  type SegId,
  type SwitchId,
} from '../../../data/abel';
import { T, fmt } from '../../../i18n';
import { Audio } from '../../../systems/audio/Audio';
import type { TrackId } from '../../../systems/audio/tracks';
import { debug } from '../../../systems/debug';
import { THEMES } from '../../../systems/dialogue';
import { Juice } from '../../../systems/juice';
import { hint, toast } from '../../../systems/ui';
import { DreamScene } from '../../DreamScene';
import { View2D, View3D, type CarPose, type MaquetaView } from './view';

interface Ghost {
  seg: SegId;
  s: number;
  warn: number;
}

/** Sueño 7 — La Maqueta (3D · cambiar agujas para que el tren nunca pare). */
export class DreamAbel extends DreamScene {
  readonly dream: DreamId = 'abel';
  readonly theme = THEMES.maqueta;
  readonly card = { bg: 0x26331f, ink: '#f6efd8', accent: '#f1e3b5', font: FONT.display };
  readonly music: TrackId = 'abel';

  private view?: MaquetaView;
  private canvas3d?: HTMLCanvasElement;
  private placeFn?: () => void;
  private loading?: Phaser.GameObjects.Text;
  private seg: SegId = 'topL';
  private s = 0;
  private v = 2.2;
  private cruise = 2.2;
  private sw: Record<SwitchId, 0 | 1> = { 1: 0, 2: 0, 3: 0 };
  private removed = new Set<SegId>();
  private nextStation = 0;
  private laps = 0;
  private trail: { x: number; z: number; d: number }[] = [];
  private odo = 0;
  private ghosts: Ghost[] = [];
  private ghostAt = 0;
  private hand = { x: 0, z: 0, phase: 0, seg: null as SegId | null };
  private ticketsLive: { i: number; seg: SegId; at: number; taken: boolean }[] = [];
  private braking = false;
  private stopT = 0;
  private towerTaps = 0;
  private secretDone = false;
  private auto = false;
  private stationText!: Phaser.GameObjects.Text;
  private lapText!: Phaser.GameObjects.Text;
  private drag?: { x: number; moved: boolean; onSwitch: boolean };
  private halted = false;
  private keys!: Record<
    'left' | 'right' | 'space' | 'one' | 'two' | 'three',
    Phaser.Input.Keyboard.Key
  >;
  private ready = false;

  constructor() {
    super('DreamAbel');
  }

  private get A() {
    return T.dreams.abel;
  }

  protected build(): void {
    this.auto = debug.flag('auto');
    this.secretDone = false;
    this.towerTaps = 0;
    this.ready = false;
    this.loading = this.add
      .text(W / 2, H / 2, T.ui.loading, txt(22, '#f6efd8', FONT.body))
      .setOrigin(0.5)
      .setDepth(1);
    this.stationText = this.add
      .text(
        24,
        58,
        '',
        txt(17, '#f6efd8', FONT.display, {
          fontStyle: '800',
          lineSpacing: 4,
          stroke: '#26331f',
          strokeThickness: 4,
        }),
      )
      .setDepth(DEPTH.hud);
    this.lapText = this.add
      .text(
        W - 24,
        58,
        '',
        txt(18, '#f6efd8', FONT.display, {
          fontStyle: '800',
          stroke: '#26331f',
          strokeThickness: 4,
        }),
      )
      .setOrigin(1, 0)
      .setDepth(DEPTH.hud);
    this.keys = this.input.keyboard!.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      space: 'SPACE',
      one: 'ONE',
      two: 'TWO',
      three: 'THREE',
    }) as typeof this.keys;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag || !p.isDown) return;
      const dx = p.x - this.drag.x;
      if (Math.abs(dx) > 4) this.drag.moved = true;
      if (this.drag.moved && !this.braking) this.view?.rotate(dx * 0.006);
      this.drag.x = p.x;
    });
    this.input.on('pointerup', () => {
      this.drag = undefined;
      this.braking = false;
    });
    this.events.once('shutdown', () => this.teardown());
    void this.initView();
  }

  private async initView(): Promise<void> {
    try {
      if (this.game.renderer.type === Phaser.CANVAS && debug.flag('canvas'))
        throw new Error('sin WebGL');
      const THREE = await import('three');
      const parent = this.game.canvas.parentElement!;
      const cv = document.createElement('canvas');
      cv.id = 'three';
      parent.insertBefore(cv, this.game.canvas);
      this.game.canvas.style.position = 'relative';
      this.game.canvas.style.zIndex = '1';
      this.canvas3d = cv;
      const view = new View3D(THREE, cv);
      this.view = view;
      this.placeFn = () => {
        const r = this.game.canvas.getBoundingClientRect();
        const pr = parent.getBoundingClientRect();
        cv.style.left = `${r.left - pr.left}px`;
        cv.style.top = `${r.top - pr.top}px`;
        cv.style.width = `${r.width}px`;
        cv.style.height = `${r.height}px`;
        view.resize(r.width, r.height);
      };
      this.placeFn();
      window.addEventListener('resize', this.placeFn);
      this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    } catch {
      // Sin WebGL: la maqueta vista desde arriba.
      this.view = new View2D(this);
    }
    this.loading?.destroy();
    this.ready = true;
    this.applySwitches();
  }

  private teardown(): void {
    if (this.placeFn) window.removeEventListener('resize', this.placeFn);
    this.view?.destroy();
    this.view = undefined;
    this.canvas3d?.remove();
    this.game.canvas.style.zIndex = '';
  }

  // ---------------- Actos ----------------

  protected startAct(n: number): void {
    void this.loadAct(n);
  }

  private async loadAct(n: number): Promise<void> {
    while (!this.ready) await new Promise((r) => this.time.delayedCall(100, r));
    this.ghosts = [];
    this.laps = 0;
    this.nextStation = 0;
    this.halted = false;
    this.cruise = this.madrugada ? 3 : 2.2;
    for (let i = 0; i < 4; i++) this.view?.setStationLit(i, false);
    this.ticketsLive = TICKETS.filter((t) => t.act === n).map((t) => ({ ...t, taken: false }));
    if (n === 2) await this.say(this.A.act2Lines);
    if (n === 3) {
      await this.say(this.A.act3Lines);
      this.removeSeg('arcL');
      this.removeSeg('topA');
      this.removeSeg('botA');
      this.view?.showTerminal(true, { terminal: this.A.terminal });
      hint(this, this.A.hintBrake, 6000, '#f6efd8');
    }
    if (n === 1) hint(this, this.A.hintSwitch, 6500, '#f6efd8');
    this.resetTrain();
    this.ghostAt = this.time.now + 4000;
  }

  private resetTrain(): void {
    this.seg = 'topL';
    this.s = 0;
    this.v = this.cruise;
    this.trail = [];
    this.odo = 0;
    this.stopT = 0;
    this.halted = false;
    for (let k = 0; k < 40; k++) this.pushTrail(-5 - (40 - k) * 0.06, -3);
  }

  private removeSeg(id: SegId): void {
    if (this.removed.has(id)) return;
    this.removed.add(id);
    this.view?.removeSeg(id, true);
  }

  private applySwitches(): void {
    for (const id of [1, 2, 3] as SwitchId[]) this.view?.setSwitch(id, this.sw[id] === 1);
  }

  private toggle(id: SwitchId): void {
    this.sw[id] = this.sw[id] ? 0 : 1;
    this.applySwitches();
    Audio.sfx('switch');
    Juice.vibrate(10);
  }

  // ---------------- Entrada ----------------

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.canPlay() || !this.view) return;
    if (p.y < 50) return;
    const hit = this.view.pick(p.x, p.y);
    if (hit.sw) {
      this.toggle(hit.sw);
      this.drag = { x: p.x, moved: false, onSwitch: true };
      return;
    }
    if (hit.tower && !this.secretDone) {
      this.towerTaps++;
      Audio.drum('tambora', 0.4);
      if (this.towerTaps >= 3) {
        this.secretDone = true;
        void this.foundSecret();
      }
      return;
    }
    this.drag = { x: p.x, moved: false, onSwitch: false };
    if (this.act === 3) this.braking = true;
  }

  // ---------------- Bucle ----------------

  update(_t: number, dtMs: number): void {
    if (this.paused || !this.view) return;
    const dt = Math.min(1 / 30, dtMs / 1000);
    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k.one)) this.toggle(1);
    if (Phaser.Input.Keyboard.JustDown(k.two)) this.toggle(2);
    if (Phaser.Input.Keyboard.JustDown(k.three)) this.toggle(3);
    if (k.left.isDown) this.view.rotate(-dt * 1.2);
    if (k.right.isDown) this.view.rotate(dt * 1.2);
    if (this.act === 3) this.braking = this.braking || k.space.isDown;
    if (this.auto && this.canPlay()) this.autoPlay();
    if (this.canPlay() && !this.halted && this.act > 0) this.step(dt);
    this.updateHand(dt);
    this.draw();
    if (this.act === 3 && !k.space.isDown && !this.drag && !this.auto) this.braking = false;
  }

  private step(dt: number): void {
    // velocidad: en el Acto III se frena a mano; si no, vuelve sola a crucero
    if (this.act === 3 && this.braking) this.v = Math.max(0, this.v - 2.6 * dt);
    else this.v += (this.cruise - this.v) * Math.min(1, dt * (this.act === 3 ? 0.35 : 2));
    if (this.act === 3 && this.braking && Math.random() < 0.1) Audio.sfx('brake');
    const prev = this.s;
    this.s += this.v * dt;
    // estaciones y tiquetes al cruzar su punto
    this.checkCrossings(prev, this.s);
    let sg = SEGMENTS[this.seg];
    while (this.s > sg.len) {
      const n = NEXT[this.seg];
      if (!n) break;
      const nextId = n.to.length > 1 && n.sw ? n.to[this.sw[n.sw]] : n.to[0];
      if (this.removed.has(nextId)) {
        this.fail(this.A.derailed);
        return;
      }
      this.s -= sg.len;
      this.seg = nextId;
      sg = SEGMENTS[nextId];
      if (nextId === 'topL') this.lap();
      Audio.drum('clack', 0.35);
      this.checkCrossings(0, this.s);
    }
    // vía muerta / terminal
    if (this.seg === 'spur') {
      if (this.act < 3) {
        if (this.s > sg.len - 0.25) {
          this.fail(this.A.stopped);
          return;
        }
      } else {
        const fr = this.s / sg.len;
        if (this.s >= sg.len - 0.15) {
          if (this.v > 0.55) {
            this.fail(this.A.tooFast);
            return;
          }
          this.s = sg.len - 0.15;
          this.v = 0;
        }
        if (this.v < 0.05) {
          this.stopT += dt;
          if (fr >= PLATFORM.from && fr <= PLATFORM.to + 0.12 && this.stopT > 0.8) {
            void this.arrive();
            return;
          }
        } else this.stopT = 0;
      }
    }
    const p = pointAt(sg, this.s);
    this.pushTrail(p.x, p.z);
    // trenes fantasma (Acto II)
    if (this.act === 2) this.updateGhosts(dt);
    // en las rectas del Acto II, el ritmo de la vía
    if (Math.random() < dt * this.v * 1.2) Audio.drum('clack', 0.15);
  }

  private checkCrossings(a: number, b: number): void {
    const sg = SEGMENTS[this.seg];
    // estación siguiente en orden (Acto I)
    if (this.act === 1) {
      const st = STATIONS[this.nextStation];
      if (st && st.seg === this.seg && a <= st.at * sg.len && b > st.at * sg.len) {
        this.view?.setStationLit(this.nextStation, true);
        Audio.sfx('pickup');
        toast(this, st.name, '#f6efd8', 120);
        this.nextStation++;
        if (this.nextStation >= STATIONS.length)
          this.time.delayedCall(800, () => this.startActWithBanner(2));
      }
    }
    for (const t of this.ticketsLive) {
      if (!t.taken && t.seg === this.seg && a <= t.at * sg.len && b > t.at * sg.len) {
        t.taken = true;
        this.foundTicket(t.i, W / 2, H / 2);
      }
    }
  }

  private lap(): void {
    if (this.act !== 2) return;
    this.laps++;
    if (this.laps === 1) {
      this.handTo('topA');
      void this.say(this.A.handsLine);
    }
    if (this.laps === 2) this.handTo('botA');
    if (this.laps >= 3) {
      this.halted = true;
      this.time.delayedCall(600, () => this.startActWithBanner(3));
    }
  }

  private handTo(id: SegId): void {
    const sg = SEGMENTS[id];
    const p = pointAt(sg, sg.len / 2);
    this.hand = { x: p.x, z: p.z, phase: 0.001, seg: id };
  }

  private updateHand(dt: number): void {
    const h = this.hand;
    if (h.phase <= 0) return;
    h.phase += dt * 0.45;
    if (h.seg && h.phase >= 0.5) {
      this.removeSeg(h.seg);
      h.seg = null;
      Audio.sfx('crack');
      Juice.shake(this, 0.006, 300);
    }
    if (h.phase >= 1) h.phase = 0;
    this.view?.hand(h.x, h.z, h.phase);
  }

  private updateGhosts(dt: number): void {
    if (this.time.now > this.ghostAt) {
      this.ghostAt = this.time.now + (this.madrugada ? 6000 : 8500);
      const seg: SegId = Math.random() < 0.5 ? 'topA' : 'botA';
      if (!this.removed.has(seg)) {
        this.ghosts.push({ seg, s: SEGMENTS[seg].len, warn: 2 });
        toast(this, this.A.ghostWarn, '#cfd8ff', 120);
      }
    }
    for (const g of this.ghosts) {
      if (g.warn > 0) g.warn -= dt;
      else g.s -= 2.4 * dt;
      if (this.seg === g.seg && g.warn <= 0 && Math.abs(this.s - g.s) < 1.1) {
        this.fail(this.A.crashed);
        return;
      }
    }
    this.ghosts = this.ghosts.filter((g) => g.s > -1 && !this.removed.has(g.seg));
  }

  private pushTrail(x: number, z: number): void {
    const last = this.trail[this.trail.length - 1];
    if (last) this.odo += Math.hypot(x - last.x, z - last.z);
    this.trail.push({ x, z, d: this.odo });
    if (this.trail.length > 400) this.trail.shift();
  }

  private poseBehind(dist: number): CarPose {
    const target = this.odo - dist;
    for (let i = this.trail.length - 1; i > 0; i--) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      if (a.d <= target) {
        const t = (target - a.d) / (b.d - a.d || 1);
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const l = Math.hypot(dx, dz) || 1;
        return { x: a.x + dx * t, z: a.z + dz * t, dx: dx / l, dz: dz / l };
      }
    }
    const f = this.trail[0] ?? { x: -5, z: -3 };
    return { x: f.x, z: f.z, dx: 1, dz: 0 };
  }

  private fail(msg: string): void {
    Audio.sfx('fail');
    Juice.shake(this, 0.01, 260);
    toast(this, msg, '#ffb0a0', 130);
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 80, () => Audio.voice('abel'));
    this.halted = true;
    this.ghosts = [];
    this.time.delayedCall(1100, () => {
      if (this.act === 1) {
        this.nextStation = 0;
        for (let i = 0; i < 4; i++) this.view?.setStationLit(i, false);
      }
      this.resetTrain();
    });
  }

  private async arrive(): Promise<void> {
    this.halted = true;
    Audio.sfx('whistle');
    Audio.level(2);
    const mid = pointAt(SEGMENTS.spur, SEGMENTS.spur.len * 0.74);
    this.view?.setYolimaFigure(mid.x - mid.dz * 0.4, mid.z + mid.dx * 0.4, true);
    await new Promise((r) => this.time.delayedCall(1400, r));
    await this.complete();
  }

  private draw(): void {
    if (!this.view) return;
    this.view.setTrain([this.poseBehind(0), this.poseBehind(1.15), this.poseBehind(2.25)]);
    this.view.setGhosts(
      this.ghosts.map((g) => {
        const sg = SEGMENTS[g.seg];
        const a = pointAt(sg, g.s);
        const b = pointAt(sg, g.s + 1.1);
        return [
          { x: a.x, z: a.z, dx: -a.dx, dz: -a.dz },
          { x: b.x, z: b.z, dx: -b.dx, dz: -b.dz },
        ];
      }),
    );
    this.view.setTickets(
      this.ticketsLive.map((t) => {
        const p = pointAt(SEGMENTS[t.seg], SEGMENTS[t.seg].len * t.at);
        return { x: p.x, z: p.z, visible: !t.taken };
      }),
    );
    this.view.render(this.time.now / 1000);
    // tablero de estaciones
    if (this.act === 1) {
      this.stationText.setText(
        STATIONS.map((s, i) => `${i < this.nextStation ? '✓' : '·'} ${s.name}`).join('\n'),
      );
      this.lapText.setText('');
    } else if (this.act === 2) {
      this.stationText.setText('');
      this.lapText.setText(fmt(this.A.laps, { n: this.laps }));
    } else {
      this.stationText.setText(`→ ${this.A.terminal}`);
      this.lapText.setText(`${this.v.toFixed(1).replace('.', ',')} km/h ×10`);
    }
  }

  // ---------------- Modo de prueba ----------------

  private autoPlay(): void {
    const want: Record<SwitchId, 0 | 1> =
      this.act === 3 ? { 1: 1, 2: 1, 3: 1 } : { 1: 1, 2: 1, 3: 0 };
    for (const id of [1, 2, 3] as SwitchId[]) if (this.sw[id] !== want[id]) this.toggle(id);
    if (this.act === 3) this.braking = this.seg === 'spur' && this.s > SEGMENTS.spur.len * 0.45;
  }
}
