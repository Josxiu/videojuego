/**
 * Música y efectos chiptune generados con Web Audio API.
 * Sin archivos de audio: cada sueño tiene su melodía definida como pasos.
 */

type Wave = OscillatorType;

interface Track {
  bpm: number;
  wave: Wave;
  volume: number;
  melody: (string | null)[]; // pasos de corcheas; null = silencio
  bass: (string | null)[];
  bassWave?: Wave;
}

export type MusicId = 'menu' | 'hub' | 'exam' | 'fall' | 'forest' | 'ending';
export type SfxId =
  | 'jump'
  | 'hit'
  | 'collect'
  | 'key'
  | 'door'
  | 'meow'
  | 'echo'
  | 'ring'
  | 'text'
  | 'slide'
  | 'win';

const NOTE_INDEX: Record<string, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

function freq(note: string): number {
  const m = note.match(/^([A-G]#?)(\d)$/);
  if (!m) return 440;
  const midi = NOTE_INDEX[m[1]] + (parseInt(m[2]) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const TRACKS: Record<MusicId, Track> = {
  menu: {
    bpm: 84, wave: 'triangle', volume: 0.22,
    melody: ['A4', null, 'C5', null, 'E5', null, 'C5', null, 'B4', null, 'D5', null, 'F5', null, 'E5', null,
             'A4', null, 'C5', null, 'E5', null, 'G5', null, 'F5', null, 'E5', null, 'D5', null, 'B4', null],
    bass: ['A2', null, null, null, null, null, null, null, 'F2', null, null, null, null, null, null, null,
           'C3', null, null, null, null, null, null, null, 'E2', null, null, null, null, null, null, null],
  },
  hub: {
    bpm: 76, wave: 'triangle', volume: 0.2,
    melody: ['E5', null, null, 'B4', null, null, 'G4', null, 'A4', null, null, 'C5', null, null, 'B4', null,
             'E5', null, null, 'B4', null, null, 'G4', null, 'F#4', null, null, 'A4', null, null, 'E4', null],
    bass: ['E2', null, null, null, null, null, null, null, 'A2', null, null, null, null, null, null, null,
           'C3', null, null, null, null, null, null, null, 'B2', null, null, null, null, null, null, null],
  },
  exam: {
    bpm: 152, wave: 'square', volume: 0.14,
    melody: ['C5', 'C5', null, 'E5', 'G5', null, 'E5', null, 'A5', 'G5', null, 'E5', 'F5', 'E5', 'D5', null,
             'C5', 'C5', null, 'E5', 'G5', null, 'A5', null, 'B5', 'A5', 'G5', 'E5', 'D5', null, 'C5', null],
    bass: ['C3', null, 'G2', null, 'C3', null, 'G2', null, 'F2', null, 'C3', null, 'F2', null, 'C3', null,
           'C3', null, 'G2', null, 'C3', null, 'G2', null, 'G2', null, 'B2', null, 'C3', null, 'G2', null],
    bassWave: 'square',
  },
  fall: {
    bpm: 100, wave: 'triangle', volume: 0.2,
    melody: ['E5', null, 'B4', 'G4', null, 'E4', null, null, 'D5', null, 'A4', 'F4', null, 'D4', null, null,
             'C5', null, 'G4', 'E4', null, 'C4', null, null, 'B4', null, 'F#4', 'D4', null, 'B3', null, null],
    bass: ['E2', null, null, null, null, null, null, null, 'D2', null, null, null, null, null, null, null,
           'C2', null, null, null, null, null, null, null, 'B1', null, null, null, null, null, null, null],
  },
  forest: {
    bpm: 66, wave: 'sine', volume: 0.24,
    melody: ['G5', null, null, null, 'D5', null, 'B4', null, null, null, 'E5', null, null, null, null, null,
             'C5', null, null, null, 'G4', null, 'A4', null, null, null, 'B4', null, null, null, null, null],
    bass: ['E2', null, null, null, null, null, null, null, 'C2', null, null, null, null, null, null, null,
           'A1', null, null, null, null, null, null, null, 'B1', null, null, null, null, null, null, null],
  },
  ending: {
    bpm: 88, wave: 'triangle', volume: 0.22,
    melody: ['C5', null, 'E5', null, 'G5', null, 'E5', null, 'F5', null, 'A5', null, 'G5', null, 'E5', null,
             'D5', null, 'F5', null, 'E5', null, 'C5', null, 'C5', null, 'D5', null, 'C5', null, null, null],
    bass: ['C3', null, null, null, null, null, null, null, 'F2', null, null, null, null, null, null, null,
           'G2', null, null, null, null, null, null, null, 'C3', null, null, null, null, null, null, null],
  },
};

class AudioManagerClass {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private step = 0;
  private nextTime = 0;
  private current?: MusicId;
  muted = false;

  /** Crear/reanudar el contexto; llamar tras un gesto del usuario. */
  ensure(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    // Si una escena pidió música antes del primer gesto del usuario, arrancarla ahora
    if (this.current && !this.timer) {
      const id = this.current;
      this.current = undefined;
      this.playMusic(id);
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  playMusic(id: MusicId): void {
    if (this.current === id) return;
    this.stopMusic();
    this.current = id;
    if (!this.ctx) return; // se reintenta cuando haya gesto (las escenas llaman de nuevo)
    const track = TRACKS[id];
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.06;
    const stepDur = 60 / track.bpm / 2; // corcheas
    this.timer = setInterval(() => {
      if (!this.ctx || !this.musicGain) return;
      // agenda con ~0.18s de anticipación
      while (this.nextTime < this.ctx.currentTime + 0.18) {
        const i = this.step % track.melody.length;
        const note = track.melody[i];
        if (note) this.tone(freq(note), this.nextTime, stepDur * 1.8, track.wave, track.volume, this.musicGain);
        const bass = track.bass[i % track.bass.length];
        if (bass) this.tone(freq(bass), this.nextTime, stepDur * 3.4, track.bassWave ?? 'triangle', track.volume * 0.8, this.musicGain);
        this.nextTime += stepDur;
        this.step++;
      }
    }, 60);
  }

  stopMusic(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.current = undefined;
  }

  private tone(
    f: number,
    when: number,
    dur: number,
    wave: Wave,
    vol: number,
    dest?: AudioNode,
    slideTo?: number,
  ): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(f, when);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), when + dur);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g);
    g.connect(dest ?? this.master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  private noise(when: number, dur: number, vol: number, lowpass = 8000): void {
    if (!this.ctx || !this.master) return;
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start(when);
  }

  sfx(id: SfxId): void {
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    switch (id) {
      case 'jump':
        this.tone(280, t, 0.14, 'square', 0.12, undefined, 620);
        break;
      case 'slide':
        this.noise(t, 0.12, 0.08, 1200);
        break;
      case 'hit':
        this.tone(220, t, 0.2, 'sawtooth', 0.14, undefined, 60);
        this.noise(t, 0.15, 0.12, 900);
        break;
      case 'collect':
        this.tone(880, t, 0.08, 'sine', 0.14);
        this.tone(1318, t + 0.07, 0.12, 'sine', 0.12);
        break;
      case 'key':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * 0.09, 0.18, 'triangle', 0.16));
        break;
      case 'win':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, t + i * 0.11, 0.3, 'triangle', 0.15));
        break;
      case 'door':
        this.tone(160, t, 0.5, 'sine', 0.16, undefined, 60);
        this.noise(t, 0.4, 0.06, 500);
        break;
      case 'meow':
        this.tone(520, t, 0.09, 'sawtooth', 0.07, undefined, 850);
        this.tone(850, t + 0.09, 0.22, 'sawtooth', 0.07, undefined, 420);
        break;
      case 'echo':
        this.tone(660, t, 0.7, 'sine', 0.12);
        this.tone(990, t + 0.05, 0.9, 'sine', 0.08);
        break;
      case 'ring':
        this.tone(400, t, 0.3, 'sine', 0.1, undefined, 900);
        break;
      case 'text':
        this.tone(700, t, 0.03, 'square', 0.03);
        break;
    }
  }
}

export const AudioManager = new AudioManagerClass();
