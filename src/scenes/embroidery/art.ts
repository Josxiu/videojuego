import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { Rng } from '../../gfx/noise';
import { linenWeave, embroideryHoop, crossStitchRect, stitchSegment } from '../../gfx/brush2';

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
 * Arte de Bordado Textil sobre Lino Crudo (Sueño 5 · Renata Morales).
 */
export function buildEmbroideryTextures(scene: Phaser.Scene): void {
  const rng = new Rng(505);

  // Bastidor circular de madera sobre lino crudo + motivos de punto de cruz en las esquinas
  makeTex(scene, 'emb-backdrop', GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    // Mesa cálida de taller alrededor del bastidor
    ctx.fillStyle = '#d8cbb4';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Paño de lino dentro de la zona de trabajo
    linenWeave(ctx, GAME_WIDTH, GAME_HEIGHT, '#efe6d5', rng);

    // Flores de punto de cruz tenues en las esquinas fuera del bastidor
    crossStitchRect(ctx, 26, 440, 80, 60, 'rgba(200, 75, 90, 0.25)', 12);
    crossStitchRect(ctx, 845, 435, 84, 64, 'rgba(59, 108, 158, 0.25)', 12);

    // Viñeta cálida en las cuatro esquinas exteriores
    const g = ctx.createRadialGradient(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      210,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      540,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(59, 42, 34, 0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    embroideryHoop(ctx, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 8, 240);
  });

  // Ojales bordados (rojo, azul, dorado y completado)
  const makeEyelet = (key: string, rim: string, core: string) => {
    makeTex(scene, key, 34, 34, (ctx) => {
      ctx.fillStyle = '#3b2a22';
      ctx.beginPath();
      ctx.arc(17, 17, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rim;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(17, 17, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(17, 17, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });
  };
  makeEyelet('emb-eyelet-red', '#c84b5a', '#f7dfe2');
  makeEyelet('emb-eyelet-blue', '#3b6c9e', '#dce9f7');
  makeEyelet('emb-eyelet-gold', '#dba038', '#fff4d4');
  makeEyelet('emb-eyelet-corner', '#9d8c78', '#e5dac5');

  // Carretes de madera con hilo enrollado
  const makeSpool = (key: string, yarn: string) => {
    makeTex(scene, key, 54, 54, (ctx) => {
      ctx.fillStyle = '#8b5e3c';
      ctx.beginPath();
      ctx.roundRect(10, 8, 34, 8, 3);
      ctx.roundRect(10, 38, 34, 8, 3);
      ctx.fill();
      ctx.fillStyle = yarn;
      ctx.fillRect(14, 15, 26, 24);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1.5;
      for (let y = 18; y < 38; y += 4) {
        ctx.beginPath();
        ctx.moveTo(14, y);
        ctx.lineTo(40, y + 1);
        ctx.stroke();
      }
      ctx.strokeStyle = '#3b2a22';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(14, 15, 26, 24);
    });
  };
  makeSpool('emb-spool-red', '#c84b5a');
  makeSpool('emb-spool-blue', '#3b6c9e');
  makeSpool('emb-spool-gold', '#dba038');

  // Aguja plateada con ojo dorado
  makeTex(scene, 'emb-needle', 48, 16, (ctx) => {
    ctx.fillStyle = '#d4d8dc';
    ctx.strokeStyle = '#3b2a22';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.lineTo(38, 3);
    ctx.lineTo(44, 8);
    ctx.lineTo(38, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#dba038';
    ctx.fillRect(34, 6.5, 6, 3);
  });

  // Polilla que intenta descoser el lino en Acto II
  makeTex(scene, 'emb-moth', 48, 38, (ctx) => {
    ctx.fillStyle = '#a88d70';
    ctx.strokeStyle = '#3b2a22';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(15, 18, 12, 14, -0.3, 0, Math.PI * 2);
    ctx.ellipse(33, 18, 12, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3b2a22';
    ctx.beginPath();
    ctx.ellipse(24, 20, 4, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c488';
    ctx.beginPath();
    ctx.arc(14, 17, 3.5, 0, Math.PI * 2);
    ctx.arc(34, 17, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Tijeras de costura lentas (Acto I)
  makeTex(scene, 'emb-shears', 52, 68, (ctx) => {
    ctx.strokeStyle = '#5a504a';
    ctx.fillStyle = '#cfd4d8';
    ctx.lineWidth = 2.2;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(26, 30);
      ctx.lineTo(26 + dir * 15, 4);
      ctx.lineTo(26 + dir * 5, 32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#c84b5a';
      ctx.beginPath();
      ctx.arc(26 + dir * 11, 52, 8.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#5a504a';
    }
    ctx.fillStyle = '#dba038';
    ctx.beginPath();
    ctx.arc(26, 30, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Parche secreto del babero de Sofía («S. M.»)
  makeTex(scene, 'emb-bib', 96, 84, (ctx) => {
    ctx.fillStyle = '#faf3e6';
    ctx.strokeStyle = '#dba038';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(12, 16, 72, 58, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d8cbb4';
    ctx.beginPath();
    ctx.arc(48, 18, 14, 0, Math.PI);
    ctx.fill();
    stitchSegment(ctx, 24, 52, 72, 52, '#c84b5a', 2.4);
    ctx.fillStyle = '#c84b5a';
    ctx.font = 'bold 20px "Patrick Hand", serif';
    ctx.textAlign = 'center';
    ctx.fillText('S. M.', 48, 46);
  });

  // Botón de nácar coleccionable (Luciérnaga)
  makeTex(scene, 'emb-ff', 28, 28, (ctx) => {
    ctx.fillStyle = '#faf3e6';
    ctx.strokeStyle = '#c9a66b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(14, 14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8b5e3c';
    for (const [hx, hy] of [
      [11, 11],
      [17, 11],
      [11, 17],
      [17, 17],
    ]) {
      ctx.beginPath();
      ctx.arc(hx, hy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
