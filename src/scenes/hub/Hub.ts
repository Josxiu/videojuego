import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PIXEL_SCALE,
  DEPTH_HUD,
  FONT_DISPLAY,
  textStyle,
  titleStyle,
} from '../../config';
import { t } from '../../i18n';
import type { TextKey } from '../../i18n';
import { applyWorldFX } from '../../gfx/postfx';
import { SaveManager } from '../../systems/SaveManager';
import { AudioManager } from '../../systems/AudioManager';
import { InputManager } from '../../systems/InputManager';
import { DialogueBox, type Line } from '../../systems/DialogueBox';
import { addMuteButton, fadeIn, fadeToScene } from '../../systems/ui';
import { paintHub } from './art';

const WORLD_W = 1900;
const FLOOR_Y = 440;
const SPEED = 210;

type DoorId = 'exam' | 'fall' | 'forest' | 'chase' | 'wake' | 'own';

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
  scene?: string;
}

const DOORS: Record<Exclude<DoorId, 'wake' | 'own' | 'chase'>, DoorLook> & { chase: DoorLook } = {
  exam: { x: 620, tint: 0xd8b060, label: 'hub.door.exam', peep: 'exam', scene: 'DreamExam' },
  fall: { x: 900, tint: 0x9d8bff, label: 'hub.door.fall', peep: 'fall', scene: 'DreamFall' },
  forest: {
    x: 1180,
    tint: 0x7fd8a0,
    label: 'hub.door.forest',
    peep: 'forest',
    scene: 'DreamForest',
  },
  chase: { x: 1440, tint: 0x3a3a4a, label: 'hub.door.chase', peep: 'chase', scene: 'DreamChase' },
};
const WAKE_X = 1730;
const OWN_X = 90;
const DESK_X = 330;

/**
 * El Entresueño: el tiro de luz del edificio visto desde adentro.
 * Un pasillo de puertas sobre agua oscura; cada puerta es un vecino.
 */
export class Hub extends Phaser.Scene {
  private iris!: Phaser.GameObjects.Sprite;
  private irisReflection!: Phaser.GameObjects.Sprite;
  private morfeo!: Phaser.GameObjects.Sprite;
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

  constructor() {
    super('Hub');
  }

  create(): void {
    this.doors = [];
    this.reflections = [];
    this.busy = false;
    this.cameras.main.setBackgroundColor(0x141026);
    applyWorldFX(this, 'hub');
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    fadeIn(this, 700);
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
    const keys = SaveManager.keyCount();
    if (data.ownDreamRevealed) this.addOwnDoor(false);
    this.addDesk();
    this.addDoor('exam');
    this.addDoor('fall');
    this.addDoor('forest');
    if (keys >= 3) this.addDoor('chase');
    this.addWakeDoor();

    // Iris (el mundo de en medio es pixel art: aquí se ve como es)
    this.iris = this.add
      .sprite(DESK_X + 150, FLOOR_Y, 'iris')
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
      this.inp.addButton(90, GAME_HEIGHT - 80, 40, '◀', 'left');
      this.inp.addButton(200, GAME_HEIGHT - 80, 40, '▶', 'right');
      this.inp.addButton(GAME_WIDTH - 100, GAME_HEIGHT - 80, 44, '✦', 'interact');
    }

