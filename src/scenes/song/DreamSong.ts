import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  DEPTH_HUD,
  FONT_HAND,
  FONT_DISPLAY,
  PIXEL_SCALE,
  type AllDreamId,
} from '../../config';
import { t, type TextKey } from '../../i18n';
import { applyWorldFX } from '../../gfx/postfx';
import { IRIS_FRAME } from '../../gfx/sprites';
import { SaveManager } from '../../systems/SaveManager';
import { AudioManager } from '../../systems/AudioManager';
import { DialogueBox } from '../../systems/DialogueBox';
import {
  fadeIn,
  fadeToScene,
  showTitleCard,
  addPauseOverlay,
  showActBanner,
  showSecretBanner,
} from '../../systems/ui';
import { floatingText, burst } from '../../systems/Juice';
import { debug } from '../../systems/debug';
import { TRACKS, parseDrums, parsePattern } from '../../systems/audio/tracks';
import type { DrumKind } from '../../systems/audio/synth';
import { paintSong, BUILDING, NEIGHBOR_WINDOWS, windowCenter, allWindows } from './art';

type NoteKind =
  'broom' | 'box' | 'drop' | 'reel' | 'snip' | 'chime' | 'knock' | 'press' | 'pendulum' | 'hum';

interface Section {
  kind: NoteKind;
  window: keyof typeof NEIGHBOR_WINDOWS;
  dreamId: AllDreamId;
  color: number;
  item: string;
  act: 1 | 2 | 3;
}

/** Los 9 vecinos en orden de despertar + Cara B de Iris (3B). */
const SECTIONS: Section[] = [
  { kind: 'broom', window: 'exam', dreamId: 'exam', color: 0xf2efe6, item: 'gis', act: 1 },
  { kind: 'box', window: 'fall', dreamId: 'fall', color: 0xdba060, item: 'llave', act: 1 },
  { kind: 'drop', window: 'forest', dreamId: 'forest', color: 0x6ac8ff, item: 'bote', act: 1 },
  { kind: 'reel', window: 'shadow', dreamId: 'shadow', color: 0xffb84d, item: 'boleto', act: 1 },
  {
    kind: 'snip',
    window: 'embroidery',
    dreamId: 'embroidery',
    color: 0xc84b5a,
    item: 'dedal',
    act: 2,
  },
  { kind: 'chime', window: 'glass', dreamId: 'glass', color: 0x4cc9f0, item: 'prisma', act: 2 },
  { kind: 'knock', window: 'chase', dreamId: 'chase', color: 0xffb080, item: 'dibujo', act: 2 },
  {
    kind: 'press',
    window: 'woodcut',
    dreamId: 'woodcut',
    color: 0xb8332a,
    item: 'rodillo',
    act: 2,
  },
  {
    kind: 'pendulum',
    window: 'chamber3d',
    dreamId: 'chamber3d',
    color: 0x5eead4,
    item: 'reloj',
    act: 2,
  },
  { kind: 'hum', window: 'iris', dreamId: 'song', color: 0xffd166, item: 'grabadora', act: 3 },
];

const NEIGHBORS_COUNT = 9;
const INTRO_STEPS = 12;
const SEC_STEPS = 16;
const FLIP_START = INTRO_STEPS + NEIGHBORS_COUNT * SEC_STEPS; // 156
const FLIP_STEPS = 16; // 5.0 s de pausa entre Cara A y Cara B
const CARAB_START = FLIP_START + FLIP_STEPS; // 172
const CARAB_STEPS = 32; // 10.0 s para el tarareo completo hacia los 9 vecinos
const OUTRO_STEPS = 16;
const TOTAL_STEPS = CARAB_START + CARAB_STEPS + OUTRO_STEPS; // 220 (~68.75 s)

/** Secciones que hospedan cada una de las 6 luciérnagas permanentes de este sueño. */
const FIREFLY_SECTIONS = [1, 3, 5, 7, 8, 9] as const;

/** Segundos que tarda un sonido en viajar entre una ventana y la grabadora. */
const LEAD = 1.45;
const DROP_PITCH = [1, 1.125, 1.25, 1.5, 1.68, 2];

interface Note {
  time: number;
  section: number;
  kind: NoteKind;
  targetWin: keyof typeof NEIGHBOR_WINDOWS;
  pitch?: string;
  dur: number;
  index: number;
  spawned: boolean;
  hit: boolean;
  missed: boolean;
  icon?: Phaser.GameObjects.Image;
  tapeIcon?: Phaser.GameObjects.Image;
}

interface SongFirefly {
  index: number;
  section: number;
  x: number;
  y: number;
  taken: boolean;
  orb: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Image;
  baseY: number;
}

