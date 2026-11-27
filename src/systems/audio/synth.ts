/**
 * Instrumentos sintetizados con Web Audio. Cada sueño tiene su «orquesta»:
 * tiple boyacense, marimba de chonta, piano, salsa, cumbia, tambora…
 */

export type Inst =
  | 'tiple'
  | 'marimba'
  | 'piano'
  | 'bass'
  | 'pad'
  | 'gaita'
  | 'accordion'
  | 'bell'
  | 'musicbox'
  | 'brass'
  | 'organ'
  | 'lead'
  | 'sub';

export type Drum =
  | 'kick'
  | 'snare'
  | 'hat'
  | 'clave'
  | 'conga'
  | 'congaLow'
  | 'guacharaca'
  | 'shaker'
  | 'tambora'
  | 'cowbell'
  | 'clack'
  | 'rim'
  | 'cununo'
  | 'tick';

const NOTE: Record<string, number> = {
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

/** «A4» → 440 Hz. */
export function freq(note: string): number {
  const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(note);
  if (!m) return 440;
  const midi = NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class Synth {
  private noise?: AudioBuffer;

  constructor(readonly ctx: AudioContext) {}

  noiseBuffer(): AudioBuffer {
    if (!this.noise) {
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number, s = 0.0001): void {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(s, 0.0001), t + a + d);
  }

  private osc(type: OscillatorType, f: number, t: number, end: number, out: AudioNode, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.detune.value = detune;
    o.connect(out);
    o.start(t);
    o.stop(end + 0.05);
    return o;
  }

  private noiseSrc(t: number, dur: number, out: AudioNode): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuffer();
    s.connect(out);
    s.start(t, Math.random() * 0.5, dur + 0.05);
    return s;
  }

  /** Toca una nota con un instrumento. `dur` en segundos. */
  note(inst: Inst, f: number, t: number, dur: number, vol: number, out: AudioNode): void {
    const c = this.ctx;
    const g = c.createGain();
    g.connect(out);
    switch (inst) {
      case 'tiple': {
        // Cuerdas dobladas: dos sierras filtradas, ataque seco.
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3200, t);
        lp.frequency.exponentialRampToValueAtTime(700, t + 0.35);
        lp.connect(g);
        this.osc('sawtooth', f, t, t + dur + 0.6, lp, -6);
        this.osc('sawtooth', f * 2, t, t + dur + 0.6, lp, 7);
        this.env(g, t, 0.004, vol * 0.5, 0.5 + dur * 0.6);
        break;
      }
      case 'marimba': {
        this.osc('sine', f, t, t + 0.9, g);
        const h = c.createGain();
        h.connect(out);
        this.osc('sine', f * 4, t, t + 0.12, h);
        this.env(h, t, 0.002, vol * 0.25, 0.08);
        this.env(g, t, 0.003, vol, 0.6);
        break;
      }
      case 'piano': {
        this.osc('triangle', f, t, t + dur + 1.4, g, -3);
        this.osc('triangle', f, t, t + dur + 1.4, g, 4);
        this.osc('sine', f * 2, t, t + dur + 0.6, g);
        this.env(g, t, 0.005, vol * 0.45, 0.9 + dur);
        break;
      }
      case 'bass': {
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 600;
        lp.connect(g);
        this.osc('sine', f, t, t + dur + 0.3, lp);
        this.osc('square', f, t, t + dur + 0.3, lp);
        this.env(g, t, 0.01, vol * 0.5, dur + 0.25);
        break;
      }
      case 'sub': {
        this.osc('sine', f, t, t + dur + 0.3, g);
        this.env(g, t, 0.02, vol * 0.8, dur + 0.3);
        break;
      }
      case 'pad': {
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1100;
        lp.connect(g);
        this.osc('sawtooth', f, t, t + dur + 1.2, lp, -9);
        this.osc('sawtooth', f, t, t + dur + 1.2, lp, 9);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol * 0.22, t + Math.min(0.6, dur * 0.5));
        g.gain.setValueAtTime(vol * 0.22, t + dur);
        g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.1);
        break;
      }
      case 'gaita': {
        // Gaita (flauta) con vibrato y soplido.
        const o = this.osc('sine', f, t, t + dur + 0.2, g);
        const lfo = c.createOscillator();
        const lg = c.createGain();
        lfo.frequency.value = 5.5;
        lg.gain.value = f * 0.012;
        lfo.connect(lg);
        lg.connect(o.frequency);
        lfo.start(t);
        lfo.stop(t + dur + 0.3);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = f * 2;
        bp.Q.value = 2;
        const ng = c.createGain();
        ng.gain.value = 0.15;
        bp.connect(ng);
        ng.connect(g);
        this.noiseSrc(t, dur, bp);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol * 0.5, t + 0.05);
        g.gain.setValueAtTime(vol * 0.45, t + dur);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
        break;
      }
      case 'accordion': {
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400;
        const trem = c.createGain();
        trem.connect(g);
        lp.connect(trem);
        const lfo = c.createOscillator();
        const lg = c.createGain();
        lfo.frequency.value = 6.2;
        lg.gain.value = 0.25;
        lfo.connect(lg);
        lg.connect(trem.gain);
        lfo.start(t);
        lfo.stop(t + dur + 0.2);
        this.osc('square', f, t, t + dur + 0.1, lp, -5);
        this.osc('sawtooth', f, t, t + dur + 0.1, lp, 6);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol * 0.3, t + 0.03);
        g.gain.setValueAtTime(vol * 0.28, t + dur);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
        break;
      }
      case 'bell': {
        this.osc('sine', f, t, t + 2.5, g);
        const h = c.createGain();
        h.connect(out);
        this.osc('sine', f * 2.76, t, t + 1.2, h);
        this.env(h, t, 0.002, vol * 0.3, 0.9);
        this.env(g, t, 0.002, vol * 0.6, 2.2);
        break;
      }
      case 'musicbox': {
        this.osc('sine', f * 2, t, t + 1.2, g);
        this.osc('sine', f * 6, t, t + 0.25, g);
        this.env(g, t, 0.001, vol * 0.4, 0.9);
        break;
      }
      case 'brass': {
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.linearRampToValueAtTime(2600, t + 0.05);
        lp.frequency.exponentialRampToValueAtTime(1200, t + dur + 0.1);
        lp.connect(g);
        this.osc('sawtooth', f, t, t + dur + 0.15, lp, -4);
        this.osc('sawtooth', f, t, t + dur + 0.15, lp, 5);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol * 0.35, t + 0.03);
        g.gain.setValueAtTime(vol * 0.3, t + dur);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
        break;
      }
      case 'organ': {
        this.osc('sine', f, t, t + dur + 0.1, g);
        this.osc('sine', f * 2, t, t + dur + 0.1, g);
        this.osc('sine', f * 3, t, t + dur + 0.1, g);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol * 0.18, t + 0.02);
        g.gain.setValueAtTime(vol * 0.18, t + dur);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
        break;
      }
      case 'lead': {
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1800;
        lp.connect(g);
        this.osc('square', f, t, t + dur + 0.1, lp);
        this.env(g, t, 0.01, vol * 0.25, dur + 0.05);
        break;
      }
    }
  }

  drum(kind: Drum, t: number, vol: number, out: AudioNode): void {
    const c = this.ctx;
    const g = c.createGain();
    g.connect(out);
    switch (kind) {
      case 'kick': {
        const o = this.osc('sine', 120, t, t + 0.3, g);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        this.env(g, t, 0.002, vol, 0.25);
        break;
      }
      case 'snare': {
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1500;
        hp.connect(g);
        this.noiseSrc(t, 0.2, hp);
        this.osc('triangle', 190, t, t + 0.08, g);
        this.env(g, t, 0.002, vol * 0.6, 0.16);
        break;
      }
      case 'hat': {
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7000;
        hp.connect(g);
        this.noiseSrc(t, 0.06, hp);
        this.env(g, t, 0.001, vol * 0.35, 0.04);
        break;
      }
      case 'shaker': {
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 5500;
        bp.connect(g);
        this.noiseSrc(t, 0.09, bp);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol * 0.4, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        break;
      }
      case 'guacharaca': {
        // Raspado: ráfagas cortas de ruido.
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 3200;
        bp.Q.value = 1.5;
        bp.connect(g);
        this.noiseSrc(t, 0.14, bp);
        g.gain.setValueAtTime(0.0001, t);
        for (let i = 0; i < 4; i++) {
          g.gain.linearRampToValueAtTime(vol * 0.5, t + i * 0.03 + 0.01);
          g.gain.linearRampToValueAtTime(vol * 0.08, t + i * 0.03 + 0.025);
        }
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        break;
      }
      case 'clave': {
        this.osc('sine', 2500, t, t + 0.06, g);
        this.osc('triangle', 1700, t, t + 0.05, g);
        this.env(g, t, 0.001, vol * 0.5, 0.05);
        break;
      }
      case 'rim': {
        this.osc('square', 1800, t, t + 0.03, g);
        this.env(g, t, 0.001, vol * 0.25, 0.025);
        break;
      }
      case 'conga':
      case 'congaLow':
      case 'cununo': {
        const base = kind === 'conga' ? 330 : kind === 'congaLow' ? 220 : 180;
        const o = this.osc('sine', base * 1.4, t, t + 0.3, g);
        o.frequency.exponentialRampToValueAtTime(base, t + 0.05);
        this.env(g, t, 0.002, vol * 0.6, kind === 'cununo' ? 0.3 : 0.22);
        break;
      }
      case 'tambora': {
        const o = this.osc('sine', 110, t, t + 0.4, g);
        o.frequency.exponentialRampToValueAtTime(65, t + 0.2);
        this.env(g, t, 0.002, vol * 0.9, 0.35);
        const g2 = c.createGain();
        g2.connect(out);
        this.osc('square', 900, t, t + 0.02, g2);
        this.env(g2, t, 0.001, vol * 0.12, 0.02);
        break;
      }
      case 'cowbell': {
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 800;
        bp.connect(g);
        this.osc('square', 540, t, t + 0.3, bp);
        this.osc('square', 800, t, t + 0.3, bp);
        this.env(g, t, 0.001, vol * 0.35, 0.25);
        break;
      }
      case 'clack': {
        // Rueda sobre la junta del riel: golpe sordo + chasquido metálico.
        const o = this.osc('sine', 80, t, t + 0.12, g);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2400;
        bp.Q.value = 6;
        const g2 = c.createGain();
        bp.connect(g2);
        g2.connect(out);
        this.noiseSrc(t, 0.04, bp);
        this.env(g2, t, 0.001, vol * 0.25, 0.04);
        this.env(g, t, 0.002, vol * 0.7, 0.1);
        break;
      }
      case 'tick': {
        this.osc('square', 3200, t, t + 0.015, g);
        this.env(g, t, 0.001, vol * 0.2, 0.012);
        break;
      }
    }
  }
}
