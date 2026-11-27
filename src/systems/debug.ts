/**
 * Parámetros de depuración por URL para probar un tramo sin jugar todo:
 * ?scene=DreamReme&skip&act=2&madrugada&auto
 * - scene: escena de arranque · skip: sin tarjeta ni diálogo de entrada
 * - act: acto inicial · madrugada: variante difícil · auto: el sueño se juega solo (pruebas)
 * - all: marca todos los sueños como hechos (para probar el tren y los finales)
 */
const params =
  typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

export const debug = {
  flag(name: string): boolean {
    return params.has(name);
  },
  num(name: string, fallback: number): number {
    const v = params.get(name);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  },
  str(name: string): string | null {
    return params.get(name);
  },
};
