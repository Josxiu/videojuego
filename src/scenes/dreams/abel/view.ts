/**
 * Vistas de la maqueta. La lógica del sueño no sabe cómo se dibuja: usa la
 * vista 3D (three.js) si hay WebGL y, si no, una vista 2D desde arriba.
 */
import type * as THREE_NS from 'three';
import {
  SEGMENTS,
  SWITCH_POS,
  STATIONS,
  WATER_TOWER,
  pointAt,
  type SegId,
  type SwitchId,
} from '../../../data/abel';

export interface CarPose {
  x: number;
  z: number;
  dx: number;
  dz: number;
}

export interface MaquetaView {
  setTrain(cars: CarPose[]): void;
  setGhosts(ghosts: CarPose[][]): void;
  setSwitch(id: SwitchId, diverted: boolean): void;
  removeSeg(id: SegId, animate: boolean): void;
  setStationLit(i: number, lit: boolean): void;
  setTickets(t: { x: number; z: number; visible: boolean }[]): void;
  showTerminal(on: boolean, names: { terminal: string }): void;
  setYolimaFigure(x: number, z: number, abelOff: boolean): void;
  hand(x: number, z: number, phase: number): void;
  pick(px: number, py: number): { sw?: SwitchId; tower?: boolean };
  rotate(dyaw: number): void;
  render(t: number): void;
  destroy(): void;
}

function labelCanvas(text: string, color = '#1b1f3b', bg = '#f6efd8'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = bg;
  x.beginPath();
  x.roundRect(4, 8, 248, 48, 10);
  x.fill();
  x.strokeStyle = color;
  x.lineWidth = 3;
  x.stroke();
  x.fillStyle = color;
  x.font = '800 30px "Big Shoulders Display", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 128, 33);
  return c;
}

function noiseCanvas(base: string, dots: string, n: number, w = 256, h = 256): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    x.fillStyle = dots;
    x.globalAlpha = Math.random() * 0.25;
    x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  x.globalAlpha = 1;
  return c;
}

/** Vista 3D con three.js. */
export class View3D implements MaquetaView {
  private renderer: THREE_NS.WebGLRenderer;
  private scene: THREE_NS.Scene;
  private cam: THREE_NS.PerspectiveCamera;
  private yaw = -0.35;
  private segGroups = new Map<SegId, THREE_NS.Group>();
  private switches = new Map<SwitchId, THREE_NS.Mesh>();
  private stationLamps: THREE_NS.Mesh[] = [];
  private train: THREE_NS.Group[] = [];
  private ghosts: THREE_NS.Group[][] = [];
  private tickets: THREE_NS.Mesh[] = [];
  private tower!: THREE_NS.Group;
  private terminal!: THREE_NS.Group;
  private yolima!: THREE_NS.Group;
  private abelFig!: THREE_NS.Group;
  private handG!: THREE_NS.Group;
  private ray: THREE_NS.Raycaster;
  private removing: { g: THREE_NS.Group; t: number }[] = [];

