import { DEPTH, FONT, H, TICKETS_PER_DREAM, W, txt, type DreamId } from '../config';
import { T, dreamText, fmt, type Line, type DreamTexts } from '../i18n';
import { Audio } from '../systems/audio/Audio';
import type { TrackId } from '../systems/audio/tracks';
import { debug } from '../systems/debug';
import { Dialogue, type DialogueTheme } from '../systems/dialogue';
import { Juice } from '../systems/juice';
import { Save } from '../systems/save';
import { Button, keyNav, toast, wipeIn, wipeTo } from '../systems/ui';

export interface DreamInit {
  madrugada?: boolean;
}

export interface CardStyle {
  bg: number;
  ink: string;
  accent: string;
  font: string;
}

/**
 * Base de todos los sueños: tarjeta de título, diálogos, actos, tiquetes,
 * secreto, pausa, sello de llegada y vuelta al tren.
 */
export abstract class DreamScene extends Phaser.Scene {
  abstract readonly dream: DreamId;
  abstract readonly theme: DialogueTheme;
  abstract readonly card: CardStyle;
  abstract readonly music: TrackId;

  protected dlg!: Dialogue;
  protected madrugada = false;
  protected act = 0;
  protected paused = false;
  protected ended = false;
  /** El jugador puede actuar (no hay tarjeta, diálogo ni pausa). */
  protected playing = false;
  private hudTickets: Phaser.GameObjects.Image[] = [];
  private actLabel?: Phaser.GameObjects.Text;
  private pauseObjs: (Button | Phaser.GameObjects.GameObject)[] = [];
  private pauseBtn?: Phaser.GameObjects.Container;

  get txt(): DreamTexts {
    return dreamText(this.dream);
  }

  init(data: DreamInit): void {
    this.madrugada = !!data?.madrugada || debug.flag('madrugada');
    this.act = 0;
    this.paused = false;
    this.ended = false;
    this.playing = false;
    this.hudTickets = [];
    this.pauseObjs = [];
  }

  /** La subclase construye su mundo aquí. */
  protected abstract build(): void;
  /** Arranca (o reinicia) un acto. */
  protected abstract startAct(n: number): void;

  create(): void {
    this.cameras.main.setBackgroundColor(this.card.bg);
    this.build();
    this.dlg = new Dialogue(this, this.theme);
    this.buildHud();
    Audio.music(this.music, 0);
    wipeIn(this, this.card.bg);
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    const skip = debug.flag('skip');
    const firstAct = Math.max(1, Math.min(3, debug.num('act', 1)));
    if (skip) {
      this.startActWithBanner(firstAct, false);
      return;
    }
    this.titleCard(() => {
      this.dlg.say(this.txt.intro, () => this.startActWithBanner(firstAct, true));
    });
  }

  // ---------- Actos ----------

  protected startActWithBanner(n: number, banner = true): void {
    this.act = n;
    Audio.level(n - 1);
    if (this.actLabel)
      this.actLabel.setText(
        `${fmt(T.ui.act, { n: ['I', 'II', 'III'][n - 1] })} · ${this.txt.acts[n - 1]}`,
      );
    if (banner) this.actBanner(n);
    this.playing = true;
    this.startAct(n);
  }

  private actBanner(n: number): void {
    const roman = ['I', 'II', 'III'][n - 1];
    const box = this.add
      .container(W / 2, H / 2)
      .setDepth(DEPTH.overlay)
      .setScrollFactor(0);
    const bar = this.add.rectangle(
      0,
      0,
      W,
      96,
      Phaser.Display.Color.HexStringToColor(this.card.accent).color,
      0.9,
    );
    const t1 = this.add
      .text(
        0,
        -16,
        fmt(T.ui.act, { n: roman }),
        txt(22, this.card.ink, FONT.display, { fontStyle: '800' }),
      )
      .setOrigin(0.5);
    const t2 = this.add
      .text(0, 16, this.txt.acts[n - 1], txt(30, this.card.ink, this.card.font))
      .setOrigin(0.5);
    box.add([bar, t1, t2]);
    box.setScale(1, 0);
    this.tweens.add({ targets: box, scaleY: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: box,
      alpha: 0,
      delay: 1500,
      duration: 400,
      onComplete: () => box.destroy(),
    });
  }

  // ---------- Diálogo ----------

  protected say(lines: Line[]): Promise<void> {
    this.playing = false;
    return new Promise((res) =>
      this.dlg.say(lines, () => {
        if (!this.ended) this.playing = true;
        res();
      }),
    );
  }

  /** ¿Se puede jugar en este cuadro? */
  protected canPlay(): boolean {
    return this.playing && !this.paused && !this.ended && !this.dlg.justClosed(180);
  }

  // ---------- Tiquetes y secreto ----------

