// scripts/verify-art-and-literature-quests.ts
// 驗證藝術（Vesper）與文學（Archie）全新支線系統

import { GameEngine } from '../src/game';
import { TerminalSession } from '../src/terminal';
import { saveGameState, loadGameState } from '../src/saveLoad';

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
    roundRect: () => {},
  }),
} as unknown as HTMLCanvasElement;

console.log('=== 開始驗證藝術與文學支線系統 (Art & Literature Quests) ===\n');

const game = new GameEngine(mockCanvas);

// 1. 驗證 Sector 1 NPC 配置
console.log('1. 驗證 Vesper 與 Archie NPC 存在與屬性...');
const vesper = game.npcs.find((n) => n.id === 'npc-vesper');
const archie = game.npcs.find((n) => n.id === 'npc-archie');

if (!vesper) throw new Error('❌ 未找到 Vesper (npc-vesper)');
if (!archie) throw new Error('❌ 未找到 Archie (npc-archie)');

console.log(`✅ 找到 Vesper 於 (${vesper.x}, ${vesper.y})，動作: ${vesper.actionState} (${vesper.actionStateZh})`);
console.log(`✅ 找到 Archie 於 (${archie.x}, ${archie.y})，動作: ${archie.actionState} (${archie.actionStateZh})`);

if (vesper.x !== 22 || vesper.y !== 16) throw new Error('❌ Vesper 座標不符預期');
if (archie.x !== 26 || archie.y !== 25) throw new Error('❌ Archie 座標不符預期');

// 2. 驗證物品生成
console.log('\n2. 驗證支線道具在各區域生成...');
// 切換至 Sector 2 檢查超光譜量子色劑
game.switchSector('sector-2');
const aerosol = game.groundItems.find((it) => it.id === 'item-chromatic-aerosol');
if (!aerosol) throw new Error('❌ Sector 2 未找到 item-chromatic-aerosol (超光譜量子色劑)');
console.log(`✅ Sector 2 成功找到 [${aerosol.name}] 於 (${aerosol.x}, ${aerosol.y})`);

// 切換至 Sub-Sector Zero 檢查未焚毀古籍殘頁
game.switchSector('sub-sector-0');
const folio = game.groundItems.find((it) => it.id === 'item-unburnt-folio');
if (!folio) throw new Error('❌ Sub-Sector Zero 未找到 item-unburnt-folio (未焚毀的古籍殘頁)');
console.log(`✅ Sub-Sector Zero 成功找到 [${folio.name}] 於 (${folio.x}, ${folio.y})`);

// 3. 測試 Vesper 藝術支線交付與獎勵
console.log('\n3. 測試 Vesper 藝術支線交付...');
game.switchSector('sector-1');
const vesperNpc = game.npcs.find((n) => n.id === 'npc-vesper')!;

// 初始狀態
if (game.graffitiMuralComplete) throw new Error('❌ graffitiMuralComplete 初始應為 false');
const initialCrit = (game.player as any).critChance || 0;

// 將道具放入玩家背包
(game.player as any).inventory = (game.player as any).inventory || [];
(game.player as any).inventory.push({ ...aerosol });

// 與 Vesper 對話觸發任務交付
game.activeDialogue = { npc: vesperNpc, textIndex: 0 };
while (game.activeDialogue) {
  game.handleKeyDown('Enter');
}

if (!game.graffitiMuralComplete) throw new Error('❌ 交付超光譜量子色劑後 graffitiMuralComplete 應為 true');
const hasAerosolRemaining = (game.player as any).inventory.some((it: any) => it.id === 'item-chromatic-aerosol');
if (hasAerosolRemaining) throw new Error('❌ 任務道具未從背包正確扣除');

const newCrit = (game.player as any).critChance || 0;
if (newCrit <= initialCrit) throw new Error('❌ 玩家暴擊率未正確提升');
console.log(`✅ Vesper 任務完成：壁畫狀態解鎖，暴擊率提升 (${initialCrit} -> ${newCrit})`);

