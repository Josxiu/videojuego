import Phaser from 'phaser';
import { GAME_WIDTH, textStyle } from '../config';

/** Escena de depuración: muestra todos los sprites (?scene=Gallery). */
export class Gallery extends Phaser.Scene {
  constructor() {
    super('Gallery');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x2a2455);
    this.add.text(12, 8, 'GALERÍA DE SPRITES', textStyle(18, '#ffffff'));

    const entries: [string, string | undefined][] = [
      ['iris', '0'],
      ['iris', '1'],
      ['iris', '2'],
      ['iris', '3'],
      ['iris', '4'],
      ['iris-fall', '0'],
      ['iris-fall', '1'],
      ['iris-slide', undefined],
      ['morfeo', '0'],
      ['morfeo', '1'],
      ['door', undefined],
      ['key', undefined],
      ['heart', undefined],
      ['bed', undefined],
      ['locker', undefined],
      ['paper', undefined],
      ['bell', undefined],
      ['clock', undefined],
      ['window', undefined],
      ['tree', undefined],
      ['lantern', undefined],
      ['glow-gold', undefined],
    ];

    let x = 60;
    let y = 110;
    for (const [key, frame] of entries) {
      const img = frame !== undefined ? this.add.image(x, y, key, frame) : this.add.image(x, y, key);
      img.setScale(3);
      this.add
        .text(x, y + 66, frame !== undefined ? `${key}#${frame}` : key, textStyle(10, '#cfc4ff'))
        .setOrigin(0.5, 0);
      x += 110;
      if (x > GAME_WIDTH - 60) {
        x = 60;
        y += 150;
      }
    }

    // Animaciones en vivo
    this.add.sprite(80, 480, 'iris').play('iris-walk').setScale(3);
    this.add.sprite(160, 480, 'iris-fall').play('iris-falling').setScale(3);
    this.add.sprite(280, 480, 'morfeo').play('morfeo-idle').setScale(3);
  }
}
