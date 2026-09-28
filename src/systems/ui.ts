import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  FONT,
  FONT_HAND,
  FONT_KID,
  FONT_CHALK,
  titleStyle,
  DEPTH_OVERLAY,
  DEPTH_HUD,
} from '../config';
import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';
import type { DialogueTheme } from './DialogueBox';
import { stylizeTexture, STYLE_DISPLAY } from '../gfx/stylize';
import { paintTexture, blot } from '../gfx/brush';
import { Rng } from '../gfx/noise';

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

/** Colores y tipografías de las tarjetas según el material de cada sueño. */
const CARD: Record<
  DialogueTheme,
  { bg: number; title: string; name: string; titleFont: string; nameFont: string; nameSize: number }
> = {
  night: {
    bg: 0x0d0a1e,
    title: '#9d7bff',
    name: '#efe9ff',
    titleFont: '"Silkscreen", monospace',
    nameFont: '"Silkscreen", monospace',
    nameSize: 28,
  },
  chalk: {
    bg: 0x23392f,
    title: '#ffe08a',
    name: '#f2efe6',
    titleFont: FONT_CHALK,
    nameFont: FONT_CHALK,
    nameSize: 48,
  },
  paper: {
    bg: 0x2c3d73,
    title: '#ffd166',
    name: '#fbf5e4',
    titleFont: FONT_HAND,
    nameFont: FONT_HAND,
    nameSize: 50,
  },
  watercolor: {
    bg: 0xf4ecd8,
    title: '#7a5a9a',
    name: '#4a3a2a',
    titleFont: FONT_HAND,
    nameFont: FONT_HAND,
    nameSize: 50,
  },
  crayon: {
    bg: 0x1b1f4a,
    title: '#ffd23a',
    name: '#fffdf6',
    titleFont: FONT_KID,
    nameFont: FONT_KID,
    nameSize: 52,
  },
  dawn: {
    bg: 0x1a1640,
    title: '#ffb070',
    name: '#fff3e0',
    titleFont: FONT_HAND,
    nameFont: FONT_HAND,
    nameSize: 50,
  },
};

const CRAYON_COLORS = ['#ff5a4a', '#ffd23a', '#5ad86a', '#5a9aff', '#ff8ad0', '#ffa23a'];

/**
 * Tarjeta de título al entrar a un sueño. Cada material la escribe a su modo:
 * gis que se subraya, letras de papel pegadas una a una, acuarela que se
 * extiende, crayolas de colores que tiemblan.
 */
