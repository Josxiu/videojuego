import { DEPTH, FONT, H, W, txt } from '../config';
import { addTexture, css, makeCanvas, rng } from '../gfx/canvas';
import { INK, halftone } from '../gfx/riso';
import { TRAIN_SIDE_W } from '../gfx/trainSide';
import { T, type Line } from '../i18n';
import { Audio } from '../systems/audio/Audio';
import { Dialogue, THEMES } from '../systems/dialogue';
import { Juice } from '../systems/juice';
import { Save } from '../systems/save';
import { hint, wipeIn, wipeTo } from '../systems/ui';

type Boarder = 'reme' | 'samu' | 'marisol' | 'jairo' | 'chepe';
const BOARDERS: Boarder[] = ['reme', 'samu', 'marisol', 'jairo', 'chepe'];

/**
 * Intro jugable: la estación, picar los tiquetes de los pasajeros (enseña a
 * tocar), la salida del tren, la noche y el túnel donde se para el reloj.
 */
export class Intro extends Phaser.Scene {
  private dlg!: Dialogue;
  private layer!: Phaser.GameObjects.Container;
  private skipping = false;
  private holdStart = -1;
  private ring!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Intro');
  }

  create(): void {
    this.skipping = false;
    this.holdStart = -1;
    this.cameras.main.setBackgroundColor(INK.night);
    this.layer = this.add.container(0, 0);
    this.dlg = new Dialogue(this, THEMES.riso, 'top');
    this.add
      .tileSprite(0, 0, W, H, 'riso-grain')
      .setOrigin(0)
      .setDepth(DEPTH.overlay)
      .setAlpha(0.5);
    this.ring = this.add.graphics().setDepth(DEPTH.top);
    hint(this, T.ui.holdToSkip, 4000);
    this.input.on('pointerdown', () => (this.holdStart = this.time.now));
    this.input.on('pointerup', () => (this.holdStart = -1));
    Audio.music('menu');
    wipeIn(this, INK.night);
    void this.run();
  }

  update(): void {
    this.ring.clear();
    if (this.holdStart < 0 || this.skipping) return;
    const t = (this.time.now - this.holdStart) / 1100;
    if (t > 0.15) {
      this.ring.lineStyle(6, INK.pink, 1);
      this.ring.beginPath();
      this.ring.arc(W - 46, H - 46, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, t));
      this.ring.strokePath();
    }
    if (t >= 1) this.finish();
  }

  private finish(): void {
    if (this.skipping) return;
    this.skipping = true;
    Save.data.started = true;
    Save.markSeen('intro');
    wipeTo(this, 'Train', { fromIntro: true });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, res));
  }

  private say(lines: Line[]): Promise<void> {
    if (this.skipping) return Promise.resolve();
    return this.dlg.sayAsync(lines);
  }

  private card(text: string): Promise<void> {
    const t = this.add
      .text(
        W / 2,
        46,
        text,
        txt(26, '#ffd23f', FONT.display, {
          fontStyle: '800',
          stroke: '#14162e',
          strokeThickness: 6,
        }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.hud)
      .setAlpha(0);
    this.layer.add(t);
    this.tweens.add({ targets: t, alpha: 1, duration: 400 });
    return this.wait(900);
  }

  private clear(): void {
    this.layer.removeAll(true);
  }

  private async run(): Promise<void> {
    await this.station();
    if (this.skipping) return;
    await this.boarding();
    if (this.skipping) return;
    await this.depart();
    if (this.skipping) return;
    await this.night();
    if (this.skipping) return;
    await this.tunnel();
    this.finish();
  }

  // ---------- Cuadro 1: la estación ----------

  private stationBg(): void {
    if (!this.textures.exists('intro-station')) {
      const [c, ctx] = makeCanvas(W, H);
      ctx.fillStyle = css(INK.cream);
      ctx.fillRect(0, 0, W, H);
      halftone(
        ctx,
        0,
        0,
        W,
        330,
        INK.pink,
        (x, y) => 0.18 + 0.1 * Math.sin(x / 60) + (y < 60 ? 0.3 : 0),
        7,
      );
      // arcos de la estación
      ctx.fillStyle = css(INK.blue);
      for (let i = 0; i < 4; i++) {
        const x = 40 + i * 230;
        ctx.beginPath();
        ctx.moveTo(x, 330);
        ctx.lineTo(x, 150);
        ctx.arc(x + 85, 150, 85, Math.PI, 0);
        ctx.lineTo(x + 170, 330);
        ctx.closePath();
        ctx.fill();
      }
      halftone(
        ctx,
        0,
        60,
        W,
        270,
        INK.navy,
        (x, y) => (Math.sin(x / 115) > 0.6 ? 0 : 0.12 + y / 900),
        6,
      );
      // letrero
      ctx.fillStyle = css(INK.navy);
      ctx.fillRect(250, 24, 460, 44);
      // reloj
      ctx.fillStyle = css(INK.cream);
      ctx.beginPath();
      ctx.arc(480, 120, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = css(INK.navy);
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(480, 120);
      ctx.lineTo(480 + 14, 120 - 8);
      ctx.moveTo(480, 120);
      ctx.lineTo(480 + 2, 120 - 26);
      ctx.stroke();
      // andén
      ctx.fillStyle = css(0x9a8f86);
      ctx.fillRect(0, 330, W, 210);
      halftone(ctx, 0, 330, W, 210, INK.navy, (_x, y) => (y - 330) / 400, 6);
      ctx.fillStyle = css(INK.yellow);
      ctx.fillRect(0, 336, W, 8);
      const r = rng(2);
      ctx.fillStyle = css(INK.navy, 0.3);
      for (let i = 0; i < 40; i++) ctx.fillRect(r() * W, 350 + r() * 180, 30 + r() * 40, 2);
      addTexture(this, 'intro-station', c);
    }
    this.layer.add(this.add.image(0, 0, 'intro-station').setOrigin(0));
  }

  private async station(): Promise<void> {
    this.stationBg();
    const cel = this.add.sprite(420, 500, 'celeste-riso', 8).setOrigin(0.5, 1).setScale(1.5);
    const jefe = this.add
      .sprite(560, 500, 'riso-ananias', 8)
      .setOrigin(0.5, 1)
      .setFlipX(true)
      .setScale(1.5);
    this.layer.add([cel, jefe]);
    await this.card(T.intro.cards.station);
    await this.say(T.intro.jefe);
  }

  // ---------- Cuadro 2: picar los tiquetes ----------

  private ticketTexture(): void {
    if (this.textures.exists('intro-ticket')) return;
    const [c, ctx] = makeCanvas(420, 190);
    ctx.fillStyle = css(INK.cream);
    ctx.beginPath();
    ctx.roundRect(0, 0, 420, 190, 12);
    ctx.fill();
    halftone(ctx, 0, 0, 420, 190, INK.yellow, () => 0.25, 6);
    ctx.fillStyle = css(INK.pink);
    ctx.fillRect(0, 0, 420, 44);
    ctx.fillStyle = css(INK.navy);
    ctx.font = '800 22px "Big Shoulders Display"';
    ctx.fillText('FERROCARRIL DEL MAGDALENA', 18, 30);
    ctx.font = '800 34px "Big Shoulders Display"';
    ctx.fillText('BOGOTÁ → SANTA MARTA', 18, 92);
    ctx.font = '500 18px "Big Shoulders Display"';
    ctx.fillText('NOCTURNO 14 · EL LUCERO · ÚLTIMO SERVICIO', 18, 124);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = css(INK.navy);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(320, 52);
    ctx.lineTo(320, 182);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(368, 150, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '500 14px "Big Shoulders Display"';
    ctx.fillText('PICA', 354, 112);
    addTexture(this, 'intro-ticket', c);
  }

  private punchTicket(coach: number, upsideDown: boolean): Promise<void> {
    this.ticketTexture();
    return new Promise((res) => {
      if (this.skipping) return res();
      const c = this.add.container(W / 2, 290).setDepth(DEPTH.hud);
      const im = this.add.image(0, 0, 'intro-ticket');
      const num = this.add.text(
        -190,
        34,
        `COCHE ${coach}`,
        txt(26, '#1b1f3b', FONT.display, { fontStyle: '800' }),
      );
      c.add([im, num]);
      if (upsideDown) c.setAngle(180);
      c.setScale(0.4).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
      const ring = this.add
        .circle(W / 2 + (upsideDown ? -158 : 158), 290 + (upsideDown ? -60 : 60), 26)
        .setStrokeStyle(4, INK.pink)
        .setDepth(DEPTH.hud + 1);
      this.tweens.add({
        targets: ring,
        scale: 1.3,
        alpha: 0.3,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
      const t = this.add
        .text(
          W / 2,
          430,
          T.ui.punchPrompt,
          txt(22, '#ffd23f', FONT.display, {
            fontStyle: '800',
            stroke: '#14162e',
            strokeThickness: 5,
          }),
        )
        .setOrigin(0.5)
        .setDepth(DEPTH.hud);
      this.time.delayedCall(250, () => {
        const go = () => {
          this.input.keyboard?.off('keydown', go);
          this.input.off('pointerdown', go);
          ring.destroy();
          t.destroy();
          Audio.sfx('punch');
          Juice.vibrate(20);
          const hole = this.add.circle(ring.x, ring.y, 9, INK.night).setDepth(DEPTH.hud + 1);
          Juice.burst(this, ring.x, ring.y, INK.cream, 8, 90, 2, DEPTH.hud + 2);
          this.tweens.add({
            targets: [c, hole],
            y: '-=40',
            alpha: 0,
            delay: 350,
            duration: 300,
            onComplete: () => {
              c.destroy();
              hole.destroy();
              res();
            },
          });
        };
        this.input.once('pointerdown', go);
        this.input.keyboard?.once('keydown', go);
      });
    });
  }

  private async boarding(): Promise<void> {
    // el tren en el andén, a la derecha, con la puerta abierta
    this.layer.removeAll(true);
    this.stationBg();
    const tr = this.add
      .image(-60, 270, 'riso-train')
      .setOrigin(0, 0.5)
      .setScale(1.8)
      .setCrop(0, 0, 560, 130);
    const door = this.add.rectangle(330, 304, 50, 120, INK.navy).setStrokeStyle(4, 0xd9b45a);
    const cel = this.add
      .sprite(420, 500, 'celeste-riso', 8)
      .setOrigin(0.5, 1)
      .setFlipX(true)
      .setScale(1.5);
    this.layer.add([tr, door, cel]);
    for (const id of BOARDERS) {
      if (this.skipping) return;
      const p = this.add
        .sprite(W + 60, 500, `riso-${id}`, 0)
        .setOrigin(0.5, 1)
        .setFlipX(true)
        .setScale(1.5);
      this.layer.add(p);
      p.play({ key: `walk-${id}`, repeat: -1 });
      await new Promise<void>((res) =>
        this.tweens.add({ targets: p, x: 520, duration: 1100, onComplete: () => res() }),
      );
      p.stop().setFrame(8);
      await this.punchTicket(BOARDERS.indexOf(id) + 1, id === 'reme');
      await this.say(T.intro.boarding[id]);
      p.play({ key: `walk-${id}`, repeat: -1 });
      await new Promise<void>((res) =>
        this.tweens.add({ targets: p, x: 330, alpha: 0, duration: 900, onComplete: () => res() }),
      );
      p.destroy();
    }
    if (this.skipping) return;
    const abel = this.add.sprite(-60, 500, 'riso-abel', 0).setOrigin(0.5, 1).setScale(1.5);
    this.layer.add(abel);
    abel.play({ key: 'walk-abel', repeat: -1 });
    await new Promise<void>((res) =>
      this.tweens.add({ targets: abel, x: 300, duration: 1500, onComplete: () => res() }),
    );
    abel.stop().setFrame(8);
    cel.setFlipX(true);
    await this.say(T.intro.boarding.abel);
    abel.play({ key: 'walk-abel', repeat: -1 });
    this.tweens.add({ targets: abel, x: W + 80, duration: 2400 });
    await this.wait(900);
  }

  // ---------- Cuadro 3: sale el tren ----------

  private async depart(): Promise<void> {
    this.clear();
    const sky = this.add.image(0, 0, 'menu-sky').setOrigin(0);
    const ground = this.add.rectangle(0, 440, W, 100, 0x0e1028).setOrigin(0);
    const train = this.add.image(-TRAIN_SIDE_W + 300, 400, 'riso-train').setOrigin(0, 0.5);
    this.layer.add([sky, ground, train]);
    Audio.sfx('whistle');
    this.tweens.add({ targets: train, x: W + 50, duration: 5200, ease: 'Sine.easeIn' });
    await this.card(T.intro.cards.depart);
    await this.wait(3000);
  }

  // ---------- Cuadro 4: la noche ----------

  private corridor(tunnel: boolean): Phaser.GameObjects.Sprite {
    const out = this.add
      .tileSprite(0, 96, W, 150, tunnel ? 'riso-tunnel' : 'riso-tunnel')
      .setOrigin(0)
      .setTint(tunnel ? 0xffffff : 0x3a3a6a);
    const wall = this.add.image(-70, 40, 'riso-wall').setOrigin(0).setTint(0x8a8ab0);
    const floor = this.add.tileSprite(0, 440, W, 100, 'riso-floor').setOrigin(0).setTint(0x8a8ab0);
    const cel = this.add.sprite(-40, 456, 'celeste-riso', 0).setOrigin(0.5, 1).setScale(1.35);
    this.layer.add([out, wall, floor, cel]);
    this.events.on('update', () => (out.tilePositionX += tunnel ? 14 : 4));
    return cel;
  }

  private async night(): Promise<void> {
    this.clear();
    const cel = this.corridor(false);
    await this.card(T.intro.cards.night);
    cel.play({ key: 'walk-celeste', repeat: -1 });
    await new Promise<void>((res) =>
      this.tweens.add({ targets: cel, x: 520, duration: 2600, onComplete: () => res() }),
    );
    cel.stop().setFrame(8);
    await this.say(T.intro.night);
  }

  // ---------- Cuadro 5: el túnel ----------

  private async tunnel(): Promise<void> {
    this.clear();
    const cel = this.corridor(true);
    cel.setX(380).setFrame(8);
    // reloj del pasillo
    const clock = this.add.container(780, 330);
    const face = this.add.circle(0, 0, 34, INK.cream).setStrokeStyle(4, INK.navy);
    const hand = this.add.rectangle(0, 0, 3, 28, INK.navy).setOrigin(0.5, 1);
    const hour = this.add.rectangle(0, 0, 4, 18, INK.navy).setOrigin(0.5, 1).setAngle(84);
    const lbl = this.add
      .text(0, 48, '2:47', txt(20, '#ffd23f', FONT.display, { fontStyle: '800' }))
      .setOrigin(0.5);
    clock.add([face, hour, hand, lbl]);
    const mech = this.add.sprite(640, 340, 'mecha-riso', 3).setScale(1.5);
    this.layer.add([clock, mech]);
    await this.card(T.intro.cards.tunnel);
    this.tweens.add({ targets: hand, angle: 280, duration: 1400, ease: 'Sine.easeOut' });
    // parpadeo de luces
    const dark = this.add
      .rectangle(0, 0, W, H, 0x000000, 0)
      .setOrigin(0)
      .setDepth(DEPTH.hud - 1);
    this.layer.add(dark);
    for (let i = 0; i < 5; i++) {
      dark.setFillStyle(0x000000, 0.7);
      Audio.sfx('buzz');
      await this.wait(90 + i * 30);
      dark.setFillStyle(0x000000, 0.1);
      await this.wait(140);
    }
    Juice.shake(this, 0.008, 300);
    Audio.stop(1.2);
    await this.wait(700);
    mech.setFrame(0);
    Juice.flash(this, 0xfff6d0, 200);
    this.tweens.add({
      targets: mech,
      y: 332,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    await this.say(T.intro.tunnel);
  }
}
