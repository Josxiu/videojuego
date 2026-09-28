/**
 * Música y efectos generados con Web Audio API. Sin archivos de audio.
 *
 * - La música se escribe como pasos (ver audio/tracks.ts) y se agenda con
 *   anticipación sobre el reloj del AudioContext, así no tiembla aunque el
 *   juego baje de cuadros.
 * - Cada pista tiene capas que se encienden con `setMusicLevel`: la música
 *   crece a medida que el jugador avanza dentro de un sueño.
 * - Un bus de eco da profundidad (los sueños suenan lejos).
 */
import { Synth, noteFreq, type Instrument, type DrumKind } from './audio/synth';
import {
  TRACKS,
  parsePattern,
  parseDrums,
  type MusicId,
  type NoteEvent,
  type DrumEvent,
  type TrackDef,
} from './audio/tracks';

export type { MusicId, Instrument, DrumKind };

export type SfxId =
  | 'jump'
  | 'land'
  | 'hit'
  | 'collect'
  | 'key'
  | 'door'
  | 'meow'
  | 'echo'
  | 'ring'
  | 'text'
  | 'slide'
  | 'screech'
  | 'heartbeat'
  | 'hide'
  | 'win'
  | 'chalk'
  | 'erase'
  | 'bell'
  | 'count'
  | 'right'
  | 'wrong'
  | 'paper'
  | 'rip'
  | 'whoosh'
  | 'pop'
  | 'drip'
  | 'pour'
  | 'fill'
  | 'bloom'
  | 'scribble'
  | 'knock'
  | 'step'
  | 'sit'
  | 'click'
  | 'rewind';

/** Voz de cada personaje al escribir su diálogo: tono y timbre. */
export type VoiceId = 'iris' | 'morfeo' | 'kid' | 'old' | 'adult' | 'narrator';

interface CompiledVoice {
  inst: Instrument;
  vol: number;
  layer: number;
  send: number;
  length: number;
  byStep: Map<number, NoteEvent[]>;
}

interface CompiledDrum {
  kind: DrumKind;
  vol: number;
  layer: number;
  pitch: number;
  send: number;
  length: number;
  byStep: Map<number, DrumEvent>;
}

interface Compiled {
  def: TrackDef;
  stepDur: number;
  voices: CompiledVoice[];
  drums: CompiledDrum[];
}

const compiledCache = new Map<MusicId, Compiled>();

function compile(id: MusicId): Compiled {
  const cached = compiledCache.get(id);
  if (cached) return cached;
  const def = TRACKS[id];
  const voices = def.voices.map((v) => {
    const { events, length } = parsePattern(v.pattern);
    const byStep = new Map<number, NoteEvent[]>();
    for (const e of events) byStep.set(e.step, [...(byStep.get(e.step) ?? []), e]);
    return { inst: v.inst, vol: v.vol, layer: v.layer ?? 0, send: v.send ?? 0, length, byStep };
  });
  const drums = (def.drums ?? []).map((d) => {
    const { events, length } = parseDrums(d.pattern);
    const byStep = new Map<number, DrumEvent>();
    for (const e of events) byStep.set(e.step, e);
    return {
      kind: d.kind,
      vol: d.vol,
      layer: d.layer ?? 0,
      pitch: d.pitch ?? 1,
      send: d.send ?? 0,
      length,
      byStep,
    };
  });
  const c = { def, stepDur: 60 / def.bpm / def.stepsPerBeat, voices, drums };
  compiledCache.set(id, c);
  return c;
}

class AudioManagerClass {
  private ctx?: AudioContext;
  private synth?: Synth;
  private master?: GainNode;
  private musicBus?: GainNode;
  private sfxBus?: GainNode;
  private echoIn?: GainNode;
  private echoDelay?: DelayNode;
  private echoFeedback?: GainNode;
  private trackGain?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private track?: Compiled;
  private trackStart = 0;
  private nextStep = 0;
  private current?: MusicId;
  private level = 0;
  muted = false;

