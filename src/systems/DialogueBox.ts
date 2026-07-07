import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONT, DEPTH_DIALOGUE } from '../config';
import { AudioManager } from './AudioManager';

export type Speaker = 'iris' | 'morfeo' | null; // null = narración

export interface Line {
  who: Speaker;
  text: string;
}

const NAMES: Record<string, string> = { iris: 'IRIS', morfeo: 'MORFEO' };

/**
 * Caja de diálogo con retrato y efecto máquina de escribir.
 * Mientras `active` es true, la escena debe pausar su gameplay.
 */
export class DialogueBox {
  active = false;
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private portrait: Phaser.GameObjects.Sprite;
  private portraitGlow!: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private nextHint: Phaser.GameObjects.Text;
  private lines: Line[] = [];
  private lineIndex = 0;
  private charIndex = 0;
  private typing?: Phaser.Time.TimerEvent;
  private onDone?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const W = 760;
    const H = 128;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - H / 2 - 16;

    const bg = scene.add.graphics();
    bg.fillStyle(0x0d0a1e, 0.94);
    bg.fillRoundedRect(-W / 2, -H / 2, W, H, 10);
    bg.lineStyle(2, 0x9d7bff, 0.8);
    bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 10);

    this.portraitGlow = scene.add.image(-W / 2 + 56, 0, 'glow-violet').setScale(3.2).setAlpha(0.35);
    this.portrait = scene.add.sprite(-W / 2 + 56, 0, 'iris', '0').setScale(3.4);
    this.nameText = scene.add.text(-W / 2 + 108, -H / 2 + 14, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: '#9d7bff',
      fontStyle: 'bold',
    });
    this.bodyText = scene.add.text(-W / 2 + 108, -H / 2 + 38, '', {
      fontFamily: FONT,
      fontSize: '17px',
      color: '#efe9ff',
      wordWrap: { width: W - 150 },
      lineSpacing: 5,
    });
    this.nextHint = scene.add
      .text(W / 2 - 26, H / 2 - 20, '▼', { fontFamily: FONT, fontSize: '15px', color: '#9d7bff' })
      .setOrigin(0.5);
    scene.tweens.add({ targets: this.nextHint, y: H / 2 - 14, duration: 480, yoyo: true, repeat: -1 });

    this.container = scene.add
      .container(x, y, [bg, this.portraitGlow, this.portrait, this.nameText, this.bodyText, this.nextHint])
      .setDepth(DEPTH_DIALOGUE)
      .setScrollFactor(0)
      .setVisible(false);

    // Avance por toque o tecla
    scene.input.on('pointerdown', this.advance, this);
    scene.input.keyboard?.on('keydown-SPACE', this.advance, this);
    scene.input.keyboard?.on('keydown-ENTER', this.advance, this);
    scene.input.keyboard?.on('keydown-E', this.advance, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', this.advance, this);
    });
  }

  say(lines: Line[], onDone?: () => void): void {
    this.lines = lines;
    this.lineIndex = 0;
    this.onDone = onDone;
    this.active = true;
    this.container.setVisible(true);
    this.showLine();
  }

  private showLine(): void {
    const line = this.lines[this.lineIndex];
    const who = line.who;
    this.portrait.setVisible(who !== null);
    this.portraitGlow.setVisible(who !== null);
    this.portraitGlow.setAlpha(who === 'morfeo' ? 0.5 : 0.35);
    if (who === 'iris') this.portrait.setTexture('iris', '0').setScale(3.4);
    if (who === 'morfeo') this.portrait.setTexture('morfeo', '0').setScale(3.4);
    this.nameText.setText(who ? NAMES[who] : '');
    this.bodyText.setText('');
    this.bodyText.setX(who ? -760 / 2 + 108 : -760 / 2 + 32);
    this.nameText.setColor(who === 'morfeo' ? '#86f7ff' : '#ffb3c6');
    this.charIndex = 0;
    this.nextHint.setVisible(false);
    this.typing?.remove();
    this.typing = this.scene.time.addEvent({
      delay: 17,
      loop: true,
      callback: () => {
        this.charIndex += 1;
        this.bodyText.setText(line.text.slice(0, this.charIndex));
        if (this.charIndex % 3 === 0) AudioManager.sfx('text');
        if (this.charIndex >= line.text.length) {
          this.typing?.remove();
          this.nextHint.setVisible(true);
        }
      },
    });
  }

  private advance(): void {
    if (!this.active) return;
    const line = this.lines[this.lineIndex];
    if (this.charIndex < line.text.length) {
      // Completa la línea de inmediato
      this.charIndex = line.text.length;
      this.bodyText.setText(line.text);
      this.typing?.remove();
      this.nextHint.setVisible(true);
      return;
    }
    this.lineIndex += 1;
    if (this.lineIndex < this.lines.length) {
      this.showLine();
    } else {
      this.container.setVisible(false);
      // Pequeña espera para que la escena no reciba el mismo toque como acción
      this.scene.time.delayedCall(140, () => {
        this.active = false;
      });
      this.onDone?.();
    }
  }
}
