// scripts/verify-operative-journal.ts
// 驗證特工日記 (Operative Journal) 時間戳、讀取、持久化與開局提示彈窗系統

import { GameEngine } from '../src/game';
import {
  saveJournalEntry,
  loadJournalEntries,
  deleteJournalEntry,
  JOURNAL_STORAGE_KEY,
  memoryJournalBackup,
} from '../src/journalSystem';
import { drawJournalModal } from '../src/journalModal';
import { drawTitleStoryModal } from '../src/titleStoryModal';

console.log('=== 開始驗證特工日記 (Operative Journal) 與開局簡報系統 ===\n');

// 建立 mockCanvas
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

// 清理 localStorage 與記憶體備份
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem(JOURNAL_STORAGE_KEY);
}
memoryJournalBackup.length = 0;

// 1. 測試 journalSystem 底層持久化與時間戳生成
console.log('1. 測試 journalSystem 資料持久化與時間戳格式...');
const entry1 = saveJournalEntry('特工抵達 Sector 01 安全屋，通訊正常。', 'sector-1', { x: 5, y: 5 }, '抵達安全屋');
if (!entry1.id || !entry1.formattedDate || !entry1.timestamp) {
  throw new Error('日記條目缺少必要欄位 (id, formattedDate, timestamp)');
}
const datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
if (!datePattern.test(entry1.formattedDate)) {
  throw new Error(`時間戳格式不符合 YYYY-MM-DD HH:MM:SS: ${entry1.formattedDate}`);
}
const entriesAfter1 = loadJournalEntries();
if (entriesAfter1.length !== 1 || entriesAfter1[0].content !== entry1.content) {
  throw new Error('loadJournalEntries 讀取條目異常');
}
console.log('✅ journalSystem 資料建立、時間戳與持久化讀取完全正確！');

// 2. 測試 GameEngine 開啟日記、標題與內容撰寫並保存
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
if (game1.journalComposeField !== 'title') throw new Error('撰寫模式初始焦點應在標題欄位 title');

// 模擬在標題欄位輸入標題
const testTitle = '機密調查行動';
for (const ch of testTitle) {
  game1.handleKeyDown(ch);
}
if (game1.journalTitleInputBuffer !== testTitle) {
  throw new Error(`標題輸入緩衝區內容不符: "${game1.journalTitleInputBuffer}" vs "${testTitle}"`);
}

// 按 Enter 切換至內容欄位
game1.handleKeyDown('Enter');
if (game1.journalComposeField !== 'content') throw new Error('按 Enter 未能切換至內容欄位');

