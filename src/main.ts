import Phaser from 'phaser';
import './fonts';
import { H, W } from './config';
import { Boot } from './scenes/Boot';
import { Menu } from './scenes/Menu';
import { Intro } from './scenes/Intro';
import { Train } from './scenes/Train';
import { Libreta } from './scenes/Libreta';
import { Ending } from './scenes/Ending';
import { DREAM_SCENES } from './scenes/dreams';
import { Audio } from './systems/audio/Audio';
import { Save } from './systems/save';

// El audio del navegador solo arranca después de un gesto del usuario.
const wake = () => {
  Audio.ensure();
  Audio.setMuted(Save.data.muted);
};
window.addEventListener('pointerdown', wake);
window.addEventListener('keydown', wake);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) void Audio.ctx?.suspend();
  else if (Audio.ctx) void Audio.ctx.resume();
});

const game = new Phaser.Game({
  type: new URLSearchParams(location.search).has('canvas') ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  transparent: true,
  antialias: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
  scene: [Boot, Menu, Intro, Train, Libreta, Ending, ...DREAM_SCENES],
});

// Referencia para pruebas automatizadas.
(window as unknown as { __game: Phaser.Game }).__game = game;
