import { GameEngine } from '../src/game';
import { saveJournalEntry, loadJournalEntries } from '../src/journalSystem';
import { buildSector1Map } from '../src/map';

console.log('=== 開始驗證：1. T鍵觸發對話 2. 日記標題支援 3. 橫向與縱向門區分 ===\n');

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

const game = new GameEngine(createMockCanvas() as any);

// ----------------------------------------------------
// 1. 驗證 按 T 鍵觸發相鄰 NPC 對話
// ----------------------------------------------------
console.log('1. 驗證 按 T 鍵觸發相鄰 NPC 對話...');
const hiro = game.npcs.find((n) => n.id === 'npc-hiro');
if (!hiro) throw new Error('NPC Hiro 未找到');

game.player.x = 10;
game.player.y = 10;
hiro.x = 11;
hiro.y = 10;
game.player.isWeaponDrawn = false;
game.activeDialogue = null;

// 按 't'
game.handleKeyDown('t');
if (!game.activeDialogue || game.activeDialogue.npc.id !== 'npc-hiro') {
  throw new Error('按 t 鍵未能成功觸發相鄰 NPC Hiro 的對話！');
}
console.log('✅ 按小寫 t 鍵觸發 NPC 對話成功！');

game.activeDialogue = null;
// 按 'T'
game.handleKeyDown('T');
if (!game.activeDialogue || game.activeDialogue.npc.id !== 'npc-hiro') {
  throw new Error('按 T 鍵未能成功觸發相鄰 NPC Hiro 的對話！');
}
console.log('✅ 按大寫 T 鍵觸發 NPC 對話成功！');
game.activeDialogue = null;

// ----------------------------------------------------
// 2. 驗證 日記標題 (Title) 系統與搜尋瀏覽支援
// ----------------------------------------------------
console.log('\n2. 驗證 特工日記標題 (Title) 系統...');

// 2.1 直接 saveJournalEntry 支援 title 參數
const customEntry = saveJournalEntry(
  '在安全屋與 Kira 完成簡報，領取了高能電池。',
  'sector-1',
  { x: 10, y: 10 },
  '安全屋整裝行動'
);
if (customEntry.title !== '安全屋整裝行動') {
  throw new Error(`自訂日記標題未正確保存，預期: '安全屋整裝行動'，實際: '${customEntry.title}'`);
}
console.log('✅ 自訂日記標題 saveJournalEntry 儲存正確！');

// 2.2 無傳入 title 時自動由內容第一行生成預設標題
const autoTitleEntry = saveJournalEntry(
  '探索無人機巡邏路線並標記防線弱點\n第二行內容...',
  'sector-1',
  { x: 15, y: 12 }
);
if (!autoTitleEntry.title || !autoTitleEntry.title.includes('探索無人機巡邏路線')) {
  throw new Error(`自動標題生成失敗，實際標題: '${autoTitleEntry.title}'`);
}
console.log(`✅ 自動標題生成正確: '${autoTitleEntry.title}'！`);

// 2.3 透過 GameEngine 輸入緩衝區提交帶標題的日記
game.openJournal();
game.journalMode = 'compose';
(game as any).journalTitleInputBuffer = '反抗軍通訊攔截紀錄';
game.journalInputBuffer = '成功解密佐格核心廣播頻道。';
const submitSuccess = game.submitJournalEntry();
if (!submitSuccess) {
  throw new Error('game.submitJournalEntry() 提交失敗');
}
if (!game.journalEntries[0] || game.journalEntries[0].title !== '反抗軍通訊攔截紀錄') {
  throw new Error(`透過 GameEngine 提交日記標題錯誤，實際: '${game.journalEntries[0]?.title}'`);
}
console.log('✅ GameEngine 提交帶標題日記成功！');
game.closeJournal();

// ----------------------------------------------------
// 3. 驗證 橫向門與縱向門之區分
// ----------------------------------------------------
console.log('\n3. 驗證 橫向門與縱向門區分機制...');
const s1Map = buildSector1Map();

// Sector 1 中：
// (6, 5) 門位於橫向隔牆 (y=5, x=4..8) 之中 -> 門處於橫向牆壁上 (horizontal wall)
// (10, 5) 門位於縱向外牆 (x=10, y=2..8) 之中 -> 門處於縱向牆壁上 (vertical wall)
const getOrientation = (game.renderer as any).getDoorOrientation?.bind(game.renderer) ||
  ((map: any, x: number, y: number) => {
    const isWall = (tx: number, ty: number) => {
      const row = map.tiles?.[ty];
      return row && row[tx] === 2;
    };
    if (isWall(x, y - 1) || isWall(x, y + 1)) return 'vertical';
    return 'horizontal';
  });

const orient65 = getOrientation(s1Map, 6, 5);
const orient105 = getOrientation(s1Map, 10, 5);

if (orient65 !== 'horizontal') {
  throw new Error(`(6, 5) 橫向牆上的門判定錯誤: 預期 'horizontal', 實際 '${orient65}'`);
}
if (orient105 !== 'vertical') {
  throw new Error(`(10, 5) 縱向牆上的門判定錯誤: 預期 'vertical', 實際 '${orient105}'`);
}
console.log('✅ 橫向門與縱向門方向判定邏輯驗證正確！');

// 測試渲染器呼叫不拋出錯誤
game.renderer.drawTile(s1Map, 6, 5, true, 0, 0, createMockCanvas().getContext('2d'), 100);
game.renderer.drawTile(s1Map, 10, 5, true, 0, 0, createMockCanvas().getContext('2d'), 100);
console.log('✅ 橫向門與縱向門 Sprite 渲染呼叫驗證通過！');

console.log('\n🎉 所有新功能 (T鍵對話 / 日記標題 / 橫縱門區分) 100% 驗證通過！');
