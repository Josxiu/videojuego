import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PIXEL_SCALE, FONT_HAND, textStyle, titleStyle } from '../config';
import { t, type TextKey } from '../i18n';
import { applyWorldFX } from '../gfx/postfx';
import { Rng } from '../gfx/noise';
import { paintTexture, grain } from '../gfx/brush';
import { paintSong, BUILDING } from './song/art';
import { SaveManager, type EndingKind } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { fadeIn, fadeToScene, makeTextButton } from '../systems/ui';

type Shot = 'room' | 'hall' | 'dawn' | 'silence';

interface Beat {
  key: TextKey;
  shot: Shot;
  sound?: () => void;
}

/**
 * Epílogo dinámico con 4 desenlaces posibles según las decisiones y logros:
 * - silence (Final Alternativo: aceptar a Octavio)
 * - fragile (Final A: despertar sin suficiente escucha)
 * - breakfast (Final B: desayuno en el 4B)
 * - sunflower (Final Verdadero: el Girasol despierto en la azotea)
 */
export class Ending extends Phaser.Scene {
  private caption!: Phaser.GameObjects.Text;
  private layers: Record<Shot, Phaser.GameObjects.GameObject[]> = {
    room: [],
    hall: [],
    dawn: [],
    silence: [],
  };
  private shot?: Shot;
  private index = 0;
  private busy = false;
  private finished = false;
  private kind: EndingKind = 'breakfast';

  constructor() {
    super('Ending');
  }

