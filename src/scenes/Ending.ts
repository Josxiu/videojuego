import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PIXEL_SCALE, textStyle } from '../config';
import { t } from '../i18n';
import type { TextKey } from '../i18n';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { DialogueBox } from '../systems/DialogueBox';
import { addStarfield, fadeIn, fadeToScene, makeTextButton } from '../systems/ui';

/** Final del prototipo: la Puerta del Despertar se abre. */
export class Ending extends Phaser.Scene {
  private dialogue!: DialogueBox;

  constructor() {
    super('Ending');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x141026);
    addStarfield(this, 60);
    fadeIn(this, 800);
    AudioManager.playMusic('ending');

    // La gran puerta dorada
    const glow = this.add
      .image(GAME_WIDTH / 2, 300, 'glow-gold')
      .setScale(14)
      .setAlpha(0.3);
    this.tweens.add({
      targets: glow,
      alpha: 0.5,
      scale: 16,
      duration: 1600,
      yoyo: true,
      repeat: -1,
    });
    this.add
      .image(GAME_WIDTH / 2, 420, 'door')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 1.6)
      .setTint(0xffd166);

    // Las tres llaves orbitando la puerta
    for (let i = 0; i < 3; i++) {
      const key = this.add.image(GAME_WIDTH / 2 - 90 + i * 90, 180, 'key').setScale(3);
      this.tweens.add({
        targets: key,
        y: 168,
        angle: { from: -8, to: 8 },
        duration: 1200 + i * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    // Iris y Morfeo frente a la puerta
    const iris = this.add
      .sprite(GAME_WIDTH / 2 - 60, 470, 'iris')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE);
    iris.play('iris-idle');
    const morfeo = this.add
      .sprite(GAME_WIDTH / 2 + 70, 470, 'morfeo')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE);
    morfeo.play('morfeo-idle');

    this.dialogue = new DialogueBox(this);
    this.time.delayedCall(1000, () => {
      this.dialogue.say(
        [
          { who: null, text: t('ending.1') },
          { who: 'morfeo', text: t('ending.2') },
          { who: 'iris', text: t('ending.3') },
          { who: 'morfeo', text: t('ending.4') },
        ],
        () => this.throughTheDoor(),
      );
    });
  }

  /** Luz que lo inunda todo y epílogo. */
  private throughTheDoor(): void {
    AudioManager.sfx('door');
    AudioManager.sfx('win');
    const white = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xfff8e8, 0)
      .setDepth(970);
    this.tweens.add({
      targets: white,
      fillAlpha: 1,
      duration: 1800,
      onComplete: () => this.epilogue(white),
    });
  }

  private epilogue(white: Phaser.GameObjects.Rectangle): void {
    // Amanecer: la habitación de Iris en tonos cálidos
    this.cameras.main.setBackgroundColor(0xffe9d0);
    this.children.list
      .filter((c) => c !== white)
      .forEach((c) =>
        (c as Phaser.GameObjects.GameObject & { setVisible?: (v: boolean) => void }).setVisible?.(
          false,
        ),
      );

    const bed = this.add
      .image(GAME_WIDTH / 2, 330, 'bed')
      .setScale(3.4)
      .setDepth(980)
      .setAlpha(1);
    const sun = this.add.image(120, 100, 'glow-gold').setScale(9).setAlpha(0.5).setDepth(975);
    this.tweens.add({ targets: sun, alpha: 0.7, duration: 2000, yoyo: true, repeat: -1 });

    const lineText = this.add
      .text(
        GAME_WIDTH / 2,
        130,
        '',
        textStyle(20, '#7a4a2a', { align: 'center', wordWrap: { width: 720 } }),
      )
      .setOrigin(0.5)
      .setDepth(985);

    this.tweens.add({ targets: white, fillAlpha: 0, duration: 1500 });

    const lines: TextKey[] = ['ending.5', 'ending.6', 'ending.7', 'ending.8'];
    let i = 0;
    const showNext = () => {
      if (i >= lines.length) {
        this.tweens.add({ targets: lineText, alpha: 0, duration: 500 });
        this.finale(bed);
        return;
      }
      lineText.setAlpha(0).setText(t(lines[i]));
      i += 1;
      this.tweens.add({ targets: lineText, alpha: 1, duration: 600 });
    };
    showNext();
    this.input.on('pointerdown', showNext);
    this.input.keyboard?.on('keydown-SPACE', showNext);
    this.input.keyboard?.on('keydown-ENTER', showNext);
  }

  private finale(bed: Phaser.GameObjects.Image): void {
    this.input.removeAllListeners('pointerdown');
    this.tweens.add({ targets: bed, alpha: 0.25, duration: 900 });

    SaveManager.data.endingSeen = true;
    SaveManager.save();

    this.add
      .text(
        GAME_WIDTH / 2,
        170,
        t('ending.thanks'),
        textStyle(26, '#7a4a2a', { fontStyle: 'bold' }),
      )
      .setOrigin(0.5)
      .setDepth(990)
      .setAlpha(0)
      .setData('fade', true);
    this.add
      .text(
        GAME_WIDTH / 2,
        225,
        t('ending.stats', { n: SaveManager.fireflyCount(), total: SaveManager.fireflyTotal() }),
        textStyle(17, '#b8742c'),
      )
      .setOrigin(0.5)
      .setDepth(990)
      .setAlpha(0)
      .setData('fade', true);
    const cont = this.add
      .text(
        GAME_WIDTH / 2,
        280,
        t('ending.continue'),
        textStyle(19, '#9d7bff', { fontStyle: 'italic' }),
      )
      .setOrigin(0.5)
      .setDepth(990)
      .setAlpha(0)
      .setData('fade', true);
    this.tweens.add({
      targets: cont,
      alpha: { from: 0.4, to: 1 },
      delay: 1600,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    this.children.list
      .filter((c) => c.getData && c.getData('fade'))
      .forEach((c, idx) =>
        this.tweens.add({ targets: c, alpha: 1, duration: 700, delay: idx * 350 }),
      );

    this.time.delayedCall(1500, () => {
      makeTextButton(
        this,
        GAME_WIDTH / 2,
        400,
        'volver al menú',
        () => fadeToScene(this, 'MainMenu'),
        20,
      ).setDepth(990);
    });
  }
}
