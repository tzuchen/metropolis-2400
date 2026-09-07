/**
 * Procedural Cyberpunk Synthesizer Background Music (Dark Synthwave / Ambient Drone)
 * Zero external audio files: 100% synthesized via Web Audio API.
 */

export type MusicIntensity = 'exploration' | 'combat' | 'boss';

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
  private intensity: MusicIntensity = 'exploration';
  private arpTimer: any = null;
  private arpStep: number = 0;

  // A minor pentatonic frequencies (Hz): A2, C3, D3, E3, G3, A3
  private readonly arpScale = [110, 130.81, 146.83, 164.81, 196.0, 220.0];
  // Bass roots: A1 (55Hz), F1 (43.65Hz), C2 (65.41Hz), G1 (49Hz)
  private readonly bassRoots = [55, 43.65, 65.41, 49];
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
    this.droneOsc = ctx.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.setValueAtTime(55, now);

    this.droneGain = ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.18, now);

    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    this.droneOsc.start();

    // 2. 雙重失諧賽博氛圍襯底 (Detuned Cyber Pad)
    this.padOsc1 = ctx.createOscillator();
    this.padOsc1.type = 'sawtooth';
    this.padOsc1.frequency.setValueAtTime(220, now); // A3

    this.padOsc2 = ctx.createOscillator();
    this.padOsc2.type = 'sawtooth';
    this.padOsc2.frequency.setValueAtTime(222.5, now); // Detuned +2.5Hz for chorus shimmer

    this.padGain = ctx.createGain();
    this.padGain.gain.setValueAtTime(0.08, now);

    this.padOsc1.connect(this.padGain);
    this.padOsc2.connect(this.padGain);
    this.padGain.connect(this.masterGain);
    this.padOsc1.start();
    this.padOsc2.start();

    // 3. 啟動琶音器定時器 (Arpeggiator Loop)
    this.scheduleArp();
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
    if (this.isPlaying && !this.isMuted) {
      this.isMuted = true;
      this.stop();
      return false;
    } else {
      this.isMuted = false;
      this.start();
      return true;
    }
  }

  setIntensity(level: MusicIntensity): void {
    if (this.intensity === level) return;
    this.intensity = level;
    if (!this.ctx || !this.filterNode || !this.masterGain) return;

    const now = this.ctx.currentTime;
    if (level === 'exploration') {
      this.filterNode.frequency.setTargetAtTime(550, now, 0.4);
      this.masterGain.gain.setTargetAtTime(0.22, now, 0.3);
    } else if (level === 'combat') {
      this.filterNode.frequency.setTargetAtTime(1500, now, 0.2);
      this.masterGain.gain.setTargetAtTime(0.35, now, 0.2);
    } else if (level === 'boss') {
      this.filterNode.frequency.setTargetAtTime(2400, now, 0.1);
      this.masterGain.gain.setTargetAtTime(0.40, now, 0.2);
    }

    // 重啟琶音器以匹配戰鬥節奏
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
    const intervalMs = this.intensity === 'boss' ? 120 : this.intensity === 'combat' ? 150 : 280;

    this.arpTimer = setInterval(() => {
      this.tickArp();
    }, intervalMs);
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

    // 換根音 (每 16 拍切換和弦)
    if (this.arpStep % 16 === 0) {
      this.chordIndex = (this.chordIndex + 1) % this.bassRoots.length;
      const root = this.bassRoots[this.chordIndex];
      this.droneOsc?.frequency.setTargetAtTime(root, now, 0.1);
      this.padOsc1?.frequency.setTargetAtTime(root * 4, now, 0.2);
      this.padOsc2?.frequency.setTargetAtTime(root * 4 + 2.5, now, 0.2);
    }

    // 戰鬥打擊節奏網格
    if (isCombat || isBoss) {
      const step = this.arpStep % 16;
      
      // Kick: 4-on-the-floor (0, 4, 8, 12)
      if (step === 0 || step === 4 || step === 8 || step === 12) {
        this.playKick(this.ctx, now, isBoss);
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

      // Bass Pluck: Every 2 beats (0, 2, 4, 6...)
      if (step % 2 === 0) {
        try {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          const root = this.bassRoots[this.chordIndex];
          
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
    const notePattern = [0, 2, 4, 3, 1, 5, 2, 4];
    const scaleIdx = notePattern[this.arpStep % notePattern.length];
    const freq = this.arpScale[scaleIdx];

    const osc = this.ctx.createOscillator();
    // Combat/Boss use sawtooth, Exploration uses triangle
    osc.type = (isCombat || isBoss) ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const gain = this.ctx.createGain();
    // Boss has higher volume
    const peakGain = isBoss ? 0.12 : isCombat ? 0.08 : 0.04;
    gain.gain.setValueAtTime(peakGain, now);
    
    const decayTime = isBoss ? 0.1 : isCombat ? 0.14 : 0.22;
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