  protected foundTicket(i: number, x?: number, y?: number): void {
    const isNew = Save.addTicket(this.dream, i);
    Audio.sfx('ticket');
    Juice.vibrate([10, 30, 10]);
    if (x !== undefined && y !== undefined)
      Juice.burst(this, x, y, 0xffd36b, 14, 140, 3, DEPTH.hud - 1);
    const tk = this.txt.tickets[i];
    toast(this, `${T.ui.ticketFound}${isNew ? '' : ' ✓'} · ${tk.date}`);
    this.refreshHud();
  }

  protected hasTicket(i: number): boolean {
    return Save.dream(this.dream).tickets.includes(i);
  }

  protected async foundSecret(): Promise<void> {
    const p = Save.dream(this.dream);
    p.secret = true;
    Save.write();
    Audio.sfx('secret');
    Juice.flash(this, 0xfff4d0, 300);
    toast(this, `${T.ui.secretFound} · ${this.txt.secret.name}`, '#ffffff');
    await this.say(this.txt.secret.lines);
  }

  // ---------- Final ----------

  /** El sueño terminó: outro, sello de llegada y vuelta al tren. */
  protected async complete(extraOutro?: Line[]): Promise<void> {
    if (this.ended) return;
    this.playing = false;
    if (extraOutro) await this.say(extraOutro);
    await this.say(this.txt.outro);
    this.ended = true;
    const p = Save.dream(this.dream);
    const firstTime = !p.done;
    p.done = true;
    if (this.madrugada) p.madrugada = true;
    Save.write();
    this.stamp(() => {
      this.time.delayedCall(900, () => wipeTo(this, 'Train', { from: this.dream, firstTime }));
    });
  }

