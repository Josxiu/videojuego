import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH_HUD, FONT_HAND, FONT_DISPLAY } from '../../config';
import { t } from '../../i18n';
import { applyWorldFX } from '../../gfx/postfx';
import {
  type Camera3D,
  type Face3D,
  type EchoWave3D,
  makeBoxFaces,
  makeOctahedronFaces,
  renderScene3D,
} from '../../gfx/engine3d';
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
  makeTextButton,
} from '../../systems/ui';
import { burst } from '../../systems/Juice';
import { debug } from '../../systems/debug';

const STYLE = 'chamber3d';
const VIEW_W = 480;
const VIEW_H = 270;
const CELL = 4;

/**
 * Mapa 3D de 5x7 celdas (`col 0..4`, `row 0..6`).
 * `#` = muro anecoico, `.` = pasillo, `W` = cuarto cálido de madera de Elena
 */
const MAP = ['#.###', '#...#', '#.#.#', '#...#', '#WWW#', '##.##', '#...#'];

interface Seal3D {
  id: number;
  x: number;
  z: number;
  broken: boolean;
}

interface ForkFirefly {
  index: number;
  x: number;
  z: number;
  revealed: boolean;
  taken: boolean;
}

interface Absorber {
  baseX: number;
  z: number;
  amp: number;
  speed: number;
  phase: number;
  x: number;
}

/**
 * Sueño 9 (6A · Octavio Bravo): Arquitectura 3D en Primera Persona.
 *
 * - Acto I: cámara anecoica blanca; usa pulsos de ecolocalización 3D para ver
 *   nichos ocultos y quebrar 2 sellos acústicos esquivando amortiguadores.
 * - Acto II: habitación cálida de madera de Elena con reloj de péndulo; el casete
 *   secreto aguarda tras la consola acústica.
 * - Acto III: muro de espuma final; cada pulso lo engrosa y te empuja. Solo
 *   permaneciendo 4s en silencio inmóvil disuelve la cámara y abre la elección.
 */
export class DreamChamber3D extends Phaser.Scene {
  private inp!: InputManager;
  private dialogue!: DialogueBox;
  private pause!: { paused: () => boolean };

  private canvasTex!: Phaser.Textures.CanvasTexture;
  private ctx3d!: CanvasRenderingContext2D;

  private ffText!: Phaser.GameObjects.Text;
  private actText!: Phaser.GameObjects.Text;
  private stillText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private choiceBtns: Phaser.GameObjects.GameObject[] = [];

  private act: 1 | 2 | 3 = 1;
  private insomnia = false;
  private started = false;
  private ending = false;
  private choiceOpen = false;

  private cam: Camera3D = { x: 4, y: 1.6, z: 0.4, yaw: 0, pitch: 0, fov: Math.PI / 2.5 };
  private waves: EchoWave3D[] = [];
  private seals: Seal3D[] = [];
  private fireflies: ForkFirefly[] = [];
  private absorbers: Absorber[] = [];

  private collected = 0;
  private secretDone = false;
  private echoCooldown = 0;
  private foamThickness = 1;
  private stillTime = 0;
  private tickAcc = 0;
  private clickGuardUntil = 0;

  constructor() {
    super('DreamChamber3D');
  }

