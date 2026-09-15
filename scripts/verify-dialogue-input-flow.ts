import { GameEngine } from '../src/game';

console.log('=== 開始驗證 NPC 對話視窗按鍵處理流 (Dialogue Input Flow) ===\n');

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
const hiro = game.npcs.find((n) => n.id === 'npc-hiro');
if (!hiro) throw new Error('NPC Hiro 未找到');

// 1. 測試 Enter / Space 推進至下一句
console.log('1. 測試 Enter／Space：推進下一句...');
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.handleKeyDown('Enter');
if (!game.activeDialogue || game.activeDialogue.textIndex !== 1) {
  throw new Error(`按 Enter 未能推進至下一句，當前 textIndex: ${game.activeDialogue?.textIndex}`);
}
game.handleKeyDown(' ');
if (!game.activeDialogue || game.activeDialogue.textIndex !== 2) {
  throw new Error(`按 Space 未能推進至下一句，當前 textIndex: ${game.activeDialogue?.textIndex}`);
}
console.log('✅ Enter / Space 推進下一句正常！');

// 2. 測試 Escape 關閉對話且不移動
console.log('\n2. 測試 Escape：關閉對話，不移動...');
game.player.x = 10;
game.player.y = 10;
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.handleKeyDown('Escape');
if (game.activeDialogue !== null) throw new Error('按 Escape 未能關閉對話');
if (game.player.x !== 10 || game.player.y !== 10) throw new Error('按 Escape 對話關閉時特工發生了非預期的移動');
console.log('✅ Escape 關閉對話且原地不動正常！');

// 3. 測試 方向鍵 / WASD 關閉對話並立刻朝該方向移動
console.log('\n3. 測試 方向鍵／WASD：關閉對話，並立刻朝該方向移動...');
game.player.x = 10;
game.player.y = 10;
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.handleKeyDown('ArrowRight');
if (game.activeDialogue !== null) throw new Error('按 ArrowRight 未能關閉對話');
if (game.player.x !== 11 || game.player.y !== 10) {
  throw new Error(`按 ArrowRight 關閉對話後未能立刻右移，當前座標: (${game.player.x}, ${game.player.y})`);
}

// 測試 's' 向下移動
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.handleKeyDown('s');
if (game.activeDialogue !== null) throw new Error('按 s 未能關閉對話');
if (game.player.x !== 11 || game.player.y !== 11) {
  throw new Error(`按 s 關閉對話後未能立刻下移，當前座標: (${game.player.x}, ${game.player.y})`);
}

// 測試 'a' 向左移動
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.handleKeyDown('a');
if (game.activeDialogue !== null) throw new Error('按 a 未能關閉對話');
if (game.player.x !== 10 || game.player.y !== 11) {
  throw new Error(`按 a 關閉對話後未能立刻左移，當前座標: (${game.player.x}, ${game.player.y})`);
}

// 測試 'w' 向上移動
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.handleKeyDown('w');
if (game.activeDialogue !== null) throw new Error('按 w 未能關閉對話');
if (game.player.x !== 10 || game.player.y !== 10) {
  throw new Error(`按 w 關閉對話後未能立刻上移，當前座標: (${game.player.x}, ${game.player.y})`);
}
console.log('✅ 方向鍵與 WASD 關閉對話並立刻移動完全正常！');

// 4. 測試 其他快捷鍵 關閉對話後，照原本功能處理
console.log('\n4. 測試 其他快捷鍵：關閉對話後，照原本功能處理...');

// 4.1 測試 [I] 開啟背包
game.isInventoryOpen = false;
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.handleKeyDown('i');
if (game.activeDialogue !== null) throw new Error('按 i 未能關閉對話');
if (!game.isInventoryOpen) throw new Error('按 i 關閉對話後未能依原功能開啟背包');
game.isInventoryOpen = false;

// 4.2 測試 [P] 開啟特工日記
game.isJournalOpen = false;
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.handleKeyDown('p');
if (game.activeDialogue !== null) throw new Error('按 p 未能關閉對話');
if (!game.isJournalOpen) throw new Error('按 p 關閉對話後未能依原功能開啟特工日記');
game.closeJournal();

// 4.3 測試 [F] 拔槍 / 收槍
game.player.isWeaponDrawn = false;
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.handleKeyDown('f');
if (game.activeDialogue !== null) throw new Error('按 f 未能關閉對話');
if (!game.player.isWeaponDrawn) throw new Error('按 f 關閉對話後未能依原功能拔槍');
game.player.isWeaponDrawn = false;

// 4.4 測試 [Q] 切換武器
const initialWeapon = game.player.equippedWeapon;
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.handleKeyDown('q');
if (game.activeDialogue !== null) throw new Error('按 q 未能關閉對話');
if (game.player.equippedWeapon === initialWeapon && (game.player.weapons?.length || 0) > 1) {
  throw new Error('按 q 關閉對話後未能依原功能切換武器');
}

// 4.5 測試 [Z] 切換語言
const initialLang = game.language;
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.handleKeyDown('z');
if (game.activeDialogue !== null) throw new Error('按 z 未能關閉對話');
if (game.language === initialLang) throw new Error('按 z 關閉對話後未能依原功能切換語言');
game.language = initialLang;

console.log('✅ 其他快捷鍵關閉對話後照原本功能處理驗證通過！');
console.log('\n🎉 所有對話視窗按鍵處理規則 100% 驗證通過！');
