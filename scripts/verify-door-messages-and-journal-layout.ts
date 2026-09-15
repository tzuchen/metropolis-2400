// scripts/verify-door-messages-and-journal-layout.ts
// 驗證：1. 門開關狀態提示訊息（開啟/關閉區分與中英在地化） 2. 特工日記版面防文字重疊機制

import { GameEngine } from '../src/game';
import { TileType } from '../src/types';
import { wrapText } from '../src/textWrap';
import { drawJournalModal } from '../src/journalModal';

console.log('=== 開始驗證：門開啟/關閉訊息與特工日記防重疊機制 ===\n');

// 建立 mockCanvas 模擬繪製並記錄呼叫
function createMockCanvas(width = 800, height = 600) {
  const drawnTexts: Array<{ text: string; x: number; y: number; font?: string }> = [];
  const clips: Array<{ x: number; y: number; w: number; h: number }> = [];

  const ctx: any = {
    font: '12px monospace',
    fillStyle: '#fff',
    strokeStyle: '#fff',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'top',
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    rect: (rx: number, ry: number, rw: number, rh: number) => {
      clips.push({ x: rx, y: ry, w: rw, h: rh });
    },
    fillRect: () => {},
    strokeRect: () => {},
    stroke: () => {},
    fill: () => {},
    clip: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fillText: (text: string, x: number, y: number) => {
      drawnTexts.push({ text: String(text), x, y, font: ctx.font });
    },
    measureText: (text: string) => ({
      width: Array.from(text).reduce((w, ch) => {
        // CJK characters take 12px, Latin 7.5px
        return w + (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(ch) ? 12 : 7.5);
      }, 0),
    }),
    setLineDash: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    drawImage: () => {},
  };

  return {
    canvas: {
      getContext: (type: string) => (type === '2d' ? ctx : null),
      width,
      height,
    },
    ctx,
    drawnTexts,
    clips,
  };
}

// ----------------------------------------------------
// 1. 驗證：門開關狀態對應提示訊息（開啟 vs 關閉）
// ----------------------------------------------------
console.log('1. 驗證：[E] 鍵操作門的開啟與關閉提示訊息...');
const mock1 = createMockCanvas();
const game1 = new GameEngine(mock1.canvas as any);
game1.language = 'zh';

// 放置一扇關閉的門在 (10, 10)，玩家在 (10, 11)
game1.map.tiles[10][10] = TileType.DOOR_CLOSED;
game1.player.x = 10;
game1.player.y = 11;
game1.player.facing = 'up';

// 玩家按 [E] 開啟門
game1.handleKeyDown('e');
if (game1.map.tiles[10][10] !== TileType.DOOR_OPEN) {
  throw new Error('按 E 鍵未能將關閉的門切換為開啟狀態');
}
let lastMsg = game1.messages[game1.messages.length - 1];
if (!lastMsg || !lastMsg.text.includes('開啟')) {
  throw new Error(`開啟門時未顯示開啟訊息，實際訊息: "${lastMsg?.text}"`);
}
console.log(`✅ 開啟門訊息驗證通過 (zh): "${lastMsg.text}"`);

// 再次按 [E] 關閉門
game1.handleKeyDown('e');
if (game1.map.tiles[10][10] !== TileType.DOOR_CLOSED) {
  throw new Error('按 E 鍵未能將開啟的門切換為關閉狀態');
}
lastMsg = game1.messages[game1.messages.length - 1];
if (!lastMsg || !lastMsg.text.includes('關閉')) {
  throw new Error(`關閉門時未顯示關閉訊息，實際訊息: "${lastMsg?.text}"`);
}
console.log(`✅ 關閉門訊息驗證通過 (zh): "${lastMsg.text}"`);

// 測試英文模式下的開啟與關閉
console.log('\n2. 驗證：英文模式 (en) 門開啟與關閉訊息...');
game1.language = 'en';
game1.handleKeyDown('e'); // 開啟
lastMsg = game1.messages[game1.messages.length - 1];
if (!lastMsg || !lastMsg.text.toLowerCase().includes('open')) {
  throw new Error(`英文模式開啟門訊息異常: "${lastMsg?.text}"`);
}
console.log(`✅ 英文模式開啟門驗證通過: "${lastMsg.text}"`);

game1.handleKeyDown('e'); // 關閉
lastMsg = game1.messages[game1.messages.length - 1];
if (!lastMsg || !lastMsg.text.toLowerCase().includes('closed')) {
  throw new Error(`英文模式關閉門訊息異常: "${lastMsg?.text}"`);
}
console.log(`✅ 英文模式關閉門驗證通過: "${lastMsg.text}"`);

