import { DEPTH, FONT, H, W, txt } from '../config';
import { INK, misregText } from '../gfx/riso';
import { TRAIN_SIDE_W } from '../gfx/trainSide';
import { T } from '../i18n';
import { Audio } from '../systems/audio/Audio';
import { Save, trainAct } from '../systems/save';
import { Button, keyNav, wipeIn, wipeTo } from '../systems/ui';

/** Portada: el Lucero cruzando la noche, en risografía. */
export class Menu extends Phaser.Scene {
  private buttons: Button[] = [];
  private confirm: (Button | Phaser.GameObjects.GameObject)[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    this.buttons = [];
    this.confirm = [];
    this.cameras.main.setBackgroundColor(INK.night);
    this.buildSky();
    // cerros
    const hills = this.add.graphics();
    hills.fillStyle(INK.blue, 1);
    hills.beginPath();
    hills.moveTo(0, H);
    for (let x = 0; x <= W; x += 20)
      hills.lineTo(x, 360 + Math.sin(x / 90) * 26 + Math.sin(x / 31) * 8);
    hills.lineTo(W, H);
    hills.fillPath();
    // vía
    this.add.rectangle(0, 470, W, 6, INK.navy).setOrigin(0);
    this.add.rectangle(0, 470, W, 70, 0x0e1028).setOrigin(0, 0);
    for (let x = 0; x < W; x += 28) this.add.rectangle(x, 476, 16, 6, 0x2a2350).setOrigin(0);
    // el tren
    const train = this.add.image(-TRAIN_SIDE_W, 405, 'riso-train').setOrigin(0, 0.5);
    this.tweens.add({
      targets: train,
      x: W + 40,
      duration: 26000,
      repeat: -1,
      onRepeat: () => Audio.sfx('whistle'),
    });
    const smoke = this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        const x = train.x + TRAIN_SIDE_W - 60;
        if (x < -20 || x > W + 20) return;
        const p = this.add.circle(x, 350, 6 + Math.random() * 6, INK.pink, 0.5);
        this.tweens.add({
          targets: p,
          y: 260,
          x: x - 80,
          scale: 3,
          alpha: 0,
          duration: 2600,
          onComplete: () => p.destroy(),
        });
      },
    });
    void smoke;

    // título
    misregText(
      this,
      W / 2,
      112,
      T.ui.title,
      txt(118, '#ff5fa2', FONT.display, { fontStyle: '800' }),
      '#2f5dd6',
      '#ff5fa2',
      5,
    ).forEach((t) => t.setOrigin(0.5));
    this.add
      .text(W / 2, 186, T.ui.subtitle, txt(26, '#ffd23f', FONT.body, { fontStyle: 'italic' }))
      .setOrigin(0.5);
    this.add
      .text(W / 2, H - 22, T.menuFooter, txt(15, '#f4ead5', FONT.display, { fontStyle: '500' }))
      .setOrigin(0.5)
      .setAlpha(0.8);

    const started = Save.data.started;
    const y0 = 262;
    this.buttons.push(
      new Button(this, W / 2, y0, started ? T.ui.continue : T.ui.play, () => this.start(false)),
    );
    let y = y0 + 62;
    if (started) {
      this.buttons.push(
        new Button(this, W / 2, y, T.ui.newGame, () => this.askNew(), { w: 220, h: 44, size: 20 }),
      );
      y += 54;
    }
    if (started) {
      this.buttons.push(
        new Button(this, W / 2, y, T.ui.libreta, () => wipeTo(this, 'Libreta'), {
          w: 220,
          h: 44,
          size: 20,
        }),
      );
    }
    const sound = new Button(
      this,
      W - 120,
      36,
      this.soundLabel(),
      () => {
        Save.data.muted = !Save.data.muted;
        Save.write();
        Audio.setMuted(Save.data.muted);
        sound.setText(this.soundLabel());
      },
      { w: 190, h: 40, size: 18 },
    );
    const calm = new Button(
      this,
      120,
      36,
      this.calmLabel(),
      () => {
        Save.data.calm = !Save.data.calm;
        Save.write();
        calm.setText(this.calmLabel());
      },
      { w: 220, h: 40, size: 18 },
    );
    this.buttons.push(sound, calm);
    keyNav(this, () =>
      this.confirm.length
        ? this.confirm.filter((b): b is Button => b instanceof Button)
        : this.buttons,
    );
    this.add
      .tileSprite(0, 0, W, H, 'riso-grain')
      .setOrigin(0)
      .setDepth(DEPTH.overlay)
      .setAlpha(0.6);
    Audio.music('menu');
    wipeIn(this, INK.night);
  }

  private soundLabel(): string {
    return `${T.ui.sound}: ${Save.data.muted ? T.ui.off : T.ui.on}`;
  }

  private calmLabel(): string {
    return `${T.ui.calm}: ${Save.data.calm ? T.ui.on : T.ui.off}`;
  }

  private buildSky(): void {
    this.add.image(0, 0, 'menu-sky').setOrigin(0);
  }

  private start(fresh: boolean): void {
    if (fresh) Save.reset();
    if (!Save.data.started) {
      wipeTo(this, 'Intro');
      return;
    }
    // Si ya terminó todo, el tren muestra el amanecer.
    void trainAct(Save.data);
    wipeTo(this, 'Train');
  }

  private askNew(): void {
    if (this.confirm.length) return;
    const dim = this.add
      .rectangle(0, 0, W, H, 0x0e0a1a, 0.8)
      .setOrigin(0)
      .setDepth(DEPTH.overlay + 1)
      .setInteractive();
    const q = this.add
      .text(
        W / 2,
        200,
        T.ui.confirmNew,
        txt(26, '#f4ead5', FONT.body, { align: 'center', wordWrap: { width: 700 } }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 2);
    const yes = new Button(this, W / 2 - 150, 300, T.ui.yes, () => this.start(true)).setDepth(
      DEPTH.overlay + 3,
    );
    const no = new Button(this, W / 2 + 150, 300, T.ui.no, () => {
      for (const o of this.confirm) o.destroy();
      this.confirm = [];
    }).setDepth(DEPTH.overlay + 3);
    this.confirm = [dim, q, yes, no];
  }
}
