import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, textStyle } from '../config';
import { t } from '../i18n';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { makeTextButton, addMuteButton, addStarfield, fadeIn, fadeToScene } from '../systems/ui';

export class MainMenu extends Phaser.Scene {
  private resetArmed = false;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.resetArmed = false;
    this.cameras.main.setBackgroundColor(0x0d0a1e);
    addStarfield(this);
    fadeIn(this);
    AudioManager.playMusic('menu');

    // Título flotante
    const title = this.add
      .text(GAME_WIDTH / 2, 150, t('menu.title'), textStyle(64, '#cfc4ff', { fontStyle: 'bold', letterSpacing: 10 }))
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 208, t('menu.subtitle'), textStyle(17, '#7f6bb8'))
      .setOrigin(0.5);
    this.tweens.add({ targets: title, y: 142, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Zzz flotando
    for (let i = 0; i < 3; i++) {
      const z = this.add
        .text(GAME_WIDTH / 2 + 190 + i * 22, 120 - i * 24, 'z', textStyle(20 + i * 6, '#7f6bb8'))
        .setAlpha(0.7);
      this.tweens.add({
        targets: z,
        y: z.y - 16,
        alpha: 0.15,
        duration: 1800,
        repeat: -1,
        delay: i * 500,
      });
    }

    // Iris dormida en su cama
    const bed = this.add.image(GAME_WIDTH / 2, 320, 'bed').setScale(3);
    this.tweens.add({ targets: bed, y: 324, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const hasProgress = SaveManager.data.introSeen;
    makeTextButton(this, GAME_WIDTH / 2, 428, hasProgress ? t('menu.continue') : t('menu.play'), () => {
      fadeToScene(this, hasProgress ? 'Hub' : 'Intro');
    }, 26);

    if (hasProgress) {
      const info = `🗝 ${SaveManager.keyCount()}/3   ✦ ${SaveManager.fireflyCount()}/${SaveManager.fireflyTotal()}`;
      this.add.text(GAME_WIDTH / 2, 470, info, textStyle(15, '#7f6bb8')).setOrigin(0.5);

      const resetBtn = this.add
        .text(GAME_WIDTH / 2, 505, t('menu.reset'), textStyle(13, '#554a80'))
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
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 10, t('menu.credits'), textStyle(12, '#453a6a'))
      .setOrigin(1, 1);
    addMuteButton(this);
  }
}
