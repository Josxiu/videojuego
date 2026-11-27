import { DEPTH, FONT, H, W, txt } from '../config';
import { T, type Line } from '../i18n';
import { Audio, type Speaker } from './audio/Audio';
import { debug } from './debug';

const AUTO = debug.flag('auto');

export interface DialogueTheme {
  bg: number;
  bgAlpha: number;
  border: number;
  text: string;
  font: string;
  size: number;
}

export const THEMES = {
  riso: {
    bg: 0x1b1f3b,
    bgAlpha: 0.94,
    border: 0xff5fa2,
    text: '#f6ecd6',
    font: FONT.body,
    size: 21,
  },
  dots: {
    bg: 0xf3ead6,
    bgAlpha: 0.95,
    border: 0x7a5a3a,
    text: '#2e2418',
    font: FONT.body,
    size: 21,
  },
  clay: {
    bg: 0xfff3d6,
    bgAlpha: 0.96,
    border: 0xd8352e,
    text: '#2a1c12',
    font: FONT.body,
    size: 21,
  },
  blueprint: {
    bg: 0x0f2f63,
    bgAlpha: 0.95,
    border: 0xe6f0ff,
    text: '#e6f0ff',
    font: FONT.body,
    size: 21,
  },
  neon: {
    bg: 0x0b0716,
    bgAlpha: 0.92,
    border: 0xff3fa4,
    text: '#ffe9f6',
    font: FONT.body,
    size: 21,
  },
  chiva: {
    bg: 0xfff2c2,
    bgAlpha: 0.96,
    border: 0xd6262e,
    text: '#22160e',
    font: FONT.body,
    size: 21,
  },
  filigree: {
    bg: 0x0c0c14,
    bgAlpha: 0.94,
    border: 0xcfd3dc,
    text: '#eef0f4',
    font: FONT.body,
    size: 21,
  },
  maqueta: {
    bg: 0x26331f,
    bgAlpha: 0.94,
    border: 0xf1e3b5,
    text: '#f6efd8',
    font: FONT.body,
    size: 21,
  },
  oil: {
    bg: 0x2a1f3a,
    bgAlpha: 0.92,
    border: 0xffc861,
    text: '#fff4dc',
    font: FONT.body,
    size: 21,
  },
} satisfies Record<string, DialogueTheme>;

/** Color del nombre de cada personaje. */
const NAME_COLOR: Partial<Record<Speaker, string>> = {
  celeste: '#f2862b',
  mecha: '#ffd36b',
  abel: '#8fb3d9',
  reme: '#9fc3a0',
  samu: '#ff6b5e',
  marisol: '#7fb2ff',
  jairo: '#ff7ad1',
  chepe: '#f2c230',
  efrain: '#cfd3dc',
  altavoz: '#c0c0c0',
};

export interface Choice<T extends string> {
  id: T;
  label: string;
}

const BOX_W = 820;
const BOX_H = 116;

/**
 * Caja de diálogo con texto que se escribe solo, voz por personaje y
 * elecciones. Un toque completa la línea; otro toque pasa a la siguiente.
 */
