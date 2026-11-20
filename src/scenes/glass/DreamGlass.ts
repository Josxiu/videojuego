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
import { buildGlassTextures } from './art';

const STYLE = 'stainedglass';
const COLS = 9;
const ROWS = 5;
const OX = 160;
const OY = 110;
const CELL = 80;

/** 8 direcciones en incrementos de 45° (0 = E, 1 = SE, 2 = S, 3 = SW, 4 = W, 5 = NW, 6 = N, 7 = NE). */
const DIRS: [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/** Máscara RGB de luz aditiva: 1=Rojo, 2=Esmeralda, 4=Azul, 6=Cian, 7=Blanco puro. */
function maskColor(mask: number): number {
  switch (mask & 7) {
    case 1:
      return 0xff4d6d;
    case 2:
      return 0x6be675;
    case 3:
      return 0xffc857;
    case 4:
      return 0x4cc9f0;
    case 5:
      return 0xc77dff;
    case 6:
      return 0x56f0d8;
    default:
      return 0xffffff;
  }
}

function posOf(col: number, row: number): { x: number; y: number } {
  return { x: OX + col * CELL, y: OY + row * CELL };
}

type CellKind = 'emitter' | 'mirror' | 'splitter' | 'filter' | 'rosette' | 'cracked' | 'tiffany';

interface OpticalPiece {
  id: number;
  kind: CellKind;
  col: number;
  row: number;
  dir: number;
  fixedColor: number;
  reqMask: number;
  rotatable: boolean;
  frozen: boolean;
  hitMask: number;
  litTimer: number;
  darkTimer: number;
  sprite?: Phaser.GameObjects.Image;
  frozenSprite?: Phaser.GameObjects.Image;
}

interface PrismFirefly {
  index: number;
  stage: 1 | 2;
  col: number;
  row: number;
  sprite: Phaser.GameObjects.Image;
  exposed: number;
  taken: boolean;
}

interface RaySeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mask: number;
}

/**
 * Sueño 6 (4A · Paloma Ibarra): Vitral Emplomado Translúcido.
 *
 * - Acto I: rotar espejos en 45° para teñir la luz en filtros rojo y azul hasta
 *   encender los dos rosetones del taller.
 * - Acto II: un prisma astillado divide la luz en DOS rayos opuestos que deben
 *   encender los rosetones a la vez (combinando verde + azul en cian) y destapan
 *   la lámpara Tiffany secreta del rincón izquierdo; en Modo Desvelo el plomo frío
 *   congela espejos sin luz cada 12s.
 * - Acto III: el vitral maestro pide LUZ BLANCA PURA; la regla prohíbe dirigir luz
 *   sin filtrar a la grieta central, pero solo apuntando rojo + verde + azul a la
 *   vez contra el cristal central prohibido estalla el plomo y entra la madrugada.
 */
