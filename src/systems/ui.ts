import { DEPTH, FONT, H, W, txt } from '../config';
import { Audio } from './audio/Audio';
import { Juice } from './juice';

export interface ButtonStyle {
  w?: number;
  h?: number;
  fill?: number;
  stroke?: number;
  text?: string;
  size?: number;
  font?: string;
}

/** Botón táctil con estado de foco (para teclado). */
export class Button {
  readonly bg: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Rectangle;
  focused = false;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    readonly onClick: () => void,
    private st: ButtonStyle = {},
  ) {
    const w = st.w ?? 260;
    const h = st.h ?? 52;
    this.shadow = scene.add
      .rectangle(x + 5, y + 5, w, h, 0x0e0a1a, 0.6)
      .setDepth(DEPTH.hud)
      .setScrollFactor(0);
    this.bg = scene.add
      .rectangle(x, y, w, h, st.fill ?? 0xf4ead5)
      .setStrokeStyle(3, st.stroke ?? 0x1b1f3b)
      .setDepth(DEPTH.hud + 1)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.label = scene.add
      .text(
        x,
        y,
        text,
        txt(st.size ?? 24, st.text ?? '#1b1f3b', st.font ?? FONT.display, { fontStyle: '800' }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 2)
      .setScrollFactor(0);
    this.bg.on('pointerover', () => this.setFocus(true));
    this.bg.on('pointerout', () => this.setFocus(false));
    this.bg.on('pointerdown', () => this.press());
  }

  press(): void {
    Audio.sfx('select');
    Juice.vibrate(10);
    this.scene.tweens.add({
      targets: [this.bg, this.label],
      scale: 0.94,
      duration: 60,
      yoyo: true,
      onComplete: () => this.onClick(),
    });
  }

  setFocus(f: boolean): void {
    this.focused = f;
    this.bg.setFillStyle(f ? 0xff5fa2 : (this.st.fill ?? 0xf4ead5));
    this.label.setColor(f ? '#ffffff' : (this.st.text ?? '#1b1f3b'));
  }

  setText(t: string): void {
    this.label.setText(t);
  }

  setVisible(v: boolean): this {
    this.bg.setVisible(v);
    this.label.setVisible(v);
    this.shadow.setVisible(v);
    if (v) this.bg.setInteractive({ useHandCursor: true });
    else this.bg.disableInteractive();
    return this;
  }

  setDepth(d: number): this {
    this.shadow.setDepth(d);
    this.bg.setDepth(d + 1);
    this.label.setDepth(d + 2);
    return this;
  }

  destroy(): void {
    this.bg.destroy();
    this.label.destroy();
    this.shadow.destroy();
  }
}

/** Navegación con flechas + Enter entre botones. */
export function keyNav(scene: Phaser.Scene, buttons: () => Button[]): void {
  let idx = -1;
  const onKey = (e: KeyboardEvent) => {
    const bs = buttons().filter((b) => b.bg.visible);
    if (!bs.length) return;
    if (
      e.code === 'ArrowDown' ||
      e.code === 'ArrowRight' ||
      e.code === 'KeyS' ||
      e.code === 'KeyD'
    ) {
      idx = (idx + 1) % bs.length;
    } else if (
      e.code === 'ArrowUp' ||
      e.code === 'ArrowLeft' ||
      e.code === 'KeyW' ||
      e.code === 'KeyA'
    ) {
      idx = (idx - 1 + bs.length) % bs.length;
    } else if ((e.code === 'Enter' || e.code === 'Space') && idx >= 0 && bs[idx]) {
      bs[idx].press();
      return;
    } else return;
    bs.forEach((b, i) => b.setFocus(i === idx));
    Audio.sfx('tap');
  };
  scene.input.keyboard?.on('keydown', onKey);
  scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown', onKey));
}

/** Transición: cortina de tres tintas que barre la pantalla. */
export function wipeTo(
  scene: Phaser.Scene,
  key: string,
  data?: object,
  colors = [0xff5fa2, 0x2f5dd6, 0x1b1f3b],
): void {
  if (scene.data.get('leaving')) return;
  scene.data.set('leaving', true);
  scene.input.enabled = false;
  colors.forEach((c, i) => {
    const r = scene.add
      .rectangle(-W, 0, W * 1.2, H, c)
      .setOrigin(0)
      .setDepth(DEPTH.top + i)
      .setScrollFactor(0);
    scene.tweens.add({
      targets: r,
      x: -W * 0.1,
      duration: 380,
      delay: i * 90,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        if (i === colors.length - 1) scene.scene.start(key, data);
      },
    });
  });
}

/** Al entrar a una escena: la cortina se retira. */
export function wipeIn(scene: Phaser.Scene, color = 0x1b1f3b): void {
  scene.data.set('leaving', false);
  scene.input.enabled = true;
  const r = scene.add
    .rectangle(0, 0, W * 1.2, H, color)
    .setOrigin(0)
    .setDepth(DEPTH.top)
    .setScrollFactor(0);
  scene.tweens.add({
    targets: r,
    x: W * 1.2,
    duration: 420,
    ease: 'Cubic.easeInOut',
    onComplete: () => r.destroy(),
  });
}

/** Aviso breve que sube y se desvanece (tiquete, secreto). */
export function toast(scene: Phaser.Scene, text: string, color = '#ffd36b', y = 86): void {
  const t = scene.add
    .text(
      W / 2,
      y,
      text,
      txt(24, color, FONT.display, { fontStyle: '800', stroke: '#14101e', strokeThickness: 6 }),
    )
    .setOrigin(0.5)
    .setDepth(DEPTH.overlay)
    .setScrollFactor(0)
    .setAlpha(0);
  scene.tweens.add({ targets: t, alpha: 1, y: y - 10, duration: 250, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: t,
    alpha: 0,
    y: y - 30,
    delay: 1800,
    duration: 500,
    onComplete: () => t.destroy(),
  });
}

/** Indicación de controles al pie, que se apaga sola. */
export function hint(
  scene: Phaser.Scene,
  text: string,
  ms = 5000,
  color = '#f4ead5',
): Phaser.GameObjects.Text {
  const t = scene.add
    .text(W / 2, H - 24, text, txt(18, color, FONT.body, { stroke: '#000000', strokeThickness: 4 }))
    .setOrigin(0.5)
    .setDepth(DEPTH.hud)
    .setScrollFactor(0);
  scene.tweens.add({
    targets: t,
    alpha: 0,
    delay: ms,
    duration: 800,
    onComplete: () => t.destroy(),
  });
  return t;
}
