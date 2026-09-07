import { GameEngine, RESOLUTION_PRESETS } from '../src/game';

function createMockCanvas(w = 960, h = 600): any {
  return {
    width: w,
    height: h,
    getContext: () => ({
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: () => ({ width: 10 }),
      arc: () => {},
      fill: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
    }),
    parentElement: {
      style: {},
    },
  };
}

console.log('Testing Resolution Presets & Switching...');

// 1. Verify resolution presets constant
if (!Array.isArray(RESOLUTION_PRESETS) || RESOLUTION_PRESETS.length < 3) {
  throw new Error('Expected at least 3 resolution presets');
}

const stdPreset = RESOLUTION_PRESETS[0];
if (stdPreset.width !== 960 || stdPreset.height !== 600) {
  throw new Error(`Expected first preset to be 960x600, got ${stdPreset.width}x${stdPreset.height}`);
}

const hdPreset = RESOLUTION_PRESETS[1];
if (hdPreset.width !== 1200 || hdPreset.height !== 750) {
  throw new Error(`Expected second preset to be 1200x750, got ${hdPreset.width}x${hdPreset.height}`);
}

const compactPreset = RESOLUTION_PRESETS[2];
if (compactPreset.width !== 800 || compactPreset.height !== 500) {
  throw new Error(`Expected third preset to be 800x500, got ${compactPreset.width}x${compactPreset.height}`);
}

console.log('✅ Resolution presets defined correctly (960x600, 1200x750, 800x500)');

// 2. Initialize GameEngine and test resolution cycling
const canvas = createMockCanvas(960, 600);
const game = new GameEngine(canvas as any);

if (canvas.width !== 960 || canvas.height !== 600) {
  throw new Error(`Initial canvas dimensions expected 960x600, got ${canvas.width}x${canvas.height}`);
}

// 3. Test cycleResolution() method
const res1 = game.cycleResolution();
if (res1.width !== 1200 || res1.height !== 750 || canvas.width !== 1200 || canvas.height !== 750) {
  throw new Error(`Cycle 1 failed: expected 1200x750, got ${canvas.width}x${canvas.height}`);
}
console.log('✅ cycleResolution() 1 switched to HD 1200x750');

const res2 = game.cycleResolution();
if (res2.width !== 800 || res2.height !== 500 || canvas.width !== 800 || canvas.height !== 500) {
  throw new Error(`Cycle 2 failed: expected 800x500, got ${canvas.width}x${canvas.height}`);
}
console.log('✅ cycleResolution() 2 switched to COMPACT 800x500');

const res3 = game.cycleResolution();
if (res3.width !== 960 || res3.height !== 600 || canvas.width !== 960 || canvas.height !== 600) {
  throw new Error(`Cycle 3 failed: expected 960x600, got ${canvas.width}x${canvas.height}`);
}
console.log('✅ cycleResolution() 3 looped back to STD 960x600');

// 4. Test Keybinding [0] in title screen and in game
game.isTitleScreen = true;
game.handleKeyDown('0');
if (canvas.width !== 1200 || canvas.height !== 750) {
  throw new Error(`Key [0] in title screen failed: expected 1200x750, got ${canvas.width}x${canvas.height}`);
}
console.log('✅ Key [0] in Title Screen successfully switched resolution');

game.handleKeyDown('F10');
if (canvas.width !== 800 || canvas.height !== 500) {
  throw new Error(`Key [F10] in title screen failed: expected 800x500, got ${canvas.width}x${canvas.height}`);
}
console.log('✅ Key [F10] in Title Screen successfully switched resolution');

game.isTitleScreen = false;
game.handleKeyDown('0');
if (canvas.width !== 960 || canvas.height !== 600) {
  throw new Error(`Key [0] in game failed: expected 960x600, got ${canvas.width}x${canvas.height}`);
}
console.log('✅ Key [0] in Game Mode successfully switched resolution');

console.log('🎉 All Resolution presets and keybinding verification tests passed successfully!');
