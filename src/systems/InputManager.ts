import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONT, DEPTH_HUD } from '../config';

export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'interact';

/**
 * Unifica teclado y controles táctiles de un dedo bajo una sola API de acciones.
 */
export class InputManager {
  private scene: Phaser.Scene;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private touchState: Partial<Record<Action, boolean>> = {};
  private cur: Partial<Record<Action, boolean>> = {};
  private prev: Partial<Record<Action, boolean>> = {};
  private pulses = new Set<Action>();

  // Joystick virtual (esquina inferior izquierda o flotante de un dedo)
  joyX = 0;
  joyY = 0;
  private joyPointerId = -1;
  private joyBase?: Phaser.GameObjects.Arc;
  private joyThumb?: Phaser.GameObjects.Arc;
  private floatingAnchor?: { x: number; y: number };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard;
    if (kb) {
      const add = (name: string, code: number) => (this.keys[name] = kb.addKey(code, false));
      const K = Phaser.Input.Keyboard.KeyCodes;
      add('left', K.LEFT);
      add('a', K.A);
      add('right', K.RIGHT);
      add('d', K.D);
      add('up', K.UP);
      add('w', K.W);
      add('down', K.DOWN);
      add('s', K.S);
      add('space', K.SPACE);
      add('e', K.E);
      add('enter', K.ENTER);
      const byCode: Record<number, Action[]> = {
        [K.LEFT]: ['left'],
        [K.A]: ['left'],
        [K.RIGHT]: ['right'],
        [K.D]: ['right'],
        [K.UP]: ['up', 'jump'],
        [K.W]: ['up', 'jump'],
        [K.DOWN]: ['down'],
        [K.S]: ['down'],
        [K.SPACE]: ['jump', 'interact'],
        [K.E]: ['interact'],
        [K.ENTER]: ['interact'],
      };
      const onKey = (ev: KeyboardEvent) => byCode[ev.keyCode]?.forEach((a) => this.pulses.add(a));
      kb.on('keydown', onKey);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off('keydown', onKey));
    }
  }

  get isTouch(): boolean {
    return this.scene.sys.game.device.input.touch;
  }

  private keyDown(name: string): boolean {
    return this.keys[name]?.isDown ?? false;
  }

  private actionDown(a: Action): boolean {
    if (this.touchState[a] || this.pulses.has(a)) return true;
    switch (a) {
      case 'left':
        return this.keyDown('left') || this.keyDown('a') || this.joyX < -0.35;
      case 'right':
        return this.keyDown('right') || this.keyDown('d') || this.joyX > 0.35;
      case 'up':
        return this.keyDown('up') || this.keyDown('w') || this.joyY < -0.35;
      case 'down':
        return this.keyDown('down') || this.keyDown('s') || this.joyY > 0.35;
      case 'jump':
        return this.keyDown('up') || this.keyDown('w') || this.keyDown('space');
      case 'interact':
        return this.keyDown('e') || this.keyDown('enter') || this.keyDown('space');
    }
  }

  update(): void {
    const actions: Action[] = ['left', 'right', 'up', 'down', 'jump', 'interact'];
    for (const a of actions) {
      this.prev[a] = this.cur[a];
      this.cur[a] = this.actionDown(a);
    }
    this.pulses.clear();
  }

  pulse(a: Action): void {
    this.pulses.add(a);
  }

  isDown(a: Action): boolean {
    return this.cur[a] ?? false;
  }

  justDown(a: Action): boolean {
    return (this.cur[a] ?? false) && !(this.prev[a] ?? false);
  }

  // ── Controles táctiles ──

  addButton(x: number, y: number, radius: number, label: string, action: Action): void {
    const s = this.scene;
    const zone = s.add
      .circle(x, y, radius * 1.35, 0xffffff, 0.001)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setInteractive();
    const circle = s.add
      .circle(x, y, radius, 0xffffff, 0.1)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setStrokeStyle(2, 0xffffff, 0.35);
    s.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: `${Math.round(radius * 0.8)}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 1);
    zone.on('pointerdown', () => {
      this.touchState[action] = true;
      circle.setFillStyle(0xffffff, 0.28);
    });
    const off = () => {
      this.touchState[action] = false;
      circle.setFillStyle(0xffffff, 0.1);
    };
    zone.on('pointerup', off);
    zone.on('pointerout', off);
  }

  addJoystick(): void {
    const s = this.scene;
    const bx = 110;
    const by = GAME_HEIGHT - 110;
    const R = 62;
    this.joyBase = s.add
      .circle(bx, by, R, 0xffffff, 0.08)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setStrokeStyle(2, 0xffffff, 0.3);
    this.joyThumb = s.add
      .circle(bx, by, 26, 0xffffff, 0.22)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 1);

    s.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.joyPointerId === -1 && p.x < GAME_WIDTH * 0.45) {
        this.joyPointerId = p.id;
        this.moveJoy(p);
      }
    });
    s.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyPointerId) this.moveJoy(p);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyPointerId) {
        this.joyPointerId = -1;
        this.joyX = 0;
        this.joyY = 0;
        this.joyThumb?.setPosition(bx, by);
      }
    };
    s.input.on('pointerup', release);
    s.input.on('pointerupoutside', release);
  }

  /**
   * Stick flotante de UN SOLO DEDO: arrastrar en cualquier parte mueve `joyX`/`joyY`,
   * y un toque corto sin arrastre dispara `onTap` (ideal para 3D o exploración pura).
   */
  addOneFingerStick(onTap?: (x: number, y: number) => void): void {
    const s = this.scene;
    let pointerId = -1;
    let moved = false;
    let downTime = 0;
    this.joyBase = s.add
      .circle(0, 0, 50, 0xffffff, 0.08)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setStrokeStyle(2, 0xffffff, 0.35)
      .setVisible(false);
    this.joyThumb = s.add
      .circle(0, 0, 20, 0xffffff, 0.25)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 1)
      .setVisible(false);

    s.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < 64 && p.x > GAME_WIDTH - 120) return;
      if (pointerId !== -1) return;
      pointerId = p.id;
      moved = false;
      downTime = p.time;
      this.floatingAnchor = { x: p.x, y: p.y };
      this.joyBase?.setPosition(p.x, p.y).setVisible(true);
      this.joyThumb?.setPosition(p.x, p.y).setVisible(true);
    });
    s.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== pointerId || !this.floatingAnchor) return;
      const dx = p.x - this.floatingAnchor.x;
      const dy = p.y - this.floatingAnchor.y;
      const len = Math.hypot(dx, dy);
      if (len > 14) moved = true;
      const max = 48;
      const cl = Math.min(len, max);
      const nx = len > 0 ? dx / len : 0;
      const ny = len > 0 ? dy / len : 0;
      this.joyThumb?.setPosition(this.floatingAnchor.x + nx * cl, this.floatingAnchor.y + ny * cl);
      this.joyX = (nx * cl) / max;
      this.joyY = (ny * cl) / max;
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id !== pointerId) return;
      if (!moved && p.time - downTime < 280) {
        onTap?.(p.x, p.y);
        this.pulse('interact');
      }
      pointerId = -1;
      this.floatingAnchor = undefined;
      this.joyX = 0;
      this.joyY = 0;
      this.joyBase?.setVisible(false);
      this.joyThumb?.setVisible(false);
    };
    s.input.on('pointerup', release);
    s.input.on('pointerupoutside', release);
  }

  private moveJoy(p: Phaser.Input.Pointer): void {
    if (!this.joyBase || !this.joyThumb) return;
    const bx = this.joyBase.x;
    const by = this.joyBase.y;
    const dx = p.x - bx;
    const dy = p.y - by;
    const len = Math.hypot(dx, dy);
    const max = 52;
    const cl = Math.min(len, max);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;
    this.joyThumb.setPosition(bx + nx * cl, by + ny * cl);
    this.joyX = (nx * cl) / max;
    this.joyY = (ny * cl) / max;
  }

  addRunnerGestures(): void {
    const s = this.scene;
    let start: { y: number; id: number } | undefined;
    let decided = false;
    let holdTimer: Phaser.Time.TimerEvent | undefined;
    s.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < 60 && p.x > GAME_WIDTH - 110) return;
      start = { y: p.y, id: p.id };
      decided = false;
      holdTimer?.remove();
      holdTimer = s.time.delayedCall(70, () => {
        if (start && !decided) {
          decided = true;
          this.touchState.jump = true;
        }
      });
    });
    s.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!start || p.id !== start.id) return;
      if (p.y - start.y > 26) {
        if (!decided) {
          decided = true;
          this.pulse('down');
        } else if (this.touchState.jump) {
          this.touchState.jump = false;
          this.pulse('down');
        }
        start.y = p.y + 999;
      }
    });
    const end = (p: Phaser.Input.Pointer) => {
      if (!start || p.id !== start.id) return;
      if (!decided) this.pulse('jump');
      decided = true;
      this.touchState.jump = false;
      start = undefined;
    };
    s.input.on('pointerup', end);
    s.input.on('pointerupoutside', end);
  }

  addTapAndSwipe(onTap: () => void, onSwipeDown: () => void): void {
    const s = this.scene;
    let startY = 0;
    let startT = 0;
    s.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      startY = p.y;
      startT = p.time;
    });
    s.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const dt = p.time - startT;
      const dy = p.y - startY;
      if (dt < 400 && dy > 45) onSwipeDown();
      else if (dt < 250 && Math.abs(dy) < 30) onTap();
    });
  }

  destroy(): void {
    Object.values(this.keys).forEach((k) => k.destroy());
  }
}
