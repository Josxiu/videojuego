import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  FONT_BODY,
  FONT_DISPLAY,
  FONT_HAND,
  FONT_KID,
  FONT_CHALK,
  DEPTH_DIALOGUE,
} from '../config';
import { AudioManager, type VoiceId } from './AudioManager';
import { Rng } from '../gfx/noise';
import {
  paintTexture,
  eraserSmudge,
  chalkRect,
  paperGround,
  tape,
  wash,
  rectPoly,
  pencilPoly,
  crayonPoly,
  crayonFill,
  type Ctx,
} from '../gfx/brush';
import { stylizeTexture, STYLE_DISPLAY, type ArtStyle } from '../gfx/stylize';

export type Speaker = 'iris' | 'morfeo' | 'elmer' | 'nadia' | 'chuy' | 'tomas' | 'shadow' | null; // null = narración

export type Mood = 'wow' | 'sad' | 'smug';

export interface Line {
  who: Speaker;
  text: string;
  mood?: Mood;
  /** Se ejecuta cuando la línea aparece: para sincronizar la escena con el texto. */
  action?: () => void;
}

/** Cada sueño enmarca el diálogo con su propio material. */
export type DialogueTheme = 'night' | 'chalk' | 'paper' | 'watercolor' | 'crayon' | 'dawn';

interface ThemeLook {
  body: string;
  bodyFont: string;
  bodySize: number;
  nameFont: string;
  names: Partial<Record<Exclude<Speaker, null>, string>>;
  hint: string;
  style?: ArtStyle;
}

const NAMES: Record<Exclude<Speaker, null>, string> = {
  iris: 'IRIS',
  morfeo: 'MORFEO',
  elmer: 'ÉLMER',
  nadia: 'NADIA',
  chuy: 'DOÑA CHUY',
  tomas: 'TOMÁS',
  shadow: '???',
};

const LOOKS: Record<DialogueTheme, ThemeLook> = {
  night: {
    body: '#efe9ff',
    bodyFont: FONT_BODY,
    bodySize: 17,
    nameFont: FONT_DISPLAY,
    names: { iris: '#ffb3c6', morfeo: '#86f7ff', shadow: '#ff6b6b' },
    hint: '#9d7bff',
  },
  chalk: {
    body: '#f2efe6',
    bodyFont: FONT_HAND,
    bodySize: 21,
    nameFont: FONT_CHALK,
    names: { iris: '#ffc2d4', morfeo: '#a8f2ff', elmer: '#ffe08a' },
    hint: '#ffe08a',
    style: 'chalk',
  },
  paper: {
    body: '#2a2a44',
    bodyFont: FONT_HAND,
    bodySize: 21,
    nameFont: FONT_HAND,
    names: { iris: '#c0392b', morfeo: '#2c5f8a', nadia: '#b8862a' },
    hint: '#c0392b',
    style: 'paper',
  },
  watercolor: {
    body: '#4a3a2a',
    bodyFont: FONT_HAND,
    bodySize: 21,
    nameFont: FONT_HAND,
    names: { iris: '#b0506a', morfeo: '#3a6a8a', chuy: '#7a3b6e' },
    hint: '#7a5a9a',
    style: 'watercolor',
  },
  crayon: {
    body: '#2b2340',
    bodyFont: FONT_KID,
    bodySize: 21,
    nameFont: FONT_KID,
    names: { iris: '#d8453a', morfeo: '#2a5ad8', tomas: '#2a9a4a', shadow: '#141020' },
    hint: '#d8453a',
    style: 'crayon',
  },
  dawn: {
    body: '#6a4a2a',
    bodyFont: FONT_HAND,
    bodySize: 21,
    nameFont: FONT_HAND,
    names: { iris: '#c0506a', morfeo: '#3a6a8a' },
    hint: '#e0902a',
  },
};

