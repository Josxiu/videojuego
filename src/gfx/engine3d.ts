/**
 * Motor de proyección 3D ligero sobre Canvas 2D para el Sueño 9 (La Cámara Anecoica 3D).
 *
 * Funciona tanto con WebGL como con el fallback Canvas sin dependencias externas:
 * - Cámara en primera persona (x, y, z, yaw, pitch)
 * - Recorte contra plano cercano (near-plane clipping) para evitar deformaciones
 * - Ordenamiento por profundidad (painter's algorithm) e iluminación con niebla
 * - Ondas de ecolocalización 3D que iluminan la geometría oculta al expandirse
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Face3D {
  pts: Vec3[];
  color: [number, number, number];
  stroke?: [number, number, number];
  alpha?: number;
  /** Emisión propia (no se oscurece con la distancia ni exige eco). */
  emissive?: number;
  /** Cara secreta/oculta: solo brilla cuando pasa la onda del eco cerca. */
  echoOnly?: boolean;
}

export interface EchoWave3D {
  origin: Vec3;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: [number, number, number];
}

export interface Camera3D {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  fov: number;
}

const NEAR = 0.18;

/** Transforma un punto del mundo al espacio de la cámara (+Z adelante, +X derecha, +Y arriba). */
export function worldToView(p: Vec3, cam: Camera3D): Vec3 {
  const dx = p.x - cam.x;
  const dy = p.y - cam.y;
  const dz = p.z - cam.z;
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const vx = dx * cy - dz * sy;
  const vz0 = dx * sy + dz * cy;
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const vy = dy * cp - vz0 * sp;
  const vz = dy * sp + vz0 * cp;
  return { x: vx, y: vy, z: vz };
}

/** Recorta un polígono en espacio de cámara contra z >= NEAR (Sutherland-Hodgman). */
export function clipNear(poly: Vec3[]): Vec3[] {
  if (poly.length < 3) return [];
  const out: Vec3[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const aIn = a.z >= NEAR;
    const bIn = b.z >= NEAR;
    if (aIn && bIn) {
      out.push(b);
    } else if (aIn && !bIn) {
      const t = (NEAR - a.z) / (b.z - a.z);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: NEAR });
    } else if (!aIn && bIn) {
      const t = (NEAR - a.z) / (b.z - a.z);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: NEAR });
      out.push(b);
    }
  }
  return out;
}

/** Proyecta un punto de vista 3D a coordenadas de pantalla 2D. */
export function projectPoint(v: Vec3, w: number, h: number, fov: number): [number, number] {
  const f = (h * 0.5) / Math.tan(fov * 0.5);
  return [w * 0.5 + (v.x / v.z) * f, h * 0.5 - (v.y / v.z) * f];
}

/** Construye las 6 caras (o las laterales) de un prisma rectangular 3D. */
export function makeBoxFaces(
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  color: [number, number, number],
  opts: {
    stroke?: [number, number, number];
    alpha?: number;
    emissive?: number;
    echoOnly?: boolean;
    skipBottom?: boolean;
    skipTop?: boolean;
  } = {},
): Face3D[] {
  const hx = sx * 0.5;
  const hy = sy * 0.5;
  const hz = sz * 0.5;
  const v = (dx: number, dy: number, dz: number): Vec3 => ({
    x: cx + dx * hx,
    y: cy + dy * hy,
    z: cz + dz * hz,
  });
  const p000 = v(-1, -1, -1);
  const p100 = v(1, -1, -1);
  const p110 = v(1, 1, -1);
  const p010 = v(-1, 1, -1);
  const p001 = v(-1, -1, 1);
  const p101 = v(1, -1, 1);
  const p111 = v(1, 1, 1);
  const p011 = v(-1, 1, 1);

  const shade = (k: number): [number, number, number] => [
    Math.round(color[0] * k),
    Math.round(color[1] * k),
    Math.round(color[2] * k),
  ];

  const faces: Face3D[] = [
    { pts: [p000, p010, p110, p100], color: shade(0.92), ...opts },
    { pts: [p101, p111, p011, p001], color: shade(0.86), ...opts },
    { pts: [p001, p011, p010, p000], color: shade(0.76), ...opts },
    { pts: [p100, p110, p111, p101], color: shade(0.82), ...opts },
  ];
  if (!opts.skipTop) faces.push({ pts: [p010, p011, p111, p110], color: shade(1.0), ...opts });
  if (!opts.skipBottom) faces.push({ pts: [p001, p000, p100, p101], color: shade(0.66), ...opts });
  return faces;
}

