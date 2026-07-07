import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PIXEL_SCALE, textStyle, DreamId, DEPTH_HUD } from '../config';
import { t } from '../i18n';
import type { TextKey } from '../i18n';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../systems/InputManager';
import { DialogueBox, Line } from '../systems/DialogueBox';
import { addMuteButton, fadeIn, fadeToScene } from '../systems/ui';

const WORLD_W = 1860;
const FLOOR_Y = 470;

interface DoorSpot {
  x: number;
  dream: DreamId | 'chase' | 'wake';
  sprite: Phaser.GameObjects.Image;
  label: string;
}

/** El Entresueño: pasillo entre sueños con Morfeo y las puertas. */
export class Hub extends Phaser.Scene {
  private iris!: Phaser.GameObjects.Sprite;
  private morfeo!: Phaser.GameObjects.Sprite;
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private prompt!: Phaser.GameObjects.Text;
  private doors: DoorSpot[] = [];
  private morfeoTalkIndex = 0;

  constructor() {
    super('Hub');
  }

  create(): void {
    this.doors = [];
    this.cameras.main.setBackgroundColor(0x141026);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    fadeIn(this);
    AudioManager.playMusic('hub');

    // Estrellas lejanas (parallax manual con scrollFactor)
    for (let i = 0; i < 110; i++) {
      const star = this.add
        .image(Phaser.Math.Between(0, WORLD_W), Phaser.Math.Between(0, FLOOR_Y - 20), 'px')
        .setScrollFactor(0.4)
        .setAlpha(Phaser.Math.FloatBetween(0.1, 0.6))
        .setScale(Phaser.Math.FloatBetween(0.5, 1.3));
      this.tweens.add({
        targets: star,
        alpha: 0.05,
        duration: Phaser.Math.Between(1200, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2500),
      });
    }

    // Piso: agua oscura que refleja estrellas
    this.add.rectangle(WORLD_W / 2, (FLOOR_Y + GAME_HEIGHT) / 2 + 4, WORLD_W, GAME_HEIGHT - FLOOR_Y + 8, 0x1e1838);
    this.add.rectangle(WORLD_W / 2, FLOOR_Y + 2, WORLD_W, 3, 0x4a3a80, 0.9);
    for (let i = 0; i < 70; i++) {
      const r = this.add
        .image(Phaser.Math.Between(0, WORLD_W), Phaser.Math.Between(FLOOR_Y + 12, GAME_HEIGHT), 'px')
        .setAlpha(Phaser.Math.FloatBetween(0.05, 0.3))
        .setTint(0x9d7bff);
      this.tweens.add({
        targets: r,
        alpha: 0.02,
        duration: Phaser.Math.Between(800, 2200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1500),
      });
    }

    // Niebla flotante
    for (let i = 0; i < 8; i++) {
      const fog = this.add
        .image(Phaser.Math.Between(0, WORLD_W), Phaser.Math.Between(380, 460), 'glow-violet')
        .setScale(Phaser.Math.FloatBetween(4, 9), 1.5)
        .setAlpha(0.05);
      this.tweens.add({
        targets: fog,
        x: fog.x + Phaser.Math.Between(-80, 80),
        duration: Phaser.Math.Between(4000, 8000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    // Puertas de los sueños
    this.addDoor(620, 'exam', 0xffb020, `${t('exam.title')}`);
    this.addDoor(950, 'fall', 0x8f7bff, `${t('fall.title')}`);
    this.addDoor(1280, 'forest', 0x7fd8a0, `${t('forest.title')}`);
    if (SaveManager.keyCount() >= 3 && !SaveManager.data.nightmareDone) this.addNightmareDoor(1470);
    this.addWakeDoor(1700);

    // Morfeo
    this.morfeo = this.add.sprite(300, FLOOR_Y, 'morfeo').setOrigin(0.5, 1).setScale(PIXEL_SCALE);
    this.morfeo.play('morfeo-idle');
    this.add.image(300, FLOOR_Y - 24, 'glow-cyan').setScale(3).setAlpha(0.12);

    // Iris
    this.iris = this.add.sprite(150, FLOOR_Y, 'iris').setOrigin(0.5, 1).setScale(PIXEL_SCALE);
    this.iris.play('iris-idle');
    this.cameras.main.startFollow(this.iris, true, 0.09, 0.09);

    // UI
    this.prompt = this.add
      .text(0, 0, '', textStyle(14, '#ffd166', { backgroundColor: '#0d0a1ecc', padding: { x: 8, y: 4 } }))
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

    // Aviso único cuando aparece la puerta de la pesadilla
    if (
      SaveManager.data.metMorfeo &&
      SaveManager.keyCount() >= 3 &&
      !SaveManager.data.nightmareDone &&
      !SaveManager.data.nightmareIntroSeen
    ) {
      this.time.delayedCall(700, () => {
        AudioManager.sfx('screech');
        this.cameras.main.shake(300, 0.006);
        this.dialogue.say(
          [
            { who: 'morfeo', text: t('hub.nightmare.appear.1') },
            { who: 'morfeo', text: t('hub.nightmare.appear.2') },
          ],
          () => {
            SaveManager.data.nightmareIntroSeen = true;
            SaveManager.save();
          },
        );
      });
    }

    // Primer encuentro con Morfeo
    if (!SaveManager.data.metMorfeo) {
      this.time.delayedCall(700, () => {
        this.dialogue.say(
          [
            { who: 'morfeo', text: t('hub.meet.1') },
            { who: 'iris', text: t('hub.meet.2') },
            { who: 'morfeo', text: t('hub.meet.3') },
            { who: 'morfeo', text: t('hub.meet.4') },
            { who: 'iris', text: t('hub.meet.5') },
            { who: 'morfeo', text: t('hub.meet.6') },
            { who: 'morfeo', text: t('hub.meet.7') },
            { who: 'morfeo', text: t('hub.meet.8') },
            { who: 'morfeo', text: t('hub.meet.9') },
          ],
          () => {
            SaveManager.data.metMorfeo = true;
            SaveManager.save();
          },
        );
        AudioManager.sfx('meow');
      });
    }

    // Nombre del lugar
    const placeName = this.add
      .text(GAME_WIDTH / 2, 60, t('hub.title'), textStyle(22, '#9d7bff', { letterSpacing: 6 }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0);
    this.tweens.add({ targets: placeName, alpha: 0.9, duration: 1200, hold: 1600, yoyo: true });
  }

  private addDoor(x: number, dream: DreamId, tint: number, label: string): void {
    const glow = this.add.image(x, FLOOR_Y - 54, 'glow-violet').setScale(5).setAlpha(0.1);
    this.tweens.add({ targets: glow, alpha: 0.2, duration: 1600, yoyo: true, repeat: -1 });
    const door = this.add.image(x, FLOOR_Y, 'door').setOrigin(0.5, 1).setScale(PIXEL_SCALE).setTint(tint);
    this.add
      .text(x, FLOOR_Y - 120, label, textStyle(14, '#cfc4ff', { align: 'center' }))
      .setOrigin(0.5);
    if (SaveManager.data.keys[dream]) {
      this.add.image(x, FLOOR_Y - 130 - 20, 'key').setScale(2).setAlpha(0.95);
    }
    this.doors.push({ x, dream, sprite: door, label });
  }

  private addNightmareDoor(x: number): void {
    const glow = this.add.image(x, FLOOR_Y - 60, 'glow-red').setScale(6).setAlpha(0.18);
    this.tweens.add({ targets: glow, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
    const door = this.add.image(x, FLOOR_Y, 'door').setOrigin(0.5, 1).setScale(PIXEL_SCALE).setTint(0x2a2a35);
    this.tweens.add({ targets: door, alpha: 0.75, duration: 900, yoyo: true, repeat: -1 });
    this.add
      .text(x, FLOOR_Y - 120, '???', textStyle(14, '#ff6b6b', { align: 'center' }))
      .setOrigin(0.5);
    // Ojos rojos asomando por la rendija
    const eyeL = this.add.image(x - 8, FLOOR_Y - 52, 'glow-red').setScale(0.5).setAlpha(0.6);
    const eyeR = this.add.image(x + 8, FLOOR_Y - 52, 'glow-red').setScale(0.5).setAlpha(0.6);
    this.tweens.add({ targets: [eyeL, eyeR], alpha: 0.1, duration: 1300, yoyo: true, repeat: -1 });
    this.doors.push({ x, dream: 'chase', sprite: door, label: '???' });
  }

  private addWakeDoor(x: number): void {
    const ready = SaveManager.keyCount() >= 3 && SaveManager.data.nightmareDone;
    const glow = this.add.image(x, FLOOR_Y - 70, 'glow-gold').setScale(ready ? 9 : 5).setAlpha(ready ? 0.25 : 0.08);
    this.tweens.add({ targets: glow, alpha: ready ? 0.45 : 0.15, duration: 1200, yoyo: true, repeat: -1 });
    const door = this.add
      .image(x, FLOOR_Y, 'door')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 1.35)
      .setTint(ready ? 0xffd166 : 0x6a6a7a);
    this.add
      .text(x, FLOOR_Y - 160, '☀', textStyle(26, ready ? '#ffd166' : '#554a80'))
      .setOrigin(0.5);
    this.doors.push({ x, dream: 'wake', sprite: door, label: '' });
  }

  private addHud(): void {
    const keys = SaveManager.keyCount();
    this.add.image(28, 28, 'key').setScale(2).setScrollFactor(0).setDepth(DEPTH_HUD);
    this.add
      .text(48, 28, `${keys}/3`, textStyle(16, '#ffd75e'))
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);
    this.add.image(120, 28, 'glow-gold').setScale(1).setScrollFactor(0).setDepth(DEPTH_HUD);
    this.add
      .text(138, 28, `${SaveManager.fireflyCount()}`, textStyle(16, '#ffd166'))
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD);
  }

  update(): void {
    this.inp.update();
    if (this.dialogue.active) {
      this.iris.play('iris-idle', true);
      return;
    }

    // Movimiento de Iris
    const speed = 3.4;
    let moving = false;
    if (this.inp.isDown('left')) {
      this.iris.x = Math.max(40, this.iris.x - speed);
      this.iris.setFlipX(true);
      moving = true;
    } else if (this.inp.isDown('right')) {
      this.iris.x = Math.min(WORLD_W - 40, this.iris.x + speed);
      this.iris.setFlipX(false);
      moving = true;
    }
    this.iris.play(moving ? 'iris-walk' : 'iris-idle', true);

    // Interacciones cercanas
    const nearMorfeo = Math.abs(this.iris.x - this.morfeo.x) < 70;
    const nearDoor = this.doors.find((d) => Math.abs(this.iris.x - d.x) < 55);

    if (nearMorfeo) {
      this.showPrompt(this.morfeo.x, FLOOR_Y - 70, t('hub.interact'));
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
    const keys = SaveManager.keyCount();
    const pools: Record<number, TextKey[]> = {
      0: ['hub.morfeo.zero.1'],
      1: ['hub.morfeo.one.1', 'hub.morfeo.one.2'],
      2: ['hub.morfeo.two.1', 'hub.morfeo.two.2'],
      3: ['hub.morfeo.three.1', 'hub.morfeo.night.1'],
    };
    let pool = pools[keys];
    if (keys >= 3 && SaveManager.data.nightmareDone) {
      pool = ['hub.morfeo.done.1', 'hub.morfeo.three.2'];
    }
    const lines: Line[] = [{ who: 'morfeo', text: t(pool[this.morfeoTalkIndex % pool.length]) }];
    const ff = SaveManager.fireflyCount();
    if (ff > 0 && this.morfeoTalkIndex % 3 === 2) {
      lines.push({ who: 'morfeo', text: t('hub.morfeo.fireflies', { n: ff }) });
    }
    this.morfeoTalkIndex += 1;
    this.dialogue.say(lines);
  }

  private enterDoor(door: DoorSpot): void {
    if (door.dream === 'wake') {
      if (SaveManager.keyCount() >= 3 && SaveManager.data.nightmareDone) {
        AudioManager.sfx('door');
        fadeToScene(this, 'Ending', undefined, 800);
      } else if (SaveManager.keyCount() >= 3) {
        this.dialogue.say([{ who: null, text: t('hub.wakeDoorNightmare') }]);
      } else {
        this.dialogue.say([{ who: null, text: t('hub.wakeDoorLocked') }]);
      }
      return;
    }
    AudioManager.sfx('door');
    const target = {
      exam: 'DreamExam',
      fall: 'DreamFall',
      forest: 'DreamForest',
      chase: 'DreamChase',
    }[door.dream];
    fadeToScene(this, target, undefined, 600);
  }
}
