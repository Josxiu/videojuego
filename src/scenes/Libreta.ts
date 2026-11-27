import { DEPTH, DREAMS, DREAM_SCENE, FONT, H, W, txt, type DreamId } from '../config';
import { T, fmt } from '../i18n';
import { INK } from '../gfx/riso';
import { Audio } from '../systems/audio/Audio';
import { Save } from '../systems/save';
import { Button, keyNav, wipeIn, wipeTo } from '../systems/ui';

/** La libreta de la revisora: una página por pasajero con sus tiquetes viejos. */
export class Libreta extends Phaser.Scene {
  private page = 0;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private buttons: Button[] = [];
  private pageButtons: Button[] = [];
  private back = 'Menu';

  constructor() {
    super('Libreta');
  }

  create(data: { back?: string; page?: number }): void {
    this.back = data?.back ?? 'Menu';
    this.page = data?.page ?? 0;
    this.cameras.main.setBackgroundColor(INK.night);
    // tapas de la libreta
    this.add.rectangle(W / 2, H / 2 + 6, 900, 480, 0x0e0a1a, 0.6);
    this.add.rectangle(W / 2, H / 2, 900, 480, 0x7a2e3a).setStrokeStyle(4, INK.navy);
    this.add.rectangle(W / 2 - 220, H / 2, 430, 450, INK.cream);
    this.add.rectangle(W / 2 + 220, H / 2, 430, 450, 0xf7efdc);
    this.add.rectangle(W / 2, H / 2, 6, 450, 0xcbbfa4);
    for (let y = 70; y < 500; y += 26) this.add.rectangle(W / 2 + 220, y, 400, 1, 0x9ab0d8, 0.4);
    this.add
      .text(
        W / 2,
        22,
        T.libreta.title.toUpperCase(),
        txt(20, '#ffd23f', FONT.display, { fontStyle: '800' }),
      )
      .setOrigin(0.5);
    const prev = new Button(this, 50, H / 2, '‹', () => this.turn(-1), { w: 50, h: 70, size: 34 });
    const next = new Button(this, W - 50, H / 2, '›', () => this.turn(1), {
      w: 50,
      h: 70,
      size: 34,
    });
    const back = new Button(this, W - 90, 24, T.ui.back, () => wipeTo(this, this.back), {
      w: 140,
      h: 36,
      size: 18,
    });
    this.buttons = [prev, next, back];
    this.input.keyboard?.on('keydown-LEFT', () => this.turn(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.turn(1));
    this.input.keyboard?.on('keydown-ESC', () => wipeTo(this, this.back));
    keyNav(this, () => this.buttons);
    this.render();
    wipeIn(this, INK.night);
  }

  private turn(d: number): void {
    this.page = (this.page + d + DREAMS.length) % DREAMS.length;
    Audio.sfx('page');
    this.render();
  }

  private render(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
    // los botones de la página anterior (soñar otra vez) también se van
    for (const b of this.pageButtons) b.destroy();
    this.pageButtons = [];
    this.buttons = this.buttons.slice(0, 3);
    const id: DreamId = DREAMS[this.page];
    const tx = T.dreams[id];
    const p = Save.dream(id);
    const known = p.done || p.tickets.length > 0;
    const L = W / 2 - 420;
    const R = W / 2 + 22;
    const add = <G extends Phaser.GameObjects.GameObject>(g: G) => {
      this.objs.push(g);
      return g;
    };
    add(
      this.add.text(
        L,
        60,
        `${this.page + 1} / ${DREAMS.length}`,
        txt(16, '#7a2e3a', FONT.display, { fontStyle: '800' }),
      ),
    );
    add(
      this.add.text(
        L,
        86,
        tx.title,
        txt(32, '#1b1f3b', FONT.display, { fontStyle: '800', wordWrap: { width: 390 } }),
      ),
    );
    add(
      this.add.text(
        L,
        128,
        `${tx.owner} · ${tx.technique}`,
        txt(16, '#7a2e3a', FONT.body, { fontStyle: '700', wordWrap: { width: 390 } }),
      ),
    );
    add(
      this.add.text(
        L,
        170,
        known ? tx.page : T.libreta.lockedPage,
        txt(18, '#2a2230', FONT.body, { wordWrap: { width: 390 }, lineSpacing: 5 }),
      ),
    );
    const sec = p.secret ? fmt(T.libreta.secretYes, { name: tx.secret.name }) : T.libreta.secretNo;
    add(
      this.add.text(
        L,
        410,
        sec,
        txt(17, p.secret ? '#7a2e3a' : '#9a8f86', FONT.body, { fontStyle: '700' }),
      ),
    );
    if (p.madrugada)
      add(
        this.add.text(
          L,
          438,
          `☾ ${T.ui.madrugadaDone}`,
          txt(17, '#b8860b', FONT.body, { fontStyle: '700' }),
        ),
      );
    // tiquetes
    add(
      this.add.text(
        R,
        60,
        fmt(T.libreta.ticketsOf, { n: p.tickets.length }),
        txt(18, '#7a2e3a', FONT.display, { fontStyle: '800' }),
      ),
    );
    tx.tickets.forEach((tk, i) => {
      const y = 92 + i * 74;
      const got = p.tickets.includes(i);
      add(
        this.add
          .rectangle(R + 196, y + 30, 396, 66, got ? 0xffe9a8 : 0xe9e1cf, 1)
          .setStrokeStyle(2, got ? 0xb8860b : 0xcbbfa4),
      );
      add(this.add.circle(R + 18, y + 30, 6, got ? INK.navy : 0xcbbfa4));
      if (got) {
        add(
          this.add.text(
            R + 32,
            y + 4,
            `${tk.date} · ${tk.route}`,
            txt(13, '#7a2e3a', FONT.display, { fontStyle: '800', wordWrap: { width: 356 } }),
          ),
        );
        add(
          this.add.text(
            R + 32,
            y + 24,
            tk.memory,
            txt(14, '#2a2230', FONT.body, { wordWrap: { width: 356 } }),
          ),
        );
      } else {
        add(
          this.add.text(
            R + 32,
            y + 22,
            T.libreta.missing,
            txt(15, '#9a8f86', FONT.body, { fontStyle: 'italic' }),
          ),
        );
      }
    });
    if (p.done && id !== 'celeste') {
      const b = new Button(
        this,
        R + 110,
        482,
        T.libreta.replay,
        () => wipeTo(this, DREAM_SCENE[id], {}),
        { w: 200, h: 36, size: 17 },
      );
      const m = new Button(
        this,
        R + 320,
        482,
        `☾ ${T.libreta.madrugada}`,
        () => wipeTo(this, DREAM_SCENE[id], { madrugada: true }),
        { w: 170, h: 36, size: 17 },
      );
      this.buttons.push(b, m);
      this.pageButtons.push(b, m);
      b.setDepth(DEPTH.hud);
      m.setDepth(DEPTH.hud);
    }
  }
}