  constructor(
    private T: typeof THREE_NS,
    readonly canvas: HTMLCanvasElement,
  ) {
    const THREE = T;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1d1410);
    this.scene.fog = new THREE.Fog(0x1d1410, 22, 40);
    this.cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 100);
    this.ray = new THREE.Raycaster();
    this.build();
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
  }

  private mat(
    color: number,
    extra: Partial<THREE_NS.MeshStandardMaterialParameters> = {},
  ): THREE_NS.MeshStandardMaterial {
    return new this.T.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...extra });
  }

  private box(w: number, h: number, d: number, color: number, extra = {}): THREE_NS.Mesh {
    const m = new this.T.Mesh(new this.T.BoxGeometry(w, h, d), this.mat(color, extra));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  private build(): void {
    const THREE = this.T;
    const s = this.scene;
    s.add(new THREE.AmbientLight(0xfff0d8, 0.55));
    s.add(new THREE.HemisphereLight(0xffe8c8, 0x30201a, 0.35));
    const lamp = new THREE.SpotLight(0xffd9a0, 260, 60, 0.65, 0.5, 1.4);
    lamp.position.set(-4, 16, 6);
    lamp.target.position.set(0, 0, 0);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    s.add(lamp, lamp.target);
    // mesa de madera y fieltro
    const wood = new THREE.CanvasTexture(noiseCanvas('#7a4a2a', '#3a2012', 4000));
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.8, 16),
      this.mat(0xffffff, { map: wood }),
    );
    table.position.y = -0.4;
    table.receiveShadow = true;
    s.add(table);
    const feltTex = new THREE.CanvasTexture(noiseCanvas('#3f7a3a', '#1f4a1a', 6000));
    const felt = new THREE.Mesh(
      new THREE.PlaneGeometry(20.4, 14.4),
      this.mat(0xffffff, { map: feltTex, roughness: 1 }),
    );
    felt.rotation.x = -Math.PI / 2;
    felt.position.y = 0.01;
    felt.receiveShadow = true;
    s.add(felt);
    // río de papel azul (el Magdalena)
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 14.4),
      this.mat(0x4a7ab0, { roughness: 0.4 }),
    );
    river.rotation.x = -Math.PI / 2;
    river.position.set(-9, 0.02, 0);
    s.add(river);
    // vías
    for (const sg of Object.values(SEGMENTS)) this.segGroups.set(sg.id, this.buildTrack(sg.id));
    // agujas
    for (const id of [1, 2, 3] as SwitchId[]) {
      const [x, z] = SWITCH_POS[id];
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.18, 20),
        this.mat(0x5fe0a0),
      );
      m.position.set(x, 0.2, z + (id === 2 ? 0.75 : -0.75));
      m.userData.sw = id;
      s.add(m);
      this.switches.set(id, m);
      const lab = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(labelCanvas(String(id), '#1b1f3b', '#ffd23f')),
          depthTest: false,
        }),
      );
      lab.scale.set(0.9, 0.24, 1);
      lab.position.set(x, 0.75, m.position.z);
      s.add(lab);
    }
    // estaciones
    STATIONS.forEach((st, i) => {
      const p = pointAt(SEGMENTS[st.seg], SEGMENTS[st.seg].len * st.at);
      const nx = -p.dz;
      const nz = p.dx;
      const side = st.seg === 'topB' || st.seg === 'botB' ? 1 : -1;
      const hx = p.x + nx * 1.1 * side;
      const hz = p.z + nz * 1.1 * side;
      const house = this.box(1.1, 0.7, 0.8, 0xf1e3b5);
      house.position.set(hx, 0.35, hz);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.5, 4), this.mat(0xb0503a));
      roof.position.set(hx, 0.95, hz);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      const lampM = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 8),
        this.mat(0x554433, { emissive: 0x000000 }),
      );
      lampM.position.set(hx, 1.35, hz);
      this.stationLamps[i] = lampM;
      const lab = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(labelCanvas(st.name)),
          depthTest: false,
        }),
      );
      lab.scale.set(2, 0.5, 1);
      lab.position.set(hx, 1.75, hz);
      s.add(house, roof, lampM, lab);
    });
    // tanque de agua (secreto)
    this.tower = new THREE.Group();
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.6, 16),
      this.mat(0x8a5a3a),
    );
    tank.position.y = 1.3;
    for (const [lx, lz] of [
      [-0.3, -0.3],
      [0.3, -0.3],
      [-0.3, 0.3],
      [0.3, 0.3],
    ]) {
      const leg = this.box(0.06, 1, 0.06, 0x5a3a22);
      leg.position.set(lx, 0.5, lz);
      this.tower.add(leg);
    }
    this.tower.add(tank);
    this.tower.position.set(WATER_TOWER[0], 0, WATER_TOWER[1]);
    tank.userData.tower = true;
    s.add(this.tower);
    // tope de la vía muerta / terminal de Santa Marta
    this.terminal = new THREE.Group();
    const end = pointAt(SEGMENTS.spur, SEGMENTS.spur.len);
    const buffer = this.box(0.8, 0.4, 0.3, 0xd03030);
    buffer.position.set(end.x + end.dx * 0.2, 0.2, end.z + end.dz * 0.2);
    buffer.rotation.y = Math.atan2(end.dx, end.dz);
    s.add(buffer);
    const plat = this.box(0.7, 0.25, 2.2, 0xcfc6b0);
    const mid = pointAt(SEGMENTS.spur, SEGMENTS.spur.len * 0.74);
    plat.position.set(mid.x - mid.dz * 0.8, 0.12, mid.z + mid.dx * 0.8);
    plat.rotation.y = Math.atan2(mid.dx, mid.dz);
    this.terminal.add(plat);
    this.terminal.visible = false;
    s.add(this.terminal);
    this.yolima = this.figure(0xd8c8f0, 0x2a160c);
    this.yolima.position.set(mid.x - mid.dz * 0.8, 0.25, mid.z + mid.dx * 0.8);
    this.terminal.add(this.yolima);
    this.abelFig = this.figure(0x2e4a6b, 0x9a9a9a);
    this.abelFig.visible = false;
    s.add(this.abelFig);
    // tren: locomotora + dos coches
    this.train = [this.car(true, false), this.car(false, false), this.car(false, false)];
    // mano gigante
    this.handG = new THREE.Group();
    const skin = this.mat(0xd8a07a);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 2.6), skin);
    this.handG.add(palm);
    for (let k = 0; k < 4; k++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 1.6), skin);
      f.position.set(-0.8 + k * 0.53, 0, -2);
      this.handG.add(f);
    }
    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 1.2), skin);
    thumb.position.set(1.4, 0, -0.2);
    thumb.rotation.y = -0.6;
    this.handG.add(thumb);
    this.handG.visible = false;
    s.add(this.handG);
  }

  private figure(body: number, hair: number): THREE_NS.Group {
    const g = new this.T.Group();
    const b = new this.T.Mesh(new this.T.CylinderGeometry(0.12, 0.16, 0.5, 10), this.mat(body));
    b.position.y = 0.25;
    const h = new this.T.Mesh(new this.T.SphereGeometry(0.12, 12, 10), this.mat(0xc79470));
    h.position.y = 0.6;
    const hr = new this.T.Mesh(
      new this.T.SphereGeometry(0.13, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      this.mat(hair),
    );
    hr.position.y = 0.63;
    g.add(b, h, hr);
    g.traverse((o) => (o.castShadow = true));
    return g;
  }

  private buildTrack(id: SegId): THREE_NS.Group {
    const THREE = this.T;
    const sg = SEGMENTS[id];
    const g = new THREE.Group();
    const tieMat = this.mat(0x5a3a22);
    for (let s = 0.1; s < sg.len; s += 0.32) {
      const p = pointAt(sg, s);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.13), tieMat);
      tie.position.set(p.x, 0.05, p.z);
      tie.rotation.y = Math.atan2(p.dx, p.dz);
      tie.receiveShadow = true;
      g.add(tie);
    }
    const railMat = this.mat(0xc8c8d0, { metalness: 0.8, roughness: 0.3 });
    for (const off of [-0.2, 0.2]) {
      const pts: THREE_NS.Vector3[] = [];
      for (let s = 0; s <= sg.len + 0.001; s += 0.2) {
        const p = pointAt(sg, s);
        pts.push(new THREE.Vector3(p.x - p.dz * off, 0.11, p.z + p.dx * off));
      }
      if (pts.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, Math.max(8, pts.length * 2), 0.035, 6, false),
        railMat,
      );
      tube.castShadow = true;
      g.add(tube);
    }
    this.scene.add(g);
    return g;
  }

  private car(loco: boolean, ghost: boolean): THREE_NS.Group {
    const THREE = this.T;
    const g = new THREE.Group();
    const extra = ghost ? { transparent: true, opacity: 0.38, emissive: 0x334466 } : {};
    const body = this.box(0.62, 0.5, loco ? 1.1 : 1.0, ghost ? 0x8899bb : 0x1f7a5a, extra);
    body.position.y = 0.42;
    const stripe = this.box(0.64, 0.1, loco ? 1.12 : 1.02, ghost ? 0xaabbdd : 0xf4ead5, extra);
    stripe.position.y = 0.45;
    g.add(body, stripe);
    if (loco) {
      const cab = this.box(0.56, 0.22, 0.4, ghost ? 0x8899bb : 0x1f7a5a, extra);
      cab.position.set(0, 0.78, -0.25);
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 8),
        this.mat(0xfff6d0, { emissive: ghost ? 0x222244 : 0xffe9a0, ...extra }),
      );
      light.position.set(0, 0.45, 0.58);
      g.add(cab, light);
    } else if (!ghost) {
      for (let k = -1; k <= 1; k++) {
        for (const sx of [-0.32, 0.32]) {
          const w = this.box(0.02, 0.12, 0.18, 0xffd23f, {
            emissive: 0xffb030,
            emissiveIntensity: 0.8,
          });
          w.position.set(sx, 0.55, k * 0.3);
          g.add(w);
        }
      }
    }
    this.scene.add(g);
    return g;
  }

  setTrain(cars: CarPose[]): void {
    cars.forEach((c, i) => {
      const m = this.train[i];
      if (!m) return;
      m.position.set(c.x, 0.05, c.z);
      m.rotation.y = Math.atan2(c.dx, c.dz);
    });
  }

  setGhosts(ghosts: CarPose[][]): void {
    while (this.ghosts.length < ghosts.length)
      this.ghosts.push([this.car(true, true), this.car(false, true)]);
    this.ghosts.forEach((gs, i) => {
      const poses = ghosts[i];
      gs.forEach((m, k) => {
        const p = poses?.[k];
        m.visible = !!p;
        if (p) {
          m.position.set(p.x, 0.05, p.z);
          m.rotation.y = Math.atan2(p.dx, p.dz);
        }
      });
    });
  }

  setSwitch(id: SwitchId, diverted: boolean): void {
    const m = this.switches.get(id);
    if (m)
      (m.material as THREE_NS.MeshStandardMaterial).color.setHex(diverted ? 0xffa03a : 0x5fe0a0);
  }

  removeSeg(id: SegId, animate: boolean): void {
    const g = this.segGroups.get(id);
    if (!g) return;
    if (animate) this.removing.push({ g, t: 0 });
    else g.visible = false;
  }

  setStationLit(i: number, lit: boolean): void {
    const m = this.stationLamps[i];
    if (m) (m.material as THREE_NS.MeshStandardMaterial).emissive.setHex(lit ? 0xffd040 : 0x000000);
  }

  setTickets(t: { x: number; z: number; visible: boolean }[]): void {
    while (this.tickets.length < t.length) {
      const m = new this.T.Mesh(
        new this.T.PlaneGeometry(0.5, 0.3),
        this.mat(0xffd36b, { side: this.T.DoubleSide, emissive: 0x806020 }),
      );
      this.scene.add(m);
      this.tickets.push(m);
    }
    t.forEach((q, i) => {
      const m = this.tickets[i];
      m.visible = q.visible;
      m.position.set(q.x, 0.9, q.z);
    });
    for (let i = t.length; i < this.tickets.length; i++) this.tickets[i].visible = false;
  }

  showTerminal(on: boolean): void {
    this.terminal.visible = on;
  }

  setYolimaFigure(x: number, z: number, abelOff: boolean): void {
    this.abelFig.visible = abelOff;
    if (abelOff) this.abelFig.position.set(x, 0.25, z);
  }

  hand(x: number, z: number, phase: number): void {
    this.handG.visible = phase > 0 && phase < 1;
    const h = phase < 0.5 ? 9 - phase * 2 * 8.4 : 0.6 + (phase - 0.5) * 2 * 9;
    this.handG.position.set(x, h, z + 1);
  }

  pick(px: number, py: number): { sw?: SwitchId; tower?: boolean } {
    const ndc = new this.T.Vector2((px / 960) * 2 - 1, -(py / 540) * 2 + 1);
    this.ray.setFromCamera(ndc, this.cam);
    const targets: THREE_NS.Object3D[] = [...this.switches.values(), ...this.tower.children];
    const hit = this.ray.intersectObjects(targets, false)[0];
    if (!hit) return {};
    if (hit.object.userData.sw) return { sw: hit.object.userData.sw as SwitchId };
    return { tower: true };
  }

  rotate(dyaw: number): void {
    this.yaw = Math.max(-1.2, Math.min(1.2, this.yaw + dyaw));
  }

  render(t: number): void {
    const r = 17;
    this.cam.position.set(Math.sin(this.yaw) * r, 12.5, Math.cos(this.yaw) * r);
    this.cam.lookAt(0, 0, 0.6);
    for (const m of this.tickets) m.rotation.y = t * 2;
    for (const rm of this.removing) {
      rm.t += 0.016;
      rm.g.position.y = rm.t * 8;
      if (rm.t > 1.2) rm.g.visible = false;
    }
    this.removing = this.removing.filter((rm) => rm.t <= 1.2);
    this.renderer.render(this.scene, this.cam);
  }

  destroy(): void {
    this.renderer.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE_NS.Mesh;
      m.geometry?.dispose?.();
    });
    this.canvas.remove();
  }
}