/** Construye una pirámide/cuña acústica de pared o flotante. */
export function makeOctahedronFaces(
  cx: number,
  cy: number,
  cz: number,
  r: number,
  h: number,
  color: [number, number, number],
  opts: { stroke?: [number, number, number]; emissive?: number; alpha?: number } = {},
): Face3D[] {
  const top: Vec3 = { x: cx, y: cy + h, z: cz };
  const bot: Vec3 = { x: cx, y: cy - h, z: cz };
  const n: Vec3 = { x: cx, y: cy, z: cz + r };
  const s: Vec3 = { x: cx, y: cy, z: cz - r };
  const e: Vec3 = { x: cx + r, y: cy, z: cz };
  const w: Vec3 = { x: cx - r, y: cy, z: cz };
  const k = (m: number): [number, number, number] => [
    Math.min(255, Math.round(color[0] * m)),
    Math.min(255, Math.round(color[1] * m)),
    Math.min(255, Math.round(color[2] * m)),
  ];
  return [
    { pts: [top, n, e], color: k(1.0), ...opts },
    { pts: [top, e, s], color: k(0.84), ...opts },
    { pts: [top, s, w], color: k(0.72), ...opts },
    { pts: [top, w, n], color: k(0.9), ...opts },
    { pts: [bot, e, n], color: k(0.68), ...opts },
    { pts: [bot, s, e], color: k(0.58), ...opts },
    { pts: [bot, w, s], color: k(0.52), ...opts },
    { pts: [bot, n, w], color: k(0.62), ...opts },
  ];
}

export interface Render3DOpts {
  fogColor: [number, number, number];
  fogMax: number;
  ambientLight: number;
  floorColor: string;
  ceilingColor: string;
  gridColor: string;
  echoWaves: EchoWave3D[];
}

