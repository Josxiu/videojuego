import Phaser from 'phaser';
import { makeTexture, makeSheet, makeGlow, makeSolid } from '../pixelart';
import { SPRITES } from './defs';

export { SPRITES, IRIS_FRAME, type SpriteDef } from './defs';

/** Texturas de personajes que cada sueño re-dibuja en su estilo. */
export const CHARACTER_TEXTURES = ['iris', 'iris-fall', 'iris-slide', 'morfeo'];

/** Animaciones base que cada sueño duplica en su estilo. */
export const CHARACTER_ANIMS = [
  'iris-idle',
  'iris-walk',
  'iris-run',
  'iris-front-idle',
  'iris-front-walk',
  'iris-back-idle',
  'iris-back-walk',
  'iris-falling',
  'morfeo-idle',
];

/** Registra todas las texturas y animaciones. Llamar una vez en Boot. */
export function registerAllSprites(scene: Phaser.Scene): void {
  for (const def of SPRITES) {
    if (def.frames.length === 1) makeTexture(scene, def.key, def.frames[0], def.pal);
    else makeSheet(scene, def.key, def.frames, def.pal);
  }

  // Brillos y partículas
  makeGlow(scene, 'glow-gold', 12, '#ffd166');
  makeGlow(scene, 'glow-red', 12, '#ff3b3b');
  makeGlow(scene, 'glow-cyan', 12, '#86f7ff');
  makeGlow(scene, 'glow-violet', 16, '#9d7bff');
  makeGlow(scene, 'glow-white', 8, '#ffffff');
  makeGlow(scene, 'glow-soft', 64, '#ffffff');
  makeSolid(scene, 'px', 2, 2, '#ffffff');

  const anims = scene.anims;
  if (anims.exists('iris-idle')) return;
  const seq = (key: string, frames: string[], frameRate: number, repeat = -1) =>
    anims.create({
      key,
      frames: frames.map((f) => ({ key: 'iris', frame: f })),
      frameRate,
      repeat,
    });

  anims.create({
    key: 'iris-idle',
    frames: [
      { key: 'iris', frame: '0', duration: 2200 },
      { key: 'iris', frame: '1', duration: 160 },
    ],
    repeat: -1,
  });
  seq('iris-walk', ['2', '3', '4', '5'], 8);
  seq('iris-run', ['2', '3', '4', '5'], 12);
  anims.create({
    key: 'iris-front-idle',
    frames: [
      { key: 'iris', frame: '10', duration: 2400 },
      { key: 'iris', frame: '13', duration: 160 },
    ],
    repeat: -1,
  });
  seq('iris-front-walk', ['11', '10', '12', '10'], 7);
  seq('iris-back-idle', ['14'], 1);
  seq('iris-back-walk', ['15', '14', '16', '14'], 7);
  anims.create({
    key: 'iris-falling',
    frames: [
      { key: 'iris-fall', frame: '0' },
      { key: 'iris-fall', frame: '1' },
    ],
    frameRate: 5,
    repeat: -1,
  });
  anims.create({
    key: 'morfeo-idle',
    frames: [
      { key: 'morfeo', frame: '0', duration: 700 },
      { key: 'morfeo', frame: '1', duration: 700 },
      { key: 'morfeo', frame: '0', duration: 700 },
      { key: 'morfeo', frame: '2', duration: 140 },
      { key: 'morfeo', frame: '1', duration: 700 },
    ],
    repeat: -1,
  });
  // Los vecinos solo parpadean: están dormidos soñando, no hace falta más
  for (const who of ['elmer', 'nadia', 'chuy', 'tomas']) {
    anims.create({
      key: `${who}-idle`,
      frames: [
        { key: who, frame: '0', duration: 2600 },
        { key: who, frame: '1', duration: who === 'elmer' ? 900 : 160 },
      ],
      repeat: -1,
    });
  }
}
