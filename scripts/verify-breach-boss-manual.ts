import { GameEngine } from '../src/game';
import { createBossExterminator, isBossRobot } from '../src/boss';
import { createBreachSession, moveBreachCursor, selectBreachCell } from '../src/breachProtocol';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
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

console.log('Testing Tactical Manual, Cyberspace Breach Protocol, and Sector 2 Boss Encounter...');

const game = new GameEngine(mockCanvas);

// 1. Verify Manual Modal
assert(!game.isManualOpen, 'Manual modal should start closed');
game.handleKeyDown('h');
assert(game.isManualOpen, 'Pressing [H] should open the Tactical Field Manual');
game.handleKeyDown('Escape');
assert(!game.isManualOpen, 'Pressing [Escape] should close the Tactical Field Manual');
console.log('✅ Tactical Field Manual modal toggle verified!');

// 2. Verify Sector 2 Boss (EXTERMINATOR-PRIME)
game.switchSector('sector-2');
const boss = game.robots.find((r) => isBossRobot(r));
assert(!!boss, 'Sector 2 must spawn the EXTERMINATOR-PRIME Boss robot');
assert(boss.hp === 250 && boss.maxHp === 250, `Boss HP must be 250, got ${boss.hp}`);
assert(boss.robotType === 'EXTERMINATOR', 'Boss type must be EXTERMINATOR');
assert(boss.attackPower === 22, 'Boss attack power must be 22');
assert(boss.patrolPath.length >= 4, 'Boss must have a multi-point patrol path guarding the Core');
console.log('✅ Sector 2 Boss EXTERMINATOR-PRIME verified!');

// 3. Verify Cyberspace Breach Protocol Minigame
const session = createBreachSession('CHECKPOINT_FF');
assert(session.grid.length === 4 && session.grid[0].length === 4, 'Breach grid must be 4x4');
assert(session.rewards.length === 3, 'Breach session must contain 3 reward daemons');
assert(session.activeAxis === 'ROW', 'Initial selection axis must be ROW');

// Test cursor movement
moveBreachCursor(session, 0, 1);
assert(session.cursorCol === 1, 'Cursor should move right along ROW');
moveBreachCursor(session, 1, 0); // should not move along COL while in ROW mode
assert(session.cursorRow === 0, 'Cursor should not move along COL while in ROW mode');

// Test cell selection
const firstByte = session.grid[0][1];
const selectRes1 = selectBreachCell(session);
assert(session.buffer.length === 1, 'Buffer length should be 1 after selection');
assert(session.buffer[0] === firstByte, 'Selected byte should be in buffer');
assert(session.activeAxis === 'COL', 'Active axis should toggle to COL after selecting cell in ROW');
assert(session.activeAxisIndex === 1, 'Active COL index should match the selected column');

// Move along column and select second cell
moveBreachCursor(session, 2, 0);
assert(session.cursorRow === 2, 'Cursor should move vertically to row 2');
const selectRes2 = selectBreachCell(session);
assert(session.buffer.length === 2, 'Buffer length should be 2');
assert(session.activeAxis === 'ROW', 'Active axis should toggle back to ROW');
console.log('✅ Cyberspace Breach Matrix logic & alternating axis verified!');

// 4. Verify Terminal BREACH Command Launch
game.switchSector('sector-1');
game.player.x = 4;
game.player.y = 5;
// Fake terminal interaction
(game as any).activeTerminal = {
  id: 'CHECKPOINT_FF',
  terminalId: 'CHECKPOINT_FF',
  input: '',
  executeCommand: () => ({}),
};
game.terminalInputBuffer = 'BREACH';
game.handleKeyDown('Enter');
assert(!!game.activeBreachSession, 'Typing BREACH in terminal must launch activeBreachSession');
game.handleKeyDown('Escape');
assert(game.activeBreachSession === null, 'Pressing Escape should abort breach session');
console.log('✅ Terminal BREACH command launch verified!');

console.log('🎉 All Manual, Boss Encounter, and Breach Protocol tests passed successfully!');
