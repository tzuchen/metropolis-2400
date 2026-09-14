import { loadJournalEntries, saveJournalEntry, deleteJournalEntry, clearJournalEntries, memoryJournalBackup } from '../src/journalSystem';
import { GameEngine } from '../src/game';
import { drawJournalModal } from '../src/journalModal';
import { drawTitleStoryModal } from '../src/titleStoryModal';

console.log('=== 開始驗證特工日記 (Operative Journal) 與開局簡報系統 ===\n');

// 模擬 Canvas 與 2D Context
function createMockCanvas(): any {
  const ctx: any = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    rect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    stroke: () => {},
    fill: () => {},
    clip: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fillText: () => {},
    measureText: (text: string) => ({ width: text.length * 8 }),
    setLineDash: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    drawImage: () => {},
  };

  return {
    getContext: (type: string) => (type === '2d' ? ctx : null),
    width: 800,
    height: 600,
  };
}

// 1. 測試 journalSystem 純邏輯持久化與時間戳
console.log('1. 測試 journalSystem 資料持久化與時間戳格式...');
clearJournalEntries();
const entry1 = saveJournalEntry('特工日誌 01：已成功潛入 Sector 1 安全屋。', 'sector-1', { x: 5, y: 5 });
if (!entry1 || !entry1.id) throw new Error('saveJournalEntry 未返回有效條目');
if (!entry1.formattedDate || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(entry1.formattedDate)) {
  throw new Error(`時間戳格式不符預期: ${entry1.formattedDate}`);
}
if (entry1.sectorId !== 'sector-1') throw new Error('扇區 ID 未正確記錄');
if (entry1.playerPos?.x !== 5 || entry1.playerPos?.y !== 5) throw new Error('座標未正確記錄');

const entriesAfter1 = loadJournalEntries();
if (entriesAfter1.length !== 1 || entriesAfter1[0].content !== entry1.content) {
  throw new Error('loadJournalEntries 讀取條目異常');
}
console.log('✅ journalSystem 資料建立、時間戳與持久化讀取完全正確！');

// 2. 測試 GameEngine 開啟日記、撰寫並保存
console.log('\n2. 測試 GameEngine 開啟特工日記與輸入互動...');
const canvas1 = createMockCanvas();
const game1 = new GameEngine(canvas1 as any);

// 按 [P] 打開日記
game1.handleKeyDown('p');
if (!game1.isJournalOpen) throw new Error('按 [P] 鍵未能打開特工日記');
if (game1.journalMode !== 'view') throw new Error('初始日記模式應為 view');

// 按 [N] 進入撰寫模式
game1.handleKeyDown('n');
if (game1.journalMode !== 'compose') throw new Error('按 [N] 鍵未能切換至 compose 模式');

// 模擬打字: "Found classified data"
const testLog = '發現佐格網路的核心加密節點。';
for (const ch of testLog) {
  game1.handleKeyDown(ch);
}
if (game1.journalInputBuffer !== testLog) {
  throw new Error(`輸入緩衝區內容不符: "${game1.journalInputBuffer}" vs "${testLog}"`);
}

// 測試 Backspace 退格
game1.handleKeyDown('Backspace');
if (game1.journalInputBuffer !== testLog.slice(0, -1)) {
  throw new Error('Backspace 退格未能刪除最後一個字符');
}
// 補回最後一字
game1.handleKeyDown('。');

// 按 [Enter] 提交儲存日記
game1.handleKeyDown('Enter');
if (game1.journalMode !== 'view') throw new Error('提交日記後應自動回到 view 模式');
if (game1.journalInputBuffer !== '') throw new Error('提交日記後 inputBuffer 未清空');
if (game1.journalEntries.length < 2) throw new Error('日記清單未包含剛提交的新條目');
if (game1.journalEntries[0].content !== testLog) {
  throw new Error(`最新日記內容不符: ${game1.journalEntries[0].content}`);
}
console.log('✅ GameEngine 開啟日記、打字、退格與提交功能完全正常！');