  create(data: { kind?: EndingKind } = {}): void {
    this.kind = data.kind ?? SaveManager.determineEnding();
    this.layers = { room: [], hall: [], dawn: [], silence: [] };
    this.shot = undefined;
    this.index = 0;
    this.busy = false;
    this.finished = false;

    const isSilence = this.kind === 'silence';
    this.cameras.main.setBackgroundColor(isSilence ? 0xd8dee9 : 0xfff3e0);
    applyWorldFX(this, isSilence ? 'chamber3d' : 'ending');
    fadeIn(this, 1400);
    AudioManager.playMusic(isSilence ? 'silence' : 'ending');
    this.paint();
    this.buildRoom();
    this.buildHall();
    this.buildDawn();
    this.buildSilence();

    this.caption = this.add
      .text(GAME_WIDTH / 2, 64, '', {
        fontFamily: FONT_HAND,
        fontSize: '25px',
        color: isSilence ? '#1e2533' : '#5a3a22',
        align: 'center',
        wordWrap: { width: 800 },
        backgroundColor: isSilence ? '#eff3f8ee' : '#fff6e8e8',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5, 0)
      .setDepth(100)
      .setAlpha(0);
    this.add
      .text(
        GAME_WIDTH - 16,
        GAME_HEIGHT - 12,
        t('intro.skip'),
        textStyle(12, isSilence ? '#333c4d' : '#6b5540'),
      )
      .setOrigin(1, 1)
      .setDepth(100);

    this.show(0);
    this.input.on('pointerdown', () => this.next());
    this.input.keyboard?.on('keydown-SPACE', () => this.next());
    this.input.keyboard?.on('keydown-ENTER', () => this.next());
  }

  private beats(): Beat[] {
    if (this.kind === 'silence') {
      return [
        { key: 'ending.silence.1', shot: 'silence', sound: () => AudioManager.sfx('click') },
        { key: 'ending.silence.2', shot: 'silence', sound: () => AudioManager.sfx('seal') },
        { key: 'ending.silence.3', shot: 'silence' },
        { key: 'ending.silence.4', shot: 'silence', sound: () => AudioManager.sfx('meow') },
      ];
    }
    const knock = (vol: number, pitch: number) =>
      [0, 280, 560].forEach((d) =>
        this.time.delayedCall(d, () => AudioManager.drum('knock', vol, pitch)),
      );
    const list: Beat[] = [
      { key: 'ending.1', shot: 'room' },
      {
        key: 'ending.2',
        shot: 'room',
        sound: () =>
          [0, 450, 900].forEach((d) =>
            this.time.delayedCall(d, () => AudioManager.drum('broom', 0.25)),
          ),
      },
      {
        key: 'ending.3',
        shot: 'room',
        sound: () =>
          [0, 650].forEach((d) => this.time.delayedCall(d, () => AudioManager.drum('box', 0.35))),
      },
      {
        key: 'ending.4',
        shot: 'room',
        sound: () =>
          [0, 380, 760, 1080].forEach((d, i) =>
            this.time.delayedCall(d, () => AudioManager.drum('drop', 0.12, 1 + i * 0.12)),
          ),
      },
      {
        key: 'ending.5',
        shot: 'room',
        sound: () => {
          knock(0.35, 1);
          this.time.delayedCall(1400, () => knock(0.18, 0.7));
        },
      },
      { key: 'ending.6', shot: 'hall', sound: () => AudioManager.drum('snip', 0.25) },
      { key: 'ending.7', shot: 'hall', sound: () => AudioManager.drum('chime', 0.2) },
      { key: 'ending.8', shot: 'room', sound: () => AudioManager.sfx('click') },
    ];
    if (this.kind === 'fragile') {
      list.push({ key: 'ending.9.fragile', shot: 'hall', sound: () => AudioManager.sfx('step') });
    } else if (this.kind === 'breakfast') {
      list.push({ key: 'ending.9.breakfast', shot: 'hall', sound: () => AudioManager.sfx('door') });
    } else {
      list.push(
        { key: 'ending.9.sunflower', shot: 'dawn', sound: () => AudioManager.sfx('bloom') },
        { key: 'ending.10.sunflower', shot: 'dawn', sound: () => AudioManager.sfx('win') },
      );
    }
    list.push({ key: 'ending.11', shot: 'dawn', sound: () => AudioManager.sfx('meow') });
    return list;
  }

  private paint(): void {
    paintSong(this);
    paintTexture(this, 'end-room', GAME_WIDTH, GAME_HEIGHT, (ctx, w, h) => {
      const rng = new Rng('cuarto-manana');
      ctx.fillStyle = '#f6e2c4';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#c8905a';
      ctx.fillRect(0, 410, w, h - 410);
      ctx.fillStyle = '#b07a48';
      for (let x = 0; x < w; x += 90) ctx.fillRect(x, 410, 2, h - 410);
      const g = ctx.createLinearGradient(0, 70, 0, 280);
      g.addColorStop(0, '#9ac8f0');
      g.addColorStop(1, '#ffe0b0');
      ctx.fillStyle = g;
      ctx.fillRect(90, 70, 220, 210);
      ctx.fillStyle = '#fff6e8';
      ctx.fillRect(84, 64, 232, 8);
      ctx.fillRect(84, 278, 232, 8);
      ctx.fillRect(196, 70, 8, 210);
      ctx.fillRect(84, 64, 8, 222);
      ctx.fillRect(308, 64, 8, 222);
      ctx.fillStyle = 'rgba(255,230,160,0.35)';
      ctx.beginPath();
      ctx.moveTo(92, 280);
      ctx.lineTo(310, 280);
      ctx.lineTo(560, 540);
      ctx.lineTo(260, 540);
      ctx.fill();
      ctx.fillStyle = '#b8864a';
      ctx.fillRect(760, 330, 110, 80);
      ctx.fillRect(790, 270, 80, 60);
      ctx.fillStyle = '#d6aa62';
      ctx.fillRect(810, 330, 10, 80);
      ctx.fillRect(826, 270, 8, 60);
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(560, 330, 110, 80);
      ctx.fillStyle = '#6a4228';
      ctx.fillRect(560, 322, 110, 10);
      grain(ctx, w, h, rng, 0.8, 0.5);
    });
    paintTexture(this, 'end-hall', GAME_WIDTH, GAME_HEIGHT, (ctx, w, h) => {
      const rng = new Rng('pasillo-4');
      ctx.fillStyle = '#e8d8c0';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#d0b898';
      ctx.fillRect(0, 300, w, 12);
      for (let y = 430; y < h; y += 30) {
        for (let x = 0; x < w; x += 30) {
          ctx.fillStyle =
            (Math.floor(x / 30) + Math.floor(y / 30)) % 2 === 0 ? '#d07a50' : '#efe0c0';
          ctx.fillRect(x, y, 30, 30);
        }
      }
      ctx.fillStyle = '#4a8a7a';
      ctx.fillRect(560, 150, 150, 280);
      ctx.fillStyle = '#3a6a5c';
      ctx.fillRect(575, 170, 120, 100);
      ctx.fillRect(575, 290, 120, 120);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(690, 290, 8, 8);
      ctx.fillStyle = '#5a3a22';
      ctx.font = 'bold 26px Georgia, serif';
      ctx.fillText('4B', 615, 140);
      for (const x of [460, 500, 760]) {
        ctx.fillStyle = '#c86a3a';
        ctx.fillRect(x, 396, 30, 34);
        ctx.fillStyle = '#5a9a4a';
        ctx.beginPath();
        ctx.ellipse(x + 15, 386, 20, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8303a';
        ctx.fillRect(x + 8, 376, 6, 6);
      }
      ctx.fillStyle = '#bfe0f0';
      ctx.fillRect(120, 110, 180, 150);
      ctx.fillStyle = '#e8d8c0';
      ctx.fillRect(206, 110, 8, 150);
      grain(ctx, w, h, rng, 0.8, 0.5);
    });
  }

  private buildRoom(): void {
    const L = this.layers.room;
    L.push(this.add.image(0, 0, 'end-room').setOrigin(0).setDepth(0));
    const bed = this.add
      .image(380, 430, 'bed-morning')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 1.4)
      .setDepth(2);
    L.push(bed);
    this.tweens.add({
      targets: bed,
      y: 432,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    const phones = this.add.graphics().setDepth(3);
    phones.lineStyle(6, 0x39324f, 1);
    phones.beginPath();
    phones.arc(590, 322, 18, Math.PI, 0);
    phones.strokePath();
    phones.fillStyle(0xff7a8a, 1).fillRect(568, 314, 10, 12).fillRect(602, 314, 10, 12);
    L.push(phones);
    L.push(this.add.image(640, 318, 'grabadora').setOrigin(0.5, 1).setScale(2.4).setDepth(3));
  }

  private buildHall(): void {
    const L = this.layers.hall;
    L.push(this.add.image(0, 0, 'end-hall').setOrigin(0).setDepth(0));
    const iris = this.add
      .sprite(470, 440, 'iris')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 1.3)
      .setDepth(4);
    iris.play('iris-idle');
    L.push(iris);
    const chuy = this.add
      .sprite(640, 440, 'chuy')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 1.3)
      .setDepth(4)
      .setAlpha(0);
    chuy.play('chuy-idle');
    chuy.setName('chuy');
    L.push(chuy);
    const can = this.add.image(680, 360, 'bote').setScale(2.6).setDepth(5).setAlpha(0);
    can.setName('can');
    L.push(can);
  }

  private buildDawn(): void {
    const L = this.layers.dawn;
    L.push(this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'song-dawn').setDepth(0));
    L.push(
      this.add
        .image(GAME_WIDTH / 2, BUILDING.ground + 4, 'song-skyline')
        .setOrigin(0.5, 1)
        .setDepth(1),
    );
    L.push(
      this.add
        .image(BUILDING.x - 20, 0, 'song-building')
        .setOrigin(0, 0)
        .setDepth(2),
    );
    L.push(
      this.add
        .rectangle(GAME_WIDTH / 2, BUILDING.ground + 35, GAME_WIDTH, 70, 0x3a2a4a)
        .setDepth(1),
    );
    const roofY = BUILDING.ground - BUILDING.floors * BUILDING.floorH - 4;
    if (this.kind === 'sunflower') {
      // Todo el elenco reunido arriba del edificio en el Final Verdadero
      const cast: [string, number][] = [
        ['elmer', BUILDING.x + 60],
        ['nadia', BUILDING.x + 95],
        ['chuy', BUILDING.x + 130],
        ['goyo', BUILDING.x + 165],
        ['renata', BUILDING.x + 200],
        ['iris', BUILDING.x + 235],
        ['paloma', BUILDING.x + 270],
        ['tomas', BUILDING.x + 305],
        ['mateo', BUILDING.x + 335],
        ['octavio', BUILDING.x + 365],
      ];
      cast.forEach(([who, x]) => {
        const s = this.add
          .sprite(x, roofY + 2, who)
          .setOrigin(0.5, 1)
          .setScale(1.8)
          .setDepth(4);
        s.play(`${who}-idle`);
        L.push(s);
      });
    }
    const cat = this.add
      .sprite(BUILDING.x + BUILDING.w - 30, roofY, 'morfeo')
      .setOrigin(0.5, 1)
      .setScale(2.4)
      .setTint(0xb8b8c8)
      .setDepth(5);
    cat.play('morfeo-idle');
    L.push(cat);
  }

