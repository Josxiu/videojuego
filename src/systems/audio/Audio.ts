import { Synth, freq, type Drum, type Inst } from './synth';
import { TRACKS, type TrackId, type Track } from './tracks';

export type Sfx =
  | 'tap'
  | 'punch'
  | 'ticket'
  | 'secret'
  | 'stamp'
  | 'door'
  | 'whistle'
  | 'step'
  | 'fail'
  | 'success'
  | 'pickup'
  | 'whoosh'
  | 'thud'
  | 'pop'
  | 'squish'
  | 'zap'
  | 'buzz'
  | 'bumper'
  | 'flip'
  | 'drain'
  | 'splash'
  | 'coin'
  | 'crack'
  | 'chalk'
  | 'switch'
  | 'brake'
  | 'select'
  | 'open'
  | 'page';

export type Speaker =
  | 'celeste'
  | 'mecha'
  | 'abel'
  | 'reme'
  | 'samu'
  | 'marisol'
  | 'jairo'
  | 'chepe'
  | 'efrain'
  | 'wilmer'
  | 'daniela'
  | 'carmenza'
  | 'yolima'
  | 'ananias'
  | 'altavoz'
  | 'jefe'
  | 'narra';

interface VoiceDef {
  type: OscillatorType;
  base: number;
  spread: number;
  dur: number;
  vol: number;
}

/** Timbre de cada personaje para los «blips» del diálogo. */
const VOICES: Record<Speaker, VoiceDef> = {
  celeste: { type: 'triangle', base: 520, spread: 90, dur: 0.05, vol: 0.18 },
  mecha: { type: 'sine', base: 880, spread: 220, dur: 0.06, vol: 0.14 },
  abel: { type: 'triangle', base: 170, spread: 30, dur: 0.09, vol: 0.22 },
  reme: { type: 'sine', base: 360, spread: 120, dur: 0.08, vol: 0.18 },
  samu: { type: 'square', base: 640, spread: 160, dur: 0.04, vol: 0.08 },
  marisol: { type: 'triangle', base: 440, spread: 40, dur: 0.045, vol: 0.17 },
  // El electrolaringe: zumbido de tono fijo.
  jairo: { type: 'sawtooth', base: 150, spread: 0, dur: 0.07, vol: 0.07 },
  chepe: { type: 'square', base: 210, spread: 60, dur: 0.06, vol: 0.07 },
  efrain: { type: 'sine', base: 260, spread: 50, dur: 0.1, vol: 0.2 },
  wilmer: { type: 'triangle', base: 200, spread: 50, dur: 0.07, vol: 0.2 },
  daniela: { type: 'triangle', base: 600, spread: 100, dur: 0.05, vol: 0.15 },
  carmenza: { type: 'sine', base: 420, spread: 80, dur: 0.08, vol: 0.17 },
  yolima: { type: 'triangle', base: 480, spread: 70, dur: 0.06, vol: 0.16 },
  ananias: { type: 'sine', base: 190, spread: 30, dur: 0.1, vol: 0.18 },
  altavoz: { type: 'square', base: 180, spread: 20, dur: 0.08, vol: 0.05 },
  jefe: { type: 'square', base: 240, spread: 50, dur: 0.06, vol: 0.06 },
  narra: { type: 'sine', base: 300, spread: 0, dur: 0.02, vol: 0.0 },
};

class AudioEngine {
  ctx?: AudioContext;
  synth?: Synth;
  muted = false;
  private master?: GainNode;
  private musicBus?: GainNode;
  private sfxBus?: GainNode;
  private lowpass?: BiquadFilterNode;
  private track?: Track;
  private trackId?: TrackId;
  private layerGains: GainNode[] = [];
  private trackGain?: GainNode;
  private trackStart = 0;
  private nextStep = 0;
  private timer?: number;
  private levelNow = 0;
  private lastVoice = 0;