/**
 * Sueño 10 (3B · Iris): La Canción del Edificio.
 *
 * - Acto I (Quitando los audífonos): primeros 4 vecinos con filtro pasa-bajas que
 *   se despeja poco a poco hasta abrir todo el patio de sonido.
 * - Acto II (El Coro del Girasol): los siguientes 5 vecinos hasta Octavio (6A), cuyo
 *   péndulo enfría un instante la fachada antes de ceder paso al coro completo.
 * - Pausa del Casete (Cara A -> Cara B): mantener pulsado ~0.9 s durante el giro
 *   revela el secreto de Iris a los 9 años.
 * - Acto III (Cara B · Ruptura de la regla): ahora las notas nacen en la ventana 3B
 *   de Iris y vuelan HACIA cada vecino despierto mientras amanece y florece el Girasol.
 */
export class DreamSong extends Phaser.Scene {
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private night!: Phaser.GameObjects.Image;
  private buildingGlow!: Phaser.GameObjects.Rectangle;
  private muffleRim!: Phaser.GameObjects.Rectangle;
  private target!: Phaser.GameObjects.Arc;
  private ring!: Phaser.GameObjects.Arc;
  private iris!: Phaser.GameObjects.Sprite;
  private recorder!: Phaser.GameObjects.Image;
  private sun!: Phaser.GameObjects.Arc;
  private petals: Phaser.GameObjects.Image[] = [];
  private icons: Phaser.GameObjects.Image[] = [];

  private actText!: Phaser.GameObjects.Text;
  private ffText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;

  private flipPanel!: Phaser.GameObjects.Container;
  private flipFill!: Phaser.GameObjects.Rectangle;
  private flipReels: Phaser.GameObjects.Arc[] = [];

  private lit = new Set<string>();
  private notes: Note[] = [];
  private fireflies: SongFirefly[] = [];
  private chorusNeighbors: Section[] = [];

  private insomnia = false;
  private playing = false;
  private done = false;
  private act: 1 | 2 | 3 = 1;
  private flipEntered = false;
  private caraBEntered = false;
  private outroEntered = false;
  private secretDone = false;
  private holdTime = 0;
  private pointerHeld = false;
  private keyHeld = false;

  private clockStart = 0;
  private useAudioClock = false;
  private fallbackStart = 0;
  private pausedAt = 0;
  private lastWall = 0;
  private stepDur = 0.3125;
  private shownSection = -1;
  private lastBeat = -1;
  private hits = 0;
  private judged = 0;
  private ffCollectedThisRun = 0;

  constructor() {
    super('DreamSong');
  }

