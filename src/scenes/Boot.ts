import { DREAMS, H, W } from '../config';
import { FONT_FACES } from '../fonts';
import { buildRisoTextures } from '../gfx/riso';
import { buildAnims, buildCharacterSprites } from '../gfx/sprites';
import { buildTrainSide } from '../gfx/trainSide';
import { Audio } from '../systems/audio/Audio';
import { debug } from '../systems/debug';
import { Save } from '../systems/save';

/** Arranque: fuentes, partida guardada, texturas compartidas y primera escena. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x14162e);
    Save.load();
    if (debug.flag('all')) {
      for (const d of DREAMS) Save.data.dreams[d].done = d !== 'celeste' && d !== 'abel';
      Save.data.started = true;
    }
    Audio.muted = Save.data.muted;
    const dots = this.add
      .text(W / 2, H / 2, '· · ·', { fontFamily: 'monospace', fontSize: '22px', color: '#ff5fa2' })
      .setOrigin(0.5);
    this.tweens.add({ targets: dots, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    void this.loadFonts().then(() => {
      buildRisoTextures(this);
      buildCharacterSprites(this);
      buildAnims(this);
      buildTrainSide(this);
      const wanted = debug.str('scene');
      if (wanted && this.scene.manager.getScene(wanted)) this.scene.start(wanted);
      else this.scene.start('Menu');
    });
  }

  private async loadFonts(): Promise<void> {
    const f = document.fonts;
    if (!f?.load) return;
    try {
      await Promise.race([
        Promise.all(FONT_FACES.map((x) => f.load(x))),
        new Promise((res) => setTimeout(res, 4000)),
      ]);
    } catch {
      // si una fuente falla seguimos con la de reserva
    }
  }
}
