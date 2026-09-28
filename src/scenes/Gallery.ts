import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, textStyle } from '../config';
import { SPRITES } from '../gfx/sprites';
import { addStyled, type ArtStyle } from '../gfx/stylize';

/**
 * Escena de depuración (?scene=Gallery): todo el pixel art y cómo lo
 * re-interpreta cada sueño. Clic o espacio para cambiar de página.
 */
export class Gallery extends Phaser.Scene {
  private page = 0;
  private items: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Gallery');
  }

  create(data: { page?: number } = {}): void {
    this.page = data.page ?? Number(new URLSearchParams(location.search).get('page') ?? 0);
    this.cameras.main.setBackgroundColor(0x2a2455);
    this.draw();
    const next = () => {
      this.page = (this.page + 1) % 2;
      this.draw();
    };
    this.input.on('pointerdown', next);
    this.input.keyboard?.on('keydown-SPACE', next);
  }

  private clear(): void {
    this.items.forEach((i) => i.destroy());
    this.items = [];
  }

  private draw(): void {
    this.clear();
    if (this.page === 0) this.drawPixel();
    else this.drawStyles();
  }

  private label(x: number, y: number, text: string): void {
    this.items.push(this.add.text(x, y, text, textStyle(10, '#cfc4ff')).setOrigin(0.5, 0));
  }

  private drawPixel(): void {
    this.items.push(this.add.text(12, 8, 'GALERÍA · pixel art base', textStyle(16, '#ffffff')));
    let x = 40;
    let y = 60;
    let rowH = 0;
    for (const def of SPRITES) {
      def.frames.forEach((_, i) => {
        const tex = this.textures.get(def.key);
        const frame = def.frames.length > 1 ? String(i) : undefined;
        const img = this.add.image(0, 0, def.key, frame).setOrigin(0, 0);
        const scale = def.key === 'bed' || def.key === 'door' ? 2 : 3;
        img.setScale(scale);
        const w = img.displayWidth;
        const h = img.displayHeight;
        if (x + w > GAME_WIDTH - 20) {
          x = 40;
          y += rowH + 22;
          rowH = 0;
        }
        img.setPosition(x, y);
        this.items.push(img);
        this.label(x + w / 2, y + h + 2, frame !== undefined ? `${def.key}#${i}` : def.key);
        x += w + 14;
        rowH = Math.max(rowH, h);
        void tex;
      });
    }
  }

  private drawStyles(): void {
    this.items.push(this.add.text(12, 8, 'GALERÍA · estilos por sueño', textStyle(16, '#ffffff')));
    const styles: [ArtStyle, number][] = [
      ['chalk', 0x23392f],
      ['paper', 0x2c3d73],
      ['watercolor', 0xf4ecd8],
      ['crayon', 0xfbf7ee],
    ];
    const cellW = GAME_WIDTH / 4;
    styles.forEach(([style, bg], col) => {
      const x0 = col * cellW;
      this.items.push(
        this.add.rectangle(x0 + cellW / 2, GAME_HEIGHT / 2 + 20, cellW - 8, GAME_HEIGHT - 50, bg),
      );
      this.items.push(
        this.add
          .text(x0 + cellW / 2, 40, style, textStyle(14, bg > 0x888888 ? '#333' : '#fff'))
          .setOrigin(0.5, 0),
      );
      const put = (key: string, frame: string | undefined, x: number, y: number, s = 1) => {
        const spr = addStyled(this, x0 + x, y, key, style, { frame, feet: true, scale: s });
        this.items.push(spr);
      };
      put('iris', '0', 50, 150);
      put('iris', '4', 110, 150);
      put('iris', '10', 170, 150);
      put('morfeo', '0', 60, 240);
      put('iris', '8', 170, 250);
      put('elmer', '0', 40, 350);
      put('nadia', '0', 95, 350);
      put('chuy', '0', 150, 350);
      put('tomas', '0', 200, 350);
      put('portrait-iris', '0', 60, 460);
      put('portrait-morfeo', '0', 170, 460);
      put('gis', undefined, 40, 500, 1);
      put('bote', undefined, 110, 510, 1);
      put('firefly', undefined, 190, 505, 1.2);
    });
  }
}
