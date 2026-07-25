import Phaser from 'phaser';

/**
 * Pixel art definido como texto: cada carácter es un color de la paleta,
 * '.' es transparente. Las texturas se generan en runtime sobre un canvas,
 * así el arte vive en el código y no hay archivos binarios en el repo.
 */
export type Palette = Record<string, string>;

function drawRows(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  palette: Palette,
  offsetX: number,
  name: string,
): void {
  const w = rows[0].length;
  rows.forEach((row, y) => {
    if (row.length !== w) {
      throw new Error(`[pixelart] "${name}" fila ${y}: largo ${row.length}, esperado ${w}`);
    }
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const color = palette[ch];
      if (!color) throw new Error(`[pixelart] "${name}": color desconocido '${ch}'`);
      ctx.fillStyle = color;
      ctx.fillRect(offsetX + x, y, 1, 1);
    }
  });
}

/** Registra una textura de un solo cuadro. */
export function makeTexture(
  scene: Phaser.Scene,
  key: string,
  rows: string[],
  palette: Palette,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, rows[0].length, rows.length);
  if (!tex) throw new Error(`[pixelart] no se pudo crear canvas para "${key}"`);
  drawRows(tex.getContext(), rows, palette, 0, key);
  tex.refresh();
}

/**
 * Registra una textura con varios cuadros (para animación).
 * Los cuadros quedan nombrados "0", "1", "2"...
 */
export function makeSheet(
  scene: Phaser.Scene,
  key: string,
  frames: string[][],
  palette: Palette,
): void {
  if (scene.textures.exists(key)) return;
  const fw = frames[0][0].length;
  const fh = frames[0].length;
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh);
  if (!tex) throw new Error(`[pixelart] no se pudo crear canvas para "${key}"`);
  frames.forEach((rows, i) => {
    if (rows.length !== fh || rows[0].length !== fw) {
      throw new Error(`[pixelart] "${key}" cuadro ${i}: tamaño distinto al cuadro 0`);
    }
    drawRows(tex.getContext(), rows, palette, i * fw, `${key}#${i}`);
  });
  tex.refresh();
  frames.forEach((_, i) => tex.add(String(i), 0, i * fw, 0, fw, fh));
}

/** Textura rectangular de un color (para plataformas, suelos, barras). */
export function makeSolid(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  color: string,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`[pixelart] no se pudo crear canvas para "${key}"`);
  const ctx = tex.getContext();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  tex.refresh();
}

/** Círculo suave con brillo (luciérnagas, luces, partículas). */
export function makeGlow(scene: Phaser.Scene, key: string, radius: number, color: string): void {
  if (scene.textures.exists(key)) return;
  const size = radius * 2;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) throw new Error(`[pixelart] no se pudo crear canvas para "${key}"`);
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(0.4, color + 'aa');
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}