const VOICES: Record<Exclude<Speaker, null>, VoiceId> = {
  iris: 'iris',
  morfeo: 'morfeo',
  elmer: 'kid',
  nadia: 'adult',
  chuy: 'old',
  tomas: 'kid',
  shadow: 'morfeo',
};

const BOX_W = 780;
const BOX_H = 140;

/** Pinta (una vez) el marco de un tema. */
function frameTexture(scene: Phaser.Scene, theme: DialogueTheme): string | undefined {
  if (theme === 'night') return undefined;
  const key = `dlg-${theme}`;
  const pad = 14;
  return paintTexture(scene, key, BOX_W + pad * 2, BOX_H + pad * 2, (ctx: Ctx) => {
    const rng = new Rng(key);
    ctx.translate(pad, pad);
    switch (theme) {
      case 'chalk': {
        // Un pizarroncito con marco de madera
        ctx.fillStyle = '#6b4424';
        ctx.fillRect(-8, -8, BOX_W + 16, BOX_H + 16);
        ctx.fillStyle = '#8a5a2e';
        ctx.fillRect(-8, -8, BOX_W + 16, 4);
        ctx.fillStyle = '#23392f';
        ctx.fillRect(0, 0, BOX_W, BOX_H);
        for (let i = 0; i < 6; i++)
          eraserSmudge(
            ctx,
            rng.range(40, BOX_W - 40),
            rng.range(20, BOX_H - 20),
            160,
            80,
            rng,
            0.05,
          );
        chalkRect(ctx, 8, 8, BOX_W - 16, BOX_H - 16, rng, { width: 1.5, alpha: 0.25 });
        break;
      }
      case 'paper': {
        ctx.save();
        ctx.shadowColor = 'rgba(30,15,5,0.35)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 5;
        ctx.fillStyle = '#fbf5e4';
        ctx.fillRect(0, 0, BOX_W, BOX_H);
        ctx.restore();
        const tmp = document.createElement('canvas');
        tmp.width = BOX_W;
        tmp.height = BOX_H;
        const tctx = tmp.getContext('2d');
        if (tctx) {
          paperGround(tctx, BOX_W, BOX_H, '#fbf5e4', rng, 0.8);
          ctx.drawImage(tmp, 0, 0);
        }
        ctx.strokeStyle = 'rgba(90,140,200,0.35)';
        ctx.lineWidth = 1;
        for (let y = 38; y < BOX_H; y += 26) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(BOX_W, y);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(210,70,70,0.45)';
        ctx.beginPath();
        ctx.moveTo(122, 0);
        ctx.lineTo(122, BOX_H);
        ctx.stroke();
        tape(ctx, 30, 2, 70, 20, -0.2, rng);
        tape(ctx, BOX_W - 36, 4, 70, 20, 0.25, rng);
        break;
      }
      case 'watercolor': {
        ctx.fillStyle = '#f6efdc';
        ctx.fillRect(0, 0, BOX_W, BOX_H);
        wash(ctx, rectPoly(6, 6, BOX_W - 12, BOX_H - 12), '#bcd8d0', rng, {
          layers: 14,
          alpha: 0.05,
          variance: 10,
        });
        wash(ctx, rectPoly(20, 16, BOX_W - 40, BOX_H - 32), '#f6efdc', rng, {
          layers: 10,
          alpha: 0.12,
          variance: 8,
          edge: 0,
        });
        pencilPoly(ctx, rectPoly(4, 4, BOX_W - 8, BOX_H - 8), rng, { alpha: 0.45 });
        break;
      }
      case 'crayon': {
        ctx.fillStyle = '#fffdf6';
        ctx.beginPath();
        ctx.roundRect(0, 0, BOX_W, BOX_H, 26);
        ctx.fill();
        crayonFill(ctx, rectPoly(10, BOX_H - 34, BOX_W - 20, 26), '#ffe27a', rng, {
          alpha: 0.35,
          coverage: 0.6,
        });
        crayonPoly(
          ctx,
          [
            [14, 4],
            [BOX_W - 14, 6],
            [BOX_W - 4, BOX_H / 2],
            [BOX_W - 12, BOX_H - 6],
            [16, BOX_H - 4],
            [4, BOX_H / 2],
          ],
          rng,
          { color: '#2a3a8a', width: 4 },
        );
        break;
      }
      case 'dawn': {
        const g = ctx.createLinearGradient(0, 0, 0, BOX_H);
        g.addColorStop(0, '#fff6e6');
        g.addColorStop(1, '#ffe3c4');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(0, 0, BOX_W, BOX_H, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(224,144,42,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }
    }
  });
}

/**
 * Caja de diálogo con retrato y efecto máquina de escribir.
 * Mientras `active` es true, la escena debe pausar su gameplay.
 */
export class DialogueBox {
  active = false;
  private scene: Phaser.Scene;
  private look: ThemeLook;
  private container: Phaser.GameObjects.Container;
  private portrait: Phaser.GameObjects.Image;
  private portraitGlow: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private nextHint: Phaser.GameObjects.Text;
  private lines: Line[] = [];
  private lineIndex = 0;
  private charIndex = 0;
  private typing?: Phaser.Time.TimerEvent;
  private onDone?: () => void;
  /** Cuenta las conversaciones: evita que el cierre de una apague la siguiente. */
  private sayId = 0;

  constructor(
    scene: Phaser.Scene,
    accent = 0x9d7bff,
    theme: DialogueTheme = 'night',
    position: 'top' | 'bottom' = 'bottom',
  ) {
    this.scene = scene;
    this.look = LOOKS[theme];
    const x = GAME_WIDTH / 2;
    const y = position === 'bottom' ? GAME_HEIGHT - BOX_H / 2 - 16 : BOX_H / 2 + 16;

    const parts: Phaser.GameObjects.GameObject[] = [];
    const frame = frameTexture(scene, theme);
    if (frame) {
      parts.push(scene.add.image(0, 0, frame));
    } else {
      const bg = scene.add.graphics();
      bg.fillStyle(0x0d0a1e, 0.94);
      bg.fillRoundedRect(-BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H, 10);
      bg.lineStyle(2, accent, 0.8);
      bg.strokeRoundedRect(-BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H, 10);
      parts.push(bg);
    }

    this.portraitGlow = scene.add
      .image(-BOX_W / 2 + 64, 0, 'glow-violet')
      .setScale(3.2)
      .setAlpha(theme === 'night' ? 0.35 : 0)
      .setTint(accent);
    this.portrait = scene.add.image(-BOX_W / 2 + 64, 0, 'portrait-iris', '0');
    this.nameText = scene.add.text(-BOX_W / 2 + 130, -BOX_H / 2 + 12, '', {
      fontFamily: this.look.nameFont,
      fontSize: theme === 'night' ? '15px' : '20px',
      color: this.look.hint,
    });
    this.bodyText = scene.add.text(-BOX_W / 2 + 130, -BOX_H / 2 + 40, '', {
      fontFamily: this.look.bodyFont,
      fontSize: `${this.look.bodySize}px`,
      color: this.look.body,
      wordWrap: { width: BOX_W - 170 },
      lineSpacing: theme === 'night' ? 5 : 1,
    });
    this.nextHint = scene.add
      .text(BOX_W / 2 - 26, BOX_H / 2 - 22, '▼', {
        fontFamily: FONT_BODY,
        fontSize: '15px',
        color: this.look.hint,
      })
      .setOrigin(0.5);
    scene.tweens.add({
      targets: this.nextHint,
      y: BOX_H / 2 - 16,
      duration: 480,
      yoyo: true,
      repeat: -1,
    });

    parts.push(this.portraitGlow, this.portrait, this.nameText, this.bodyText, this.nextHint);
    this.container = scene.add
      .container(x, y, parts)
      .setDepth(DEPTH_DIALOGUE)
      .setScrollFactor(0)
      .setVisible(false);

    // Avance por toque o tecla
    const kb = scene.input.keyboard;
    scene.input.on('pointerdown', this.advance, this);
    kb?.on('keydown-SPACE', this.advance, this);
    kb?.on('keydown-ENTER', this.advance, this);
    kb?.on('keydown-E', this.advance, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', this.advance, this);
      kb?.off('keydown-SPACE', this.advance, this);
      kb?.off('keydown-ENTER', this.advance, this);
      kb?.off('keydown-E', this.advance, this);
      this.typing?.remove();
    });
  }

  say(lines: Line[], onDone?: () => void): void {
    this.sayId += 1;
    this.lines = lines;
    this.lineIndex = 0;
    this.onDone = onDone;
    this.active = true;
    this.container.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 160 });
    this.showLine();
  }

  /** Coloca el retrato adecuado (con expresión y en el estilo del sueño). */
  private setPortrait(who: Exclude<Speaker, null>, mood?: Mood): void {
    let key: string;
    let frame: string;
    let baseScale = 3;
    switch (who) {
      case 'iris':
      case 'shadow':
        key = 'portrait-iris';
        frame = mood === 'wow' ? '1' : mood === 'sad' ? '2' : '0';
        break;
      case 'morfeo':
        key = 'portrait-morfeo';
        frame = mood === 'smug' ? '1' : '0';
        break;
      default:
        key = who;
        frame = '0';
        baseScale = 3.4;
    }
    const style = this.look.style;
    if (style) {
      this.portrait.setTexture(stylizeTexture(this.scene, key, style), frame);
      this.portrait.setScale(
        ((STYLE_DISPLAY * baseScale) / 3) * (key.startsWith('portrait') ? 1.25 : 1),
      );
    } else {
      this.portrait.setTexture(key, frame);
      this.portrait.setScale(key.startsWith('portrait') ? 3.6 : baseScale);
    }
    this.portrait.clearTint();
    if (who === 'shadow') this.portrait.setTint(0x1a1a26);
  }

  private showLine(): void {
    const line = this.lines[this.lineIndex];
    const who = line.who;
    this.portrait.setVisible(who !== null);
    this.portraitGlow.setVisible(who !== null);
    if (who) this.setPortrait(who, line.mood);
    this.nameText.setText(who ? NAMES[who] : '');
    this.nameText.setColor(who ? (this.look.names[who] ?? this.look.hint) : this.look.hint);
    this.bodyText.setText('');
    const left = who ? -BOX_W / 2 + 130 : -BOX_W / 2 + 40;
    this.bodyText.setX(left);
    this.bodyText.setY(who ? -BOX_H / 2 + 40 : -BOX_H / 2 + 26);
    this.bodyText.setWordWrapWidth(who ? BOX_W - 170 : BOX_W - 80);
    this.charIndex = 0;
    this.nextHint.setVisible(false);
    line.action?.();
    const voice: VoiceId = who ? VOICES[who] : 'narrator';
    this.typing?.remove();
    this.typing = this.scene.time.addEvent({
      delay: 18,
      loop: true,
      callback: () => {
        this.charIndex += 1;
        this.bodyText.setText(line.text.slice(0, this.charIndex));
        const ch = line.text[this.charIndex - 1];
        if (this.charIndex % 3 === 0 && ch && ch !== ' ') AudioManager.voice(voice);
        if (this.charIndex >= line.text.length) {
          this.typing?.remove();
          this.nextHint.setVisible(true);
        }
      },
    });
  }

  private advance(): void {
    if (!this.active || !this.container.visible) return;
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
      // Pequeña espera para que la escena no reciba el mismo toque como acción.
      // Si onDone abre otra conversación, esta espera ya no la cierra.
      const token = this.sayId;
      this.scene.time.delayedCall(140, () => {
        if (token === this.sayId) this.active = false;
      });
      this.onDone?.();
    }
  }
}
