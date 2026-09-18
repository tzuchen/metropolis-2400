import { EffectPreset } from './types';

export const EFFECT_PRESETS: Record<string, EffectPreset> = {
  EMP_SHOCKWAVE: {
    id: 'EMP_SHOCKWAVE',
    name: 'EMP Shockwave',
    shakeIntensity: 15,
    particleCount: 48,
    particleColors: ['#00f0ff', '#c77dff', '#ffffff'],
    particleMinLife: 20,
    particleMaxLife: 35,
    particleMinSize: 2.5,
    particleMaxSize: 5.5,
    particleMinSpeed: 3.5,
    particleMaxSpeed: 8.5,
    shockwaveMaxRadius: 220,
    shockwaveSpeed: 1,
    shockwaveColor: '#00f0ff',
    shockwaveSecondaryColor: '#c77dff',
    shockwaveLineWidth: 6,
    shockwaveLife: 35,
    flashAlpha: 0.35,
  },
  PLASMA_CANISTER_EXPLOSION: {
    id: 'PLASMA_CANISTER_EXPLOSION',
    name: 'Plasma Canister Explosion',
    shakeIntensity: 14,
    particleCount: 28,
    particleColors: ['#ff6600', '#ffcc00', '#00f0ff', '#ffffff'],
    particleMinLife: 18,
    particleMaxLife: 30,
    particleMinSize: 2,
    particleMaxSize: 5,
    particleMinSpeed: 2.5,
    particleMaxSpeed: 7,
    shockwaveMaxRadius: 105,
    shockwaveSpeed: 1,
    shockwaveColor: '#ff6600',
    shockwaveSecondaryColor: '#ffcc00',
    shockwaveLineWidth: 5,
    shockwaveLife: 30,
  },
  SYNCHRONIZER_SABOTAGE: {
    id: 'SYNCHRONIZER_SABOTAGE',
    name: 'Synchronizer Sabotage',
    shakeIntensity: 10,
    particleCount: 20,
    particleColors: ['#ff0000'],
  },
  SYNCHRONIZER_SUBVERSION: {
    id: 'SYNCHRONIZER_SUBVERSION',
    name: 'Synchronizer Subversion',
    shakeIntensity: 5,
    particleCount: 10,
    particleColors: ['#00ff00'],
  },
};

export function getEffectPreset(id: string): EffectPreset | undefined {
  return EFFECT_PRESETS[id];
}
