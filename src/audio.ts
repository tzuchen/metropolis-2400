export class SoundFX {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private _volume: number = 0.5;
  private _isMuted: boolean = false;
  private lastStepTime: number = 0;

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

  unlock(): void {
    this.ensureContext();
  }

  resume(): void {
    this.ensureContext();
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

  // 1. 光束槍發射音效 (Sci-Fi Laser Blast)
  laser(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.18;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5500, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + duration);
    filter.Q.value = 5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // 2. 擊中金屬或護盾音效 (Metal Impact / Deflection)
  hit(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.12;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // 3. 機器人被摧毀爆炸聲 (Retro 8-bit Explosion)
  explosion(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.45;

    const noise = this.createNoiseSource(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(now);
    noise.stop(now + duration + 0.05);

    // 重低音轟鳴
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + duration);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    subOsc.connect(subGain);
    subGain.connect(master);
    subOsc.start(now);
    subOsc.stop(now + duration + 0.05);
  }

  // 4. 氣密防爆門開關聲 (Airlock Pneumatics)
  door(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.28;

    const noise = this.createNoiseSource(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + duration);
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(now);
    noise.stop(now + duration + 0.02);
  }

  // 5. 終端機鍵盤輸入與嗶聲 (Terminal Keystroke / Chirp)
  terminal(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.05;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400 + Math.random() * 600, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // 6. 警報蜂鳴警笛聲 (Security Klaxon Siren)
  alarm(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.35;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(440, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // 7. 補給拾取／駭入成功音效 (Chime / Pickup)
  pickup(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const start = now + i * 0.06;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);

      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 0.16);
    });
  }

  // 8. 腳步聲 (Footstep)
  step(): void {
    const now = performance.now();
    if (now - this.lastStepTime < 180) return;
    this.lastStepTime = now;

    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const audioNow = ctx.currentTime;
    const duration = 0.06;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, audioNow);
    osc.frequency.exponentialRampToValueAtTime(40, audioNow + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, audioNow);
    gain.gain.exponentialRampToValueAtTime(0.001, audioNow + duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start(audioNow);
    osc.stop(audioNow + duration + 0.01);
  }

  // 9. 任務失敗／死亡關機音 (Power Down)
  powerDown(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.8;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  // 10. 勝利通關音效 (Victory Fanfare)
  victory(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;

    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, i) => {
      const start = now + i * 0.08;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  }
}

export const soundFX = new SoundFX();
export default soundFX;
