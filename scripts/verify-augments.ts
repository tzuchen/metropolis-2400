import { GameEngine } from '../src/game';

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

console.log('Testing Augment Clinic & Hazards initialization...');
if (!game.hazards || game.hazards.length === 0) {
  throw new Error('Hazards should be initialized on GameEngine');
}
if (game.isAugmentShopOpen) {
  throw new Error('Augment shop should initially be closed');
}

console.log('Testing opening Augment Shop [U]...');
game.handleKeyDown('u');
if (!game.isAugmentShopOpen) {
  throw new Error('Augment shop should be open after pressing [U]');
}

console.log('Testing purchasing with insufficient credits...');
game.player.credits = 10;
game.handleKeyDown('1'); // Dermal armor costs 100
if (game.player.augments?.DERMAL_ARMOR) {
  throw new Error('Should not be able to purchase augment without enough credits');
}

console.log('Testing purchasing augments with sufficient credits...');
game.player.credits = 1000;
game.handleKeyDown('1'); // Dermal armor
if (!game.player.augments?.DERMAL_ARMOR) {
  throw new Error('Dermal Armor should be installed after purchase');
}

game.handleKeyDown('2'); // Optic HUD
if (!game.player.augments?.OPTIC_HUD) {
  throw new Error('Optic HUD should be installed after purchase');
}

game.handleKeyDown('3'); // Reflex Booster
if (!game.player.augments?.REFLEX_BOOSTER) {
  throw new Error('Reflex Booster should be installed after purchase');
}

game.handleKeyDown('4'); // Power Core
if (!game.player.augments?.POWER_CORE) {
  throw new Error('Power Core should be installed after purchase');
}
if (game.player.maxEnergy !== 150) {
  throw new Error(`Max energy should be upgraded to 150, got ${game.player.maxEnergy}`);
}

console.log('Testing closing Augment Shop [Escape]...');
game.handleKeyDown('Escape');
if (game.isAugmentShopOpen) {
  throw new Error('Augment shop should be closed after pressing Escape');
}

console.log('Testing Plasma Canister Detonation...');
const targetCanister = game.hazards[0];
(game as any).detonateCanister(targetCanister);
if (!targetCanister.exploded) {
  throw new Error('Canister should be flagged as exploded');
}

console.log('All cyberware augments and hazard systems verified successfully!');