    const placeName = this.add
      .text(GAME_WIDTH / 2, 70, t('hub.title'), titleStyle(22, '#9d7bff', { letterSpacing: 6 }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setAlpha(0);
    this.tweens.add({ targets: placeName, alpha: 0.9, duration: 1200, hold: 1600, yoyo: true });

    this.firstTimeEvents();
  }

  // ── Escenario ──

  private buildWater(): void {
    const g = this.add.graphics().setDepth(2);
    g.fillGradientStyle(0x1e1838, 0x1e1838, 0x0b0820, 0x0b0820, 1);
    g.fillRect(0, FLOOR_Y, WORLD_W, GAME_HEIGHT - FLOOR_Y);
    this.add.rectangle(WORLD_W / 2, FLOOR_Y + 1, WORLD_W, 3, 0x6a5ab0, 0.8).setDepth(4);
    for (let i = 0; i < 80; i++) {
      const r = this.add
        .rectangle(
          Phaser.Math.Between(0, WORLD_W),
          Phaser.Math.Between(FLOOR_Y + 10, GAME_HEIGHT),
          Phaser.Math.Between(6, 26),
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

  /** Sueños que suben por el tiro de luz, como burbujas. */
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
        frequency: 220,
      })
      .setDepth(1);
  }

  /** Reflejo en el agua: copia invertida que tiembla. */
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
      .sprite(DESK_X + 18, FLOOR_Y - 88, 'morfeo')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE)
      .setDepth(11);
    this.morfeo.play('morfeo-idle');
    this.add
      .image(DESK_X - 38, FLOOR_Y - 110, 'glow-cyan')
      .setScale(2.4)
      .setAlpha(0.18)
      .setDepth(9);
    this.add
      .text(DESK_X, FLOOR_Y - 190, t('hub.desk'), {
        fontFamily: FONT_DISPLAY,
        fontSize: '9px',
        color: '#86f7ff',
        align: 'center',
        wordWrap: { width: 180 },
      })
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setDepth(9);
  }

  private addDoor(id: keyof typeof DOORS): void {
    const look = DOORS[id];
    const data = SaveManager.data;
    const done = id === 'chase' ? data.nightmareDone : data.keys[id];
    const x = look.x;
    const glow = this.add
      .image(x, FLOOR_Y - 56, id === 'chase' ? 'glow-red' : 'glow-violet')
      .setScale(5)
      .setAlpha(0.1)
      .setDepth(5);
    if (done) glow.setTexture('glow-gold').setAlpha(0.2);
    this.tweens.add({
      targets: glow,
      alpha: glow.alpha * 2,
      duration: id === 'chase' ? 700 : 1600,
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
    // Mirilla con la técnica de su sueño
    this.add
      .image(x, FLOOR_Y - 82, `hub-peep-${look.peep}`)
      .setScale(0.75)
      .setDepth(11);
    this.add.image(x, FLOOR_Y + 3, `hub-mat-${id}`).setDepth(11);
    this.add
      .text(x, FLOOR_Y - 130, t(look.label), titleStyle(12, id === 'chase' ? '#ff6b6b' : '#cfc4ff'))
      .setOrigin(0.5)
      .setDepth(11);
    this.decorate(id, x, done);
    this.doors.push({ x, id, sprite: door });
  }

  /** Lo que cada vecino tiene afuera de su puerta, y lo que Iris le devolvió. */
  private decorate(id: keyof typeof DOORS, x: number, done: boolean): void {
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
        put('hub-broom', 62, 0, 1);
        put('hub-bucket', -62);
        if (done) put('gis', 0, 0, 2.2);
        break;
      case 'fall':
        put('hub-boxes', 78);
        if (done) {
          // La llave cuelga de un clavo junto a la puerta
          const key = this.add
            .image(x + 46, FLOOR_Y - 70, 'llave')
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
        put('hub-plants', -84);
        if (done) put('bote', 50, 0, 2.2);
        break;
      case 'chase':
        this.add.image(x + 50, FLOOR_Y - 70, 'hub-drawings').setDepth(12);
        if (done) {
          this.add
            .image(x, FLOOR_Y - 40, 'dibujo')
            .setScale(2)
            .setDepth(12);
        } else {
          // Ojos rojos por la rendija
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
    }
    if (done) {
      // Del otro lado, alguien duerme tranquilo
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
    this.add
      .text(
        WAKE_X,
        FLOOR_Y - 172,
        t('hub.door.wake'),
        titleStyle(18, ready ? '#ffd166' : '#8a80b0'),
      )
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(WAKE_X, FLOOR_Y - 200, '☀', textStyle(24, ready ? '#ffd166' : '#554a80'))
      .setOrigin(0.5)
      .setDepth(11);
    this.doors.push({ x: WAKE_X, id: 'wake', sprite: door });
  }

  /** La puerta olvidada: el sueño de Iris, al fondo, donde no miró. */
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
    );
    items.push(this.add.image(OWN_X - 20, FLOOR_Y - 100, 'hub-dust').setDepth(12));
    items.push(
      this.add
        .text(OWN_X, FLOOR_Y - 130, t('hub.door.own'), titleStyle(12, '#ffd166'))
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
    this.doors.push({ x: OWN_X, id: 'own', sprite: door });
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
    const items: [string, boolean][] = [
      ['gis', data.keys.exam],
      ['llave', data.keys.fall],
      ['bote', data.keys.forest],
      ['dibujo', data.nightmareDone],
      ['grabadora', data.songDone],
    ];
    items.forEach(([key, got], i) => {
      fix(
        this.add
          .image(30 + i * 40, 30, key)
          .setScale(1.8)
          .setAlpha(got ? 1 : 0.2),
      );
    });
    fix(this.add.image(232, 30, 'glow-gold').setScale(1));
    fix(
      this.add
        .text(248, 30, `${SaveManager.fireflyCount()}`, textStyle(16, '#ffd166'))
        .setOrigin(0, 0.5),
    );
  }

  // ── Eventos de la historia ──

  private firstTimeEvents(): void {
    const data = SaveManager.data;
    if (!data.metMorfeo) {
      this.time.delayedCall(700, () => {
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
    if (SaveManager.keyCount() >= 3 && !data.nightmareDone && !data.nightmareIntroSeen) {
      this.time.delayedCall(700, () => {
        AudioManager.sfx('screech');
        this.cameras.main.shake(300, 0.006);
        this.dialogue.say(
          [
            { who: 'morfeo', text: t('hub.nightmare.appear.1') },
            { who: 'morfeo', text: t('hub.nightmare.appear.2') },
          ],
          () => {
            data.nightmareIntroSeen = true;
            SaveManager.save();
          },
        );
      });
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

    const nearMorfeo = Math.abs(this.iris.x - DESK_X) < 80;
    const nearDoor = this.doors.find((d) => Math.abs(this.iris.x - d.x) < 55);
    if (nearMorfeo) {
      this.showPrompt(DESK_X, FLOOR_Y - 230, t('hub.interact'));
      if (this.inp.justDown('interact')) this.talkToMorfeo();
    } else if (nearDoor) {
      this.showPrompt(nearDoor.x, FLOOR_Y - 160, t('hub.enter'));
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
    else if (data.nightmareDone) pool = ['hub.morfeo.done.1', 'hub.morfeo.three.2'];
    else if (keys >= 3) pool = ['hub.morfeo.three.1', 'hub.morfeo.night.1'];
    else if (keys === 2) pool = ['hub.morfeo.two.1', 'hub.morfeo.two.2'];
    else if (keys === 1) pool = ['hub.morfeo.one.1', 'hub.morfeo.one.2'];
    else pool = ['hub.morfeo.zero.1', 'hub.morfeo.zero.2'];
    const lines: Line[] = [{ who: 'morfeo', text: t(pool[this.morfeoTalkIndex % pool.length]) }];
    const ff = SaveManager.fireflyCount();
    if (ff > 0 && this.morfeoTalkIndex % 3 === 2) {
      lines.push({ who: 'morfeo', text: t('hub.morfeo.fireflies', { n: ff }), mood: 'smug' });
    }
    this.morfeoTalkIndex += 1;
    this.dialogue.say(lines);
  }

  private enterDoor(door: DoorSpot): void {
    const data = SaveManager.data;
    if (door.id === 'own') {
      AudioManager.sfx('door');
      fadeToScene(this, 'DreamSong', undefined, 900);
      return;
    }
    if (door.id === 'wake') {
      if (data.songDone) {
        AudioManager.sfx('door');
        fadeToScene(this, 'Ending', undefined, 900);
      } else if (data.ownDreamRevealed) {
        this.dialogue.say([{ who: null, text: t('hub.wakeDoorOwn') }]);
      } else if (data.nightmareDone) {
        this.revealOwnDream();
      } else if (SaveManager.keyCount() >= 3) {
        this.dialogue.say([{ who: null, text: t('hub.wakeDoorNightmare') }]);
      } else {
        this.dialogue.say([{ who: null, text: t('hub.wakeDoorLocked') }]);
      }
      return;
    }
    const look = DOORS[door.id];
    if (!look.scene) return;
    AudioManager.sfx('door');
    fadeToScene(this, look.scene, undefined, 600);
  }

  /** La puerta de Iris gira... pero falta uno: el suyo. */
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
            this.time.delayedCall(1600, () => {
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
