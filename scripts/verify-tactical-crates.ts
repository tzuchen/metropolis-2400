import { GameEngine } from '../src/game';
import { TileType } from '../src/types';
import { getTile, hasLineOfSight } from '../src/map';
import { saveGameState, loadGameState } from '../src/saveLoad';

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
    clip: () => {},
    setLineDash: () => {},
    measureText: () => ({ width: 50 }),
  }),
} as unknown as HTMLCanvasElement;

console.log('Testing Tactical Pushable Crates, Server Racks & Surprises...');

const game = new GameEngine(mockCanvas);

// 1. Verify Block Types across sectors
const sec1Crate = game.pushableBlocks.find((b) => b.id === 'crate-sec1-alley');
const sec1Rack = game.pushableBlocks.find((b) => b.id === 'crate-sec1-rack');
const sec1Wall = game.pushableBlocks.find((b) => b.id === 'crate-sec1-secret');

if (!sec1Crate || sec1Crate.blockType !== 'crate') {
  throw new Error('Expected crate-sec1-alley with blockType "crate"');
}
if (!sec1Rack || sec1Rack.blockType !== 'server_rack') {
  throw new Error('Expected crate-sec1-rack with blockType "server_rack"');
}
if (!sec1Wall || sec1Wall.blockType !== 'disguised_wall') {
  throw new Error('Expected crate-sec1-secret with blockType "disguised_wall"');
}
console.log('✅ Sector 1 contains distinct crate, server_rack, and disguised_wall blocks');

// 2. Test Surprise Loot on Crate Push (Credits)
const initialCredits = game.player.credits;
game.player.x = 20;
game.player.y = 14;
game.handleKeyDown('ArrowDown'); // Push crate at (20, 15) down to (20, 16)

if (sec1Crate.x !== 20 || sec1Crate.y !== 16) {
  throw new Error(`Expected crate-sec1-alley at (20, 16), got (${sec1Crate.x}, ${sec1Crate.y})`);
}
if (game.player.credits !== initialCredits + 150) {
  throw new Error(`Expected credits ${initialCredits + 150}, got ${game.player.credits}`);
}
if (!sec1Crate.secretSurprise?.claimed) {
  throw new Error('Expected crate secret surprise to be claimed');
}
console.log('✅ Pushing cargo crate awarded 150 Credits secret surprise');

// Pushing it again should NOT give duplicate reward
const creditsAfterFirstPush = game.player.credits;
game.player.x = 20;
game.player.y = 15;
game.handleKeyDown('ArrowDown'); // Push crate at (20, 16) down to (20, 17)
if (game.player.credits !== creditsAfterFirstPush) {
  throw new Error('Claimed surprise should not grant duplicate credits');
}
console.log('✅ Claimed surprise prevents duplicate credit rewards');

// 3. Test Surprise Loot on Server Rack Push (Energy)
game.player.energy = 20;
game.player.maxEnergy = 100;
game.player.x = 32;
game.player.y = 23;
game.handleKeyDown('ArrowRight'); // Push rack at (33, 23) right to (34, 23)

if (sec1Rack.x !== 34 || sec1Rack.y !== 23) {
  throw new Error(`Expected rack at (34, 23), got (${sec1Rack.x}, ${sec1Rack.y})`);
}
if (game.player.energy !== 80) { // 20 + 60 = 80
  throw new Error(`Expected player energy 80, got ${game.player.energy}`);
}
if (!sec1Rack.secretSurprise?.claimed) {
  throw new Error('Expected server rack secret surprise to be claimed');
}
console.log('✅ Pushing server rack restored 60 Energy units');

// 4. Test Item Drop Surprise in Sub-Sector Zero
game.switchSector('sub-sector-0');
const sewerCrate = game.pushableBlocks.find((b) => b.id === 'crate-sewer-crate');
if (!sewerCrate || sewerCrate.blockType !== 'crate') {
  throw new Error('Expected crate-sewer-crate in sub-sector-0');
}
const initialMedkits = game.player.consumables?.medkits ?? 0;
game.player.x = 10;
game.player.y = 9;
game.handleKeyDown('ArrowDown'); // Push sewer crate at (10, 10) down to (10, 11)

