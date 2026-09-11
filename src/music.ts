/**
 * Procedural Cyberpunk Synthesizer Background Music (Dark Synthwave / Ambient Drone)
 * Zero external audio files: 100% synthesized via Web Audio API.
 */

export type MusicIntensity = 'title' | 'exploration' | 'combat' | 'boss';

export class MusicSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private padOsc1: OscillatorNode | null = null;
  private padOsc2: OscillatorNode | null = null;
  private padGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private intensity: MusicIntensity = 'title';
  private arpTimer: any = null;
  private arpStep: number = 0;
  private _isTapeActive: boolean = false;

  // A minor pentatonic frequencies (Hz): A2, C3, D3, E3, G3, A3
  private readonly arpScale = [110, 130.81, 146.83, 164.81, 196.0, 220.0];
  // Bass roots: A1 (55Hz), F1 (43.65Hz), C2 (65.41Hz), G1 (49Hz)
  private readonly bassRoots = [55, 43.65, 65.41, 49];
  // 80s Synthwave classic progression roots
  private readonly synthwaveRoots = [73.42, 58.27, 87.31, 65.41];
  // 80s Synthwave arpeggio scale
  private readonly synthwaveArpScale = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 440.0];
  private readonly titleRoots = [65.41, 77.78, 51.91, 58.27];
  private readonly titleArpScale = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 698.46];
  private chordIndex: number = 0;

  constructor() {
    this.bindAutoStart();
  }

  get enabled(): boolean {
    return this.isPlaying && !this.isMuted;
  }

  get currentIntensity(): MusicIntensity {
    return this.intensity;
  }

  get synthwaveTapeActive(): boolean {
    return this._isTapeActive;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;

    if (!this.ctx) {
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.28;

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 650;
      this.filterNode.Q.value = 2.5;

      this.masterGain.connect(this.filterNode);
      this.filterNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    return this.ctx;
  }

  private bindAutoStart(): void {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (!this.isPlaying && !this.isMuted) {
        this.start();
      }
    };
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  }

  start(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.isPlaying) return;

    this.isPlaying = true;
    const now = ctx.currentTime;

    // 1. 低音底噪無人機 (Sub-Bass Drone)
    const initialRoot = this.intensity === 'title' ? this.titleRoots[0] : 55;
    this.droneOsc = ctx.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.setValueAtTime(initialRoot, now);

    this.droneGain = ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.18, now);

    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    this.droneOsc.start();

    // 2. 雙重失諧賽博氛圍襯底 (Detuned Cyber Pad)
    this.padOsc1 = ctx.createOscillator();
    this.padOsc1.type = 'sawtooth';
    this.padOsc1.frequency.setValueAtTime(initialRoot * 4, now);

    this.padOsc2 = ctx.createOscillator();
    this.padOsc2.type = 'sawtooth';
    this.padOsc2.frequency.setValueAtTime(initialRoot * 4 + 2.5, now); // Detuned +2.5Hz for chorus shimmer

    this.padGain = ctx.createGain();
    this.padGain.gain.setValueAtTime(0.08, now);

    this.padOsc1.connect(this.padGain);
    this.padOsc2.connect(this.padGain);
    this.padGain.connect(this.masterGain);
    this.padOsc1.start();
    this.padOsc2.start();

    // 3. 啟動琶音器定時器 (Arpeggiator Loop)
    this.scheduleArp();

    // 確保解除靜音或重新啟動時立即套用當前強度參數
    this.applyIntensityParams(this.intensity);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.arpTimer) {
      clearInterval(this.arpTimer);
      this.arpTimer = null;
    }

    try {
      this.droneOsc?.stop();
      this.droneOsc?.disconnect();
      this.padOsc1?.stop();
      this.padOsc1?.disconnect();
      this.padOsc2?.stop();
      this.padOsc2?.disconnect();
    } catch {}

    this.droneOsc = null;
    this.padOsc1 = null;
    this.padOsc2 = null;
  }

  toggle(): boolean {
    if (this.isMuted) {
      // 處於靜音時，切換為解除靜音並啟動
      this.isMuted = false;
      this.start();
      return true;
    } else if (this.isPlaying) {
      // 正常播放中，切換為靜音並停止
      this.isMuted = true;
      this.stop();
      return false;
    } else {
      // 初始尚未播放狀態，切換為啟動
      this.isMuted = false;
      this.start();
      return true;
    }
  }

  setIntensity(level: MusicIntensity): void {
    if (this.isMuted) return;

    const wasSameIntensity = this.intensity === level;
    this.intensity = level;

    if (!this.isPlaying) {
      this.start();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    if (wasSameIntensity && this.isPlaying) {
      return;
    }

    this.applyIntensityParams(level);

    if (this.isPlaying) {
      this.scheduleArp();
    }
  }

  private applyIntensityParams(level: MusicIntensity): void {
    if (!this.ctx || !this.filterNode || !this.masterGain) return;

    const now = this.ctx.currentTime;
    if (level === 'title') {
      this.filterNode.frequency.setTargetAtTime(1150, now, 0.3);
      this.filterNode.Q.setTargetAtTime(3.5, now, 0.3);
      this.masterGain.gain.setTargetAtTime(0.32, now, 0.3);
    } else if (level === 'exploration') {
      this.filterNode.frequency.setTargetAtTime(750, now, 0.4);
      this.masterGain.gain.setTargetAtTime(0.28, now, 0.3);
    } else if (level === 'combat') {
      this.filterNode.frequency.setTargetAtTime(1500, now, 0.2);
      this.masterGain.gain.setTargetAtTime(0.35, now, 0.2);
    } else if (level === 'boss') {
      this.filterNode.frequency.setTargetAtTime(2400, now, 0.1);
      this.masterGain.gain.setTargetAtTime(0.40, now, 0.2);
    }
  }

  setSynthwaveTapeMode(active: boolean): void {
    this._isTapeActive = active;
    if (!this.ctx || !this.filterNode || !this.masterGain) return;

    const now = this.ctx.currentTime;
    if (active) {
      this.filterNode.frequency.setTargetAtTime(1200, now, 0.3);
      this.filterNode.Q.setTargetAtTime(3.8, now, 0.3);
      this.masterGain.gain.setTargetAtTime(0.32, now, 0.3);
    } else {
      if (this.intensity === 'exploration') {
        this.filterNode.frequency.setTargetAtTime(550, now, 0.4);
        this.masterGain.gain.setTargetAtTime(0.22, now, 0.3);
      }
      this.filterNode.Q.setTargetAtTime(2.5, now, 0.3);
    }

    if (this.isPlaying) {
      this.scheduleArp();
    }
  }

  private scheduleArp(): void {
    if (this.arpTimer) {
      clearInterval(this.arpTimer);
      this.arpTimer = null;
    }

    // 依據強度切換琶音節奏速度 (毫秒)
    const intervalMs = this.intensity === 'boss' ? 120 : this.intensity === 'combat' ? 150 : this.intensity === 'title' ? 220 : 280;

    this.arpTimer = setInterval(() => {
      this.tickArp();
    }, intervalMs);

    if (typeof (this.arpTimer as any)?.unref === 'function') {
      (this.arpTimer as any).unref();
    }
  }

  private playKick(ctx: AudioContext, now: number, isBoss: boolean): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.1);

      const peak = isBoss ? 0.8 : 0.6;
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('Kick synthesis error', e);
    }
  }

  private playSnare(ctx: AudioContext, now: number, isBoss: boolean): void {
    try {
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = isBoss ? 3000 : 2000;
      filter.Q.value = 1.0;

      const gain = ctx.createGain();
      const peak = isBoss ? 0.5 : 0.3;
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      noise.start(now);
      noise.stop(now + 0.2);
    } catch (e) {
      console.warn('Snare synthesis error', e);
    }
  }

  private playSubPulse(ctx: AudioContext, now: number): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(40, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.15);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn('SubPulse synthesis error', e);
    }
  }

  private playHiHat(ctx: AudioContext, now: number): void {
    try {
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      noise.start(now);
      noise.stop(now + 0.05);
    } catch (e) {
      console.warn('HiHat synthesis error', e);
    }
  }

  private tickArp(): void {
    if (!this.ctx || !this.isPlaying || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const isBoss = this.intensity === 'boss';
    const isCombat = this.intensity === 'combat';
    const isTape = this._isTapeActive;
    const isTitle = this.intensity === 'title';

    // 換根音 (每 16 拍切換和弦)
    if (this.arpStep % 16 === 0) {
      if (isTape) {
        this.chordIndex = (this.chordIndex + 1) % this.synthwaveRoots.length;
        const root = this.synthwaveRoots[this.chordIndex];
        this.droneOsc?.frequency.setTargetAtTime(root, now, 0.1);
        this.padOsc1?.frequency.setTargetAtTime(root * 4, now, 0.2);
        this.padOsc2?.frequency.setTargetAtTime(root * 4 + 2.5, now, 0.2);
      } else if (isTitle) {
        this.chordIndex = (this.chordIndex + 1) % this.titleRoots.length;
        const root = this.titleRoots[this.chordIndex];
        this.droneOsc?.frequency.setTargetAtTime(root, now, 0.1);
        this.padOsc1?.frequency.setTargetAtTime(root * 4, now, 0.2);
        this.padOsc2?.frequency.setTargetAtTime(root * 4 + 2.5, now, 0.2);
      } else {
        this.chordIndex = (this.chordIndex + 1) % this.bassRoots.length;
        const root = this.bassRoots[this.chordIndex];
        this.droneOsc?.frequency.setTargetAtTime(root, now, 0.1);
        this.padOsc1?.frequency.setTargetAtTime(root * 4, now, 0.2);
        this.padOsc2?.frequency.setTargetAtTime(root * 4 + 2.5, now, 0.2);
      }
    }

    // 戰鬥打擊節奏網格 或 Synthwave 輕快鼓點
    if (isCombat || isBoss || isTape || isTitle) {
      const step = this.arpStep % 16;
      
      // Kick: 4-on-the-floor (0, 4, 8, 12) for combat/boss, 0, 8 for tape
      if (isTape) {
        if (step === 0 || step === 8) {
          this.playKick(this.ctx, now, false);
        }
      } else {
        if (step === 0 || step === 4 || step === 8 || step === 12) {
          this.playKick(this.ctx, now, isBoss);
        }
      }

      // Snare: Backbeat (4, 12)
      if (step === 4 || step === 12) {
        this.playSnare(this.ctx, now, isBoss);
      }

      // Hi-Hat: Off-beats (2, 6, 10, 14)
      if (step === 2 || step === 6 || step === 10 || step === 14) {
        this.playHiHat(this.ctx, now);
        if (isBoss) {
          // Boss mode: Double hi-hat or extra intensity
          this.playHiHat(this.ctx, now + 0.05);
        }
      }

      // Title mode: SubPulse heartbeat on step 0 & 2, gentle HiHat on step 8
      if (isTitle) {
        if (step === 0 || step === 2) {
          this.playSubPulse(this.ctx, now);
        }
        if (step === 8) {
          this.playHiHat(this.ctx, now);
        }
      }

      // Bass Pluck: Every 2 beats (0, 2, 4, 6...)
      if (step % 2 === 0) {
        try {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          const root = isTape ? this.synthwaveRoots[this.chordIndex] : this.bassRoots[this.chordIndex];
          
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(root, now);
          
          bassGain.gain.setValueAtTime(0.3, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          bassOsc.connect(bassGain);
          bassGain.connect(this.masterGain);
          bassOsc.start(now);
          bassOsc.stop(now + 0.1);
        } catch (e) {
          console.warn('Bass pluck error', e);
        }
      }
    }

    // 挑選琶音音符
    let freq: number;
    let oscType: OscillatorType;
    let peakGain: number;
    let decayTime: number;

    if (isTape) {
      // 80s Synthwave arpeggio
      const notePattern = [0, 2, 4, 6, 7, 5, 3, 1];
      const scaleIdx = notePattern[this.arpStep % notePattern.length];
      freq = this.synthwaveArpScale[scaleIdx];
      oscType = 'sawtooth';
      peakGain = 0.08;
      decayTime = 0.14;
    } else if (isTitle) {
      // Title screen: 16-step classic cyberpunk theme pattern
      const notePattern = [0, 3, 4, 5, 1, 3, 4, 6, 2, 5, 6, 5, 4, 3, 2, 1];
      const scaleIdx = notePattern[this.arpStep % notePattern.length];
      freq = this.titleArpScale[scaleIdx];
      oscType = 'sawtooth';
      peakGain = 0.09;
      decayTime = 0.28;
    } else {
      const notePattern = [0, 2, 4, 3, 1, 5, 2, 4];
      const scaleIdx = notePattern[this.arpStep % notePattern.length];
      freq = this.arpScale[scaleIdx];
      // Combat/Boss use sawtooth, Exploration uses triangle
      oscType = (isCombat || isBoss) ? 'sawtooth' : 'triangle';
      // Boss has higher volume
      peakGain = isBoss ? 0.12 : isCombat ? 0.08 : 0.06;
      decayTime = isBoss ? 0.1 : isCombat ? 0.14 : 0.22;
    }

    const osc = this.ctx.createOscillator();
    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peakGain, now);
    
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);

    this.arpStep++;
  }
}

export const bgm = new MusicSynthesizer();
export default bgm;
