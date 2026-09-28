import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH_HUD, FONT_HAND, PIXEL_SCALE } from '../../config';
import { t } from '../../i18n';
import type { TextKey } from '../../i18n';
import { applyWorldFX } from '../../gfx/postfx';
import { IRIS_FRAME } from '../../gfx/sprites';
import { SaveManager } from '../../systems/SaveManager';
import { AudioManager } from '../../systems/AudioManager';
import { DialogueBox } from '../../systems/DialogueBox';
import { fadeIn, fadeToScene, showTitleCard, addPauseOverlay } from '../../systems/ui';
import { floatingText } from '../../systems/Juice';
import { debug } from '../../systems/debug';
import { TRACKS, parseDrums, parsePattern } from '../../systems/audio/tracks';
import type { DrumKind } from '../../systems/audio/synth';
import { paintSong, BUILDING, NEIGHBOR_WINDOWS, windowCenter, allWindows } from './art';

type NoteKind = 'broom' | 'box' | 'drop' | 'knock' | 'hum';

interface Section {
  kind: NoteKind;
  window: keyof typeof NEIGHBOR_WINDOWS;
  color: number;
  item: string;
}

/** Cada vecino suma su sonido, en el orden en que Iris los fue conociendo. */
const SECTIONS: Section[] = [
  { kind: 'broom', window: 'exam', color: 0xf2efe6, item: 'gis' },
  { kind: 'box', window: 'fall', color: 0xdba060, item: 'llave' },
  { kind: 'drop', window: 'forest', color: 0x6ac8ff, item: 'bote' },
  { kind: 'knock', window: 'chase', color: 0xffb080, item: 'dibujo' },
  { kind: 'hum', window: 'iris', color: 0xffd166, item: 'grabadora' },
];

const LOOP = 32;
const INTRO_LOOPS = 1;
const LOOPS_PER_SECTION = 2;
const OUTRO_LOOPS = 1;
const TOTAL_STEPS = (INTRO_LOOPS + SECTIONS.length * LOOPS_PER_SECTION + OUTRO_LOOPS) * LOOP;
/** Segundos que tarda un sonido en viajar de su ventana a la grabadora. */
const LEAD = 1.5;
const PERFECT = 0.075;
const GOOD = 0.17;
const DROP_PITCH = [1, 1.125, 1.25, 1.5, 1.68, 2];

interface Note {
  time: number;
  section: number;
  kind: NoteKind;
  pitch?: string;
  dur: number;
  index: number;
  spawned: boolean;
  hit: boolean;
  missed: boolean;
  icon?: Phaser.GameObjects.Image;
  tapeIcon?: Phaser.GameObjects.Image;
}

/**
 * El sueño de Iris: un ritmo con los sonidos del edificio.
 * Los sonidos salen de la ventana de cada vecino y viajan hasta la grabadora
 * de Iris; hay que atraparlos a tiempo. Cada sección, un instrumento más se
 * queda tocando solo. No se puede perder: es su sueño.
 */
export class DreamSong extends Phaser.Scene {
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private night!: Phaser.GameObjects.Image;
  private buildingGlow!: Phaser.GameObjects.Rectangle;
  private target!: Phaser.GameObjects.Arc;
  private ring!: Phaser.GameObjects.Arc;
  private iris!: Phaser.GameObjects.Sprite;
  private recorder!: Phaser.GameObjects.Image;
  private sun!: Phaser.GameObjects.Arc;
  private petals: Phaser.GameObjects.Image[] = [];
  private icons: Phaser.GameObjects.Image[] = [];
  private toast!: Phaser.GameObjects.Text;
  private lit = new Set<string>();

  private notes: Note[] = [];
  private playing = false;
  private done = false;
  private clockStart = 0;
  private stepDur = 0.3125;
  private shownSection = -1;
  private lastBeat = -1;
  private hits = 0;

  constructor() {
    super('DreamSong');
  }