  ensure(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.synth = new Synth(this.ctx);
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      this.lowpass = this.ctx.createBiquadFilter();
      this.lowpass.type = 'lowpass';
      this.lowpass.frequency.value = 20000;
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.55;
      this.musicBus.connect(this.lowpass);
      this.lowpass.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.8;
      this.sfxBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.trackId && !this.timer) this.startTimer();
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  now(): number {
    return this.ctx?.currentTime ?? performance.now() / 1000;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  /** Filtro pasa-bajas sobre la música (null = abierto). */
  muffle(hz: number | null, time = 0.4): void {
    if (!this.lowpass || !this.ctx) return;
    this.lowpass.frequency.setTargetAtTime(hz ?? 20000, this.ctx.currentTime, time / 3);
  }

  // ---------- Música ----------

  music(id: TrackId, level = 0): void {
    if (this.trackId === id) {
      this.level(level);
      return;
    }
    this.stop(0.6);
    this.trackId = id;
    this.track = TRACKS[id];
    this.levelNow = level;
    if (this.ctx) this.startTimer();
  }

  private startTimer(): void {
    if (!this.ctx || !this.track || !this.musicBus) return;
    const tr = this.track;
    this.trackGain = this.ctx.createGain();
    this.trackGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.trackGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.8);
    this.trackGain.connect(this.musicBus);
    this.layerGains = tr.layers.map((l) => {
      const g = this.ctx!.createGain();
      g.gain.value = l.lvl <= this.levelNow ? 1 : 0;
      g.connect(this.trackGain!);
      return g;
    });
    this.trackStart = this.ctx.currentTime + 0.08;
    this.nextStep = 0;
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  level(n: number): void {
    this.levelNow = n;
    if (!this.track || !this.ctx) return;
    this.track.layers.forEach((l, i) => {
      const g = this.layerGains[i];
      if (g) g.gain.setTargetAtTime(l.lvl <= n ? 1 : 0, this.ctx!.currentTime, 0.3);
    });
  }

  get musicLevel(): number {
    return this.levelNow;
  }

  stop(fade = 0.8): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = undefined;
    if (this.trackGain && this.ctx) {
      const g = this.trackGain;
      g.gain.cancelScheduledValues(this.ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + fade);
      window.setTimeout(() => g.disconnect(), (fade + 0.2) * 1000);
    }
    this.trackGain = undefined;
    this.track = undefined;
    this.trackId = undefined;
    this.muffle(null, 0.1);
  }

  /** Reloj de la música en curso: para sincronizar mecánicas al compás. */
  clock(): { start: number; stepDur: number; steps: number } | null {
    if (!this.track || !this.ctx) return null;
    return { start: this.trackStart, stepDur: this.stepDur(this.track), steps: this.track.steps };
  }

  private stepDur(tr: Track): number {
    return 60 / tr.bpm / tr.spb;
  }

  private schedule(): void {
    if (!this.ctx || !this.track || !this.synth) return;
    const tr = this.track;
    const sd = this.stepDur(tr);
    const horizon = this.ctx.currentTime + 0.15;
    while (this.trackStart + this.nextStep * sd < horizon) {
      const step = this.nextStep % tr.steps;
      let t = this.trackStart + this.nextStep * sd;
      if (tr.swing && step % 2 === 1) t += sd * tr.swing;
      tr.layers.forEach((l, i) => {
        const out = this.layerGains[i];
        if (!out || out.gain.value < 0.01) return;
        const tok = l.tokens[step % l.tokens.length];
        if (!tok || tok === '.') return;
        if (l.drum) {
          const v = tok === 'X' ? l.vol * 1.4 : tok === 'o' ? l.vol * 0.5 : l.vol;
          this.synth!.drum(l.drum, t, v, out);
        } else if (l.inst) {
          const [notes, mult] = tok.split('~');
          const dur = sd * (mult ? parseFloat(mult) : (l.len ?? 1));
          for (const n of notes.split(',')) this.synth!.note(l.inst, freq(n), t, dur, l.vol, out);
        }
      });
      this.nextStep++;
    }
  }

