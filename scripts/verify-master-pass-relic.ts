import { GameEngine } from '../src/game';
import { TerminalSession } from '../src/terminal';
import { SecurityLevel } from '../src/types';
import { saveGameState, loadGameState } from '../src/saveLoad';

const mockCanvas = {
  width: 960,
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

console.log('Testing Legendary Relic: Tzorg Master Pass & Neural Collar Disarm...');

const game = new GameEngine(mockCanvas);

// 1. Initial State: Collar restriction is active
if (game.isCollarDisarmed || game.player.isCollarDisarmed) {
  throw new Error('Collar should initially NOT be disarmed');
}
console.log('✅ Initial collar surveillance restriction is active (100-step limit)');

// 2. Access Denied without Master Pass
const safehouseTerm = game.findTerminalAt(4, 4);
if (!safehouseTerm) {
  throw new Error('Safehouse terminal not found');
}
const sessionWithoutPass = new TerminalSession(safehouseTerm);
const resDenied = sessionWithoutPass.executeCommand('DISARM', {
  items: (game.player.inventory || []).map((i: any) => i.id),
  player: game.player,
});
if (resDenied.disarmCollar || !resDenied.output?.includes('ACCESS DENIED')) {
  throw new Error('DISARM command should be denied without Master Pass');
}
console.log('✅ DISARM command rejected when operative lacks Master Pass');

// 3. Relic Location in Sub-Sector Zero (Sewers Hidden Room)
game.switchSector('sub-sector-0');
const masterPassGroundItem = game.groundItems.find((it) => it.id === 'item-master-pass');
if (!masterPassGroundItem) {
  throw new Error('item-master-pass not found in Sub-Sector Zero');
}
if (masterPassGroundItem.x !== 32 || masterPassGroundItem.y !== 5) {
  throw new Error(`Expected item-master-pass at (32, 5), got (${masterPassGroundItem.x}, ${masterPassGroundItem.y})`);
}
console.log('✅ Legendary Relic [Tzorg Master Keycard] located at (32, 5) inside Smuggler Hidden Room');

// 4. Pickup the Relic
game.player.x = 32;
game.player.y = 5;
(game as any).checkItemPickup();

const hasPassInInv = (game.player.inventory || []).some((it: any) => it?.id === 'item-master-pass');
if (!hasPassInInv) {
  throw new Error('Failed to pick up item-master-pass into inventory');
}
console.log('✅ Operative acquired [Tzorg Master Keycard] into inventory');

// 5. Terminal Operation with Master Pass (DISARM command)
const sewerTerminal = (game.map as any).terminals?.['SEWER_PUMP_TERMINAL'];
if (!sewerTerminal) {
  throw new Error('SEWER_PUMP_TERMINAL not found');
}
game.activeTerminal = new TerminalSession(sewerTerminal);

// First simulate an active alert and low timer
game.securityLevel = 'ALERT' as SecurityLevel;
game.checkInAlertActive = true;
game.player.checkInTimer = 8;
if (game.robots[0]) {
  game.robots[0].aiState = 'chase';
}

const itemsWithPass = (game.player.inventory || []).map((i: any) => i.id);
const resDisarm = game.activeTerminal.executeCommand('DISARM', {
  items: itemsWithPass,
  player: game.player,
});

if (!resDisarm.disarmCollar) {
  throw new Error('DISARM command should succeed with Master Pass');
}

// Emulate game engine processing the command result
game.disarmCollar();

if (!game.isCollarDisarmed || !game.player.isCollarDisarmed) {
  throw new Error('GameEngine and Player isCollarDisarmed should be true');
}
if (game.securityLevel !== 'CLEAR') {
  throw new Error('Security level should be CLEAR after disarming collar');
}
if (game.checkInAlertActive !== false) {
  throw new Error('checkInAlertActive should be false after disarming collar');
}
if (game.robots[0] && game.robots[0].aiState !== 'patrol') {
  throw new Error('Chasing robots should be reset to patrol');
}
console.log('✅ Terminal DISARM operation successfully disarmed the neural collar permanently');

// 6. Freedom from 100-Step Limit: Simulate 150 player steps
for (let step = 0; step < 150; step++) {
  game.handlePlayerStep();
}

if (game.checkInAlertActive) {
  throw new Error('Check-in alert should never trigger after collar is disarmed');
}
if (game.securityLevel === 'ALERT') {
  throw new Error('Security alert should never be triggered by step count after disarm');
}
console.log('✅ Successfully stepped 150 times without any collar timer countdown or alarm triggers');

// 7. Test Automatic Disarm via performCheckIn()
const freshGame = new GameEngine(mockCanvas);
freshGame.player.inventory.push({
  id: 'item-master-pass',
  name: 'Tzorg Master Keycard',
  itemType: 'KEYCARD',
});
freshGame.performCheckIn();
if (!freshGame.isCollarDisarmed) {
  throw new Error('performCheckIn() should automatically trigger disarm when holding Master Pass');
}
console.log('✅ Accessing terminal / check-in automatically disarms collar when holding Master Pass');

// 8. Save & Load State Persistence
saveGameState(game);
const reloadGame = new GameEngine(mockCanvas);
loadGameState(reloadGame);

if (!reloadGame.isCollarDisarmed || !reloadGame.player.isCollarDisarmed) {
  throw new Error('Save & Load should preserve isCollarDisarmed state as true');
}
console.log('✅ Save & Load successfully persisted collar disarmed state');

console.log('🎉 All Tzorg Master Pass Legendary Relic tests passed successfully!');
