import type { RandomSource } from './types';

/**
 * Deterministic pseudo-random number generator using the Mulberry32 algorithm.
 * Produces a sequence of numbers in [0, 1) that is fully reproducible for a given seed.
 * All finite numeric seeds are normalized deterministically to a 32-bit unsigned integer.
 * No use of Math.random within this module.
 */
export class DeterministicRNG implements RandomSource {
  private _seed: number;
  private _state: number;

  constructor(seed: number) {
    this._seed = this.normalizeSeed(seed);
    this._state = this._seed;
  }

  /**
   * Normalize any finite numeric seed to a 32-bit unsigned integer deterministically.
   * - Non-finite values (NaN, Infinity, -Infinity) are mapped to 0.
   * - Negative numbers are handled via bit manipulation to produce a consistent unsigned int.
   * - The result is always an integer in [0, 2^32).
   */
  private normalizeSeed(seed: number): number {
    if (!Number.isFinite(seed)) {
      return 0;
    }
    // Convert to a 32-bit signed integer, then to unsigned
    let s = Math.trunc(seed);
    // Handle negative numbers: convert to unsigned 32-bit
    s = s | 0; // force to 32-bit signed
    // Convert to unsigned 32-bit
    s = s >>> 0;
    return s;
  }

  /**
   * Set a new seed for the RNG. The sequence will restart from this seed.
   */
  setSeed(seed: number): void {
    this._seed = this.normalizeSeed(seed);
    this._state = this._seed;
  }

  /**
   * Get the current seed (normalized).
   */
  get seed(): number {
    return this._seed;
  }

  /**
   * Generate the next pseudo-random number in [0, 1).
   * Uses the Mulberry32 algorithm.
   */
  next(): number {
    return this.random();
  }

  /**
   * Alias for next(). Generate the next pseudo-random number in [0, 1).
   */
  random(): number {
    // Mulberry32
    let t = (this._state + 0x6D2B79F5) | 0;
    this._state = t;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const result = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return result;
  }

  /**
   * Generate a random integer in [min, max] (inclusive).
   */
  nextInt(min: number, max: number): number {
    if (min > max) {
      [min, max] = [max, min];
    }
    const range = max - min + 1;
    return min + Math.floor(this.next() * range);
  }

  /**
   * Generate a random float in [min, max).
   */
  nextFloat(min: number, max: number): number {
    if (min > max) {
      [min, max] = [max, min];
    }
    return min + this.next() * (max - min);
  }

  /**
   * Pick a random element from the given array.
   */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    const index = Math.floor(this.next() * items.length);
    return items[index];
  }

  /**
   * Return a new array with elements shuffled using Fisher-Yates.
   */
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Return true with the given probability.
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

export default DeterministicRNG;
