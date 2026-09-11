import assert from 'node:assert';
import { bgm } from '../src/music';
import { GameEngine } from '../src/game';

// Mock window and AudioContext for Node.js environment to allow bgm.start() to succeed
(globalThis as any).window = {
  AudioContext: class {
    state = 'running';
    currentTime = 0;
    destination = {};
    createGain() {
      return {
        gain: { value: 0, setValueAtTime: () => {}, setTargetAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        disconnect: () => {}
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: { value: 0, setValueAtTime: () => {}, setTargetAtTime: () => {} },
        Q: { value: 0, setValueAtTime: () => {}, setTargetAtTime: () => {} },
        connect: () => {},
        disconnect: () => {}
      };
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { value: 0, setValueAtTime: () => {}, setTargetAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        disconnect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createBuffer() {
      return {
        getChannelData: () => new Float32Array(100)
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect: () => {},
        disconnect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    resume() {
      return Promise.resolve();
    }
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};

console.log('=== Testing Title Screen Background Music (Title BGM) ===');

// 1. Verify BGM initial intensity is 'title'
assert.strictEqual(bgm.currentIntensity, 'title', 'BGM default intensity must be title');
console.log('✓ BGM default intensity is title');

// 2. Mock Canvas for GameEngine
const canvas = {
  getContext: () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    measureText: () => ({ width: 0 }),
    rect: () => {},
    clip: () => {},
  }),
  width: 960,
  height: 600,
} as unknown as HTMLCanvasElement;

const game = new GameEngine(canvas);
game.isTitleScreen = true;

// 3. Verify game in title screen and render sets BGM to 'title'
game.render();
assert.strictEqual(bgm.currentIntensity, 'title', 'render() while on title screen must maintain title BGM');
console.log('✓ Title screen active: BGM intensity confirmed as title');

// 4. Verify transitioning from title screen into gameplay switches to 'exploration'
game.handleKeyDown('n'); // Start new game
assert.strictEqual(game.isTitleScreen, false, 'Title screen should be dismissed');
game.render();
assert.strictEqual(bgm.currentIntensity, 'exploration', 'BGM should switch to exploration after entering game');
console.log('✓ Entering gameplay: BGM seamlessly transitions from title to exploration');

// 5. Verify manual intensity switching
bgm.setIntensity('combat');
assert.strictEqual(bgm.currentIntensity, 'combat', 'BGM should switch to combat');
bgm.setIntensity('boss');
assert.strictEqual(bgm.currentIntensity, 'boss', 'BGM should switch to boss');
bgm.setIntensity('title');
assert.strictEqual(bgm.currentIntensity, 'title', 'BGM should switch back to title');
console.log('✓ BGM intensity transitions (title, exploration, combat, boss) verified');

// 6. Verify returning to title screen restores title BGM
game.isTitleScreen = true;
game.render();
assert.strictEqual(bgm.currentIntensity, 'title', 'Re-entering title screen restores title BGM');
console.log('✓ Returning to title screen restores title BGM');

// 7. 驗證 60 FPS 渲染循環下高頻調用 setIntensity 不會中斷或重置播放
for (let i = 0; i < 100; i++) {
  bgm.setIntensity('exploration');
}
assert.strictEqual(bgm.enabled, true, 'BGM should remain enabled after rapid setIntensity calls');
assert.strictEqual(bgm.currentIntensity, 'exploration', 'BGM intensity should remain exploration after rapid setIntensity calls');
console.log('✓ Rapid 60 FPS setIntensity loop does not reset timer or disrupt playback');

console.log('🎉 Title Screen BGM verification completed successfully!');