  create(data: { insomnia?: boolean } = {}): void {
    this.resetState(Boolean(data.insomnia) || debug.flag('insomnia'));
    applyWorldFX(this, 'chamber3d');
    this.cameras.main.setBackgroundColor(0x1e2533);
    fadeIn(this, 700);
    AudioManager.playMusic('chamber3d', 0);

    if (this.textures.exists('c3d-view')) this.textures.remove('c3d-view');
    this.canvasTex = this.textures.createCanvas('c3d-view', VIEW_W, VIEW_H)!;
    this.ctx3d = this.canvasTex.getContext();
    this.add
      .image(0, 0, 'c3d-view')
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(0);

    this.buildEntities();
    this.buildHud();
    this.dialogue = new DialogueBox(this, 0x4c566a, 'night');
    this.inp = new InputManager(this);
    this.bindControls();

    this.pause = addPauseOverlay(this, () => fadeToScene(this, 'Hub'), {
      onRestart: () => this.scene.restart({ insomnia: this.insomnia }),
    });

    const at = debug.flag('skip') ? debug.num('at', 0) : 0;
    if (at >= 2) {
      this.seals.forEach((s) => (s.broken = true));
      this.cam.x = 8;
      this.cam.z = 15.2;
      this.enterAct2();
    }
    if (at >= 3) {
      this.cam.x = 8;
      this.cam.z = 23.2;
      this.enterAct3();
    }

    this.renderView(0);

    if (debug.flag('skip')) {
      this.started = true;
      return;
    }

    showTitleCard(
      this,
      t('c3d.title'),
      t('c3d.name'),
      () => {
        this.dialogue.say(
          [
            { who: null, text: t('c3d.intro.1') },
            { who: null, text: t('c3d.intro.2') },
            { who: 'morfeo', text: t('c3d.intro.3') },
            { who: 'morfeo', text: t('c3d.intro.4'), mood: 'smug' },
          ],
          () => {
            showActBanner(this, t('c3d.act1'), '#5eead4');
            this.showToast(t('c3d.hint'), 4200);
            this.started = true;
          },
        );
      },
      STYLE,
      this.insomnia ? t('c3d.insomnia') : undefined,
    );
  }

  private resetState(insomnia: boolean): void {
    this.act = 1;
    this.insomnia = insomnia;
    this.started = false;
    this.ending = false;
    this.choiceOpen = false;
    this.choiceBtns = [];
    this.cam = { x: 4, y: 1.6, z: 0.4, yaw: 0, pitch: 0, fov: Math.PI / 2.5 };
    this.waves = [];
    this.seals = [];
    this.fireflies = [];
    this.absorbers = [];
    this.collected = 0;
    this.secretDone = false;
    this.echoCooldown = 0;
    this.foamThickness = 1;
    this.stillTime = 0;
    this.tickAcc = 0;
    this.clickGuardUntil = 0;
  }

  private buildEntities(): void {
    this.seals = [
      { id: 0, x: 11.5, z: 4, broken: false },
      { id: 1, x: 8, z: 12, broken: false },
    ];
    this.absorbers = [
      { baseX: 8, z: 8.2, amp: 2.8, speed: this.insomnia ? 2.1 : 1.4, phase: 0, x: 8 },
      { baseX: 8, z: 20, amp: 1.8, speed: this.insomnia ? 2.5 : 1.6, phase: 1.4, x: 8 },
    ];
    const forkCoords: [number, number][] = [
      [11.8, 3.8],
      [4.2, 12],
      [11.8, 12],
      [11.8, 16.5],
      [4.5, 24],
      [11.5, 24],
    ];
    forkCoords.forEach(([x, z], index) => {
      this.fireflies.push({
        index,
        x,
        z,
        revealed: !this.insomnia && SaveManager.hasFirefly('chamber3d', index),
        taken: false,
      });
    });
  }

  private buildHud(): void {
    const fix = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ) => o.setScrollFactor(0).setDepth(DEPTH_HUD);

    const icon = fix(this.add.circle(34, 34, 9, 0x5eead4, 0.95));
    icon.setStrokeStyle(2, 0x1e2533);
    this.ffText = fix(
      this.add
        .text(54, 34, `${SaveManager.data.fireflies.chamber3d}/6`, {
          fontFamily: FONT_DISPLAY,
          fontSize: '15px',
          color: '#eff3f8',
          stroke: '#1e2533',
          strokeThickness: 4,
        })
        .setOrigin(0, 0.5),
    );

    this.actText = fix(
      this.add
        .text(GAME_WIDTH - 92, 34, this.insomnia ? `${t('ui.act1')} · ☾` : t('ui.act1'), {
          fontFamily: FONT_HAND,
          fontSize: '19px',
          color: this.insomnia ? '#5eead4' : '#eff3f8',
          stroke: '#1e2533',
          strokeThickness: 4,
        })
        .setOrigin(1, 0.5),
    );

    this.stillText = fix(
      this.add
        .text(GAME_WIDTH / 2, 118, '', {
          fontFamily: FONT_DISPLAY,
          fontSize: '14px',
          color: '#f59e0b',
          backgroundColor: '#1e2533ee',
          padding: { x: 14, y: 6 },
        })
        .setOrigin(0.5)
        .setVisible(false),
    );

