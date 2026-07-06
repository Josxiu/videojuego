import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { Boot } from './scenes/Boot';
import { MainMenu } from './scenes/MainMenu';
import { Gallery } from './scenes/Gallery';
import { AudioManager } from './systems/AudioManager';
import { SaveManager } from './systems/SaveManager';

// El audio del navegador solo puede arrancar tras un gesto del usuario
const wakeAudio = () => {
  AudioManager.ensure();
  AudioManager.setMuted(SaveManager.data.muted);
};
window.addEventListener('pointerdown', wakeAudio);
window.addEventListener('keydown', wakeAudio);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0d0a1e',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  input: { activePointers: 3 },
  scene: [Boot, MainMenu, Gallery],
});