if (sewerCrate.x !== 10 || sewerCrate.y !== 11) {
  throw new Error(`Expected sewer crate at (10, 11), got (${sewerCrate.x}, ${sewerCrate.y})`);
}
const acquiredMedkit = (game.player.consumables?.medkits ?? 0) === initialMedkits + 1;
if (!acquiredMedkit) {
  throw new Error('Expected Nanite Medkit acquired from crate surprise');
}
console.log('✅ Pushing sewer crate uncovered Nanite Medkit and auto-collected to inventory');

// 5. Tactical Robot Line of Sight & Attack Shielding
game.switchSector('sector-1');
// Place a crate directly between a robot and the player
const testCrate = game.pushableBlocks.find((b) => b.id === 'crate-sec1-alley')!;
testCrate.x = 15;
testCrate.y = 10;

game.player.x = 17;
game.player.y = 10;
game.player.hp = 100;

// Put map.pushableBlocks into map
(game.map as any).pushableBlocks = game.pushableBlocks;

// Check LOS: from (13, 10) to (17, 10) should be blocked by testCrate at (15, 10)
const losBlocked = !hasLineOfSight(game.map, { x: 13, y: 10 }, { x: 17, y: 10 });
if (!losBlocked) {
  throw new Error('Expected line of sight to be blocked by pushable crate at (15, 10)');
}
console.log('✅ hasLineOfSight confirms crate blocks vision and line of fire');

// Place Hunter-Killer robot at (13, 10)
const hkRobot = game.robots.find((r) => r.robotType === 'HUNTER_KILLER');
if (hkRobot) {
  hkRobot.x = 13;
  hkRobot.y = 10;
  hkRobot.isAlive = true;

  // Let robot execute an attack action against player while testCrate is between them
  const initialHp = game.player.hp;
  // findPushableBlockOnLine should detect testCrate
  const cover = game.findPushableBlockOnLine({ x: hkRobot.x, y: hkRobot.y }, { x: game.player.x, y: game.player.y });
  if (!cover || cover.id !== testCrate.id) {
    throw new Error('Expected findPushableBlockOnLine to find testCrate');
  }

  // Run game.tick() and ensure the cover blocks robot attack and player takes 0 damage
  game.tick();
  if (game.player.hp !== initialHp) {
    throw new Error(`Expected player HP to remain ${initialHp} behind cover, got ${game.player.hp}`);
  }
  console.log('✅ Tactical cover blocked Hunter-Killer ranged attack, protecting player');
}

// 6. Test Player Laser Blocked by Crate
game.player.isWeaponDrawn = true;
game.player.energy = 50;
game.player.x = 14;
game.player.y = 10;
// Test firing right towards testCrate at (15, 10)
const fired = game.fireEquippedWeapon({ dx: 1, dy: 0 });
if (!fired) {
  throw new Error('Weapon should fire towards crate');
}
console.log('✅ Player weapon impact stopped by pushable block without passing through');

// 7. Test Save & Load State
saveGameState(game);
// Move crate to new position
testCrate.x = 15;
testCrate.y = 12;

loadGameState(game);
const reloadedCrate = game.pushableBlocks.find((b) => b.id === 'crate-sec1-alley');
if (!reloadedCrate || reloadedCrate.x !== 15 || reloadedCrate.y !== 10) {
  throw new Error(`Expected reloaded crate at (15, 10), got (${reloadedCrate?.x}, ${reloadedCrate?.y})`);
}
if (!reloadedCrate.secretSurprise?.claimed) {
  throw new Error('Expected reloaded crate surprise claimed state to be preserved');
}
console.log('✅ Save & Load successfully preserved pushable crate positions and surprise state');

console.log('🎉 All Tactical Pushable Crates, Server Racks & Surprises tests passed successfully!');
