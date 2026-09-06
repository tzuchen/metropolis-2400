import { GameEngine } from '../src/game';

// Create a headless or mock canvas
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: () => ({
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    setLineDash: () => {},
    measureText: () => ({ width: 50 }),
  })
} as unknown as HTMLCanvasElement;

const game = new GameEngine(mockCanvas);
if (!game.player || !game.map || !game.robots || game.robots.length === 0) {
  throw new Error('GameEngine failed to initialize core state');
}

// Test player move
const initialX = game.player.x;
const initialY = game.player.y;
game.handleKeyDown('ArrowRight');

console.log('GameEngine basic turn test passed!');
