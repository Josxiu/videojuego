import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH_HUD, FONT_CHALK, FONT_HAND } from '../../config';
import { t } from '../../i18n';
import type { TextKey } from '../../i18n';
import { applyWorldFX } from '../../gfx/postfx';
import { CHARACTER_TEXTURES, CHARACTER_ANIMS, IRIS_FRAME } from '../../gfx/sprites';
import { ensureStyle, styledKey, footOriginY, addStyled } from '../../gfx/stylize';
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
  showActBanner,
  showSecretBanner,
} from '../../systems/ui';
import { burst, floatingText } from '../../systems/Juice';
import { debug } from '../../systems/debug';
import { EXAM_QUESTIONS, EXAM_COURSE, type ExamObstacle } from '../../data/examQuestions';
import { paintExamArt, paintAnswer, ART, STEP_TEX_H, STEP_TOP, CHALK } from './art';

/** Altura de pantalla (y del mundo, sin escalera) donde está el suelo. */
const GROUND_Y = 440;
/** Posición horizontal fija de Iris en pantalla: el mundo corre hacia ella. */
const PLAYER_X = 300;
const STYLE = 'chalk';
const S = EXAM_COURSE.stairs;
const STAIRS_END = S.start + S.steps * ART.stepW;
const TOTAL_RISE = S.steps * ART.stepRise;
const STEP_56_X = S.start + 56 * ART.stepW;
const STEP_80_X = S.start + 80 * ART.stepW;

/** Distancia inicial entre el borrador e Iris, y la máxima. */
const ERASER_START = 380;
const ERASER_MAX = 440;
const ERASER_CATCH = 40;

type Pose = 'run' | 'jump' | 'drop' | 'slide' | 'idle';

interface Obstacle {
  x: number;
  kind: ExamObstacle | 'hangingDesk';
  sprite: Phaser.GameObjects.Image;
  extra?: Phaser.GameObjects.GameObject;
  dropped?: boolean;
  restY?: number;
}

interface Gate {
  index: number;
  x: number;
  resolved: boolean;
  correct?: boolean;
  shown: boolean;
  parts: Phaser.GameObjects.GameObject[];
  mark?: Phaser.GameObjects.Image;
  upperY: number;
  lowerY: number;
}

interface Star {
  index: number;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  taken: boolean;
}

/**
 * Sueño de Don Élmer: auto-runner dibujado con gis.
 *
 * - Acto I: pasillo de conserjería y primeras preguntas del edificio.
 * - Acto II (escalón 56): timbre y sorpresa — el borrador acelera, surgen
 *   pupitres colgantes del techo y preguntas en gis rojo sobre el pasillo alto.
 * - Acto III (Salón 3º B): romper la regla tomando el borrador para borrar
 *   «TARDE · REPROBADO» y dejar que Élmer escriba su propio nombre.
 */
