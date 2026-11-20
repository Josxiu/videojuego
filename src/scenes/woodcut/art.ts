import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { Rng } from '../../gfx/noise';
import { cottonPaper, woodcutBlock, waxSeal } from '../../gfx/brush2';

type Ctx = CanvasRenderingContext2D;

function makeTex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: Ctx) => void,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  draw(tex.getContext());
  tex.refresh();
}

/**
 * Arte de Xilografía / Grabado en Linóleo (Sueño 8 · Mateo Ibáñez · 3A).
 */
export function buildWoodcutTextures(scene: Phaser.Scene): void {
  const rng = new Rng(808);

  // Papel algodón marfil claro (Acto I y papel libre en Acto III)
  makeTex(scene, 'wc-paper-light', GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    cottonPaper(ctx, GAME_WIDTH, GAME_HEIGHT, rng, false);
    ctx.strokeStyle = 'rgba(24, 25, 36, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(102, 48, 756, 444);
  });

  // Impresión invertida en espejo (Acto II: tinta blanca sobre carbón)
  makeTex(scene, 'wc-paper-dark', GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    cottonPaper(ctx, GAME_WIDTH, GAME_HEIGHT, rng, true);
    ctx.strokeStyle = 'rgba(242, 234, 215, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(102, 48, 756, 444);
  });

  // Bloques tallados 48x48
  makeTex(scene, 'wc-block-solid', 48, 48, (ctx) => {
    woodcutBlock(ctx, 2, 2, 44, 44, rng, { ink: '#181924', paper: '#f2ead7', hatch: true });
  });

  makeTex(scene, 'wc-block-inv', 48, 48, (ctx) => {
    woodcutBlock(ctx, 2, 2, 44, 44, rng, { ink: '#ebe3cf', paper: '#181924', hatch: true });
  });

  // Pared delgada tallable con gubia (surco punteado blanco)
  makeTex(scene, 'wc-block-carve', 48, 48, (ctx) => {
    woodcutBlock(ctx, 3, 3, 42, 42, rng, { ink: '#262a3d', paper: '#f2ead7', hatch: false });
    ctx.strokeStyle = '#f2ead7';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(8, 8, 32, 32);
    ctx.setLineDash([]);
  });

  makeTex(scene, 'wc-block-carve-inv', 48, 48, (ctx) => {
    woodcutBlock(ctx, 3, 3, 42, 42, rng, { ink: '#d8ccb4', paper: '#181924', hatch: false });
    ctx.strokeStyle = '#b8332a';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(8, 8, 32, 32);
    ctx.setLineDash([]);
  });

  // Marco exterior de la lámina impresa (Acto III: rompible con última carga de gubia)
  makeTex(scene, 'wc-block-border', 48, 48, (ctx) => {
    ctx.fillStyle = '#181924';
    ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#b8332a';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 40, 40);
    ctx.beginPath();
    ctx.moveTo(6, 6);
    ctx.lineTo(14, 14);
    ctx.moveTo(42, 6);
    ctx.lineTo(34, 14);
    ctx.stroke();
  });

  // Plancha móvil deslizable
  makeTex(scene, 'wc-block-slide', 48, 48, (ctx) => {
    woodcutBlock(ctx, 2, 2, 44, 44, rng, { ink: '#b8332a', paper: '#f2ead7', hatch: true });
    ctx.fillStyle = '#f2ead7';
    ctx.beginPath();
    ctx.moveTo(12, 24);
    ctx.lineTo(20, 17);
    ctx.lineTo(20, 31);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(36, 24);
    ctx.lineTo(28, 17);
    ctx.lineTo(28, 31);
    ctx.closePath();
    ctx.fill();
  });

  // Sello rojo de lacre que persigue en el Acto II
  makeTex(scene, 'wc-seal', 46, 46, (ctx) => {
    waxSeal(ctx, 23, 23, 19, rng, '#b8332a');
  });

  // Matriz grabada coleccionable (objetivo de cada lámina)
  makeTex(scene, 'wc-matrix', 36, 36, (ctx) => {
    ctx.fillStyle = '#b8332a';
    ctx.strokeStyle = '#181924';
    ctx.lineWidth = 2.5;
    ctx.fillRect(5, 5, 26, 26);
    ctx.strokeRect(5, 5, 26, 26);
    ctx.strokeStyle = '#f7f0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 16, 16);
    ctx.beginPath();
    ctx.moveTo(10, 18);
    ctx.lineTo(26, 18);
    ctx.moveTo(18, 10);
    ctx.lineTo(18, 26);
    ctx.stroke();
  });

  // Tintero para recargar gubia
  makeTex(scene, 'wc-inkpot', 36, 36, (ctx) => {
    ctx.fillStyle = '#181924';
    ctx.strokeStyle = '#f2ead7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(7, 13, 22, 18, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b8332a';
    ctx.fillRect(12, 6, 12, 7);
  });

  // Grieta secreta + mirilla del 3A al 3B
  makeTex(scene, 'wc-peephole', 48, 48, (ctx) => {
    woodcutBlock(ctx, 2, 2, 44, 44, rng, { ink: '#181924', paper: '#f2ead7', hatch: true });
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.ellipse(24, 24, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#181924';
    ctx.beginPath();
    ctx.arc(24, 24, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Ex-libris dorado (Luciérnagas del Sueño 8)
  makeTex(scene, 'wc-ff', 30, 30, (ctx) => {
    ctx.fillStyle = '#dba038';
    ctx.strokeStyle = '#181924';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(4, 3, 22, 24, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#181924';
    ctx.beginPath();
    ctx.moveTo(9, 10);
    ctx.lineTo(21, 10);
    ctx.moveTo(9, 16);
    ctx.lineTo(21, 16);
    ctx.moveTo(15, 7);
    ctx.lineTo(15, 22);
    ctx.stroke();
  });
}