export class Dialogue {
  private root: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private name: Phaser.GameObjects.Text;
  private body: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private catcher: Phaser.GameObjects.Zone;
  private lines: Line[] = [];
  private idx = 0;
  private shown = 0;
  private full = '';
  private acc = 0;
  private done?: () => void;
  private choiceObjs: Phaser.GameObjects.GameObject[] = [];
  private closedAt = 0;
  open = false;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    private scene: Phaser.Scene,
    private theme: DialogueTheme = THEMES.riso,
    place: 'top' | 'bottom' = 'bottom',
  ) {
    const y = place === 'top' ? BOX_H / 2 + 74 : H - BOX_H / 2 - 14;
    this.root = scene.add
      .container(W / 2, y)
      .setDepth(DEPTH.dialogue)
      .setScrollFactor(0)
      .setVisible(false);
    this.bg = scene.add.graphics();
    this.name = scene.add.text(
      -BOX_W / 2 + 22,
      -BOX_H / 2 - 16,
      '',
      txt(18, '#fff', FONT.display, { fontStyle: '800' }),
    );
    this.body = scene.add.text(-BOX_W / 2 + 24, -BOX_H / 2 + 18, '', {
      ...txt(theme.size, theme.text, theme.font),
      wordWrap: { width: BOX_W - 60 },
      lineSpacing: 6,
    });
    this.arrow = scene.add.text(
      BOX_W / 2 - 30,
      BOX_H / 2 - 30,
      '▶',
      txt(16, theme.text, FONT.body),
    );
    this.root.add([this.bg, this.name, this.body, this.arrow]);
    this.catcher = scene.add
      .zone(0, 0, W, H)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.dialogue - 1)
      .setInteractive();
    this.catcher.disableInteractive();
    this.catcher.on('pointerdown', () => this.advance());
    this.drawBox();
    scene.tweens.add({ targets: this.arrow, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.open || this.choiceObjs.length) return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') this.advance();
    };
    scene.input.keyboard?.on('keydown', this.keyHandler);
    scene.events.on('update', (_t: number, dt: number) => this.tick(dt));
    scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown', this.keyHandler));
  }

  setTheme(theme: DialogueTheme): void {
    this.theme = theme;
    this.body.setStyle({
      ...txt(theme.size, theme.text, theme.font),
      wordWrap: { width: BOX_W - 60 },
      lineSpacing: 6,
    });
    this.arrow.setColor(theme.text);
    this.drawBox();
  }

  private drawBox(namePlate = 0, nameColor = 0xffffff): void {
    const g = this.bg;
    const t = this.theme;
    g.clear();
    g.fillStyle(0x000000, 0.28);
    g.fillRoundedRect(-BOX_W / 2 + 5, -BOX_H / 2 + 6, BOX_W, BOX_H, 14);
    g.fillStyle(t.bg, t.bgAlpha);
    g.fillRoundedRect(-BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H, 14);
    g.lineStyle(3, t.border, 1);
    g.strokeRoundedRect(-BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H, 14);
    if (namePlate > 0) {
      g.fillStyle(0x15121c, 1);
      g.fillRoundedRect(-BOX_W / 2 + 12, -BOX_H / 2 - 20, namePlate + 22, 30, 8);
      g.lineStyle(2, nameColor, 1);
      g.strokeRoundedRect(-BOX_W / 2 + 12, -BOX_H / 2 - 20, namePlate + 22, 30, 8);
    }
  }

  /** Muestra varias líneas. `onDone` se llama al cerrar la última. */
  say(lines: Line[], onDone?: () => void): void {
    this.lines = lines.slice();
    this.idx = 0;
    this.done = onDone;
    this.open = true;
    this.root.setVisible(true);
    this.catcher.setInteractive();
    this.root.setAlpha(0);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 140 });
    this.showLine();
  }

  /** Atajo con promesa. */
  sayAsync(lines: Line[]): Promise<void> {
    return new Promise((res) => this.say(lines, res));
  }

  private showLine(): void {
    const [who, text] = this.lines[this.idx];
    const nm = T.names[who] ?? '';
    this.name.setText(nm);
    const col = NAME_COLOR[who] ?? '#e8e0d0';
    this.name.setColor(col);
    this.drawBox(nm ? this.name.width : 0, Phaser.Display.Color.HexStringToColor(col).color);
    this.full = text;
    this.shown = 0;
    this.acc = 0;
    this.body.setText('');
    this.body.setFontStyle(who === 'narra' || who === 'altavoz' ? 'italic' : 'normal');
    this.arrow.setVisible(false);
  }

  private autoWait = 0;

  private tick(dt: number): void {
    if (AUTO && this.open && !this.choiceObjs.length && this.shown >= this.full.length) {
      this.autoWait += dt;
      if (this.autoWait > 450) {
        this.autoWait = 0;
        this.advance();
      }
      return;
    }
    if (!this.open || this.shown >= this.full.length) return;
    this.acc += dt;
    const per = 22;
    while (this.acc >= per && this.shown < this.full.length) {
      this.acc -= per;
      this.shown++;
      const ch = this.full[this.shown - 1];
      if (this.shown % 2 === 0 && /[a-záéíóúñ]/i.test(ch)) Audio.voice(this.lines[this.idx][0]);
    }
    this.body.setText(this.full.slice(0, this.shown));
    if (this.shown >= this.full.length) this.arrow.setVisible(true);
  }

  private advance(): void {
    if (!this.open || this.choiceObjs.length) return;
    if (this.shown < this.full.length) {
      this.shown = this.full.length;
      this.body.setText(this.full);
      this.arrow.setVisible(true);
      return;
    }
    Audio.sfx('tap', 0.8);
    this.idx++;
    if (this.idx < this.lines.length) this.showLine();
    else this.close();
  }

  private close(): void {
    this.open = false;
    this.closedAt = this.scene.time.now;
    this.catcher.disableInteractive();
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: 120,
      onComplete: () => this.root.setVisible(false),
    });
    const cb = this.done;
    this.done = undefined;
    cb?.();
  }

  /** ¿Se cerró hace muy poco? (para que el último toque no cuente en el juego). */
  justClosed(ms = 250): boolean {
    return this.open || this.scene.time.now - this.closedAt < ms;
  }

  /** Muestra opciones apiladas; devuelve la elegida. */
  choose<K extends string>(options: Choice<K>[], cb: (id: K) => void): void {
    this.open = true;
    this.catcher.setInteractive();
    const startY = H / 2 - (options.length * 64) / 2;
    const pick = (o: Choice<K>) => {
      Audio.sfx('select');
      for (const ob of this.choiceObjs) ob.destroy();
      this.choiceObjs = [];
      this.open = false;
      this.closedAt = this.scene.time.now;
      this.catcher.disableInteractive();
      this.scene.input.keyboard?.off('keydown', onKey);
      cb(o.id);
    };
    const onKey = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= options.length) pick(options[n - 1]);
    };
    this.scene.input.keyboard?.on('keydown', onKey);
    if (AUTO) this.scene.time.delayedCall(600, () => pick(options[0]));
    options.forEach((o, i) => {
      const y = startY + i * 64;
      const bg = this.scene.add
        .rectangle(W / 2, y, 700, 52, this.theme.bg, 0.96)
        .setStrokeStyle(3, this.theme.border)
        .setDepth(DEPTH.dialogue + 2)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const label = this.scene.add
        .text(
          W / 2,
          y,
          `${i + 1}. ${o.label}`,
          txt(20, this.theme.text, this.theme.font, { align: 'center', wordWrap: { width: 660 } }),
        )
        .setOrigin(0.5)
        .setDepth(DEPTH.dialogue + 3)
        .setScrollFactor(0);
      bg.on('pointerover', () => bg.setFillStyle(this.theme.border, 0.35));
      bg.on('pointerout', () => bg.setFillStyle(this.theme.bg, 0.96));
      bg.on('pointerdown', () => pick(o));
      this.choiceObjs.push(bg, label);
    });
  }
}