  create(): void {
    this.notes = [];
    this.petals = [];
    this.icons = [];
    this.lit = new Set();
    this.playing = false;
    this.done = false;
    this.shownSection = -1;
    this.lastBeat = -1;
    this.hits = 0;

    applyWorldFX(this, 'song');
    this.cameras.main.setBackgroundColor(0x0d0a2e);
    fadeIn(this, 1200);
    AudioManager.playMusic('silence');
    paintSong(this);

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'song-dawn').setDepth(0);
    this.night = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'song-night').setDepth(1);
    this.sun = this.add.circle(GAME_WIDTH / 2, 620, 70, 0xffd166).setDepth(2);
    this.add
      .image(GAME_WIDTH / 2, BUILDING.ground + 4, 'song-skyline')
      .setOrigin(0.5, 1)
      .setDepth(3);
    this.add
      .image(BUILDING.x - 20, 0, 'song-building')
      .setOrigin(0, 0)
      .setDepth(5);
    this.buildingGlow = this.add
      .rectangle(BUILDING.x, 40, BUILDING.w, BUILDING.ground - 40, 0xffb070, 0)
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(6);
    // El suelo de la calle
    this.add.rectangle(GAME_WIDTH / 2, BUILDING.ground + 35, GAME_WIDTH, 70, 0x15102a).setDepth(4);

    // Unos cuantos vecinos más tampoco duermen
    for (const [l, c] of [
      [1, 3],
      [4, 3],
      [2, 0],
    ] as [number, number][]) {
      const [x, y] = windowCenter(l, c);
      this.add.rectangle(x, y, 50, 40, 0xffc070, 0.35).setDepth(6);
    }

    // Iris sentada en su balcón, con la grabadora
    const [ix, iy] = windowCenter(NEIGHBOR_WINDOWS.iris[0], NEIGHBOR_WINDOWS.iris[1]);
    this.iris = this.add
      .sprite(ix - 14, iy + 22, 'iris', IRIS_FRAME.sit)
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 0.75)
      .setDepth(10);
    this.recorder = this.add
      .image(ix + 22, iy + 16, 'grabadora')
      .setScale(2)
      .setDepth(11);
    // Morfeo en la orilla de la azotea
    this.add
      .sprite(
        BUILDING.x + BUILDING.w - 40,
        BUILDING.ground - BUILDING.floors * BUILDING.floorH - 4,
        'morfeo',
      )
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(10)
      .play('morfeo-idle');

    // Diana: los sonidos llegan aquí
    this.target = this.add
      .circle(ix + 22, iy + 14, 30)
      .setStrokeStyle(3, 0xffd166, 0.9)
      .setDepth(12);
    this.ring = this.add
      .circle(ix + 22, iy + 14, 90)
      .setStrokeStyle(2, 0xffd166, 0)
      .setDepth(12);

    // Cinta del casete abajo: por aquí se ve el ritmo que viene
    this.add.image(GAME_WIDTH / 2, 512, 'song-tape').setDepth(DEPTH_HUD - 2);
    this.add.rectangle(ix + 22, 512, 4, 34, 0xffd166).setDepth(DEPTH_HUD - 1);

    SECTIONS.forEach((s, i) => {
      this.icons.push(
        this.add
          .image(36 + i * 46, 30, s.item)
          .setScale(2)
          .setAlpha(0.25)
          .setDepth(DEPTH_HUD),
      );
    });
    this.toast = this.add
      .text(GAME_WIDTH / 2, 470, '', {
        fontFamily: FONT_HAND,
        fontSize: '22px',
        color: '#fff3e0',
        align: 'center',
        stroke: '#1a1640',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_HUD)
      .setVisible(false);

    this.dialogue = new DialogueBox(this, 0xffb070, 'dawn');
    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'));

    // Toques con marca de tiempo exacta (el reloj del audio, no el del cuadro)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < 60 && p.x > GAME_WIDTH - 110) return;
      this.tap();
    });
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (
        ['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'KeyE', 'KeyW', 'KeyJ', 'KeyK'].includes(ev.code)
      )
        this.tap();
    });

    if (debug.flag('skip')) {
      this.startSong();
      return;
    }
    showTitleCard(
      this,
      t('song.title'),
      t('song.name'),
      () => {
        this.dialogue.say(
          [
            { who: null, text: t('song.intro.1') },
            { who: null, text: t('song.intro.2') },
            { who: 'morfeo', text: t('song.intro.3') },
            { who: 'morfeo', text: t('song.intro.4'), mood: 'smug' },
          ],
          () => this.startSong(),
        );
      },
      'dawn',
    );
  }

  // ── Partitura ──

  private startSong(): void {
    AudioManager.playMusic('song', 0);
    const clock = AudioManager.musicClock();
    const def = TRACKS.song;
    this.stepDur = clock?.stepDur ?? 60 / def.bpm / def.stepsPerBeat;
    this.clockStart = clock?.start ?? AudioManager.now() + 0.1;
    // Depuración: empezar más adelante (la música no se desplaza, solo la partitura)
    this.clockStart -= debug.num('at', 0) * this.stepDur;
    this.buildChart();
    this.playing = true;
    this.time.delayedCall(400, () => this.showToast(this.hintText(), 3000));
  }

  private hintText(): string {
    const touch = this.sys.game.device.input.touch;
    return touch ? t('song.hint') : t('song.hintKeys');
  }

  private buildChart(): void {
    const def = TRACKS.song;
    SECTIONS.forEach((sec, k) => {
      const base = (INTRO_LOOPS + k * LOOPS_PER_SECTION) * LOOP;
      let index = 0;
      for (let loop = 0; loop < LOOPS_PER_SECTION; loop++) {
        if (sec.kind === 'hum') {
          const voice = def.voices.find((v) => v.inst === 'hum');
          if (!voice) continue;
          for (const e of parsePattern(voice.pattern).events) {
            const step = base + loop * LOOP + e.step;
            this.notes.push(this.note(step, k, sec.kind, index++, e.notes[0], e.len));
          }
        } else {
          const drum = def.drums?.find((d) => d.kind === this.drumOf(sec.kind));
          if (!drum) continue;
          for (const e of parseDrums(drum.pattern).events) {
            this.notes.push(this.note(base + loop * LOOP + e.step, k, sec.kind, index++));
          }
        }
      }
    });
  }

  private note(
    step: number,
    section: number,
    kind: NoteKind,
    index: number,
    pitch?: string,
    len = 1,
  ): Note {
    return {
      time: this.clockStart + step * this.stepDur,
      section,
      kind,
      pitch,
      dur: len * this.stepDur,
      index,
      spawned: false,
      hit: false,
      missed: false,
    };
  }

  private drumOf(kind: NoteKind): DrumKind {
    return ({ broom: 'broom', box: 'box', drop: 'drop', knock: 'knock', hum: 'kick' } as const)[
      kind
    ];
  }

  // ── Bucle ──

  update(): void {
    if (!this.playing || this.pause.paused()) return;
    const now = AudioManager.now();
    const pos = (now - this.clockStart) / this.stepDur;

    // Capas: durante la sección k suenan solas las k anteriores
    AudioManager.setMusicLevel(this.levelAt(pos + 1.5));
    const sec = this.sectionAt(pos + 4);
    if (sec >= 0 && sec < SECTIONS.length && sec !== this.shownSection) this.enterSection(sec);
    if (sec >= SECTIONS.length && this.shownSection < SECTIONS.length) this.enterOutro();

    // Pulso en cada tiempo
    const beat = Math.floor(pos / 2);
    if (beat !== this.lastBeat && pos >= 0) {
      this.lastBeat = beat;
      this.tweens.add({ targets: this.iris, scaleY: PIXEL_SCALE * 0.72, duration: 90, yoyo: true });
      this.tweens.add({ targets: this.recorder, scale: 2.12, duration: 80, yoyo: true });
    }

    this.updateNotes(now);
    this.updateDawn(pos);
    if (pos >= TOTAL_STEPS && !this.done) this.finish();
  }

  private sectionAt(pos: number): number {
    if (pos < INTRO_LOOPS * LOOP) return -1;
    return Math.floor((pos - INTRO_LOOPS * LOOP) / (LOOPS_PER_SECTION * LOOP));
  }

  private levelAt(pos: number): number {
    const s = this.sectionAt(pos);
    return Phaser.Math.Clamp(s, 0, SECTIONS.length);
  }

  private enterSection(k: number): void {
    this.shownSection = k;
    const sec = SECTIONS[k];
    if (k > 0) this.icons[k - 1].setAlpha(1);
    this.showToast(t(`song.section.${k + 1}` as TextKey), 3200);
    // La ventana del vecino se enciende en el estilo de su sueño
    const [l, c] = NEIGHBOR_WINDOWS[sec.window];
    const [x, y] = windowCenter(l, c);
    const win = this.add.image(x, y, `song-win-${sec.window}`).setDepth(7).setAlpha(0);
    this.tweens.add({ targets: win, alpha: 1, duration: 800 });
    const glow = this.add
      .image(x, y, 'glow-soft')
      .setTint(sec.color)
      .setAlpha(0)
      .setScale(0.8)
      .setDepth(6);
    this.tweens.add({ targets: glow, alpha: 0.45, duration: 800, yoyo: true, hold: 1200 });
    this.lit.add(`${l},${c}`);
  }

  private enterOutro(): void {
    this.shownSection = SECTIONS.length;
    this.icons[SECTIONS.length - 1].setAlpha(1);
    // Todas las ventanas se prenden: el edificio entero está despierto
    allWindows().forEach(([l, c], i) =>
      this.time.delayedCall(i * 60, () => this.lightWindow(l, c, true)),
    );
    // El edificio florece: los pétalos brotan desde detrás de él y el Girasol
    // se vuelve el centro de la flor.
    const cx = BUILDING.x + BUILDING.w / 2;
    const cy = BUILDING.ground - (BUILDING.floors * BUILDING.floorH) / 2;
    this.tweens.add({
      targets: this.sun,
      x: cx,
      y: cy,
      radius: 230,
      duration: 5000,
      ease: 'Sine.out',
    });
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      const petal = this.add
        .image(cx, cy, 'song-petal')
        .setOrigin(0.5, 1)
        .setRotation(a + Math.PI / 2)
        .setScale(0)
        .setAlpha(0.9)
        .setDepth(3);
      this.petals.push(petal);
      this.tweens.add({
        targets: petal,
        scaleX: 1.6,
        scaleY: 2.3,
        delay: 2500 + k * 110,
        duration: 1600,
        ease: 'Back.out',
      });
    }
    this.tweens.add({
      targets: this.petals,
      angle: '+=24',
      delay: 4500,
      duration: 9000,
      ease: 'Sine.inOut',
    });
    AudioManager.sfx('bloom');
  }

  private updateDawn(pos: number): void {
    const p = Phaser.Math.Clamp(
      (pos - INTRO_LOOPS * LOOP) / (SECTIONS.length * LOOPS_PER_SECTION * LOOP),
      0,
      1,
    );
    this.night.setAlpha(1 - p);
    this.buildingGlow.setFillStyle(0xffb070, p * 0.18);
  }

  private updateNotes(now: number): void {
    const [tx, ty] = [this.target.x, this.target.y];
    let next: Note | undefined;
    for (const n of this.notes) {
      if (n.hit || n.missed) continue;
      const until = n.time - now;
      if (!next || n.time < next.time) next = n;
      if (!n.spawned && until < LEAD) this.spawn(n);
      if (n.icon) {
        const sec = SECTIONS[n.section];
        const [sx, sy] = this.windowOf(sec);
        const p = Phaser.Math.Clamp(1 - until / LEAD, 0, 1);
        // Curva: sale de la ventana, sube un poco y cae en la grabadora
        const cx = (sx + tx) / 2;
        const cy = Math.min(sy, ty) - 90;
        const x = (1 - p) * (1 - p) * sx + 2 * (1 - p) * p * cx + p * p * tx;
        const y = (1 - p) * (1 - p) * sy + 2 * (1 - p) * p * cy + p * p * ty;
        n.icon.setPosition(x, y).setScale(0.6 + p * 0.5);
      }
      if (n.tapeIcon) n.tapeIcon.setX(tx + until * 300);
      if (debug.flag('auto') && Math.abs(until) < 0.03) this.hit(n, true);
      else if (until < -GOOD) this.miss(n);
    }
    // Aro de aproximación para el siguiente sonido
    if (next) {
      const until = next.time - now;
      if (until < LEAD) {
        const r = 30 + Math.max(0, until) * 60;
        this.ring.setRadius(r).setStrokeStyle(2, SECTIONS[next.section].color, 0.9);
      } else this.ring.setStrokeStyle(2, 0xffd166, 0);
    }
  }

  private spawn(n: Note): void {
    n.spawned = true;
    const sec = SECTIONS[n.section];
    const [sx, sy] = this.windowOf(sec);
    n.icon = this.add.image(sx, sy, `song-note-${n.kind}`).setDepth(15).setScale(0.6);
    n.tapeIcon = this.add
      .image(GAME_WIDTH + 30, 512, `song-note-${n.kind}`)
      .setDepth(DEPTH_HUD)
      .setScale(0.55);
  }

  private windowOf(sec: Section): [number, number] {
    const [l, c] = NEIGHBOR_WINDOWS[sec.window];
    return windowCenter(l, c);
  }

  // ── Juicio ──

  private tap(): void {
    if (!this.playing || this.done || this.pause.paused() || this.dialogue.active) return;
    const now = AudioManager.now() - AudioManager.latency();
    let best: Note | undefined;
    let bestD = GOOD;
    for (const n of this.notes) {
      if (n.hit || n.missed) continue;
      const d = Math.abs(n.time - now);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    if (!best) {
      AudioManager.drum('tick', 0.08);
      return;
    }
    this.hit(best, bestD < PERFECT);
  }

  private hit(n: Note, perfect: boolean): void {
    n.hit = true;
    this.hits++;
    // El sonido del vecino suena por la mano de Iris
    if (n.kind === 'hum' && n.pitch)
      AudioManager.note('hum', n.pitch, 0.11, n.dur, undefined, 0.35);
    else if (n.kind === 'drop')
      AudioManager.drum('drop', 0.14, DROP_PITCH[n.index % DROP_PITCH.length], undefined, 0.4);
    else AudioManager.drum(this.drumOf(n.kind), n.kind === 'box' ? 0.4 : 0.34);
    const color = SECTIONS[n.section].color;
    this.tweens.add({ targets: this.target, scale: 1.35, duration: 80, yoyo: true });
    for (let i = 0; i < (perfect ? 10 : 5); i++) {
      const p = this.add
        .image(this.target.x, this.target.y, 'px')
        .setTint(color)
        .setDepth(16)
        .setScale(2);
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-60, 60),
        y: p.y + Phaser.Math.Between(-70, 20),
        alpha: 0,
        duration: 500,
        onComplete: () => p.destroy(),
      });
    }
    if (perfect) {
      floatingText(this, this.target.x, this.target.y - 40, t('song.perfect'), {
        fontFamily: FONT_HAND,
        fontSize: '20px',
        color: '#fff3e0',
        stroke: '#1a1640',
        strokeThickness: 4,
      });
    }
    n.icon?.destroy();
    n.tapeIcon?.destroy();
    // Cada sonido atrapado prende una ventana más
    const dark = allWindows().filter(([l, c]) => !this.lit.has(`${l},${c}`));
    if (dark.length) {
      const [l, c] = dark[Math.floor(Math.random() * dark.length)];
      this.lightWindow(l, c, perfect);
    }
  }

  private miss(n: Note): void {
    n.missed = true;
    const icon = n.icon;
    if (icon)
      this.tweens.add({
        targets: icon,
        alpha: 0,
        y: icon.y + 40,
        duration: 400,
        onComplete: () => icon.destroy(),
      });
    n.tapeIcon?.destroy();
  }

  private lightWindow(l: number, c: number, bright: boolean): void {
    const key = `${l},${c}`;
    if (this.lit.has(key) && !bright) return;
    this.lit.add(key);
    const [x, y] = windowCenter(l, c);
    const w = this.add
      .rectangle(x, y, 50, 40, Phaser.Utils.Array.GetRandom([0xffd98a, 0xffc070, 0xfff0b0]), 0)
      .setDepth(6);
    this.tweens.add({ targets: w, fillAlpha: bright ? 0.95 : 0.7, duration: 400 });
  }

  private showToast(text: string, ms: number): void {
    this.toast.setText(text).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 500 });
  }

  private finish(): void {
    this.done = true;
    this.playing = false;
    SaveManager.data.songDone = true;
    SaveManager.save();
    this.showToast(t('song.dawn'), 4000);
    this.time.delayedCall(3500, () => {
      AudioManager.stopMusic();
      this.cameras.main.fadeOut(2000, 255, 248, 232);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.start('Ending'),
      );
    });
  }
}
