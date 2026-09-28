/**
 * Parámetros de depuración por URL, para probar un tramo concreto sin jugar
 * todo desde el principio. Ejemplo: ?scene=DreamExam&at=3400&skip&god
 *
 * - `at`   : posición de arranque (cada sueño la interpreta a su modo)
 * - `skip` : salta tarjeta de título y diálogos de entrada
 * - `god`  : no se puede perder
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
};