/** Vista 2D de respaldo (sin WebGL): la maqueta vista desde arriba. */
export class View2D implements MaquetaView {
  private g: Phaser.GameObjects.Graphics;
  private removed = new Set<SegId>();
  private sw: Record<SwitchId, boolean> = { 1: false, 2: false, 3: false };
  private lit: boolean[] = [false, false, false, false];
  private train: CarPose[] = [];
  private ghosts: CarPose[][] = [];
  private tickets: { x: number; z: number; visible: boolean }[] = [];
  private terminal = false;
  private handP = { x: 0, z: 0, phase: 0 };
  private labels: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(5);
    STATIONS.forEach((st) => {
      const p = pointAt(SEGMENTS[st.seg], SEGMENTS[st.seg].len * st.at);
      const [x, y] = this.sxy(p.x, p.z);
      this.labels.push(
        scene.add
          .text(x, y - 34, st.name, {
            fontFamily: 'sans-serif',
            fontSize: '14px',
            color: '#f6efd8',
          })
          .setOrigin(0.5)
          .setDepth(6),
      );
    });
  }

  private sxy(x: number, z: number): [number, number] {
    return [480 + x * 42, 290 + z * 42];
  }

  setTrain(c: CarPose[]): void {
    this.train = c;
  }
  setGhosts(g: CarPose[][]): void {
    this.ghosts = g;
  }
  setSwitch(id: SwitchId, d: boolean): void {
    this.sw[id] = d;
  }
  removeSeg(id: SegId): void {
    this.removed.add(id);
  }
  setStationLit(i: number, lit: boolean): void {
    this.lit[i] = lit;
  }
  setTickets(t: { x: number; z: number; visible: boolean }[]): void {
    this.tickets = t;
  }
  showTerminal(on: boolean): void {
    this.terminal = on;
  }
  setYolimaFigure(): void {}
  hand(x: number, z: number, phase: number): void {
    this.handP = { x, z, phase };
  }
  pick(px: number, py: number): { sw?: SwitchId; tower?: boolean } {
    for (const id of [1, 2, 3] as SwitchId[]) {
      const [x, z] = SWITCH_POS[id];
      const [sx, sy] = this.sxy(x, z + (id === 2 ? 0.75 : -0.75));
      if (Math.hypot(px - sx, py - sy) < 26) return { sw: id };
    }
    const [tx, ty] = this.sxy(WATER_TOWER[0], WATER_TOWER[1]);
    if (Math.hypot(px - tx, py - ty) < 24) return { tower: true };
    return {};
  }
  rotate(): void {}
  render(): void {
    const g = this.g;
    g.clear();
    g.fillStyle(0x3f7a3a, 1);
    g.fillRoundedRect(40, 20, 880, 520, 20);
    for (const sg of Object.values(SEGMENTS)) {
      if (this.removed.has(sg.id)) continue;
      g.lineStyle(8, 0x5a3a22, 1);
      g.beginPath();
      sg.pts.forEach(([x, z], i) => {
        const [sx, sy] = this.sxy(x, z);
        if (i === 0) g.moveTo(sx, sy);
        else g.lineTo(sx, sy);
      });
      g.strokePath();
      g.lineStyle(2, 0xd0d0d8, 1);
      g.strokePath();
    }
    for (const id of [1, 2, 3] as SwitchId[]) {
      const [x, z] = SWITCH_POS[id];
      const [sx, sy] = this.sxy(x, z + (id === 2 ? 0.75 : -0.75));
      g.fillStyle(this.sw[id] ? 0xffa03a : 0x5fe0a0, 1);
      g.fillCircle(sx, sy, 16);
    }
    STATIONS.forEach((st, i) => {
      const p = pointAt(SEGMENTS[st.seg], SEGMENTS[st.seg].len * st.at);
      const [sx, sy] = this.sxy(p.x, p.z);
      g.fillStyle(this.lit[i] ? 0xffd040 : 0xf1e3b5, 1);
      g.fillRect(sx - 12, sy - 26, 24, 16);
    });
    const [tx, ty] = this.sxy(WATER_TOWER[0], WATER_TOWER[1]);
    g.fillStyle(0x8a5a3a, 1);
    g.fillCircle(tx, ty, 12);
    if (this.terminal) {
      const p = pointAt(SEGMENTS.spur, SEGMENTS.spur.len * 0.74);
      const [sx, sy] = this.sxy(p.x, p.z);
      g.fillStyle(0xcfc6b0, 1);
      g.fillRect(sx - 30, sy - 12, 60, 24);
    }
    for (const t of this.tickets) {
      if (!t.visible) continue;
      const [sx, sy] = this.sxy(t.x, t.z);
      g.fillStyle(0xffd36b, 1);
      g.fillRect(sx - 9, sy - 6, 18, 12);
    }
    const car = (c: CarPose, color: number, alpha: number) => {
      const [sx, sy] = this.sxy(c.x, c.z);
      g.fillStyle(color, alpha);
      g.fillCircle(sx, sy, 10);
    };
    this.train.forEach((c, i) => car(c, i === 0 ? 0x1f7a5a : 0xf4ead5, 1));
    for (const gs of this.ghosts) for (const c of gs) car(c, 0x8899bb, 0.5);
    if (this.handP.phase > 0 && this.handP.phase < 1) {
      const [sx, sy] = this.sxy(this.handP.x, this.handP.z);
      g.fillStyle(0xd8a07a, 0.6);
      g.fillEllipse(sx, sy, 120, 90);
    }
  }
  destroy(): void {
    this.g.destroy();
    for (const l of this.labels) l.destroy();
  }
}
