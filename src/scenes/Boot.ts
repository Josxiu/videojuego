import Phaser from 'phaser';
import { registerAllSprites } from '../gfx/sprites';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    SaveManager.load();
    AudioManager.muted = SaveManager.data.muted;
    registerAllSprites(this);

    // Permite abrir una escena directa con ?scene=Gallery (útil para depurar)
    const wanted = new URLSearchParams(location.search).get('scene');
    if (wanted && this.scene.manager.getScene(wanted)) {
      this.scene.start(wanted);
    } else {
      this.scene.start('MainMenu');
    }
  }
}