// ----------------------------------------------------
// 3. 驗證：直接向關閉的門移動自動開啟時的訊息
// ----------------------------------------------------
console.log('\n3. 驗證：玩家撞門/走向關閉的門自動開啟之訊息...');
game1.language = 'zh';
game1.map.tiles[10][10] = TileType.DOOR_CLOSED;
game1.player.x = 10;
game1.player.y = 11;
// 向上走向 (10, 10)
game1.handleKeyDown('ArrowUp');
if (game1.map.tiles[10][10] !== TileType.DOOR_OPEN) {
  throw new Error('走向關閉的門未能自動開啟門');
}
lastMsg = game1.messages[game1.messages.length - 1];
if (!lastMsg || !lastMsg.text.includes('開啟')) {
  throw new Error(`走向門自動開啟時未顯示開啟訊息，實際訊息: "${lastMsg?.text}"`);
}
console.log(`✅ 走向門自動開啟訊息驗證通過: "${lastMsg.text}"`);

// ----------------------------------------------------
// 4. 驗證：textWrap 對換行符號 \n 的分段支援
// ----------------------------------------------------
console.log('\n4. 驗證：textWrap 處理換行符號 \\n 與長段落...');
const multilineText = '第一行標記情報\n第二行包含重要密碼：8942\n第三行備註事項';
const wrapped = wrapText(multilineText, 300, (s) => s.length * 10);
if (wrapped.length < 3) {
  throw new Error(`wrapText 未能正確按換行符號分行，行數為: ${wrapped.length}，預期至少 3 行`);
}
if (wrapped[0] !== '第一行標記情報' || wrapped[1] !== '第二行包含重要密碼：8942') {
  throw new Error(`wrapText 分行結果不符預期: ${JSON.stringify(wrapped)}`);
}
console.log(`✅ wrapText 換行符號分行驗證通過，共 ${wrapped.length} 行！`);

// ----------------------------------------------------
// 5. 驗證：特工日記超長標題防重疊與版面裁切
// ----------------------------------------------------
console.log('\n5. 驗證：特工日記左欄超長標題不溢出覆蓋右欄...');
const longTitle = '【極機密緊急報告】這是一段非常非常非常非常非常非常長的反抗軍調查標題紀錄文字';
const longContent = '這是一篇內容很長的測試筆記，用於檢驗標題與內容在檢視模式下是否會產生重疊問題。第一段。\n第二段是深入說明，絕不允許覆蓋日期與扇區。\n第三段結尾。';

const testEntry = {
  id: 'test-overlap-1',
  timestamp: Date.now(),
  formattedDate: '2026-09-15 14:00:00',
  sectorId: 'sector-2',
  playerPos: { x: 12, y: 8 },
  title: longTitle,
  content: longContent,
};

const mockModal = createMockCanvas(800, 600);
// 測試 view 模式繪製
drawJournalModal(
  800,
  600,
  mockModal.ctx,
  Date.now(),
  'zh',
  [testEntry],
  1, // 選中第一篇
  'view',
  '',
  'sector-2',
  { x: 12, y: 8 },
  '',
  'title'
);

// 檢查左欄標題文字 (X 座標位於左欄範圍，X < 300)
const leftTitleDrawings = mockModal.drawnTexts.filter(
  (t) => t.x < 300 && (t.text.includes('【極機密') || t.text.includes('報告'))
);
if (leftTitleDrawings.length === 0) {
  throw new Error('未在左欄繪製記錄中找到日記標題');
}
for (const dt of leftTitleDrawings) {
  // 左欄寬度約 800 * 0.38 ~ 285px，左欄邊界不可超過 320 (右欄起始位置)
  const measuredW = mockModal.ctx.measureText(dt.text).width;
  if (dt.x + measuredW > 320) {
    throw new Error(`左欄標題文字溢出到右欄！X=${dt.x}, W=${measuredW}, End=${dt.x + measuredW} (邊界應 <= 320)`);
  }
}
console.log('✅ 左欄標題文字截斷與防溢出驗證通過！');

// 檢查右欄檢視模式下，標題、日期、扇區與內文的 Y 座標是否依序向下推進，無重疊
const rightTexts = mockModal.drawnTexts.filter((t) => t.x >= 300);
// 按照 Y 軸排序檢查
rightTexts.sort((a, b) => a.y - b.y);

// 確保標題與日期之間有足夠垂直間距
const rightTitle = rightTexts.find((t) => t.text.includes('【極機密') || t.text.includes('極機密'));
const rightDate = rightTexts.find((t) => t.text.includes('2026-09-15 14:00:00'));
const rightSector = rightTexts.find((t) => t.text.includes('扇區: sector-2'));

if (rightTitle && rightDate) {
  const diff = rightDate.y - rightTitle.y;
  if (diff < 18) {
    throw new Error(`右欄標題與日期行距過小 (< 18px)，可能發生重疊！Title Y=${rightTitle.y}, Date Y=${rightDate.y}, Diff=${diff}`);
  }
}
if (rightDate && rightSector) {
  const diff = rightSector.y - rightDate.y;
  if (diff < 16) {
    throw new Error(`右欄日期與扇區行距過小 (< 16px)！Date Y=${rightDate.y}, Sector Y=${rightSector.y}, Diff=${diff}`);
  }
}
console.log('✅ 右欄檢視模式垂直排版行距驗證通過，絕無重疊！');

console.log('\n========================================');
console.log('🎉 所有門狀態提示與特工日記防重疊測試全數通過！');
console.log('========================================');
