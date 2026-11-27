import { Save } from './save';

/** Sensación de juego: sacudidas, destellos, pausas de impacto y vibración. */
export const Juice = {
  shake(scene: Phaser.Scene, intensity = 0.006, ms = 180): void {
    if (Save.data.calm) intensity *= 0.25;
    scene.cameras.main.shake(ms, intensity);
  },

  flash(scene: Phaser.Scene, color = 0xffffff, ms = 160): void {
    if (Save.data.calm) return;
    const c = Phaser.Display.Color.IntegerToRGB(color);
    scene.cameras.main.flash(ms, c.r, c.g, c.b);
  },

  /** Congela la escena unos milisegundos para que un golpe pese. */
  hitstop(scene: Phaser.Scene, ms = 60): void {
    if (scene.time.timeScale === 0) return;
    scene.time.timeScale = 0.05;
    scene.tweens.timeScale = 0.05;
    window.setTimeout(() => {
      scene.time.timeScale = 1;
      scene.tweens.timeScale = 1;
    }, ms);
  },

  vibrate(pattern: number | number[] = 15): void {
    try {
      const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
        .userActivation;
      if (ua && !ua.hasBeenActive) return;
      navigator.vibrate?.(pattern);
    } catch {
      // no todos los navegadores lo permiten
    }
  },

  /** Estallido de partículas simples (círculos) que se desvanecen. */
  burst(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number,
    count = 10,
    speed = 120,
    size = 3,
    depth = 900,
  ): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      const dot = scene.add.circle(x, y, size * (0.5 + Math.random()), color).setDepth(depth);
      scene.tweens.add({
        targets: dot,
        x: x + Math.cos(a) * v * 0.6,
        y: y + Math.sin(a) * v * 0.6,
        alpha: 0,
        scale: 0.2,
        duration: 420 + Math.random() * 300,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  },

  /** Aparición elástica de un objeto. */
  pop(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    to = 1,
  ): void {
    (target as unknown as Phaser.GameObjects.Components.Transform).setScale(to * 0.6);
    scene.tweens.add({ targets: target, scale: to, duration: 260, ease: 'Back.easeOut' });
  },
};
