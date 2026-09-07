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
      this.masterGain.gain.setTargetAtTime(0.24, now, 0.3);
    } else if (level === 'combat') {
      this.filterNode.frequency.setTargetAtTime(1100, now, 0.2);
      this.masterGain.gain.setTargetAtTime(0.32, now, 0.2);
    } else if (level === 'boss') {
      this.filterNode.frequency.setTargetAtTime(1600, now, 0.1);
      this.masterGain.gain.setTargetAtTime(0.36, now, 0.2);
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
    const intervalMs = this.intensity === 'boss' ? 140 : this.intensity === 'combat' ? 175 : 280;

    this.arpTimer = setInterval(() => {
      this.tickArp();
    }, intervalMs);
  }

  private tickArp(): void {
    if (!this.ctx || !this.isPlaying || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // 換根音 (每 16 拍切換和弦)
    if (this.arpStep % 16 === 0) {
      this.chordIndex = (this.chordIndex + 1) % this.bassRoots.length;
      const root = this.bassRoots[this.chordIndex];
      this.droneOsc?.frequency.setTargetAtTime(root, now, 0.1);
      this.padOsc1?.frequency.setTargetAtTime(root * 4, now, 0.2);
      this.padOsc2?.frequency.setTargetAtTime(root * 4 + 2.5, now, 0.2);
    }

    // 挑選琶音音符
    const notePattern = [0, 2, 4, 3, 1, 5, 2, 4];
    const scaleIdx = notePattern[this.arpStep % notePattern.length];
    const freq = this.arpScale[scaleIdx];

    const osc = this.ctx.createOscillator();
    osc.type = this.intensity === 'boss' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const gain = this.ctx.createGain();
    const peakGain = this.intensity === 'exploration' ? 0.04 : 0.08;
    gain.gain.setValueAtTime(peakGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (this.intensity === 'exploration' ? 0.22 : 0.14));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);

    this.arpStep++;
  }
}

export const bgm = new MusicSynthesizer();
