import { GameEngine } from '../src/game';
import { SecurityLevel } from '../src/types';

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

console.log('Testing Black Market Economy, Consumables & Services...');

const game = new GameEngine(mockCanvas);

// 1. Modal Opening
if (game.isAugmentShopOpen) {
  throw new Error('Augment shop should initially be closed');
}
game.handleKeyDown('u');
if (!game.isAugmentShopOpen) {
  throw new Error('Augment shop should open on [U]');
}
console.log('✅ Black Market Terminal opened with [U]');

// Provide plenty of credits for testing
game.player.credits = 1000;
game.player.consumables = { medkits: 0, batteries: 0, empGrenades: 0 };

// 2. Buy Nanite Medkit [5] (40 CR)
game.handleKeyDown('5');
if (game.player.credits !== 960 || (game.player.consumables?.medkits ?? 0) !== 1) {
  throw new Error(`Expected 960 CR and 1 Medkit, got ${game.player.credits} CR, ${game.player.consumables?.medkits} Medkits`);
}
console.log('✅ Purchased Nanite Medkit with [5] (-40 CR)');

// 3. Buy Plasma Battery [6] (35 CR)
game.handleKeyDown('6');
if (game.player.credits !== 925 || (game.player.consumables?.batteries ?? 0) !== 1) {
  throw new Error(`Expected 925 CR and 1 Battery, got ${game.player.credits} CR, ${game.player.consumables?.batteries} Batteries`);
}
console.log('✅ Purchased Plasma Battery with [6] (-35 CR)');

// 4. Buy EMP Disruptor [7] (70 CR)
game.handleKeyDown('7');
if (game.player.credits !== 855 || (game.player.consumables?.empGrenades ?? 0) !== 1) {
  throw new Error(`Expected 855 CR and 1 EMP, got ${game.player.credits} CR, ${game.player.consumables?.empGrenades} EMP`);
}
console.log('✅ Purchased EMP Disruptor with [7] (-70 CR)');

// 5. Weapon Overclock [8] (150 CR)
const basePower = game.player.equippedWeapon?.power ?? 20;
game.handleKeyDown('8');
const newPower = game.player.equippedWeapon?.power ?? 0;
if (game.player.credits !== 705 || newPower !== basePower + 5) {
  throw new Error(`Expected 705 CR and weapon power ${basePower + 5}, got ${game.player.credits} CR, ${newPower} power`);
}
console.log('✅ Weapon Overclocked with [8] (+5 DMG, -150 CR)');

// 6. Security Network Bribe [9] (100 CR)
// First trigger alarm and low timer
game.securityLevel = 'ALERT' as SecurityLevel;
game.checkInAlertActive = true;
game.player.checkInTimer = 15;
if (game.robots[0]) {
  game.robots[0].aiState = 'chase';
}

game.handleKeyDown('9');
if (game.player.credits !== 605) {
  throw new Error(`Expected 605 CR, got ${game.player.credits}`);
}
if (game.securityLevel !== 'CLEAR') {
  throw new Error('Expected security level to be CLEAR after bribe');
}
if (game.checkInAlertActive !== false) {
  throw new Error('Expected checkInAlertActive to be false after bribe');
}
if (game.player.checkInTimer !== 100) {
  throw new Error('Expected checkInTimer to reset to 100 after bribe');
}
if (game.robots[0] && game.robots[0].aiState !== 'patrol') {
  throw new Error('Expected chasing robots to reset to patrol');
}
console.log('✅ Security Network Bribed with [9] (Cleared Alert, Reset Collar, Reset Chasers, -100 CR)');

// 7. Insufficient Credits Handling
game.player.credits = 10;
const preMedkits = game.player.consumables?.medkits ?? 0;
game.handleKeyDown('5'); // Need 40
if (game.player.credits !== 10 || (game.player.consumables?.medkits ?? 0) !== preMedkits) {
  throw new Error('Should not purchase item with insufficient credits');
}

const prePower = game.player.equippedWeapon?.power;
game.handleKeyDown('8'); // Need 150
if (game.player.equippedWeapon?.power !== prePower) {
  throw new Error('Should not overclock weapon with insufficient credits');
}
console.log('✅ Insufficient credits properly rejects all transactions');

// 8. Close Shop Modal
game.handleKeyDown('Escape');
if (game.isAugmentShopOpen) {
  throw new Error('Shop should close on Escape');
}
console.log('✅ Black Market Terminal closed on [Escape]');

console.log('🎉 All Black Market Economy, Consumables & Services tests passed successfully!');
