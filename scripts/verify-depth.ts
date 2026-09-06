import { GameEngine } from '../src/game';

// Create mock canvas
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
    setLineDash: () => {},
    measureText: () => ({ width: 50 }),
  }),
} as unknown as HTMLCanvasElement;

const game = new GameEngine(mockCanvas);

console.log('Testing initial items & objectives...');
if (!game.groundItems || game.groundItems.length === 0) {
  throw new Error('Ground items not initialized');
}
if (!game.missionObjectives || game.missionObjectives.length === 0) {
  throw new Error('Mission objectives not initialized');
}

console.log('Testing inventory toggle...');
game.handleKeyDown('i');
if (!game.isInventoryOpen) {
  throw new Error('Inventory modal should be open');
}
game.handleKeyDown('Escape');
if (game.isInventoryOpen) {
  throw new Error('Inventory modal should be closed on Escape');
}

console.log('Testing mission log toggle...');
game.handleKeyDown('m');
if (!game.isMissionLogOpen) {
  throw new Error('Mission log modal should be open');
}
game.handleKeyDown('Escape');
if (game.isMissionLogOpen) {
  throw new Error('Mission log modal should be closed on Escape');
}

console.log('Testing item quick-use: Medkit...');
game.player.hp = 50;
const initialMed = game.player.consumables?.medkits ?? 0;
game.handleKeyDown('1');
if (game.player.hp <= 50) {
  throw new Error('Medkit failed to heal player');
}
if ((game.player.consumables?.medkits ?? 0) !== initialMed - 1) {
  throw new Error('Medkit count not decremented');
}

console.log('Testing item quick-use: Battery...');
game.player.energy = 40;
game.handleKeyDown('2');
if (game.player.energy <= 40) {
  throw new Error('Battery failed to restore energy');
}

console.log('Testing EMP grenade shockwave...');
const testRobot = game.robots[0];
testRobot.x = game.player.x + 1;
testRobot.y = game.player.y;
testRobot.stunnedTurns = 0;
testRobot.isAlive = true;

game.handleKeyDown('3');
if ((testRobot.stunnedTurns ?? 0) <= 0) {
  throw new Error('EMP grenade failed to stun adjacent robot');
}

console.log('Testing Ambush Critical Strike on stunned robot...');
game.player.isWeaponDrawn = true;
game.player.energy = 50;
const preHp = testRobot.hp;
game.handleKeyDown('ArrowRight');
if (testRobot.isAlive && testRobot.hp > preHp - 100) {
  throw new Error('Ambush strike did not deal critical damage');
}

console.log('All depth systems verified successfully!');
