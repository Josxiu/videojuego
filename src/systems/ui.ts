import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONT, titleStyle, DEPTH_OVERLAY } from '../config';
import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';

/** Botón de texto con marco, hover y sonido. */
export function makeTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  size = 22,
): Phaser.GameObjects.Text {
  const btn = scene.add
    .text(x, y, label, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color: '#efe9ff',
      backgroundColor: '#2a2148',
      padding: { x: 18, y: 10 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#4a3a80' }));
  btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#2a2148' }));
  btn.on('pointerdown', () => {
    AudioManager.ensure();
    AudioManager.sfx('collect');
    scene.tweens.add({ targets: btn, scale: 0.92, duration: 60, yoyo: true, onComplete: onClick });
  });
  return btn;
}

/** Botón de silencio arriba a la derecha, persistente. */
export function addMuteButton(scene: Phaser.Scene): void {
  const label = () => (SaveManager.data.muted ? '🔇' : '🔊');
  const btn = scene.add
    .text(GAME_WIDTH - 24, 24, label(), { fontFamily: FONT, fontSize: '22px' })
    .setOrigin(0.5)
    .setDepth(DEPTH_OVERLAY)
    .setScrollFactor(0)
    .setAlpha(0.8)
    .setInteractive({ useHandCursor: true });
  btn.on('pointerdown', () => {
    SaveManager.data.muted = !SaveManager.data.muted;
    SaveManager.save();
    AudioManager.ensure();
    AudioManager.setMuted(SaveManager.data.muted);
    btn.setText(label());
  });
}

/**
 * Botón de pausa con overlay (seguir / salir del sueño).
 * Devuelve un objeto para consultar si el juego está pausado.
 */
export function addPauseOverlay(
  scene: Phaser.Scene,
  onExit: () => void,
): { paused: () => boolean } {
  let paused = false;
  const items: Phaser.GameObjects.GameObject[] = [];

  const btn = scene.add
    .text(GAME_WIDTH - 64, 24, '⏸', { fontFamily: FONT, fontSize: '22px' })
    .setOrigin(0.5)
    .setDepth(DEPTH_OVERLAY)
    .setScrollFactor(0)
    .setAlpha(0.8)
    .setInteractive({ useHandCursor: true });

  const close = () => {
    paused = false;
    items.forEach((i) => i.destroy());
    items.length = 0;
  };

  const open = () => {
    if (paused) return;
    paused = true;
    items.push(
      scene.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d0a1e, 0.75)
        .setDepth(DEPTH_OVERLAY + 1)
        .setScrollFactor(0),
      scene.add
        .text(GAME_WIDTH / 2, 190, 'PAUSA', titleStyle(24, '#cfc4ff', { letterSpacing: 4 }))
        .setOrigin(0.5)
        .setDepth(DEPTH_OVERLAY + 2)
        .setScrollFactor(0),
      makeTextButton(scene, GAME_WIDTH / 2, 280, 'seguir', close, 20).setDepth(DEPTH_OVERLAY + 2),
      makeTextButton(scene, GAME_WIDTH / 2, 350, 'salir del sueño', onExit, 20).setDepth(
        DEPTH_OVERLAY + 2,
      ),
    );
  };

  btn.on('pointerdown', open);
  scene.input.keyboard?.on('keydown-ESC', () => (paused ? close() : open()));
  return { paused: () => paused };
}

/** Campo de estrellas de fondo que titilan. */
export function addStarfield(scene: Phaser.Scene, count = 70, depth = -10): void {
  for (let i = 0; i < count; i++) {
    const star = scene.add
      .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), 'px')
      .setDepth(depth)
      .setScrollFactor(0)
      .setAlpha(Phaser.Math.FloatBetween(0.15, 0.7))
      .setScale(Phaser.Math.FloatBetween(0.5, 1.4));
    scene.tweens.add({
      targets: star,
      alpha: 0.05,
      duration: Phaser.Math.Between(900, 2600),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 2000),
    });
  }
}

/** Fundido de entrada de la escena. */
export function fadeIn(scene: Phaser.Scene, ms = 450): void {
  scene.cameras.main.fadeIn(ms, 13, 10, 30);
}

/** Fundido de salida y cambio de escena. */
export function fadeToScene(scene: Phaser.Scene, key: string, data?: object, ms = 450): void {
  scene.cameras.main.fadeOut(ms, 13, 10, 30);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(key, data);
  });
}

/** Tarjeta de título al entrar a un sueño: «SUEÑO I — EL EXAMEN INFINITO». */
export function showTitleCard(
  scene: Phaser.Scene,
  title: string,
  name: string,
  onDone?: () => void,
): void {
  const cover = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d0a1e, 1)
    .setDepth(DEPTH_OVERLAY + 1)
    .setScrollFactor(0);
  const t1 = scene.add
    .text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 38,
      title,
      titleStyle(16, '#9d7bff', { letterSpacing: 4 }),
    )
    .setOrigin(0.5)
    .setDepth(DEPTH_OVERLAY + 2)
    .setScrollFactor(0)
    .setAlpha(0);
  const t2 = scene.add
    .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, name, titleStyle(28, '#efe9ff'))
    .setOrigin(0.5)
    .setDepth(DEPTH_OVERLAY + 2)
    .setScrollFactor(0)
    .setAlpha(0);
  scene.tweens.add({ targets: [t1, t2], alpha: 1, duration: 500 });
  scene.time.delayedCall(1900, () => {
    scene.tweens.add({
      targets: [cover, t1, t2],
      alpha: 0,
      duration: 600,
      onComplete: () => {
        cover.destroy();
        t1.destroy();
        t2.destroy();
        onDone?.();
      },
    });
  });
}
