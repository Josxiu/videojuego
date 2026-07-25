import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, textStyle } from '../config';
import { t } from '../i18n';
import type { TextKey } from '../i18n';
import { SaveManager } from '../systems/SaveManager';
import { addStarfield, fadeIn, fadeToScene } from '../systems/ui';

/** Intro cinemática: Iris se queda dormida. */
export class Intro extends Phaser.Scene {
  private lineIndex = 0;
  private lineText!: Phaser.GameObjects.Text;
  private busy = false;
  private lines: TextKey[] = ['intro.1', 'intro.2', 'intro.3', 'intro.4', 'intro.5'];

  constructor() {
    super('Intro');
  }

  create(): void {
    this.lineIndex = 0;
    this.busy = false;
    this.cameras.main.setBackgroundColor(0x0d0a1e);
    addStarfield(this, 40);
    fadeIn(this);

    const bed = this.add.image(GAME_WIDTH / 2, 380, 'bed').setScale(3.4);
    this.tweens.add({
      targets: bed,
      y: 384,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Zzz sobre la cama
    for (let i = 0; i < 3; i++) {
      const z = this.add
        .text(GAME_WIDTH / 2 - 40 + i * 18, 290 - i * 20, 'z', textStyle(16 + i * 5, '#7f6bb8'))
        .setAlpha(0);
      this.tweens.add({
        targets: z,
        alpha: { from: 0.8, to: 0 },
        y: z.y - 14,
        duration: 2000,
        repeat: -1,
        delay: 600 + i * 550,
      });
    }

    this.lineText = this.add
      .text(
        GAME_WIDTH / 2,
        150,
        '',
        textStyle(22, '#efe9ff', { align: 'center', wordWrap: { width: 700 } }),
      )
      .setOrigin(0.5)
      .setAlpha(0);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 26, t('intro.skip'), textStyle(13, '#554a80'))
      .setOrigin(0.5);

    this.showLine();
    this.input.on('pointerdown', () => this.next());
    this.input.keyboard?.on('keydown-SPACE', () => this.next());
    this.input.keyboard?.on('keydown-ENTER', () => this.next());
  }

  private showLine(): void {
    this.busy = true;
    this.lineText.setText(t(this.lines[this.lineIndex]));
    this.tweens.add({
      targets: this.lineText,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.busy = false;
      },
    });
  }

  private next(): void {
    if (this.busy) return;
    this.lineIndex += 1;
    if (this.lineIndex >= this.lines.length) {
      SaveManager.data.introSeen = true;
      SaveManager.save();
      fadeToScene(this, 'Hub', undefined, 900);
      return;
    }
    this.busy = true;
    this.tweens.add({
      targets: this.lineText,
      alpha: 0,
      duration: 300,
      onComplete: () => this.showLine(),
    });
  }
}
