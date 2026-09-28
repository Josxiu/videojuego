import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PIXEL_SCALE, FONT_HAND, textStyle } from '../config';
import { t } from '../i18n';
import type { TextKey } from '../i18n';
import { applyWorldFX } from '../gfx/postfx';
import { paintSong, BUILDING, windowCenter, allWindows, NEIGHBOR_WINDOWS } from './song/art';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { fadeIn, fadeToScene } from '../systems/ui';

type Shot = 'outside' | 'room';

/**
 * Intro: Iris se queda dormida.
 * El edificio de noche → Iris con audífonos → se acaba la batería → silencio
 * → el edificio suena → tres sueños se le meten por la ventana.
 */
export class Intro extends Phaser.Scene {
  private index = 0;
  private busy = false;
  private caption!: Phaser.GameObjects.Text;
  private outside: Phaser.GameObjects.GameObject[] = [];
  private room: Phaser.GameObjects.GameObject[] = [];
  private battery!: Phaser.GameObjects.Graphics;
  private batteryLevel = 1;

  constructor() {
    super('Intro');
  }

  create(): void {
    this.index = 0;
    this.busy = false;
    this.outside = [];
    this.room = [];
    this.batteryLevel = 1;
    this.cameras.main.setBackgroundColor(0x0d0a2e);
    applyWorldFX(this, 'menu');
    fadeIn(this, 900);
    AudioManager.playMusic('menu');
    paintSong(this);

    // Afuera
    this.outside.push(
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'song-night'),
      this.add.image(GAME_WIDTH / 2, BUILDING.ground + 4, 'song-skyline').setOrigin(0.5, 1),
      this.add.rectangle(GAME_WIDTH / 2, BUILDING.ground + 35, GAME_WIDTH, 70, 0x15102a),
      this.add.image(BUILDING.x - 20, 0, 'song-building').setOrigin(0, 0),
    );
    const [ix, iy] = windowCenter(3, 2);
    const irisWin = this.add.rectangle(ix, iy, 50, 40, 0x9ad8ff, 0.3);
    this.outside.push(irisWin);
    this.tweens.add({ targets: irisWin, fillAlpha: 0.12, duration: 1500, yoyo: true, repeat: -1 });