/** Dibuja una escena 3D completa sobre un CanvasRenderingContext2D. */
export function renderScene3D(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cam: Camera3D,
  faces: Face3D[],
  opts: Render3DOpts,
): void {
  const horizonOffset = Math.tan(cam.pitch) * ((h * 0.5) / Math.tan(cam.fov * 0.5));
  const hy = Math.max(0, Math.min(h, h * 0.5 + horizonOffset));

  // Cielo / techo y suelo con degradado hacia la niebla del horizonte
  const gTop = ctx.createLinearGradient(0, 0, 0, hy);
  gTop.addColorStop(0, opts.ceilingColor);
  gTop.addColorStop(1, `rgb(${opts.fogColor.join(',')})`);
  ctx.fillStyle = gTop;
  ctx.fillRect(0, 0, w, hy);

  const gBot = ctx.createLinearGradient(0, hy, 0, h);
  gBot.addColorStop(0, `rgb(${opts.fogColor.join(',')})`);
  gBot.addColorStop(1, opts.floorColor);
  ctx.fillStyle = gBot;
  ctx.fillRect(0, hy, w, h - hy);

  // Rejilla de perspectiva sobre el piso (y = 0)
  drawFloorGrid(ctx, w, h, cam, opts.gridColor);

  // Transformar, recortar y ordenar caras por profundidad
  interface ProjectedFace {
    pts: [number, number][];
    depth: number;
    fill: string;
    stroke?: string;
    alpha: number;
  }
  const list: ProjectedFace[] = [];

  for (const face of faces) {
    // Centro del polígono en mundo para calcular iluminación por onda de eco
    let wx = 0;
    let wy = 0;
    let wz = 0;
    for (const p of face.pts) {
      wx += p.x;
      wy += p.y;
      wz += p.z;
    }
    wx /= face.pts.length;
    wy /= face.pts.length;
    wz /= face.pts.length;

    let echoBoost = 0;
    let echoTint: [number, number, number] | undefined;
    for (const wave of opts.echoWaves) {
      const dist = Math.hypot(wx - wave.origin.x, wy - wave.origin.y, wz - wave.origin.z);
      const band = Math.abs(dist - wave.radius);
      if (band < 2.2) {
        const strength = (1 - band / 2.2) * wave.alpha;
        if (strength > echoBoost) {
          echoBoost = strength;
          echoTint = wave.color;
        }
      }
    }

    if (face.echoOnly && echoBoost < 0.08) continue;

    const viewPts = face.pts.map((p) => worldToView(p, cam));
    const clipped = clipNear(viewPts);
    if (clipped.length < 3) continue;

    let depthSum = 0;
    for (const vp of clipped) depthSum += vp.z;
    const depth = depthSum / clipped.length;
    if (depth > opts.fogMax * 1.2) continue;

    const fogT = Math.min(1, Math.max(0, (depth - 1.5) / (opts.fogMax - 1.5)));
    const light = Math.min(1, opts.ambientLight + (face.emissive ?? 0) + echoBoost * 0.9);

    let r = face.color[0] * light;
    let g = face.color[1] * light;
    let b = face.color[2] * light;
    if (echoTint && echoBoost > 0.05) {
      r = r * (1 - echoBoost * 0.55) + echoTint[0] * echoBoost * 0.55;
      g = g * (1 - echoBoost * 0.55) + echoTint[1] * echoBoost * 0.55;
      b = b * (1 - echoBoost * 0.55) + echoTint[2] * echoBoost * 0.55;
    }
    const fr = Math.round(r * (1 - fogT) + opts.fogColor[0] * fogT);
    const fg = Math.round(g * (1 - fogT) + opts.fogColor[1] * fogT);
    const fb = Math.round(b * (1 - fogT) + opts.fogColor[2] * fogT);

    const alpha = (face.alpha ?? 1) * (face.echoOnly ? Math.min(1, echoBoost * 1.6) : 1);
    const pts = clipped.map((vp) => projectPoint(vp, w, h, cam.fov));

    let stroke: string | undefined;
    if (face.stroke || echoBoost > 0.25) {
      const sc = echoTint && echoBoost > 0.25 ? echoTint : (face.stroke ?? face.color);
      const sr = Math.round(sc[0] * (1 - fogT) + opts.fogColor[0] * fogT);
      const sg = Math.round(sc[1] * (1 - fogT) + opts.fogColor[1] * fogT);
      const sb = Math.round(sc[2] * (1 - fogT) + opts.fogColor[2] * fogT);
      stroke = `rgb(${sr},${sg},${sb})`;
    }

    list.push({ pts, depth, fill: `rgb(${fr},${fg},${fb})`, stroke, alpha });
  }

  list.sort((a, b) => b.depth - a.depth);
  for (const f of list) {
    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = f.fill;
    ctx.beginPath();
    ctx.moveTo(f.pts[0][0], f.pts[0][1]);
    for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
    ctx.closePath();
    ctx.fill();
    if (f.stroke) {
      ctx.strokeStyle = f.stroke;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Anillos visibles de ondas de ecolocalización proyectados en el suelo
  for (const wave of opts.echoWaves) {
    drawEchoRing3D(ctx, w, h, cam, wave);
  }
}

function drawFloorGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cam: Camera3D,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const step = 2;
  const minX = Math.floor((cam.x - 16) / step) * step;
  const maxX = minX + 32;
  const minZ = Math.floor((cam.z - 16) / step) * step;
  const maxZ = minZ + 32;

  const drawSeg = (a: Vec3, b: Vec3) => {
    let va = worldToView(a, cam);
    let vb = worldToView(b, cam);
    if (va.z < NEAR && vb.z < NEAR) return;
    if (va.z < NEAR) {
      const t = (NEAR - va.z) / (vb.z - va.z);
      va = { x: va.x + (vb.x - va.x) * t, y: va.y + (vb.y - va.y) * t, z: NEAR };
    } else if (vb.z < NEAR) {
      const t = (NEAR - vb.z) / (va.z - vb.z);
      vb = { x: vb.x + (va.x - vb.x) * t, y: vb.y + (va.y - vb.y) * t, z: NEAR };
    }
    const pa = projectPoint(va, w, h, cam.fov);
    const pb = projectPoint(vb, w, h, cam.fov);
    ctx.beginPath();
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
    ctx.stroke();
  };

  for (let gx = minX; gx <= maxX; gx += step) {
    drawSeg({ x: gx, y: 0, z: minZ }, { x: gx, y: 0, z: maxZ });
  }
  for (let gz = minZ; gz <= maxZ; gz += step) {
    drawSeg({ x: minX, y: 0, z: gz }, { x: maxX, y: 0, z: gz });
  }
  ctx.restore();
}

function drawEchoRing3D(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cam: Camera3D,
  wave: EchoWave3D,
): void {
  const segs = 28;
  ctx.save();
  ctx.strokeStyle = `rgba(${wave.color.join(',')}, ${Math.min(1, wave.alpha * 0.9)})`;
  ctx.lineWidth = 2.4;
  for (let i = 0; i < segs; i++) {
    const a1 = (i / segs) * Math.PI * 2;
    const a2 = ((i + 1) / segs) * Math.PI * 2;
    const p1 = worldToView(
      {
        x: wave.origin.x + Math.cos(a1) * wave.radius,
        y: 0.08,
        z: wave.origin.z + Math.sin(a1) * wave.radius,
      },
      cam,
    );
    const p2 = worldToView(
      {
        x: wave.origin.x + Math.cos(a2) * wave.radius,
        y: 0.08,
        z: wave.origin.z + Math.sin(a2) * wave.radius,
      },
      cam,
    );
    if (p1.z < NEAR || p2.z < NEAR) continue;
    const s1 = projectPoint(p1, w, h, cam.fov);
    const s2 = projectPoint(p2, w, h, cam.fov);
    ctx.beginPath();
    ctx.moveTo(s1[0], s1[1]);
    ctx.lineTo(s2[0], s2[1]);
    ctx.stroke();
  }
  ctx.restore();
}
