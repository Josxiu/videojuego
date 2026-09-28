import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, textStyle, titleStyle } from '../config';
import { t } from '../i18n';
import { applyWorldFX } from '../gfx/postfx';
import { paintSong, BUILDING, windowCenter, allWindows } from './song/art';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { makeTextButton, addMuteButton, fadeIn, fadeToScene } from '../systems/ui';

/** Cuánto se corre el edificio a la derecha en el menú. */
const SHIFT = 230;

export class MainMenu extends Phaser.Scene {
  private resetArmed = false;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.resetArmed = false;
    this.cameras.main.setBackgroundColor(0x0d0a2e);
    applyWorldFX(this, 'menu');
    fadeIn(this, 700);
    AudioManager.playMusic('menu');
    paintSong(this);

    // El edificio Girasol de noche: cuarenta personas dormidas
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'song-night');
    this.add.image(GAME_WIDTH / 2 + 120, BUILDING.ground + 4, 'song-skyline').setOrigin(0.5, 1);
    this.add.rectangle(GAME_WIDTH / 2, BUILDING.ground + 35, GAME_WIDTH, 70, 0x15102a);
    this.add.image(BUILDING.x - 20 + SHIFT, 0, 'song-building').setOrigin(0, 0);
    // La ventana de Iris, apenas encendida (la pantalla del celular)
    const [ix, iy] = windowCenter(3, 2);
    const irisWin = this.add.rectangle(ix + SHIFT, iy, 50, 40, 0x9ad8ff, 0.25);
    this.tweens.add({ targets: irisWin, fillAlpha: 0.1, duration: 1800, yoyo: true, repeat: -1 });

    // Sueños que suben de las ventanas
    const colors = [0x9d7bff, 0x86f7ff, 0xffd166, 0xff9ab0];
    allWindows().forEach(([l, c], i) => {
      const [x, y] = windowCenter(l, c);
      this.time.addEvent({
        delay: 1400 + ((i * 397) % 2600),
        loop: true,
        callback: () => {
          if (Math.random() > 0.35) return;
          const w = this.add
            .image(x + SHIFT, y - 10, 'glow-white')
            .setScale(0.5)
            .setTint(colors[i % colors.length])
            .setAlpha(0.8);
          this.tweens.add({
            targets: w,
            y: -40,
            x: w.x + Phaser.Math.Between(-60, 60),
            alpha: 0,
            duration: Phaser.Math.Between(5000, 8000),
            ease: 'Sine.in',
            onComplete: () => w.destroy(),
          });
        },
      });
    });

    // Título
    const title = this.add
      .text(250, 150, t('menu.title'), titleStyle(46, '#cfc4ff', { letterSpacing: 6 }))
      .setOrigin(0.5);
    this.tweens.add({
      targets: title,
      y: 144,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.add
      .text(
        250,
        205,
        t('menu.subtitle'),
        textStyle(16, '#8a7ac8', { align: 'center', wordWrap: { width: 380 } }),
      )
      .setOrigin(0.5);
    for (let i = 0; i < 3; i++) {
      const z = this.add
        .text(420 + i * 18, 110 - i * 20, 'z', textStyle(16 + i * 5, '#7f6bb8'))
        .setAlpha(0.7);
      this.tweens.add({
        targets: z,
        y: z.y - 16,
        alpha: 0.1,
        duration: 1800,
        repeat: -1,
        delay: i * 500,
      });
    }

    const data = SaveManager.data;
    const hasProgress = data.introSeen;
    makeTextButton(
      this,
      250,
      300,
      hasProgress ? t('menu.continue') : t('menu.play'),
      () => fadeToScene(this, hasProgress ? 'Hub' : 'Intro', undefined, 700),
      24,
    );

    if (hasProgress) {
      const got: [string, boolean][] = [
        ['gis', data.keys.exam],
        ['llave', data.keys.fall],
        ['bote', data.keys.forest],
        ['dibujo', data.nightmareDone],
        ['grabadora', data.songDone],
      ];
      got.forEach(([key, has], i) =>
        this.add
          .image(170 + i * 40, 368, key)
          .setScale(1.8)
          .setAlpha(has ? 1 : 0.2),
      );
      this.add
        .text(
          250,
          400,
          `✦ ${SaveManager.fireflyCount()}/${SaveManager.fireflyTotal()}`,
          textStyle(15, '#ffd166'),
        )
        .setOrigin(0.5);

      const resetBtn = this.add
        .text(250, 440, t('menu.reset'), textStyle(13, '#6a5a9a'))
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      resetBtn.on('pointerdown', () => {
        if (!this.resetArmed) {
          this.resetArmed = true;
          resetBtn.setText(t('menu.resetConfirm')).setColor('#ff5d73');
        } else {
          SaveManager.reset();
          this.scene.restart();
        }
      });
    }

    this.add
      .text(14, GAME_HEIGHT - 10, t('menu.credits'), textStyle(12, '#5a4a8a'))
      .setOrigin(0, 1);
    addMuteButton(this);
  }
}
