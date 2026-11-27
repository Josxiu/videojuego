import { DEPTH, FONT, H, W, txt, type DreamId } from '../config';
import { addTexture, css, makeCanvas, rng } from '../gfx/canvas';
import { INK, halftone } from '../gfx/riso';
import { T, fmt } from '../i18n';
import { Audio } from '../systems/audio/Audio';
import { computeEnding, type EndingId } from '../systems/endings';
import { Save, secretCount, ticketCount } from '../systems/save';
import { DREAMS } from '../config';
import { Button, keyNav, wipeIn, wipeTo } from '../systems/ui';

const PASSENGERS: DreamId[] = ['reme', 'samu', 'marisol', 'jairo', 'chepe', 'efrain'];

/** El final: depende de la elección ante Abel, los tiquetes y los secretos. */
export class Ending extends Phaser.Scene {
  private ending: EndingId = 'cada_quien';
  private layer!: Phaser.GameObjects.Container;
  private caption!: Phaser.GameObjects.Text;
  private captionBox!: Phaser.GameObjects.Rectangle;
  private advance?: () => void;

  constructor() {
    super('Ending');
  }

  create(): void {
    this.ending = computeEnding(Save.data);
    if (!Save.data.endings.includes(this.ending)) Save.data.endings.push(this.ending);
    Save.write();
    this.cameras.main.setBackgroundColor(INK.night);
    this.layer = this.add.container(0, 0);
    this.captionBox = this.add
      .rectangle(W / 2, H - 70, 860, 110, 0x1b1f3b, 0.92)
      .setStrokeStyle(3, INK.pink)
      .setDepth(DEPTH.dialogue)
      .setVisible(false);
    this.caption = this.add
      .text(
        W / 2,
        H - 70,
        '',
        txt(22, '#f6ecd6', FONT.body, {
          align: 'center',
          wordWrap: { width: 800 },
          lineSpacing: 6,
        }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.dialogue + 1);
    this.add
      .tileSprite(0, 0, W, H, 'riso-grain')
      .setOrigin(0)
      .setDepth(DEPTH.overlay)
      .setAlpha(0.45);
    this.input.on('pointerdown', () => this.advance?.());
    this.input.keyboard?.on('keydown', () => this.advance?.());
    wipeIn(this, INK.night);
    void this.run();
  }

  private show(text: string, ms = 5200): Promise<void> {
    this.captionBox.setVisible(true);
    this.caption.setText(text).setAlpha(0);
    this.tweens.add({ targets: this.caption, alpha: 1, duration: 300 });
    return new Promise((res) => {
      let done = false;
      const fin = () => {
        if (done) return;
        done = true;
        this.advance = undefined;
        res();
      };
      this.time.delayedCall(450, () => (this.advance = fin));
      this.time.delayedCall(ms, fin);
    });
  }

  private card(text: string): Promise<void> {
    const t = this.add
      .text(
        W / 2,
        50,
        text,
        txt(30, '#ffd23f', FONT.display, {
          fontStyle: '800',
          stroke: '#14162e',
          strokeThickness: 6,
        }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.layer.add(t);
    return new Promise((r) => this.time.delayedCall(1000, r));
  }

  private async run(): Promise<void> {
    if (this.ending === 'via_muerta') {
      Audio.music('night', 0);
      Audio.muffle(700);
      this.tunnelBg();
      for (const line of T.endings.via_muerta) await this.show(line, 6000);
      this.finale();
      return;
    }
    Audio.music('dawn', 1);
    this.platformBg();
    await this.card(T.endings.arriveCard);
    const train = this.add.image(-200, 300, 'riso-train').setOrigin(0, 0.5).setScale(1.2);
    this.layer.add(train);
    // pasajeros bajando
    for (const id of PASSENGERS) {
      const p = Save.dream(id);
      const spr = this.add.sprite(330, 440, `riso-${id}`, 8).setOrigin(0.5, 1).setAlpha(0);
      this.layer.add(spr);
      this.tweens.add({ targets: spr, alpha: 1, duration: 300 });
      spr.play(`walk-${id}`);
      this.tweens.add({ targets: spr, x: 700 + Math.random() * 120, duration: 4200 });
      await this.show(p.secret ? T.dreams[id].arrival.secret : T.dreams[id].arrival.base);
      this.tweens.add({ targets: spr, alpha: 0, duration: 400, onComplete: () => spr.destroy() });
    }
    const abelSecret = Save.dream('abel').secret;
    if (this.ending === 'cada_quien') {
      await this.show(T.endings.cada_quien.abel);
      await this.show(T.endings.cada_quien.celeste);
      await this.show(T.endings.cada_quien.close);
    } else {
      const abel = this.add.sprite(330, 440, 'riso-abel', 8).setOrigin(0.5, 1);
      const cel = this.add.sprite(280, 440, 'celeste-riso', 8).setOrigin(0.5, 1);
      this.layer.add([abel, cel]);
      await this.show(T.endings.anden_lleno.abel);
      if (abelSecret) await this.show(T.endings.anden_lleno.abelSecret);
      await this.show(T.endings.anden_lleno.celeste);
      if (this.ending === 'anden_lleno') await this.show(T.endings.anden_lleno.close);
    }
    if (this.ending === 'trasnocho') {
      this.layer.removeAll(true);
      this.museumBg();
      await this.card(T.endings.trasnocho.card);
      await this.show(T.endings.trasnocho.abel);
      await this.show(T.endings.trasnocho.mecha);
      await this.show(T.endings.trasnocho.celeste);
      await this.show(T.endings.trasnocho.close);
    }
    const m = DREAMS.filter((d) => Save.dream(d).madrugada).length;
    if (m > 0) await this.show(fmt(T.endings.madrugadaLine, { n: m }), 4000);
    this.finale();
  }

  private tunnelBg(): void {
    const out = this.add.tileSprite(0, 0, W, H, 'riso-tunnel').setOrigin(0).setTint(0x6a6aa0);
    this.layer.add(out);
    this.events.on('update', () => (out.tilePositionX += 6));
    const tr = this.add
      .image(W / 2 - 700, 300, 'riso-train')
      .setOrigin(0, 0.5)
      .setTint(0x8a8ac0);
    this.layer.add(tr);
    this.tweens.add({ targets: tr, x: W + 20, duration: 14000, repeat: -1 });
  }

  private platformBg(): void {
    if (!this.textures.exists('end-platform')) {
      const [c, ctx] = makeCanvas(W, H);
      const g = ctx.createLinearGradient(0, 0, 0, 340);
      g.addColorStop(0, css(0xffa8c8));
      g.addColorStop(1, css(0xffe39a));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      halftone(ctx, 0, 0, W, 340, INK.pink, (_x, y) => 0.4 - y / 900, 7);
      // la Sierra Nevada
      ctx.fillStyle = css(INK.blue);
      ctx.beginPath();
      ctx.moveTo(0, 260);
      ctx.lineTo(160, 170);
      ctx.lineTo(260, 210);
      ctx.lineTo(420, 120);
      ctx.lineTo(560, 200);
      ctx.lineTo(700, 150);
      ctx.lineTo(960, 240);
      ctx.lineTo(960, 340);
      ctx.lineTo(0, 340);
      ctx.fill();
      ctx.fillStyle = css(INK.cream);
      ctx.beginPath();
      ctx.moveTo(400, 132);
      ctx.lineTo(420, 120);
      ctx.lineTo(446, 136);
      ctx.fill();
      // sol
      ctx.fillStyle = css(INK.yellow);
      ctx.beginPath();
      ctx.arc(780, 220, 46, 0, Math.PI * 2);
      ctx.fill();
      // palmeras
      const r = rng(6);
      for (const px of [90, 620, 880]) {
        ctx.strokeStyle = css(INK.navy);
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(px, 340);
        ctx.quadraticCurveTo(px + 20, 260, px + 10 + r() * 10, 200);
        ctx.stroke();
        ctx.fillStyle = css(INK.teal);
        for (let k = 0; k < 6; k++) {
          ctx.beginPath();
          ctx.ellipse(px + 14 + Math.cos(k) * 30, 200 + Math.sin(k) * 10, 34, 9, k, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // andén
      ctx.fillStyle = css(0xd8c8b0);
      ctx.fillRect(0, 340, W, 200);
      halftone(ctx, 0, 340, W, 200, INK.pink, () => 0.2, 6);
      ctx.fillStyle = css(INK.yellow);
      ctx.fillRect(0, 344, W, 8);
      ctx.fillStyle = css(INK.navy);
      ctx.font = '800 30px "Big Shoulders Display"';
      ctx.fillText('SANTA MARTA', 40, 330);
      addTexture(this, 'end-platform', c);
    }
    this.layer.add(this.add.image(0, 0, 'end-platform').setOrigin(0));
  }

  private museumBg(): void {
    this.platformBg();
    const plaque = this.add.rectangle(W / 2, 200, 420, 90, INK.cream).setStrokeStyle(4, 0xd9b45a);
    const t = this.add
      .text(
        W / 2,
        200,
        'MUSEO DEL FERROCARRIL\nEL LUCERO · 1958–2026',
        txt(22, '#1b1f3b', FONT.display, { fontStyle: '800', align: 'center' }),
      )
      .setOrigin(0.5);
    const loco = this.add.image(W / 2 - 900, 330, 'riso-train').setOrigin(0, 0.5);
    const mecha = this.add.sprite(820, 260, 'mecha-riso', 2).setScale(1.6);
    this.layer.add([plaque, t, loco, mecha]);
    this.tweens.add({ targets: mecha, alpha: 0.7, duration: 1200, yoyo: true, repeat: -1 });
  }

  private finale(): void {
    this.advance = undefined;
    this.captionBox.setVisible(false);
    this.caption.setText('');
    const dim = this.add
      .rectangle(0, 0, W, H, 0x14162e, 0.86)
      .setOrigin(0)
      .setDepth(DEPTH.overlay + 1);
    void dim;
    const name = T.endings.names[this.ending];
    this.add
      .text(
        W / 2,
        70,
        T.ui.endTitle.toUpperCase(),
        txt(22, '#ff5fa2', FONT.display, { fontStyle: '800' }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 2);
    this.add
      .text(
        W / 2,
        118,
        fmt(T.ui.endingName, { name }),
        txt(40, '#ffd23f', FONT.display, { fontStyle: '800' }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 2);
    const m = DREAMS.filter((d) => Save.dream(d).madrugada).length;
    this.add
      .text(
        W / 2,
        170,
        fmt(T.ui.stats, { t: ticketCount(Save.data), s: secretCount(Save.data), m }),
        txt(20, '#f6ecd6', FONT.body),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 2);
    const credits = this.add
      .text(
        W / 2,
        300,
        T.credits.join('\n'),
        txt(17, '#cfc8e0', FONT.body, { align: 'center', lineSpacing: 6 }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 2);
    void credits;
    const btns: Button[] = [];
    btns.push(
      new Button(this, W / 2 + (this.ending === 'via_muerta' ? 160 : 0), 480, T.ui.toMenu, () =>
        wipeTo(this, 'Menu'),
      ).setDepth(DEPTH.overlay + 3),
    );
    if (this.ending === 'via_muerta') {
      btns.push(
        new Button(this, W / 2 - 160, 480, T.ui.backToChoice, () => {
          Save.data.abelChoice = null;
          Save.write();
          wipeTo(this, 'Train', { from: 'abel' });
        }).setDepth(DEPTH.overlay + 3),
      );
    }
    keyNav(this, () => btns);
  }
}
