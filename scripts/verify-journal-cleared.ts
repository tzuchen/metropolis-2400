// scripts/verify-journal-cleared.ts
// 驗證日記清空機制、儲存重置與 [C] 鍵清空支援

import { GameEngine } from '../src/game';
import {
  loadJournalEntries,
  saveJournalEntry,
  clearJournalEntries,
  JOURNAL_STORAGE_KEY,
  memoryJournalBackup,
} from '../src/journalSystem';

console.log('=== 開始驗證：特工日記清空與重新開始機制 ===\n');

// 1. 驗證 journalSystem 載入時為清空狀態
console.log('1. 驗證目前特工日記條目為空...');
// 模擬先寫入假資料後呼叫清空
saveJournalEntry('舊特工筆記1', 'sector-1', { x: 5, y: 5 }, '舊筆記');
if (loadJournalEntries().length === 0) {
  throw new Error('寫入日記失敗');
}

clearJournalEntries();
const entries = loadJournalEntries();
if (entries.length !== 0) {
  throw new Error(`清空日記失敗，仍有 ${entries.length} 條記錄`);
}
console.log('✅ clearJournalEntries 成功清空所有條目！');

// 2. 驗證 GameEngine clearAllJournalEntries 與 [C] 鍵互動
console.log('\n2. 驗證 GameEngine clearAllJournalEntries 與 [C] 鍵快捷操作...');
function createMockCanvas() {
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
    measureText: () => ({ width: 40 }),
    setLineDash: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    drawImage: () => {},
  };
  return {
    getContext: () => ctx,
    width: 800,
    height: 600,
  };
}

const game = new GameEngine(createMockCanvas() as any);
// 寫入一條測試筆記
saveJournalEntry('即將被清空的筆記', 'sector-1', { x: 10, y: 10 }, '待清空筆記');
game.openJournal();
if (game.journalEntries.length === 0) {
  throw new Error('開啟日記時未能載入條目');
}

// 在日記檢視模式下按 'c' 清空
game.handleKeyDown('c');
if (game.journalEntries.length !== 0) {
  throw new Error('按 C 鍵未能清空所有日記條目');
}

const lastMsg = game.messages[game.messages.length - 1];
if (!lastMsg || !lastMsg.text.includes('清空')) {
  throw new Error(`清空日記後未推播對應訊息，最新訊息: "${lastMsg?.text}"`);
}
console.log(`✅ [C] 鍵清空日記驗證通過，訊息: "${lastMsg.text}"`);

console.log('\n🎉 特工日記清空機制驗證 100% 通過！');