  // ---------- Efectos ----------

  note(inst: Inst, n: string, vol = 0.5, dur = 0.3, delay = 0): void {
    if (!this.ctx || !this.synth || !this.sfxBus) return;
    this.synth.note(inst, freq(n), this.ctx.currentTime + delay, dur, vol, this.sfxBus);
  }

  drum(kind: Drum, vol = 0.5, delay = 0): void {
    if (!this.ctx || !this.synth || !this.sfxBus) return;
    this.synth.drum(kind, this.ctx.currentTime + delay, vol, this.sfxBus);
  }

  private beep(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    if (!this.ctx || !this.sfxBus) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hiss(
    dur: number,
    vol: number,
    fq: number,
    q = 1,
    delay = 0,
    type: BiquadFilterType = 'bandpass',
  ) {
    if (!this.ctx || !this.sfxBus || !this.synth) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.synth.noiseBuffer();
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = fq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    s.start(t, Math.random() * 0.4, dur + 0.05);
  }

  sfx(id: Sfx, pitch = 1): void {
    if (!this.ctx) return;
    const p = pitch;
    switch (id) {
      case 'tap':
        this.beep('triangle', 900 * p, 700 * p, 0.05, 0.15);
        break;
      case 'select':
        this.beep('triangle', 600 * p, 900 * p, 0.08, 0.15);
        break;
      case 'punch':
        this.beep('square', 2600, 1800, 0.03, 0.12);
        this.drum('clack', 0.6);
        this.hiss(0.05, 0.3, 5000, 3, 0.02);
        break;
      case 'ticket':
        ['E5', 'G5', 'B5', 'E6'].forEach((n, i) => this.note('bell', n, 0.25, 0.2, i * 0.06));
        break;
      case 'secret':
        ['C5', 'G5', 'E6', 'C6', 'G6'].forEach((n, i) => this.note('bell', n, 0.3, 0.3, i * 0.11));
        break;
      case 'stamp':
        this.drum('kick', 0.9);
        this.hiss(0.08, 0.3, 900, 1);
        break;
      case 'door':
        this.hiss(0.35, 0.25, 600, 0.8, 0, 'lowpass');
        this.drum('rim', 0.5, 0.3);
        break;
      case 'whistle': {
        if (!this.synth || !this.sfxBus) return;
        const t = this.ctx.currentTime;
        for (const n of ['A3', 'C#4', 'E4'])
          this.synth.note('organ', freq(n), t, 1.1, 0.9, this.sfxBus);
        break;
      }
      case 'step':
        this.beep('sine', 140 * p, 90 * p, 0.06, 0.12);
        break;
      case 'fail':
        this.beep('triangle', 330, 160, 0.35, 0.2);
        this.beep('triangle', 247, 120, 0.4, 0.15, 0.12);
        break;
      case 'success':
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.note('marimba', n, 0.4, 0.2, i * 0.08));
        break;
      case 'pickup':
        this.beep('sine', 700 * p, 1400 * p, 0.12, 0.2);
        break;
      case 'whoosh':
        this.hiss(0.3, 0.35, 900 * p, 0.6);
        break;
      case 'thud':
        this.drum('kick', 0.7);
        break;
      case 'pop':
        this.beep('sine', 400 * p, 1200 * p, 0.07, 0.25);
        break;
      case 'squish':
        this.beep('sine', 220 * p, 90 * p, 0.12, 0.3);
        this.hiss(0.08, 0.15, 400, 1.5);
        break;
      case 'zap':
        this.beep('sawtooth', 120, 60, 0.18, 0.12);
        this.hiss(0.12, 0.12, 3000, 2);
        break;
      case 'buzz':
        this.beep('sawtooth', 100, 98, 0.25, 0.06);
        break;
      case 'bumper':
        this.note('bell', ['C5', 'E5', 'G5', 'A5', 'C6'][Math.floor(Math.random() * 5)], 0.35);
        this.drum('cowbell', 0.3);
        break;
      case 'flip':
        this.beep('square', 300, 180, 0.04, 0.08);
        break;
      case 'drain':
        this.beep('triangle', 500, 80, 0.6, 0.2);
        break;
      case 'splash':
        this.hiss(0.4, 0.3, 1200, 0.5);
        break;
      case 'coin':
        this.beep('square', 1300, 1300, 0.05, 0.08);
        this.beep('square', 1750, 1750, 0.12, 0.08, 0.05);
        break;
      case 'crack':
        this.hiss(0.12, 0.45, 2500, 1.2);
        this.beep('square', 200, 60, 0.08, 0.1);
        break;
      case 'chalk':
        this.hiss(0.06, 0.12, 4000 * p, 4);
        break;
      case 'switch':
        this.drum('clack', 0.5);
        this.beep('square', 700, 500, 0.04, 0.08, 0.03);
        break;
      case 'brake':
        this.hiss(0.6, 0.15, 6000, 8);
        break;
      case 'open':
        ['G4', 'C5', 'E5'].forEach((n, i) => this.note('tiple', n, 0.4, 0.3, i * 0.05));
        break;
      case 'page':
        this.hiss(0.18, 0.2, 2500, 0.7);
        break;
    }
  }

