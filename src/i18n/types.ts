import type { Speaker } from '../systems/audio/Audio';

/** Una línea de diálogo: quién habla y qué dice (máximo dos líneas en pantalla). */
export type Line = [Speaker, string];

/** Un tiquete viejo: fecha, ruta y el recuerdo que guarda. */
export interface OldTicket {
  date: string;
  route: string;
  memory: string;
}

/** Textos comunes a todo sueño. */
export interface DreamTexts {
  title: string;
  owner: string;
  technique: string;
  /** Una frase de la ficha para la tarjeta de título. */
  tagline: string;
  /** Nombre de los tres actos. */
  acts: string[];
  intro: Line[];
  outro: Line[];
  secret: { name: string; lines: Line[] };
  /** Exactamente cinco (lo verifica un test). */
  tickets: OldTicket[];
  /** Página de la libreta: un párrafo por cada tiquete encontrado. */
  page: string;
  madrugada: string;
  /** Escena de llegada en el epílogo (con y sin secreto). */
  arrival: { base: string; secret: string };
}

/** Si algún día hay otro idioma, debe cumplir esta misma forma. */
export type Fmt = (s: string, vars: Record<string, string | number>) => string;

export const fmt: Fmt = (s, vars) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), s);
