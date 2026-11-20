import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH_HUD, FONT_HAND, FONT_DISPLAY } from '../../config';
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
import { buildEmbroideryTextures } from './art';

const STYLE = 'embroidery';
const HOOP_CX = GAME_WIDTH / 2;
const HOOP_CY = GAME_HEIGHT / 2 + 8;

type ThreadColor = 'red' | 'blue' | 'gold';

interface Eyelet {
  id: number;
  x: number;
  y: number;
  color: ThreadColor | 'corner';
  sprite: Phaser.GameObjects.Image;
}

interface TearEdge {
  id: number;
  a: number;
  b: number;
  color: ThreadColor;
  sewn: boolean;
  locked: boolean;
  progressTime: number;
  isRuleBreak?: boolean;
}

interface PreStitched {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  color: ThreadColor;
}

interface SpoolBtn {
  color: ThreadColor;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
}

interface PearlFirefly {
  index: number;
  stage: 1 | 2;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  taken: boolean;
}

function colorHex(c: ThreadColor): number {
  return c === 'red' ? 0xc84b5a : c === 'blue' ? 0x3b6c9e : 0xdba038;
}

/** Comprueba intersección estricta de segmentos 2D (excluyendo extremos compartidos). */
function segmentsCross(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const close = (p: number, q: number, r: number, s: number) => Math.hypot(p - r, q - s) < 6;
  if (
    close(ax, ay, cx, cy) ||
    close(ax, ay, dx, dy) ||
    close(bx, by, cx, cy) ||
    close(bx, by, dx, dy)
  ) {
    return false;
  }
  const ccw = (p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number) =>
    (p3y - p1y) * (p2x - p1x) > (p2y - p1y) * (p3x - p1x);
  return (
    ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
    ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy)
  );
}

/**
 * Sueño 5 (2B · Renata): Bordado Textil sobre Lino Crudo.
 *
 * - Acto I: cerrar rasgaduras simples con hilo continuo sin cruzar puntadas ni tocar tijeras.
 * - Acto II: una polilla descose hilos sin remate dorado y los ojales piden rojo y azul;
 *   además las puntadas «S. M.» en el rincón inferior derecho revelan el babero secreto.
 * - Acto III: un mapa imposible de cerrar sin cruzar; solo bordando una estrella dorada
 *   encima (zurcido visible) la colcha queda firme y Renata suelta el miedo.
 */
