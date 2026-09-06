export class SoundFX {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private _volume: number = 0.5;
  private _isMuted: boolean = false;

  constructor() {
    this.bindAutoResume();
  }

  get isMuted(): boolean { return this._isMuted; }
  get volume(): number { return this._volume; }

  setMuted(muted: boolean): void {
    this._isMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this._volume;
    }
    if (!muted) {
      this.ensureContext();
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this._isMuted);
    return this._isMuted;
  }

  setVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0));
    this._volume = clamped;
    if (this.ctx && this.masterGain && !this._isMuted) {
      this.masterGain.gain.value = clamped;
    }
  }

  private bindAutoResume(): void {
    if (typeof window === 'undefined') return;
    const handler = () => { this.ensureContext(); };
    const events: Array<'pointerdown' | 'keydown' | 'touchstart'> = ['pointerdown', 'keydown', 'touchstart'];
    for (const event of events) {
      window.addEventListener(event, handler, { passive: true });
    }
  }

  private ensureContext(): AudioContext | null {
    if (this._isMuted) return null;
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) {
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._volume;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 1);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createNoiseSource(ctx: AudioContext, loop = false): AudioBufferSourceNode {
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = loop;
    return source;
  }

  private playLaser(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.22;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(6000, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + duration);
    filter.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }
}
export const soundFX = new SoundFX();
