import { GameEngine } from '../src/game';
import { setupSubSectorZero } from '../src/sewerMap';

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
      closePath: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
    }),
    parentElement: {
      style: {},
    },
  };
}

console.log('Testing Tactical Big Map System...');

const canvas = createMockCanvas(960, 600);
const game = new GameEngine(canvas as any);

// 1. Check initial state
if (game.isBigMapOpen) {
  throw new Error('Expected isBigMapOpen to be false initially');
}
console.log('✅ Initial Big Map state is closed');

// 2. Open Big Map via Tab key
game.handleKeyDown('Tab');
if (!game.isBigMapOpen) {
  throw new Error('Expected isBigMapOpen to be true after pressing Tab');
}
console.log('✅ Big Map opens on [Tab] key');

// 3. Render Sector 1 Big Map
game.render();
console.log('✅ Sector 1 Big Map renders cleanly');

// 4. Close Big Map via Tab
game.handleKeyDown('Tab');
if (game.isBigMapOpen) {
  throw new Error('Expected isBigMapOpen to be false after pressing Tab again');
}
console.log('✅ Big Map closes on [Tab] key toggle');

// 5. Open and Close via Escape
game.handleKeyDown('Tab');
if (!game.isBigMapOpen) throw new Error('Expected isBigMapOpen to be true');
game.handleKeyDown('Escape');
if (game.isBigMapOpen) throw new Error('Expected isBigMapOpen to be false after Escape');
console.log('✅ Big Map closes on [Escape] key');

// 6. Test Big Map in Sub-Sector Zero (Sewers)
setupSubSectorZero(game);
game.handleKeyDown('Tab');
if (!game.isBigMapOpen) throw new Error('Expected isBigMapOpen in Sub-Sector Zero');
game.render();
console.log('✅ Sub-Sector Zero (Sewers) Big Map renders cleanly');

// 7. Test Big Map with Omni-Vision and Full Map
game.toggleOmniVision();
game.toggleFullMap();
game.render();
console.log('✅ Big Map with Omni-Vision and Full Map Uplink renders cleanly');

console.log('🎉 All Tactical Big Map verification tests passed successfully!');
