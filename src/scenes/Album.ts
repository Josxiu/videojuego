import Phaser from 'phaser';
import {
  ALL_DREAMS,
  DREAM_META,
  GAME_WIDTH,
  GAME_HEIGHT,
  FONT_DISPLAY,
  FONT_HAND,
  textStyle,
  titleStyle,
  type AllDreamId,
} from '../config';
import { t, type TextKey } from '../i18n';
import { applyWorldFX } from '../gfx/postfx';
import { SaveManager, FIREFLY_TOTALS } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { addMuteButton, fadeIn, fadeToScene, makeTextButton } from '../systems/ui';

/**
 * El Álbum del Entresueño: archivo de vecinos, recuerdos desbloqueados por
 * luciérnagas, secretos y selector directo de Modo Desvelo.
 */
export class Album extends Phaser.Scene {
  private selected: AllDreamId = 'exam';
  private detailItems: Phaser.GameObjects.GameObject[] = [];
  private tabButtons: { id: AllDreamId; bg: Phaser.GameObjects.Rectangle }[] = [];

  constructor() {
    super('Album');
  }

  create(data: { selected?: AllDreamId } = {}): void {
    this.selected = data.selected ?? 'exam';
    this.detailItems = [];
    this.tabButtons = [];
    this.cameras.main.setBackgroundColor(0x120f24);
    applyWorldFX(this, 'album');
    fadeIn(this, 450);

    this.add
      .text(GAME_WIDTH / 2, 28, t('album.title'), titleStyle(22, '#ffd166', { letterSpacing: 4 }))
      .setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 56, t('album.subtitle'), textStyle(13, '#b8a8e8')).setOrigin(0.5);

    // Columna izquierda: lista de los 10 vecinos
    ALL_DREAMS.forEach((id, i) => {
      const meta = DREAM_META[id];
      const y = 96 + i * 38;
      const done = SaveManager.data.completed[id];
      const ins = SaveManager.data.insomniaDone[id];
      const sec = SaveManager.data.secrets[id];
      const ff = SaveManager.data.fireflies[id];
      const tot = FIREFLY_TOTALS[id];

      const bg = this.add
        .rectangle(165, y, 290, 32, 0x1e183a, 0.9)
        .setStrokeStyle(1.5, id === this.selected ? 0xffd166 : 0x463a78, 0.9)
        .setInteractive({ useHandCursor: true });
      this.tabButtons.push({ id, bg });

      this.add
        .image(38, y, meta.item)
        .setScale(1.6)
        .setAlpha(done ? 1 : 0.28);
      this.add
        .text(60, y, `${meta.apt} · ${meta.owner}`, textStyle(13, done ? '#efe9ff' : '#7b6fa8'))
        .setOrigin(0, 0.5);
      const marks = `${ff}/${tot}${sec ? ' ★' : ''}${ins ? ' ☾' : ''}`;
      this.add
        .text(298, y, marks, textStyle(11, ff === tot ? '#ffd166' : '#9d8cd4'))
        .setOrigin(1, 0.5);

      bg.on('pointerdown', () => {
        AudioManager.sfx('click');
        this.selected = id;
        this.refreshTabs();
        this.renderDetail();
      });
    });

    // Marco derecho: detalle del vecino
    this.add.rectangle(625, 295, 580, 408, 0x1a1533, 0.92).setStrokeStyle(2, 0x564890, 0.8);

    makeTextButton(
      this,
      90,
      GAME_HEIGHT - 32,
      `← ${t('album.back')}`,
      () => fadeToScene(this, SaveManager.data.introSeen ? 'Hub' : 'MainMenu'),
      15,
    );
    addMuteButton(this);

