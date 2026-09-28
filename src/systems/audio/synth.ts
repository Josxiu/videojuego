/**
 * Sintetizador: instrumentos y percusiones hechos con osciladores y ruido.
 * Cada sueño suena con su propio «material»: marimba de salón para la escuela,
 * caja de música para las mudanzas, guitarra de patio, piano de juguete
 * desafinado para la pesadilla.
 */

export type Instrument =
  | 'square'
  | 'triangle'
  | 'sine'
  | 'saw'
  | 'marimba'
  | 'musicbox'
  | 'pluck'
  | 'toypiano'
  | 'pad'
  | 'bell'
  | 'hum'
  | 'bass'
  | 'flute';

export type DrumKind =
  'kick' | 'snare' | 'hat' | 'shaker' | 'box' | 'drop' | 'knock' | 'broom' | 'tick' | 'heart';

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

/** 'A4' → 440. Acepta sostenidos (#) y bemoles (b). */
export function noteFreq(note: string): number {
  const m = note.match(/^([A-G](?:#|b)?)(-?\d)$/);
  if (!m) return 440;
  const midi = NOTE_INDEX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class Synth {
  private noiseBuf?: AudioBuffer;

  constructor(private ctx: AudioContext) {}

  private noiseBuffer(): AudioBuffer {
    if (!this.noiseBuf) {
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuf;
  }

  /** Conecta un nodo a la mezcla seca y, si hay, a un envío de eco. */
  private out(node: AudioNode, dest: AudioNode, send?: AudioNode): void {
    node.connect(dest);
    if (send) node.connect(send);
  }

  /** Oscilador con envolvente percusiva (ataque corto, caída exponencial). */
  private osc(
    type: OscillatorType,
    f: number,
    when: number,
    decay: number,
    vol: number,
    dest: AudioNode,
    opts: { attack?: number; slideTo?: number; detune?: number } = {},
  ): OscillatorNode {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, when);
    if (opts.detune) o.detune.setValueAtTime(opts.detune, when);
    if (opts.slideTo)
      o.frequency.exponentialRampToValueAtTime(Math.max(opts.slideTo, 1), when + decay);
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + a);
    g.gain.exponentialRampToValueAtTime(0.0008, when + a + decay);
    o.connect(g);
    g.connect(dest);
    o.start(when);
    o.stop(when + a + decay + 0.05);
    return o;
  }

  /** Ráfaga de ruido filtrado. */
  noise(
    when: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    filter: { type: BiquadFilterType; freq: number; q?: number; sweepTo?: number },
    attack = 0.002,
  ): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const f = this.ctx.createBiquadFilter();
    f.type = filter.type;
    f.frequency.setValueAtTime(filter.freq, when);
    if (filter.sweepTo) f.frequency.exponentialRampToValueAtTime(filter.sweepTo, when + dur);
    f.Q.value = filter.q ?? 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, when + attack + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    const offset = Math.random() * 0.5;
    src.start(when, offset, attack + dur + 0.05);
  }

  /** Toca una nota con un instrumento. `dur` es la duración escrita en segundos. */
  play(
    inst: Instrument,
    f: number,
    when: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    send?: AudioNode,
  ): void {
    const bus = this.ctx.createGain();
    bus.gain.value = 1;
    this.out(bus, dest, send);
    switch (inst) {
      case 'square':
      case 'triangle':
      case 'sine':
        this.osc(inst, f, when, Math.max(dur * 1.6, 0.08), vol, bus, { attack: 0.01 });
        break;
      case 'saw':
        this.osc('sawtooth', f, when, Math.max(dur * 1.4, 0.08), vol * 0.7, bus, { attack: 0.01 });
        break;
      case 'marimba':
        this.osc('sine', f, when, 0.38, vol, bus, { attack: 0.002 });
        this.osc('sine', f * 4, when, 0.07, vol * 0.25, bus, { attack: 0.001 });
        this.osc('sine', f * 9.8, when, 0.025, vol * 0.08, bus, { attack: 0.001 });
        break;
      case 'musicbox':
        this.osc('sine', f, when, 1.3, vol, bus, { attack: 0.002 });
        this.osc('sine', f * 2, when, 0.6, vol * 0.28, bus, { attack: 0.002 });
        this.osc('sine', f * 3.01, when, 0.22, vol * 0.12, bus, { attack: 0.001 });
        break;
      case 'pluck': {
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3800, when);
        lp.frequency.exponentialRampToValueAtTime(500, when + 0.35);
        lp.connect(bus);
        this.osc('triangle', f, when, 0.7, vol, lp, { attack: 0.003 });
        this.osc('sawtooth', f, when, 0.3, vol * 0.18, lp, { attack: 0.003, detune: 4 });
        break;
      }
      case 'toypiano': {
        // Ligeramente desafinado, distinto cada vez: inquieta sin que se note por qué
        const cents = (Math.random() - 0.5) * 26;
        this.osc('square', f, when, 0.45, vol * 0.35, bus, { attack: 0.002, detune: cents });
        this.osc('sine', f * 1.004, when, 0.7, vol * 0.8, bus, { attack: 0.002, detune: cents });
        this.osc('sine', f * 3.9, when, 0.06, vol * 0.2, bus, { attack: 0.001 });
        break;
      }
      case 'pad': {
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1100;
        const g = this.ctx.createGain();
        const len = Math.max(dur, 0.3);
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(vol, when + Math.min(0.35, len * 0.4));
        g.gain.setValueAtTime(vol, when + len);
        g.gain.exponentialRampToValueAtTime(0.0008, when + len + 0.7);
        lp.connect(g);
        g.connect(bus);
        for (const det of [-8, 7]) {
          const o = this.ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f;
          o.detune.value = det;
          o.connect(lp);
          o.start(when);
          o.stop(when + len + 0.8);
        }
        break;
      }
      case 'bell':
        this.osc('sine', f, when, 2.2, vol, bus, { attack: 0.002 });
        this.osc('sine', f * 2.76, when, 1.0, vol * 0.35, bus, { attack: 0.002 });
        this.osc('sine', f * 5.4, when, 0.4, vol * 0.15, bus, { attack: 0.001 });
        break;
      case 'hum':
      case 'flute': {
        // Voz tarareada / flauta: vibrato que entra tarde, como alguien cantando bajito
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        o.type = inst === 'hum' ? 'triangle' : 'sine';
        o.frequency.value = f;
        lfo.frequency.value = 5.2;
        lfoGain.gain.setValueAtTime(0, when);
        lfoGain.gain.linearRampToValueAtTime(f * 0.006, when + 0.25);
        lfo.connect(lfoGain);
        lfoGain.connect(o.frequency);
        const len = Math.max(dur, 0.15);
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(vol, when + 0.07);
        g.gain.setValueAtTime(vol * 0.85, when + len);
        g.gain.exponentialRampToValueAtTime(0.0008, when + len + 0.25);
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = inst === 'hum' ? 1400 : 3000;
        o.connect(lp);
        lp.connect(g);
        g.connect(bus);
        o.start(when);
        lfo.start(when);
        o.stop(when + len + 0.3);
        lfo.stop(when + len + 0.3);
        if (inst === 'flute')
          this.noise(when, 0.08, vol * 0.08, bus, { type: 'bandpass', freq: f * 2, q: 2 });
        break;
      }
      case 'bass':
        this.osc('triangle', f, when, Math.max(dur * 1.2, 0.2), vol, bus, { attack: 0.01 });
        this.osc('sine', f / 2, when, Math.max(dur, 0.2), vol * 0.5, bus, { attack: 0.01 });
        break;
    }
  }

  /** Percusión. `pitch` opcional para las gotas y los golpes afinados. */
  drum(
    kind: DrumKind,
    when: number,
    vol: number,
    dest: AudioNode,
    pitch = 1,
    send?: AudioNode,
  ): void {
    const bus = this.ctx.createGain();
    this.out(bus, dest, send);
    switch (kind) {
      case 'kick':
        this.osc('sine', 150, when, 0.22, vol, bus, { slideTo: 42, attack: 0.001 });
        break;
      case 'snare':
        this.noise(when, 0.14, vol * 0.8, bus, { type: 'bandpass', freq: 1800, q: 0.8 });
        this.osc('triangle', 190, when, 0.07, vol * 0.5, bus, { attack: 0.001 });
        break;
      case 'hat':
        this.noise(when, 0.035, vol * 0.5, bus, { type: 'highpass', freq: 7000 });
        break;
      case 'shaker':
        this.noise(when, 0.07, vol * 0.45, bus, { type: 'bandpass', freq: 5200, q: 1.3 }, 0.012);
        break;
      case 'box':
        // Caja de cartón: golpe hueco
        this.osc('sine', 115 * pitch, when, 0.18, vol, bus, { slideTo: 68 * pitch, attack: 0.001 });
        this.noise(when, 0.09, vol * 0.5, bus, { type: 'lowpass', freq: 420 });
        break;
      case 'drop':
        // Gota: un «plic» que sube de tono
        this.osc('sine', 700 * pitch, when, 0.12, vol, bus, {
          slideTo: 1500 * pitch,
          attack: 0.001,
        });
        break;
      case 'knock':
        this.noise(when, 0.05, vol * 0.9, bus, { type: 'bandpass', freq: 950 * pitch, q: 3 });
        this.osc('sine', 230 * pitch, when, 0.07, vol * 0.7, bus, {
          slideTo: 170 * pitch,
          attack: 0.001,
        });
        break;
      case 'broom':
        // Escoba: un «shh» que barre
        this.noise(
          when,
          0.17,
          vol * 0.55,
          bus,
          { type: 'bandpass', freq: 2400, q: 1.1, sweepTo: 5200 },
          0.03,
        );
        break;
      case 'tick':
        this.noise(when, 0.018, vol * 0.6, bus, { type: 'highpass', freq: 3200 });
        this.osc('sine', 2400 * pitch, when, 0.015, vol * 0.25, bus, { attack: 0.001 });
        break;
      case 'heart':
        this.osc('sine', 62, when, 0.1, vol, bus, { slideTo: 40 });
        this.osc('sine', 56, when + 0.16, 0.12, vol * 0.8, bus, { slideTo: 36 });
        break;
    }
  }
}