// 驗證對話更新
game.updateNPCDialogues();
const vesperUpdated = game.npcs.find((n) => n.id === 'npc-vesper')!;
const isZhVesper = vesperUpdated.dialogueZh?.some((line: string) => line.includes('自由之眼') || line.includes('塗鴉完成了') || line.includes('超光譜'));
if (!isZhVesper) throw new Error('❌ Vesper 對話未更新為完成狀態');
console.log('✅ Vesper 完成任務後的對話更新正常');

// 4. 測試 Archie 文學支線交付與神經項圈上限提升
console.log('\n4. 測試 Archie 文學支線交付...');
const archieNpc = game.npcs.find((n) => n.id === 'npc-archie')!;

if (game.poetryQuestComplete) throw new Error('❌ poetryQuestComplete 初始應為 false');
const initialMaxTimer = (game.player as any).checkInMaxTimer || 100;

// 將道具放入玩家背包
(game.player as any).inventory.push({ ...folio });

// 與 Archie 對話觸發任務交付
game.activeDialogue = { npc: archieNpc, textIndex: 0 };
while (game.activeDialogue) {
  game.handleKeyDown('Enter');
}

if (!game.poetryQuestComplete) throw new Error('❌ 交付未焚古籍後 poetryQuestComplete 應為 true');
const hasFolioRemaining = (game.player as any).inventory.some((it: any) => it.id === 'item-unburnt-folio');
if (hasFolioRemaining) throw new Error('❌ 任務道具未從背包正確扣除');

const newMaxTimer = (game.player as any).checkInMaxTimer;
if (newMaxTimer !== initialMaxTimer + 25) {
  throw new Error(`❌ checkInMaxTimer 未提升 +25 (預期 ${initialMaxTimer + 25}, 實際 ${newMaxTimer})`);
}
console.log(`✅ Archie 任務完成：詩集修復，神經項圈上限擴充 (${initialMaxTimer} -> ${newMaxTimer} 步)`);

// 驗證終端機簽到重置到新的 125 步上限
game.performCheckIn();
if ((game.player as any).checkInTimer !== newMaxTimer) {
  throw new Error(`❌ performCheckIn 未重置為新上限 ${newMaxTimer}，目前為 ${(game.player as any).checkInTimer}`);
}
console.log(`✅ 終端機簽到驗證通過：計時器成功重置為 ${newMaxTimer} 步`);

// 5. 測試 Terminal POETRY 指令
console.log('\n5. 測試終端機 POETRY 指令與彩蛋...');
const termSession = new TerminalSession(game.map.terminals.TERMINAL_SAFEHOUSE_LOG || { id: 'TEST_TERM' });
const poetryRes = termSession.executeCommand('poetry');
if (!poetryRes.output.includes('SONNET 18') && !poetryRes.output.includes('Shall I compare thee')) {
  throw new Error('❌ POETRY 指令未輸出十四行詩內容');
}
console.log('✅ POETRY 終端機指令輸出內容：');
console.log(poetryRes.output.split('\n').map((l) => '   ' + l).join('\n'));

const helpRes = termSession.executeCommand('help');
if (!helpRes.output.includes('POETRY')) {
  throw new Error('❌ HELP 清單中未列出 POETRY 指令');
}
console.log('✅ HELP 指令包含 POETRY');

// 6. 測試 Save & Load 狀態保存
console.log('\n6. 測試存檔與讀檔...');
saveGameState(game);

const newGame = new GameEngine(mockCanvas);
loadGameState(newGame);

if (!newGame.graffitiMuralComplete) throw new Error('❌ 讀檔後 graffitiMuralComplete 未還原');
if (!newGame.poetryQuestComplete) throw new Error('❌ 讀檔後 poetryQuestComplete 未還原');
if ((newGame.player as any).checkInMaxTimer !== newMaxTimer) {
  throw new Error(`❌ 讀檔後 checkInMaxTimer 未還原 (預期 ${newMaxTimer}, 實際 ${(newGame.player as any).checkInMaxTimer})`);
}
console.log('✅ 讀檔後藝術壁畫狀態、文學詩集狀態與項圈步數上限均完整還原');

console.log('\n🎉 藝術（Vesper）與文學（Archie）支線所有測試全數通過！');