    // Adentro: el cuarto de Iris, a oscuras
    const roomGfx = this.add.graphics();
    roomGfx.fillStyle(0x120e28, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    roomGfx.fillStyle(0x0c0920, 1).fillRect(0, 400, GAME_WIDTH, GAME_HEIGHT - 400);
    // Ventana con luna y el edificio de enfrente
    roomGfx.fillStyle(0x1d1a44, 1).fillRect(90, 90, 210, 180);
    roomGfx.fillStyle(0xfff3d0, 0.9).fillCircle(240, 140, 22);
    roomGfx.fillStyle(0x1d1a44, 1).fillCircle(252, 134, 20);
    roomGfx.fillStyle(0x17122e, 1).fillRect(110, 200, 70, 70);
    roomGfx.fillStyle(0xffc070, 0.4).fillRect(125, 215, 14, 16);
    roomGfx.lineStyle(8, 0x2a2450, 1).strokeRect(90, 90, 210, 180);
    roomGfx.lineBetween(195, 90, 195, 270);
    // Buró y cajas sin abrir
    roomGfx.fillStyle(0x2a1e3a, 1).fillRect(700, 330, 90, 70);
    roomGfx.fillStyle(0x3a2a24, 1).fillRect(820, 300, 100, 100).fillRect(840, 250, 70, 50);
    this.room.push(roomGfx);
    const bed = this.add
      .image(GAME_WIDTH / 2 - 40, 410, 'bed')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 1.9);
    this.tweens.add({
      targets: bed,
      y: 413,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.room.push(bed);
    this.battery = this.add.graphics();
    this.room.push(this.battery);
    this.drawBattery();
    this.room.forEach((o) =>
      (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false),
    );

    this.caption = this.add
      .text(GAME_WIDTH / 2, 474, '', {
        fontFamily: FONT_HAND,
        fontSize: '25px',
        color: '#efe9ff',
        align: 'center',
        wordWrap: { width: 760 },
        stroke: '#0d0a2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0)
      .setDepth(50)
      .setAlpha(0);
    this.add
      .text(GAME_WIDTH - 14, 14, t('intro.skip'), textStyle(13, '#6a5a9a'))
      .setOrigin(1, 0)
      .setDepth(50);

    this.show();
    this.input.on('pointerdown', () => this.next());
    this.input.keyboard?.on('keydown-SPACE', () => this.next());
    this.input.keyboard?.on('keydown-ENTER', () => this.next());
  }

  private drawBattery(): void {
    const g = this.battery;
    g.clear();
    const x = 420;
    const y = 190;
    g.lineStyle(3, this.batteryLevel > 0 ? 0xcfc4ff : 0xff5d73, 0.9);
    g.strokeRect(x, y, 46, 22);
    g.fillStyle(this.batteryLevel > 0 ? 0xcfc4ff : 0xff5d73, 0.9);
    g.fillRect(x + 46, y + 7, 4, 8);
    if (this.batteryLevel > 0) g.fillStyle(0xff5d73, 1).fillRect(x + 4, y + 4, 8, 14);
    // audífonos dibujados junto a la batería
    g.lineStyle(4, 0xcfc4ff, 0.8);
    g.beginPath();
    g.arc(x - 30, y + 18, 16, Math.PI, 0);
    g.strokePath();
  }

  private setShot(shot: Shot): void {
    this.outside.forEach((o) =>
      (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(shot === 'outside'),
    );
    this.room.forEach((o) =>
      (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(shot === 'room'),
    );
  }

  private show(): void {
    const lines: TextKey[] = ['intro.1', 'intro.2', 'intro.3', 'intro.4', 'intro.5', 'intro.6'];
    const i = this.index;
    this.busy = true;
    this.caption.setText(t(lines[i]));
    switch (i) {
      case 0:
        this.setShot('outside');
        break;
      case 1: {
        this.setShot('room');
        // La batería parpadea
        this.tweens.add({
          targets: this.battery,
          alpha: 0.3,
          duration: 400,
          yoyo: true,
          repeat: 3,
        });
        break;
      }
      case 2:
        this.batteryLevel = 0;
        this.drawBattery();
        AudioManager.sfx('click');
        AudioManager.stopMusic();
        break;
      case 3:
        this.setShot('outside');
        this.buildingSounds();
        break;
      case 4:
        this.dreamsRise();
        break;
      case 5: {
        // Se duerme: la pantalla se oscurece (sin cerrar la cámara, eso lo hace la transición)
        const night = this.add
          .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d0a1e, 0)
          .setDepth(45);
        this.tweens.add({ targets: night, fillAlpha: 0.8, duration: 2600 });
        break;
      }
    }
    this.tweens.add({
      targets: this.caption,
      alpha: 1,
      duration: 600,
      onComplete: () => {
        this.busy = false;
      },
    });
  }

  /** Por primera vez, el edificio suena: cada vecino a su modo. */
  private buildingSounds(): void {
    const say = (
      win: readonly [number, number],
      text: string,
      delay: number,
      sound: () => void,
    ) => {
      this.time.delayedCall(delay, () => {
        const [x, y] = windowCenter(win[0], win[1]);
        sound();
        const txt = this.add
          .text(x + 30, y - 10, text, { fontFamily: FONT_HAND, fontSize: '20px', color: '#ffe8b0' })
          .setOrigin(0, 0.5)
          .setDepth(40)
          .setAlpha(0);
        this.outside.push(txt);
        this.tweens.add({ targets: txt, alpha: 1, y: y - 26, duration: 500 });
        this.tweens.add({ targets: txt, alpha: 0, delay: 2600, duration: 800 });
      });
    };
    say(NEIGHBOR_WINDOWS.exam, 'shh... shh...', 200, () => AudioManager.drum('broom', 0.3));
    say(NEIGHBOR_WINDOWS.fall, 'tum', 900, () => AudioManager.drum('box', 0.4));
    say(NEIGHBOR_WINDOWS.forest, 'plic', 1600, () => AudioManager.drum('drop', 0.15));
    say(NEIGHBOR_WINDOWS.chase, 'snif', 2300, () => AudioManager.note('toypiano', 'E5', 0.05, 0.4));
  }

  /** Cuarenta sueños suben por el tiro de luz; tres se meten por la ventana de Iris. */
  private dreamsRise(): void {
    const colors = [0x9d7bff, 0x86f7ff, 0xffd166, 0xff9ab0];
    allWindows().forEach(([l, c], i) => {
      const [x, y] = windowCenter(l, c);
      const w = this.add
        .image(x, y, 'glow-white')
        .setScale(0.6)
        .setTint(colors[i % 4])
        .setAlpha(0)
        .setDepth(30);
      this.outside.push(w);
      this.tweens.add({
        targets: w,
        alpha: 0.9,
        y: -60,
        x: x + Phaser.Math.Between(-40, 40),
        delay: i * 70,
        duration: 3500,
        ease: 'Sine.in',
      });
    });
    const [ix, iy] = windowCenter(3, 2);
    const sources = [NEIGHBOR_WINDOWS.exam, NEIGHBOR_WINDOWS.fall, NEIGHBOR_WINDOWS.forest];
    sources.forEach((win, k) => {
      const [x, y] = windowCenter(win[0], win[1]);
      const w = this.add.image(x, y, 'glow-gold').setScale(1.2).setDepth(31).setAlpha(0);
      this.outside.push(w);
      const state = { p: 0 };
      this.tweens.add({
        targets: state,
        p: 1,
        delay: 900 + k * 500,
        duration: 2200,
        ease: 'Sine.inOut',
        onStart: () => w.setAlpha(1),
        onUpdate: () => {
          const cx = (x + ix) / 2 + (k - 1) * 160;
          const cy = Math.min(y, iy) - 120;
          const p = state.p;
          w.setPosition(
            (1 - p) * (1 - p) * x + 2 * (1 - p) * p * cx + p * p * ix,
            (1 - p) * (1 - p) * y + 2 * (1 - p) * p * cy + p * p * iy,
          );
        },
        onComplete: () => {
          AudioManager.sfx('echo');
          this.tweens.add({ targets: w, scale: 0.2, alpha: 0, duration: 400 });
        },
      });
    });
  }

  private next(): void {
    if (this.busy) return;
    this.index += 1;
    if (this.index >= 6) {
      SaveManager.data.introSeen = true;
      SaveManager.save();
      fadeToScene(this, 'Hub', undefined, 600);
      return;
    }
    this.busy = true;
    this.tweens.add({
      targets: this.caption,
      alpha: 0,
      duration: 250,
      onComplete: () => this.show(),
    });
  }
}
