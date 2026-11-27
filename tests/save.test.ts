import { describe, expect, it } from 'vitest';
import {
  Save,
  clockMinutes,
  formatClock,
  freshSave,
  sanitize,
  secretCount,
  ticketCount,
  trainAct,
} from '../src/systems/save';
import { computeEnding } from '../src/systems/endings';
import { DREAMS } from '../src/config';

class MemStore {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

describe('guardado', () => {
  it('una partida nueva empieza vacía en el acto I', () => {
    const s = freshSave();
    expect(ticketCount(s)).toBe(0);
    expect(trainAct(s)).toBe(1);
    expect(formatClock(clockMinutes(s))).toBe('2:47');
  });

  it('repara datos rotos o viejos', () => {
    const s = sanitize({
      dreams: { reme: { done: 1, tickets: [0, 0, 9, -1, 2, 'x'] } },
      abelChoice: 'otra',
    });
    expect(s.dreams.reme.done).toBe(true);
    expect(s.dreams.reme.tickets).toEqual([0, 2]);
    expect(s.abelChoice).toBeNull();
    expect(s.dreams.samu.done).toBe(false);
    expect(sanitize('basura').version).toBe(1);
  });

  it('guarda y carga, y no duplica tiquetes', () => {
    const store = new MemStore();
    Save.data = freshSave();
    expect(Save.addTicket('reme', 3)).toBe(true);
    expect(Save.addTicket('reme', 3)).toBe(false);
    Save.write(store);
    Save.data = freshSave();
    Save.load(store);
    expect(Save.data.dreams.reme.tickets).toEqual([3]);
  });

  it('los actos del tren avanzan con los sueños', () => {
    const s = freshSave();
    s.dreams.reme.done = s.dreams.samu.done = s.dreams.marisol.done = true;
    expect(trainAct(s)).toBe(2);
    s.dreams.jairo.done = s.dreams.chepe.done = s.dreams.efrain.done = true;
    expect(trainAct(s)).toBe(3);
    s.dreams.abel.done = s.dreams.celeste.done = true;
    expect(trainAct(s)).toBe(4);
  });
});

describe('finales', () => {
  const withTickets = (n: number, secrets = 0) => {
    const s = freshSave();
    let left = n;
    for (const d of DREAMS) {
      const k = Math.min(5, left);
      s.dreams[d].tickets = [0, 1, 2, 3, 4].slice(0, k);
      left -= k;
    }
    DREAMS.slice(0, secrets).forEach((d) => (s.dreams[d].secret = true));
    return s;
  };

  it('quedarse en el tren es Vía muerta, haga lo que haga', () => {
    const s = withTickets(40, 8);
    s.abelChoice = 'quedarse';
    expect(computeEnding(s)).toBe('via_muerta');
  });

  it('dejar a Abel solo o tener pocos tiquetes es Cada quien a lo suyo', () => {
    const s = withTickets(40, 8);
    s.abelChoice = 'solo';
    expect(computeEnding(s)).toBe('cada_quien');
    const t = withTickets(15);
    t.abelChoice = 'bajar';
    expect(computeEnding(t)).toBe('cada_quien');
  });

  it('bajarse con Abel con tiquetes suficientes es Andén lleno; con casi todo, Trasnocho', () => {
    const s = withTickets(16);
    s.abelChoice = 'bajar';
    expect(computeEnding(s)).toBe('anden_lleno');
    const t = withTickets(34, 6);
    t.abelChoice = 'bajar';
    expect(ticketCount(t)).toBe(34);
    expect(secretCount(t)).toBe(6);
    expect(computeEnding(t)).toBe('trasnocho');
    const u = withTickets(34, 5);
    u.abelChoice = 'bajar';
    expect(computeEnding(u)).toBe('anden_lleno');
  });
});
