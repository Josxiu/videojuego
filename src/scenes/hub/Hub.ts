import Phaser from 'phaser';
import {
  ALL_DREAMS,
  DREAM_META,
  GAME_WIDTH,
  GAME_HEIGHT,
  PIXEL_SCALE,
  DEPTH_HUD,
  FONT_DISPLAY,
  textStyle,
  titleStyle,
  type AllDreamId,
} from '../../config';
import { t, type TextKey } from '../../i18n';
import { applyWorldFX } from '../../gfx/postfx';
import { SaveManager } from '../../systems/SaveManager';
import { AudioManager } from '../../systems/AudioManager';
import { InputManager } from '../../systems/InputManager';
import { DialogueBox, type Line } from '../../systems/DialogueBox';
import { addMuteButton, fadeIn, fadeToScene, showActBanner } from '../../systems/ui';
import { paintHub } from './art';

const WORLD_W = 2860;
const FLOOR_Y = 440;
const SPEED = 235;

type DoorId = AllDreamId | 'wake';

interface DoorSpot {
  x: number;
  id: DoorId;
  sprite: Phaser.GameObjects.Image;
}

interface DoorLook {
  x: number;
  tint: number;
  label: TextKey;
  peep: string;
  scene: string;
}

const DOORS: Record<Exclude<AllDreamId, 'song'>, DoorLook> = {
  woodcut: {
    x: 340,
    tint: 0xd8cbb4,
    label: 'hub.door.woodcut',
    peep: 'woodcut',
    scene: 'DreamWoodcut',
  },
  exam: { x: 820, tint: 0xd8b060, label: 'hub.door.exam', peep: 'exam', scene: 'DreamExam' },
  fall: { x: 1040, tint: 0x9d8bff, label: 'hub.door.fall', peep: 'fall', scene: 'DreamFall' },
  forest: {
    x: 1260,
    tint: 0x7fd8a0,
    label: 'hub.door.forest',
    peep: 'forest',
    scene: 'DreamForest',
  },
  shadow: {
    x: 1480,
    tint: 0xffb84d,
    label: 'hub.door.shadow',
    peep: 'shadow',
    scene: 'DreamShadow',
  },
  embroidery: {
    x: 1700,
    tint: 0xd87080,
    label: 'hub.door.embroidery',
    peep: 'embroidery',
    scene: 'DreamEmbroidery',
  },
  glass: { x: 1920, tint: 0x4cc9f0, label: 'hub.door.glass', peep: 'glass', scene: 'DreamGlass' },
  chase: { x: 2140, tint: 0x5c5c8a, label: 'hub.door.chase', peep: 'chase', scene: 'DreamChase' },
  chamber3d: {
    x: 2380,
    tint: 0x93c5fd,
    label: 'hub.door.chamber3d',
    peep: 'chamber3d',
    scene: 'DreamChamber3D',
  },
};

const OWN_X = 110;
const DESK_X = 560;
const WAKE_X = 2660;

/**
 * El Entresueño: el tiro de luz del edificio que evoluciona en 3 actos.
 */
