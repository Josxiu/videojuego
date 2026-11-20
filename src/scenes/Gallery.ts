import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, textStyle } from '../config';
import { SPRITES } from '../gfx/sprites';
import { addStyled, type ArtStyle } from '../gfx/stylize';

/**
 * Escena de depuración (?scene=Gallery): todo el pixel art y cómo lo
 * re-interpreta cada uno de los 8 estilos 2D del juego.
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
      this.page = (this.page + 1) % 3;
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
    else if (this.page === 1) this.drawStyles(0);
    else this.drawStyles(1);
  }

  private drawPixel(): void {
    this.items.push(
      this.add.text(
        12,
        8,
        'GALERÍA · pixel art base (clic/espacio = estilos)',
        textStyle(14, '#ffffff'),
      ),
    );
    let x = 32;
    let y = 44;
    let rowH = 0;
    for (const def of SPRITES) {
      def.frames.forEach((_, i) => {
        const frame = def.frames.length > 1 ? String(i) : undefined;
        const img = this.add.image(0, 0, def.key, frame).setOrigin(0, 0);
        const scale =
          def.key === 'bed' || def.key === 'bed-morning' || def.key === 'door' ? 1.5 : 2.2;
        img.setScale(scale);
        const w = img.displayWidth;
        const h = img.displayHeight;
        if (x + w > GAME_WIDTH - 20) {
          x = 32;
          y += rowH + 18;
          rowH = 0;
        }
        img.setPosition(x, y);
        this.items.push(img);
        const lbl = this.add
          .text(
            x + w / 2,
            y + h + 2,
            frame !== undefined ? `${def.key}#${i}` : def.key,
            textStyle(10, '#cfc4ff'),
          )
          .setOrigin(0.5, 0);
        this.items.push(lbl);
        x += Math.max(w, lbl.width * 0.72) + 14;
        rowH = Math.max(rowH, h);
      });
    }
  }

  private drawStyles(batch: 0 | 1): void {
    this.items.push(
      this.add.text(
        12,
        8,
        `GALERÍA · estilos ${batch === 0 ? 'Acto I + Crayola' : 'Nuevas técnicas'}`,
        textStyle(14, '#ffffff'),
      ),
    );
    const styles: [ArtStyle, number][] =
      batch === 0
        ? [
            ['chalk', 0x23392f],
            ['paper', 0x2c3d73],
            ['watercolor', 0xf4ecd8],
            ['crayon', 0xfbf7ee],
          ]
        : [
            ['shadow', 0x2b150a],
            ['embroidery', 0xefe6d5],
            ['stainedglass', 0x121626],
            ['woodcut', 0xf2ead7],
          ];
    const cellW = GAME_WIDTH / 4;
    styles.forEach(([style, bg], col) => {
      const x0 = col * cellW;
      this.items.push(
        this.add.rectangle(x0 + cellW / 2, GAME_HEIGHT / 2 + 22, cellW - 8, GAME_HEIGHT - 54, bg),
      );
      this.items.push(
        this.add
          .text(x0 + cellW / 2, 50, style, textStyle(14, bg > 0x888888 ? '#222' : '#fff'))
          .setOrigin(0.5, 0),
      );
      const put = (key: string, frame: string | undefined, x: number, y: number, s = 1) => {
        const spr = addStyled(this, x0 + x, y, key, style, { frame, feet: true, scale: s });
        this.items.push(spr);
      };
      put('iris', '0', 55, 160);
      put('iris', '4', 120, 160);
      put('morfeo', '0', 185, 155);
      put('goyo', '0', 45, 290);
      put('renata', '0', 100, 290);
      put('paloma', '0', 155, 290);
      put('mateo', '0', 205, 290);
      put('portrait-iris', '0', 70, 420);
      put('portrait-morfeo', '0', 175, 420);
      put('boleto', undefined, 55, 495);
      put('dedal', undefined, 120, 495);
      put('prisma', undefined, 185, 495);
    });
  }
}
