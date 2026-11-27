import { DEPTH, DREAM_SCENE, FONT, H, W, txt, type DreamId } from '../config';
import { css, makeCanvas, addTexture, rng } from '../gfx/canvas';
import { COACH_W, DOOR_X, FLOOR_Y, INK, WALL_TOP, halftone } from '../gfx/riso';
import { T, fmt, type Line } from '../i18n';
import { Audio } from '../systems/audio/Audio';
import { debug } from '../systems/debug';
import { Dialogue, THEMES } from '../systems/dialogue';
import { Juice } from '../systems/juice';
import {
  Save,
  clockMinutes,
  formatClock,
  ticketCount,
  trainAct,
  type AbelChoice,
} from '../systems/save';
import { Button, hint, keyNav, toast, wipeIn, wipeTo } from '../systems/ui';

type Section = 'coach' | 'comedor' | 'furgon' | 'loco';

interface Door {
  dream: DreamId;
  x: number;
  section: number;
  glow: Phaser.GameObjects.Rectangle;
  pane: Phaser.GameObjects.Rectangle;
}

/** Sección del tren → tipo y sueño (si tiene camarote). */
const LAYOUT: { type: Section; dream?: DreamId }[] = [
  { type: 'coach', dream: 'reme' },
  { type: 'coach', dream: 'samu' },
  { type: 'coach', dream: 'marisol' },
  { type: 'comedor' },
  { type: 'coach', dream: 'jairo' },
  { type: 'coach', dream: 'chepe' },
  { type: 'coach', dream: 'efrain' },
  { type: 'furgon' },
  { type: 'loco', dream: 'abel' },
];

/** Color de la luz que se filtra por debajo de cada puerta (técnica del sueño). */
const LEAK: Record<DreamId, number[]> = {
  reme: [0x9fc3a0, 0xe8b04a, 0xd8352e, 0x6b7f9e, 0xf4ead5],
  samu: [0xd8352e, 0xf2c230, 0x1e3a8a, 0x3aa655],
  marisol: [0x6fa8ff, 0xe6f0ff, 0x3a7bd5],
  jairo: [0xff3fa4, 0x3ff0ff, 0xffb23f],
  chepe: [0xd6262e, 0xf2c230, 0x1f9a4a, 0x2f5dd6],
  efrain: [0xcfd3dc, 0xf4f6fa, 0x9aa0ad],
  abel: [0xff4a4a],
  celeste: [0xffc861],
};

type Keys = Record<
  'left' | 'right' | 'a' | 'd' | 'up' | 'space' | 'enter',
  Phaser.Input.Keyboard.Key
>;

const WORLD_W = LAYOUT.length * COACH_W;
const SPEED = 280;

/** El Lucero por dentro: el hub. Cambia con los tres actos y lleva a cada sueño. */
export class Train extends Phaser.Scene {
  private dlg!: Dialogue;
  private cel!: Phaser.GameObjects.Sprite;
  private mecha!: Phaser.GameObjects.Sprite;
  private outside!: Phaser.GameObjects.TileSprite;
  private doors: Door[] = [];
  private targetX: number | null = null;
  private pendingDoor: Door | null = null;
  private panel: (Button | Phaser.GameObjects.GameObject)[] = [];
  private busy = false;
  private keys!: Keys;
  private barriers: Phaser.GameObjects.Container[] = [];
  private clocks: Phaser.GameObjects.Text[] = [];
  private hudTickets!: Phaser.GameObjects.Text;
  private act: 1 | 2 | 3 | 4 = 1;
  private exited = false;
  private announceAt = 0;
  private announceIdx = 0;
  private abel?: Phaser.GameObjects.Sprite;
  private walls: Phaser.GameObjects.Image[] = [];
  private redLight?: Phaser.GameObjects.Arc;

  constructor() {
    super('Train');
  }

  init(): void {
    this.doors = [];
    this.panel = [];
    this.barriers = [];
    this.clocks = [];
    this.walls = [];
    this.targetX = null;
    this.pendingDoor = null;
    this.busy = false;
    this.announceAt = 0;
  }