  /** Crear/reanudar el contexto; llamar tras un gesto del usuario. */
  ensure(): void {
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.synth = new Synth(this.ctx);
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      // Un compresor suave evita saturar cuando suenan muchas cosas a la vez
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 3;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.9;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      // Eco: retardo con realimentación filtrada
      this.echoIn = this.ctx.createGain();
      this.echoDelay = this.ctx.createDelay(1.5);
      this.echoFeedback = this.ctx.createGain();
      const damp = this.ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2400;
      this.echoIn.connect(this.echoDelay);
      this.echoDelay.connect(damp);
      damp.connect(this.echoFeedback);
      this.echoFeedback.connect(this.echoDelay);
      damp.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    // Si una escena pidió música antes del primer gesto del usuario, arrancarla ahora
    if (this.current && !this.timer) {
      const id = this.current;
      this.current = undefined;
      this.playMusic(id, this.level);
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  /** Tiempo actual del reloj de audio (o del navegador si no hay audio). */
  now(): number {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  /**
   * Retraso entre agendar un sonido y oírlo (salida del dispositivo). Los ritmos
   * lo restan al juzgar un toque, para que «a tiempo» signifique lo que se oye.
   */
  latency(): number {
    const c = this.ctx as (AudioContext & { outputLatency?: number }) | undefined;
    if (!c) return 0;
    return Math.min(0.12, (c.outputLatency ?? 0) + (c.baseLatency ?? 0));
  }

  /** ¿El audio está corriendo de verdad? (los ritmos dependen de esto) */
  get running(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  // ── Música ──

  playMusic(id: MusicId, level = 0): void {
    if (this.current === id) {
      this.setMusicLevel(level);
      return;
    }
    this.stopMusic();
    this.current = id;
    this.level = level;
    if (!this.ctx || !this.musicBus || !this.echoDelay || !this.echoFeedback) return;
    const track = compile(id);
    this.track = track;
    const echo = track.def.echo ?? { time: 0.3, feedback: 0.2 };
    this.echoDelay.delayTime.setTargetAtTime(echo.time, this.ctx.currentTime, 0.05);
    this.echoFeedback.gain.setTargetAtTime(echo.feedback, this.ctx.currentTime, 0.05);
    this.trackGain = this.ctx.createGain();
    this.trackGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.trackGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.4);
    this.trackGain.connect(this.musicBus);
    this.trackStart = this.ctx.currentTime + 0.08;
    this.nextStep = 0;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  /** Enciende las capas de la pista hasta `n`. */
  setMusicLevel(n: number): void {
    this.level = n;
  }

  get musicLevel(): number {
    return this.level;
  }

  /** Reloj de la pista actual, para sincronizar juego y música. */
  musicClock(): { start: number; stepDur: number } | undefined {
    if (!this.track || !this.timer) return undefined;
    return { start: this.trackStart, stepDur: this.track.stepDur };
  }

  stopMusic(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.current = undefined;
    this.track = undefined;
    if (this.trackGain && this.ctx) {
      const g = this.trackGain;
      g.gain.cancelScheduledValues(this.ctx.currentTime);
      g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
      setTimeout(() => g.disconnect(), 900);
    }
    this.trackGain = undefined;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const synth = this.synth;
    const track = this.track;
    const dest = this.trackGain;
    if (!ctx || !synth || !track || !dest || !this.echoIn) return;
    const horizon = ctx.currentTime + 0.15;
    while (this.trackStart + this.nextStep * track.stepDur < horizon) {
      const when = this.trackStart + this.nextStep * track.stepDur;
      for (const v of track.voices) {
        if (v.layer > this.level) continue;
        const evs = v.byStep.get(this.nextStep % v.length);
        if (!evs) continue;
        const send = v.send ? this.sendNode(v.send) : undefined;
        for (const e of evs) {
          for (const n of e.notes) {
            synth.play(v.inst, noteFreq(n), when, e.len * track.stepDur, v.vol, dest, send);
          }
        }
      }
      for (const d of track.drums) {
        if (d.layer > this.level) continue;
        const e = d.byStep.get(this.nextStep % d.length);
        if (!e) continue;
        const send = d.send ? this.sendNode(d.send) : undefined;
        synth.drum(d.kind, when, d.vol * (e.accent ? 1.4 : 1), dest, d.pitch, send);
      }
      this.nextStep++;
    }
  }

  private sends = new Map<number, GainNode>();

  /** Nodo de envío al eco (uno por cantidad, reutilizado). */
  private sendNode(amount: number): GainNode | undefined {
    if (!this.ctx || !this.echoIn) return undefined;
    const k = Math.round(amount * 100) / 100;
    let g = this.sends.get(k);
    if (!g) {
      g = this.ctx.createGain();
      g.gain.value = k;
      g.connect(this.echoIn);
      this.sends.set(k, g);
    }
    return g;
  }

  // ── Instrumentos sueltos (para ritmos y momentos) ──

  /** Toca una nota ya (o en `when`, tiempo de audio). */
  note(
    inst: Instrument,
    note: string | number,
    vol = 0.12,
    dur = 0.3,
    when?: number,
    echo = 0,
  ): void {
    this.ensure();
    if (!this.ctx || !this.synth || !this.sfxBus) return;
    const f = typeof note === 'number' ? note : noteFreq(note);
    this.synth.play(
      inst,
      f,
      when ?? this.ctx.currentTime + 0.005,
      dur,
      vol,
      this.sfxBus,
      echo ? this.sendNode(echo) : undefined,
    );
  }

  /** Percusión suelta. */
  drum(kind: DrumKind, vol = 0.3, pitch = 1, when?: number, echo = 0): void {
    this.ensure();
    if (!this.ctx || !this.synth || !this.sfxBus) return;
    this.synth.drum(
      kind,
      when ?? this.ctx.currentTime + 0.005,
      vol,
      this.sfxBus,
      pitch,
      echo ? this.sendNode(echo) : undefined,
    );
  }

  // ── Efectos ──

  /** «Voz» al escribir diálogo: un blip distinto por personaje. */
  voice(who: VoiceId): void {
    this.ensure();
    if (!this.ctx || !this.synth || !this.sfxBus) return;
    const t = this.ctx.currentTime + 0.005;
    const jitter = 1 + (Math.random() - 0.5) * 0.12;
    const bus = this.sfxBus;
    switch (who) {
      case 'iris':
        this.synth.play('triangle', 520 * jitter, t, 0.025, 0.035, bus);
        break;
      case 'morfeo':
        this.synth.play('square', 190 * jitter, t, 0.03, 0.022, bus);
        break;
      case 'kid':
        this.synth.play('triangle', 760 * jitter, t, 0.02, 0.035, bus);
        break;
      case 'old':
        this.synth.play('sine', 330 * jitter, t, 0.04, 0.05, bus);
        break;
      case 'adult':
        this.synth.play('triangle', 420 * jitter, t, 0.025, 0.035, bus);
        break;
      case 'narrator':
        this.synth.play('sine', 880 * jitter, t, 0.012, 0.018, bus);
        break;
    }
  }

  sfx(id: SfxId): void {
    this.ensure();
    const ctx = this.ctx;
    const s = this.synth;
    const bus = this.sfxBus;
    if (!ctx || !s || !bus) return;
    const t = ctx.currentTime + 0.01;
    const tone = (inst: Instrument, f: number, dur: number, vol: number, dt = 0) =>
      s.play(inst, f, t + dt, dur, vol, bus);
    switch (id) {
      case 'jump':
        tone('square', 300, 0.06, 0.06);
        tone('sine', 620, 0.08, 0.06, 0.03);
        break;
      case 'land':
        s.noise(t, 0.06, 0.08, bus, { type: 'lowpass', freq: 700 });
        break;
      case 'slide':
        s.noise(t, 0.2, 0.08, bus, { type: 'bandpass', freq: 1400, q: 0.8, sweepTo: 600 });
        break;
      case 'hit':
        tone('saw', 220, 0.12, 0.12);
        s.noise(t, 0.15, 0.12, bus, { type: 'lowpass', freq: 900 });
        break;
      case 'collect':
        tone('sine', 880, 0.05, 0.12);
        tone('sine', 1318, 0.09, 0.1, 0.07);
        break;
      case 'key':
        [523, 659, 784, 1046].forEach((f, i) => tone('bell', f, 0.2, 0.08, i * 0.09));
        break;
      case 'win':
        [523, 659, 784, 1046, 1318].forEach((f, i) => tone('musicbox', f, 0.3, 0.12, i * 0.11));
        break;
      case 'door':
        s.play('sine', 160, t, 0.3, 0.14, bus);
        s.noise(t, 0.4, 0.06, bus, { type: 'lowpass', freq: 500 });
        break;
      case 'meow':
        s.play('saw', 520, t, 0.06, 0.05, bus);
        s.play('saw', 820, t + 0.09, 0.14, 0.05, bus);
        break;
      case 'echo':
        tone('bell', 660, 0.5, 0.09);
        tone('bell', 990, 0.6, 0.05, 0.08);
        break;
      case 'ring':
        tone('sine', 400, 0.2, 0.08);
        tone('sine', 800, 0.3, 0.05, 0.05);
        break;
      case 'text':
        tone('square', 700, 0.02, 0.025);
        break;
      case 'screech':
        s.play('saw', 1300, t, 0.4, 0.1, bus);
        s.noise(t, 0.5, 0.1, bus, { type: 'bandpass', freq: 3200, q: 1, sweepTo: 800 });
        break;
      case 'heartbeat':
        s.drum('heart', t, 0.3, bus);
        break;
      case 'hide':
        s.noise(t, 0.16, 0.08, bus, { type: 'lowpass', freq: 600 });
        s.drum('knock', t + 0.1, 0.12, bus, 0.7);
        break;
      case 'chalk':
        // Gis rechinando en el pizarrón
        s.noise(t, 0.09, 0.07, bus, { type: 'bandpass', freq: 3600, q: 4, sweepTo: 4800 });
        s.drum('tick', t, 0.15, bus);
        break;
      case 'erase':
        s.noise(t, 0.35, 0.09, bus, { type: 'bandpass', freq: 900, q: 0.7, sweepTo: 1600 }, 0.05);
        break;
      case 'bell':
        // Timbre escolar
        for (let i = 0; i < 6; i++) tone('square', i % 2 ? 1180 : 1240, 0.04, 0.035, i * 0.05);
        break;
      case 'count':
        tone('marimba', 1046, 0.1, 0.08);
        break;
      case 'right':
        tone('marimba', 784, 0.1, 0.13);
        tone('marimba', 1046, 0.1, 0.13, 0.08);
        tone('marimba', 1568, 0.2, 0.1, 0.16);
        break;
      case 'wrong':
        tone('marimba', 311, 0.15, 0.13);
        tone('marimba', 233, 0.25, 0.13, 0.12);
        break;
      case 'paper':
        s.noise(t, 0.12, 0.06, bus, { type: 'highpass', freq: 2500 });
        s.noise(t + 0.06, 0.1, 0.04, bus, { type: 'highpass', freq: 3500 });
        break;
      case 'rip':
        // Cinta canela arrancándose
        s.noise(t, 0.28, 0.1, bus, { type: 'bandpass', freq: 1800, q: 0.6, sweepTo: 4200 }, 0.01);
        s.drum('box', t + 0.24, 0.2, bus, 1.2);
        break;
      case 'whoosh':
        s.noise(t, 0.4, 0.08, bus, { type: 'bandpass', freq: 400, q: 0.8, sweepTo: 2400 }, 0.1);
        break;
      case 'pop':
        tone('sine', 500, 0.05, 0.1);
        tone('sine', 900, 0.08, 0.08, 0.04);
        break;
      case 'drip':
        s.drum('drop', t, 0.1, bus, 0.8 + Math.random() * 0.5);
        break;
      case 'pour':
        s.noise(t, 0.7, 0.07, bus, { type: 'bandpass', freq: 700, q: 0.6, sweepTo: 1200 }, 0.08);
        for (let i = 0; i < 4; i++) s.drum('drop', t + 0.1 + i * 0.13, 0.06, bus, 0.7 + i * 0.15);
        break;
      case 'fill':
        s.noise(t, 0.9, 0.06, bus, { type: 'bandpass', freq: 500, q: 0.7, sweepTo: 1400 }, 0.1);
        break;
      case 'bloom':
        [392, 494, 587, 784].forEach((f, i) => tone('pluck', f, 0.3, 0.1, i * 0.06));
        break;
      case 'scribble':
        for (let i = 0; i < 5; i++)
          s.noise(t + i * 0.05, 0.04, 0.05, bus, {
            type: 'bandpass',
            freq: 1200 + Math.random() * 900,
            q: 2,
          });
        break;
      case 'knock':
        s.drum('knock', t, 0.3, bus);
        break;
      case 'step':
        s.noise(t, 0.04, 0.05, bus, { type: 'lowpass', freq: 500 });
        break;
      case 'sit':
        s.noise(t, 0.12, 0.06, bus, { type: 'lowpass', freq: 400 });
        tone('sine', 180, 0.1, 0.05, 0.05);
        break;
      case 'click':
        s.drum('tick', t, 0.2, bus, 0.6);
        break;
      case 'rewind':
        s.play('saw', 900, t, 0.3, 0.05, bus);
        s.noise(t, 0.3, 0.05, bus, { type: 'bandpass', freq: 2200, q: 1, sweepTo: 500 });
        break;
    }
  }
}

export const AudioManager = new AudioManagerClass();
