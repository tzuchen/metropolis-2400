import { GameEngine } from '../src/game';
import { TerminalSession } from '../src/terminal';

function createMockCanvas(w = 800, h = 600): any {
  const drawnTexts: Array<{ text: string; x: number; y: number }> = [];
  return {
    width: w,
    height: h,
    drawnTexts,
    getContext: () => ({
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillText: (text: string, x: number, y: number) => {
        drawnTexts.push({ text, x, y });
      },
      measureText: (text: string) => ({ width: text.length * 8 }),
      arc: () => {},
      fill: () => {},
      closePath: () => {},
      rect: () => {},
      clip: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
    }),
    parentElement: { style: {} },
  };
}

console.log('=== 開始驗證終端機文字溢出 (Terminal Text Overflow) 修復 ===\n');

// 1. 測試小螢幕畫布 (800x600 compact) 下終端機尺寸與邊界
console.log('1. 測試 800x600 緊湊畫面下終端機繪製...');
const canvas = createMockCanvas(800, 600);
const game = new GameEngine(canvas as any);

const sec1Terminals = (game.map as any).terminals;
const terminalData = sec1Terminals.TERMINAL_SAFEHOUSE_LOG || {
  id: 'CORE_TEST',
  name: 'Citadel Master Overmind Control Node - Ultra Secure Deep Level Subsystem',
  logs: [
    'Super long intelligence report: The deep surveillance network has detected insurgent activity across Sector 1, Sector 2, and Sub-Sector Zero. Immediate purge protocols are advised before critical data is breached.',
    'Shakespeare Sonnet 18:\nShall I compare thee to a summer\'s day?\nThou art more lovely and more temperate:\nRough winds do shake the darling buds of May,\nAnd summer\'s lease hath all too short a date;',
    'UnbrokenStringThatCouldPotentiallyOverflowCanvasBoundaryWithoutProperWordWrappingMechanismsInPlace_1234567890_ABCDEFGHIJ'
  ]
};

const session = new TerminalSession(terminalData);
// 模擬注入多筆長文本與 HELP 輸出
session.executeCommand('help');
session.executeCommand('logs');
session.input = 'TESTING_A_REALLY_LONG_INPUT_STRING_THAT_THE_PLAYER_MIGHT_HAVE_TYPED_INTO_THE_BUFFER_AT_THE_BOTTOM_PROMPT';

game.activeTerminal = session;
canvas.drawnTexts.length = 0;
game.renderer.drawTerminal(session, 800, 600, canvas.getContext(), 0);

// 計算終端機外框邊界
const boxW = Math.min(800 - 40, 680); // 680
const boxX = (800 - boxW) / 2; // 60
const maxRightX = boxX + boxW; // 740

console.log(`終端機外框: x = ${boxX} ~ ${maxRightX}, boxW = ${boxW}`);

// 2. 檢驗所有繪製文字的右邊界是否均未超出 boxW (即 x + textWidth <= maxRightX)
console.log('\n2. 檢驗所有繪製文字是否均在終端機視窗內部（無任何文字超出螢幕或外框）...');
let overflowCount = 0;
canvas.drawnTexts.forEach(({ text, x, y }) => {
  const textW = text.length * 8; // measureText: 8px per char
  const rightEdge = x + textW;
  if (rightEdge > maxRightX + 5) {
    console.error(`❌ 文字溢出右邊界: "${text}" (rightEdge: ${rightEdge}, max: ${maxRightX})`);
    overflowCount++;
  }
});

if (overflowCount > 0) {
  throw new Error(`❌ 共有 ${overflowCount} 處文字超出終端機視窗邊界！`);
}
console.log(`✅ 檢驗通過：所有 ${canvas.drawnTexts.length} 行文字均完美保留在視窗邊界內！`);

// 3. 檢驗垂直方向文字未與底部輸入框重疊 (y + boxH - 28)
console.log('\n3. 檢驗垂直排版：歷史紀錄未溢出至底部輸入列...');
const boxH = Math.min(600 - 60, 420); // 420
const boxY = (600 - boxH) / 2; // 90
const inputY = boxY + boxH - 28; // 90 + 420 - 28 = 482

const historyTexts = canvas.drawnTexts.filter(t => t.y < inputY && t.y > boxY + 50);
const overlappingHistory = historyTexts.filter(t => t.y >= inputY - 10);

if (overlappingHistory.length > 0) {
  throw new Error(`❌ 歷史紀錄行垂直溢出並與輸入列重疊 (y >= ${inputY - 10})`);
}
console.log('✅ 垂直排版檢驗通過：歷史紀錄未侵入底部輸入列！');

// 4. 檢驗標準 960x600 畫布下運作正常
console.log('\n4. 檢驗 960x600 標準畫布繪製...');
const canvas960 = createMockCanvas(960, 600);
const game960 = new GameEngine(canvas960 as any);
game960.activeTerminal = session;
canvas960.drawnTexts.length = 0;
game960.renderer.drawTerminal(session, 960, 600, canvas960.getContext(), 0);

const boxW960 = Math.min(960 - 40, 680);
const boxX960 = (960 - boxW960) / 2;
const maxRight960 = boxX960 + boxW960;

canvas960.drawnTexts.forEach(({ text, x }) => {
  const textW = text.length * 8;
  if (x + textW > maxRight960 + 5) {
    throw new Error(`❌ 960 畫布下文字超出: "${text}"`);
  }
});
console.log('✅ 960x600 畫布檢驗通過！');

console.log('\n🎉 終端機文字溢出修復驗證全數通過！');