export class DreamEmbroidery extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };
  private fx?: DreamFXPipeline;

  private linenGfx!: Phaser.GameObjects.Graphics;
  private needle!: Phaser.GameObjects.Image;
  private shears?: Phaser.GameObjects.Image;
  private moth?: Phaser.GameObjects.Image;
  private bibSprite!: Phaser.GameObjects.Image;

  private ffText!: Phaser.GameObjects.Text;
  private actText!: Phaser.GameObjects.Text;
  private threadGfx!: Phaser.GameObjects.Graphics;
  private spoolLabel!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;

  private act: 1 | 2 | 3 = 1;
  private insomnia = false;
  private started = false;
  private ending = false;

  private nodes: Eyelet[] = [];
  private edges: TearEdge[] = [];
  private preStitched: PreStitched[] = [];
  private spools: SpoolBtn[] = [];
  private fireflies: PearlFirefly[] = [];
  private cornerCount = 0;
  private cornerStitches: [number, number, number, number][] = [];
  private secretDone = false;

  private needleX = HOOP_CX - 140;
  private needleY = HOOP_CY;
  private activeNode: number | null = null;
  private currentColor: ThreadColor = 'red';
  private thread = 100;
  private maxThread = 100;
  private collected = 0;
  private clickGuardUntil = 0;

  private mothX = 600;
  private mothY = 200;
  private mothTargetEdge: number | null = null;

  constructor() {
    super('DreamEmbroidery');
  }

  create(data: { insomnia?: boolean } = {}): void {
    this.resetState(Boolean(data.insomnia) || debug.flag('insomnia'));
    this.fx = applyWorldFX(this, 'embroidery');
    this.cameras.main.setBackgroundColor(0xefe6d5);
    fadeIn(this, 650);
    AudioManager.playMusic('embroidery', 0);

    buildEmbroideryTextures(this);
    ensureStyle(
      this,
      STYLE,
      [
        ...CHARACTER_TEXTURES,
        'renata',
        'dedal',
        'portrait-renata',
        'portrait-iris',
        'portrait-morfeo',
      ],
      [...CHARACTER_ANIMS, 'renata-idle'],
    );

    this.add.image(0, 0, 'emb-backdrop').setOrigin(0).setDepth(0);
    this.linenGfx = this.add.graphics().setDepth(12);

    this.bibSprite = this.add.image(600, 398, 'emb-bib').setDepth(14).setAlpha(0);

    this.needle = this.add.image(this.needleX, this.needleY, 'emb-needle').setDepth(32);

    this.buildFireflies();
    this.buildHud();
    this.dialogue = new DialogueBox(this, 0x8b5e3c, STYLE);
    this.inp = new InputManager(this);
    this.bindPointerControls();

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
      t('emb.title'),
      t('emb.name'),
      () => {
        this.dialogue.say(
          [
            { who: null, text: t('emb.intro.1') },
            { who: null, text: t('emb.intro.2') },
            { who: 'morfeo', text: t('emb.intro.3') },
            { who: 'morfeo', text: t('emb.intro.4'), mood: 'smug' },
          ],
          () => {
            showActBanner(this, t('emb.act1'), '#c84b5a');
            this.showToast(t('emb.hint'), 4200);
            this.started = true;
          },
        );
      },
      STYLE,
      this.insomnia ? t('emb.insomnia') : undefined,
    );
  }

  private resetState(insomnia: boolean): void {
    this.act = 1;
    this.insomnia = insomnia;
    this.maxThread = insomnia ? 72 : 100;
    this.thread = this.maxThread;
    this.started = false;
    this.ending = false;
    this.nodes = [];
    this.edges = [];
    this.preStitched = [];
    this.spools = [];
    this.fireflies = [];
    this.cornerCount = 0;
    this.cornerStitches = [];
    this.secretDone = false;
    this.needleX = HOOP_CX - 140;
    this.needleY = HOOP_CY;
    this.activeNode = null;
    this.currentColor = 'red';
    this.collected = 0;
    this.shears = undefined;
    this.moth = undefined;
    this.mothTargetEdge = null;
    this.clickGuardUntil = 0;
  }

  // ── HUD & Controles 1 Dedo + PC ──

  private buildHud(): void {
    const fix = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ) => o.setScrollFactor(0).setDepth(DEPTH_HUD);

    fix(this.add.image(34, 34, 'emb-ff').setScale(1));
    this.ffText = fix(
      this.add
        .text(58, 34, `${SaveManager.data.fireflies.embroidery}/6`, {
          fontFamily: FONT_HAND,
          fontSize: '21px',
          color: '#3b2a22',
          stroke: '#faf3e6',
          strokeThickness: 4,
        })
        .setOrigin(0, 0.5),
    );

    this.threadGfx = fix(this.add.graphics());
    this.spoolLabel = fix(
      this.add
        .text(245, 34, '', {
          fontFamily: FONT_DISPLAY,
          fontSize: '12px',
          color: '#3b2a22',
          stroke: '#faf3e6',
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5),
    );

    this.actText = fix(
      this.add
        .text(GAME_WIDTH - 92, 34, this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'), {
          fontFamily: FONT_HAND,
          fontSize: '19px',
          color: this.insomnia ? '#9e3b46' : '#3b2a22',
          stroke: '#faf3e6',
          strokeThickness: 4,
        })
        .setOrigin(1, 0.5),
    );

    this.toast = fix(
      this.add
        .text(GAME_WIDTH / 2, 496, '', {
          fontFamily: FONT_HAND,
          fontSize: '18px',
          color: '#3b2a22',
          backgroundColor: '#faf3e6f2',
          padding: { x: 14, y: 4 },
          align: 'center',
          wordWrap: { width: 700 },
        })
        .setOrigin(0.5)
        .setVisible(false),
    );
    this.drawThreadBar();
  }

  private drawThreadBar(): void {
    const g = this.threadGfx;
    g.clear();
    g.fillStyle(0x3b2a22, 0.16).fillRoundedRect(120, 26, 114, 15, 7);
    g.fillStyle(colorHex(this.currentColor), 0.92).fillRoundedRect(
      120,
      26,
      Math.max(0, 114 * (this.thread / this.maxThread)),
      15,
      7,
    );
    const label =
      this.currentColor === 'red'
        ? t('emb.colorRed')
        : this.currentColor === 'blue'
          ? t('emb.colorBlue')
          : t('emb.colorGold');
    this.spoolLabel.setText(label.toUpperCase());
  }

  private showToast(text: string, ms = 2600): void {
    this.toast.setText(text).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 450 });
  }

  private bindPointerControls(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.started || this.pause.paused() || this.dialogue.active || this.ending) return;
      if (this.time.now < this.clickGuardUntil) return;
      this.moveNeedleTo(p.x, p.y);
      this.trySwatMoth(p.x, p.y);
      this.tryInteractAtNeedle(true);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.started || this.pause.paused() || this.dialogue.active || this.ending) return;
      if (p.isDown || !this.inp.isTouch) {
        this.moveNeedleTo(p.x, p.y);
        if (p.isDown) this.tryInteractAtNeedle(false);
      }
    });
    this.input.on('pointerup', () => {
      if (!this.started || this.dialogue.active || this.ending) return;
      this.tryInteractAtNeedle(false);
    });
  }

  private moveNeedleTo(px: number, py: number): void {
    const dx = px - HOOP_CX;
    const dy = py - HOOP_CY;
    const d = Math.hypot(dx, dy);
    const maxR = 228;
    if (d > maxR) {
      this.needleX = HOOP_CX + (dx / d) * maxR;
      this.needleY = HOOP_CY + (dy / d) * maxR;
    } else {
      this.needleX = px;
      this.needleY = py;
    }
    this.needle.setPosition(this.needleX, this.needleY);
  }

  private buildFireflies(): void {
    const pts: [1 | 2, number, number][] = [
      [1, 315, 175],
      [1, 635, 175],
      [1, 480, 445],
      [2, 295, 200],
      [2, 665, 200],
      [2, 335, 405],
    ];
    pts.forEach(([stage, x, y], index) => {
      const got = SaveManager.hasFirefly('embroidery', index);
      const sprite = this.add
        .image(x, y, 'emb-ff')
        .setDepth(24)
        .setAlpha(got ? 0.35 : 0.92)
        .setVisible(stage === 1);
      this.fireflies.push({ index, stage, x, y, sprite, taken: false });
    });
  }

  // ── Escenarios por Acto ──

  private clearStage(): void {
    for (const n of this.nodes) n.sprite.destroy();
    for (const s of this.spools) s.sprite.destroy();
    this.nodes = [];
    this.edges = [];
    this.preStitched = [];
    this.spools = [];
    this.cornerStitches = [];
    this.cornerCount = 0;
    this.activeNode = null;
    this.shears?.destroy();
    this.shears = undefined;
    this.moth?.destroy();
    this.moth = undefined;
    this.mothTargetEdge = null;
  }

  private addNode(id: number, x: number, y: number, color: ThreadColor | 'corner'): void {
    const sprite = this.add
      .image(x, y, `emb-eyelet-${color}`)
      .setDepth(22)
      .setInteractive({ useHandCursor: true });
    this.nodes.push({ id, x, y, color, sprite });
  }

  private addSpool(color: ThreadColor, x: number, y: number): void {
    const sprite = this.add
      .image(x, y, `emb-spool-${color}`)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => {
      this.clickGuardUntil = this.time.now + 200;
      this.pickSpool(color, x, y);
    });
    this.spools.push({ color, x, y, sprite });
  }

  private pickSpool(color: ThreadColor, x: number, y: number): void {
    this.currentColor = color;
    this.thread = this.maxThread;
    this.activeNode = null;
    this.drawThreadBar();
    AudioManager.sfx('snip');
    burst(this, x, y, colorHex(color), 10, 26);
  }

  private setupStage(stage: 1 | 2 | 3): void {
    this.clearStage();
    this.act = stage;
    this.thread = this.maxThread;
    this.currentColor = 'red';
    this.drawThreadBar();

    for (const ff of this.fireflies) {
      if (!ff.taken) ff.sprite.setVisible(ff.stage === stage);
    }

    if (stage === 1) {
      this.actText.setText(this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'));
      this.addSpool('red', 274, 278);

      // Cadena de 4 ojales formando 3 rasgaduras limpias (sin cruces si sigues el hilván)
      this.addNode(0, 355, 195, 'red');
      this.addNode(1, 480, 175, 'red');
      this.addNode(2, 595, 255, 'red');
      this.addNode(3, 465, 365, 'red');

      this.edges = [
        { id: 0, a: 0, b: 1, color: 'red', sewn: false, locked: false, progressTime: 0 },
        { id: 1, a: 1, b: 2, color: 'red', sewn: false, locked: false, progressTime: 0 },
        { id: 2, a: 2, b: 3, color: 'red', sewn: false, locked: false, progressTime: 0 },
      ];

      this.shears = this.add.image(HOOP_CX, HOOP_CY, 'emb-shears').setDepth(26);
      AudioManager.setMusicLevel(0);
      return;
    }

    if (stage === 2) {
      this.actText
        .setText(this.insomnia ? `${t('ui.act2')} · ☾` : t('ui.act2'))
        .setColor('#3b6c9e');
      this.addSpool('red', 272, 278);
      this.addSpool('blue', 688, 278);
      this.addSpool('gold', 480, 448);

      // Lado rojo (izquierda) y lado azul (derecha)
      this.addNode(0, 355, 195, 'red');
      this.addNode(1, 445, 195, 'red');
      this.addNode(2, 355, 335, 'red');
      this.addNode(3, 445, 335, 'red');
      this.addNode(4, 515, 195, 'blue');
      this.addNode(5, 605, 195, 'blue');
      this.addNode(6, 515, 335, 'blue');
      this.addNode(7, 605, 335, 'blue');

      // 4 ojales tenues en esquina inferior derecha para el secreto «S. M.»
      this.addNode(8, 560, 388, 'corner');
      this.addNode(9, 600, 376, 'corner');
      this.addNode(10, 628, 404, 'corner');
      this.addNode(11, 588, 422, 'corner');

      this.edges = [
        { id: 0, a: 0, b: 1, color: 'red', sewn: false, locked: false, progressTime: 0 },
        { id: 1, a: 2, b: 3, color: 'red', sewn: false, locked: false, progressTime: 0 },
        { id: 2, a: 4, b: 5, color: 'blue', sewn: false, locked: false, progressTime: 0 },
        { id: 3, a: 6, b: 7, color: 'blue', sewn: false, locked: false, progressTime: 0 },
      ];

      this.mothX = 590;
      this.mothY = 260;
      this.moth = this.add
        .image(this.mothX, this.mothY, 'emb-moth')
        .setDepth(28)
        .setInteractive({ useHandCursor: true });
      this.moth.on('pointerdown', () => this.trySwatMoth(this.mothX, this.mothY));

      AudioManager.setMusicLevel(1);
      showActBanner(this, t('emb.act2'), '#3b6c9e');
      this.showToast(t('emb.twist'), 5200);
      return;
    }

    // Acto III: El grafo imposible. Dos costuras ya cosidas en X; cerrar la central requiere cruzar con dorado.
    this.actText.setText(this.insomnia ? `${t('ui.act3')} · ☾` : t('ui.act3')).setColor('#dba038');
    this.addSpool('red', 274, 278);
    this.addSpool('gold', 480, 448);

    this.addNode(0, 390, 195, 'red'); // TL
    this.addNode(1, 570, 195, 'blue'); // TR
    this.addNode(2, 570, 345, 'red'); // BR
    this.addNode(3, 390, 345, 'gold'); // BL

    this.preStitched = [
      { ax: 390, ay: 195, bx: 570, by: 195, color: 'red' },
      { ax: 570, ay: 195, bx: 570, by: 345, color: 'blue' },
      { ax: 570, ay: 345, bx: 390, by: 345, color: 'red' },
      { ax: 390, ay: 345, bx: 390, by: 195, color: 'blue' },
      // Costura roja fija que cruza la diagonal principal TL -> BR
      { ax: 390, ay: 195, bx: 570, by: 345, color: 'red' },
    ];

    this.edges = [
      {
        id: 0,
        a: 3,
        b: 1,
        color: 'gold',
        sewn: false,
        locked: false,
        progressTime: 0,
        isRuleBreak: true,
      },
    ];

    AudioManager.setMusicLevel(2);
    showActBanner(this, t('emb.act3'), '#dba038');
    this.showToast(t('emb.ruleBreakHint'), 6000);
  }

  // ── Bucle Principal ──

  update(time: number, deltaMs: number): void {
    this.inp.update();
    const dt = Math.min(deltaMs / 1000, 0.05);
    if (!this.started || this.pause.paused() || this.dialogue.active || this.ending) {
      this.redrawLinen();
      return;
    }

    this.updateKeys(dt);
    this.updateFireflies();
    this.updateHazards(time, dt);
    this.redrawLinen();
  }

  private updateKeys(dt: number): void {
    let kx = 0;
    let ky = 0;
    if (this.inp.isDown('left')) kx -= 1;
    if (this.inp.isDown('right')) kx += 1;
    if (this.inp.isDown('up')) ky -= 1;
    if (this.inp.isDown('down')) ky += 1;
    if (kx || ky) {
      const len = Math.hypot(kx, ky);
      this.moveNeedleTo(this.needleX + (kx / len) * 280 * dt, this.needleY + (ky / len) * 280 * dt);
    }
    if (this.inp.justDown('interact')) {
      this.trySwatMoth(this.needleX, this.needleY);
      this.tryInteractAtNeedle(true);
    }
  }

  private tryInteractAtNeedle(allowAnchor: boolean): void {
    for (const s of this.spools) {
      if (Math.hypot(this.needleX - s.x, this.needleY - s.y) < 34) {
        if (this.currentColor !== s.color || this.thread < this.maxThread * 0.9) {
          this.pickSpool(s.color, s.x, s.y);
        }
        return;
      }
    }

    let hit: Eyelet | undefined;
    for (const n of this.nodes) {
      if (Math.hypot(this.needleX - n.x, this.needleY - n.y) < 30) {
        hit = n;
        break;
      }
    }
    if (!hit) return;

    if (this.activeNode === null) {
      if (!allowAnchor) return;
      this.activeNode = hit.id;
      AudioManager.sfx('stitch');
      return;
    }

    if (this.activeNode === hit.id) return;
    this.trySewBetween(this.activeNode, hit.id);
  }

  private trySewBetween(idA: number, idB: number): void {
    const nodeA = this.nodes[idA];
    const nodeB = this.nodes[idB];
    if (!nodeA || !nodeB) return;

    // Secreto «S. M.» en los 4 ojales de esquina inferior derecha del Acto II
    if (this.act === 2 && !this.secretDone && idA >= 8 && idB >= 8) {
      const exists = this.cornerStitches.some(
        ([x1, y1, x2, y2]) =>
          (x1 === nodeA.x && y1 === nodeA.y && x2 === nodeB.x && y2 === nodeB.y) ||
          (x1 === nodeB.x && y1 === nodeB.y && x2 === nodeA.x && y2 === nodeA.y),
      );
      if (!exists) {
        this.cornerStitches.push([nodeA.x, nodeA.y, nodeB.x, nodeB.y]);
        this.cornerCount++;
        this.activeNode = idB;
        AudioManager.sfx('stitch');
        burst(this, nodeB.x, nodeB.y, 0xdba038, 8, 22);
        if (this.cornerCount >= 3) {
          this.secretDone = true;
          SaveManager.markSecret('embroidery');
          AudioManager.sfx('secret');
          showSecretBanner(this, t('emb.secret'));
          this.tweens.add({ targets: this.bibSprite, alpha: 0.95, duration: 900 });
        }
      }
      return;
    }

    const edge = this.edges.find(
      (e) => !e.sewn && ((e.a === idA && e.b === idB) || (e.a === idB && e.b === idA)),
    );
    if (!edge) {
      // No hay rasgadura entre esos dos ojales; mueve ancla al nuevo ojal
      this.activeNode = idB;
      AudioManager.sfx('stitch');
      return;
    }

    const cost = this.insomnia ? 34 : 25;
    if (this.thread < cost) {
      AudioManager.sfx('wrong');
      this.showToast(t('emb.needThread'), 2200);
      this.activeNode = null;
      return;
    }

    if (edge.color !== this.currentColor && this.currentColor !== 'gold') {
      const cname =
        edge.color === 'red'
          ? t('emb.colorRed')
          : edge.color === 'blue'
            ? t('emb.colorBlue')
            : t('emb.colorGold');
      AudioManager.sfx('wrong');
      this.showToast(
        this.act === 3 && edge.isRuleBreak
          ? t('emb.ruleBreakHint')
          : t('emb.needColor', { c: cname }),
        2600,
      );
      this.activeNode = null;
      return;
    }

    const crosses = this.wouldCross(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
    if (crosses && !(this.act === 3 && this.currentColor === 'gold' && edge.isRuleBreak)) {
      AudioManager.sfx('screech');
      this.showToast(this.act === 3 ? t('emb.ruleBreakHint') : t('emb.knot'), 2600);
      this.activeNode = null;
      return;
    }

    // Puntada exitosa
    this.thread = Math.max(0, this.thread - cost);
    edge.sewn = true;
    edge.locked = this.currentColor === 'gold';
    edge.progressTime = 0;
    this.activeNode = idB;
    this.drawThreadBar();
    AudioManager.sfx('stitch');
    burst(
      this,
      (nodeA.x + nodeB.x) / 2,
      (nodeA.y + nodeB.y) / 2,
      colorHex(this.currentColor),
      12,
      28,
    );

    if (this.act === 3 && edge.isRuleBreak) {
      this.triggerRuleBreakWin();
      return;
    }

    if (this.edges.every((e) => e.sewn)) {
      this.activeNode = null;
      AudioManager.sfx('bloom');
      this.time.delayedCall(650, () => {
        if (this.act === 1) this.setupStage(2);
        else if (this.act === 2) this.setupStage(3);
      });
    }
  }

  private wouldCross(ax: number, ay: number, bx: number, by: number): boolean {
    for (const ps of this.preStitched) {
      if (segmentsCross(ax, ay, bx, by, ps.ax, ps.ay, ps.bx, ps.by)) return true;
    }
    for (const e of this.edges) {
      if (!e.sewn) continue;
      const na = this.nodes[e.a];
      const nb = this.nodes[e.b];
      if (na && nb && segmentsCross(ax, ay, bx, by, na.x, na.y, nb.x, nb.y)) return true;
    }
    return false;
  }

  private trySwatMoth(x: number, y: number): void {
    if (!this.moth || this.act !== 2) return;
    if (Math.hypot(x - this.mothX, y - this.mothY) < 42) {
      AudioManager.sfx('snip');
      burst(this, this.mothX, this.mothY, 0xa88d70, 8, 28);
      this.mothX = 635;
      this.mothY = 170;
      this.mothTargetEdge = null;
    }
  }

  private updateFireflies(): void {
    for (const ff of this.fireflies) {
      if (ff.taken || ff.stage !== this.act) continue;
      if (Math.hypot(this.needleX - ff.x, this.needleY - ff.y) < 38) {
        ff.taken = true;
        this.collected++;
        SaveManager.collectFirefly('embroidery', ff.index);
        this.ffText.setText(`${SaveManager.data.fireflies.embroidery}/6`);
        AudioManager.sfx('collect');
        burst(this, ff.x, ff.y, 0xdba038, 12, 34);
        this.tweens.add({ targets: ff.sprite, scale: 2, alpha: 0, duration: 400 });
      }
    }
  }

  private updateHazards(time: number, dt: number): void {
    // Acto I: tijeras oscilantes que cortan la hebra activa si las tocas
    if (this.act === 1 && this.shears) {
      const sy = HOOP_CY + Math.sin(time * 0.0024) * 115;
      this.shears.setPosition(HOOP_CX, sy).setAngle(Math.sin(time * 0.006) * 8);
      if (this.activeNode !== null && Math.hypot(this.needleX - HOOP_CX, this.needleY - sy) < 36) {
        this.activeNode = null;
        AudioManager.sfx('snip');
        burst(this, this.needleX, this.needleY, 0xc84b5a, 10, 26);
      }
    }

    // Acto II: la polilla vuela hacia una costura sin remate dorado y la descose
    if (this.act === 2 && this.moth) {
      const target =
        this.edges.find((e) => e.id === this.mothTargetEdge && e.sewn && !e.locked) ??
        this.edges.find((e) => e.sewn && !e.locked);
      if (target) {
        this.mothTargetEdge = target.id;
        const na = this.nodes[target.a];
        const nb = this.nodes[target.b];
        const mx = (na.x + nb.x) / 2;
        const my = (na.y + nb.y) / 2;
        const dx = mx - this.mothX;
        const dy = my - this.mothY;
        const dist = Math.hypot(dx, dy);
        if (dist > 14) {
          const speed = this.insomnia ? 66 : 42;
          this.mothX += (dx / dist) * speed * dt;
          this.mothY += (dy / dist) * speed * dt;
        } else {
          target.progressTime += dt;
          const chewLimit = this.insomnia ? 2.4 : 4.2;
          if (target.progressTime >= chewLimit) {
            target.sewn = false;
            target.progressTime = 0;
            this.mothTargetEdge = null;
            AudioManager.sfx('rip');
            burst(this, mx, my, colorHex(target.color), 12, 30);
          }
        }
      } else {
        this.mothX = 590 + Math.cos(time * 0.002) * 38;
        this.mothY = 270 + Math.sin(time * 0.003) * 42;
      }
      this.moth.setPosition(this.mothX, this.mothY).setAngle(Math.sin(time * 0.012) * 6);
    }
  }

  private redrawLinen(): void {
    const g = this.linenGfx;
    g.clear();

    // Costuras previas fijas (Acto III)
    for (const ps of this.preStitched) {
      g.lineStyle(5, colorHex(ps.color), 0.92);
      g.lineBetween(ps.ax, ps.ay, ps.bx, ps.by);
    }

    // Puntadas secretas S.M.
    for (const [x1, y1, x2, y2] of this.cornerStitches) {
      g.lineStyle(3.5, 0xdba038, 0.9);
      g.lineBetween(x1, y1, x2, y2);
    }

    // Rasgaduras abiertas o puntadas terminadas
    for (const e of this.edges) {
      const a = this.nodes[e.a];
      const b = this.nodes[e.b];
      if (!a || !b) continue;
      if (e.sewn) {
        g.lineStyle(5, e.locked ? 0xdba038 : colorHex(e.color), 0.96);
        g.lineBetween(a.x, a.y, b.x, b.y);
      } else {
        // Grieta oscura desgarrada en la tela + línea punteada del color pedido
        g.lineStyle(6, 0x3b2a22, 0.35);
        g.lineBetween(a.x, a.y, b.x, b.y);
        const steps = 6;
        g.lineStyle(3, colorHex(e.color), 0.72);
        for (let i = 0; i < steps; i += 2) {
          const t0 = i / steps;
          const t1 = (i + 1) / steps;
          g.lineBetween(
            Phaser.Math.Linear(a.x, b.x, t0),
            Phaser.Math.Linear(a.y, b.y, t0),
            Phaser.Math.Linear(a.x, b.x, t1),
            Phaser.Math.Linear(a.y, b.y, t1),
          );
        }
      }
    }

    // Hebra viva siguiendo la aguja
    if (this.activeNode !== null) {
      const a = this.nodes[this.activeNode];
      if (a) {
        g.lineStyle(3.2, colorHex(this.currentColor), 0.85);
        g.lineBetween(a.x, a.y, this.needleX, this.needleY);
      }
    }
  }

  // ── Acto III Ruptura de Regla y Final ──

  private triggerRuleBreakWin(): void {
    if (this.ending) return;
    this.ending = true;
    this.activeNode = null;
    this.redrawLinen();

    AudioManager.sfx('bloom');
    AudioManager.setMusicLevel(3);
    this.fx?.blendTo(this, { tint: 0xffebb8, tintAmount: 0.08, vignette: 0.18 }, 1200);

    // Estrella de zurcido visible dorado sobre el cruce central
    const cx = HOOP_CX;
    const cy = 270;
    const star = this.add.graphics().setDepth(26);
    star.lineStyle(3.5, 0xdba038, 0.95);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI;
      star.lineBetween(
        cx + Math.cos(a) * 28,
        cy + Math.sin(a) * 28,
        cx - Math.cos(a) * 28,
        cy - Math.sin(a) * 28,
      );
    }
    burst(this, cx, cy, 0xdba038, 28, 52);

    const renata = addStyled(this, 325, 420, 'renata', STYLE, { feet: true, scale: 1.15 })
      .setDepth(29)
      .setAlpha(0);
    renata.play(styledKey('renata-idle', STYLE));
    const iris = addStyled(this, 240, 420, 'iris', STYLE, { feet: true, scale: 1.15 })
      .setDepth(29)
      .setAlpha(0);
    this.tweens.add({ targets: [renata, iris], alpha: 1, duration: 900 });

    this.dialogue.say(
      [
        { who: 'renata', text: t('emb.renata.1') },
        { who: 'renata', text: t('emb.renata.2') },
        { who: 'renata', text: t('emb.renata.3') },
        { who: 'renata', text: t('emb.renata.4') },
        { who: 'iris', text: t('emb.renata.5') },
        { who: 'renata', text: t('emb.renata.6') },
      ],
      () => this.win(),
    );
  }

  private win(): void {
    AudioManager.sfx('win');
    AudioManager.sfx('key');
    showReturnCard(this, STYLE, t('emb.keyGet'), t('emb.fragment'), 'dedal');
    SaveManager.markCompleted('embroidery', this.insomnia);
    SaveManager.recordFireflies('embroidery', this.collected);
    this.time.delayedCall(4400, () => fadeToScene(this, 'Hub', undefined, 900));
  }
}
