import { GameEngine } from '../src/game';
import { TerminalSession } from '../src/terminal';
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

console.log('Testing Neural Collar 100-Step Terminal Check-In System...');

const game = new GameEngine(mockCanvas);
if (!game.player) {
  throw new Error('GameEngine failed to initialize player');
}

// 1. Initial timer verification
const initialTimer = (game.player as any).checkInTimer;
if (initialTimer !== 100) {
  throw new Error(`Expected initial checkInTimer to be 100, got ${initialTimer}`);
}
console.log('✅ Initial checkInTimer is 100');

// 2. Step countdown verification
(game as any).handlePlayerStep();
if ((game.player as any).checkInTimer !== 99) {
  throw new Error(`Expected checkInTimer after 1 step to be 99, got ${(game.player as any).checkInTimer}`);
}
console.log('✅ Player step decrements checkInTimer');

// 3. 20-step warning notification
(game.player as any).checkInTimer = 21;
(game as any).handlePlayerStep(); // Decrements to 20
if ((game.player as any).checkInTimer !== 20) {
  throw new Error('Timer should be 20');
}
const warningMsg = (game as any).messages.find((m: any) => m.text && m.text.includes('20'));
if (!warningMsg) {
  throw new Error('20-step warning message not found');
}
console.log('✅ 20-step warning triggered correctly');

// 4. 10-step critical danger notification
(game.player as any).checkInTimer = 11;
(game as any).handlePlayerStep(); // Decrements to 10
if ((game.player as any).checkInTimer !== 10) {
  throw new Error('Timer should be 10');
}
const criticalMsg = (game as any).messages.find((m: any) => m.text && m.text.includes('10'));
if (!criticalMsg) {
  throw new Error('10-step critical message not found');
}
console.log('✅ 10-step critical notification triggered correctly');

// 5. Overdue countdown to 0 -> ALERT and robot chase
(game.player as any).checkInTimer = 1;
(game as any).handlePlayerStep(); // Decrements to 0
if ((game.player as any).checkInTimer !== 0) {
  throw new Error('Timer should be 0');
}
if ((game as any).securityLevel !== 'ALERT') {
  throw new Error(`Expected securityLevel to be ALERT, got ${(game as any).securityLevel}`);
}
const overdueMsg = (game as any).messages.find((m: any) => m.text && (m.text.includes('逾期') || m.text.includes('OVERDUE')));
if (!overdueMsg) {
  throw new Error('Overdue alarm message not found');
}

// Verify robots are set to chase
const aliveRobots = game.robots.filter(r => r.isAlive);
const chasingRobots = aliveRobots.filter(r => r.aiState === 'chase');
if (aliveRobots.length > 0 && chasingRobots.length !== aliveRobots.length) {
  throw new Error(`Expected all alive robots to be in chase mode, got ${chasingRobots.length}/${aliveRobots.length}`);
}
console.log(`✅ Overdue check-in triggers ALERT and sets all ${chasingRobots.length} patrol robots to chase mode`);

// 6. Terminal check-in reset & alert clearing
game.performCheckIn();
if ((game.player as any).checkInTimer !== 100) {
  throw new Error(`Expected checkInTimer reset to 100, got ${(game.player as any).checkInTimer}`);
}
if ((game as any).securityLevel !== 'CLEAR') {
  throw new Error(`Expected securityLevel de-escalated to CLEAR, got ${(game as any).securityLevel}`);
}
console.log('✅ performCheckIn() resets timer to 100 and clears check-in security alert');

// 7. TerminalSession CHECKIN command
const mockTerminal = {
  id: 'term-test',
  x: 4,
  y: 4,
  name: 'Test Terminal',
  isHacked: false,
  securityLevel: 1,
  lore: 'Test Lore'
};
const session = new TerminalSession(mockTerminal as any);
const res = session.executeCommand('CHECKIN');
if (!res.checkedIn) {
  throw new Error('TerminalSession CHECKIN should return checkedIn: true');
}
console.log('✅ TerminalSession CHECKIN command returns checkedIn: true');

// 8. Save/Load persistence of checkInTimer
(game.player as any).checkInTimer = 47;
const saveSuccess = saveGameState(game);
if (!saveSuccess) {
  throw new Error('saveGameState failed');
}

(game.player as any).checkInTimer = 99;
const loadSuccess = loadGameState(game);
if (!loadSuccess) {
  throw new Error('loadGameState failed');
}
if ((game.player as any).checkInTimer !== 47) {
  throw new Error(`Expected restored checkInTimer to be 47, got ${(game.player as any).checkInTimer}`);
}
console.log('✅ Save & Load preserves checkInTimer state');

console.log('🎉 All Neural Collar 100-Step Check-In verification tests passed successfully!');
