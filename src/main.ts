import * as gameModule from './game';
import * as audioModule from './audio';
import * as musicModule from './music';

type GameEngineInstance = {
  handleKeyDown(key: string): void;
};

type GameEngineConstructor = new (canvas: HTMLCanvasElement) => GameEngineInstance;

function resolveGameEngine(): GameEngineConstructor {
  const named = (gameModule as unknown as { GameEngine?: GameEngineConstructor }).GameEngine;
  const fallback = (gameModule as unknown as { default?: GameEngineConstructor }).default;
  const Ctor = named ?? fallback;

  if (typeof Ctor !== 'function') {
    throw new Error('GameEngine export not found in ./game');
  }

  return Ctor as GameEngineConstructor;
}

function resolveSoundFX(): unknown {
  const named = (audioModule as unknown as { soundFX?: unknown }).soundFX;
  const fallback = (audioModule as unknown as { default?: unknown }).default;
  return named ?? fallback;
}

function resolveBGM(): unknown {
  const named = (musicModule as unknown as { bgm?: unknown }).bgm;
  const fallback = (musicModule as unknown as { default?: unknown }).default;
  return named ?? fallback;
}

function unlockAudioContext(soundFX: unknown): void {
  const audio = soundFX as {
    unlock?: unknown;
    resume?: unknown;
    init?: unknown;
    ctx?: { resume?: unknown };
    audioContext?: { resume?: unknown };
  };

  if (typeof audio.unlock === 'function') {
    audio.unlock();
  } else if (typeof audio.resume === 'function') {
    audio.resume();
  } else if (audio.ctx && typeof audio.ctx.resume === 'function') {
    audio.ctx.resume();
  } else if (audio.audioContext && typeof audio.audioContext.resume === 'function') {
    audio.audioContext.resume();
  } else if (typeof audio.init === 'function') {
    audio.init();
  }
}

export function initGame(): GameEngineInstance {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;

  if (!canvas) {
    throw new Error('#game-canvas not found');
  }

  const GameEngineCtor = resolveGameEngine();
  const engine = new GameEngineCtor(canvas);
  (window as any).game = engine;
  const soundFX = resolveSoundFX();
  const bgm = resolveBGM() as { start?: () => void } | undefined;
  let audioUnlocked = false;

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    const blockedKeys = [' ', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];

    if (blockedKeys.includes(event.key) || event.code === 'Space') {
      event.preventDefault();
    }

    if (!audioUnlocked) {
      audioUnlocked = true;
      unlockAudioContext(soundFX);

      if (bgm && typeof bgm.start === 'function') {
        bgm.start();
      }
    }

    engine.handleKeyDown(event.key);
  });

  return engine;
}

initGame();

export default initGame;
