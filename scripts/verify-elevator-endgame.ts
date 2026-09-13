import { GameEngine } from '../src/game';
import { TerminalSession } from '../src/terminal';
import { bgm } from '../src/music';
import type { TerminalData, SecurityLevel } from '../src/types';

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

console.log('Testing floating text timestamp & expiration...');
game.handleKeyDown('q');
if (game.floatingTexts.length === 0) {
  throw new Error('Expected floating text on weapon switch');
}
const ft = game.floatingTexts[0];
if (!ft.createdAt || typeof ft.createdAt !== 'number') {
  throw new Error('Floating text must have a numeric createdAt timestamp');
}

// Simulate expiration: setting createdAt to 2 seconds ago
ft.createdAt = Date.now() - 2000;
game.tick();
if (game.floatingTexts.includes(ft)) {
  throw new Error('Expired floating text should be filtered out by tick()');
}

console.log('Testing Elevator Transit between Sector 1 and Sector 2...');
if (game.map.id !== 'sector-1') {
  throw new Error('Expected initial map to be sector-1');
}

game.switchSector('sector-2');
if (game.map.id !== 'sector-2') {
  throw new Error('Expected current map to be sector-2');
}
if (game.player.x !== 3 || game.player.y !== 5) {
  throw new Error('Expected player to be at (3, 5) in Sector 2');
}

game.switchSector('sector-1');
if (game.map.id !== 'sector-1') {
  throw new Error('Expected returned map to be sector-1');
}
if (game.player.x !== 37 || game.player.y !== 25) {
  throw new Error('Expected player to return to (37, 25) in Sector 1');
}

console.log('Testing Core Terminal Multi-Endings...');
const coreTerminal: TerminalData = {
  id: 'TERMINAL_OVERMIND_CORE',
  name: 'Tzorg Overmind Central Core',
  clearanceNeeded: 'HIGH' as SecurityLevel,
  isHacked: false,
  type: 'CORE',
  logs: ['Tzorg Central Overmind Core Active'],
};

const coreSession = new TerminalSession(coreTerminal);
const overloadRes = coreSession.executeCommand('overload');
if (overloadRes.endgameChoice !== 'OVERLOAD' || !overloadRes.shouldExit) {
  throw new Error('Core terminal should support OVERLOAD command');
}

const subversionRes = coreSession.executeCommand('subversion');
if (subversionRes.endgameChoice !== 'SUBVERSION' || !subversionRes.shouldExit) {
  throw new Error('Core terminal should support SUBVERSION command');
}

const evacRes = coreSession.executeCommand('evacuation');
if (evacRes.endgameChoice !== 'EVACUATION' || !evacRes.shouldExit) {
  throw new Error('Core terminal should support EVACUATION command');
}

// Test non-core terminal access denial
const normalTerminal: TerminalData = {
  id: 'TERMINAL_SAFEHOUSE',
  name: 'Safehouse Archive',
  clearanceNeeded: 'LOW' as SecurityLevel,
  isHacked: false,
  type: 'LOG',
  logs: [],
};
const normalSession = new TerminalSession(normalTerminal);
const deniedRes = normalSession.executeCommand('overload');
if (!deniedRes.output.includes('ACCESS DENIED')) {
  throw new Error('Non-core terminal must deny endgame overload command');
}

console.log('Testing GameEngine Endgame Victory Trigger...');
(game as any).activeTerminal = coreSession;
game.handleKeyDown('Enter'); // empty command
(game as any).terminalInputBuffer = 'subversion';
(game as any).activeTerminal.input = 'subversion';
game.handleKeyDown('Enter');

if (!game.victory) {
  throw new Error('Game should trigger victory on core endgame subversion command');
}
if ((game.player as any).endgameChoice !== 'SUBVERSION') {
  throw new Error('Expected endgameChoice to be SUBVERSION');
}

// Verify R and 9 do not leave victory or enter the title screen
const victoryBeforeR = game.victory;
const titleBeforeR = game.isTitleScreen;
game.handleKeyDown('r');
if (!game.victory) {
  throw new Error('Pressing R during victory should not clear victory state');
}
if (game.isTitleScreen !== titleBeforeR) {
  throw new Error('Pressing R during victory should not enter title screen');
}

const victoryBefore9 = game.victory;
const titleBefore9 = game.isTitleScreen;
game.handleKeyDown('9');
if (!game.victory) {
  throw new Error('Pressing 9 during victory should not clear victory state');
}
if (game.isTitleScreen !== titleBefore9) {
  throw new Error('Pressing 9 during victory should not enter title screen');
}

// Verify Enter returns to the title screen, clears victory, and does not immediately start a title menu action
const victoryBeforeEnter = game.victory;
const titleBeforeEnter = game.isTitleScreen;
game.handleKeyDown('Enter');
if (game.victory) {
  throw new Error('Pressing Enter during victory should clear victory state');
}
if (!game.isTitleScreen) {
  throw new Error('Pressing Enter during victory should return to title screen');
}
// Verify no title menu action was immediately triggered (e.g., mission start)
if (!game.isTitleScreen) {
  throw new Error('Title screen should remain active after Enter from victory');
}
// Verify BGM intensity is set to 'title' after returning to title screen
if (bgm.currentIntensity !== 'title') {
  throw new Error(`Expected BGM intensity to be 'title' after returning to title screen, got '${bgm.currentIntensity}'`);
}

console.log('All elevator, endgame, and floating text verification tests passed successfully!');