  create(data: { insomnia?: boolean } = {}): void {
    this.insomnia = Boolean(data.insomnia) || debug.flag('insomnia');
    this.secretDone = SaveManager.data.secrets.song;
    this.notes = [];
    this.petals = [];
    this.icons = [];
    this.fireflies = [];
    this.flipReels = [];
    this.lit = new Set();
    this.playing = false;
    this.done = false;
    this.act = 1;
    this.flipEntered = false;
    this.caraBEntered = false;
    this.outroEntered = false;
    this.holdTime = 0;
    this.pointerHeld = false;
    this.keyHeld = false;
    this.useAudioClock = false;
    this.fallbackStart = 0;
    this.pausedAt = 0;
    this.lastWall = 0;
    this.shownSection = -1;
    this.lastBeat = -1;
    this.hits = 0;
    this.judged = 0;
    this.ffCollectedThisRun = 0;
    this.chorusNeighbors = SECTIONS.slice(0, NEIGHBORS_COUNT).filter(
      (s) => SaveManager.data.fireflies[s.dreamId] >= 6,
    );

    applyWorldFX(this, 'song');
    this.cameras.main.setBackgroundColor(this.insomnia ? 0x07051c : 0x0d0a2e);
    fadeIn(this, 1000);
    AudioManager.playMusic('silence');
    paintSong(this);

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'song-dawn').setDepth(0);
    this.night = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'song-night')
      .setDepth(1)
      .setAlpha(1);
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
    this.add.rectangle(GAME_WIDTH / 2, BUILDING.ground + 35, GAME_WIDTH, 70, 0x15102a).setDepth(4);

    // Iris en su balcón 3B con la grabadora
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

    // Diana de la grabadora (Actos I-II) y aro de tiempo
    this.target = this.add
      .circle(ix + 22, iy + 14, 30)
      .setStrokeStyle(3, 0xffd166, 0.9)
      .setDepth(12);
    this.ring = this.add
      .circle(ix + 22, iy + 14, 90)
      .setStrokeStyle(2, 0xffd166, 0)
      .setDepth(12);

    // Halo de audífonos que se disipa al avanzar por el Acto I
    this.muffleRim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 12, GAME_HEIGHT - 12)
      .setStrokeStyle(14, 0x1e2b58, 0.42)
      .setDepth(DEPTH_HUD - 4);

    // Cinta de casete inferior
    this.add.image(GAME_WIDTH / 2, 514, 'song-tape').setDepth(DEPTH_HUD - 2);
    this.add.rectangle(ix + 22, 514, 4, 34, 0xffd166).setDepth(DEPTH_HUD - 1);

    this.buildHud();
    this.buildFlipOverlay();

    this.dialogue = new DialogueBox(this, 0xffb070, 'dawn');
    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'), {
      onPause: () => {
        this.pausedAt = performance.now() / 1000;
        AudioManager.suspend();
      },
      onResume: () => {
        if (this.pausedAt > 0) this.fallbackStart += performance.now() / 1000 - this.pausedAt;
        this.pausedAt = 0;
        AudioManager.resume();
      },
      onRestart: () => this.scene.restart({ insomnia: this.insomnia }),
    });

    this.bindInputs();

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
      this.insomnia ? t('song.insomnia') : undefined,
    );
  }

  private buildHud(): void {
    const icon = this.add
      .circle(34, 30, 9, 0xffd166, 0.95)
      .setStrokeStyle(2, 0x1a1640)
      .setDepth(DEPTH_HUD);
    this.tweens.add({ targets: icon, scale: 1.15, duration: 900, yoyo: true, repeat: -1 });
    this.ffText = this.add
      .text(52, 30, `${SaveManager.data.fireflies.song}/6`, {
        fontFamily: FONT_DISPLAY,
        fontSize: '15px',
        color: '#fff3e0',
        stroke: '#1a1640',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH_HUD);

    this.scoreText = this.add
      .text(122, 30, '0%', {
        fontFamily: FONT_DISPLAY,
        fontSize: '14px',
        color: '#ffd166',
        stroke: '#1a1640',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH_HUD);

    // Rejilla limpia de los 10 objetos en el cielo izquierdo (sin tocar el centro)
    SECTIONS.forEach((s, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      this.icons.push(
        this.add
          .image(34 + col * 36, 74 + row * 34, s.item)
          .setScale(1.6)
          .setAlpha(0.25)
          .setDepth(DEPTH_HUD),
      );
    });

    this.actText = this.add
      .text(GAME_WIDTH - 92, 30, this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'), {
        fontFamily: FONT_HAND,
        fontSize: '19px',
        color: this.insomnia ? '#ff9ab0' : '#fff3e0',
        stroke: '#1a1640',
        strokeThickness: 4,
      })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH_HUD);

    this.toast = this.add
      .text(GAME_WIDTH / 2, 466, '', {
        fontFamily: FONT_HAND,
        fontSize: '21px',
        color: '#fff3e0',
        backgroundColor: '#1a1640dd',
        padding: { x: 14, y: 4 },
        align: 'center',
        stroke: '#1a1640',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_HUD)
      .setVisible(false);
  }

  private buildFlipOverlay(): void {
    const bg = this.add.rectangle(0, 0, 440, 134, 0x1a1640, 0.94).setStrokeStyle(2, 0xffd166);
    const r1 = this.add.circle(-148, -28, 18, 0x3b2820).setStrokeStyle(3, 0xffd166);
    const r2 = this.add.circle(148, -28, 18, 0x3b2820).setStrokeStyle(3, 0xffd166);
    this.flipReels = [r1, r2];
    const title = this.add
      .text(0, -28, 'CARA A  ⇄  CARA B', {
        fontFamily: FONT_DISPLAY,
        fontSize: '14px',
        color: '#ffd166',
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(0, 10, t('song.secretHint'), {
        fontFamily: FONT_HAND,
        fontSize: '15px',
        color: '#fff3e0',
        wordWrap: { width: 400 },
        align: 'center',
      })
      .setOrigin(0.5);
    const barBg = this.add.rectangle(0, 44, 280, 10, 0x0e0a24).setStrokeStyle(1, 0x8a7ad0);
    this.flipFill = this.add.rectangle(-140, 44, 0, 8, 0xffd166).setOrigin(0, 0.5);

    this.flipPanel = this.add
      .container(GAME_WIDTH / 2, 226, [bg, r1, r2, title, hint, barBg, this.flipFill])
      .setDepth(DEPTH_HUD + 5)
      .setVisible(false);
  }

  private bindInputs(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < 60 && p.x > GAME_WIDTH - 110) return;
      this.pointerHeld = true;
      this.tryCollectFireflyNear(p.x, p.y);
      this.tap();
    });
    this.input.on('pointerup', () => {
      this.pointerHeld = false;
    });
    this.input.on('pointerout', () => {
      this.pointerHeld = false;
    });

    const isTapKey = (code: string) =>
      ['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'KeyE', 'KeyW', 'KeyJ', 'KeyK'].includes(code);

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (isTapKey(ev.code)) {
        if (!ev.repeat) this.tap();
        this.keyHeld = true;
      }
    });
    this.input.keyboard?.on('keyup', (ev: KeyboardEvent) => {
      if (isTapKey(ev.code)) this.keyHeld = false;
    });
  }

  // ── Partitura y 3 Actos ──

  private startSong(): void {
    AudioManager.playMusic('song', 0);
    AudioManager.setMuffle(520);
    const clock = AudioManager.musicClock();
    const def = TRACKS.song;
    this.stepDur = clock?.stepDur ?? 60 / def.bpm / def.stepsPerBeat;
    const atStep = debug.flag('skip') ? debug.num('at', 0) : 0;
    this.useAudioClock = Boolean(clock);
    this.clockStart = (clock?.start ?? 0) - atStep * this.stepDur;
    this.fallbackStart = performance.now() / 1000 - atStep * this.stepDur;

    this.buildChart();
    this.playing = true;

    if (atStep > 0) {
      this.fastForwardState(atStep);
    } else {
      showActBanner(this, t('song.act1'), '#86f7ff');
      this.time.delayedCall(400, () =>
        this.showToast(this.insomnia ? t('song.desveloTip') : this.hintText(), 3400),
      );
    }
  }

  private fastForwardState(atStep: number): void {
    for (let k = 0; k < SECTIONS.length; k++) {
      const start = this.sectionStartStep(k);
      if (atStep >= start) {
        this.lightSectionVisualsOnly(k);
        this.shownSection = k;
        if (k >= 4 && this.act < 2) {
          this.act = 2;
          AudioManager.setMuffle(null);
          this.muffleRim.setAlpha(0);
          this.actText
            .setText(this.insomnia ? `${t('ui.act2')} · ☾` : t('ui.act2'))
            .setColor('#ffd166');
        }
        const ffIdx = FIREFLY_SECTIONS.indexOf(k as (typeof FIREFLY_SECTIONS)[number]);
        if (
          ffIdx >= 0 &&
          atStep < start + SEC_STEPS &&
          !this.fireflies.some((f) => f.index === ffIdx)
        ) {
          this.spawnSongFirefly(ffIdx, k);
        }
      }
    }
    if (atStep >= CARAB_START) {
      this.flipEntered = true;
      this.caraBEntered = true;
      this.act = 3;
      this.flipPanel.setVisible(false);
      this.actText
        .setText(this.insomnia ? `${t('ui.act3')} · ☾` : t('ui.act3'))
        .setColor('#fff3e0');
    }
    const cutoff = (atStep + 0.5) * this.stepDur;
    for (const n of this.notes) {
      if (n.time < cutoff) n.missed = true;
    }
  }

  private currentSongTime(): number {
    return this.useAudioClock
      ? AudioManager.now() - this.clockStart
      : performance.now() / 1000 - this.fallbackStart;
  }

  private hintText(): string {
    return this.sys.game.device.input.touch ? t('song.hint') : t('song.hintKeys');
  }

  private sectionStartStep(k: number): number {
    if (k < NEIGHBORS_COUNT) return INTRO_STEPS + k * SEC_STEPS;
    return CARAB_START;
  }

  private buildChart(): void {
    const def = TRACKS.song;

    SECTIONS.forEach((sec, k) => {
      const base = this.sectionStartStep(k);
      let index = 0;

      if (sec.kind === 'hum') {
        const voice = def.voices.find((v) => v.inst === 'hum');
        if (!voice) return;
        const events = parsePattern(voice.pattern).events;
        for (const e of events) {
          this.notes.push(this.makeNote(base + e.step, k, 'hum', index++, e.notes[0], e.len));
          if (this.insomnia && e.step + 2 < CARAB_STEPS) {
            const occupied = events.some((o) => Math.abs(o.step - (e.step + 2)) < 1);
            if (!occupied) {
              this.notes.push(this.makeNote(base + e.step + 2, k, 'hum', index++, 'E5', 1));
            }
          }
        }
      } else {
        const drum = def.drums?.find((d) => d.kind === this.drumOf(sec.kind));
        if (!drum) return;
        const parsed = parseDrums(drum.pattern).events;
        let steps = parsed
          .filter((e) => (sec.kind === 'press' ? e.step >= 16 : e.step < SEC_STEPS))
          .map((e) => (sec.kind === 'press' ? e.step - 16 : e.step));

        if (steps.length < 3) {
          steps = Array.from(new Set([...steps, 8])).sort((a, b) => a - b);
        }
        if (this.insomnia) {
          const extras: number[] = [];
          for (const st of steps) {
            const off = st + 2;
            if (off < SEC_STEPS && !steps.includes(off)) extras.push(off);
          }
          steps = Array.from(new Set([...steps, ...extras.slice(0, 3)])).sort((a, b) => a - b);
        }

        for (const st of steps) {
          this.notes.push(this.makeNote(base + st, k, sec.kind, index++));
        }
      }
    });
  }

  private makeNote(
    step: number,
    section: number,
    kind: NoteKind,
    index: number,
    pitch?: string,
    len = 1,
  ): Note {
    const targetWin =
      section === 9 ? SECTIONS[index % NEIGHBORS_COUNT].window : SECTIONS[section].window;
    return {
      time: step * this.stepDur,
      section,
      kind,
      targetWin,
      pitch,
      dur: len * this.stepDur,
      index,
      spawned: false,
      hit: false,
      missed: false,
    };
  }

  private drumOf(kind: NoteKind): DrumKind {
    return (
      {
        broom: 'broom',
        box: 'box',
        drop: 'drop',
        reel: 'reel',
        snip: 'snip',
        chime: 'chime',
        knock: 'knock',
        press: 'press',
        pendulum: 'pendulum',
        hum: 'broom',
      } as const
    )[kind];
  }

  // ── Bucle Principal ──

  update(): void {
    if (!this.playing || this.done || this.pause.paused()) {
      this.lastWall = 0;
      return;
    }
    const nowWall = performance.now() / 1000;
    const holdDt = this.lastWall > 0 ? Math.min(nowWall - this.lastWall, 0.5) : 0.016;
    this.lastWall = nowWall;
    const now = this.currentSongTime();
    const pos = now / this.stepDur;

    AudioManager.setMusicLevel(this.levelAt(pos + 1.5));

    const sec = this.sectionAt(pos + 2);
    if (sec >= 0 && sec < SECTIONS.length && sec !== this.shownSection) {
      this.enterSection(sec);
    }

    const inFlip = pos >= FLIP_START && pos < CARAB_START;
    if (inFlip && !this.flipEntered) {
      this.enterFlipPause();
    }
    if (inFlip) {
      this.updateFlipPause(holdDt);
    } else if (this.flipPanel.visible && pos >= CARAB_START) {
      this.flipPanel.setVisible(false);
    }

    if (pos >= CARAB_START && !this.caraBEntered) {
      this.enterAct3();
    }

    if (pos >= CARAB_START + CARAB_STEPS && !this.outroEntered) {
      this.enterOutro();
    }

    const beat = Math.floor(pos / 2);
    if (beat !== this.lastBeat && pos >= 0) {
      this.lastBeat = beat;
      this.tweens.add({ targets: this.iris, scaleY: PIXEL_SCALE * 0.72, duration: 90, yoyo: true });
      this.tweens.add({ targets: this.recorder, scale: 2.14, duration: 80, yoyo: true });
      if (this.caraBEntered && this.chorusNeighbors.length > 0 && beat % 2 === 0) {
        const cn = this.chorusNeighbors[(beat / 2) % this.chorusNeighbors.length];
        const [cx, cy] = windowCenter(
          NEIGHBOR_WINDOWS[cn.window][0],
          NEIGHBOR_WINDOWS[cn.window][1],
        );
        burst(this, cx, cy, cn.color, 5, 16);
      }
    }

    this.updateNotes(now);
    this.updateFireflies(now);
    this.updateDawn(pos);
    if (pos >= TOTAL_STEPS && !this.done) this.finish();
  }

  private sectionAt(pos: number): number {
    if (pos < INTRO_STEPS) return -1;
    if (pos < FLIP_START) return Math.floor((pos - INTRO_STEPS) / SEC_STEPS);
    if (pos < CARAB_START) return 8;
    return 9;
  }

  private levelAt(pos: number): number {
    const s = this.sectionAt(pos);
    if (pos >= CARAB_START) return 10;
    return Phaser.Math.Clamp(s + 1, 0, 9);
  }

  private enterSection(k: number): void {
    this.shownSection = k;
    const sec = SECTIONS[k];

    if (sec.act === 1) {
      const freqs = [920, 1450, 2400, 4800];
      AudioManager.setMuffle(freqs[k] ?? null);
      this.tweens.add({
        targets: this.muffleRim,
        alpha: Math.max(0, 0.38 - (k + 1) * 0.08),
        duration: 700,
      });
    } else if (sec.act === 2 && this.act < 2) {
      this.act = 2;
      AudioManager.setMuffle(null);
      this.tweens.add({ targets: this.muffleRim, alpha: 0, duration: 600 });
      this.actText
        .setText(this.insomnia ? `${t('ui.act2')} · ☾` : t('ui.act2'))
        .setColor('#ffd166');
      showActBanner(this, t('song.act2'), '#f59e0b');
    }

    if (k === 8) {
      this.buildingGlow.setFillStyle(0x5eead4, 0.2);
      this.time.delayedCall(2600, () => {
        if (!this.done) this.buildingGlow.setFillStyle(0xffb070, 0.14);
      });
    }

    this.lightSectionVisualsOnly(k);
    this.showToast(t(`song.section.${k + 1}` as TextKey), 3100);

    const ffIdx = FIREFLY_SECTIONS.indexOf(k as (typeof FIREFLY_SECTIONS)[number]);
    if (ffIdx >= 0 && !this.fireflies.some((f) => f.index === ffIdx)) {
      this.spawnSongFirefly(ffIdx, k);
    }
  }

  private lightSectionVisualsOnly(k: number): void {
    const sec = SECTIONS[k];
    this.icons[k]?.setAlpha(1);
    const [l, c] = NEIGHBOR_WINDOWS[sec.window];
    const [x, y] = windowCenter(l, c);
    const win = this.add.image(x, y, `song-win-${sec.window}`).setDepth(7).setAlpha(0);
    this.tweens.add({ targets: win, alpha: 1, duration: 700 });
    const glow = this.add
      .image(x, y, 'glow-soft')
      .setTint(sec.color)
      .setAlpha(0)
      .setScale(0.85)
      .setDepth(6);
    this.tweens.add({ targets: glow, alpha: 0.45, duration: 750, yoyo: true, hold: 1100 });
    this.lit.add(`${l},${c}`);
  }

  private enterFlipPause(): void {
    this.flipEntered = true;
    this.holdTime = 0;
    AudioManager.sfx('rewind');
    showActBanner(this, t('song.flip'), '#ffd166');
    this.flipPanel.setVisible(true).setScale(0.9);
    this.tweens.add({ targets: this.flipPanel, scale: 1, duration: 300, ease: 'Back.out' });
  }

  private updateFlipPause(dt: number): void {
    for (const r of this.flipReels) r.rotation += dt * 4;
    const held = this.pointerHeld || this.keyHeld;
    if (held && !this.secretDone) {
      this.holdTime += dt;
      this.flipFill.width = Phaser.Math.Clamp(this.holdTime / 0.85, 0, 1) * 280;
      if (this.holdTime >= 0.85) {
        this.unlockCassetteSecret();
      }
    } else if (!held && !this.secretDone) {
      this.holdTime = Math.max(0, this.holdTime - dt * 1.5);
      this.flipFill.width = Phaser.Math.Clamp(this.holdTime / 0.85, 0, 1) * 280;
    }
  }

  private unlockCassetteSecret(): void {
    if (this.secretDone) return;
    this.secretDone = true;
    this.flipFill.width = 280;
    SaveManager.markSecret('song');
    AudioManager.sfx('secret');
    AudioManager.note('musicbox', 'E6', 0.14, 0.35);
    AudioManager.note('musicbox', 'G6', 0.12, 0.4, AudioManager.now() + 0.14);
    showSecretBanner(this, t('song.secret'));
    const quote = this.add
      .text(GAME_WIDTH / 2, 326, t('song.secretVoice'), {
        fontFamily: FONT_HAND,
        fontSize: '19px',
        color: '#ffd166',
        backgroundColor: '#1a1640ee',
        padding: { x: 12, y: 4 },
        stroke: '#0e0a24',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_HUD + 6);
    this.tweens.add({
      targets: quote,
      y: quote.y - 20,
      alpha: 0,
      delay: 1400,
      duration: 900,
      onComplete: () => quote.destroy(),
    });
  }

  private enterAct3(): void {
    if (this.caraBEntered) return;
    this.caraBEntered = true;
    this.act = 3;
    this.flipPanel.setVisible(false);
    this.actText.setText(this.insomnia ? `${t('ui.act3')} · ☾` : t('ui.act3')).setColor('#fff3e0');
    showActBanner(this, t('song.act3'), '#ffd166');
    if (this.chorusNeighbors.length > 0) {
      this.time.delayedCall(2000, () => {
        if (!this.done) this.showToast(t('song.chorus', { n: this.chorusNeighbors.length }), 3000);
      });
    }
  }

  private enterOutro(): void {
    if (this.outroEntered) return;
    this.outroEntered = true;
    this.icons[SECTIONS.length - 1]?.setAlpha(1);
    allWindows().forEach(([l, c], i) =>
      this.time.delayedCall(i * 55, () => this.lightWindow(l, c, true)),
    );

    const cx = BUILDING.x + BUILDING.w / 2;
    const cy = BUILDING.ground - (BUILDING.floors * BUILDING.floorH) / 2;
    this.tweens.add({
      targets: this.sun,
      x: cx,
      y: cy,
      radius: 235,
      duration: 4200,
      ease: 'Sine.out',
    });
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      const petal = this.add
        .image(cx, cy, 'song-petal')
        .setOrigin(0.5, 1)
        .setRotation(a + Math.PI / 2)
        .setScale(0)
        .setAlpha(0.92)
        .setDepth(3);
      this.petals.push(petal);
      this.tweens.add({
        targets: petal,
        scaleX: 1.65,
        scaleY: 2.35,
        delay: 400 + k * 90,
        duration: 1400,
        ease: 'Back.out',
      });
    }
    this.tweens.add({
      targets: this.petals,
      angle: '+=24',
      delay: 1600,
      duration: 5000,
      ease: 'Sine.inOut',
    });
    AudioManager.sfx('bloom');
  }

  private spawnSongFirefly(index: number, section: number): void {
    const winKey = SECTIONS[section].window;
    const [wx, wy] = windowCenter(NEIGHBOR_WINDOWS[winKey][0], NEIGHBOR_WINDOWS[winKey][1]);
    const x = wx + (wx < GAME_WIDTH / 2 ? -42 : 42);
    const y = wy - 10;
    const saved = SaveManager.hasFirefly('song', index);

    const glow = this.add
      .image(x, y, 'glow-soft')
      .setTint(saved ? 0xffd166 : 0x86f7ff)
      .setAlpha(saved ? 0.25 : 0.72)
      .setScale(saved ? 0.5 : 0.9)
      .setDepth(17);
    const orb = this.add
      .circle(x, y, 8, saved ? 0xffd166 : 0xfff3b0, saved ? 0.4 : 0.95)
      .setStrokeStyle(2, 0x1a1640)
      .setDepth(18);
    this.fireflies.push({ index, section, x, y, baseY: y, taken: saved, orb, glow });
  }

  private updateFireflies(now: number): void {
    for (const ff of this.fireflies) {
      if (ff.taken) continue;
      ff.y = ff.baseY + Math.sin(now * 3.5 + ff.index) * 7;
      ff.orb.setY(ff.y);
      ff.glow.setY(ff.y);
    }
  }

  private tryCollectFireflyNear(px: number, py: number): boolean {
    for (const ff of this.fireflies) {
      if (ff.taken) continue;
      if (Math.hypot(px - ff.x, py - ff.y) < 52) {
        this.collectSongFirefly(ff);
        return true;
      }
    }
    return false;
  }

  private collectSongFirefly(ff: SongFirefly): void {
    if (ff.taken) return;
    ff.taken = true;
    this.ffCollectedThisRun++;
    SaveManager.collectFirefly('song', ff.index);
    AudioManager.sfx('collect');
    burst(this, ff.x, ff.y, 0xffd166, 16, 40);
    ff.orb.destroy();
    ff.glow.destroy();
    this.ffText.setText(`${SaveManager.data.fireflies.song}/6`);
    this.showToast(t('song.ffFound', { n: SaveManager.data.fireflies.song }), 1800);
  }

  private updateDawn(pos: number): void {
    const p = Phaser.Math.Clamp(
      (pos - INTRO_STEPS) / (CARAB_START + CARAB_STEPS - INTRO_STEPS),
      0,
      1,
    );
    const darknessCap = this.insomnia ? 0.15 : 0;
    this.night.setAlpha(Math.max(darknessCap, 1 - p));
    if (this.shownSection !== 8) {
      this.buildingGlow.setFillStyle(0xffb070, p * 0.2);
    }
  }

  // ── Notas y Juicio Rítmico ──

  private updateNotes(now: number): void {
    const [ix, iy] = [this.target.x, this.target.y];
    const perfectWin = this.insomnia ? 0.055 : 0.085;
    const goodWin = this.insomnia ? 0.135 : 0.185;
    let next: Note | undefined;

    for (const n of this.notes) {
      if (n.hit || n.missed) continue;
      const until = n.time - now;
      if (!next || n.time < next.time) next = n;
      if (!n.spawned && until < LEAD) this.spawnNote(n);

      if (n.icon) {
        const [wx, wy] = this.windowOf(n.targetWin);
        const reverse = n.section === 9;
        const [sx, sy] = reverse ? [ix, iy] : [wx, wy];
        const [dx, dy] = reverse ? [wx, wy] : [ix, iy];
        const p = Phaser.Math.Clamp(1 - until / LEAD, 0, 1);
        const cx = (sx + dx) / 2;
        const cy = Math.min(sy, dy) - 84;
        const x = (1 - p) * (1 - p) * sx + 2 * (1 - p) * p * cx + p * p * dx;
        const y = (1 - p) * (1 - p) * sy + 2 * (1 - p) * p * cy + p * p * dy;
        n.icon.setPosition(x, y).setScale(0.6 + p * 0.48);
      }

      if (n.tapeIcon) n.tapeIcon.setX(ix + until * 300);

      if (debug.flag('auto') && Math.abs(until) <= Math.min(0.035, perfectWin)) {
        this.hitNote(n, true);
      } else if (until < -goodWin) {
        this.missNote(n);
      }
    }

    if (next) {
      const until = next.time - now;
      if (until < LEAD) {
        const r = 30 + Math.max(0, until) * 58;
        this.ring.setRadius(r).setStrokeStyle(2, SECTIONS[next.section].color, 0.9);
      } else {
        this.ring.setStrokeStyle(2, 0xffd166, 0);
      }
    }
  }

  private spawnNote(n: Note): void {
    n.spawned = true;
    const [wx, wy] = this.windowOf(n.targetWin);
    const [sx, sy] = n.section === 9 ? [this.target.x, this.target.y] : [wx, wy];
    n.icon = this.add.image(sx, sy, `song-note-${n.kind}`).setDepth(15).setScale(0.6);
    n.tapeIcon = this.add
      .image(GAME_WIDTH + 30, 514, `song-note-${n.kind}`)
      .setDepth(DEPTH_HUD)
      .setScale(0.54);
  }

  private windowOf(key: keyof typeof NEIGHBOR_WINDOWS): [number, number] {
    const [l, c] = NEIGHBOR_WINDOWS[key];
    return windowCenter(l, c);
  }

  private tap(): void {
    if (!this.playing || this.done || this.pause.paused() || this.dialogue.active) return;
    const now = this.currentSongTime() - AudioManager.latency();
    const perfectWin = this.insomnia ? 0.055 : 0.085;
    const goodWin = this.insomnia ? 0.135 : 0.185;

    let best: Note | undefined;
    let bestD = goodWin;
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
    this.hitNote(best, bestD <= perfectWin);
  }

  private hitNote(n: Note, perfect: boolean): void {
    n.hit = true;
    this.hits++;
    this.judged++;

    if (n.kind === 'hum' && n.pitch) {
      AudioManager.note('hum', n.pitch, 0.12, n.dur, undefined, 0.35);
    } else if (n.kind === 'drop') {
      AudioManager.drum('drop', 0.14, DROP_PITCH[n.index % DROP_PITCH.length], undefined, 0.4);
    } else {
      AudioManager.drum(this.drumOf(n.kind), n.kind === 'box' ? 0.4 : 0.34);
    }

    const [bx, by] = n.section === 9 ? this.windowOf(n.targetWin) : [this.target.x, this.target.y];
    const color = SECTIONS[n.section].color;

    this.tweens.add({ targets: this.target, scale: 1.32, duration: 80, yoyo: true });
    burst(this, bx, by, color, perfect ? 12 : 6, 36);
    floatingText(this, bx, by - 36, t(perfect ? 'song.perfect' : 'song.good'), {
      fontFamily: FONT_HAND,
      fontSize: perfect ? '20px' : '16px',
      color: perfect ? '#fff3e0' : '#cfc4ff',
      stroke: '#1a1640',
      strokeThickness: 4,
    });

    n.icon?.destroy();
    n.tapeIcon?.destroy();

    if (perfect) {
      const secFf = this.fireflies.find((f) => f.section === n.section && !f.taken);
      if (secFf) this.collectSongFirefly(secFf);
    }

    const pct = Math.round((this.hits / Math.max(1, this.judged)) * 100);
    this.scoreText.setText(`${pct}%`);

    const dark = allWindows().filter(([l, c]) => !this.lit.has(`${l},${c}`));
    if (dark.length) {
      const [l, c] = dark[Math.floor(Math.random() * dark.length)];
      this.lightWindow(l, c, perfect);
    }
  }

  private missNote(n: Note): void {
    n.missed = true;
    this.judged++;
    const pct = Math.round((this.hits / Math.max(1, this.judged)) * 100);
    this.scoreText.setText(`${pct}%`);
    const icon = n.icon;
    if (icon) {
      this.tweens.add({
        targets: icon,
        alpha: 0,
        y: icon.y + 36,
        duration: 380,
        onComplete: () => icon.destroy(),
      });
    }
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
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 450 });
  }

  private finish(): void {
    this.done = true;
    this.playing = false;
    AudioManager.setMuffle(null);
    const pct = Math.min(100, Math.round((this.hits / Math.max(1, this.judged)) * 100));
    SaveManager.recordSong(pct);
    SaveManager.recordFireflies('song', this.ffCollectedThisRun);
    SaveManager.markCompleted('song', this.insomnia);

    this.showToast(`${t('song.dawn')} · ${t('song.score', { pct })}`, 3800);
    this.time.delayedCall(3200, () => {
      AudioManager.stopMusic();
      this.cameras.main.fadeOut(1800, 255, 248, 232);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.start('Ending'),
      );
    });
  }
}
