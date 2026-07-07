import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, textStyle } from '../config';
import { fadeIn, fadeToScene, makeTextButton } from '../systems/ui';

// Escenas provisionales mientras se construye cada sueño.
function buildStub(scene: Phaser.Scene, title: string): void {
  scene.cameras.main.setBackgroundColor(0x141026);
  fadeIn(scene);
  scene.add
    .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, `${title}\n(en construcción)`, textStyle(24, '#cfc4ff', { align: 'center' }))
    .setOrigin(0.5);
  makeTextButton(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 'volver', () => fadeToScene(scene, 'Hub'));
}

export class Ending extends Phaser.Scene {
  constructor() {
    super('Ending');
  }
  create(): void {
    buildStub(this, 'EL DESPERTAR');
  }
}