export function showTitleCard(
  scene: Phaser.Scene,
  title: string,
  name: string,
  onDone?: () => void,
  theme: DialogueTheme = 'night',
): void {
  const look = CARD[theme];
  const items: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(DEPTH_OVERLAY + 2);
    (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(0);
    items.push(o);
    return o;
  };
  const cover = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, look.bg, 1)
    .setDepth(DEPTH_OVERLAY + 1)
    .setScrollFactor(0);
  items.push(cover);

  const cy = GAME_HEIGHT / 2;
  if (theme === 'watercolor') {
    const key = paintTexture(scene, 'card-wash', 700, 220, (ctx) => {
      const rng = new Rng('card-wash');
      blot(ctx, 350, 110, 150, '#bcd8d0', rng, { layers: 16, alpha: 0.05 });
      blot(ctx, 250, 120, 90, '#f0c8d0', rng, { layers: 12, alpha: 0.05 });
      blot(ctx, 470, 100, 80, '#f8e0a0', rng, { layers: 12, alpha: 0.05 });
    });
    const wash = add(
      scene.add
        .image(GAME_WIDTH / 2, cy, key)
        .setScale(0.3, 0.3)
        .setAlpha(0),
    );
    scene.tweens.add({ targets: wash, scale: 1, alpha: 1, duration: 1400, ease: 'Cubic.out' });
  }

  const t1 = add(
    scene.add
      .text(GAME_WIDTH / 2, cy - 46, title, {
        fontFamily: look.titleFont,
        fontSize: theme === 'night' ? '16px' : '22px',
        color: look.title,
        letterSpacing: theme === 'night' ? 4 : 2,
      })
      .setOrigin(0.5)
      .setAlpha(0),
  );
  scene.tweens.add({ targets: t1, alpha: 1, duration: 500 });

  const nameStyle = (color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
    fontFamily: look.nameFont,
    fontSize: `${look.nameSize}px`,
    color,
  });

  if (theme === 'paper' || theme === 'crayon') {
    // Letra por letra: recortes pegados / crayolas de colores
    const probe = scene.add.text(0, 0, name, nameStyle('#fff')).setVisible(false);
    const total = probe.width;
    probe.destroy();
    let x = GAME_WIDTH / 2 - total / 2;
    [...name].forEach((ch, i) => {
      const color = theme === 'crayon' ? CRAYON_COLORS[i % CRAYON_COLORS.length] : look.name;
      const letter = add(
        scene.add
          .text(x, cy + 10, ch, {
            ...nameStyle(color),
            stroke: theme === 'paper' ? '#ffffff' : undefined,
            strokeThickness: theme === 'paper' ? 7 : 0,
            shadow:
              theme === 'paper'
                ? {
                    offsetX: 3,
                    offsetY: 4,
                    color: 'rgba(0,0,0,0.35)',
                    blur: 3,
                    fill: true,
                    stroke: true,
                  }
                : undefined,
          })
          .setOrigin(0, 0.5)
          .setAngle(Phaser.Math.Between(-9, 9))
          .setAlpha(0),
      );
      if (theme === 'paper')
        (letter as Phaser.GameObjects.Text).setColor(i % 2 ? '#e8b33c' : '#d9503a');
      x += (letter as Phaser.GameObjects.Text).width - (theme === 'paper' ? 7 : 0);
      scene.tweens.add({
        targets: letter,
        alpha: 1,
        y: { from: cy - 20, to: cy + 10 },
        delay: 300 + i * 55,
        duration: 220,
        ease: 'Back.out',
        onStart: () => {
          if (i % 3 === 0) AudioManager.sfx(theme === 'paper' ? 'paper' : 'scribble');
        },
      });
      if (theme === 'crayon') {
        // Las letras de crayola tiemblan (como la pesadilla)
        scene.time.addEvent({
          delay: 160,
          loop: true,
          callback: () =>
            (letter as Phaser.GameObjects.Text).setAngle(Phaser.Math.Between(-10, 10)),
        });
      }
    });
  } else {
    const t2 = add(
      scene.add
        .text(GAME_WIDTH / 2, cy + 10, name, nameStyle(look.name))
        .setOrigin(0.5)
        .setAlpha(0),
    );
    scene.tweens.add({
      targets: t2,
      alpha: 1,
      duration: theme === 'watercolor' ? 1200 : 500,
      delay: 200,
    });
    if (theme === 'chalk') {
      // El subrayado se escribe con gis
      const w = (t2 as Phaser.GameObjects.Text).width;
      const line = add(scene.add.graphics());
      const g = line as Phaser.GameObjects.Graphics;
      const prog = { p: 0 };
      scene.tweens.add({
        targets: prog,
        p: 1,
        delay: 600,
        duration: 700,
        onStart: () => AudioManager.sfx('chalk'),
        onUpdate: () => {
          g.clear();
          g.lineStyle(4, 0xf2efe6, 0.8);
          g.lineBetween(
            GAME_WIDTH / 2 - w / 2,
            cy + 44,
            GAME_WIDTH / 2 - w / 2 + w * prog.p,
            cy + 42 + prog.p * 4,
          );
        },
      });
    }
  }

  scene.time.delayedCall(2300, () => {
    scene.tweens.add({
      targets: items,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        items.forEach((i) => i.destroy());
        onDone?.();
      },
    });
  });
}

/**
 * Tarjeta de «devuelto»: el objeto en grande, con su nombre y su historia,
 * dibujada con el material del sueño.
 */
export function showReturnCard(
  scene: Phaser.Scene,
  theme: DialogueTheme,
  heading: string,
  desc: string,
  itemKey: string,
): void {
  const look = CARD[theme];
  const style =
    theme === 'chalk' || theme === 'paper' || theme === 'watercolor' || theme === 'crayon'
      ? theme
      : undefined;
  const depth = DEPTH_HUD + 5;
  const panel = scene.add
    .rectangle(GAME_WIDTH / 2, 180, 640, 250, look.bg, 0.92)
    .setScrollFactor(0)
    .setDepth(depth)
    .setAlpha(0);
  const key = style ? stylizeTexture(scene, itemKey, style) : itemKey;
  const item = scene.add
    .image(GAME_WIDTH / 2, 120, key)
    .setScale(style ? STYLE_DISPLAY * 2.2 : 5)
    .setScrollFactor(0)
    .setDepth(depth + 1)
    .setAlpha(0);
  const glow = scene.add
    .image(GAME_WIDTH / 2, 120, 'glow-soft')
    .setScale(1.3)
    .setTint(0xffd166)
    .setAlpha(0)
    .setScrollFactor(0)
    .setDepth(depth);
  const h = scene.add
    .text(GAME_WIDTH / 2, 196, heading, {
      fontFamily: look.nameFont,
      fontSize: theme === 'night' ? '20px' : '30px',
      color: look.title,
      align: 'center',
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(depth + 1)
    .setAlpha(0);
  const d = scene.add
    .text(GAME_WIDTH / 2, 250, desc, {
      fontFamily: theme === 'night' ? FONT : FONT_HAND,
      fontSize: theme === 'night' ? '15px' : '20px',
      color: look.name,
      align: 'center',
      wordWrap: { width: 560 },
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(depth + 1)
    .setAlpha(0);
  scene.tweens.add({ targets: [panel, h, d], alpha: 1, duration: 500 });
  scene.tweens.add({ targets: glow, alpha: 0.35, duration: 800 });
  scene.tweens.add({ targets: item, alpha: 1, y: 110, duration: 900, ease: 'Bounce.out' });
  scene.tweens.add({
    targets: item,
    angle: { from: -6, to: 6 },
    duration: 1400,
    yoyo: true,
    repeat: -1,
  });
}
