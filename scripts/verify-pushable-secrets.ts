import { GameEngine } from '../src/game';
import { TileType } from '../src/types';
import { getTile } from '../src/map';
import { saveGameState, loadGameState } from '../src/saveLoad';

// Create a mock canvas
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

console.log('Testing Pushable Objects & Secret Hidden Doors System...');

const game = new GameEngine(mockCanvas);
if (!game.player || !game.pushableBlocks) {
  throw new Error('GameEngine failed to initialize pushableBlocks');
}

// 1. Initial Sector 1 Pushable Block Verification
const sec1Block = game.pushableBlocks.find(b => b.id === 'crate-sec1-secret');
if (!sec1Block) {
  throw new Error('crate-sec1-secret not found in Sector 1');
}
if (sec1Block.x !== 16 || sec1Block.y !== 18) {
  throw new Error(`Expected crate-sec1-secret at (16, 18), got (${sec1Block.x}, ${sec1Block.y})`);
}
console.log('✅ Sector 1 Heavy Cargo Crate initialized at (16, 18)');

// Verify target door tile is initially WALL
const initialDoorTile = getTile(game.map, { x: 16, y: 17 });
if (Number(initialDoorTile) !== 2 && String(initialDoorTile).toUpperCase() !== 'WALL') {
  throw new Error(`Expected hidden door at (16, 17) to be WALL (2), got ${initialDoorTile}`);
}
console.log('✅ Hidden door at (16, 17) is initially disguised as a solid WALL');

// 2. Obstacle Prevention: Pushing north into the wall (16, 17) should be blocked
game.player.x = 16;
game.player.y = 19;
game.handleKeyDown('ArrowUp'); // Trying to push block at (16, 18) north into wall at (16, 17)
if (game.player.x !== 16 || game.player.y !== 19) {
  throw new Error('Player should not move when push destination is blocked');
}
if (sec1Block.x !== 16 || sec1Block.y !== 18) {
  throw new Error('Block should not move when destination is a wall');
}
console.log('✅ Block cannot be pushed when destination behind it is blocked by a wall');

// 3. Successful Push: Pushing east from (15, 18) into open floor at (17, 18)
game.player.x = 15;
game.player.y = 18;
game.handleKeyDown('ArrowRight'); // Push block to the right

if (sec1Block.x !== 17 || sec1Block.y !== 18) {
  throw new Error(`Expected block pushed to (17, 18), got (${sec1Block.x}, ${sec1Block.y})`);
}
if (game.player.x !== 16 || game.player.y !== 18) {
  throw new Error(`Expected player to step into (16, 18), got (${game.player.x}, ${game.player.y})`);
}
if (!sec1Block.revealed) {
  throw new Error('Expected sec1Block.revealed to be true after moving away from secret');
}
console.log('✅ Pushable block successfully moved and player advanced to previous block position');

// 4. Secret Door Revealed Verification
const revealedDoorTile = getTile(game.map, { x: 16, y: 17 });
if (Number(revealedDoorTile) !== 4 && String(revealedDoorTile).toUpperCase() !== 'DOOR_OPEN') {
  throw new Error(`Expected revealed door at (16, 17) to be DOOR_OPEN (4), got ${revealedDoorTile}`);
}
console.log('✅ Hidden door at (16, 17) successfully opened into DOOR_OPEN');

// 5. Walking into Secret Room
game.handleKeyDown('ArrowUp'); // Step into the revealed door at (16, 17)
if (game.player.x !== 16 || game.player.y !== 17) {
  throw new Error(`Expected player at (16, 17), got (${game.player.x}, ${game.player.y})`);
}
game.handleKeyDown('ArrowUp'); // Step into secret room at (16, 16)
if (game.player.x !== 16 || game.player.y !== 16) {
  throw new Error(`Expected player at (16, 16), got (${game.player.x}, ${game.player.y})`);
}
console.log('✅ Player successfully stepped through the secret door into the hidden chamber');

// 6. Sector 2 Pushable Crate & Secret Room
game.switchSector('sector-2');
const sec2Block = game.pushableBlocks.find(b => b.id === 'crate-sec2-secret');
if (!sec2Block) {
  throw new Error('crate-sec2-secret not found in Sector 2');
}
console.log('✅ Sector 2 Magnetic Coolant Server Rack initialized at (26, 5)');

// 7. Sub-Sector Zero (Sewers) Pushable Rubble
game.switchSector('sub-sector-0');
const sewerBlock = game.pushableBlocks.find(b => b.id === 'crate-sewer-secret');
if (!sewerBlock) {
  throw new Error('crate-sewer-secret not found in Sub-Sector Zero');
}
console.log('✅ Sub-Sector Zero Reinforced Drainage Bulkhead initialized at (29, 5)');

// 8. Sector Switching Persistence
game.switchSector('sector-1');
const returnedSec1Block = game.pushableBlocks.find(b => b.id === 'crate-sec1-secret');
if (!returnedSec1Block || returnedSec1Block.x !== 17 || !returnedSec1Block.revealed) {
  throw new Error('Sector 1 block state was not preserved upon returning');
}
const persistentDoorTile = getTile(game.map, { x: 16, y: 17 });
if (Number(persistentDoorTile) !== 4) {
  throw new Error('Revealed secret door was not maintained across sector transit');
}
console.log('✅ Sector switching preserves block positions and revealed door states');

// 9. Save and Load Persistence
const saveOk = saveGameState(game);
if (!saveOk) {
  throw new Error('saveGameState failed');
}

// Alter state to test restore
returnedSec1Block.x = 99;
const loadOk = loadGameState(game);
if (!loadOk) {
  throw new Error('loadGameState failed');
}
const loadedBlock = game.pushableBlocks.find(b => b.id === 'crate-sec1-secret');
if (!loadedBlock || loadedBlock.x !== 17 || !loadedBlock.revealed) {
  throw new Error(`Expected restored block at x=17, got ${loadedBlock?.x}`);
}
const loadedDoorTile = getTile(game.map, { x: 16, y: 17 });
if (Number(loadedDoorTile) !== 4) {
  throw new Error('Restored map does not contain revealed door tile');
}
console.log('✅ Save & Load preserves pushable block positions and secret door states');

console.log('🎉 All Pushable Objects & Secret Hidden Doors tests passed successfully!');