export class Hub extends Phaser.Scene {
  private iris!: Phaser.GameObjects.Sprite;
  private irisReflection!: Phaser.GameObjects.Sprite;
  private morfeo!: Phaser.GameObjects.Sprite;
  private octavioSprite?: Phaser.GameObjects.Sprite;
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private prompt!: Phaser.GameObjects.Text;
  private far!: Phaser.GameObjects.TileSprite;
  private doors: DoorSpot[] = [];
  private reflections: {
    src: Phaser.GameObjects.Components.Transform;
    img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    phase: number;
  }[] = [];
  private morfeoTalkIndex = 0;
  private busy = false;
  private actObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Hub');
  }

  create(): void {
    this.doors = [];
    this.reflections = [];
    this.actObjects = [];
    this.busy = false;
    this.cameras.main.setBackgroundColor(0x141026);
    applyWorldFX(this, 'hub');
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    fadeIn(this, 650);
    AudioManager.playMusic('hub');
    paintHub(this);

    this.far = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'hub-shaft')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(0);
    this.buildWater();
    this.buildBubbles();

    const data = SaveManager.data;
    const act1 = SaveManager.act1Done();
    const act2 = SaveManager.act2Done();

    if (data.ownDreamRevealed) this.addOwnDoor(false);
    if (act2) this.addDoor('woodcut', false);
    this.addDesk();
    this.addDoor('exam', false);
    this.addDoor('fall', false);
    this.addDoor('forest', false);

    if (act1) {
      this.addDoor('shadow', !data.completed.shadow);
      this.addDoor('embroidery', !data.completed.embroidery);
      this.addDoor('glass', !data.completed.glass);
      this.addDoor('chase', !data.completed.chase);
    }
    if (act2) {
      this.addDoor('chamber3d', !data.completed.chamber3d);
    }
    this.addWakeDoor();

    this.buildActAtmosphere();

    this.iris = this.add
      .sprite(DESK_X + 140, FLOOR_Y, 'iris')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setDepth(30);
    this.iris.play('iris-idle');
    this.irisReflection = this.add
      .sprite(this.iris.x, FLOOR_Y, 'iris')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE, -PIXEL_SCALE)
      .setAlpha(0.22)
      .setTint(0x9d7bff)
      .setDepth(3);
    this.cameras.main.startFollow(this.iris, true, 0.09, 0.09);

    this.prompt = this.add
      .text(
        0,
        0,
        '',
        textStyle(14, '#ffd166', { backgroundColor: '#0d0a1ecc', padding: { x: 8, y: 4 } }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH_HUD)
      .setVisible(false);

    this.addHud();
    addMuteButton(this);
    this.dialogue = new DialogueBox(this);
    this.inp = new InputManager(this);
    if (this.inp.isTouch) {
      this.inp.addButton(84, GAME_HEIGHT - 74, 38, '◀', 'left');
      this.inp.addButton(190, GAME_HEIGHT - 74, 38, '▶', 'right');
      this.inp.addButton(GAME_WIDTH - 92, GAME_HEIGHT - 76, 44, '✦', 'interact');
    }

    const actKey: TextKey = data.songDone
      ? 'hub.title'
      : act2
        ? 'hub.act.3'
        : act1
          ? 'hub.act.2'
          : 'hub.act.1';
    const placeName = this.add
      .text(GAME_WIDTH / 2, 72, t(actKey), titleStyle(17, '#9d7bff', { letterSpacing: 4 }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setAlpha(0);
    this.tweens.add({ targets: placeName, alpha: 0.9, duration: 1000, hold: 1700, yoyo: true });

    this.storyBeats();
  }

  // ── Escenario y Evolución por Actos ──

  private buildWater(): void {
    const g = this.add.graphics().setDepth(2);
    g.fillGradientStyle(0x1e1838, 0x1e1838, 0x0b0820, 0x0b0820, 1);
    g.fillRect(0, FLOOR_Y, WORLD_W, GAME_HEIGHT - FLOOR_Y);
    this.add.rectangle(WORLD_W / 2, FLOOR_Y + 1, WORLD_W, 3, 0x6a5ab0, 0.8).setDepth(4);
    for (let i = 0; i < 110; i++) {
      const r = this.add
        .rectangle(
          Phaser.Math.Between(0, WORLD_W),
          Phaser.Math.Between(FLOOR_Y + 10, GAME_HEIGHT),
          Phaser.Math.Between(6, 28),
          1,
          0x9d7bff,
          0.25,
        )
        .setDepth(4);
      this.tweens.add({
        targets: r,
        alpha: 0.03,
        x: r.x + Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(1200, 2600),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private buildBubbles(): void {
    const colors = [0x9d7bff, 0x86f7ff, 0xffd166, 0xff9ab0];
    this.add
      .particles(0, 0, 'glow-white', {
        x: { min: 0, max: WORLD_W },
        y: GAME_HEIGHT + 10,
        speedY: { min: -40, max: -90 },
        speedX: { min: -8, max: 8 },
        lifespan: 9000,
        scale: { min: 0.3, max: 0.9 },
        alpha: { start: 0.55, end: 0 },
        tint: colors,
        frequency: 190,
      })
      .setDepth(1);
  }

  /** Transforma el techo y atmósfera del tiro de luz según el acto de la historia. */
  private buildActAtmosphere(): void {
    const act1 = SaveManager.act1Done();
    const act2 = SaveManager.act2Done();
    const songDone = SaveManager.data.songDone;

    if (act1 && !songDone) {
      // Acto II y III: cuñas de espuma acústica colgando y sueños en frascos
      for (let x = 760; x < 2600; x += 260) {
        const foam = this.add
          .image(x, 0, 'hub-foam')
          .setOrigin(0.5, 0)
          .setDepth(7)
          .setAlpha(act2 ? 0.55 : 0.92);
        this.actObjects.push(foam);
      }
      if (!act2) {
        for (const x of [1480, 1700, 1920, 2140]) {
          const jar = this.add.image(x, 125, 'hub-jar').setDepth(8);
          const orb = this.add.image(x, 128, 'glow-cyan').setScale(0.7).setDepth(7);
          this.tweens.add({
            targets: [jar, orb],
            y: '+=8',
            duration: 1800,
            yoyo: true,
            repeat: -1,
          });
        }
      }
    }
    if (songDone) {
      // Amanecer entrando por el tiro de luz
      for (const x of [420, 1040, 1700, 2380]) {
        const ray = this.add
          .rectangle(x, GAME_HEIGHT / 2, 120, GAME_HEIGHT, 0xffd166, 0.08)
          .setAngle(12)
          .setDepth(6);
        this.tweens.add({ targets: ray, alpha: 0.14, duration: 2200, yoyo: true, repeat: -1 });
      }
    }
  }

  private reflect(src: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite): void {
    const img = this.add
      .image(src.x, FLOOR_Y + (FLOOR_Y - src.y), src.texture.key, src.frame.name)
      .setOrigin(src.originX, src.originY)
      .setScale(src.scaleX, -src.scaleY)
      .setAlpha(0.2)
      .setTint(0x8a7ad0)
      .setDepth(3);
    this.reflections.push({ src, img, phase: Math.random() * 6 });
  }

  private addDesk(): void {
    const desk = this.add
      .image(DESK_X, FLOOR_Y, 'hub-desk')
      .setOrigin(0.5, 1)
      .setScale(1.3)
      .setDepth(10);
    this.reflect(desk);
    this.morfeo = this.add
      .sprite(DESK_X + 16, FLOOR_Y - 88, 'morfeo')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setDepth(11);
    this.morfeo.play('morfeo-idle');
    this.add
      .image(DESK_X - 42, FLOOR_Y - 110, 'glow-cyan')
      .setScale(2.4)
      .setAlpha(0.18)
      .setDepth(9);
    this.add
      .text(DESK_X, FLOOR_Y - 190, t('hub.desk'), {
        fontFamily: FONT_DISPLAY,
        fontSize: '9px',
        color: '#86f7ff',
        align: 'center',
        wordWrap: { width: 190 },
      })
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setDepth(9);
  }

  private addDoor(id: Exclude<AllDreamId, 'song'>, sealed: boolean): void {
    const look = DOORS[id];
    const data = SaveManager.data;
    const done = data.completed[id];
    const ins = data.insomniaDone[id];
    const x = look.x;
    const glow = this.add
      .image(x, FLOOR_Y - 56, sealed ? 'glow-red' : done ? 'glow-gold' : 'glow-violet')
      .setScale(5)
      .setAlpha(done ? 0.2 : 0.1)
      .setDepth(5);
    this.tweens.add({
      targets: glow,
      alpha: glow.alpha * 2,
      duration: sealed ? 750 : 1600,
      yoyo: true,
      repeat: -1,
    });
    const door = this.add
      .image(x, FLOOR_Y, 'door')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setTint(look.tint)
      .setDepth(10);
    this.reflect(door);
    this.add
      .image(x, FLOOR_Y - 82, `hub-peep-${look.peep}`)
      .setScale(0.75)
      .setDepth(11);
    this.add.image(x, FLOOR_Y + 3, `hub-mat-${id}`).setDepth(11);
    if (sealed) {
      this.add.image(x, FLOOR_Y - 54, 'hub-seal').setDepth(13);
    }
    this.add
      .text(x, FLOOR_Y - 130, t(look.label), titleStyle(11, sealed ? '#ff7a8a' : '#cfc4ff'))
      .setOrigin(0.5)
      .setDepth(11);
    if (ins) {
      this.add
        .text(x, FLOOR_Y - 150, '☾ ★', textStyle(12, '#ff9ab0'))
        .setOrigin(0.5)
        .setDepth(12);
    }
    this.decorate(id, x, done);
    this.doors.push({ x, id, sprite: door });
  }

  private decorate(id: Exclude<AllDreamId, 'song'>, x: number, done: boolean): void {
    const put = (key: string, dx: number, dy = 0, scale = 1) => {
      const img = this.add
        .image(x + dx, FLOOR_Y + dy, key)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(12);
      this.reflect(img);
      return img;
    };
    switch (id) {
      case 'exam':
        put('hub-broom', 56);
        put('hub-bucket', -56);
        if (done) put('gis', 0, 0, 2.2);
        break;
      case 'fall':
        put('hub-boxes', 68);
        if (done) {
          const key = this.add
            .image(x + 44, FLOOR_Y - 70, 'llave')
            .setScale(2)
            .setAngle(90)
            .setDepth(12);
          this.tweens.add({
            targets: key,
            angle: { from: 80, to: 100 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut',
          });
        }
        break;
      case 'forest':
        put('hub-plants', -72);
        if (done) put('bote', 48, 0, 2.2);
        break;
      case 'shadow':
        put('hub-reel', 54);
        if (done) put('boleto', -46, -24, 2);
        break;
      case 'embroidery':
        put('hub-spools', -54);
        if (done) put('dedal', 46, 0, 2);
        break;
      case 'glass':
        put('hub-lamp-sheet', 54);
        if (done) put('prisma', -46, -12, 2.2);
        break;
      case 'chase':
        this.add.image(x + 48, FLOOR_Y - 70, 'hub-drawings').setDepth(12);
        if (done) {
          this.add
            .image(x, FLOOR_Y - 40, 'dibujo')
            .setScale(2)
            .setDepth(12);
        } else {
          const eyes = [-8, 8].map((dx) =>
            this.add
              .image(x + dx, FLOOR_Y - 50, 'glow-red')
              .setScale(0.45)
              .setAlpha(0.6)
              .setDepth(12),
          );
          this.tweens.add({ targets: eyes, alpha: 0.08, duration: 1300, yoyo: true, repeat: -1 });
        }
        break;
      case 'woodcut':
        put('hub-plates', -54);
        if (done) put('rodillo', 46, 0, 2);
        break;
      case 'chamber3d':
        if (done) put('reloj', 46, -16, 2.4);
        break;
    }
    if (done) {
      const z = this.add
        .text(x + 24, FLOOR_Y - 140, 'z', textStyle(16, '#cfc4ff'))
        .setAlpha(0)
        .setDepth(12);
      this.tweens.add({
        targets: z,
        alpha: { from: 0.8, to: 0 },
        y: z.y - 24,
        duration: 2200,
        repeat: -1,
      });
    }
  }

  private addWakeDoor(): void {
    const data = SaveManager.data;
    const ready = data.songDone;
    const act1 = SaveManager.act1Done();
    const glow = this.add
      .image(WAKE_X, FLOOR_Y - 70, 'glow-gold')
      .setScale(ready ? 9 : 5)
      .setAlpha(ready ? 0.25 : 0.08)
      .setDepth(5);
    this.tweens.add({
      targets: glow,
      alpha: ready ? 0.45 : 0.15,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
    const door = this.add
      .image(WAKE_X, FLOOR_Y, 'door')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 1.3)
      .setTint(ready ? 0xffd166 : 0x6a6a7a)
      .setDepth(10);
    this.reflect(door);
    this.add
      .image(WAKE_X, FLOOR_Y + 3, 'hub-mat-wake')
      .setScale(1.2)
      .setDepth(11);
    if (act1 && !SaveManager.act3Done() && !ready) {
      this.add
        .image(WAKE_X, FLOOR_Y - 64, 'hub-seal')
        .setScale(1.3)
        .setDepth(13);
    }
    this.add
      .text(
        WAKE_X,
        FLOOR_Y - 172,
        t('hub.door.wake'),
        titleStyle(17, ready ? '#ffd166' : '#8a80b0'),
      )
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(WAKE_X, FLOOR_Y - 200, '☀', textStyle(24, ready ? '#ffd166' : '#554a80'))
      .setOrigin(0.5)
      .setDepth(11);
    this.doors.push({ x: WAKE_X, id: 'wake', sprite: door });
  }

  private addOwnDoor(appear: boolean): void {
    const items: Phaser.GameObjects.GameObject[] = [];
    const door = this.add
      .image(OWN_X, FLOOR_Y, 'door')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setTint(0x8a80b0)
      .setDepth(10);
    items.push(door);
    items.push(
      this.add
        .image(OWN_X, FLOOR_Y - 82, 'hub-peep-own')
        .setScale(0.75)
        .setDepth(11),
      this.add.image(OWN_X - 20, FLOOR_Y - 100, 'hub-dust').setDepth(12),
      this.add
        .text(OWN_X, FLOOR_Y - 130, t('hub.door.own'), titleStyle(11, '#ffd166'))
        .setOrigin(0.5)
        .setDepth(11),
    );
    const glow = this.add
      .image(OWN_X, FLOOR_Y - 56, 'glow-gold')
      .setScale(5)
      .setAlpha(0.15)
      .setDepth(5);
    items.push(glow);
    this.tweens.add({ targets: glow, alpha: 0.35, duration: 1400, yoyo: true, repeat: -1 });
    this.reflect(door);
    this.doors.push({ x: OWN_X, id: 'song', sprite: door });
    if (appear) {
      items.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0));
      this.tweens.add({ targets: items, alpha: 1, duration: 1400 });
      this.add
        .particles(OWN_X, FLOOR_Y - 60, 'px', {
          speedY: { min: -30, max: 10 },
          speedX: { min: -30, max: 30 },
          lifespan: 1600,
          alpha: { start: 0.6, end: 0 },
          tint: 0xcfc4ff,
          quantity: 40,
          emitting: false,
        })
        .setDepth(13)
        .explode(40);
    }
  }

  private addHud(): void {
    const data = SaveManager.data;
    const fix = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ) => o.setScrollFactor(0).setDepth(DEPTH_HUD);

    ALL_DREAMS.forEach((id, i) => {
      const got = data.completed[id];
      fix(
        this.add
          .image(24 + i * 32, 28, DREAM_META[id].item)
          .setScale(1.4)
          .setAlpha(got ? 1 : 0.2),
      );
    });
    fix(this.add.image(356, 28, 'glow-gold').setScale(0.9));
    fix(
      this.add
        .text(
          370,
          28,
          `${SaveManager.fireflyCount()}/${SaveManager.fireflyTotal()}`,
          textStyle(14, '#ffd166'),
        )
        .setOrigin(0, 0.5),
    );
    const albumBtn = fix(
      this.add
        .text(GAME_WIDTH - 110, 26, `📖 ${t('hub.album')}`, {
          fontFamily: FONT_DISPLAY,
          fontSize: '12px',
          color: '#efe9ff',
          backgroundColor: '#2a2148',
          padding: { x: 10, y: 6 },
        })
        .setOrigin(1, 0.5)
        .setInteractive({ useHandCursor: true }),
    );
    albumBtn.on('pointerdown', () => {
      AudioManager.sfx('click');
      fadeToScene(this, 'Album', undefined, 400);
    });
  }

  // ── Eventos narrativos del Entresueño ──

  private storyBeats(): void {
    const data = SaveManager.data;
    if (!data.metMorfeo) {
      this.time.delayedCall(600, () => {
        AudioManager.sfx('meow');
        this.dialogue.say(
          [
            { who: 'morfeo', text: t('hub.meet.1') },
            { who: 'iris', text: t('hub.meet.2'), mood: 'wow' },
            { who: 'morfeo', text: t('hub.meet.3'), mood: 'smug' },
            { who: 'morfeo', text: t('hub.meet.4') },
            { who: 'iris', text: t('hub.meet.5') },
            { who: 'morfeo', text: t('hub.meet.6') },
            { who: 'morfeo', text: t('hub.meet.7'), mood: 'smug' },
            { who: 'iris', text: t('hub.meet.8'), mood: 'sad' },
            { who: 'morfeo', text: t('hub.meet.9') },
          ],
          () => {
            data.metMorfeo = true;
            SaveManager.save();
          },
        );
      });
      return;
    }

    // Irrupción de Octavio Bravo al terminar el Acto I
    if (SaveManager.act1Done() && !data.octavioIntroSeen) {
      this.busy = true;
      this.time.delayedCall(600, () => {
        AudioManager.sfx('seal');
        this.cameras.main.shake(320, 0.008);
        this.octavioSprite = this.add
          .sprite(DESK_X + 260, FLOOR_Y, 'octavio')
          .setOrigin(0.5, 1)
          .setScale(PIXEL_SCALE)
          .setFlipX(true)
          .setDepth(30)
          .setAlpha(0);
        this.octavioSprite.play('octavio-idle');
        this.tweens.add({ targets: this.octavioSprite, alpha: 1, duration: 700 });
        this.dialogue.say(
          [
            { who: 'octavio', text: t('hub.octavio.1') },
            { who: 'iris', text: t('hub.octavio.2'), mood: 'wow' },
            { who: 'octavio', text: t('hub.octavio.3') },
            { who: 'octavio', text: t('hub.octavio.4'), mood: 'smug' },
            { who: 'iris', text: t('hub.octavio.5') },
            { who: 'octavio', text: t('hub.octavio.6') },
            { who: 'iris', text: t('hub.octavio.7'), mood: 'sad' },
            { who: 'octavio', text: t('hub.octavio.8') },
            { who: 'morfeo', text: t('hub.octavio.9') },
            { who: 'octavio', text: t('hub.octavio.10'), mood: 'smug' },
            { who: 'octavio', text: t('hub.octavio.11') },
          ],
          () => {
            if (this.octavioSprite) {
              this.tweens.add({
                targets: this.octavioSprite,
                alpha: 0,
                duration: 600,
                onComplete: () => this.octavioSprite?.destroy(),
              });
            }
            data.octavioIntroSeen = true;
            data.nightmareIntroSeen = true;
            SaveManager.save();
            showActBanner(this, t('hub.act.2'));
            this.busy = false;
          },
        );
      });
      return;
    }

    // Desbloqueo de Acto III (3A y 6A)
    if (SaveManager.act2Done() && !data.act3IntroSeen) {
      this.busy = true;
      this.time.delayedCall(600, () => {
        AudioManager.sfx('echo');
        this.dialogue.say(
          [
            { who: 'morfeo', text: t('hub.act3.1') },
            { who: 'morfeo', text: t('hub.act3.2') },
            { who: 'iris', text: t('hub.act3.3'), mood: 'sad' },
            { who: 'morfeo', text: t('hub.act3.4'), mood: 'smug' },
          ],
          () => {
            data.act3IntroSeen = true;
            SaveManager.save();
            showActBanner(this, t('hub.act.3'));
            this.busy = false;
          },
        );
      });
      return;
    }

    // Revelación del propio sueño de Iris tras superar Acto III
    if (SaveManager.act3Done() && data.octavioChoice === 'resist' && !data.ownDreamRevealed) {
      this.time.delayedCall(500, () => this.revealOwnDream());
    }
  }

  // ── Bucle ──

  update(time: number, deltaMs: number): void {
    this.inp.update();
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.far.tilePositionX = this.cameras.main.scrollX * 0.3;
    for (const r of this.reflections)
      r.img.setX((r.src as { x: number }).x + Math.sin(time * 0.002 + r.phase) * 2);
    this.irisReflection
      .setPosition(this.iris.x + Math.sin(time * 0.003) * 2, FLOOR_Y)
      .setFrame(this.iris.frame.name)
      .setFlipX(this.iris.flipX);

    if (this.dialogue.active || this.busy) {
      this.iris.play('iris-idle', true);
      this.prompt.setVisible(false);
      return;
    }
    let moving = false;
    if (this.inp.isDown('left')) {
      this.iris.x = Math.max(40, this.iris.x - SPEED * dt);
      this.iris.setFlipX(true);
      moving = true;
    } else if (this.inp.isDown('right')) {
      this.iris.x = Math.min(WORLD_W - 40, this.iris.x + SPEED * dt);
      this.iris.setFlipX(false);
      moving = true;
    }
    this.iris.play(moving ? 'iris-walk' : 'iris-idle', true);

    const nearMorfeo = Math.abs(this.iris.x - DESK_X) < 82;
    const nearDoor = this.doors.find((d) => Math.abs(this.iris.x - d.x) < 55);
    if (nearMorfeo) {
      this.showPrompt(DESK_X, FLOOR_Y - 230, t('hub.interact'));
      if (this.inp.justDown('interact')) this.talkToMorfeo();
    } else if (nearDoor) {
      const isDone = nearDoor.id !== 'wake' && SaveManager.data.completed[nearDoor.id];
      this.showPrompt(nearDoor.x, FLOOR_Y - 165, isDone ? `${t('hub.enter')} / ☾` : t('hub.enter'));
      if (this.inp.justDown('interact')) this.enterDoor(nearDoor);
    } else {
      this.prompt.setVisible(false);
    }
  }

  private showPrompt(x: number, y: number, text: string): void {
    this.prompt.setPosition(x, y).setText(`✦ ${text}`).setVisible(true);
  }

  private talkToMorfeo(): void {
    AudioManager.sfx('meow');
    const data = SaveManager.data;
    const keys = SaveManager.keyCount();
    let pool: TextKey[];
    if (data.songDone) pool = ['hub.morfeo.end.1', 'hub.morfeo.end.2'];
    else if (data.ownDreamRevealed) pool = ['hub.morfeo.own.1'];
    else if (SaveManager.act2Done()) pool = ['hub.morfeo.act3.1'];
    else if (SaveManager.act1Done()) {
      pool = data.completed.chase
        ? ['hub.morfeo.act2.1', 'hub.morfeo.act2.2']
        : ['hub.morfeo.act2.1', 'hub.morfeo.act2.chase', 'hub.morfeo.act2.2'];
    } else if (keys === 2) pool = ['hub.morfeo.two.1', 'hub.morfeo.two.2'];
    else if (keys === 1) pool = ['hub.morfeo.one.1', 'hub.morfeo.one.2'];
    else pool = ['hub.morfeo.zero.1', 'hub.morfeo.zero.2'];

    const lines: Line[] = [{ who: 'morfeo', text: t(pool[this.morfeoTalkIndex % pool.length]) }];
    const ff = SaveManager.fireflyCount();
    if (ff > 0 && this.morfeoTalkIndex % 3 === 2) {
      lines.push({
        who: 'morfeo',
        text: t('hub.morfeo.fireflies', { n: ff, total: SaveManager.fireflyTotal() }),
        mood: 'smug',
      });
    }
    this.morfeoTalkIndex += 1;
    this.dialogue.say(lines);
  }

  private enterDoor(door: DoorSpot): void {
    const data = SaveManager.data;
    if (door.id === 'wake') {
      if (data.songDone) {
        AudioManager.sfx('door');
        fadeToScene(this, 'Ending', undefined, 900);
      } else if (data.ownDreamRevealed) {
        this.dialogue.say([{ who: null, text: t('hub.wakeDoorOwn') }]);
      } else if (SaveManager.act3Done() && data.octavioChoice === 'resist') {
        this.revealOwnDream();
      } else if (SaveManager.act1Done()) {
        this.dialogue.say([
          {
            who: null,
            text: SaveManager.act2Done() ? t('hub.wakeDoorAct3') : t('hub.wakeDoorAct2'),
          },
        ]);
      } else {
        this.dialogue.say([{ who: null, text: t('hub.wakeDoorLocked') }]);
      }
      return;
    }

    const meta = DREAM_META[door.id];
    const done = data.completed[door.id];
    if (done) {
      this.dialogue.ask(
        [
          {
            who: 'morfeo',
            text: t('hub.desveloAsk', { apt: meta.apt, owner: meta.owner }),
          },
        ],
        [
          {
            label: t('album.playNormal'),
            action: () => {
              AudioManager.sfx('door');
              fadeToScene(this, meta.scene, { insomnia: false }, 600);
            },
          },
          {
            label: t('album.playDesvelo'),
            action: () => {
              AudioManager.sfx('insomnia');
              fadeToScene(this, meta.scene, { insomnia: true }, 600);
            },
          },
        ],
      );
      return;
    }

    AudioManager.sfx('door');
    fadeToScene(this, meta.scene, { insomnia: false }, 600);
  }

  private revealOwnDream(): void {
    this.busy = true;
    AudioManager.sfx('door');
    const cam = this.cameras.main;
    this.dialogue.say(
      [
        { who: null, text: t('hub.own.1') },
        { who: 'morfeo', text: t('hub.own.2') },
        { who: 'iris', text: t('hub.own.3'), mood: 'wow' },
        { who: 'morfeo', text: t('hub.own.4') },
        {
          who: null,
          text: t('hub.own.5'),
          action: () => {
            cam.stopFollow();
            cam.pan(OWN_X + 300, GAME_HEIGHT / 2, 2200, 'Sine.easeInOut');
            this.time.delayedCall(1500, () => {
              AudioManager.sfx('echo');
              this.addOwnDoor(true);
            });
          },
        },
        { who: 'morfeo', text: t('hub.own.6') },
        { who: 'morfeo', text: t('hub.own.7'), mood: 'smug' },
        { who: 'iris', text: t('hub.own.8'), mood: 'sad' },
        { who: 'morfeo', text: t('hub.own.9') },
      ],
      () => {
        SaveManager.data.ownDreamRevealed = true;
        SaveManager.save();
        cam.pan(
          this.iris.x,
          GAME_HEIGHT / 2,
          1400,
          'Sine.easeInOut',
          false,
          (_c: Phaser.Cameras.Scene2D.Camera, p: number) => {
            if (p >= 1) {
              cam.startFollow(this.iris, true, 0.09, 0.09);
              this.busy = false;
            }
          },
        );
      },
    );
  }
}
