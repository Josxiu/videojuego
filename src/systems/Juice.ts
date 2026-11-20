import Phaser from 'phaser';

export type Impact = 'soft' | 'medium' | 'hard';

const IMPACT: Record<Impact, { shake: number; ms: number; freeze: number }> = {
  soft: { shake: 0.004, ms: 120, freeze: 0 },
  medium: { shake: 0.011, ms: 220, freeze: 45 },
  hard: { shake: 0.02, ms: 340, freeze: 90 },
};

export function hitStop(scene: Phaser.Scene, ms: number): void {
  if (ms <= 0) return;
  const { time, tweens } = scene;
  time.timeScale = 0.001;
  tweens.timeScale = 0.001;
  window.setTimeout(() => {
    if (!scene.scene.isActive()) return;
    time.timeScale = 1;
    tweens.timeScale = 1;
  }, ms);
}

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

/** Estallido radial de chispas / fragmentos de color. */
export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffd166,
  count = 14,
  depth = 65,
): void {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
    const dist = Phaser.Math.Between(24, 72);
    const p = scene.add
      .image(x, y, 'px')
      .setTint(color)
      .setAlpha(0.9)
      .setScale(Phaser.Math.FloatBetween(1.4, 2.8))
      .setDepth(depth);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(a) * dist,
      y: y + Math.sin(a) * dist,
      alpha: 0,
      scale: 0.3,
      duration: Phaser.Math.Between(360, 620),
      ease: 'Cubic.out',
      onComplete: () => p.destroy(),
    });
  }
}

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