    this.refreshTabs();
    this.renderDetail();
  }

  private refreshTabs(): void {
    for (const tab of this.tabButtons) {
      const active = tab.id === this.selected;
      tab.bg
        .setFillStyle(active ? 0x31265c : 0x1e183a, 0.95)
        .setStrokeStyle(active ? 2 : 1.5, active ? 0xffd166 : 0x463a78, 0.9);
    }
  }

  private renderDetail(): void {
    this.detailItems.forEach((o) => o.destroy());
    this.detailItems = [];
    const push = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detailItems.push(o);
      return o;
    };

    const id = this.selected;
    const meta = DREAM_META[id];
    const data = SaveManager.data;
    const done = data.completed[id];
    const ff = data.fireflies[id];
    const tot = FIREFLY_TOTALS[id];
    const sec = data.secrets[id];
    const ins = data.insomniaDone[id];

    const portraitKey =
      id === 'song'
        ? 'portrait-iris'
        : id === 'shadow'
          ? 'portrait-goyo'
          : id === 'embroidery'
            ? 'portrait-renata'
            : id === 'glass'
              ? 'portrait-paloma'
              : id === 'woodcut'
                ? 'portrait-mateo'
                : id === 'chamber3d'
                  ? 'portrait-octavio'
                  : id === 'exam'
                    ? 'elmer'
                    : id === 'fall'
                      ? 'nadia'
                      : id === 'forest'
                        ? 'chuy'
                        : 'tomas';

    push(
      this.add
        .image(392, 146, portraitKey, '0')
        .setScale(portraitKey.startsWith('portrait') ? 3 : 3.4)
        .setAlpha(done ? 1 : 0.35),
    );
    push(
      this.add
        .image(862, 146, meta.item)
        .setScale(3)
        .setAlpha(done ? 1 : 0.25),
    );
    push(
      this.add.text(
        452,
        118,
        t(`album.${id}.title` as TextKey),
        titleStyle(16, '#ffd166', { wordWrap: { width: 370 } }),
      ),
    );
    push(
      this.add.text(
        452,
        156,
        `Luciérnagas: ${ff} / ${tot}`,
        textStyle(14, ff === tot ? '#86f7ff' : '#cfc4ff'),
      ),
    );

    if (!done) {
      push(
        this.add
          .text(625, 290, t('album.locked'), {
            fontFamily: FONT_HAND,
            fontSize: '24px',
            color: '#9b8ec8',
            align: 'center',
            wordWrap: { width: 480 },
          })
          .setOrigin(0.5),
      );
      return;
    }

    const mem1 = ff >= 3 ? t(`album.${id}.mem1` as TextKey) : `🔒 ${t('album.ffLock')}`;
    const mem2 = ff >= 6 ? t(`album.${id}.mem2` as TextKey) : `🔒 ${t('album.ffLock2')}`;

    push(
      this.add.text(362, 208, mem1, {
        fontFamily: FONT_HAND,
        fontSize: '20px',
        color: ff >= 3 ? '#f4efff' : '#7a6fa8',
        wordWrap: { width: 520 },
      }),
    );
    push(
      this.add.text(362, 292, mem2, {
        fontFamily: FONT_HAND,
        fontSize: '20px',
        color: ff >= 6 ? '#ffe8b8' : '#7a6fa8',
        wordWrap: { width: 520 },
      }),
    );

    push(
      this.add.text(
        362,
        384,
        `${t(sec ? 'album.secretYes' : 'album.secretNo')}   ·   ${t(ins ? 'album.desveloYes' : 'album.desveloNo')}`,
        textStyle(13, sec || ins ? '#ffd166' : '#8d80b8'),
      ),
    );

    push(
      makeTextButton(
        this,
        495,
        452,
        t('album.playNormal'),
        () => fadeToScene(this, meta.scene, { insomnia: false }),
        15,
      ),
    );
    push(
      makeTextButton(
        this,
        755,
        452,
        t('album.playDesvelo'),
        () => fadeToScene(this, meta.scene, { insomnia: true }),
        15,
      ).setStyle({ backgroundColor: '#45182d', color: '#ff9ab0' }),
    );
    push(
      this.add.text(890, 490, '', { fontFamily: FONT_DISPLAY, fontSize: '10px' }).setVisible(false),
    );
  }
}
