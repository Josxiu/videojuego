import { DREAM_SCENE, FONT, H, W, txt, type DreamId } from '../../config';
import type { TrackId } from '../../systems/audio/tracks';
import { THEMES } from '../../systems/dialogue';
import { DreamScene } from '../DreamScene';

/** Sueño provisional (se reemplaza al construir cada sueño). Se completa tocando. */
export class DreamPlaceholder extends DreamScene {
  readonly dream: DreamId = 'reme';
  readonly theme = THEMES.riso;
  readonly card = { bg: 0x1b1f3b, ink: '#f4ead5', accent: '#ff5fa2', font: FONT.display };
  readonly music: TrackId = 'night';

  static for(id: DreamId): typeof Phaser.Scene {
    return class extends DreamPlaceholder {
      readonly dream: DreamId = id;
      constructor() {
        super(DREAM_SCENE[id]);
      }
    };
  }

  protected build(): void {
    this.add.text(W / 2, H / 2, this.txt.title, txt(40, '#f4ead5', FONT.display)).setOrigin(0.5);
  }

  protected startAct(): void {
    this.input.once('pointerdown', () => void this.complete());
  }
}