    this.toast = fix(
      this.add
        .text(GAME_WIDTH / 2, 496, '', {
          fontFamily: FONT_HAND,
          fontSize: '18px',
          color: '#eff3f8',
          backgroundColor: '#1e2533ee',
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

  private bindControls(): void {
    if (this.inp.isTouch) {
      this.inp.addOneFingerStick(() => {
        if (!this.started || this.dialogue.active || this.ending || this.pause.paused()) return;
        this.emitEcho();
      });
    } else {
      this.input.on('pointerdown', () => {
        if (!this.started || this.dialogue.active || this.ending || this.pause.paused()) return;
        if (this.time.now < this.clickGuardUntil) return;
        this.emitEcho();
      });
    }
  }

  // ── Mecánica de Ecolocalización y Movimiento 3D ──

  private emitEcho(): void {
    if (this.echoCooldown > 0) return;
    this.echoCooldown = this.insomnia ? 1.15 : 0.45;
    AudioManager.sfx('sonar');

    this.waves.push({
      origin: { x: this.cam.x, y: 0.4, z: this.cam.z },
      radius: 0.5,
      maxRadius: this.insomnia ? 13 : 16,
      alpha: 1,
      color: [94, 234, 212],
    });

    // Acto III: emitir pulso contra el muro de espuma lo engrosa y empuja atrás
    if (this.act === 3 && this.cam.z > 21) {
      this.foamThickness = Math.min(3.5, this.foamThickness + 0.4);
      this.stillTime = 0;
      this.stillText.setVisible(false);
      this.cam.z = Math.max(21.2, this.cam.z - 1.1);
      AudioManager.sfx('whoosh');
      this.showToast(t('c3d.ruleBreakHint'), 3600);
    }
  }

  private enterAct2(): void {
    if (this.act >= 2) return;
    this.act = 2;
    this.actText.setText(this.insomnia ? `${t('ui.act2')} · ☾` : t('ui.act2')).setColor('#f59e0b');
    AudioManager.setMusicLevel(1);
    AudioManager.sfx('click');
    showActBanner(this, t('c3d.act2'), '#f59e0b');
    this.showToast(t('c3d.twist'), 5200);
  }

  private enterAct3(): void {
    if (this.act >= 3) return;
    this.act = 3;
    this.stillTime = 0;
    this.actText.setText(this.insomnia ? `${t('ui.act3')} · ☾` : t('ui.act3')).setColor('#eff3f8');
    AudioManager.setMusicLevel(2);
    showActBanner(this, t('c3d.act3'), '#eff3f8');
    this.showToast(t('c3d.ruleBreakHint'), 6000);
  }

  private isWalkable(nx: number, nz: number): boolean {
    const r = 0.65;
    const pts: [number, number][] = [
      [nx - r, nz - r],
      [nx + r, nz - r],
      [nx - r, nz + r],
      [nx + r, nz + r],
    ];
    for (const [px, pz] of pts) {
      const col = Math.round(px / CELL);
      const row = Math.round(pz / CELL);
      const cell = MAP[row]?.[col];
      if (!cell || cell === '#') return false;
    }
    // Bloqueo del Acto I hacia Acto II hasta romper los sellos
    if (nz > 13.5 && this.seals.some((s) => !s.broken)) return false;
    // Muro final de espuma del Acto III
    if (!this.ending && nz > 25.4) return false;
    return true;
  }

  // ── Bucle Principal ──

  update(time: number, deltaMs: number): void {
    this.inp.update();
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.echoCooldown = Math.max(0, this.echoCooldown - dt);

    if (this.started && !this.pause.paused() && !this.dialogue.active && !this.ending) {
      const moved = this.updateMovement(dt);
      this.updateWaves(dt);
      this.updateEntities(time, dt, moved);
    }
    this.renderView(time);
  }

  private updateMovement(dt: number): boolean {
    let fwd = 0;
    let turn = 0;
    if (this.inp.isDown('up') || this.inp.joyY < -0.25) fwd += 1;
    if (this.inp.isDown('down') || this.inp.joyY > 0.25) fwd -= 1;
    if (this.inp.isDown('left') || this.inp.joyX < -0.25) turn -= 1;
    if (this.inp.isDown('right') || this.inp.joyX > 0.25) turn += 1;

    if (this.inp.justDown('interact')) {
      this.emitEcho();
      return true;
    }

    if (turn !== 0) this.cam.yaw += turn * 2.1 * dt;
    if (fwd !== 0) {
      const speed = 4.6 * dt * fwd;
      const nx = this.cam.x + Math.sin(this.cam.yaw) * speed;
      const nz = this.cam.z + Math.cos(this.cam.yaw) * speed;
      if (this.isWalkable(nx, this.cam.z)) this.cam.x = nx;
      if (this.isWalkable(this.cam.x, nz)) this.cam.z = nz;
    }

    return fwd !== 0 || turn !== 0;
  }

  private updateWaves(dt: number): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.radius += 11 * dt;
      w.alpha = Math.max(0, 1 - w.radius / w.maxRadius);
      for (const s of this.seals) {
        if (!s.broken && Math.hypot(s.x - w.origin.x, s.z - w.origin.z) <= w.radius + 1.2) {
          s.broken = true;
          AudioManager.sfx('seal');
          AudioManager.sfx('shatter');
          this.showToast(t('c3d.sealBreak'), 2200);
        }
      }
      for (const ff of this.fireflies) {
        if (!ff.taken && Math.hypot(ff.x - w.origin.x, ff.z - w.origin.z) <= w.radius + 1.2) {
          ff.revealed = true;
        }
      }
      if (w.radius >= w.maxRadius) this.waves.splice(i, 1);
    }
  }

  private updateEntities(time: number, dt: number, moved: boolean): void {
    // Transiciones por avance en Z
    if (this.act === 1 && this.cam.z >= 14.2) this.enterAct2();
    if (this.act === 2 && this.cam.z >= 22.4) this.enterAct3();

    // Secreto Acto II: alrededor/detrás de la consola de sonómetros en (4.2, 16.5) y casete en (3.6, 17.3)
    if (
      this.act >= 2 &&
      !this.secretDone &&
      this.cam.x <= 4.8 &&
      this.cam.z >= 15.0 &&
      this.cam.z <= 17.8
    ) {
      this.secretDone = true;
      SaveManager.markSecret('chamber3d');
      AudioManager.sfx('secret');
      showSecretBanner(this, t('c3d.secret'));
      burst(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 0xf59e0b, 20, 48);
    }

    // Diapasones coleccionables (luciérnagas)
    for (const ff of this.fireflies) {
      if (!ff.taken && Math.hypot(ff.x - this.cam.x, ff.z - this.cam.z) < 2.2) {
        ff.taken = true;
        this.collected++;
        SaveManager.collectFirefly('chamber3d', ff.index);
        this.ffText.setText(`${SaveManager.data.fireflies.chamber3d}/6`);
        AudioManager.sfx('collect');
        burst(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 0x5eead4, 16, 40);
      }
    }

    // Amortiguadores móviles
    for (const a of this.absorbers) {
      a.x = a.baseX + Math.sin(time * 0.001 * a.speed + a.phase) * a.amp;
      if (Math.hypot(a.x - this.cam.x, a.z - this.cam.z) < 1.35) {
        AudioManager.sfx('hit');
        this.showToast(t('c3d.hit'), 2200);
        this.cam.x = this.act >= 2 ? 8 : 4;
        this.cam.z = this.act >= 2 ? 15.2 : 0.4;
        this.cam.yaw = 0;
        return;
      }
    }

    // Acto III: quietud en silencio durante 4s para escuchar el reloj de Elena y derretir el muro
    if (this.act === 3 && this.cam.z >= 20.8) {
      if (!moved && this.waves.length === 0) {
        this.stillTime += dt;
        this.tickAcc += dt;
        if (this.tickAcc >= 0.9) {
          this.tickAcc = 0;
          AudioManager.sfx('click');
        }
        const rem = Math.max(0, 4 - this.stillTime).toFixed(1);
        this.stillText.setText(t('c3d.stillProgress', { s: rem })).setVisible(true);
        if (this.stillTime >= 4) {
          this.stillText.setVisible(false);
          this.dissolveFoamAndConfrontOctavio();
        }
      } else {
        this.stillTime = Math.max(0, this.stillTime - dt * 2);
        this.stillText.setVisible(this.stillTime > 0.2);
      }
    } else {
      this.stillText.setVisible(false);
    }
  }

  // ── Renderizado 3D (WebGL y Canvas Fallback) ──

  private renderView(time: number): void {
    const faces: Face3D[] = [];
    const warmMode = this.act === 2 && this.cam.z > 13.5 && this.cam.z < 19.2;
    const coldWall: [number, number, number] = this.insomnia ? [125, 138, 160] : [210, 220, 232];
    const warmWall: [number, number, number] = [176, 128, 82];

    for (let r = 0; r < MAP.length; r++) {
      for (let c = 0; c < MAP[r].length; c++) {
        const ch = MAP[r][c];
        if (ch !== '#') continue;
        const wx = c * CELL;
        const wz = r * CELL;
        if (Math.hypot(wx - this.cam.x, wz - this.cam.z) > 19) continue;
        const isWarm = r === 4 || r === 3;
        faces.push(
          ...makeBoxFaces(
            wx,
            1.6,
            wz,
            CELL,
            3.2,
            CELL,
            isWarm && this.act >= 2 ? warmWall : coldWall,
            {
              stroke: [76, 86, 106],
              skipBottom: true,
              echoOnly: this.insomnia,
            },
          ),
        );
      }
    }

    // Puerta de sello entre Acto I y Acto II si algún sello sigue activo
    if (this.seals.some((s) => !s.broken)) {
      faces.push(
        ...makeBoxFaces(8, 1.5, 14.1, 4, 3, 0.5, [94, 234, 212], {
          stroke: [30, 37, 51],
          alpha: 0.65,
          emissive: 0.35,
        }),
      );
    }

    // Reloj de péndulo de Elena en Acto II (4, 16.5) -> en el centro del 4 (8, 17.6) + Consola
    if (this.act >= 2) {
      faces.push(
        ...makeBoxFaces(8, 1.5, 17.6, 1.3, 3.0, 0.9, [120, 74, 42], {
          stroke: [245, 158, 11],
          emissive: 0.35,
        }),
      );
      const px = 8 + Math.sin(time * 0.004) * 0.35;
      faces.push(
        ...makeOctahedronFaces(px, 1.0, 17.0, 0.25, 0.35, [255, 209, 102], { emissive: 0.8 }),
      );
      // Consola del secreto a la izquierda + casete brillante detrás
      faces.push(
        ...makeBoxFaces(4.2, 0.7, 16.5, 1.3, 1.4, 1.1, [80, 92, 114], {
          stroke: [94, 234, 212],
          emissive: 0.25,
        }),
      );
      if (!this.secretDone) {
        faces.push(
          ...makeOctahedronFaces(3.6, 0.8, 17.3, 0.28, 0.4, [245, 158, 11], { emissive: 0.9 }),
        );
      }
    }

    // Muro de espuma final del Acto III
    if (!this.ending) {
      faces.push(
        ...makeBoxFaces(
          8,
          1.6,
          26.4 - (this.foamThickness - 1) * 0.45,
          10,
          3.2,
          this.foamThickness,
          [225, 230, 238],
          { stroke: [94, 234, 212], emissive: 0.15 },
        ),
      );
    } else {
      // Columna dorada de Octavio al fondo en la apertura final
      faces.push(
        ...makeOctahedronFaces(8, 1.6, 26.2, 0.55, 0.9, [245, 158, 11], { emissive: 0.85 }),
      );
    }

    // Sellos de silencio y diapasones 3D
    for (const s of this.seals) {
      if (s.broken) continue;
      faces.push(
        ...makeOctahedronFaces(
          s.x,
          1.4 + Math.sin(time * 0.004 + s.id) * 0.25,
          s.z,
          0.6,
          0.85,
          [94, 234, 212],
          {
            stroke: [255, 255, 255],
            emissive: 0.65,
          },
        ),
      );
    }

    for (const ff of this.fireflies) {
      if (ff.taken) continue;
      if (!ff.revealed && this.insomnia) continue;
      faces.push(
        ...makeOctahedronFaces(
          ff.x,
          1.3 + Math.cos(time * 0.005 + ff.index) * 0.2,
          ff.z,
          0.35,
          0.55,
          [255, 209, 102],
          {
            emissive: ff.revealed ? 0.9 : 0.4,
          },
        ),
      );
    }

    for (const a of this.absorbers) {
      faces.push(
        ...makeOctahedronFaces(a.x, 1.4, a.z, 0.65, 1.05, [184, 51, 42], {
          stroke: [30, 37, 51],
          emissive: 0.45,
        }),
      );
    }

    renderScene3D(this.ctx3d, VIEW_W, VIEW_H, this.cam, faces, {
      fogColor: this.ending
        ? [255, 230, 185]
        : warmMode
          ? [184, 144, 104]
          : this.insomnia
            ? [18, 22, 32]
            : [216, 222, 233],
      fogMax: this.insomnia ? 14 : 21,
      ambientLight: this.ending ? 0.88 : this.insomnia ? 0.08 : 0.36,
      floorColor: warmMode ? '#4a301d' : '#4c566a',
      ceilingColor: this.insomnia ? '#0f131c' : warmMode ? '#6b482e' : '#d8dee9',
      gridColor: warmMode ? 'rgba(245, 158, 11, 0.32)' : 'rgba(94, 234, 212, 0.26)',
      echoWaves: this.waves,
    });
    this.canvasTex.refresh();
  }

  // ── Acto III Silencio y Elección Frente a Octavio ──

  private dissolveFoamAndConfrontOctavio(): void {
    if (this.ending) return;
    this.ending = true;
    AudioManager.sfx('bloom');
    AudioManager.setMusicLevel(3);
    burst(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 0xffd166, 30, 56);

    this.dialogue.say(
      [
        { who: 'octavio', text: t('c3d.octavio.1') },
        { who: 'iris', text: t('c3d.octavio.2') },
        { who: 'octavio', text: t('c3d.octavio.3') },
        { who: 'iris', text: t('c3d.octavio.4') },
        { who: 'octavio', text: t('c3d.octavio.5') },
      ],
      () => this.presentChoice(),
    );
  }

  private presentChoice(): void {
    this.choiceOpen = true;
    this.clickGuardUntil = this.time.now + 240;

    const bg = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 740, 210, 0x1e2533, 0.94)
      .setStrokeStyle(2, 0x5eead4)
      .setDepth(DEPTH_HUD + 10);

    const resist = makeTextButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 42,
      t('c3d.choice.resist'),
      () => this.resolveChoice('resist'),
      16,
    )
      .setDepth(DEPTH_HUD + 11)
      .setColor('#ffd166');

