import { GameEngine } from '../src/game';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

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
    arcTo: () => {},
    fill: () => {},
    stroke: () => {},
    clip: () => {},
    setLineDash: () => {},
    measureText: () => ({ width: 50 }),
  }),
} as unknown as HTMLCanvasElement;

const game = new GameEngine(mockCanvas);
game.isTitleScreen = false;
game.switchSector('sub-sector-0');
assert((game as any).map.id === 'sub-sector-0', 'Setup should enter Sub-Sector Zero');

game.handleKeyDown('8');
assert(game.hasSaveGame(), 'Saving in Sub-Sector Zero should create a save');

game.switchSector('sector-1');
assert((game as any).map.id === 'sector-1', 'Setup should leave Sub-Sector Zero before loading');

game.handleKeyDown('9');
assert((game as any).map.id === 'sub-sector-0', 'Loading should restore the saved Sub-Sector Zero map');
assert((game.player as any).currentSectorId === 'sub-sector-0', 'Loading should restore the saved sector id');

console.log('Generic sector save restoration verified.');
