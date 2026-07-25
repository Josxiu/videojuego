import Phaser from 'phaser';

/**
 * «Game feel»: los pequeños efectos que hacen que una acción se sienta.
 * Todo es opcional y no altera la lógica del juego, solo su presentación.
 */

/** Intensidad de un golpe: escala el temblor, el destello y la pausa. */
export type Impact = 'soft' | 'medium' | 'hard';

const IMPACT: Record<Impact, { shake: number; ms: number; freeze: number }> = {
  soft: { shake: 0.004, ms: 120, freeze: 0 },
  medium: { shake: 0.011, ms: 220, freeze: 45 },
  hard: { shake: 0.02, ms: 340, freeze: 90 },
};

/**
 * Congela el juego unos milisegundos para dar peso a un impacto.
 * Se implementa bajando el `timeScale`, así los tweens y timers también se frenan.
 */
export function hitStop(scene: Phaser.Scene, ms: number): void {
  if (ms <= 0) return;
  const { time, tweens } = scene;
  time.timeScale = 0.001;
  tweens.timeScale = 0.001;
  // El temporizador de restauración usa el reloj real del navegador, no el de la escena,
  // porque el de la escena está congelado.
  window.setTimeout(() => {
    if (!scene.scene.isActive()) return;
    time.timeScale = 1;
    tweens.timeScale = 1;
  }, ms);
}

/** Golpe completo: temblor + destello opcional + micro-congelación. */
export function impact(scene: Phaser.Scene, level: Impact = 'medium', flashColor?: number): void {
  const cfg = IMPACT[level];
  scene.cameras.main.shake(cfg.ms, cfg.shake);
  if (flashColor !== undefined) {
    const r = (flashColor >> 16) & 0xff;
    const g = (flashColor >> 8) & 0xff;
    const b = flashColor & 0xff;
    scene.cameras.main.flash(cfg.ms * 0.7, r, g, b);
  }
  hitStop(scene, cfg.freeze);
}

/**
 * Aplasta y estira un sprite: la deformación clásica de salto/aterrizaje.
 * `amount` positivo achata (aterrizar), negativo estira (despegar).
 */
export function squash(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
  amount = 0.25,
  duration = 180,
): void {
  const baseX = target.scaleX;
  const baseY = target.scaleY;
  scene.tweens.killTweensOf(target);
  target.setScale(baseX * (1 + amount), baseY * (1 - amount));
  scene.tweens.add({
    targets: target,
    scaleX: baseX,
    scaleY: baseY,
    duration,
    ease: 'Back.out',
  });
}

/** Nubecilla de polvo, por ejemplo al aterrizar. */
export function dust(scene: Phaser.Scene, x: number, y: number, color = 0xffffff, count = 8): void {
  for (let i = 0; i < count; i++) {
    const dir = i < count / 2 ? -1 : 1;
    const p = scene.add
      .image(x + Phaser.Math.Between(-6, 6), y, 'px')
      .setTint(color)
      .setAlpha(0.7)
      .setScale(Phaser.Math.FloatBetween(1, 2.2))
      .setDepth(45);
    scene.tweens.add({
      targets: p,
      x: p.x + dir * Phaser.Math.Between(10, 34),
      y: p.y - Phaser.Math.Between(2, 16),
      alpha: 0,
      scale: 0.2,
      duration: Phaser.Math.Between(280, 520),
      ease: 'Quad.out',
      onComplete: () => p.destroy(),
    });
  }
}

/** Destello radial que se expande: recoger algo, activar una luz. */
export function pop(scene: Phaser.Scene, x: number, y: number, color = 0xffd166, scale = 3): void {
  const ring = scene.add
    .image(x, y, 'glow-white')
    .setTint(color)
    .setAlpha(0.85)
    .setScale(0.3)
    .setDepth(60);
  scene.tweens.add({
    targets: ring,
    scale,
    alpha: 0,
    duration: 420,
    ease: 'Cubic.out',
    onComplete: () => ring.destroy(),
  });
}

/** Texto que sube y se desvanece: «+1», «¡fragmento!». */
export function floatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
): void {
  const label = scene.add.text(x, y, text, style).setOrigin(0.5).setDepth(70);
  scene.tweens.add({
    targets: label,
    y: y - 40,
    alpha: 0,
    duration: 900,
    ease: 'Quad.out',
    onComplete: () => label.destroy(),
  });
}