    const silence = makeTextButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 42,
      t('c3d.choice.silence'),
      () => this.resolveChoice('silence'),
      16,
    )
      .setDepth(DEPTH_HUD + 11)
      .setColor('#d8dee9');

    this.choiceBtns = [bg, resist, silence];
  }

  private resolveChoice(choice: 'resist' | 'silence'): void {
    if (!this.choiceOpen) return;
    this.choiceOpen = false;
    for (const o of this.choiceBtns) o.destroy();
    this.choiceBtns = [];

    SaveManager.data.octavioChoice = choice;
    SaveManager.markCompleted('chamber3d', this.insomnia);
    SaveManager.recordFireflies('chamber3d', this.collected);
    SaveManager.save();

    if (choice === 'silence') {
      this.dialogue.say([{ who: 'octavio', text: t('c3d.silenceReply') }], () => {
        fadeToScene(this, 'Ending', { kind: 'silence' }, 900);
      });
      return;
    }

    this.dialogue.say([{ who: 'octavio', text: t('c3d.resistReply') }], () => {
      AudioManager.sfx('win');
      AudioManager.sfx('key');
      showReturnCard(this, STYLE, t('c3d.keyGet'), t('c3d.fragment'), 'reloj');
      this.time.delayedCall(4400, () => fadeToScene(this, 'Hub', undefined, 900));
    });
  }
}
