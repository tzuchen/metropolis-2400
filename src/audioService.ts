import { SoundFX, soundFX } from './audio';
import { MusicSynthesizer, bgm } from './music';
import type {
  AudioVolume,
  AudioLifecycleState,
  AudioLifecycleController,
  SfxAudioController,
  MusicAudioController,
} from './types';

/**
 * AudioService
 *
 * Owns global mute and master/music/SFX volume coordination over
 * SoundFX and MusicSynthesizer via narrow interfaces.
 *
 * - Safe when Web Audio / window is absent (all operations are no-ops).
 * - Idempotent: repeated calls with the same value do not cause side effects.
 * - Clamps all volume values to [0, 1].
 * - Does NOT create AudioContext itself; delegates to SoundFX / MusicSynthesizer.
 */
export class AudioService implements AudioLifecycleController {
  private readonly sfxEngine: SoundFX;
  private readonly musicEngine: MusicSynthesizer;

  private _muted: boolean = false;
  private _masterVolume: AudioVolume = 0.5;
  private _musicVolume: AudioVolume = 0.5;
  private _sfxVolume: AudioVolume = 0.5;

  constructor(sfx?: SoundFX, music?: MusicSynthesizer) {
    this.sfxEngine = sfx ?? soundFX;
    this.musicEngine = music ?? bgm;
  }

  // ─── Narrow interface adapters ────────────────────────────────────────────

  /** Returns a narrow SFX controller view. */
  get sfxController(): SfxAudioController {
    return this;
  }

  /** Returns a narrow Music controller view. */
  get musicController(): MusicAudioController {
    return this;
  }

  // ─── AudioLifecycleController: state ──────────────────────────────────────

  get state(): AudioLifecycleState {
    return {
      muted: this._muted,
      masterVolume: this._masterVolume,
      musicVolume: this._musicVolume,
      sfxVolume: this._sfxVolume,
    };
  }

  // ─── AudioLifecycleController: sfx / music accessors ──────────────────────

  get sfx(): SfxAudioController {
    return this;
  }

  get music(): MusicAudioController {
    return this;
  }

  // ─── AudioController (shared by SfxAudioController & MusicAudioController) ─

  get muted(): boolean {
    return this._muted;
  }

  get volume(): AudioVolume {
    return this._masterVolume;
  }

  setMuted(muted: boolean): void {
    if (this._muted === muted) return; // idempotent
    this._muted = muted;

    // Propagate to SFX
    this.sfxEngine.setMuted(muted);

    // Propagate to Music
    this.musicEngine.setMuted(muted);
  }

  setVolume(volume: AudioVolume): void {
    const clamped = this.clampVolume(volume);
    if (this._masterVolume === clamped) return; // idempotent
    this._masterVolume = clamped;

    // Apply to SFX
    this.sfxEngine.setVolume(clamped);

    // Apply to Music
    this.musicEngine.setVolume(clamped);
  }

  unlock(): void {
    this.sfxEngine.unlock();
    this.musicEngine.unlock();
  }

  resume(): void {
    this.sfxEngine.resume();
    this.musicEngine.resume();
  }

  // ─── SfxAudioController ───────────────────────────────────────────────────

  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  // ─── MusicAudioController ─────────────────────────────────────────────────

  get enabled(): boolean {
    return this.musicEngine.enabled;
  }

  get currentIntensity(): 'title' | 'exploration' | 'combat' | 'boss' {
    return this.musicEngine.currentIntensity;
  }

  start(): void {
    if (this._muted) return;
    this.musicEngine.start();
  }

  stop(): void {
    this.musicEngine.stop();
  }

  toggle(): boolean {
    return this.musicEngine.toggle();
  }

  setIntensity(level: 'title' | 'exploration' | 'combat' | 'boss'): void {
    this.musicEngine.setIntensity(level);
  }

  // ─── AudioLifecycleController: volume setters ─────────────────────────────

  setMasterVolume(volume: AudioVolume): void {
    const clamped = this.clampVolume(volume);
    if (this._masterVolume === clamped) return; // idempotent
    this._masterVolume = clamped;

    // Master volume affects SFX directly
    this.sfxEngine.setVolume(clamped);

    // Also scale music proportionally if music volume hasn't been explicitly set
    // to a different value. We keep music volume independent but apply master as a
    // multiplier on top of the music-specific volume.
    this.applyMusicVolume();
  }

  setMusicVolume(volume: AudioVolume): void {
    const clamped = this.clampVolume(volume);
    if (this._musicVolume === clamped) return; // idempotent
    this._musicVolume = clamped;
    this.applyMusicVolume();
  }

  setSfxVolume(volume: AudioVolume): void {
    const clamped = this.clampVolume(volume);
    if (this._sfxVolume === clamped) return; // idempotent
    this._sfxVolume = clamped;
    this.applySfxVolume();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private clampVolume(v: AudioVolume): AudioVolume {
    const n = Number.isFinite(v) ? v : 0;
    return Math.min(1, Math.max(0, n));
  }

  private applySfxVolume(): void {
    // Effective SFX volume = masterVolume * sfxVolume
    const effective = this._masterVolume * this._sfxVolume;
    this.sfxEngine.setVolume(effective);
  }

  private applyMusicVolume(): void {
    // Effective music volume = masterVolume * musicVolume
    const effective = this._masterVolume * this._musicVolume;
    this.musicEngine.setVolume(effective);
  }
}

export const audioService = new AudioService();
export default audioService;