  private stamp(onDone: () => void): void {
    const c = this.add
      .container(W / 2, H / 2)
      .setDepth(DEPTH.top - 10)
      .setScrollFactor(0);
    const g = this.add.graphics();
    g.lineStyle(8, 0xc8283c, 0.9);
    g.strokeCircle(0, 0, 112);
    g.lineStyle(3, 0xc8283c, 0.9);
    g.strokeCircle(0, 0, 96);
    const t = this.add
      .text(0, -8, T.ui.stampArrival, txt(46, '#c8283c', FONT.display, { fontStyle: '800' }))
      .setOrigin(0.5);
    const s = this.add
      .text(
        0,
        36,
        this.madrugada ? T.ui.madrugadaDone : 'EL LUCERO · Nº 14',
        txt(16, '#c8283c', FONT.display, { fontStyle: '800' }),
      )
      .setOrigin(0.5);
    c.add([g, t, s]);
    c.setAngle(-14).setScale(2.6).setAlpha(0);
    this.tweens.add({
      targets: c,
      scale: 1,
      alpha: 0.92,
      duration: 260,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        Audio.sfx('stamp');
        Juice.shake(this, 0.012, 200);
        Juice.vibrate(40);
        onDone();
      },
    });
  }

  protected exitToTrain(): void {
    this.ended = true;
    wipeTo(this, 'Train', { from: this.dream, firstTime: false });
  }

  // ---------- Tarjeta de título ----------

  private titleCard(onDone: () => void): void {
    const tx = this.txt;
    const c = this.add
      .container(0, 0)
      .setDepth(DEPTH.overlay + 5)
      .setScrollFactor(0);
    const bg = this.add.rectangle(0, 0, W, H, this.card.bg, 1).setOrigin(0);
    const owner = this.add
      .text(
        W / 2,
        150,
        tx.owner.toUpperCase(),
        txt(20, this.card.accent, FONT.display, { fontStyle: '800' }),
      )
      .setOrigin(0.5);
    const title = this.add
      .text(
        W / 2,
        236,
        tx.title,
        txt(64, this.card.ink, this.card.font, { align: 'center', wordWrap: { width: 860 } }),
      )
      .setOrigin(0.5);
    const tech = this.add
      .text(W / 2, 320, tx.technique, txt(22, this.card.accent, FONT.body, { fontStyle: '700' }))
      .setOrigin(0.5);
    const tag = this.add
      .text(
        W / 2,
        372,
        `«${tx.tagline}»`,
        txt(24, this.card.ink, FONT.body, { fontStyle: 'italic' }),
      )
      .setOrigin(0.5);
    c.add([bg, owner, title, tech, tag]);
    if (this.madrugada) {
      const m = this.add
        .text(
          W / 2,
          440,
          `☾ ${T.ui.madrugada}: ${tx.madrugada}`,
          txt(18, this.card.accent, FONT.body, { align: 'center', wordWrap: { width: 760 } }),
        )
        .setOrigin(0.5);
      c.add(m);
    }
    [owner, title, tech, tag].forEach((o, i) => {
      o.setAlpha(0).setY(o.y + 12);
      this.tweens.add({
        targets: o,
        alpha: 1,
        y: o.y - 12,
        delay: 150 + i * 160,
        duration: 400,
        ease: 'Cubic.easeOut',
      });
    });
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      this.tweens.add({
        targets: c,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          c.destroy();
          onDone();
        },
      });
    };
    this.time.delayedCall(2800, close);
    this.time.delayedCall(700, () => {
      bg.setInteractive();
      bg.once('pointerdown', close);
      this.input.keyboard?.once('keydown', close);
    });
  }

  // ---------- HUD ----------

  private buildHud(): void {
    // Tiquetes: cinco rectangulitos arriba a la izquierda.
    if (!this.textures.exists('hud-ticket')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xf4ead5, 1);
      g.fillRoundedRect(0, 0, 26, 16, 3);
      g.fillStyle(0x1b1f3b, 1);
      g.fillCircle(8, 8, 2.5);
      g.lineStyle(1, 0x1b1f3b, 0.6);
      g.lineBetween(14, 4, 14, 12);
      g.generateTexture('hud-ticket', 26, 16);
      g.destroy();
    }
    const panel = this.add
      .rectangle(12, 12, 174, 34, 0x0e0a1a, 0.55)
      .setOrigin(0)
      .setDepth(DEPTH.hud)
      .setScrollFactor(0);
    void panel;
    for (let i = 0; i < TICKETS_PER_DREAM; i++) {
      const im = this.add
        .image(32 + i * 32, 29, 'hud-ticket')
        .setDepth(DEPTH.hud + 1)
        .setScrollFactor(0);
      this.hudTickets.push(im);
    }
    this.actLabel = this.add
      .text(
        W / 2,
        16,
        '',
        txt(16, '#f4ead5', FONT.display, {
          fontStyle: '800',
          stroke: '#0e0a1a',
          strokeThickness: 4,
        }),
      )
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud)
      .setScrollFactor(0);
    // Botón de pausa
    const pb = this.add
      .container(W - 34, 30)
      .setDepth(DEPTH.hud + 2)
      .setScrollFactor(0);
    const pc = this.add
      .circle(0, 0, 21, 0x0e0a1a, 0.6)
      .setStrokeStyle(2, 0xf4ead5)
      .setInteractive({ useHandCursor: true });
    const pl = this.add
      .text(0, 0, 'II', txt(18, '#f4ead5', FONT.display, { fontStyle: '800' }))
      .setOrigin(0.5);
    pb.add([pc, pl]);
    pc.on('pointerdown', () => this.togglePause());
    this.pauseBtn = pb;
    this.refreshHud();
  }

  protected refreshHud(): void {
    const got = Save.dream(this.dream).tickets;
    this.hudTickets.forEach((im, i) => {
      im.setAlpha(got.includes(i) ? 1 : 0.22);
      im.setTint(got.includes(i) ? 0xffd36b : 0xffffff);
    });
  }

  /** Oculta el HUD (para finales o momentos de pantalla limpia). */
  protected hudVisible(v: boolean): void {
    this.hudTickets.forEach((t) => t.setVisible(v));
    this.actLabel?.setVisible(v);
    this.pauseBtn?.setVisible(v);
  }

  // ---------- Pausa ----------

  protected togglePause(): void {
    if (this.ended || this.dlg?.open) return;
    if (this.paused) this.closePause();
    else this.openPause();
  }

  private openPause(): void {
    this.paused = true;
    this.tweens.pauseAll();
    this.physics?.world?.pause();
    this.onPause(true);
    const dim = this.add
      .rectangle(0, 0, W, H, 0x0e0a1a, 0.75)
      .setOrigin(0)
      .setDepth(DEPTH.overlay)
      .setScrollFactor(0)
      .setInteractive();
    const title = this.add
      .text(W / 2, 130, T.ui.pause, txt(44, '#f4ead5', FONT.display, { fontStyle: '800' }))
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 1)
      .setScrollFactor(0);
    const mk = (y: number, label: string, fn: () => void) =>
      new Button(this, W / 2, y, label, fn).setDepth(DEPTH.overlay + 2);
    const b1 = mk(220, T.ui.resume, () => this.closePause());
    const b2 = mk(290, T.ui.restart, () => {
      this.closePause();
      this.scene.restart({ madrugada: this.madrugada });
    });
    const b3 = mk(360, T.ui.exitDream, () => {
      this.closePause();
      this.exitToTrain();
    });
    const b4 = mk(430, `${T.ui.sound}: ${Save.data.muted ? T.ui.off : T.ui.on}`, () => {
      Save.data.muted = !Save.data.muted;
      Save.write();
      Audio.setMuted(Save.data.muted);
      b4.setText(`${T.ui.sound}: ${Save.data.muted ? T.ui.off : T.ui.on}`);
    });
    this.pauseObjs = [dim, title, b1, b2, b3, b4];
    keyNav(this, () => this.pauseObjs.filter((o): o is Button => o instanceof Button));
  }

  private closePause(): void {
    for (const o of this.pauseObjs) o.destroy();
    this.pauseObjs = [];
    this.paused = false;
    this.tweens.resumeAll();
    this.physics?.world?.resume();
    this.onPause(false);
  }

  /** Para que la subclase congele lo suyo (relojes, sonidos). */
  protected onPause(_p: boolean): void {}
}