  private buildSilence(): void {
    const L = this.layers.silence;
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0xd8dee9, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0xb0bac9, 1).fillRect(0, 390, GAME_WIDTH, GAME_HEIGHT - 390);
    // Cuñas de espuma anecoica sellando la ventana
    g.fillStyle(0x4c566a, 1).fillRect(100, 90, 210, 180);
    for (let x = 110; x < 300; x += 26) {
      g.fillStyle(0x3b4252, 1).fillTriangle(x, 90, x + 26, 90, x + 13, 270);
    }
    L.push(g);
    const bed = this.add
      .image(420, 415, 'bed')
      .setOrigin(0.5, 1)
      .setScale(PIXEL_SCALE * 1.5)
      .setDepth(2);
    L.push(bed);
  }

  private setShot(shot: Shot): void {
    if (this.shot === shot) return;
    const first = this.shot === undefined;
    this.shot = shot;
    const apply = () => {
      (Object.keys(this.layers) as Shot[]).forEach((k) =>
        this.layers[k].forEach((o) =>
          (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(k === shot),
        ),
      );
    };
    if (first) {
      apply();
      return;
    }
    this.busy = true;
    const rgb = this.kind === 'silence' ? [216, 222, 233] : [255, 243, 224];
    this.cameras.main.fadeOut(500, rgb[0], rgb[1], rgb[2]);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      apply();
      this.cameras.main.fadeIn(600, rgb[0], rgb[1], rgb[2]);
      this.busy = false;
    });
  }

  private show(i: number): void {
    const beat = this.beats()[i];
    const changing = this.shot !== undefined && this.shot !== beat.shot;
    this.setShot(beat.shot);
    this.busy = true;
    this.caption.setAlpha(0).setText(t(beat.key));
    this.time.delayedCall(changing ? 1150 : 150, () => {
      beat.sound?.();
      if (beat.key === 'ending.9.breakfast') this.chuyOpens();
      this.tweens.add({
        targets: this.caption,
        alpha: 1,
        duration: 600,
        onComplete: () => {
          this.busy = false;
        },
      });
    });
  }

  private chuyOpens(): void {
    const chuy = this.children.getByName('chuy') as Phaser.GameObjects.Sprite | null;
    const can = this.children.getByName('can') as Phaser.GameObjects.Image | null;
    if (chuy) this.tweens.add({ targets: chuy, alpha: 1, duration: 800 });
    if (can) this.tweens.add({ targets: can, alpha: 1, duration: 800, delay: 300 });
  }

  private next(): void {
    if (this.busy || this.finished) return;
    this.index++;
    if (this.index >= this.beats().length) {
      this.finale();
      return;
    }
    this.tweens.add({
      targets: this.caption,
      alpha: 0,
      duration: 250,
      onComplete: () => this.show(this.index),
    });
  }

  private finale(): void {
    this.finished = true;
    SaveManager.data.endingSeen = true;
    SaveManager.data.lastEnding = this.kind;
    SaveManager.save();
    this.tweens.add({ targets: this.caption, alpha: 0, duration: 500 });
    const isSilence = this.kind === 'silence';
    const veil = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        isSilence ? 0x1e2533 : 0xfff3e0,
        0,
      )
      .setDepth(90);
    this.tweens.add({ targets: veil, fillAlpha: 0.86, duration: 1400 });

    const titleKey = `ending.title.${this.kind}` as TextKey;
    const ink = isSilence ? '#eff3f8' : '#7a4a2a';
    const subInk = isSilence ? '#93c5fd' : '#b8742c';

    const items: Phaser.GameObjects.GameObject[] = [
      this.add.text(GAME_WIDTH / 2, 122, t(titleKey), titleStyle(24, ink)).setOrigin(0.5),
      this.add
        .text(
          GAME_WIDTH / 2,
          184,
          t('ending.stats', { n: SaveManager.fireflyCount(), total: SaveManager.fireflyTotal() }),
          textStyle(17, subInk),
        )
        .setOrigin(0.5),
      this.add
        .text(
          GAME_WIDTH / 2,
          216,
          t('ending.secrets', { n: SaveManager.secretCount(), d: SaveManager.insomniaCount() }),
          textStyle(15, subInk),
        )
        .setOrigin(0.5),
      this.add
        .text(
          GAME_WIDTH / 2,
          248,
          t('ending.exam', { n: SaveManager.data.examBest, s: SaveManager.data.songBest }),
          textStyle(14, subInk),
        )
        .setOrigin(0.5),
      this.add
        .text(GAME_WIDTH / 2, 304, isSilence ? t('ending.silence.note') : t('ending.continue'), {
          fontFamily: FONT_HAND,
          fontSize: '23px',
          color: isSilence ? '#5eead4' : '#9d7bff',
        })
        .setOrigin(0.5),
    ];
    items.forEach((o, i) => {
      const obj = o as Phaser.GameObjects.Text;
      obj.setDepth(95).setAlpha(0);
      this.tweens.add({ targets: obj, alpha: 1, delay: 700 + i * 350, duration: 700 });
    });
    this.time.delayedCall(2200, () => {
      if (isSilence) {
        makeTextButton(
          this,
          GAME_WIDTH / 2,
          376,
          t('ending.rewind'),
          () => {
            SaveManager.data.octavioChoice = null;
            SaveManager.save();
            fadeToScene(this, 'Hub');
          },
          18,
        ).setDepth(96);
      }
      makeTextButton(
        this,
        GAME_WIDTH / 2,
        isSilence ? 436 : 386,
        t('ending.menu'),
        () => fadeToScene(this, 'MainMenu'),
        20,
      ).setDepth(96);
    });
  }
}
