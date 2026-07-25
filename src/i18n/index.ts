import { es, TextKey } from './es';

// Un solo idioma por ahora; agregar más = otro diccionario y un selector aquí.
const dict: Record<TextKey, string> = es;

/** Devuelve el texto para una clave, con reemplazo de {variables}. */
export function t(key: TextKey, vars?: Record<string, string | number>): string {
  let out: string = dict[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}

export type { TextKey };