// 模擬在內容欄位打字: "Found classified data"
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
if (game1.journalTitleInputBuffer !== '') throw new Error('提交日記後 journalTitleInputBuffer 未清空');
if (game1.journalEntries.length < 2) throw new Error('日記清單未包含剛提交的新條目');
if (game1.journalEntries[0].content !== testLog) {
  throw new Error(`最新日記內容不符: ${game1.journalEntries[0].content}`);
}
if (game1.journalEntries[0].title !== testTitle) {
  throw new Error(`最新日記標題不符: ${game1.journalEntries[0].title}`);
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

// 5. 測試 Escape 與 P 關閉
console.log('\n5. 測試 Escape 與 P 鍵關閉特工日記...');
game2.handleKeyDown('Escape');
if (game2.isJournalOpen) throw new Error('按 Escape 未能關閉特工日記');
game2.handleKeyDown('p');
if (!game2.isJournalOpen) throw new Error('重新開啟特工日記失敗');
game2.handleKeyDown('p');
if (game2.isJournalOpen) throw new Error('按 [P] 未能關閉特工日記');
console.log('✅ 日記關閉快捷鍵正常！');

// 6. 測試 drawJournalModal 渲染輸出健全性
console.log('\n6. 測試 drawJournalModal 繪製 (view 與 compose 模式)...');
const mockCtx = createMockCanvas().getContext('2d');
drawJournalModal(800, 600, mockCtx, 1000, 'zh', game2.journalEntries, 1, 'view', '', 'sector-1', { x: 5, y: 5 });
drawJournalModal(800, 600, mockCtx, 1000, 'en', game2.journalEntries, 1, 'view', '', 'sector-1', { x: 5, y: 5 });
drawJournalModal(800, 600, mockCtx, 1000, 'zh', game2.journalEntries, 0, 'compose', '測試日誌內容', 'sector-1', { x: 5, y: 5 }, '測試標題', 'title');
drawJournalModal(800, 600, mockCtx, 1000, 'zh', game2.journalEntries, 0, 'compose', '測試日誌內容', 'sector-1', { x: 5, y: 5 }, '測試標題', 'content');
console.log('✅ drawJournalModal 雙語與各模式繪製驗證通過！');

// 7. 測試開局提示彈窗 (顯示故事與特工日記使用方法)
console.log('\n7. 測試遊戲開局彈窗 (顯示故事與特工日記使用方法)...');
const canvas3 = createMockCanvas();
const game3 = new GameEngine(canvas3 as any);
game3.isTitleScreen = true;
game3.titleMenuIndex = 0; // NEW GAME
game3.handleKeyDown('Enter');

if (game3.isTitleScreen) throw new Error('按 Enter 進入新遊戲後 isTitleScreen 應為 false');
if (!game3.isIntroBriefingOpen) throw new Error('遊戲開局應自動跳出故事與特工日記任務簡報彈窗');

// 測試上下鍵滾動彈窗
const initialOffset = game3.introBriefingScrollOffset;
game3.handleKeyDown('ArrowDown');
if (game3.introBriefingScrollOffset <= initialOffset) {
  throw new Error('按方向下鍵未能向下滾動開局簡報');
}
game3.handleKeyDown('ArrowUp');
if (game3.introBriefingScrollOffset !== initialOffset) {
  throw new Error('按方向上鍵未能向上滾動開局簡報');
}

// 驗證 drawTitleStoryModal 能正常渲染
drawTitleStoryModal(800, 600, mockCtx, 1000, 'zh', game3.introBriefingScrollOffset);
drawTitleStoryModal(800, 600, mockCtx, 1000, 'en', game3.introBriefingScrollOffset);

// 測試按 Enter 關閉開局彈窗進入大都會探索
game3.handleKeyDown('Enter');
if (game3.isIntroBriefingOpen) throw new Error('按 Enter 後開局任務簡報彈窗應關閉');
console.log('✅ 遊戲開局故事與特工日記彈窗彈出、滾動與關閉驗證通過！');

// 8. 關鍵回歸測試：特工輸入日記時，快捷鍵絕不阻擋或攔截輸入 (Anti-Intercept Test)
console.log('\n8. 關鍵回歸測試：日記輸入期間快捷鍵絕不攔截、不阻擋輸入...');
const canvas4 = createMockCanvas();
const game4 = new GameEngine(canvas4 as any);
game4.openJournal();
game4.journalMode = 'compose';
game4.journalComposeField = 'content'; // 切換至內容欄位進行防阻擋測試
game4.journalInputBuffer = '';

const baselineResolution = game4.currentResolutionIndex;
const baselineWeapon = game4.player.equippedWeapon;
const baselinePos = { x: game4.player.x, y: game4.player.y };
const baselineLang = game4.language;
const baselineMedkits = game4.player.consumables?.medkits ?? 0;
const baselineDisguised = game4.player.isDisguised;
const baselineWeaponDrawn = game4.player.isWeaponDrawn;

// 鍵入包含全域快捷鍵的字元：'0' (解析度), 'q' (換槍), 'w/a/s/d' (移動), 'z' (語言), '1/2/3' (物品), 'c' (偽裝), 'f' (拔槍), '8' (存檔), '9' (讀檔), ' ' 與 'Space' (空格)
const complexJournalText = [
  'S', 'e', 'c', 't', 'o', 'r', ' ', '0', '1', ':', ' ',
  'F', 'o', 'u', 'n', 'd', ' ', '8', ' ', 'c', 'r', 'a', 't', 'e', 's', ',', ' ',
  'q', 'u', 'i', 'c', 'k', ' ', 's', 'w', 'a', 'p', ' ', 'w', 'e', 'a', 'p', 'o', 'n', ' ', 'q', '.', ' ',
  '佐', '格', '網', '路', '2', '4', '0', '0'
];

for (const ch of complexJournalText) {
  game4.handleKeyDown(ch);
}
// 測試 'Space' 關鍵字也能正確轉為空格
game4.handleKeyDown('Space');
game4.handleKeyDown('!');

const expectedText = 'Sector 01: Found 8 crates, quick swap weapon q. 佐格網路2400 !';
if (game4.journalInputBuffer !== expectedText) {
  throw new Error(`日記逐字輸入受到快捷鍵阻擋或篡改！\n預期: "${expectedText}"\n實際: "${game4.journalInputBuffer}"`);
}

// 驗證全域狀態未受任何干擾
if (game4.currentResolutionIndex !== baselineResolution) {
  throw new Error('輸入字元 "0" 錯誤觸發了全域解析度切換！');
}
if (game4.player.equippedWeapon !== baselineWeapon) {
  throw new Error('輸入字元 "q" 錯誤觸發了武器切換！');
}
if (game4.player.x !== baselinePos.x || game4.player.y !== baselinePos.y) {
  throw new Error('輸入方向/移動字元 "w/a/s/d" 錯誤觸發了特工移動！');
}
if (game4.language !== baselineLang) {
  throw new Error('輸入字元 "z" 錯誤觸發了語言切換！');
}
if ((game4.player.consumables?.medkits ?? 0) !== baselineMedkits) {
  throw new Error('輸入數字字元 "1" 錯誤消耗了醫療包！');
}
if (game4.player.isDisguised !== baselineDisguised) {
  throw new Error('輸入字元 "c" 錯誤觸發了全息偽裝！');
}
if (game4.player.isWeaponDrawn !== baselineWeaponDrawn) {
  throw new Error('輸入字元 "f" 錯誤觸發了拔槍/收槍！');
}

// 提交此篇包含所有快捷鍵字元的日記
game4.handleKeyDown('Enter');
if (game4.journalEntries[0].content !== expectedText) {
  throw new Error('保存之日記內容不完整！');
}
console.log('✅ 特工日記輸入獨佔性驗證通過：全域快捷鍵零攔截、零阻擋！');

// 9. 測試標題畫面開啟日記並輸入時，不誤觸標題選單
console.log('\n9. 測試標題畫面開啟日記輸入，標題選單零干擾...');
const canvas5 = createMockCanvas();
const game5 = new GameEngine(canvas5 as any);
game5.isTitleScreen = true;
game5.titleMenuIndex = 0;
game5.openJournal();
game5.journalMode = 'compose';
game5.journalComposeField = 'content'; // 切換至內容欄位進行防阻擋測試

// 輸入標題快捷字元 'n', 'l', 'z', 'h', 'b', 's', 'w'
const titleChars = ['N', 'e', 'w', ' ', 'L', 'o', 'g', ' ', 'z', 'h', 'b', 's', 'w'];
for (const ch of titleChars) {
  game5.handleKeyDown(ch);
}
if (!game5.isTitleScreen) {
  throw new Error('標題畫面輸入 "N" 錯誤觸發了開始新遊戲！');
}
if (game5.titleMenuIndex !== 0) {
  throw new Error('標題畫面輸入 "s/w" 錯誤改變了選單索引！');
}
if (game5.journalInputBuffer !== 'New Log zhbsw') {
  throw new Error(`標題畫面日記輸入內容不符: "${game5.journalInputBuffer}"`);
}
game5.handleKeyDown('Enter');
if (game5.journalEntries[0].content !== 'New Log zhbsw') {
  throw new Error('標題畫面日記保存內容不符');
}
console.log('✅ 標題畫面日記輸入獨佔性驗證通過！');

console.log('\n🎉 特工日記防快捷鍵阻擋與全功能回歸測試 100% 通過！');