  create(data: { from?: DreamId; firstTime?: boolean; fromIntro?: boolean }): void {
    Save.data.started = true;
    Save.write();
    this.act = trainAct(Save.data);
    this.exited =
      !!Save.data.abelChoice && Save.data.abelChoice !== 'quedarse' && Save.data.dreams.abel.done;
    this.cameras.main.setBackgroundColor(INK.night);
    this.cameras.main.setBounds(0, 0, WORLD_W, H);
    this.buildWorld();
    this.dlg = new Dialogue(this, THEMES.riso, 'top');
    this.buildHud();
    this.applyActLook();

    // dónde aparece Celeste
    let startX = 380;
    if (data?.from) {
      const d = this.doors.find((x) => x.dream === data.from);
      if (d) startX = d.x - 90;
      if (data.from === 'celeste') startX = 8 * COACH_W + 300;
    }
    this.cel = this.add
      .sprite(startX, FLOOR_Y + 14, 'celeste-riso', 8)
      .setOrigin(0.5, 1)
      .setDepth(500)
      .setScale(1.35);
    this.mecha = this.add
      .sprite(startX + 30, FLOOR_Y - 60, 'mecha-riso', this.mechaGlass())
      .setDepth(501)
      .setScale(1.1);
    this.cameras.main.startFollow(this.cel, true, 0.12, 0.12, 0, 40);
    this.cameras.main.centerOn(startX, H / 2);

    this.keys = this.input.keyboard!.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      a: 'A',
      d: 'D',
      up: 'UP',
      space: 'SPACE',
      enter: 'ENTER',
    }) as Keys;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTap(p));

    Audio.music(this.exited ? 'dawn' : this.act >= 2 ? 'night' : 'train', this.act >= 3 ? 1 : 0);
    wipeIn(this, INK.night);
    void this.story(data ?? {});
  }

  private mechaGlass(): number {
    if (this.exited) return 1;
    return 0;
  }

  // ---------------- Mundo ----------------

  private buildWorld(): void {
    // exterior (fijo a la cámara, se desplaza solo)
    this.outside = this.add
      .tileSprite(0, 96, W, 150, this.exited ? 'riso-dawn' : 'riso-tunnel')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(0);
    if (!this.exited && this.act >= 2) this.outside.setTint(this.act >= 3 ? 0xb0a0ff : 0x8fa6ff);

    LAYOUT.forEach((sec, i) => {
      const x0 = i * COACH_W;
      if (sec.type === 'coach' || sec.type === 'comedor') {
        const wall = this.add.image(x0, WALL_TOP, 'riso-wall').setOrigin(0).setDepth(10);
        this.walls.push(wall);
      } else {
        this.buildSolidWall(x0, sec.type);
      }
      const floor = this.add
        .tileSprite(x0, FLOOR_Y, COACH_W, 100, 'riso-floor')
        .setOrigin(0)
        .setDepth(11);
      if (sec.type === 'loco') floor.setTint(0x7a7a9a);
      // techo y lámparas
      this.add.rectangle(x0, 0, COACH_W, WALL_TOP, INK.navy).setOrigin(0).setDepth(12);
      for (const lx of [200, 550, 900]) {
        if (sec.type === 'loco') break;
        this.add
          .image(x0 + lx, 40, 'riso-halo')
          .setDepth(13)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.65)
          .setScale(1.3);
        this.add.image(x0 + lx, 44, 'riso-lamp').setDepth(14);
      }
      // nombre del coche
      const name = T.train.coachNames[i];
      this.add
        .text(
          x0 + 60,
          50,
          name.toUpperCase(),
          txt(18, '#1b1f3b', FONT.display, { fontStyle: '800' }),
        )
        .setDepth(15);
      // reloj del pasillo
      if (sec.type !== 'loco') {
        this.add
          .circle(x0 + COACH_W - 70, 66, 17, INK.cream)
          .setStrokeStyle(3, INK.navy)
          .setDepth(15);
        const ct = this.add
          .text(
            x0 + COACH_W - 70,
            92,
            formatClock(clockMinutes(Save.data)),
            txt(15, '#ffd23f', FONT.display, {
              fontStyle: '800',
              stroke: '#1b1f3b',
              strokeThickness: 4,
            }),
          )
          .setOrigin(0.5)
          .setDepth(15);
        this.clocks.push(ct);
      }
      if (sec.type === 'coach' && sec.dream) this.buildDoor(i, sec.dream);
      if (sec.type === 'comedor') this.buildComedor(x0);
      if (sec.type === 'loco') this.buildLoco(x0);
      // fuelle entre coches
      if (i > 0) {
        this.add
          .rectangle(x0, WALL_TOP, 26, FLOOR_Y - WALL_TOP + 100, 0x0e1028)
          .setOrigin(0.5, 0)
          .setDepth(30);
        for (let k = 0; k < 8; k++)
          this.add.rectangle(x0, WALL_TOP + 30 + k * 50, 30, 4, INK.blue).setDepth(31);
      }
    });
    this.buildBarriers();
    this.add
      .tileSprite(0, 0, W, H, 'riso-grain')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.overlay - 1)
      .setAlpha(0.45);
  }

  private buildSolidWall(x0: number, type: Section): void {
    const key = `riso-wall-${type}`;
    if (!this.textures.exists(key)) {
      const [c, ctx] = makeCanvas(COACH_W, FLOOR_Y - WALL_TOP);
      ctx.fillStyle = css(type === 'loco' ? 0x2a3a52 : 0x4a3a2e);
      ctx.fillRect(0, 0, COACH_W, FLOOR_Y - WALL_TOP);
      halftone(ctx, 0, 0, COACH_W, FLOOR_Y - WALL_TOP, INK.blue, (_x, y) => 0.2 + y / 1200, 6);
      const r = rng(type === 'loco' ? 8 : 9);
      if (type === 'furgon') {
        // costales y cajas de correo
        for (let i = 0; i < 14; i++) {
          const x = 40 + r() * (COACH_W - 120);
          const y = 220 + r() * 140;
          ctx.fillStyle = css(r() < 0.5 ? 0xb0703a : 0xd8c39a);
          ctx.beginPath();
          ctx.roundRect(x, y, 60 + r() * 60, 400 - y, 10);
          ctx.fill();
          halftone(ctx, x, y, 100, 400 - y, INK.pink, () => 0.2, 5);
        }
        ctx.fillStyle = css(INK.yellow);
        ctx.font = '800 26px "Big Shoulders Display"';
        ctx.fillText('CORREO · MAGDALENA', 380, 120);
      }
      addTexture(this, key, c);
    }
    const im = this.add.image(x0, WALL_TOP, key).setOrigin(0).setDepth(10);
    this.walls.push(im);
  }

  private buildDoor(i: number, dream: DreamId): void {
    const x = i * COACH_W + DOOR_X;
    const done = Save.dream(dream).done;
    const pane = this.add
      .rectangle(x - 0, 251, 70, 80, LEAK[dream][0], done ? 0.55 : 0.9)
      .setDepth(9);
    this.add
      .image(x, FLOOR_Y + 2, 'riso-door')
      .setOrigin(0.5, 1)
      .setDepth(20);
    const glow = this.add.rectangle(x, FLOOR_Y + 4, 120, 10, LEAK[dream][0], 0.9).setDepth(21);
    this.add
      .text(
        x - 50,
        216,
        `${i < 3 ? i + 1 : i}`,
        txt(20, '#ffd23f', FONT.display, { fontStyle: '800' }),
      )
      .setDepth(22);
    const door: Door = { dream, x, section: i, glow, pane };
    this.doors.push(door);
    if (done) {
      glow.setFillStyle(0xffd88a, 0.6);
      this.drawKeepsake(dream, x + 92, FLOOR_Y + 6);
      if (Save.dream(dream).madrugada) {
        this.add
          .text(x, 176, '☾', txt(26, '#ffd23f', FONT.body))
          .setOrigin(0.5)
          .setDepth(22);
      }
    } else {
      // luz que se cuela: partículas en los colores del sueño
      this.time.addEvent({
        delay: 180,
        loop: true,
        callback: () => {
          const cols = LEAK[dream];
          const p = this.add
            .rectangle(
              x + (Math.random() - 0.5) * 110,
              FLOOR_Y + 4,
              dream === 'marisol' ? 10 : 4,
              4,
              cols[Math.floor(Math.random() * cols.length)],
            )
            .setDepth(22);
          if (dream === 'jairo') p.setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: p,
            y: FLOOR_Y + 30 + Math.random() * 30,
            x: p.x + (Math.random() - 0.5) * 60,
            alpha: 0,
            duration: 900,
            onComplete: () => p.destroy(),
          });
        },
      });
      this.tweens.add({
        targets: [glow, pane],
        alpha: 0.45,
        duration: 700 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  /** Recuerdo que deja cada pasajero en la puerta. */
  private drawKeepsake(dream: DreamId, x: number, y: number): void {
    const g = this.add.graphics().setDepth(23);
    g.lineStyle(2, INK.navy, 1);
    switch (dream) {
      case 'reme':
        g.fillStyle(0xb0703a, 1)
          .fillEllipse(x, y - 14, 34, 26)
          .strokeEllipse(x, y - 14, 34, 26);
        g.fillStyle(0x6a3a1a, 1).fillRect(x - 18, y - 26, 36, 5);
        break;
      case 'samu':
        g.fillStyle(0xf4f4f4, 1)
          .fillCircle(x, y - 12, 12)
          .strokeCircle(x, y - 12, 12);
        g.fillStyle(0x1b1f3b, 1).fillCircle(x - 3, y - 14, 4);
        break;
      case 'marisol':
        g.fillStyle(0x6fa8ff, 1).fillTriangle(x - 16, y, x + 16, y, x - 16, y - 30);
        g.strokeTriangle(x - 16, y, x + 16, y, x - 16, y - 30);
        break;
      case 'jairo':
        for (const dx of [-8, 8]) {
          g.fillStyle(dx < 0 ? 0xff5fa2 : 0xffd23f, 1)
            .fillEllipse(x + dx, y - 22, 14, 18)
            .strokeEllipse(x + dx, y - 22, 14, 18);
          g.lineBetween(x + dx, y - 13, x + dx, y);
        }
        break;
      case 'chepe':
        g.fillStyle(0xf4ead5, 1)
          .fillRect(x - 10, y - 30, 20, 28)
          .strokeRect(x - 10, y - 30, 20, 28);
        g.fillStyle(0x2f5dd6, 1).fillCircle(x, y - 18, 6);
        break;
      case 'efrain':
        g.lineStyle(2, 0xcfd3dc, 1).strokeEllipse(x, y - 10, 26, 12);
        g.fillStyle(0xcfd3dc, 1).fillTriangle(x + 12, y - 10, x + 22, y - 18, x + 22, y - 2);
        break;
    }
  }

  private buildComedor(x0: number): void {
    for (const tx of [180, 520, 860]) {
      this.add
        .rectangle(x0 + tx, 360, 150, 14, 0xf4ead5)
        .setStrokeStyle(2, INK.navy)
        .setDepth(25);
      this.add.rectangle(x0 + tx, 400, 10, 80, INK.navy).setDepth(24);
      this.add
        .rectangle(x0 + tx - 30, 344, 12, 18, 0xffffff)
        .setStrokeStyle(2, INK.navy)
        .setDepth(26); // vaso de tinto
    }
    this.add
      .text(
        x0 + 470,
        200,
        'TINTO · AGUAPANELA · ALMOJÁBANA',
        txt(20, '#1b1f3b', FONT.display, { fontStyle: '800' }),
      )
      .setDepth(15)
      .setAngle(-2);
    if (this.act >= 2 && !Save.data.dreams.abel.done) {
      this.abel = this.add
        .sprite(x0 + 560, FLOOR_Y + 14, 'riso-abel', 8)
        .setOrigin(0.5, 1)
        .setDepth(400)
        .setFlipX(true)
        .setScale(1.35);
      this.abel.setVisible(false);
    }
  }

  private buildLoco(x0: number): void {
    // parabrisas con la vía al frente
    const ws = this.add
      .rectangle(x0 + 700, 190, 420, 170, 0x0b0d22)
      .setStrokeStyle(10, 0xd9b45a)
      .setDepth(15);
    void ws;
    const rails = this.add.graphics().setDepth(16);
    rails.lineStyle(3, INK.pink, 0.8);
    rails.lineBetween(x0 + 690, 270, x0 + 620, 275);
    rails.lineBetween(x0 + 710, 270, x0 + 780, 275);
    if (this.exited) {
      this.add.rectangle(x0 + 700, 190, 400, 150, 0xffc0a0).setDepth(15);
      this.add.circle(x0 + 700, 230, 34, INK.yellow).setDepth(16);
    } else {
      this.redLight = this.add.circle(x0 + 700, 190, 10, 0xff3030).setDepth(17);
      this.add
        .image(x0 + 700, 190, 'riso-halo')
        .setTint(0xff3030)
        .setScale(0.6)
        .setDepth(16)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: this.redLight,
        alpha: 0.5,
        duration: 900,
        yoyo: true,
        repeat: -1,
      });
    }
    // tablero
    this.add
      .rectangle(x0 + 700, 360, 520, 70, 0x1f3550)
      .setStrokeStyle(4, INK.navy)
      .setDepth(18);
    for (let k = 0; k < 6; k++)
      this.add
        .circle(x0 + 480 + k * 80, 360, 16, INK.cream)
        .setStrokeStyle(3, INK.navy)
        .setDepth(19);
    // Abel de espaldas en la cabina
    if (!Save.data.dreams.abel.done || !this.exited) {
      this.add
        .sprite(x0 + 640, FLOOR_Y + 14, 'riso-abel', 8)
        .setOrigin(0.5, 1)
        .setDepth(300)
        .setScale(1.35);
    }
    // puerta de cabina = interacción con el sueño de Abel
    const glow = this.add.rectangle(x0 + 420, FLOOR_Y + 4, 100, 10, 0xff4a4a, 0.8).setDepth(21);
    const pane = this.add.rectangle(x0 + 420, 260, 1, 1, 0, 0).setDepth(9);
    this.add
      .rectangle(x0 + 420, FLOOR_Y - 120, 110, 240, 0x3a2a22)
      .setStrokeStyle(5, 0xd9b45a)
      .setDepth(20);
    this.add
      .text(
        x0 + 420,
        FLOOR_Y - 200,
        'CABINA',
        txt(18, '#ffd23f', FONT.display, { fontStyle: '800' }),
      )
      .setOrigin(0.5)
      .setDepth(22);
    this.doors.push({ dream: 'abel', x: x0 + 420, section: 8, glow, pane });
  }

  /** Puertas entre secciones cerradas según el acto. */
  private buildBarriers(): void {
    const mk = (sectionIdx: number, label: string) => {
      const x = sectionIdx * COACH_W;
      const c = this.add.container(x, 0).setDepth(40);
      const r = this.add
        .rectangle(0, WALL_TOP, 60, FLOOR_Y - WALL_TOP + 100, INK.navy)
        .setOrigin(0.5, 0);
      const stripes = this.add.graphics();
      stripes.fillStyle(INK.yellow, 1);
      for (let y = WALL_TOP + 20; y < FLOOR_Y + 80; y += 40) stripes.fillRect(-30, y, 60, 14);
      const t = this.add
        .text(
          0,
          250,
          label,
          txt(16, '#ff5fa2', FONT.display, { fontStyle: '800', align: 'center' }),
        )
        .setOrigin(0.5)
        .setAngle(-90);
      c.add([r, stripes, t]);
      return c;
    };
    if (this.act < 2) this.barriers.push(mk(4, 'SOLO PERSONAL'));
    if (this.act < 3) this.barriers.push(mk(7, 'SOLO PERSONAL'));
  }

  private openBarrier(): void {
    const b = this.barriers.shift();
    if (!b) return;
    Audio.sfx('door');
    Juice.shake(this, 0.004, 200);
    this.tweens.add({
      targets: b,
      y: -H,
      duration: 900,
      ease: 'Cubic.easeIn',
      onComplete: () => b.destroy(),
    });
  }

  /** Límite derecho caminable según el acto. */
  private maxX(): number {
    if (this.act < 2) return 4 * COACH_W - 60;
    if (this.act < 3) return 7 * COACH_W - 60;
    return WORLD_W - 120;
  }

  private applyActLook(): void {
    let tint = 0xffffff;
    if (this.exited) tint = 0xffe6c8;
    else if (this.act === 2) tint = 0xb4c2ff;
    else if (this.act >= 3) tint = 0xc4b0ff;
    for (const w of this.walls) w.setTint(tint);
    if (this.act >= 2 && !this.exited) this.buildRoots();
  }

  /** Acto II: el túnel se mete al tren (raíces y agua). */
  private buildRoots(): void {
    const g = this.add.graphics().setDepth(16);
    const r = rng(21);
    for (let i = 0; i < 70; i++) {
      const x = 4 * COACH_W * 0 + r() * WORLD_W;
      const len = 40 + r() * 120;
      g.lineStyle(3 + r() * 4, r() < 0.5 ? INK.teal : INK.navy, 0.9);
      g.beginPath();
      g.moveTo(x, WALL_TOP);
      for (let k = 1; k <= 6; k++) g.lineTo(x + Math.sin(k + i) * 10, WALL_TOP + (len * k) / 6);
      g.strokePath();
    }
    for (let i = 0; i < 22; i++) {
      const x = r() * WORLD_W;
      this.add.ellipse(x, FLOOR_Y + 60 + r() * 30, 80 + r() * 90, 12, INK.blue, 0.55).setDepth(12);
    }
  }

  // ---------------- HUD ----------------

  private buildHud(): void {
    this.add
      .rectangle(12, 12, 200, 36, 0x0e0a1a, 0.6)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.hudTickets = this.add
      .text(24, 19, '', txt(18, '#ffd23f', FONT.display, { fontStyle: '800' }))
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 1);
    this.refreshHud();
    const lib = new Button(
      this,
      W - 210,
      30,
      T.ui.libreta,
      () => {
        if (this.busy || this.dlg.open) return;
        wipeTo(this, 'Libreta', { back: 'Train' });
      },
      { w: 130, h: 38, size: 18 },
    );
    const menu = new Button(
      this,
      W - 68,
      30,
      '≡',
      () => {
        if (this.busy || this.dlg.open) return;
        wipeTo(this, 'Menu');
      },
      { w: 60, h: 38, size: 22 },
    );
    void lib;
    void menu;
  }

  private refreshHud(): void {
    this.hudTickets.setText(`${T.ui.tickets} ${ticketCount(Save.data)}/40`);
  }

  // ---------------- Historia ----------------

  private say(lines: Line[]): Promise<void> {
    return this.dlg.sayAsync(lines);
  }

  private async story(data: {
    from?: DreamId;
    firstTime?: boolean;
    fromIntro?: boolean;
  }): Promise<void> {
    this.busy = true;
    if (debug.flag('choice') && Save.data.dreams.abel.done && !Save.data.abelChoice) {
      // depuración: saltar directo a la elección
    }
    if (!Save.hasSeen('firstVisit')) {
      await this.wait(500);
      await this.say(T.train.firstVisit);
      Save.markSeen('firstVisit');
      hint(this, T.train.howTo, 6000);
    }
    if (data.from && data.firstTime && data.from in T.train.afterDream) {
      await this.wait(400);
      this.advanceClocks();
      await this.say(T.train.afterDream[data.from as keyof typeof T.train.afterDream]);
    }
    // Acto I → II
    if (this.act >= 2 && !Save.hasSeen('abelReveal')) await this.abelReveal();
    // Acto II → III
    if (this.act >= 3 && !Save.hasSeen('mechaConfession')) {
      await this.wait(300);
      await this.say(T.train.mechaConfession);
      Save.markSeen('mechaConfession');
      this.openBarrier();
    }
    // Después del sueño de Abel: la elección
    if (Save.data.dreams.abel.done && !Save.data.abelChoice) {
      await this.abelChoice();
      return;
    }
    // Después del sueño de Celeste: el final
    if (data.from === 'celeste' && Save.data.dreams.celeste.done) {
      await this.wait(600);
      wipeTo(this, 'Ending');
      return;
    }
    this.busy = false;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, res));
  }

  private advanceClocks(): void {
    const t = formatClock(clockMinutes(Save.data));
    for (const c of this.clocks) {
      this.tweens.add({
        targets: c,
        scale: 1.5,
        duration: 200,
        yoyo: true,
        onYoyo: () => c.setText(t),
      });
    }
    Audio.drum('tick', 0.6);
  }

  private async abelReveal(): Promise<void> {
    const x0 = 3 * COACH_W;
    this.cameras.main.stopFollow();
    this.cel.setX(x0 + 300).setFrame(8);
    this.mecha.setX(x0 + 330);
    this.cameras.main.pan(x0 + 450, H / 2, 900, 'Sine.easeInOut');
    await this.wait(950);
    this.abel?.setVisible(true);
    Audio.music('night', 0);
    await this.say(T.train.abelReveal);
    if (this.abel) {
      this.abel.setFlipX(false).play('walk-abel');
      this.tweens.add({
        targets: this.abel,
        x: x0 + 1300,
        duration: 2200,
        onComplete: () => this.abel?.destroy(),
      });
    }
    await this.wait(900);
    this.openBarrier();
    Save.markSeen('abelReveal');
    this.cameras.main.startFollow(this.cel, true, 0.12, 0.12, 0, 40);
  }

  private async abelChoice(): Promise<void> {
    const x0 = 8 * COACH_W;
    this.cel.setX(x0 + 320);
    this.mecha.setX(x0 + 350);
    this.cameras.main.centerOn(x0 + 500, H / 2);
    await this.say(T.abelChoice.lead);
    const o = T.abelChoice.options;
    const pick = await new Promise<AbelChoice>((res) =>
      this.dlg.choose<AbelChoice>(
        [
          { id: 'bajar', label: o.bajar },
          { id: 'solo', label: o.solo },
          { id: 'quedarse', label: o.quedarse },
        ],
        res,
      ),
    );
    Save.data.abelChoice = pick;
    Save.write();
    await this.say(T.abelChoice.after[pick]);
    if (pick === 'quedarse') {
      await this.wait(400);
      wipeTo(this, 'Ending');
      return;
    }
    await this.exitTunnel();
    await this.say(T.train.beforeCeleste);
    wipeTo(this, DREAM_SCENE.celeste, {}, [0xffc861, 0xff8a5c, 0x2a1f3a]);
  }

  /** La luz roja se apaga y el tren sale del túnel al amanecer. */
  private async exitTunnel(): Promise<void> {
    if (this.redLight) {
      this.tweens.killTweensOf(this.redLight);
      this.tweens.add({ targets: this.redLight, alpha: 0, scale: 0.2, duration: 800 });
    }
    this.mecha.setFrame(1);
    Audio.sfx('whistle');
    Juice.shake(this, 0.01, 600);
    await this.wait(700);
    Juice.flash(this, 0xffe6c8, 600);
    this.outside.setTexture('riso-dawn').clearTint();
    this.exited = true;
    for (const w of this.walls) w.setTint(0xffe6c8);
    Audio.music('dawn', 1);
    await this.wait(900);
  }

  // ---------------- Interacción ----------------

  private onTap(p: Phaser.Input.Pointer): void {
    if (this.busy || this.dlg.justClosed() || this.panel.length) return;
    if (p.y < 60) return; // franja del HUD
    const wx = p.worldX;
    const door = this.doors.find((d) => Math.abs(d.x - wx) < 70 && p.y > 140 && p.y < FLOOR_Y + 20);
    if (door) {
      this.pendingDoor = door;
      this.targetX = Phaser.Math.Clamp(door.x - 80, 40, this.maxX());
    } else {
      this.pendingDoor = null;
      this.targetX = Phaser.Math.Clamp(wx, 40, this.maxX());
      if (wx > this.maxX() + 20) this.blocked();
    }
  }

  private blocked(): void {
    if (this.dlg.open) return;
    const lines =
      this.act < 3 && this.cel.x > 3 * COACH_W ? T.train.locked.door2 : T.train.locked.door2;
    void this.say(this.act >= 2 && this.cel.x > 6 * COACH_W ? T.train.locked.loco : lines);
  }

  update(_t: number, dtMs: number): void {
    const dt = dtMs / 1000;
    this.outside.tilePositionX += (this.exited ? 2.5 : 9) * (dtMs / 16.6) + 0;
    // anuncios del altavoz en el Acto II
    if (this.act === 2 && !this.busy && !this.dlg.open && this.time.now > this.announceAt) {
      if (this.announceAt > 0) this.announce();
      this.announceAt = this.time.now + 22000;
    }
    if (this.busy || this.dlg.open || this.panel.length) {
      this.idleAnim();
      return;
    }
    // teclado
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;
    if (left || right) {
      this.targetX = null;
      this.pendingDoor = null;
      const dir = right ? 1 : -1;
      this.cel.x = Phaser.Math.Clamp(this.cel.x + dir * SPEED * dt, 40, this.maxX());
      this.walkAnim(dir);
    } else if (this.targetX !== null) {
      const dx = this.targetX - this.cel.x;
      if (Math.abs(dx) < 6) {
        this.targetX = null;
        this.idleAnim();
        if (this.pendingDoor) {
          const d = this.pendingDoor;
          this.pendingDoor = null;
          this.openDoor(d);
        }
      } else {
        const dir = Math.sign(dx);
        this.cel.x += dir * Math.min(Math.abs(dx), SPEED * dt);
        this.walkAnim(dir);
      }
    } else {
      this.idleAnim();
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.enter)
    ) {
      const near = this.doors.find((d) => Math.abs(d.x - this.cel.x) < 150);
      if (near) this.openDoor(near);
    }
    this.mecha.x += (this.cel.x + (this.cel.flipX ? -44 : 44) - this.mecha.x) * 0.2;
    this.mecha.y = FLOOR_Y - 72 + Math.sin(this.time.now / 300) * 3;
  }

  private walkAnim(dir: number): void {
    this.cel.setFlipX(dir < 0);
    if (!this.cel.anims.isPlaying) this.cel.play('walk-celeste');
    if (Math.random() < 0.02) Audio.sfx('step');
  }

  private idleAnim(): void {
    if (this.cel?.anims.isPlaying) this.cel.stop().setFrame(8);
    if (this.mecha) {
      this.mecha.x += (this.cel.x + (this.cel.flipX ? -44 : 44) - this.mecha.x) * 0.2;
      this.mecha.y = FLOOR_Y - 72 + Math.sin(this.time.now / 300) * 3;
    }
  }

  private announce(): void {
    const list = T.train.announcements;
    const text = list[this.announceIdx % list.length];
    this.announceIdx++;
    toast(this, `«${text}»`, '#cfd3ff', 120);
    for (let i = 0; i < 8; i++) this.time.delayedCall(i * 90, () => Audio.voice('altavoz'));
  }

  // ---------------- Puertas ----------------

  private async openDoor(d: Door): Promise<void> {
    if (this.busy || this.panel.length) return;
    const p = Save.dream(d.dream);
    this.cel.setFlipX(false);
    // Abel antes de tiempo
    if (d.dream === 'abel' && this.act < 3) {
      await this.say(T.train.locked.loco);
      return;
    }
    if (d.dream === 'abel' && this.exited) {
      // ya amaneció: la cabina lleva al final
      await this.say([['abel', T.train.doneLook.abel]]);
      return;
    }
    const lookText = p.done
      ? T.train.doneLook[d.dream as keyof typeof T.train.doneLook]
      : T.train.look[d.dream as keyof typeof T.train.look];
    this.showPanel(d, lookText, p.done);
  }

  private showPanel(d: Door, look: string, done: boolean): void {
    const dim = this.add
      .rectangle(0, 0, W, H, 0x0e0a1a, 0.55)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.overlay)
      .setInteractive();
    const box = this.add
      .rectangle(W / 2, 210, 720, 170, 0x1b1f3b, 0.97)
      .setStrokeStyle(3, INK.pink)
      .setScrollFactor(0)
      .setDepth(DEPTH.overlay + 1);
    const t = this.add
      .text(
        W / 2,
        210,
        look,
        txt(22, '#f6ecd6', FONT.body, { align: 'center', wordWrap: { width: 660 } }),
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.overlay + 2);
    const title = T.dreams[d.dream].title;
    const tt = this.add
      .text(W / 2, 112, title.toUpperCase(), txt(18, '#ffd23f', FONT.display, { fontStyle: '800' }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.overlay + 2);
    const close = () => {
      for (const o of this.panel) o.destroy();
      this.panel = [];
    };
    const enter = (madrugada: boolean) => {
      close();
      void this.enterDream(d, madrugada);
    };
    const btns: Button[] = [];
    const y = 350;
    if (done) {
      btns.push(
        new Button(this, W / 2 - 250, y, T.ui.replay, () => enter(false), { w: 220 }).setDepth(
          DEPTH.overlay + 3,
        ),
      );
      btns.push(
        new Button(this, W / 2, y, `☾ ${T.ui.madrugada}`, () => enter(true), { w: 220 }).setDepth(
          DEPTH.overlay + 3,
        ),
      );
      btns.push(
        new Button(this, W / 2 + 250, y, T.ui.back, close, { w: 220 }).setDepth(DEPTH.overlay + 3),
      );
    } else {
      btns.push(
        new Button(this, W / 2 - 140, y, T.ui.punchPrompt, () => enter(false), { w: 250 }).setDepth(
          DEPTH.overlay + 3,
        ),
      );
      btns.push(
        new Button(this, W / 2 + 150, y, T.ui.back, close, { w: 200 }).setDepth(DEPTH.overlay + 3),
      );
    }
    btns[0].setFocus(true);
    for (const b of btns) b.setFocus(false);
    this.panel = [dim, box, t, tt, ...btns];
    dim.on('pointerdown', close);
    keyNav(this, () => (this.panel.length ? btns : []));
    // Teclado: Enter directo entra
    this.input.keyboard?.once('keydown-ESC', close);
    void fmt;
  }

  private async enterDream(d: Door, madrugada: boolean): Promise<void> {
    this.busy = true;
    if (d.dream === 'efrain' && !Save.hasSeen('efrainTicket')) {
      await this.say(T.train.efrainTicket);
      Save.markSeen('efrainTicket');
    }
    if (d.dream === 'abel' && !Save.hasSeen('abelCab')) {
      await this.say(T.train.abelCab);
      Save.markSeen('abelCab');
    }
    // picar el tiquete: el hueco se agranda y se traga la pantalla
    Audio.sfx('punch');
    Juice.vibrate(25);
    const sx = d.x - this.cameras.main.scrollX;
    const hole = this.add.circle(sx, 240, 6, 0x000000).setScrollFactor(0).setDepth(DEPTH.top);
    const ring = this.add
      .circle(sx, 240, 6)
      .setStrokeStyle(6, LEAK[d.dream][0])
      .setScrollFactor(0)
      .setDepth(DEPTH.top + 1);
    this.tweens.add({ targets: [hole, ring], scale: 220, duration: 900, ease: 'Cubic.easeIn' });
    await this.wait(950);
    this.scene.start(DREAM_SCENE[d.dream], { madrugada });
  }
}
