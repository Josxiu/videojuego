import Phaser from 'phaser';
import { GAME_WIDTH, DEPTH_HUD, FONT_HAND, FONT_DISPLAY } from '../../config';
import { t } from '../../i18n';
import { applyWorldFX, type DreamFXPipeline } from '../../gfx/postfx';
import { CHARACTER_TEXTURES, CHARACTER_ANIMS } from '../../gfx/sprites';
import { ensureStyle, addStyled, styledKey } from '../../gfx/stylize';
import { SaveManager } from '../../systems/SaveManager';
import { AudioManager } from '../../systems/AudioManager';
import { InputManager } from '../../systems/InputManager';
import { DialogueBox } from '../../systems/DialogueBox';
import {
  fadeIn,
  fadeToScene,
  showTitleCard,
  addPauseOverlay,
  showReturnCard,
  showActBanner,
  showSecretBanner,
} from '../../systems/ui';
import { burst } from '../../systems/Juice';
import { debug } from '../../systems/debug';
import { buildWoodcutTextures } from './art';

const STYLE = 'woodcut';
const COLS = 15;
const ROWS = 9;
const CELL = 48;
const OX = 120;
const OY = 60;

type TileKind = '.' | '#' | 'C' | 'B' | 'S' | 'M' | 'I' | 'X';

interface CellTile {
  col: number;
  row: number;
  kind: TileKind;
  taken?: boolean;
  sprite?: Phaser.GameObjects.Image;
}

interface ExLibris {
  index: number;
  stage: 1 | 2;
  col: number;
  row: number;
  sprite: Phaser.GameObjects.Image;
  taken: boolean;
}

const ACT1_MAP = [
  'BBBBBBBBBBBBBBB',
  'B.M#...#....M.B',
  'B..C.S.#.C###.B',
  'B.###..#....#.B',
  'X..#I..C..#M#.B',
  'B#.#.###..#.#.B',
  'B..C..I...C...B',
  'B.....###.....B',
  'BBBBBBBBBBBBBBB',
];

const ACT2_MAP = [
  'BBBBBBBBBBBBBBB',
  'B.M..#...#..M.B',
  'B.##.C...C.##.B',
  'B....#.S.#....B',
  'B.#..C.I.C..#.B',
  'B.#..#...#..#.B',
  'B....C...C....B',
  'B..M.......#..B',
  'BBBBBBBBBBBBBBB',
];

const ACT3_MAP = [
  '###############',
  '###############',
  '####BBBBBBB####',
  '####B.....B####',
  '####B.....B####',
  '####B.....B####',
  '####BBBBBBB####',
  '###############',
  '###############',
];

/**
 * Sueño 8 (3A · Mateo Ibáñez): Xilografía / Grabado en Linóleo.
 *
 * - Acto I: recorrer el plano del 3A recogiendo 3 matrices, deslizando planchas,
 *   tallando muros finos con gubia y hallando la mirilla secreta de la izquierda.
 * - Acto II: la prensa estampa EN ESPEJO (tinta blanca sobre negro, controles
 *   invertidos y un Sello de Lacre Rojo que persigue las huellas y vuelve a
 *   entintar las paredes).
 * - Acto III: un cuarto hermético sin salida adentro; solo usando la última carga
 *   de gubia sobre el MARCO EXTERIOR se rompe la lámina hacia el papel en blanco.
 */