export class DreamExam extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private iris!: Phaser.GameObjects.Sprite;
  private halo!: Phaser.GameObjects.Image;
  private eraser!: Phaser.GameObjects.Image;
  private wipeEdge!: Phaser.GameObjects.Image;
  private wipeFill!: Phaser.GameObjects.Rectangle;
  private far!: Phaser.GameObjects.TileSprite;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private questionText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private stepCounter!: Phaser.GameObjects.Text;
  private ffText!: Phaser.GameObjects.Text;
  private actText!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Graphics;
  private answerSlots: Phaser.GameObjects.Image[] = [];

  private obstacles: Obstacle[] = [];
  private gates: Gate[] = [];
  private stars: Star[] = [];

  private running = false;
  private finished = false;
  private insomnia = false;
  private act: 1 | 2 | 3 = 1;
  private twistDone = false;
  private dist = 0;
  private checkpoint = 0;
  private y = GROUND_Y;
  private vy = 0;
  private grounded = true;
  private airJumps = 1;
  private coyote = 0;
  private jumpBuffer = 0;
  private sliding = 0;
  private invuln = 0;
  private slowed = 0;
  private eraserGap = ERASER_START;
  private camRise = 0;
  private pose: Pose = 'idle';
  private fireflies = new Set<number>();
  private lastStep = 0;
  private stairsToldAt = -1;
  private sprintTold = false;
  private secretPlat?: { x: number; y: number; w: number };
  private secretCard?: { x: number; y: number; box: Phaser.GameObjects.Container; taken: boolean };
  private foundSecret = false;
  /** Ya en el salón: el pasillo deja de actualizarse. */
  private inClass = false;
  private timesErased = 0;

  constructor() {
    super('DreamExam');
  }

  create(data: { insomnia?: boolean } = {}): void {
    this.resetState(Boolean(data.insomnia) || debug.flag('insomnia'));
    this.cameras.main.setBackgroundColor(CHALK.board);
    applyWorldFX(this, 'exam');
    fadeIn(this);
    AudioManager.playMusic('exam', 0);

    paintExamArt(this);
    ensureStyle(
      this,
      STYLE,
      [...CHARACTER_TEXTURES, 'elmer', 'gis', 'portrait-iris', 'portrait-morfeo'],
      [...CHARACTER_ANIMS, 'elmer-idle'],
    );

    this.buildBackdrop();
    this.buildFloor();
    this.buildCourse();
    this.buildEraser();
    this.buildIris();
    this.buildHud();

    this.dialogue = new DialogueBox(this, 0xffe08a, 'chalk');
    this.inp = new InputManager(this);
    this.inp.addRunnerGestures();
    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'), {
      onRestart: () => this.scene.restart({ insomnia: this.insomnia }),
    });

    if (debug.flag('skip')) {
      this.dist = debug.num('at', 0);
      this.checkpoint = this.dist;
      this.y = this.floorAt(this.dist);
      if (this.dist >= STEP_56_X) {
        this.twistDone = true;
        this.act = 2;
        this.actText.setText(t('ui.act2'));
      }
      this.syncCamera(true);
      this.running = true;
      AudioManager.setMusicLevel(1);
      return;
    }
    this.syncCamera(true);
    showTitleCard(
      this,
      t('exam.title'),
      t('exam.name'),
      () => {
        this.dialogue.say(
          [
            { who: null, text: t('exam.intro.1') },
            { who: null, text: t('exam.intro.2') },
            { who: 'morfeo', text: t('exam.intro.3'), mood: 'smug' },
            { who: 'morfeo', text: t('exam.intro.4') },
          ],
          () => {
            showActBanner(this, `${t('ui.act1')} · 3º B`, CHALK.white);
            this.showToast(this.inp.isTouch ? t('exam.hint') : t('exam.hintKeys'), 3200);
            this.running = true;
            AudioManager.setMusicLevel(1);
          },
        );
      },
      'chalk',
      this.insomnia ? t('exam.insomnia') : undefined,
    );
  }

  private resetState(insomnia: boolean): void {
    this.obstacles = [];
    this.gates = [];
    this.stars = [];
    this.answerSlots = [];
    this.running = false;
    this.finished = false;
    this.insomnia = insomnia;
    this.act = 1;
    this.twistDone = false;
    this.dist = 0;
    this.checkpoint = 0;
    this.y = GROUND_Y;
    this.vy = 0;
    this.grounded = true;
    this.airJumps = 1;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.sliding = 0;
    this.invuln = 0;
    this.slowed = 0;
    this.eraserGap = insomnia ? ERASER_START - 60 : ERASER_START;
    this.camRise = 0;
    this.pose = 'idle';
    this.fireflies.clear();
    this.lastStep = 0;
    this.stairsToldAt = -1;
    this.sprintTold = false;
    this.secretPlat = undefined;
    this.secretCard = undefined;
    this.foundSecret = false;
    this.inClass = false;
    this.timesErased = 0;
  }

  // ── Geometría del mundo ──

  /** Altura del suelo sin contar huecos (para cámara y decorado). */
  private floorAt(x: number): number {
    if (x < S.start) return GROUND_Y;
    if (x < STAIRS_END)
      return GROUND_Y - ART.stepRise * (Math.floor((x - S.start) / ART.stepW) + 1);
    return GROUND_Y - TOTAL_RISE;
  }

  /** Altura del suelo pisable: Infinity si hay un hueco borrado. */
  private groundAt(x: number): number {
    for (const [gx, gw] of EXAM_COURSE.gaps) {
      if (x > gx + 10 && x < gx + gw - 10) return Infinity;
    }
    return this.floorAt(x);
  }

  private speedAt(x: number): number {
    let v = EXAM_COURSE.speeds[0][1];
    for (const [from, speed] of EXAM_COURSE.speeds) if (x >= from) v = speed;
    return v;
  }

  // ── Construcción ──

  private buildBackdrop(): void {
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'exam-board')
      .setScrollFactor(0)
      .setDepth(0);
    this.far = this.add
      .tileSprite(0, GROUND_Y - ART.farH - 6, GAME_WIDTH, ART.farH, 'exam-far')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1)
      .setAlpha(0.6);
    // Casilleros: planta baja y planta alta, pegados a su piso
    const lower = this.add
      .tileSprite(-400, GROUND_Y - ART.midH, S.start + 460, ART.midH, 'exam-mid')
      .setOrigin(0, 0)
      .setDepth(2)
      .setAlpha(0.6);
    lower.tilePositionX = -400;
    const upperX = STAIRS_END + 40;
    const upper = this.add
      .tileSprite(
        upperX,
        GROUND_Y - TOTAL_RISE - ART.midH,
        EXAM_COURSE.length - upperX + 1200,
        ART.midH,
        'exam-mid',
      )
      .setOrigin(0, 0)
      .setDepth(2)
      .setAlpha(0.6);
    upper.tilePositionX = upperX;
    // El marco del pizarrón encima de todo el mundo
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'exam-frame')
      .setScrollFactor(0)
      .setDepth(90);
  }

  private buildFloor(): void {
    const floorSeg = (x0: number, x1: number, y: number) => {
      if (x1 <= x0) return;
      const seg = this.add
        .tileSprite(x0, y, x1 - x0, ART.floorH, 'exam-floor')
        .setOrigin(0, 0)
        .setDepth(5);
      seg.tilePositionX = x0;
    };
    // Tramos planos, cortados por los huecos
    const cuts: [number, number][] = [];
    let cursor = -600;
    for (const [gx, gw] of EXAM_COURSE.gaps.filter(([gx]) => gx < S.start)) {
      cuts.push([cursor, gx]);
      cursor = gx + gw;
    }
    cuts.push([cursor, S.start]);
    cuts.forEach(([a, b]) => floorSeg(a, b, GROUND_Y));
    cursor = STAIRS_END;
    const top = GROUND_Y - TOTAL_RISE;
    for (const [gx, gw] of EXAM_COURSE.gaps.filter(([gx]) => gx > STAIRS_END)) {
      floorSeg(cursor, gx, top);
      cursor = gx + gw;
    }
    floorSeg(cursor, EXAM_COURSE.length + 1200, top);
    // Huecos: el borrón con bordes deshilachados
    for (const [gx, gw] of EXAM_COURSE.gaps) {
      this.add
        .image(gx + gw / 2, this.floorAt(gx) - 4, 'exam-hole')
        .setOrigin(0.5, 0)
        .setDisplaySize(gw + 40, 90)
        .setDepth(6);
    }
    // Escalera: 112 escalones, con su pasamanos
    for (let i = 0; i < S.steps; i++) {
      const x = S.start + i * ART.stepW;
      this.add
        .image(x, GROUND_Y - ART.stepRise * (i + 1), 'exam-step')
        .setOrigin(0, STEP_TOP / STEP_TEX_H)
        .setDepth(5);
    }
  }

  private buildCourse(): void {
    for (const [x, kind] of EXAM_COURSE.obstacles) this.obstacles.push(this.makeObstacle(x, kind));

    // Pupitres colgantes del techo (Sorpresa del Acto II tras cruzar el escalón 56)
    for (const hx of [6480, 7780, 9450]) {
      const g = this.floorAt(hx);
      const restY = g - 36;
      const sprite = this.add
        .image(hx, g - 220, 'exam-desk')
        .setOrigin(0.5, 1)
        .setFlipY(true)
        .setTint(0xffb3c6)
        .setDepth(21);
      const cord = this.add
        .image(hx, g - 220 - 44, 'exam-cord')
        .setOrigin(0.5, 1)
        .setDisplaySize(5, 500)
        .setDepth(20);
      this.obstacles.push({
        x: hx,
        kind: 'hangingDesk',
        sprite,
        extra: cord,
        dropped: false,
        restY,
      });
    }

    // Secreto del escalón 80: plataforma de tiza punteada casi borrada + boleta 3ºB
    const secY = this.floorAt(STEP_80_X) - 102;
    this.secretPlat = { x: STEP_80_X, y: secY, w: 148 };
    const dashed = this.add.graphics().setDepth(18);
    dashed.lineStyle(4, 0xffe08a, 0.7);
    for (let dx = -70; dx < 70; dx += 18) {
      dashed.lineBetween(STEP_80_X + dx, secY, STEP_80_X + dx + 10, secY);
    }
    const cardX = STEP_80_X + 12;
    const cardY = secY - 26;
    const cardGlow = this.add.image(0, 0, 'glow-gold').setScale(1.8).setAlpha(0.45);
    const cardPaper = this.add.rectangle(0, 0, 26, 32, 0xf2efe6, 0.95).setStrokeStyle(2, 0xffe08a);
    const cardLine1 = this.add.rectangle(0, -6, 16, 3, 0x23392f);
    const cardLine2 = this.add.rectangle(0, 2, 14, 2, 0xff809a);
    const cardSeal = this.add.circle(6, 9, 4, 0xff5d73);
    const box = this.add
      .container(cardX, cardY, [cardGlow, cardPaper, cardLine1, cardLine2, cardSeal])
      .setDepth(35)
      .setAlpha(SaveManager.data.secrets.exam ? 0.45 : 1);
    this.tweens.add({ targets: box, y: cardY - 6, duration: 900, yoyo: true, repeat: -1 });
    this.secretCard = { x: cardX, y: cardY, box, taken: false };

    EXAM_QUESTIONS.forEach((q, index) => {
      const g = this.floorAt(q.at);
      const upKey = `exam-ans-${index}-up`;
      const downKey = `exam-ans-${index}-down`;
      paintAnswer(this, upKey, t(q.upperKey));
      paintAnswer(this, downKey, t(q.lowerKey));
      const upperY = g - 178;
      const lowerY = g - 46;
      const upImg = this.add.image(q.at, upperY, upKey).setDepth(30).setScale(0.85);
      const downImg = this.add.image(q.at, lowerY, downKey).setDepth(30).setScale(0.85);
      if (index >= 2) {
        upImg.setTint(0xffc2c2);
        downImg.setTint(0xffc2c2);
      }
      const parts: Phaser.GameObjects.GameObject[] = [
        upImg,
        downImg,
        this.add
          .text(q.at - 96, upperY - 42, '↑', {
            fontFamily: FONT_HAND,
            fontSize: '24px',
            color: index >= 2 ? CHALK.pink : CHALK.yellow,
          })
          .setDepth(30),
      ];
      this.gates.push({ index, x: q.at, resolved: false, shown: false, parts, upperY, lowerY });
    });

    EXAM_COURSE.fireflies.forEach(([x, h], i) => {
      const y = this.floorAt(x) - h;
      const got = SaveManager.hasFirefly('exam', i);
      const glow = this.add
        .image(x, y, 'glow-gold')
        .setScale(1.6)
        .setAlpha(got ? 0.18 : 0.45)
        .setDepth(34);
      const sprite = this.add
        .image(x, y, 'exam-star')
        .setAlpha(got ? 0.35 : 1)
        .setDepth(35);
      this.tweens.add({
        targets: [sprite, glow],
        y: y - 10,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
        delay: i * 120,
      });
      this.tweens.add({ targets: sprite, angle: 360, duration: 6000, repeat: -1 });
      this.stars.push({ index: i, x, y, sprite, glow, taken: false });
    });

    // La puerta del salón al final
    this.add
      .image(EXAM_COURSE.length + 120, GROUND_Y - TOTAL_RISE + 4, 'exam-door')
      .setOrigin(0.5, 1)
      .setDepth(8);
  }

  private makeObstacle(x: number, kind: ExamObstacle): Obstacle {
    const g = this.floorAt(x);
    switch (kind) {
      case 'desk':
        return {
          x,
          kind,
          sprite: this.add
            .image(x, g + 2, 'exam-desk')
            .setOrigin(0.5, 1)
            .setDepth(20),
        };
      case 'books':
        return {
          x,
          kind,
          sprite: this.add
            .image(x, g + 2, 'exam-books')
            .setOrigin(0.5, 1)
            .setDepth(20),
        };
      case 'bag':
        return {
          x,
          kind,
          sprite: this.add
            .image(x, g + 2, 'exam-bag')
            .setOrigin(0.5, 1)
            .setDepth(20),
        };
      case 'plane': {
        const sprite = this.add.image(x, g - 74, 'exam-plane').setDepth(22);
        this.tweens.add({
          targets: sprite,
          angle: { from: -6, to: 6 },
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
        return { x, kind, sprite };
      }
      case 'bell': {
        const sprite = this.add
          .image(x, g - 44, 'exam-bell')
          .setOrigin(0.5, 1)
          .setDepth(22);
        const cord = this.add
          .image(x, g - 94, 'exam-cord')
          .setOrigin(0.5, 1)
          .setDisplaySize(6, 600)
          .setDepth(21);
        this.tweens.add({
          targets: sprite,
          angle: { from: -8, to: 8 },
          duration: 380,
          yoyo: true,
          repeat: -1,
        });
        return { x, kind, sprite, extra: cord };
      }
    }
  }

  private buildEraser(): void {
    this.wipeFill = this.add
      .rectangle(0, 0, 4000, GAME_HEIGHT + 200, 0x263e34)
      .setOrigin(1, 0)
      .setDepth(44);
    this.wipeEdge = this.add.image(0, 0, 'exam-wipe').setOrigin(0, 0).setDepth(44);
    this.eraser = this.add.image(0, 0, 'exam-eraser').setOrigin(0.5, 1).setDepth(46);
    this.dustEmitter = this.add.particles(0, 0, 'px', {
      speedX: { min: -60, max: 40 },
      speedY: { min: -90, max: -10 },
      lifespan: 900,
      alpha: { start: 0.6, end: 0 },
      scale: { start: 1.6, end: 0.3 },
      tint: 0xf2efe6,
      frequency: 40,
    });
    this.dustEmitter.setDepth(47);
  }

  private buildIris(): void {
    // Un halo oscuro detrás de Iris la separa del dibujo de fondo
    this.halo = this.add
      .image(0, 0, 'glow-soft')
      .setTint(0x10201a)
      .setAlpha(0.55)
      .setScale(0.9, 1.2)
      .setDepth(49);
    this.iris = addStyled(this, this.dist, this.y, 'iris', STYLE, {
      frame: IRIS_FRAME.idle,
      feet: true,
    }).setDepth(50);
    this.setPose('idle');
  }

  private buildHud(): void {
    const hud = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ) => o.setScrollFactor(0).setDepth(DEPTH_HUD);
    // Luciérnagas (estrellas de gis)
    hud(this.add.image(34, 34, 'exam-star').setScale(0.8));
    this.ffText = hud(
      this.add
        .text(56, 34, `${SaveManager.data.fireflies.exam}/6`, {
          fontFamily: FONT_CHALK,
          fontSize: '22px',
          color: CHALK.yellow,
        })
        .setOrigin(0, 0.5),
    );
    this.actText = hud(
      this.add
        .text(GAME_WIDTH - 96, 30, this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'), {
          fontFamily: FONT_CHALK,
          fontSize: '16px',
          color: this.insomnia ? '#ffb3c6' : CHALK.white,
        })
        .setOrigin(1, 0.5),
    );
    // Progreso hacia el salón: una línea de gis
    this.progress = hud(this.add.graphics());
    hud(
      this.add
        .text(GAME_WIDTH / 2 + 222, 30, '3º B', {
          fontFamily: FONT_CHALK,
          fontSize: '20px',
          color: CHALK.white,
        })
        .setOrigin(0, 0.5),
    );
    // Casillas de respuestas
    for (let i = 0; i < EXAM_QUESTIONS.length; i++) {
      const x = GAME_WIDTH / 2 - 60 + i * 30;
      hud(this.add.rectangle(x, 60, 22, 22).setStrokeStyle(2, 0xf2efe6, 0.5));
      this.answerSlots.push(
        hud(this.add.image(x, 60, 'exam-check').setScale(0.3).setVisible(false)),
      );
    }
    // Enunciado de la pregunta, escrito en el pizarrón
    this.questionText = hud(
      this.add
        .text(GAME_WIDTH / 2, 118, '', {
          fontFamily: FONT_CHALK,
          fontSize: '32px',
          color: CHALK.white,
          align: 'center',
          wordWrap: { width: 820 },
        })
        .setOrigin(0.5),
    ).setDepth(60);
    this.toast = hud(
      this.add
        .text(GAME_WIDTH / 2, 176, '', {
          fontFamily: FONT_HAND,
          fontSize: '21px',
          color: CHALK.yellow,
          align: 'center',
          wordWrap: { width: 760 },
        })
        .setOrigin(0.5)
        .setVisible(false),
    );
    this.stepCounter = hud(
      this.add
        .text(GAME_WIDTH / 2, 120, '', {
          fontFamily: FONT_CHALK,
          fontSize: '54px',
          color: CHALK.white,
        })
        .setOrigin(0.5)
        .setAlpha(0),
    );
    this.drawProgress();
  }

  private drawProgress(): void {
    const p = Phaser.Math.Clamp(this.dist / EXAM_COURSE.length, 0, 1);
    const x0 = GAME_WIDTH / 2 - 210;
    const g = this.progress;
    g.clear();
    g.lineStyle(3, 0xf2efe6, 0.3);
    g.lineBetween(x0, 30, x0 + 420, 30);
    g.lineStyle(4, this.act === 2 ? 0xff9aa8 : this.act === 3 ? 0xb8f0a8 : 0xffe08a, 0.9);
    g.lineBetween(x0, 30, x0 + 420 * p, 30);
    // el borrador, en la misma línea
    const e = Phaser.Math.Clamp((this.dist - this.eraserGap) / EXAM_COURSE.length, 0, 1);
    g.fillStyle(0xc68a4e, 0.9);
    g.fillRect(x0 + 420 * e - 6, 25, 12, 10);
  }

  private showToast(text: string, ms = 1800): void {
    this.toast.setText(text).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 400 });
  }

  // ── Iris ──

  private setPose(p: Pose): void {
    if (p === this.pose) return;
    this.pose = p;
    const tex = styledKey('iris', STYLE);
    switch (p) {
      case 'run':
        this.iris.setOrigin(0.5, footOriginY(24));
        this.iris.play(styledKey('iris-run', STYLE));
        break;
      case 'idle':
        this.iris.setOrigin(0.5, footOriginY(24));
        this.iris.play(styledKey('iris-idle', STYLE));
        break;
      case 'jump':
      case 'drop':
        this.iris.anims.stop();
        this.iris.setTexture(tex, p === 'jump' ? IRIS_FRAME.jump : IRIS_FRAME.drop);
        this.iris.setOrigin(0.5, footOriginY(24));
        break;
      case 'slide':
        this.iris.anims.stop();
        this.iris.setTexture(styledKey('iris-slide', STYLE));
        this.iris.setOrigin(0.5, footOriginY(16));
        break;
    }
  }

  private playerRect(): Phaser.Geom.Rectangle {
    const x = this.dist;
    return this.sliding > 0
      ? new Phaser.Geom.Rectangle(x - 28, this.y - 28, 56, 28)
      : new Phaser.Geom.Rectangle(x - 13, this.y - 64, 26, 62);
  }

  // ── Bucle ──

  update(_time: number, deltaMs: number): void {
    this.inp.update();
    if (this.inClass) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    if (this.running && !this.pause.paused() && !this.dialogue.active) {
      this.step(dt);
    }
    this.syncCamera(false, dt);
    this.syncEraser(dt);
    this.iris.setPosition(this.dist, this.y);
    this.halo
      .setPosition(this.dist, this.y - (this.sliding > 0 ? 16 : 36))
      .setVisible(this.iris.visible);
  }

  private step(dt: number): void {
    // Entrada con tolerancias: se puede saltar un poco después de dejar el borde
    // (coyote) y la pulsación se recuerda un momento antes de aterrizar (buffer).
    if (this.inp.justDown('jump')) this.jumpBuffer = 0.13;
    if (this.inp.justDown('down')) this.onDown();
    this.jumpBuffer -= dt;
    this.coyote -= dt;
    if (this.jumpBuffer > 0 && (this.grounded || this.coyote > 0)) {
      this.jump();
    } else if (this.jumpBuffer > 0 && !this.grounded && this.airJumps > 0) {
      this.airJump();
    }

    // Avance
    const speed =
      this.speedAt(this.dist) * (this.slowed > 0 ? 0.55 : 1) * (this.insomnia ? 1.2 : 1);
    this.slowed -= dt;
    this.dist += speed * dt;

    // Física vertical (incluye plataforma punteada secreta del escalón 80)
    const plat = this.secretPlat;
    const onPlat = plat ? Math.abs(this.dist - plat.x) <= plat.w * 0.5 : false;
    const ground = this.groundAt(this.dist);
    const prevY = this.y;
    if (this.grounded) {
      const standingOnSecret = plat && onPlat && Math.abs(this.y - plat.y) < 4;
      if (standingOnSecret) {
        this.y = plat.y;
      } else if (ground === Infinity) {
        this.grounded = false;
        this.coyote = 0.09;
        this.vy = 0;
      } else {
        this.y = ground; // subir escalones es automático
      }
      if (plat && !onPlat && Math.abs(this.y - plat.y) < 4) {
        this.grounded = false;
        this.vy = 0;
      }
    }
    if (!this.grounded) {
      const holding = this.inp.isDown('jump');
      const g = this.vy < 0 ? (holding ? 1250 : 3000) : 2000;
      this.vy += g * dt;
      this.y += this.vy * dt;
      if (plat && onPlat && this.vy > 0 && prevY <= plat.y + 14 && this.y >= plat.y) {
        this.y = plat.y;
        this.vy = 0;
        this.grounded = true;
        this.airJumps = 1;
        AudioManager.sfx('land');
      } else if (this.vy > 0 && ground !== Infinity && this.y >= ground) {
        this.y = ground;
        this.vy = 0;
        this.grounded = true;
        this.airJumps = 1;
        AudioManager.sfx('land');
      }
      // Cayó en un borrón
      if (ground === Infinity && this.y > this.floorAt(this.dist) + 70) this.fellInGap();
    }

    if (this.sliding > 0) this.sliding -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.iris.setAlpha(this.invuln > 0 && Math.sin(this.dist * 0.25) > 0 ? 0.4 : 1);

    if (this.sliding > 0 && this.grounded) this.setPose('slide');
    else if (!this.grounded) this.setPose(this.vy < 0 ? 'jump' : 'drop');
    else this.setPose('run');

    // El borrador aprieta poco a poco (el primer tramo es para aprender)
    const basePressure =
      this.dist < EXAM_QUESTIONS[0].at ? (this.insomnia ? 2 : 0) : this.dist > STAIRS_END ? 6 : 4;
    const pressure = this.insomnia ? basePressure * 1.4 : basePressure;
    this.eraserGap -= pressure * dt;
    if (debug.flag('god')) this.eraserGap = Math.max(this.eraserGap, 200);
    if (this.eraserGap < ERASER_CATCH) {
      this.erased();
      return;
    }
    AudioManager.setMusicLevel(
      this.eraserGap < 150 ? 3 : this.dist >= STEP_56_X || this.dist > S.start ? 2 : 1,
    );

    this.updateGates();
    this.checkCollisions();
    this.updateStairs();
    this.updateCheckpoints();
    this.drawProgress();

    if (!this.sprintTold && this.dist > EXAM_QUESTIONS[4].at + 200) {
      this.sprintTold = true;
      AudioManager.sfx('bell');
      this.showToast(t('exam.sprint'), 1600);
    }
    if (this.dist >= EXAM_COURSE.length) this.finish();
  }

  private jump(): void {
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.grounded = false;
    this.sliding = 0;
    this.vy = -640;
    AudioManager.sfx('jump');
  }

  private airJump(): void {
    this.jumpBuffer = 0;
    this.airJumps = 0;
    this.sliding = 0;
    this.vy = -560;
    burst(this, this.dist, this.y - 8, 0xf2efe6, 8, 49);
    AudioManager.sfx('jump');
  }

  private onDown(): void {
    if (this.grounded) {
      if (this.sliding <= 0) {
        this.sliding = 0.55;
        AudioManager.sfx('slide');
      }
    } else {
      // Caer en picada
      this.vy = Math.max(this.vy, 820);
    }
  }

  // ── Cámara y borrador ──

  private syncCamera(snap: boolean, dt = 0.016): void {
    const target = GROUND_Y - this.floorAt(this.dist);
    this.camRise = snap ? target : this.camRise + (target - this.camRise) * Math.min(1, dt * 6);
    const cam = this.cameras.main;
    cam.scrollX = this.dist - PLAYER_X;
    cam.scrollY = -this.camRise;
    this.far.tilePositionX = cam.scrollX * 0.3;
    this.far.y = GROUND_Y - ART.farH - 6 + this.camRise * 0.08;
  }

  private syncEraser(dt: number): void {
    const cam = this.cameras.main;
    const ex = this.dist - this.eraserGap;
    const fy = this.floorAt(Math.max(ex, 0));
    const rub = Math.sin(this.time.now * 0.03) * 6;
    this.eraser.setPosition(ex + rub, fy + 14).setAngle(Math.sin(this.time.now * 0.02) * 3);
    this.wipeEdge.setPosition(ex - 60, cam.scrollY - 20);
    this.wipeFill.setPosition(ex - 59, cam.scrollY - 60);
    this.dustEmitter.setPosition(ex - 40, fy - 10);
    this.dustEmitter.frequency = this.running ? 40 : 200;
    // Cerca = pantalla temblorosa
    if (this.running && this.eraserGap < 140 && Math.random() < dt * 8) {
      this.cameras.main.shake(80, 0.002);
    }
  }

  // ── Reglas ──

  private updateGates(): void {
    for (const g of this.gates) {
      if (g.resolved) continue;
      const ahead = g.x - this.dist;
      if (!g.shown && ahead < 980 && ahead > 0) {
        g.shown = true;
        this.writeQuestion(t(EXAM_QUESTIONS[g.index].textKey), g.index >= 2);
        if (g.index === 0) this.showToast(t('exam.hintQuestion'), 2600);
      }
      if (ahead <= 0) this.resolveGate(g);
    }
  }

  /** El enunciado se escribe letra por letra, con su rechinido de gis. */
  private writeQuestion(text: string, redAct2 = false): void {
    this.tweens.killTweensOf(this.questionText);
    this.questionText
      .setColor(redAct2 ? '#ff9aa8' : CHALK.white)
      .setAlpha(1)
      .setText('');
    let i = 0;
    this.time.addEvent({
      delay: 18,
      repeat: text.length - 1,
      callback: () => {
        i++;
        this.questionText.setText(text.slice(0, i));
        if (i % 4 === 0) AudioManager.sfx('chalk');
      },
    });
  }

  private resolveGate(g: Gate): void {
    const q = EXAM_QUESTIONS[g.index];
    const high = !this.grounded && this.floorAt(this.dist) - this.y > 40;
    const chose: 'upper' | 'lower' = high ? 'upper' : 'lower';
    g.resolved = true;
    g.correct = chose === q.correct;
    const markY = chose === 'upper' ? g.upperY : g.lowerY;
    g.mark = this.add
      .image(g.x + 60, markY, g.correct ? 'exam-check' : 'exam-cross')
      .setDepth(31)
      .setScale(0);
    this.tweens.add({ targets: g.mark, scale: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: this.questionText, alpha: 0, delay: 500, duration: 500 });
    const slot = this.answerSlots[g.index];
    slot.setTexture(g.correct ? 'exam-check' : 'exam-cross').setVisible(true);
    if (g.correct) {
      AudioManager.sfx('right');
      this.eraserGap = Math.min(ERASER_MAX, this.eraserGap + 90);
      floatingText(this, this.dist, this.y - 90, t('exam.right'), {
        fontFamily: FONT_HAND,
        fontSize: '22px',
        color: CHALK.green,
      });
    } else {
      AudioManager.sfx('wrong');
      this.eraserGap -= 60;
      this.showToast(t('exam.wrong'), 1500);
    }
  }

  private checkCollisions(): void {
    const pr = this.playerRect();
    for (const s of this.stars) {
      if (s.taken || Math.abs(s.x - this.dist) > 60) continue;
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          pr,
          new Phaser.Geom.Rectangle(s.x - 20, s.y - 20, 40, 40),
        )
      ) {
        s.taken = true;
        this.fireflies.add(s.x);
        SaveManager.collectFirefly('exam', s.index);
        this.ffText.setText(`${SaveManager.data.fireflies.exam}/6`);
        AudioManager.sfx('collect');
        burst(this, s.x, s.y, 0xffe08a, 14, 40);
        this.tweens.add({ targets: [s.sprite, s.glow], scale: 2.4, alpha: 0, duration: 400 });
      }
    }
    const card = this.secretCard;
    if (card && !card.taken && Math.abs(card.x - this.dist) < 55) {
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          pr,
          new Phaser.Geom.Rectangle(card.x - 24, card.y - 28, 48, 56),
        )
      ) {
        card.taken = true;
        this.foundSecret = true;
        SaveManager.markSecret('exam');
        showSecretBanner(this, t('exam.secret'));
        burst(this, card.x, card.y, 0xffe08a, 24, 52);
        this.tweens.add({ targets: card.box, scale: 1.8, alpha: 0, duration: 450 });
      }
    }

    for (const o of this.obstacles) {
      if (o.kind === 'hangingDesk' && this.twistDone && !o.dropped && o.x - this.dist < 420) {
        o.dropped = true;
        const targetY = o.restY ?? this.floorAt(o.x) - 36;
        this.tweens.add({ targets: o.sprite, y: targetY, duration: 240, ease: 'Bounce.out' });
        if (o.extra) {
          this.tweens.add({
            targets: o.extra,
            y: targetY - 44,
            duration: 240,
            ease: 'Bounce.out',
          });
        }
        AudioManager.sfx('chalk');
      }
    }

    if (this.invuln > 0) return;
    for (const o of this.obstacles) {
      if (Math.abs(o.x - this.dist) > 80) continue;
      const g = this.floorAt(o.x);
      let r: Phaser.Geom.Rectangle;
      switch (o.kind) {
        case 'bag':
          r = new Phaser.Geom.Rectangle(o.x - 16, g - 32, 32, 32);
          break;
        case 'desk':
          r = new Phaser.Geom.Rectangle(o.x - 30, g - 48, 60, 48);
          break;
        case 'hangingDesk': {
          const base = o.restY ?? g - 36;
          r = new Phaser.Geom.Rectangle(o.x - 26, base - 46, 52, 46);
          break;
        }
        case 'books':
          r = new Phaser.Geom.Rectangle(o.x - 19, g - 84, 38, 84);
          break;
        case 'plane':
          r = new Phaser.Geom.Rectangle(o.x - 26, g - 86, 52, 22);
          break;
        case 'bell':
          // incluye el cordón: no se puede saltar por encima
          r = new Phaser.Geom.Rectangle(o.x - 20, g - 900, 40, 856);
          break;
      }
      if (Phaser.Geom.Intersects.RectangleToRectangle(pr, r)) {
        this.stumble();
        return;
      }
    }
  }

  private stumble(): void {
    AudioManager.sfx('hit');
    this.cameras.main.shake(180, 0.008);
    this.invuln = 1.1;
    this.slowed = 0.45;
    this.eraserGap -= 85;
    floatingText(this, this.dist, this.y - 90, t('exam.stumble'), {
      fontFamily: FONT_HAND,
      fontSize: '22px',
      color: '#ff9a8a',
    });
  }

  private fellInGap(): void {
    const gap = EXAM_COURSE.gaps.find(([gx, gw]) => this.dist > gx && this.dist < gx + gw + 20);
    AudioManager.sfx('erase');
    this.eraserGap -= 110;
    this.dist = gap ? gap[0] + gap[1] + 24 : this.dist + 60;
    this.y = this.floorAt(this.dist);
    this.vy = 0;
    this.grounded = true;
    this.airJumps = 1;
    this.invuln = 1.2;
    this.showToast(t('exam.fell'), 1600);
    this.time.delayedCall(80, () => AudioManager.sfx('chalk'));
  }

  private updateStairs(): void {
    const onStairs = this.dist >= S.start && this.dist < STAIRS_END;
    if (onStairs && this.stairsToldAt < 0) {
      this.stairsToldAt = this.dist;
      this.showToast(t('exam.stairs'), 3000);
    }
    if (onStairs) {
      const n = Math.min(S.steps, Math.floor((this.dist - S.start) / ART.stepW) + 1);
      if (n !== this.lastStep) {
        this.lastStep = n;
        this.stepCounter.setText(String(n)).setAlpha(0.9);
        if (n % 10 === 0) AudioManager.sfx('count');
      }
      if (n >= 56 && !this.twistDone) {
        this.triggerAct2Twist();
      }
    } else if (this.lastStep > 0 && this.dist >= STAIRS_END && this.stepCounter.alpha > 0) {
      if (this.lastStep !== S.steps) {
        this.lastStep = S.steps;
        this.stepCounter.setText(String(S.steps));
        AudioManager.sfx('right');
        this.showToast(t('exam.upstairs'), 2000);
        this.tweens.add({ targets: this.stepCounter, alpha: 0, delay: 1200, duration: 600 });
      }
    }
  }

  private triggerAct2Twist(): void {
    this.twistDone = true;
    this.act = 2;
    this.actText.setText(this.insomnia ? `${t('ui.act2')} · ☾` : t('ui.act2')).setColor('#ff9aa8');
    AudioManager.sfx('bell');
    this.cameras.main.shake(280, 0.008);
    this.eraserGap = Math.max(ERASER_CATCH + 120, this.eraserGap - 75);
    showActBanner(this, t('exam.act2'), CHALK.pink);
    this.showToast(t('exam.twist'), 3400);
    // Marcas viejas de gis rojo en el pizarrón detrás de la escalera alta
    this.add
      .text(STEP_56_X + 260, this.floorAt(STEP_56_X) - 180, t('exam.board.absent'), {
        fontFamily: FONT_CHALK,
        fontSize: '20px',
        color: '#ff9aa8',
      })
      .setAngle(-4)
      .setAlpha(0.38)
      .setDepth(4);
  }

  private updateCheckpoints(): void {
    for (const c of EXAM_COURSE.checkpoints) {
      if (this.dist >= c && c > this.checkpoint) this.checkpoint = c;
    }
  }

  /** Te alcanzó el borrador: vuelves al último punto de control. */
  private erased(): void {
    this.running = false;
    AudioManager.sfx('erase');
    this.cameras.main.flash(500, 230, 236, 226);
    this.tweens.add({ targets: this.iris, alpha: 0, duration: 400 });
    this.timesErased += 1;
    this.time.delayedCall(500, () => {
      this.dialogue.say(
        this.timesErased === 1
          ? [
              { who: null, text: t('exam.erased.1') },
              { who: null, text: t('exam.erased.2') },
            ]
          : [{ who: null, text: t('exam.erased.2') }],
        () => {
          this.dist = this.checkpoint;
          this.y = this.floorAt(this.dist);
          this.vy = 0;
          this.grounded = true;
          this.airJumps = 1;
          this.sliding = 0;
          this.eraserGap = this.insomnia ? ERASER_START - 60 : ERASER_START;
          this.invuln = 1.2;
          this.lastStep = 0;
          this.stepCounter.setAlpha(0);
          // Las preguntas que quedaron adelante se pueden volver a contestar
          for (const g of this.gates) {
            if (g.x > this.checkpoint && g.resolved) {
              g.resolved = false;
              g.shown = false;
              g.mark?.destroy();
              g.mark = undefined;
              this.answerSlots[g.index].setVisible(false);
            }
          }
          this.syncCamera(true);
          this.iris.setAlpha(1);
          AudioManager.sfx('chalk');
          this.running = true;
        },
      );
    });
  }

  private correctCount(): number {
    return this.gates.filter((g) => g.correct).length;
  }

  // ── Final: el salón 3º B ──

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    this.setPose('idle');
    AudioManager.sfx('door');
    this.cameras.main.fadeOut(600, 35, 57, 47);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.classroom());
  }

  private classroom(): void {
    this.inClass = true;
    this.act = 3;
    this.halo.setVisible(false);
    // Todo el pasillo se esconde; el salón ocupa la pantalla
    this.children.list.forEach((c) => {
      (c as Phaser.GameObjects.GameObject & { setVisible?: (v: boolean) => void }).setVisible?.(
        false,
      );
    });
    this.dustEmitter.stop();
    const cam = this.cameras.main;
    cam.scrollX = 0;
    cam.scrollY = 0;
    AudioManager.setMusicLevel(0);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'exam-class').setDepth(0);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'exam-frame').setDepth(90);

    const elmer = addStyled(this, 520, 392, 'elmer', STYLE, { feet: true, scale: 1.1 }).setDepth(
      20,
    );
    elmer.play(styledKey('elmer-idle', STYLE));
    const morfeo = addStyled(this, 150, 300, 'morfeo', STYLE, { feet: true })
      .setDepth(20)
      .setAlpha(0);
    morfeo.play(styledKey('morfeo-idle', STYLE));
    this.iris.setVisible(true).setAlpha(1).setPosition(-40, 400).setDepth(30);
    this.setPose('run');

    // En el pizarrón del aula ya viene escrito «TARDE · REPROBADO»
    const tardeText = this.add
      .text(370, 148, t('exam.board.tarde'), {
        fontFamily: FONT_CHALK,
        fontSize: '28px',
        color: '#ff9aa8',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(12);

    const boardText = this.add
      .text(370, 128, '', {
        fontFamily: FONT_CHALK,
        fontSize: '25px',
        color: CHALK.white,
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0)
      .setDepth(11);

    const classEraser = this.add
      .image(-60, 392, 'exam-eraser')
      .setOrigin(0.5, 1)
      .setScale(0.85)
      .setDepth(35)
      .setAlpha(0);

    cam.fadeIn(700, 35, 57, 47);
    showActBanner(this, t('exam.act3'), CHALK.yellow);
    this.tweens.add({
      targets: this.iris,
      x: 400,
      duration: 1400,
      ease: 'Sine.out',
      onComplete: () => {
        this.setPose('idle');
        this.classDialogue(elmer, morfeo, boardText, tardeText, classEraser);
      },
    });
  }

  private classDialogue(
    elmer: Phaser.GameObjects.Sprite,
    morfeo: Phaser.GameObjects.Sprite,
    boardText: Phaser.GameObjects.Text,
    tardeText: Phaser.GameObjects.Text,
    classEraser: Phaser.GameObjects.Image,
  ): void {
    const n = this.correctCount();
    SaveManager.recordExam(n);
    // Lo que Élmer escribe en el pizarrón, en orden aunque se adelante el diálogo
    let queue = Promise.resolve();
    const write = (text: string, then?: () => void) => {
      queue = queue.then(
        () =>
          new Promise<void>((resolve) => {
            let i = 0;
            const base = boardText.text;
            this.time.addEvent({
              delay: 55,
              repeat: text.length - 1,
              callback: () => {
                i++;
                boardText.setText(base + text.slice(0, i));
                if (i % 2 === 0) AudioManager.sfx('chalk');
                if (i === text.length) {
                  resolve();
                  then?.();
                }
              },
            });
          }),
      );
    };
    this.dialogue.say(
      [
        { who: null, text: t('exam.class.1') },
        { who: 'elmer', text: t('exam.class.2') },
        { who: 'elmer', text: t('exam.class.3') },
        { who: 'iris', text: t('exam.class.4') },
        { who: 'iris', text: t('exam.class.5') },
        {
          who: 'elmer',
          text: t('exam.class.6'),
          action: () => {
            this.tweens.add({ targets: morfeo, alpha: 1, duration: 600 });
            classEraser.setAlpha(1);
            this.tweens.add({
              targets: classEraser,
              x: 205,
              duration: 700,
              ease: 'Sine.out',
            });
          },
        },
        {
          who: 'iris',
          text: t('exam.class.7'),
        },
      ],
      () => {
        this.runWipeChallenge(tardeText, classEraser, () => {
          const postLines: {
            who: 'elmer' | 'morfeo' | 'iris' | null;
            text: string;
            action?: () => void;
          }[] = [
            {
              who: 'elmer',
              text: t('exam.class.8'),
              action: () => {
                const gis = addStyled(
                  this,
                  this.iris.x + 20,
                  this.iris.y - 50,
                  'gis',
                  STYLE,
                ).setDepth(40);
                this.tweens.add({
                  targets: gis,
                  x: elmer.x,
                  y: elmer.y - 60,
                  duration: 750,
                  ease: 'Sine.inOut',
                  onComplete: () => gis.destroy(),
                });
              },
            },
          ];
          if (this.foundSecret) {
            postLines.push({ who: null, text: t('exam.secretTalk') });
          }
          postLines.push(
            {
              who: null,
              text: t('exam.class.9'),
              action: () => {
                elmer.anims.stop();
                elmer.setTexture(styledKey('elmer', STYLE), '1');
                this.tweens.add({ targets: elmer, x: 630, y: 290, duration: 900 });
                write(t('exam.board.name'));
              },
            },
            { who: 'elmer', text: t('exam.class.10') },
          );
          this.dialogue.say(postLines, () => {
            write(`\n${t('exam.board.grade', { n })}\n${t(`exam.grade.${n}` as TextKey)}`, () => {
              this.time.delayedCall(900, () => this.giveBack());
            });
          });
        });
      },
    );
  }

  /** Clímax del Acto III: tomar el borrador enemigo y borrar «TARDE · REPROBADO». */
  private runWipeChallenge(
    tardeText: Phaser.GameObjects.Text,
    classEraser: Phaser.GameObjects.Image,
    onCleared: () => void,
  ): void {
    const promptBg = this.add
      .rectangle(GAME_WIDTH / 2, 468, 720, 44, 0x16261f, 0.88)
      .setStrokeStyle(2, 0xffe08a, 0.85)
      .setDepth(65);
    const promptTxt = this.add
      .text(
        GAME_WIDTH / 2,
        468,
        this.inp.isTouch ? t('exam.ruleBreakTouch') : t('exam.ruleBreakPrompt'),
        { fontFamily: FONT_HAND, fontSize: '18px', color: CHALK.yellow, align: 'center' },
      )
      .setOrigin(0.5)
      .setDepth(66);

    const glow = this.add
      .image(classEraser.x, classEraser.y - 26, 'glow-gold')
      .setScale(2.4)
      .setAlpha(0.75)
      .setDepth(34);
    this.tweens.add({
      targets: glow,
      scale: 3,
      alpha: 0.35,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    let wiped = 0;
    let done = false;
    let dragging = false;

    const advanceWipe = (amount: number, px = 370, py = 148) => {
      if (done) return;
      wiped = Math.min(1, wiped + amount);
      tardeText.setAlpha(Math.max(0, 1 - wiped));
      classEraser.setPosition(px, py + 14);
      glow.setPosition(px, py);
      burst(this, px + Phaser.Math.Between(-45, 45), py, 0xf2efe6, 6, 45);
      AudioManager.sfx('erase');
      if (wiped >= 1) {
        done = true;
        tardeText.destroy();
        glow.destroy();
        promptBg.destroy();
        promptTxt.destroy();
        classEraser.setOrigin(0.5, 1);
        this.tweens.add({ targets: classEraser, alpha: 0, duration: 400 });
        burst(this, 370, 148, 0xffe08a, 24, 48);
        AudioManager.sfx('right');
        this.time.delayedCall(350, onCleared);
      }
    };

    const onDown = (p: Phaser.Input.Pointer) => {
      dragging = true;
      classEraser.setOrigin(0.5, 0.5);
      advanceWipe(0.35, Phaser.Math.Clamp(p.x, 220, 520), Phaser.Math.Clamp(p.y, 110, 260));
    };
    const onMove = (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown || done) return;
      classEraser.setPosition(p.x, p.y);
      glow.setPosition(p.x, p.y);
      if (Math.abs(p.x - 370) < 170 && Math.abs(p.y - 155) < 75) {
        advanceWipe(0.055, p.x, p.y);
      }
    };
    const onUp = () => {
      dragging = false;
    };
    const onKey = () => {
      const rx = 310 + ((wiped * 180) % 120);
      advanceWipe(0.35, rx, 148);
    };

    this.input.on('pointerdown', onDown);
    this.input.on('pointermove', onMove);
    this.input.on('pointerup', onUp);
    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', onKey);
    kb?.on('keydown-ENTER', onKey);
    kb?.on('keydown-E', onKey);
    kb?.on('keydown-RIGHT', onKey);
    kb?.on('keydown-UP', onKey);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', onDown);
      this.input.off('pointermove', onMove);
      this.input.off('pointerup', onUp);
      kb?.off('keydown-SPACE', onKey);
      kb?.off('keydown-ENTER', onKey);
      kb?.off('keydown-E', onKey);
      kb?.off('keydown-RIGHT', onKey);
      kb?.off('keydown-UP', onKey);
    });
  }

  private giveBack(): void {
    AudioManager.sfx('key');
    AudioManager.sfx('win');
    showReturnCard(this, 'chalk', t('exam.keyGet'), t('exam.fragment'), 'gis');
    SaveManager.markCompleted('exam', this.insomnia);
    SaveManager.recordFireflies('exam', this.fireflies.size);
    this.time.delayedCall(4200, () => fadeToScene(this, 'Hub', undefined, 900));
  }
}