// 3. 關鍵驗證：新遊戲重啟後，日記依然存在 (Survives Reboot / New Game)
console.log('\n3. 關鍵驗證：新遊戲重新啟動後特工日記依然保留 (Persistent Across Reboots)...');
const canvas2 = createMockCanvas();
const game2 = new GameEngine(canvas2 as any); // 全新遊戲實例 (模擬重整或新開遊戲)
game2.handleKeyDown('p');
if (!game2.isJournalOpen) throw new Error('全新遊戲實例按 [P] 未能打開日記');
if (game2.journalEntries.length !== 2) {
  throw new Error(`重啟後日記數量不符: 預期 2，實際 ${game2.journalEntries.length}`);
}
if (game2.journalEntries[0].content !== testLog) {
  throw new Error('重啟後第一篇日記內容丟失');
}
console.log('✅ 特工日記即使重新開始新遊戲也不會消失，持久性驗證通過！');

// 4. 測試條目導航與刪除
console.log('\n4. 測試日記條目上下選擇與刪除 (Delete)...');
game2.journalSelectedIndex = 2; // 選中 Option 2 (即最早的 entry1)
game2.handleKeyDown('Delete');
if (game2.journalEntries.length !== 1) {
  throw new Error(`刪除後條目數量應為 1，實際為 ${game2.journalEntries.length}`);
}
if (game2.journalEntries[0].content !== testLog) {
  throw new Error('刪除目標條目錯誤，最新日記應被保留');
}
console.log('✅ 日記刪除功能驗證正常！');

// 5. 測試 Escape 與 P 鍵關閉日記
console.log('\n5. 測試 Escape 與 P 鍵關閉特工日記...');
game2.handleKeyDown('Escape');
if (game2.isJournalOpen) throw new Error('按 Escape 未能關閉特工日記');
game2.handleKeyDown('p');
if (!game2.isJournalOpen) throw new Error('按 p 未能重新開啟特工日記');
game2.handleKeyDown('p');
if (game2.isJournalOpen) throw new Error('再次按 p 未能關閉特工日記');
console.log('✅ 日記關閉快捷鍵正常！');

// 6. 測試 drawJournalModal 繪製安全無崩潰
console.log('\n6. 測試 drawJournalModal 繪製 (view 與 compose 模式)...');
const mockCtx = canvas1.getContext('2d');
drawJournalModal(800, 600, mockCtx, 1000, 'zh', game2.journalEntries, 0, 'view', '', 'sector-1', { x: 10, y: 10 });
drawJournalModal(800, 600, mockCtx, 1000, 'zh', game2.journalEntries, 0, 'compose', '撰寫測試中...', 'sector-1', { x: 10, y: 10 });
drawJournalModal(800, 600, mockCtx, 1000, 'en', game2.journalEntries, 0, 'view', '', 'sector-1', { x: 10, y: 10 });
console.log('✅ drawJournalModal 雙語與各模式繪製驗證通過！');

// 7. 測試遊戲開局跳出故事與特工日記使用方法彈窗 (Game Intro Briefing Popup)
console.log('\n7. 測試遊戲開局彈窗 (顯示故事與特工日記使用方法)...');
const canvas3 = createMockCanvas();
const game3 = new GameEngine(canvas3 as any);
game3.isTitleScreen = true;
game3.titleMenuIndex = 0; // NEW GAME
game3.handleKeyDown('Enter');

if (game3.isTitleScreen) throw new Error('按 Enter 進入新遊戲後 isTitleScreen 應為 false');
if (!game3.isIntroBriefingOpen) throw new Error('遊戲開局應自動跳出故事與特工日記任務簡報彈窗');

// 測試滾動簡報
game3.handleKeyDown('ArrowDown');
if (game3.introBriefingScrollOffset !== 36) {
  throw new Error(`向下滾動 offset 應為 36，實際為 ${game3.introBriefingScrollOffset}`);
}

// 測試繪製開局彈窗
game3.render();
drawTitleStoryModal(800, 600, mockCtx, 1000, 'zh', game3.introBriefingScrollOffset);
drawTitleStoryModal(800, 600, mockCtx, 1000, 'en', game3.introBriefingScrollOffset);

// 測試按 Enter 關閉開局彈窗進入大都會探索
game3.handleKeyDown('Enter');
if (game3.isIntroBriefingOpen) throw new Error('按 Enter 後開局任務簡報彈窗應關閉');
console.log('✅ 遊戲開局故事與特工日記彈窗彈出、滾動與關閉驗證通過！');

console.log('\n🎉 特工日記與開局任務簡報全功能驗證 100% 通過！');