export class DreamGlass extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private fx?: DreamFXPipeline;

  private dawnBackdrop!: Phaser.GameObjects.Image;
  private boardGfx!: Phaser.GameObjects.Graphics;
  private beamGfx!: Phaser.GameObjects.Graphics;
  private selRing!: Phaser.GameObjects.Arc;
  private ffText!: Phaser.GameObjects.Text;
  private actText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;

  private act: 1 | 2 | 3 = 1;
  private insomnia = false;
  private started = false;
  private ending = false;

  private pieces: OpticalPiece[] = [];
  private fireflies: PrismFirefly[] = [];
  private rays: RaySeg[] = [];
  private selectedId = 0;
  private moves = 0;
  private collected = 0;
  private secretDone = false;
  private freezeCooldown = 0;
  private winPending = false;

  constructor() {
    super('DreamGlass');
  }

  create(data: { insomnia?: boolean } = {}): void {
    this.resetState(Boolean(data.insomnia) || debug.flag('insomnia'));
    this.fx = applyWorldFX(this, 'glass');
    this.cameras.main.setBackgroundColor(0x0c0e18);
    fadeIn(this, 650);
    AudioManager.playMusic('glass', 0);

    buildGlassTextures(this);
    ensureStyle(
      this,
      STYLE,
      [
        ...CHARACTER_TEXTURES,
        'paloma',
        'prisma',
        'portrait-paloma',
        'portrait-iris',
        'portrait-morfeo',
      ],
      [...CHARACTER_ANIMS, 'paloma-idle'],
    );

    this.add.image(0, 0, 'glass-backdrop').setOrigin(0).setDepth(0);
    this.dawnBackdrop = this.add.image(0, 0, 'glass-dawn').setOrigin(0).setDepth(1).setAlpha(0);

    this.boardGfx = this.add.graphics().setDepth(10);
    this.beamGfx = this.add.graphics().setDepth(18);
    this.selRing = this.add
      .circle(0, 0, 29)
      .setStrokeStyle(2.5, 0xffc857, 0.9)
      .setDepth(21)
      .setVisible(false);

    this.buildFireflies();
    this.buildHud();
    this.dialogue = new DialogueBox(this, 0x1f2847, STYLE);
    this.inp = new InputManager(this);

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
      t('glass.title'),
      t('glass.name'),
      () => {
        this.dialogue.say(
          [
            { who: null, text: t('glass.intro.1') },
            { who: null, text: t('glass.intro.2') },
            { who: 'morfeo', text: t('glass.intro.3') },
            { who: 'morfeo', text: t('glass.intro.4'), mood: 'smug' },
          ],
          () => {
            showActBanner(this, t('glass.act1'), '#ffc857');
            this.showToast(t('glass.hint'), 4200);
            this.started = true;
          },
        );
      },
      STYLE,
      this.insomnia ? t('glass.insomnia') : undefined,
    );
  }

  private resetState(insomnia: boolean): void {
    this.act = 1;
    this.insomnia = insomnia;
    this.started = false;
    this.ending = false;
    this.pieces = [];
    this.fireflies = [];
    this.rays = [];
    this.selectedId = 0;
    this.moves = 0;
    this.collected = 0;
    this.secretDone = false;
    this.freezeCooldown = 0;
    this.winPending = false;
  }

  // ── HUD y Luciérnagas ──

  private buildHud(): void {
    const fix = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ) => o.setScrollFactor(0).setDepth(DEPTH_HUD);

    fix(this.add.image(34, 34, 'glass-ff').setScale(1));
    this.ffText = fix(
      this.add
        .text(58, 34, `${SaveManager.data.fireflies.glass}/6`, {
          fontFamily: FONT_HAND,
          fontSize: '21px',
          color: '#f4f0ff',
          stroke: '#0c0e18',
          strokeThickness: 4,
        })
        .setOrigin(0, 0.5),
    );

    this.movesText = fix(
      this.add
        .text(140, 34, '', {
          fontFamily: FONT_DISPLAY,
          fontSize: '12px',
          color: '#4cc9f0',
          stroke: '#0c0e18',
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5),
    );

    this.actText = fix(
      this.add
        .text(GAME_WIDTH - 92, 34, this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'), {
          fontFamily: FONT_HAND,
          fontSize: '19px',
          color: this.insomnia ? '#4cc9f0' : '#f4f0ff',
          stroke: '#0c0e18',
          strokeThickness: 4,
        })
        .setOrigin(1, 0.5),
    );

    this.toast = fix(
      this.add
        .text(GAME_WIDTH / 2, 496, '', {
          fontFamily: FONT_HAND,
          fontSize: '18px',
          color: '#f4f0ff',
          backgroundColor: '#121626ee',
          padding: { x: 14, y: 4 },
          align: 'center',
          wordWrap: { width: 720 },
        })
        .setOrigin(0.5)
        .setVisible(false),
    );
  }

  private showToast(text: string, ms = 2600): void {
    this.toast.setText(text).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 450 });
  }

  private buildFireflies(): void {
    const coords: [1 | 2, number, number][] = [
      [1, 0, 0],
      [1, 6, 1],
      [1, 0, 4],
      [2, 3, 4],
      [2, 8, 0],
      [2, 5, 4],
    ];
    coords.forEach(([stage, col, row], index) => {
      const p = posOf(col, row);
      const got = SaveManager.hasFirefly('glass', index);
      const sprite = this.add
        .image(p.x, p.y, 'glass-ff')
        .setDepth(16)
        .setAlpha(got ? 0.3 : 0.75)
        .setVisible(stage === 1);
      this.fireflies.push({ index, stage, col, row, sprite, exposed: 0, taken: false });
    });
  }

  // ── Escenarios por Acto ──

  private clearStage(): void {
    for (const pc of this.pieces) {
      pc.sprite?.destroy();
      pc.frozenSprite?.destroy();
    }
    this.pieces = [];
    this.rays = [];
    this.winPending = false;
    this.freezeCooldown = 8;
  }

  private addPiece(
    kind: CellKind,
    col: number,
    row: number,
    opts: Partial<Omit<OpticalPiece, 'id' | 'kind' | 'col' | 'row'>> = {},
  ): OpticalPiece {
    const id = this.pieces.length;
    const { x, y } = posOf(col, row);
    const piece: OpticalPiece = {
      id,
      kind,
      col,
      row,
      dir: opts.dir ?? 0,
      fixedColor: opts.fixedColor ?? 7,
      reqMask: opts.reqMask ?? 0,
      rotatable: Boolean(opts.rotatable),
      frozen: false,
      hitMask: 0,
      litTimer: 0,
      darkTimer: 0,
    };

    if (kind === 'mirror') {
      const sp = this.add
        .image(x, y, 'glass-mirror')
        .setDepth(19)
        .setAngle(piece.dir * 45)
        .setInteractive({ useHandCursor: true });
      sp.on('pointerdown', () => this.rotatePiece(piece));
      piece.sprite = sp;
      piece.frozenSprite = this.add.image(x, y, 'glass-frozen').setDepth(20).setVisible(false);
    } else if (kind === 'splitter') {
      piece.sprite = this.add.image(x, y, 'glass-splitter').setDepth(19);
    } else if (kind === 'cracked') {
      piece.sprite = this.add.image(x, y, 'glass-cracked').setDepth(19);
    } else if (kind === 'tiffany') {
      piece.sprite = this.add
        .image(x, y, this.secretDone ? 'glass-tiffany-lit' : 'glass-tiffany-covered')
        .setDepth(16);
    }

    this.pieces.push(piece);
    return piece;
  }

  private rotatePiece(piece: OpticalPiece): void {
    if (!this.started || this.pause.paused() || this.dialogue.active || this.ending) return;
    this.selectedId = piece.id;
    this.updateSelectionRing();

    if (piece.frozen) {
      piece.frozen = false;
      piece.frozenSprite?.setVisible(false);
      piece.darkTimer = 0;
      AudioManager.sfx('shatter');
      burst(this, piece.sprite!.x, piece.sprite!.y, 0x7084a8, 10, 26);
      return;
    }

    piece.dir = (piece.dir + 1) % 8;
    this.moves++;
    if (this.insomnia) this.movesText.setText(`↻ ${this.moves}`);
    if (piece.sprite) {
      this.tweens.add({
        targets: piece.sprite,
        angle: piece.dir * 45,
        duration: 110,
        ease: 'Back.out',
      });
    }
    AudioManager.sfx('prism');
    this.traceRays();
  }

  private updateSelectionRing(): void {
    const rot = this.pieces.find((p) => p.id === this.selectedId && p.rotatable);
    if (!rot || !rot.sprite) {
      this.selRing.setVisible(false);
      return;
    }
    this.selRing.setPosition(rot.sprite.x, rot.sprite.y).setVisible(true);
  }

  private setupStage(stage: 1 | 2 | 3): void {
    this.clearStage();
    this.act = stage;
    this.moves = 0;
    this.movesText.setText(this.insomnia ? '↻ 0' : '');

    for (const ff of this.fireflies) {
      if (!ff.taken) ff.sprite.setVisible(ff.stage === stage);
    }

    if (stage === 1) {
      this.actText.setText(this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'));
      this.addPiece('emitter', 0, 2, { dir: 0, fixedColor: 7 });
      this.addPiece('splitter', 2, 2, { dir: 2 }); // divide en N (6) y S (2)
      this.addPiece('filter', 2, 1, { fixedColor: 1 }); // rojo
      this.addPiece('filter', 2, 3, { fixedColor: 4 }); // azul

      this.addPiece('mirror', 2, 0, { dir: 4, rotatable: true });
      this.addPiece('mirror', 5, 0, { dir: 2, rotatable: true });
      this.addPiece('rosette', 7, 0, { reqMask: 1 });

      this.addPiece('mirror', 2, 4, { dir: 4, rotatable: true });
      this.addPiece('mirror', 5, 4, { dir: 6, rotatable: true });
      this.addPiece('rosette', 7, 4, { reqMask: 4 });
      AudioManager.setMusicLevel(0);
    } else if (stage === 2) {
      this.actText
        .setText(this.insomnia ? `${t('ui.act2')} · ☾` : t('ui.act2'))
        .setColor('#4cc9f0');
      this.addPiece('emitter', 4, 0, { dir: 2, fixedColor: 7 });
      this.addPiece('cracked', 4, 2, { dir: 0 }); // divide blanco en W (4) y E (0)

      // Mitad izquierda: rojo al rosetón (1,4) y desvío cian para lámpara Tiffany secreta (0,2)
      this.addPiece('splitter', 3, 2, { dir: 2 }); // desde W -> N (6) y W (4)
      this.addPiece('filter', 2, 2, { fixedColor: 1 });
      this.addPiece('mirror', 1, 2, { dir: 6, rotatable: true });
      this.addPiece('rosette', 1, 4, { reqMask: 1 });

      // Rama secreta hacia lámpara Tiffany en (0, 2)
      this.addPiece('mirror', 3, 0, { dir: 0, rotatable: true });
      this.addPiece('mirror', 2, 0, { dir: 2, rotatable: true });
      this.addPiece('filter', 1, 1, { fixedColor: 6 }); // cian
      this.addPiece('tiffany', 0, 2);

      // Mitad derecha: verde (2) + azul (4) convergen en cian (6) sobre el rosetón (8,4)
      this.addPiece('splitter', 6, 2, { dir: 2 }); // desde E -> E (0) y S (2)
      this.addPiece('filter', 7, 2, { fixedColor: 2 });
      this.addPiece('mirror', 8, 2, { dir: 0, rotatable: true });
      this.addPiece('filter', 6, 3, { fixedColor: 4 });
      this.addPiece('mirror', 6, 4, { dir: 4, rotatable: true });
      this.addPiece('rosette', 8, 4, { reqMask: 6 });

      AudioManager.setMusicLevel(1);
      showActBanner(this, t('glass.act2'), '#4cc9f0');
      this.showToast(t('glass.twist'), 5200);
    } else {
      // Acto III: 3 haces primarios (R, G, B) deben chocar juntos en el cristal central agrietado (4,2)
      this.actText
        .setText(this.insomnia ? `${t('ui.act3')} · ☾` : t('ui.act3'))
        .setColor('#ffffff');
      this.addPiece('emitter', 0, 2, { dir: 0, fixedColor: 1 });
      this.addPiece('mirror', 2, 2, { dir: 6, rotatable: true });

      this.addPiece('emitter', 4, 0, { dir: 2, fixedColor: 2 });
      this.addPiece('mirror', 4, 1, { dir: 4, rotatable: true });

      this.addPiece('emitter', 8, 2, { dir: 4, fixedColor: 4 });
      this.addPiece('mirror', 6, 2, { dir: 2, rotatable: true });

      this.addPiece('cracked', 4, 2, { reqMask: 7 });
      this.addPiece('rosette', 4, 4, { reqMask: 7 });

      AudioManager.setMusicLevel(2);
      showActBanner(this, t('glass.act3'), '#ffffff');
      this.showToast(t('glass.ruleBreakHint'), 6000);
    }

    const firstRot = this.pieces.find((p) => p.rotatable);
    this.selectedId = firstRot?.id ?? 0;
    this.updateSelectionRing();
    this.traceRays();
  }

  // ── Trazado Óptico Discreto (45°) ──

  private pieceAt(col: number, row: number): OpticalPiece | undefined {
    return this.pieces.find((p) => p.col === col && p.row === row);
  }

  private traceRays(): void {
    for (const p of this.pieces) p.hitMask = 0;
    this.rays = [];

    const queue: { col: number; row: number; dir: number; mask: number; depth: number }[] = [];
    for (const p of this.pieces) {
      if (p.kind === 'emitter') {
        queue.push({ col: p.col, row: p.row, dir: p.dir, mask: p.fixedColor, depth: 0 });
      }
    }

    const visited = new Set<string>();
    while (queue.length > 0 && this.rays.length < 70) {
      const q = queue.shift()!;
      if (q.depth > 24) continue;
      const [dx, dy] = DIRS[q.dir];
      const start = posOf(q.col, q.row);
      let c = q.col;
      let r = q.row;
      let mask = q.mask;

      for (let step = 0; step < 12; step++) {
        c += dx;
        r += dy;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) {
          const end = posOf(c - dx, r - dy);
          this.rays.push({
            x1: start.x,
            y1: start.y,
            x2: end.x + dx * 28,
            y2: end.y + dy * 28,
            mask,
          });
          break;
        }
        const hit = this.pieceAt(c, r);
        if (!hit || hit.kind === 'emitter') continue;

        hit.hitMask |= mask;
        if (hit.kind === 'filter') {
          mask = hit.fixedColor;
          continue;
        }

        const hp = posOf(c, r);
        this.rays.push({ x1: start.x, y1: start.y, x2: hp.x, y2: hp.y, mask });

        if (hit.kind === 'mirror') {
          if (hit.frozen) break;
          const k = `${hit.id}:${hit.dir}:${mask}`;
          if (!visited.has(k)) {
            visited.add(k);
            queue.push({ col: c, row: r, dir: hit.dir, mask, depth: q.depth + 1 });
          }
          break;
        }

        if (hit.kind === 'splitter' || (hit.kind === 'cracked' && this.act === 2)) {
          const outDirs =
            this.act === 2 && hit.kind === 'cracked'
              ? [4, 0]
              : hit.kind === 'splitter' && (q.dir === 0 || q.dir === 4)
                ? [6, 2]
                : [6, 4];
          // Para el divisor del Acto II izquierdo (col 3), divide W (4) en N (6) y W (4)
          const dirsToEmit =
            this.act === 2 && hit.col === 3
              ? [6, 4]
              : this.act === 2 && hit.col === 6
                ? [0, 2]
                : outDirs;
          for (const od of dirsToEmit) {
            const k = `${hit.id}:${od}:${mask}`;
            if (!visited.has(k)) {
              visited.add(k);
              queue.push({ col: c, row: r, dir: od, mask, depth: q.depth + 1 });
            }
          }
          break;
        }

        if (hit.kind === 'rosette' || hit.kind === 'tiffany' || hit.kind === 'cracked') {
          break;
        }
      }
    }

    this.checkWinAndSecret();
  }

  private rayHitsCell(col: number, row: number): boolean {
    const { x, y } = posOf(col, row);
    for (const r of this.rays) {
      const lx = r.x2 - r.x1;
      const ly = r.y2 - r.y1;
      const len2 = lx * lx + ly * ly;
      if (len2 < 1) continue;
      const tProj = Phaser.Math.Clamp(((x - r.x1) * lx + (y - r.y1) * ly) / len2, 0, 1);
      const px = r.x1 + lx * tProj;
      const py = r.y1 + ly * tProj;
      if (Math.hypot(x - px, y - py) < 26) return true;
    }
    return false;
  }

  private checkWinAndSecret(): void {
    // Secreto Acto II: lámpara Tiffany recibe rojo (1) + cian (6) -> 7
    if (this.act === 2 && !this.secretDone) {
      const tiff = this.pieces.find((p) => p.kind === 'tiffany');
      if (tiff && (tiff.hitMask & 7) === 7) {
        this.secretDone = true;
        tiff.sprite?.setTexture('glass-tiffany-lit');
        SaveManager.markSecret('glass');
        AudioManager.sfx('secret');
        showSecretBanner(this, t('glass.secret'));
        burst(this, posOf(tiff.col, tiff.row).x, posOf(tiff.col, tiff.row).y, 0xffc857, 24, 46);
      }
    }

    if (this.winPending || this.ending) return;

    if (this.act === 3) {
      const center = this.pieces.find((p) => p.kind === 'cracked');
      if (center && (center.hitMask & 7) === 7) {
        this.winPending = true;
        this.time.delayedCall(380, () => this.triggerRuleBreakWin());
      }
      return;
    }

    const targets = this.pieces.filter((p) => p.kind === 'rosette');
    if (targets.length > 0 && targets.every((r) => (r.hitMask & r.reqMask) === r.reqMask)) {
      this.winPending = true;
      AudioManager.sfx('bloom');
      for (const r of targets) {
        const p = posOf(r.col, r.row);
        burst(this, p.x, p.y, maskColor(r.reqMask), 20, 40);
      }
      this.time.delayedCall(850, () => {
        if (this.act === 1) this.setupStage(2);
        else if (this.act === 2) this.setupStage(3);
      });
    }
  }

  // ── Bucle Principal ──

  update(_time: number, deltaMs: number): void {
    this.inp.update();
    const dt = Math.min(deltaMs / 1000, 0.05);
    if (!this.started || this.pause.paused() || this.dialogue.active || this.ending) {
      this.drawBoard();
      return;
    }

    this.handleKeyboard();
    this.updateFireflies(dt);
    this.updateColdSolder(dt);
    this.drawBoard();
  }

  private handleKeyboard(): void {
    const rotPieces = this.pieces.filter((p) => p.rotatable);
    if (!rotPieces.length) return;
    if (this.inp.justDown('left') || this.inp.justDown('right')) {
      const curIdx = Math.max(
        0,
        rotPieces.findIndex((p) => p.id === this.selectedId),
      );
      const delta = this.inp.justDown('right') ? 1 : -1;
      const next = rotPieces[(curIdx + delta + rotPieces.length) % rotPieces.length];
      this.selectedId = next.id;
      this.updateSelectionRing();
      AudioManager.sfx('click');
    }
    if (this.inp.justDown('interact') || this.inp.justDown('up')) {
      const sel = rotPieces.find((p) => p.id === this.selectedId);
      if (sel) this.rotatePiece(sel);
    }
  }

  private updateFireflies(dt: number): void {
    for (const ff of this.fireflies) {
      if (ff.taken || ff.stage !== this.act) continue;
      if (this.rayHitsCell(ff.col, ff.row)) {
        ff.exposed += dt;
        ff.sprite.setScale(1 + Math.sin(this.time.now * 0.02) * 0.15);
        if (ff.exposed >= 0.45) {
          ff.taken = true;
          this.collected++;
          SaveManager.collectFirefly('glass', ff.index);
          this.ffText.setText(`${SaveManager.data.fireflies.glass}/6`);
          AudioManager.sfx('collect');
          burst(this, ff.sprite.x, ff.sprite.y, 0xffc857, 16, 38);
          this.tweens.add({ targets: ff.sprite, scale: 2, alpha: 0, duration: 400 });
        }
      } else {
        ff.exposed = Math.max(0, ff.exposed - dt);
        ff.sprite.setScale(1);
      }
    }
  }

  private updateColdSolder(dt: number): void {
    if (!this.insomnia || this.act < 2) return;
    this.freezeCooldown -= dt;
    for (const p of this.pieces) {
      if (!p.rotatable || p.frozen) continue;
      if (p.hitMask === 0) p.darkTimer += dt;
      else p.darkTimer = 0;
    }
    if (this.freezeCooldown <= 0) {
      this.freezeCooldown = 11;
      const candidate = this.pieces.find((p) => p.rotatable && !p.frozen && p.hitMask === 0);
      if (candidate) {
        candidate.frozen = true;
        candidate.frozenSprite?.setVisible(true);
        AudioManager.sfx('wrong');
        this.showToast(t('glass.frozen'), 2400);
      }
    }
  }

  private drawBoard(): void {
    const bg = this.boardGfx;
    bg.clear();

    // Emisores, filtros y rosetones dibujados nítidamente sobre la rejilla emplomada
    for (const p of this.pieces) {
      const { x, y } = posOf(p.col, p.row);
      if (p.kind === 'emitter') {
        const [dx, dy] = DIRS[p.dir];
        bg.fillStyle(maskColor(p.fixedColor), 0.92).fillCircle(x, y, 20);
        bg.lineStyle(3, 0x101422, 1).strokeCircle(x, y, 20);
        bg.lineStyle(4, maskColor(p.fixedColor), 0.95).lineBetween(x, y, x + dx * 26, y + dy * 26);
      } else if (p.kind === 'filter') {
        bg.fillStyle(maskColor(p.fixedColor), 0.48).fillRect(x - 18, y - 18, 36, 36);
        bg.lineStyle(3, maskColor(p.fixedColor), 0.95).strokeRect(x - 18, y - 18, 36, 36);
      } else if (p.kind === 'rosette') {
        const lit = (p.hitMask & p.reqMask) === p.reqMask;
        bg.fillStyle(maskColor(p.reqMask), lit ? 0.85 : 0.16).fillCircle(x, y, 28);
        bg.lineStyle(4, maskColor(p.reqMask), lit ? 1 : 0.65).strokeCircle(x, y, 28);
        bg.lineStyle(2, 0x0c0e18, 1).strokeCircle(x, y, 16);
      }
    }

    // Rayos de luz cromática aditiva
    const bm = this.beamGfx;
    bm.clear();
    if (this.ending) return;
    for (const r of this.rays) {
      const c = maskColor(r.mask);
      bm.lineStyle(12, c, 0.22).lineBetween(r.x1, r.y1, r.x2, r.y2);
      bm.lineStyle(4.5, c, 0.92).lineBetween(r.x1, r.y1, r.x2, r.y2);
      bm.lineStyle(1.5, 0xffffff, 0.7).lineBetween(r.x1, r.y1, r.x2, r.y2);
    }
  }

  // ── Acto III Ruptura de Regla y Final ──

  private triggerRuleBreakWin(): void {
    if (this.ending) return;
    this.ending = true;
    this.selRing.setVisible(false);

    AudioManager.sfx('shatter');
    AudioManager.sfx('bloom');
    AudioManager.setMusicLevel(3);
    this.cameras.main.shake(260, 0.01);

    const cp = posOf(4, 2);
    burst(this, cp.x, cp.y, 0xffffff, 36, 60);
    burst(this, cp.x, cp.y, 0xffc857, 24, 48);

    this.tweens.add({
      targets: this.pieces.map((p) => p.sprite).filter(Boolean),
      alpha: 0,
      duration: 750,
    });
    this.tweens.add({
      targets: this.pieces.map((p) => p.frozenSprite).filter(Boolean),
      alpha: 0,
      duration: 750,
    });
    this.tweens.add({ targets: this.boardGfx, alpha: 0, duration: 750 });
    this.tweens.add({ targets: this.dawnBackdrop, alpha: 1, duration: 1500 });
    this.fx?.blendTo(this, { tint: 0xfff0d6, tintAmount: 0.04, vignette: 0.2 }, 1500);

    const paloma = addStyled(this, 560, 415, 'paloma', STYLE, { feet: true, scale: 1.15 })
      .setDepth(26)
      .setAlpha(0);
    paloma.play(styledKey('paloma-idle', STYLE));
    const iris = addStyled(this, 390, 415, 'iris', STYLE, { feet: true, scale: 1.15 })
      .setDepth(26)
      .setAlpha(0);
    this.tweens.add({ targets: [paloma, iris], alpha: 1, duration: 1000 });

    this.dialogue.say(
      [
        { who: 'paloma', text: t('glass.paloma.1') },
        { who: 'paloma', text: t('glass.paloma.2') },
        { who: 'paloma', text: t('glass.paloma.3') },
        { who: 'iris', text: t('glass.paloma.4') },
        { who: 'paloma', text: t('glass.paloma.5') },
        { who: 'paloma', text: t('glass.paloma.6') },
      ],
      () => this.win(),
    );
  }

  private win(): void {
    AudioManager.sfx('win');
    AudioManager.sfx('key');
    showReturnCard(this, STYLE, t('glass.keyGet'), t('glass.fragment'), 'prisma');
    SaveManager.markCompleted('glass', this.insomnia);
    SaveManager.recordFireflies('glass', this.collected);
    this.time.delayedCall(4400, () => fadeToScene(this, 'Hub', undefined, 900));
  }
}
