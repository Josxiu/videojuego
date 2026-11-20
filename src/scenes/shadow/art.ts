import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { Rng } from '../../gfx/noise';
import { amberBackdrop, celluloidFrame, shadowPuppet } from '../../gfx/brush2';

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
 * Genera todas las texturas del Teatro de Sombras Chinescas y Linterna Mágica (Sueño 4).
 */
export function buildShadowTextures(scene: Phaser.Scene): void {
  const rng = new Rng(404);

  // Telón ámbar con perforaciones de celuloide 35 mm y silueta de patio de butacas
  makeTex(scene, 'shadow-backdrop', GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    amberBackdrop(ctx, GAME_WIDTH, GAME_HEIGHT, rng);
    // Cortinas aterciopeladas laterales
    ctx.fillStyle = '#090503';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(74, 0);
    ctx.quadraticCurveTo(46, 260, 62, GAME_HEIGHT);
    ctx.lineTo(0, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH, 0);
    ctx.lineTo(GAME_WIDTH - 74, 0);
    ctx.quadraticCurveTo(GAME_WIDTH - 46, 260, GAME_WIDTH - 62, GAME_HEIGHT);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Silueta tenue de butacas al fondo inferior
    ctx.fillStyle = 'rgba(12, 7, 4, 0.72)';
    for (let x = 80; x < GAME_WIDTH - 80; x += 48) {
      const h = 42 + ((x * 13) % 14);
      ctx.beginPath();
      ctx.roundRect(x, GAME_HEIGHT - h - 22, 34, h, [12, 12, 0, 0]);
      ctx.fill();
    }
    celluloidFrame(ctx, GAME_WIDTH, GAME_HEIGHT);
  });

  // Sala real iluminada por la ventana cuando Goyo apaga el proyector en el Acto III
  makeTex(scene, 'shadow-warmup', GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.addColorStop(0, '#5a3a22');
    g.addColorStop(0.45, '#b87d44');
    g.addColorStop(1, '#f4d9a6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Ventanal abierto proyectando luz tibia real diagonal
    ctx.fillStyle = 'rgba(255, 246, 220, 0.42)';
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH - 240, 0);
    ctx.lineTo(GAME_WIDTH, 0);
    ctx.lineTo(GAME_WIDTH, 320);
    ctx.lineTo(140, GAME_HEIGHT);
    ctx.lineTo(20, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Butacas rojas del Cine Alameda con polvo al sol
    for (let x = 90; x < GAME_WIDTH - 90; x += 52) {
      ctx.fillStyle = '#6c2426';
      ctx.beginPath();
      ctx.roundRect(x, GAME_HEIGHT - 86, 38, 68, [12, 12, 2, 2]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 224, 154, 0.2)';
      ctx.fillRect(x + 4, GAME_HEIGHT - 82, 30, 8);
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(255, 248, 225, ${0.2 + rng.next() * 0.4})`;
      ctx.beginPath();
      ctx.arc(
        rng.range(60, GAME_WIDTH - 40),
        rng.range(40, GAME_HEIGHT - 40),
        rng.range(1, 3),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  });

  // Proyector de cabina 35 mm en la esquina inferior izquierda
  makeTex(scene, 'shadow-booth', 160, 120, (ctx) => {
    ctx.fillStyle = '#18100c';
    ctx.strokeStyle = '#ffbe55';
    ctx.lineWidth = 2;
    // Cuerpo y pedestal
    ctx.fillRect(16, 48, 86, 52);
    ctx.strokeRect(16, 48, 86, 52);
    ctx.fillRect(36, 98, 42, 22);
    // Lente cónico hacia la derecha-arriba
    ctx.beginPath();
    ctx.moveTo(100, 56);
    ctx.lineTo(142, 42);
    ctx.lineTo(142, 86);
    ctx.lineTo(100, 82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Dos carretes superiores
    for (const [cx, cy] of [
      [36, 32],
      [78, 30],
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffbe55';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#18100c';
    }
  });

  // Silueta articulada de Rosa en acetato azul cobalto (2 cuadros de paso)
  for (let frame = 0; frame < 2; frame++) {
    makeTex(scene, `shadow-rosa-${frame}`, 54, 86, (ctx) => {
      const stride = frame === 0 ? -6 : 6;
      shadowPuppet(
        ctx,
        [
          [27, 12],
          [35, 18],
          [34, 34],
          [40, 60],
          [34 + stride, 80],
          [28 + stride, 80],
          [26, 60],
          [22 - stride, 80],
          [16 - stride, 80],
          [16, 58],
          [20, 34],
          [19, 18],
        ],
        rng,
        {
          fill: '#081832',
          rim: '#5aa8ff',
          acetate: 'rgba(90, 168, 255, 0.35)',
          joints: [
            [27, 24],
            [27, 54],
          ],
        },
      );
      // Chongo de Rosa
      ctx.fillStyle = '#081832';
      ctx.strokeStyle = '#5aa8ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(36, 16, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  // Silueta gigante de Morfeo haciendo orejas de conejo (Secreto del Acto II)
  makeTex(scene, 'shadow-morfeo-rabbit', 190, 210, (ctx) => {
    shadowPuppet(
      ctx,
      [
        [74, 80],
        [64, 18],
        [84, 16],
        [92, 74],
        [104, 74],
        [118, 14],
        [138, 18],
        [122, 82],
        [136, 122],
        [146, 192],
        [48, 192],
        [56, 122],
      ],
      rng,
      {
        fill: '#0b0604',
        rim: '#ffbe55',
        joints: [
          [96, 84],
          [72, 132],
          [122, 132],
        ],
      },
    );
    // Ojos traviesos brillantes en acetato ámbar
    ctx.fillStyle = '#ffbe55';
    ctx.beginPath();
    ctx.ellipse(84, 102, 5, 3, -0.2, 0, Math.PI * 2);
    ctx.ellipse(108, 102, 5, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Objetos de utilería translúcidos: carrete, butaca, lata 35mm y acetato azul
  const makeProp = (key: string, tint: string, kind: 'reel' | 'chair' | 'can') => {
    makeTex(scene, key, 110, 64, (ctx) => {
      ctx.save();
      ctx.strokeStyle = tint;
      ctx.fillStyle = `${tint}33`;
      ctx.lineWidth = 2.5;
      if (kind === 'reel') {
        ctx.beginPath();
        ctx.ellipse(55, 32, 46, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        for (const sx of [-22, 0, 22]) {
          ctx.beginPath();
          ctx.arc(55 + sx, 32, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (kind === 'chair') {
        ctx.beginPath();
        ctx.roundRect(14, 18, 82, 22, 6);
        ctx.roundRect(18, 8, 74, 14, 4);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.roundRect(10, 14, 90, 32, 10);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(20, 24);
        ctx.lineTo(90, 24);
        ctx.stroke();
      }
      ctx.restore();
    });
  };
  makeProp('shadow-prop-reel-any', '#ffd79a', 'reel');
  makeProp('shadow-prop-chair-any', '#ffd79a', 'chair');
  makeProp('shadow-prop-can-amber', '#ffbe55', 'can');
  makeProp('shadow-prop-reel-amber', '#ffbe55', 'reel');
  makeProp('shadow-prop-chair-blue', '#5aa8ff', 'chair');
  makeProp('shadow-prop-can-blue', '#5aa8ff', 'can');

  // Tijeras de censura (Modo Desvelo)
  makeTex(scene, 'shadow-scissors', 56, 76, (ctx) => {
    ctx.strokeStyle = '#ff6a4d';
    ctx.fillStyle = '#120806';
    ctx.lineWidth = 2.5;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(28, 34);
      ctx.lineTo(28 + dir * 16, 4);
      ctx.lineTo(28 + dir * 6, 36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(28 + dir * 12, 58, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffbe55';
    ctx.beginPath();
    ctx.arc(28, 34, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Fotograma dorado coleccionable (Luciérnaga de 35 mm)
  makeTex(scene, 'shadow-ff', 36, 26, (ctx) => {
    ctx.fillStyle = '#ffcf66';
    ctx.fillRect(2, 2, 32, 22);
    ctx.fillStyle = '#1a0e05';
    ctx.fillRect(7, 6, 22, 14);
    for (let x = 5; x < 30; x += 7) {
      ctx.fillRect(x, 3, 3, 2);
      ctx.fillRect(x, 21, 3, 2);
    }
    ctx.fillStyle = '#fff5d0';
    ctx.beginPath();
    ctx.arc(18, 13, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });
}
