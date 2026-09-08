import { GameEngine } from '../src/game';
import { TerminalSession } from '../src/terminal';
import { drawBigMapModal } from '../src/bigMapModal';

// 1. 建立 mockCanvas 與 game = new GameEngine(mockCanvas)
const mockCanvas = {
  getContext: () => ({
    fillRect: () => {},
    clearRect: () => {},
    fillText: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    setTransform: () => {},
    measureText: () => ({ width: 0 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    drawImage: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createPattern: () => ({}),
    clip: () => {},
    rect: () => {},
    quadraticCurveTo: () => {},
    bezierCurveTo: () => {},
  }),
  width: 800,
  height: 600,
};

const game = new GameEngine(mockCanvas as any);

// 2. 測試傳送至 Citadel
console.log('Testing transport to Citadel...');
game.switchSector('sector-citadel');
if (game.player.x !== 4 || game.player.y !== 15) {
  throw new Error('Citadel start pos mismatch');
}
if (game.map.id !== 'sector-citadel') {
  throw new Error('Map id must be sector-citadel');
}
const boss = game.robots.find(r => r.robotType === 'EXTERMINATOR');
if (!boss) {
  throw new Error('Boss EXTERMINATOR must be in Citadel');
}
console.log('Citadel transport test passed.');

// 3. 測試返回 Sector 2
console.log('Testing return to Sector 2...');
game.switchSector('sector-2');
if (game.player.x !== 35 || game.player.y !== 22) {
  throw new Error('Return to Sector 2 pos mismatch');
}
console.log('Return to Sector 2 test passed.');

// 4. 測試 Citadel 終端機四種結局
console.log('Testing Citadel terminal four endings...');
game.switchSector('sector-citadel');
const coreTerminal = game.map.terminals['TERMINAL_OVERMIND_CORE'];
if (!coreTerminal) {
  throw new Error('TERMINAL_OVERMIND_CORE missing');
}
const session = new TerminalSession(coreTerminal);
const endings = ['overload', 'subversion', 'evacuation', 'awaken'];
for (const e of endings) {
  const res = session.executeCommand(e);
  if (res.endgameChoice !== e.toUpperCase()) {
    throw new Error('Failed ' + e);
  }
}
(game as any).activeTerminal = session;
(game as any).terminalInputBuffer = 'awaken';
session.input = 'awaken';
game.handleKeyDown('Enter');
if (!game.victory || (game.player as any).endgameChoice !== 'AWAKEN') {
  throw new Error('Endgame victory trigger failed');
}
console.log('Citadel terminal endings test passed.');

// 5. 測試 Big Map 渲染 Citadel
console.log('Testing Big Map rendering for Citadel...');
(game as any).isBigMapOpen = true;
(game as any).bigMapSelectedSector = 'sector-citadel';
(game as any).render();
console.log('Big Map rendering test passed.');

// 6. console.log('🎉 Citadel Endgame Flow verified successfully!');
console.log('🎉 Citadel Endgame Flow verified successfully!');
