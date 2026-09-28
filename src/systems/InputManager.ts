import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONT, DEPTH_HUD } from '../config';

export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'interact';

/**
 * Unifica teclado y controles táctiles bajo una sola API de acciones.
 * Cada escena crea el suyo y llama a update() al inicio de su update().
 */
export class InputManager {
  private scene: Phaser.Scene;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private touchState: Partial<Record<Action, boolean>> = {};
  private cur: Partial<Record<Action, boolean>> = {};
  private prev: Partial<Record<Action, boolean>> = {};
  /** Acciones «pulsadas» por un gesto: cuentan como presionadas durante un cuadro. */
  private pulses = new Set<Action>();

  // Joystick virtual
  joyX = 0;
  joyY = 0;
  private joyPointerId = -1;
  private joyBase?: Phaser.GameObjects.Arc;
  private joyThumb?: Phaser.GameObjects.Arc;

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
    }
  }

  /** ¿Estamos en un dispositivo táctil? (para mostrar controles en pantalla) */
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

  /** Llamar al inicio del update() de la escena para detectar flancos. */
  update(): void {
    const actions: Action[] = ['left', 'right', 'up', 'down', 'jump', 'interact'];
    for (const a of actions) {
      this.prev[a] = this.cur[a];
      this.cur[a] = this.actionDown(a);
    }
    this.pulses.clear();
  }

  /** Simula una pulsación breve (un cuadro) de una acción. */
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

  /** Botón circular semitransparente fijo a la cámara. */
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

  /** Joystick virtual en la esquina inferior izquierda. */
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
      // Solo la mitad izquierda de la pantalla controla el joystick
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

  /**
   * Gestos del runner: tocar = salto corto, mantener = salto alto,
   * deslizar hacia abajo = barrerse (o caer en picada en el aire).
   */
  addRunnerGestures(): void {
    const s = this.scene;
    let start: { y: number; id: number } | undefined;
    let decided = false;
    let holdTimer: Phaser.Time.TimerEvent | undefined;
    s.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // La esquina de pausa/sonido no cuenta como salto
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
          // Ya saltando: deslizar hacia abajo es caer en picada
          this.touchState.jump = false;
          this.pulse('down');
        }
        start.y = p.y + 999; // un deslizamiento por gesto
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

  /** Detecta toques rápidos y deslizamientos hacia abajo (para el runner). */
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