export class DreamWoodcut extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private fx?: DreamFXPipeline;

  private darkPaper!: Phaser.GameObjects.Image;
  private iris!: Phaser.GameObjects.Sprite;
  private sealSprite?: Phaser.GameObjects.Image;
  private peepSprite?: Phaser.GameObjects.Image;

  private ffText!: Phaser.GameObjects.Text;
  private gougeText!: Phaser.GameObjects.Text;
  private actText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;

  private act: 1 | 2 | 3 = 1;
  private insomnia = false;
  private started = false;
  private ending = false;
  private flipped = false;

  private grid: CellTile[][] = [];
  private fireflies: ExLibris[] = [];
  private pathQueue: [number, number][] = [];

  private playerCol = 2;
  private playerRow = 4;
  private facingCol = 1;
  private facingRow = 0;
  private sealCol = 12;
  private sealRow = 2;

  private gouge = 4;
  private maxGouge = 4;
  private matricesLeft = 3;
  private collected = 0;
  private secretDone = false;

  private stepCooldown = 0;
  private sealCooldown = 0;
  private pressTimer = 0;

  constructor() {
    super('DreamWoodcut');
  }

  create(data: { insomnia?: boolean } = {}): void {
    this.resetState(Boolean(data.insomnia) || debug.flag('insomnia'));
    this.fx = applyWorldFX(this, 'woodcut');
    this.cameras.main.setBackgroundColor(0xf2ead7);
    fadeIn(this, 650);
    AudioManager.playMusic('woodcut', 0);

    buildWoodcutTextures(this);
    ensureStyle(
      this,
      STYLE,
      [
        ...CHARACTER_TEXTURES,
        'mateo',
        'rodillo',
        'portrait-mateo',
        'portrait-iris',
        'portrait-morfeo',
      ],
      [...CHARACTER_ANIMS, 'mateo-idle'],
    );

    this.add.image(0, 0, 'wc-paper-light').setOrigin(0).setDepth(0);
    this.darkPaper = this.add.image(0, 0, 'wc-paper-dark').setOrigin(0).setDepth(1).setAlpha(0);

    this.iris = addStyled(this, 0, 0, 'iris', STYLE, { feet: true, scale: 1.05 }).setDepth(28);
    this.iris.play(styledKey('iris-front-idle', STYLE));

    this.buildFireflies();
    this.buildHud();
    this.dialogue = new DialogueBox(this, 0x262a3d, STYLE);
    this.inp = new InputManager(this);
    this.bindPointer();

    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'), {
      onRestart: () => this.scene.restart({ insomnia: this.insomnia }),
    });

    const at = debug.flag('skip') ? debug.num('at', 0) : 0;
    this.setupStage(at >= 3 ? 3 : at >= 2 ? 2 : 1);

    if (debug.flag('skip')) {
      this.started = true;
      return;
    }

    showTitleCard(
      this,
      t('woodcut.title'),
      t('woodcut.name'),
      () => {
        this.dialogue.say(
          [
            { who: null, text: t('woodcut.intro.1') },
            { who: null, text: t('woodcut.intro.2') },
            { who: 'morfeo', text: t('woodcut.intro.3') },
            { who: 'morfeo', text: t('woodcut.intro.4'), mood: 'smug' },
          ],
          () => {
            showActBanner(this, t('woodcut.act1'), '#b8332a');
            this.showToast(t('woodcut.hint'), 4200);
            this.started = true;
          },
        );
      },
      STYLE,
      this.insomnia ? t('woodcut.insomnia') : undefined,
    );
  }

  private resetState(insomnia: boolean): void {
    this.act = 1;
    this.insomnia = insomnia;
    this.maxGouge = insomnia ? 2 : 4;
    this.gouge = this.maxGouge;
    this.started = false;
    this.ending = false;
    this.flipped = false;
    this.grid = [];
    this.fireflies = [];
    this.pathQueue = [];
    this.collected = 0;
    this.secretDone = false;
    this.sealSprite = undefined;
    this.peepSprite = undefined;
    this.pressTimer = 18;
  }

  // ── HUD y Luciérnagas ──

  private buildHud(): void {
    const fix = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ) => o.setScrollFactor(0).setDepth(DEPTH_HUD);

    fix(this.add.image(34, 30, 'wc-ff').setScale(0.95));
    this.ffText = fix(
      this.add
        .text(56, 30, `${SaveManager.data.fireflies.woodcut}/6`, {
          fontFamily: FONT_HAND,
          fontSize: '21px',
          color: '#181924',
          stroke: '#f7f0e0',
          strokeThickness: 4,
        })
        .setOrigin(0, 0.5),
    );

    this.gougeText = fix(
      this.add
        .text(142, 30, '', {
          fontFamily: FONT_DISPLAY,
          fontSize: '12px',
          color: '#b8332a',
          stroke: '#f7f0e0',
          strokeThickness: 4,
        })
        .setOrigin(0, 0.5),
    );

    this.actText = fix(
      this.add
        .text(GAME_WIDTH - 92, 30, this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'), {
          fontFamily: FONT_HAND,
          fontSize: '19px',
          color: this.insomnia ? '#b8332a' : '#181924',
          stroke: '#f7f0e0',
          strokeThickness: 4,
        })
        .setOrigin(1, 0.5),
    );

    this.toast = fix(
      this.add
        .text(GAME_WIDTH / 2, 504, '', {
          fontFamily: FONT_HAND,
          fontSize: '18px',
          color: '#f7f0e0',
          backgroundColor: '#181924ee',
          padding: { x: 14, y: 4 },
          align: 'center',
          wordWrap: { width: 740 },
        })
        .setOrigin(0.5)
        .setVisible(false),
    );
    this.syncGougeHud();
  }

  private syncGougeHud(): void {
    this.gougeText.setText(`✦ GUBIA: ${this.gouge}/${this.maxGouge}`);
  }

  private showToast(text: string, ms = 2600): void {
    this.toast.setText(text).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 450 });
  }

  private buildFireflies(): void {
    const pts: [1 | 2, number, number][] = [
      [1, 6, 1],
      [1, 1, 6],
      [1, 13, 6],
      [2, 1, 3],
      [2, 13, 3],
      [2, 1, 7],
    ];
    pts.forEach(([stage, col, row], index) => {
      const got = SaveManager.hasFirefly('woodcut', index);
      const { x, y } = this.screenOf(col, row);
      const sprite = this.add
        .image(x, y, 'wc-ff')
        .setDepth(22)
        .setAlpha(got ? 0.35 : 0.95)
        .setVisible(stage === 1);
      this.fireflies.push({ index, stage, col, row, sprite, taken: false });
    });
  }

  // ── Conversión Coordenadas / Mapa Espejo ──

  private visCol(col: number): number {
    return this.flipped ? COLS - 1 - col : col;
  }

  private screenOf(col: number, row: number): { x: number; y: number } {
    const vc = this.visCol(col);
    return { x: OX + vc * CELL + CELL / 2, y: OY + row * CELL + CELL / 2 };
  }

  private gridAtScreen(px: number, py: number): { col: number; row: number } | null {
    const vc = Math.floor((px - OX) / CELL);
    const row = Math.floor((py - OY) / CELL);
    if (vc < 0 || vc >= COLS || row < 0 || row >= ROWS) return null;
    return { col: this.visCol(vc), row };
  }

  private clearStage(): void {
    for (const row of this.grid) {
      for (const cell of row) cell.sprite?.destroy();
    }
    this.grid = [];
    this.pathQueue = [];
    this.sealSprite?.destroy();
    this.sealSprite = undefined;
    this.peepSprite?.destroy();
    this.peepSprite = undefined;
  }

  private setupStage(stage: 1 | 2 | 3): void {
    this.clearStage();
    this.act = stage;
    this.flipped = stage === 2;
    this.darkPaper.setAlpha(stage === 2 ? 1 : 0);

    const raw = stage === 1 ? ACT1_MAP : stage === 2 ? ACT2_MAP : ACT3_MAP;
    this.matricesLeft = 0;

    for (let r = 0; r < ROWS; r++) {
      const rowTiles: CellTile[] = [];
      for (let c = 0; c < COLS; c++) {
        const ch = raw[r][c] as TileKind;
        if (ch === 'M') this.matricesLeft++;
        const tile: CellTile = { col: c, row: r, kind: ch };
        rowTiles.push(tile);
      }
      this.grid.push(rowTiles);
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.spawnTileSprite(this.grid[r][c]);
      }
    }

    for (const ff of this.fireflies) {
      if (!ff.taken) {
        const { x, y } = this.screenOf(ff.col, ff.row);
        ff.sprite.setPosition(x, y).setVisible(ff.stage === stage);
      }
    }

    if (stage === 1) {
      this.actText
        .setText(this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'))
        .setColor('#181924');
      this.playerCol = 2;
      this.playerRow = 4;
      this.gouge = this.maxGouge;
      AudioManager.setMusicLevel(0);
    } else if (stage === 2) {
      this.actText
        .setText(this.insomnia ? `${t('ui.act2')} · ☾` : t('ui.act2'))
        .setColor('#b8332a');
      this.playerCol = 7;
      this.playerRow = 6;
      this.sealCol = 12;
      this.sealRow = 2;
      this.gouge = this.maxGouge;
      this.pressTimer = 18;
      const sp = this.screenOf(this.sealCol, this.sealRow);
      this.sealSprite = this.add.image(sp.x, sp.y, 'wc-seal').setDepth(27);
      AudioManager.sfx('press');
      AudioManager.setMusicLevel(1);
      this.cameras.main.shake(260, 0.01);
      showActBanner(this, t('woodcut.act2'), '#b8332a');
      this.showToast(t('woodcut.twist'), 5200);
    } else {
      this.actText
        .setText(this.insomnia ? `${t('ui.act3')} · ☾` : t('ui.act3'))
        .setColor('#b8332a');
      this.playerCol = 7;
      this.playerRow = 4;
      this.gouge = 1;
      AudioManager.setMusicLevel(2);
      showActBanner(this, t('woodcut.act3'), '#b8332a');
      this.showToast(t('woodcut.ruleBreakHint'), 6000);
    }

    this.syncGougeHud();
    this.syncIrisScreen(true);
  }

  private texForKind(kind: TileKind): string | null {
    if (kind === '#') return this.flipped ? 'wc-block-inv' : 'wc-block-solid';
    if (kind === 'C') return this.flipped ? 'wc-block-carve-inv' : 'wc-block-carve';
    if (kind === 'B')
      return this.act === 3 ? 'wc-block-border' : this.flipped ? 'wc-block-inv' : 'wc-block-solid';
    if (kind === 'X') return 'wc-block-carve';
    if (kind === 'S') return 'wc-block-slide';
    if (kind === 'M') return 'wc-matrix';
    if (kind === 'I') return 'wc-inkpot';
    return null;
  }

  private spawnTileSprite(tile: CellTile): void {
    tile.sprite?.destroy();
    const key = this.texForKind(tile.kind);
    if (!key) {
      tile.sprite = undefined;
      return;
    }
    const { x, y } = this.screenOf(tile.col, tile.row);
    tile.sprite = this.add.image(x, y, key).setDepth(14);
  }

  private refreshBoardPositions(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.spawnTileSprite(this.grid[r][c]);
      }
    }
    for (const ff of this.fireflies) {
      if (!ff.taken) {
        const { x, y } = this.screenOf(ff.col, ff.row);
        ff.sprite.setPosition(x, y);
      }
    }
    if (this.sealSprite) {
      const sp = this.screenOf(this.sealCol, this.sealRow);
      this.sealSprite.setPosition(sp.x, sp.y);
    }
    this.syncIrisScreen(true);
  }

  private syncIrisScreen(instant = false): void {
    const { x, y } = this.screenOf(this.playerCol, this.playerRow);
    const ty = y + 18;
    if (instant) {
      this.iris.setPosition(x, ty);
      return;
    }
    this.tweens.add({ targets: this.iris, x, y: ty, duration: 110, ease: 'Sine.out' });
  }

  // ── Controles 1 Dedo (BFS + Talla Directa) y PC ──

  private bindPointer(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.started || this.pause.paused() || this.dialogue.active || this.ending) return;
      const cell = this.gridAtScreen(p.x, p.y);
      if (!cell) return;
      const tile = this.grid[cell.row]?.[cell.col];
      if (!tile) return;

      const dist = Math.abs(cell.col - this.playerCol) + Math.abs(cell.row - this.playerRow);
      if (
        dist === 1 &&
        (tile.kind === 'C' ||
          tile.kind === 'S' ||
          tile.kind === 'X' ||
          (tile.kind === 'B' && this.act === 3))
      ) {
        this.facingCol = cell.col - this.playerCol;
        this.facingRow = cell.row - this.playerRow;
        this.interactTile(cell.col, cell.row);
        return;
      }

      if (tile.kind === '.' || tile.kind === 'M' || tile.kind === 'I') {
        this.pathQueue = this.findPath(this.playerCol, this.playerRow, cell.col, cell.row);
      }
    });
  }

  private findPath(sc: number, sr: number, tc: number, tr: number): [number, number][] {
    const seen = new Set<string>([`${sc},${sr}`]);
    const prev = new Map<string, [number, number]>();
    const q: [number, number][] = [[sc, sr]];
    const dirs: [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    while (q.length > 0) {
      const [c, r] = q.shift()!;
      if (c === tc && r === tr) {
        const out: [number, number][] = [];
        let cur: [number, number] = [tc, tr];
        while (cur[0] !== sc || cur[1] !== sr) {
          out.unshift(cur);
          cur = prev.get(`${cur[0]},${cur[1]}`)!;
        }
        return out;
      }
      for (const [dc, dr] of dirs) {
        const nc = c + dc;
        const nr = r + dr;
        const k = `${nc},${nr}`;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || seen.has(k)) continue;
        const tile = this.grid[nr][nc];
        if (tile.kind === '.' || tile.kind === 'M' || tile.kind === 'I') {
          seen.add(k);
          prev.set(k, [c, r]);
          q.push([nc, nr]);
        }
      }
    }
    return [];
  }

  // ── Bucle Principal ──

  update(_time: number, deltaMs: number): void {
    this.inp.update();
    const dt = Math.min(deltaMs / 1000, 0.05);
    if (!this.started || this.pause.paused() || this.dialogue.active || this.ending) return;

    this.stepCooldown = Math.max(0, this.stepCooldown - dt);
    this.handleInputStep();
    this.updateSealAndPress(dt);
  }

  private handleInputStep(): void {
    if (this.inp.justDown('interact')) {
      this.interactTile(this.playerCol + this.facingCol, this.playerRow + this.facingRow);
      return;
    }

    if (this.stepCooldown > 0) return;

    let dc = 0;
    let dr = 0;
    const inv = this.flipped ? -1 : 1;
    if (this.inp.isDown('left')) dc = -1 * inv;
    else if (this.inp.isDown('right')) dc = 1 * inv;
    else if (this.inp.isDown('up')) dr = -1;
    else if (this.inp.isDown('down')) dr = 1;

    if (dc !== 0 || dr !== 0) {
      this.pathQueue = [];
      this.facingCol = dc;
      this.facingRow = dr;
      this.tryStep(dc, dr);
      this.stepCooldown = 0.16;
      return;
    }

    if (this.pathQueue.length > 0) {
      const [nc, nr] = this.pathQueue.shift()!;
      this.facingCol = Math.sign(nc - this.playerCol);
      this.facingRow = Math.sign(nr - this.playerRow);
      this.tryStep(this.facingCol, this.facingRow);
      this.stepCooldown = 0.14;
    }
  }

  private tryStep(dc: number, dr: number): void {
    const nc = this.playerCol + dc;
    const nr = this.playerRow + dr;
    const tile = this.grid[nr]?.[nc];
    if (!tile) return;

    if (
      tile.kind === 'C' ||
      tile.kind === 'X' ||
      tile.kind === 'S' ||
      (tile.kind === 'B' && this.act === 3)
    ) {
      this.interactTile(nc, nr);
      return;
    }
    if (tile.kind !== '.' && tile.kind !== 'M' && tile.kind !== 'I') return;

    this.playerCol = nc;
    this.playerRow = nr;
    const dir = dc * (this.flipped ? -1 : 1);
    if (dir !== 0) this.iris.setFlipX(dir < 0);
    AudioManager.sfx('step');
    this.syncIrisScreen();
    this.checkCellEvents(tile);
  }

  private interactTile(tc: number, tr: number): void {
    const tile = this.grid[tr]?.[tc];
    if (!tile) return;

    if (tile.kind === 'S') {
      const dc = Math.sign(tc - this.playerCol);
      const dr = Math.sign(tr - this.playerRow);
      const sc = tc + dc;
      const sr = tr + dr;
      const dest = this.grid[sr]?.[sc];
      if (dest && dest.kind === '.') {
        tile.kind = '.';
        dest.kind = 'S';
        this.spawnTileSprite(tile);
        this.spawnTileSprite(dest);
        AudioManager.sfx('slide');
        const sp = this.screenOf(sc, sr);
        burst(this, sp.x, sp.y, 0xb8332a, 10, 26);
      }
      return;
    }

    const carvable =
      tile.kind === 'C' || tile.kind === 'X' || (this.act === 3 && tile.kind === 'B');
    if (!carvable) return;

    if (this.gouge <= 0) {
      AudioManager.sfx('wrong');
      this.showToast(t('woodcut.noChisel'), 2000);
      return;
    }

    this.gouge--;
    this.syncGougeHud();
    AudioManager.sfx('gouge');
    const sp = this.screenOf(tc, tr);
    burst(this, sp.x, sp.y, this.flipped ? 0x181924 : 0xf2ead7, 14, 34);

    if (tile.kind === 'X' && !this.secretDone) {
      tile.kind = '.';
      this.spawnTileSprite(tile);
      this.secretDone = true;
      SaveManager.markSecret('woodcut');
      AudioManager.sfx('secret');
      showSecretBanner(this, t('woodcut.secret'));
      this.peepSprite = this.add.image(sp.x, sp.y, 'wc-peephole').setDepth(16);
      return;
    }

    if (tile.kind === 'B' && this.act === 3) {
      tile.kind = '.';
      this.spawnTileSprite(tile);
      this.triggerRuleBreakWin(tc, tr);
      return;
    }

    tile.kind = '.';
    this.spawnTileSprite(tile);
  }

  private checkCellEvents(tile: CellTile): void {
    const sp = this.screenOf(tile.col, tile.row);

    for (const ff of this.fireflies) {
      if (!ff.taken && ff.stage === this.act && ff.col === tile.col && ff.row === tile.row) {
        ff.taken = true;
        this.collected++;
        SaveManager.collectFirefly('woodcut', ff.index);
        this.ffText.setText(`${SaveManager.data.fireflies.woodcut}/6`);
        AudioManager.sfx('collect');
        burst(this, sp.x, sp.y, 0xdba038, 14, 36);
        this.tweens.add({ targets: ff.sprite, scale: 2, alpha: 0, duration: 400 });
      }
    }

    if (tile.kind === 'I') {
      tile.kind = '.';
      this.spawnTileSprite(tile);
      this.gouge = Math.min(this.maxGouge, this.gouge + 2);
      this.syncGougeHud();
      AudioManager.sfx('fill');
      burst(this, sp.x, sp.y, 0x181924, 10, 26);
    }

    if (tile.kind === 'M') {
      tile.kind = '.';
      this.spawnTileSprite(tile);
      this.matricesLeft--;
      AudioManager.sfx('collect');
      burst(this, sp.x, sp.y, 0xb8332a, 16, 40);
      if (this.matricesLeft <= 0) {
        this.time.delayedCall(600, () => {
          if (this.act === 1) this.setupStage(2);
          else if (this.act === 2) this.setupStage(3);
        });
      }
    }
  }

  private updateSealAndPress(dt: number): void {
    if (this.act !== 2 || !this.sealSprite) return;

    if (this.insomnia) {
      this.pressTimer -= dt;
      if (this.pressTimer <= 0) {
        this.pressTimer = 18;
        this.flipped = !this.flipped;
        this.darkPaper.setAlpha(this.flipped ? 1 : 0);
        this.actText.setColor(this.flipped ? '#b8332a' : '#181924');
        AudioManager.sfx('press');
        this.cameras.main.shake(180, 0.008);
        this.refreshBoardPositions();
      }
    }

    this.sealCooldown -= dt;
    if (this.sealCooldown > 0) return;
    this.sealCooldown = this.insomnia ? 0.56 : 0.78;

    // El Sello Rojo avanza por pasillos tallados persiguiendo a Iris
    const dirs: [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let best: [number, number] | null = null;
    let bestDist = Infinity;
    for (const [dc, dr] of dirs) {
      const nc = this.sealCol + dc;
      const nr = this.sealRow + dr;
      const tile = this.grid[nr]?.[nc];
      if (!tile || (tile.kind !== '.' && tile.kind !== 'M' && tile.kind !== 'I')) continue;
      const d = Math.abs(nc - this.playerCol) + Math.abs(nr - this.playerRow);
      if (d < bestDist) {
        bestDist = d;
        best = [nc, nr];
      }
    }
    if (best) {
      this.sealCol = best[0];
      this.sealRow = best[1];
      const sp = this.screenOf(this.sealCol, this.sealRow);
      this.tweens.add({ targets: this.sealSprite, x: sp.x, y: sp.y, duration: 180 });
      AudioManager.sfx('seal');
    }

    if (this.sealCol === this.playerCol && this.sealRow === this.playerRow) {
      AudioManager.sfx('press');
      this.showToast(t('woodcut.pressHit'), 2200);
      this.playerCol = 7;
      this.playerRow = 6;
      this.sealCol = 12;
      this.sealRow = 2;
      this.pathQueue = [];
      this.refreshBoardPositions();
    }
  }

  // ── Acto III Ruptura de Regla y Final ──

  private triggerRuleBreakWin(holeCol: number, holeRow: number): void {
    if (this.ending) return;
    this.ending = true;
    this.pathQueue = [];

    AudioManager.sfx('gouge');
    AudioManager.sfx('door');
    AudioManager.setMusicLevel(3);

    // Tallar el margen exterior abre el mapa hacia el papel en blanco exterior y revela a Mateo
    this.playerCol = holeCol;
    this.playerRow = holeRow;
    this.syncIrisScreen();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sp = this.grid[r][c]?.sprite;
        if (sp && (this.grid[r][c].kind === '#' || this.grid[r][c].kind === 'B')) {
          this.tweens.add({ targets: sp, alpha: 0.14, duration: 1100 });
        }
      }
    }
    this.fx?.blendTo(this, { tint: 0xffe4b8, tintAmount: 0.05, contrast: 1.02 }, 1200);

    const hp = this.screenOf(holeCol, holeRow);
    burst(this, hp.x, hp.y, 0xdba038, 28, 50);

    const mateo = addStyled(this, OX + 5 * CELL, 410, 'mateo', STYLE, {
      feet: true,
      scale: 1.25,
    })
      .setDepth(30)
      .setAlpha(0);
    mateo.play(styledKey('mateo-idle', STYLE));
    this.tweens.add({ targets: mateo, alpha: 1, duration: 1000 });
    this.tweens.add({
      targets: this.iris,
      x: OX + 9.2 * CELL,
      y: 410,
      duration: 800,
      ease: 'Sine.out',
    });

    this.dialogue.say(
      [
        { who: 'mateo', text: t('woodcut.mateo.1') },
        { who: 'iris', text: t('woodcut.mateo.2') },
        { who: 'mateo', text: t('woodcut.mateo.3') },
        { who: 'iris', text: t('woodcut.mateo.4') },
        { who: 'mateo', text: t('woodcut.mateo.5') },
        { who: 'mateo', text: t('woodcut.mateo.6') },
      ],
      () => this.win(),
    );
  }

  private win(): void {
    AudioManager.sfx('win');
    AudioManager.sfx('key');
    showReturnCard(this, STYLE, t('woodcut.keyGet'), t('woodcut.fragment'), 'rodillo');
    SaveManager.markCompleted('woodcut', this.insomnia);
    SaveManager.recordFireflies('woodcut', this.collected);
    this.time.delayedCall(4400, () => fadeToScene(this, 'Hub', undefined, 900));
  }
}
