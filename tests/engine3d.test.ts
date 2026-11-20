import { describe, expect, it } from 'vitest';
import {
  clipNear,
  makeBoxFaces,
  makeOctahedronFaces,
  projectPoint,
  worldToView,
  type Camera3D,
} from '../src/gfx/engine3d';

const CAM: Camera3D = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, fov: Math.PI / 3 };

describe('motor 3D (Sueño 9)', () => {
  it('transforma puntos del mundo al espacio de cámara y los proyecta al centro', () => {
    const v = worldToView({ x: 0, y: 0, z: 4 }, CAM);
    expect(v).toEqual({ x: 0, y: 0, z: 4 });
    const [sx, sy] = projectPoint(v, 960, 540, CAM.fov);
    expect(sx).toBeCloseTo(480, 5);
    expect(sy).toBeCloseTo(270, 5);
  });

  it('recorta polígonos que cruzan el plano cercano', () => {
    const poly = [
      { x: -1, y: 0, z: -1 },
      { x: 1, y: 0, z: -1 },
      { x: 1, y: 0, z: 2 },
      { x: -1, y: 0, z: 2 },
    ];
    const clipped = clipNear(poly);
    expect(clipped.length).toBe(4);
    for (const p of clipped) expect(p.z).toBeGreaterThanOrEqual(0.18);
  });

  it('construye cajas y octaedros con caras válidas', () => {
    const box = makeBoxFaces(0, 1, 5, 2, 2, 2, [200, 210, 220]);
    expect(box.length).toBe(6);
    const openBox = makeBoxFaces(0, 1, 5, 2, 2, 2, [200, 210, 220], {
      skipBottom: true,
      skipTop: true,
    });
    expect(openBox.length).toBe(4);
    const oct = makeOctahedronFaces(0, 0, 5, 0.5, 1, [255, 210, 100]);
    expect(oct.length).toBe(8);
  });
});
