import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { Rng } from '../../gfx/noise';
import { glassPane, stainedGlassGrid } from '../../gfx/brush2';

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
 * Arte del Sueño 6 (4A · Paloma Ibarra): Vitral Emplomado Translúcido.
 */
export function buildGlassTextures(scene: Phaser.Scene): void {
  const rng = new Rng(606);

  // Fondo nocturno de taller con mosaico de vitral oscuro emplomado en los márgenes
  makeTex(scene, 'glass-backdrop', GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    ctx.fillStyle = '#0c0e18';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Franjas laterales de vitral azul noche
    stainedGlassGrid(
      ctx,
      GAME_WIDTH,
      GAME_HEIGHT,
      ['#141c38', '#1a2448', '#221c3e', '#172940'],
      rng,
      12,
      7,
    );

    // Velo oscuro central para que los rayos cromáticos brillen con alto contraste
    ctx.fillStyle = 'rgba(12, 14, 24, 0.72)';
    ctx.fillRect(90, 56, GAME_WIDTH - 180, GAME_HEIGHT - 104);

    // Marco ojival gótico de plomo
    ctx.strokeStyle = '#1f2847';
    ctx.lineWidth = 6;
    ctx.strokeRect(86, 52, GAME_WIDTH - 172, GAME_HEIGHT - 96);
  });

  // Amanecer abierto sin plomo (Acto III ruptura)
  makeTex(scene, 'glass-dawn', GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    g.addColorStop(0, '#5a82c8');
    g.addColorStop(0.55, '#d6a4c2');
    g.addColorStop(1, '#ffe2b8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Cáusticas arcoíris libres flotando sobre la habitación
    const cols = ['#ff4d6d', '#ffc857', '#6be675', '#4cc9f0', '#b565f7'];
    for (let i = 0; i < 28; i++) {
      glassPane(
        ctx,
        [
          [rng.range(40, GAME_WIDTH - 40), rng.range(40, GAME_HEIGHT - 60)],
          [rng.range(40, GAME_WIDTH - 40), rng.range(40, GAME_HEIGHT - 60)],
          [rng.range(40, GAME_WIDTH - 40), rng.range(40, GAME_HEIGHT - 60)],
        ],
        cols[i % cols.length],
        rng,
        { alpha: 0.25, leadW: 0 },
      );
    }
  });

  // Espejo/prisma giratorio emplomado (orientación 0 = derecha, se gira con .angle)
  makeTex(scene, 'glass-mirror', 62, 62, (ctx) => {
    ctx.strokeStyle = '#141826';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(180, 215, 255, 0.26)';
    ctx.beginPath();
    ctx.arc(31, 31, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Prisma triangular interior señalando dirección de salida (derecha)
    glassPane(
      ctx,
      [
        [18, 17],
        [49, 31],
        [18, 45],
      ],
      '#9de2ff',
      rng,
      { lead: '#0c0e18', leadW: 2.5, alpha: 0.72 },
    );
    // Remache de latón central
    ctx.fillStyle = '#ffc857';
    ctx.beginPath();
    ctx.arc(30, 31, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Espejo congelado por soldadura fría (Modo Desvelo)
  makeTex(scene, 'glass-frozen', 62, 62, (ctx) => {
    ctx.fillStyle = 'rgba(20, 24, 36, 0.85)';
    ctx.strokeStyle = '#7084a8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(31, 31, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#2c354f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(14, 14);
    ctx.lineTo(48, 48);
    ctx.moveTo(48, 14);
    ctx.lineTo(14, 48);
    ctx.stroke();
  });

  // Divisores / cristal astillado fijo
  makeTex(scene, 'glass-splitter', 64, 64, (ctx) => {
    glassPane(
      ctx,
      [
        [32, 6],
        [58, 32],
        [32, 58],
        [6, 32],
      ],
      '#e4f2ff',
      rng,
      { lead: '#101422', leadW: 3, alpha: 0.65 },
    );
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(44, 44);
    ctx.moveTo(44, 20);
    ctx.lineTo(20, 44);
    ctx.stroke();
  });

  // Cristal agrietado central prohibido del Acto III
  makeTex(scene, 'glass-cracked', 74, 74, (ctx) => {
    glassPane(
      ctx,
      [
        [37, 5],
        [67, 25],
        [56, 65],
        [18, 65],
        [7, 25],
      ],
      '#ffffff',
      rng,
      { lead: '#0c0e18', leadW: 4, alpha: 0.45 },
    );
    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(37, 37);
    ctx.lineTo(18, 16);
    ctx.moveTo(37, 37);
    ctx.lineTo(58, 22);
    ctx.moveTo(37, 37);
    ctx.lineTo(25, 58);
    ctx.moveTo(37, 37);
    ctx.lineTo(50, 60);
    ctx.stroke();
  });

  // Lámpara Tiffany tapada con sábana (Secreto del Acto II)
  makeTex(scene, 'glass-tiffany-covered', 64, 64, (ctx) => {
    ctx.fillStyle = '#d4d0e0';
    ctx.strokeStyle = '#5c607a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 18);
    ctx.lineTo(46, 16);
    ctx.lineTo(56, 54);
    ctx.lineTo(8, 54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,44,64,0.35)';
    ctx.beginPath();
    ctx.moveTo(24, 24);
    ctx.lineTo(18, 50);
    ctx.moveTo(38, 22);
    ctx.lineTo(44, 50);
    ctx.stroke();
  });

  makeTex(scene, 'glass-tiffany-lit', 64, 64, (ctx) => {
    glassPane(
      ctx,
      [
        [14, 28],
        [32, 10],
        [50, 28],
        [56, 44],
        [8, 44],
      ],
      '#ffc857',
      rng,
      { lead: '#181c2e', leadW: 2.5, alpha: 0.9 },
    );
    glassPane(
      ctx,
      [
        [20, 28],
        [32, 16],
        [44, 28],
      ],
      '#4cc9f0',
      rng,
      { lead: '#181c2e', leadW: 2, alpha: 0.85 },
    );
    ctx.fillStyle = '#3b2e26';
    ctx.fillRect(28, 44, 8, 16);
    ctx.fillRect(18, 56, 28, 5);
  });

  // Prismas diminutos coleccionables (Luciérnagas)
  makeTex(scene, 'glass-ff', 30, 30, (ctx) => {
    glassPane(
      ctx,
      [
        [15, 3],
        [26, 23],
        [4, 23],
      ],
      '#ffc857',
      rng,
      { lead: '#0c0e18', leadW: 2, alpha: 0.9 },
    );
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(15, 16, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}
