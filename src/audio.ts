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
    const duration = 1.2;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.10, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
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

  // 11. 暴擊音效 (Critical Hit)
  crit(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.16;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(3200, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(8000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + duration);
    filter.Q.value = 4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.42, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);

    const impact = this.createNoiseSource(ctx);
    const impactFilter = ctx.createBiquadFilter();
    impactFilter.type = 'lowpass';
    impactFilter.frequency.setValueAtTime(900, now);
    impactFilter.frequency.exponentialRampToValueAtTime(60, now + 0.12);

    const impactGain = ctx.createGain();
    impactGain.gain.setValueAtTime(0.35, now);
    impactGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    impact.connect(impactFilter);
    impactFilter.connect(impactGain);
    impactGain.connect(master);
    impact.start(now);
    impact.stop(now + 0.14);
  }

  // 12. 電磁脈衝與電弧滋滋聲 (EMP / Arc)
  emp(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.42;

    const pulse = ctx.createOscillator();
    pulse.type = 'sine';
    pulse.frequency.setValueAtTime(55, now);
    pulse.frequency.exponentialRampToValueAtTime(28, now + duration);

    const pulseGain = ctx.createGain();
    pulseGain.gain.setValueAtTime(0.0001, now);
    pulseGain.gain.exponentialRampToValueAtTime(0.38, now + 0.02);
    pulseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    pulse.connect(pulseGain);
    pulseGain.connect(master);
    pulse.start(now);
    pulse.stop(now + duration + 0.05);

    const arc = ctx.createOscillator();
    arc.type = 'sawtooth';
    arc.frequency.setValueAtTime(180, now);
    arc.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
    arc.frequency.exponentialRampToValueAtTime(120, now + duration);

    const arcFilter = ctx.createBiquadFilter();
    arcFilter.type = 'bandpass';
    arcFilter.frequency.setValueAtTime(1200, now);
    arcFilter.frequency.exponentialRampToValueAtTime(4000, now + 0.12);
    arcFilter.frequency.exponentialRampToValueAtTime(800, now + duration);
    arcFilter.Q.value = 6;

    const arcGain = ctx.createGain();
    arcGain.gain.setValueAtTime(0.0001, now);
    arcGain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
    arcGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    arc.connect(arcFilter);
    arcFilter.connect(arcGain);
    arcGain.connect(master);
    arc.start(now);
    arc.stop(now + duration + 0.05);

    const crackle = this.createNoiseSource(ctx);
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'highpass';
    crackleFilter.frequency.setValueAtTime(2500, now);

    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0.0001, now);

    const cracklePoints = 12;
    for (let i = 0; i < cracklePoints; i++) {
      const t = now + (i / cracklePoints) * duration;
      const amp = 0.05 + Math.random() * 0.18;
      crackleGain.gain.setValueAtTime(amp, t);
      crackleGain.gain.exponentialRampToValueAtTime(0.0001, t + (duration / cracklePoints) * 0.6);
    }

    crackle.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(master);
    crackle.start(now);
    crackle.stop(now + duration + 0.05);
  }

  // 13. 義體升級/安裝成功合成器爬音 (Upgrade)
  upgrade(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.55;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(1440, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(6000, now + duration);
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.28, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.05);

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, i) => {
      const start = now + i * 0.07;
      const note = ctx.createOscillator();
      note.type = 'triangle';
      note.frequency.setValueAtTime(freq, start);

      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.12, start);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);

      note.connect(noteGain);
      noteGain.connect(master);
      note.start(start);
      note.stop(start + 0.14);
    });
  }

  // 14. 反射神經閃避輕快滑音 (Evade)
  evade(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.14;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(2600, now + duration * 0.55);
    osc.frequency.exponentialRampToValueAtTime(1200, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, now);
    filter.frequency.exponentialRampToValueAtTime(8000, now + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(2500, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // 15. 靜音麻醉飛針槍發射音效 (Pneumatic Silenced Needle Shot)
  dart(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.09;

    const noise = this.createNoiseSource(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(6500, now + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(2400, now + duration);
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(now);
    noise.stop(now + duration + 0.02);

    const needle = ctx.createOscillator();
    needle.type = 'sine';
    needle.frequency.setValueAtTime(2600, now);
    needle.frequency.exponentialRampToValueAtTime(5200, now + 0.035);
    needle.frequency.exponentialRampToValueAtTime(1800, now + duration);

    const needleFilter = ctx.createBiquadFilter();
    needleFilter.type = 'bandpass';
    needleFilter.frequency.setValueAtTime(3600, now);
    needleFilter.frequency.exponentialRampToValueAtTime(5200, now + 0.04);
    needleFilter.frequency.exponentialRampToValueAtTime(2200, now + duration);
    needleFilter.Q.value = 8;

    const needleGain = ctx.createGain();
    needleGain.gain.setValueAtTime(0.0001, now);
    needleGain.gain.exponentialRampToValueAtTime(0.12, now + 0.012);
    needleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    needle.connect(needleFilter);
    needleFilter.connect(needleGain);
    needleGain.connect(master);
    needle.start(now);
    needle.stop(now + duration + 0.02);
  }

  // 16. 電漿散彈槍重型轟鳴音效 (Scatter Plasma Blast)
  shotgun(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const duration = 0.5;

    const noise = this.createNoiseSource(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(4200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(120, now + duration);
    noiseFilter.Q.value = 0.8;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.42, now + 0.012);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(now);
    noise.stop(now + duration + 0.05);

    const scatterFrequencies = [180, 220, 260];
    scatterFrequencies.forEach((freq, i) => {
      const start = now + i * 0.018;
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(45 + i * 12, start + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(5200, start);
      filter.frequency.exponentialRampToValueAtTime(220, start + duration);
      filter.Q.value = 2.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    });

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(90, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + duration);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(0.38, now + 0.015);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    sub.connect(subGain);
    subGain.connect(master);
    sub.start(now);
    sub.stop(now + duration + 0.05);
  }
}

export const soundFX = new SoundFX();
export default soundFX;
