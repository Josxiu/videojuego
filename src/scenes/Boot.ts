import Phaser from 'phaser';
import { registerAllSprites } from '../gfx/sprites';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

/** Fuentes que deben estar listas antes de dibujar cualquier texto. */
const FONTS_TO_LOAD = ['16px Silkscreen', '16px "Pixelify Sans"'];

/**
 * Arranque: carga fuentes, genera las texturas y decide la primera escena.
 * Phaser rasteriza el texto sobre canvas, así que las tipografías deben estar
 * disponibles antes del primer render o se dibujarían con la fuente de reserva.
 */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    SaveManager.load();
    AudioManager.muted = SaveManager.data.muted;
    registerAllSprites(this);

    // Indicador mínimo por si la carga de fuentes tarda en una red lenta
    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '...', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#3a3060',
      })
      .setOrigin(0.5);

    void this.loadFonts().then(() => {
      hint.destroy();
      this.goToFirstScene();
    });
  }

  /** Espera a las fuentes; si el navegador no soporta la API, sigue igualmente. */
  private async loadFonts(): Promise<void> {
    const fonts = document.fonts;
    if (!fonts?.load) return;
    try {
      await Promise.all(FONTS_TO_LOAD.map((f) => fonts.load(f)));
      await fonts.ready;
    } catch {
      // Si una fuente falla, el juego sigue con la de reserva en vez de quedarse colgado.
    }
  }

  private goToFirstScene(): void {
    // Permite abrir una escena directa con ?scene=Gallery (útil para depurar)
    const wanted = new URLSearchParams(location.search).get('scene');
    if (wanted && this.scene.manager.getScene(wanted)) {
      this.scene.start(wanted);
    } else {
      this.scene.start('MainMenu');
    }
  }
}
