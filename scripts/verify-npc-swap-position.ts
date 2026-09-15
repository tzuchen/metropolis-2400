import { GameEngine } from '../src/game';

console.log('=== 開始驗證 NPC 借過／交換位置機制 (NPC Swap Position Flow) ===\n');

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
const vance = game.npcs.find((n) => n.id === 'npc-vance');
const kira = game.npcs.find((n) => n.id === 'npc-kira');

if (!hiro || !vance || !kira) {
  throw new Error('測試用 NPC (Hiro, Vance, Kira) 未完整載入');
}

// 1. 測試：首次撞向 NPC 開啟對話，第二次撞向 NPC（或在對話中按移動鍵）執行借過交換位置
console.log('1. 測試：首次撞向 NPC 開啟對話，第二次按方向鍵交換位置...');
game.player.x = 10;
game.player.y = 10;
game.player.isWeaponDrawn = false;
hiro.x = 11;
hiro.y = 10;

// 第一次向右撞 Hiro -> 開啟對話
game.handleKeyDown('ArrowRight');
if (!game.activeDialogue || game.activeDialogue.npc.id !== 'npc-hiro') {
  throw new Error('首次撞向 NPC 未能正確開啟對話視窗');
}
if (game.player.x !== 10 || game.player.y !== 10 || hiro.x !== 11 || hiro.y !== 10) {
  throw new Error('首次撞向 NPC 時發生了非預期的位置移動');
}

// 第二次在對話中再次向右按 -> 借過交換位置
game.handleKeyDown('ArrowRight');
if (game.activeDialogue !== null) {
  throw new Error('借過時未能正確關閉對話視窗');
}
if (game.player.x !== 11 || game.player.y !== 10) {
  throw new Error(`借過後特工座標錯誤: 預期 (11, 10)，實際 (${game.player.x}, ${game.player.y})`);
}
if (hiro.x !== 10 || hiro.y !== 10) {
  throw new Error(`借過後 NPC Hiro 座標錯誤: 預期 (10, 10)，實際 (${hiro.x}, ${hiro.y})`);
}
console.log('✅ 首次對話、二次按鍵借過交換位置驗證通過！');

// 2. 測試：對話自然播放結束 (Space 至末句關閉) 後，按方向鍵借過交換位置
console.log('\n2. 測試：對話結束關閉後，按方向鍵借過交換位置...');
game.player.x = 10;
game.player.y = 10;
vance.x = 10;
vance.y = 11;

// 向下撞 Vance -> 開啟對話
game.handleKeyDown('ArrowDown');
if (!game.activeDialogue || game.activeDialogue.npc.id !== 'npc-vance') {
  throw new Error('撞向 Vance 未能開啟對話');
}
// 連續按 Space 直到對話關閉
while (game.activeDialogue) {
  game.handleKeyDown('Space');
}
// 現在對話已關閉，再次向下按 ArrowDown -> 借過
game.handleKeyDown('ArrowDown');
if (game.player.x !== 10 || game.player.y !== 11) {
  throw new Error(`對話結束後借過特工座標錯誤: 預期 (10, 11)，實際 (${game.player.x}, ${game.player.y})`);
}
if (vance.x !== 10 || vance.y !== 10) {
  throw new Error(`對話結束後借過 NPC Vance 座標錯誤: 預期 (10, 10)，實際 (${vance.x}, ${vance.y})`);
}
console.log('✅ 對話讀完後按方向鍵借過交換位置驗證通過！');

// 3. 測試：按 Escape 關閉對話後，按方向鍵借過交換位置
console.log('\n3. 測試：按 Escape 關閉對話後，按方向鍵借過交換位置...');
game.player.x = 10;
game.player.y = 10;
kira.x = 9;
kira.y = 10;

// 向左撞 Kira -> 開啟對話
game.handleKeyDown('ArrowLeft');
if (!game.activeDialogue || game.activeDialogue.npc.id !== 'npc-kira') {
  throw new Error('撞向 Kira 未能開啟對話');
}
// 按 Escape 關閉對話
game.handleKeyDown('Escape');
if (game.activeDialogue !== null) {
  throw new Error('按 Escape 未能關閉對話');
}
if (game.player.x !== 10 || game.player.y !== 10 || kira.x !== 9 || kira.y !== 10) {
  throw new Error('按 Escape 時座標發生非預期改變');
}
// 再次向左按 ArrowLeft -> 借過
game.handleKeyDown('ArrowLeft');
if (game.player.x !== 9 || game.player.y !== 10) {
  throw new Error(`Escape 關閉後借過特工座標錯誤: 預期 (9, 10)，實際 (${game.player.x}, ${game.player.y})`);
}
if (kira.x !== 10 || kira.y !== 10) {
  throw new Error(`Escape 關閉後借過 NPC Kira 座標錯誤: 預期 (10, 10)，實際 (${kira.x}, ${kira.y})`);
}
console.log('✅ Escape 關閉對話後按方向鍵借過交換位置驗證通過！');

// 4. 測試：拔槍狀態下不可借過交換位置
console.log('\n4. 測試：拔槍狀態下不可借過交換位置...');
game.player.x = 20;
game.player.y = 20;
hiro.x = 21;
hiro.y = 20;
game.player.isWeaponDrawn = true;

game.handleKeyDown('ArrowRight');
if (game.player.x !== 20 || game.player.y !== 20 || hiro.x !== 21 || hiro.y !== 20) {
  throw new Error('拔槍狀態下發生了非預期的位置交換');
}
game.player.isWeaponDrawn = false;
console.log('✅ 拔槍狀態安全阻擋驗證通過！');

// 5. 測試：借過之後轉身再次撞向 NPC 可重新開啟對話
console.log('\n5. 測試：借過後轉身再次撞向 NPC 可重新開啟對話...');
// 設定特工在 (9, 10)，Kira 在 (10, 10)
game.player.x = 9;
game.player.y = 10;
kira.x = 10;
kira.y = 10;
game.player.isWeaponDrawn = false;

// 特工往右走（向 Kira 方向）
game.handleKeyDown('ArrowRight');
if (!game.activeDialogue || game.activeDialogue.npc.id !== 'npc-kira') {
  throw new Error('借過後轉身面對 NPC 未能重新開啟對話');
}
console.log('✅ 借過後轉身重新開啟對話驗證通過！');

console.log('\n🎉 所有 NPC 借過／交換位置機制 100% 驗證通過！');