  /** Sonido ubicado en el espacio (izquierda/derecha) para encontrar cosas a oído. */
  cue(kind: 'tick' | 'clink' | 'wave' | 'hen' | 'hum', vol: number, pan: number): void {
    if (!this.ctx || !this.sfxBus || !this.synth || vol <= 0.001) return;
    const c = this.ctx;
    const t = c.currentTime;
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    const g = c.createGain();
    g.gain.value = vol;
    g.connect(p);
    p.connect(this.sfxBus);
    switch (kind) {
      case 'tick':
        this.synth.drum('clave', t, 0.6, g);
        break;
      case 'clink':
        this.synth.note('bell', freq('A6'), t, 0.1, 0.5, g);
        break;
      case 'hen': {
        const o = c.createOscillator();
        const og = c.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(700, t);
        o.frequency.exponentialRampToValueAtTime(1100, t + 0.08);
        o.frequency.exponentialRampToValueAtTime(600, t + 0.2);
        og.gain.setValueAtTime(0.0001, t);
        og.gain.linearRampToValueAtTime(0.12, t + 0.02);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(og);
        og.connect(g);
        o.start(t);
        o.stop(t + 0.25);
        break;
      }
      case 'hum':
        this.synth.note('organ', freq('D4'), t, 0.5, 0.6, g);
        break;
      case 'wave': {
        const s = c.createBufferSource();
        s.buffer = this.synth.noiseBuffer();
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(400, t);
        f.frequency.linearRampToValueAtTime(1400, t + 1.1);
        f.frequency.linearRampToValueAtTime(300, t + 2.4);
        const wg = c.createGain();
        wg.gain.setValueAtTime(0.0001, t);
        wg.gain.linearRampToValueAtTime(0.5, t + 1.0);
        wg.gain.linearRampToValueAtTime(0.0001, t + 2.5);
        s.connect(f);
        f.connect(wg);
        wg.connect(g);
        s.start(t, Math.random() * 0.3, 2.6);
        break;
      }
    }
  }

  /** «Blip» de voz: un sonido corto por sílaba aproximada. */
  voice(who: Speaker): void {
    if (!this.ctx || !this.sfxBus) return;
    const now = this.ctx.currentTime;
    if (now - this.lastVoice < 0.055) return;
    this.lastVoice = now;
    const v = VOICES[who];
    if (v.vol <= 0) return;
    const f = v.base + (Math.random() - 0.5) * v.spread;
    this.beep(v.type, f, f * 0.92, v.dur, v.vol);
  }
}

export const Audio = new AudioEngine();
