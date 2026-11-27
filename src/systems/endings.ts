import type { SaveData } from './save';
import { secretCount, ticketCount } from './save';

export type EndingId = 'via_muerta' | 'cada_quien' | 'anden_lleno' | 'trasnocho';

/** Umbrales de los finales (ver docs/biblia.md §7). */
export const ENDING_RULES = {
  andenTickets: 16,
  trasnochoTickets: 34,
  trasnochoSecrets: 6,
} as const;

export function computeEnding(s: SaveData): EndingId {
  if (s.abelChoice === 'quedarse') return 'via_muerta';
  const tickets = ticketCount(s);
  if (s.abelChoice !== 'bajar' || tickets < ENDING_RULES.andenTickets) return 'cada_quien';
  if (tickets >= ENDING_RULES.trasnochoTickets && secretCount(s) >= ENDING_RULES.trasnochoSecrets) {
    return 'trasnocho';
  }
  return 'anden_lleno';
}
