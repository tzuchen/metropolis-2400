// scripts/verify-detention-and-gear-recovery.ts
// 驗證特工被擊倒後的俘虜、禁閉室暗門脫逃與證物保管箱裝備奪回系統

import { GameEngine } from '../src/game';
import { getTile } from '../src/map';
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

console.log('=== 開始驗證特工俘虜禁閉室與裝備找回系統 (Detention & Gear Recovery) ===\n');

const game = new GameEngine(mockCanvas);

// 1. 準備特工初始裝備與物品
console.log('1. 配置特工初始武器、背包與補給品...');
const initialWeapon = {
  id: 'test-blaster',
  name: 'Heavy Plasma Blaster',
  itemType: 'WEAPON',
  power: 35,
  description: 'Powerful custom blaster',
  iconColor: '#00f0ff',
};
const testKeycard = {
  id: 'test-keycard-alpha',
  name: 'Alpha Clearance Pass',
  itemType: 'KEYCARD',
  description: 'Test clearance token',
  iconColor: '#ffea00',
};

game.player.weapons = [{ ...initialWeapon }];
game.player.equippedWeapon = { ...initialWeapon };
(game.player as any).inventory = [{ ...testKeycard }];
game.player.consumables = { medkits: 3, batteries: 2, empGrenades: 1 };
(game.player as any).augments = { 'sub-dermal-armor': true };

console.log(`✅ 特工初始裝備已就緒: ${game.player.weapons.length} 把武器, ${game.player.consumables.medkits} 個急救包`);

// 2. 模擬特工被機器人擊倒 (HP 歸零)
console.log('\n2. 模擬特工遭受致命打擊被俘虜...');
game.player.hp = 0;
// 觸發擊倒俘虜流程
game.handlePlayerDefeat();

// 驗證特工沒有 Game Over，而是甦醒於禁閉室
if (!game.player.isAlive) {
  throw new Error('❌ 被擊倒後特工不應死亡 (isAlive 應為 true)');
}
if (game.player.hp <= 0) {
  throw new Error(`❌ 特工生命值未部分恢復，目前 HP: ${game.player.hp}`);
}
console.log(`✅ 特工甦醒於禁閉室，生命值恢復至 ${game.player.hp}/${game.player.maxHp}`);

// 驗證特工位置在禁閉室內部 (35, 5)
if (game.player.x !== 35 || game.player.y !== 5) {
  throw new Error(`❌ 特工位置不在禁閉室內部 (預期 (35, 5), 實際 (${game.player.x}, ${game.player.y}))`);
}
console.log(`✅ 特工成功被押入 Sector 1 檢查哨禁閉室 (35, 5)`);

// 驗證裝備已被沒收
if (game.player.weapons.length !== 0 || game.player.equippedWeapon !== null) {
  throw new Error('❌ 玩家武器應被全數扣押');
}
if ((game.player as any).inventory.length !== 0) {
  throw new Error('❌ 玩家背包道具應被全數扣押');
}
if (game.player.consumables?.medkits !== 0 || game.player.consumables?.batteries !== 0) {
  throw new Error('❌ 玩家補給品應被全數清空');
}
if (!game.isGearConfiscated || !game.confiscatedGear) {
  throw new Error('❌ isGearConfiscated 應為 true，confiscatedGear 應保存扣押物品');
}
console.log('✅ 特工身上所有武器、背包道具與補給品已被佐格扣押至證物庫');

// 3. 驗證禁閉室正面出口受阻，並存在暗門與通風柵板
console.log('\n3. 驗證禁閉室暗門與推箱機制...');
const detentionGrate = game.pushableBlocks.find((b) => b.id === 'crate-detention-grate');
if (!detentionGrate) {
  throw new Error('❌ 未在禁閉室找到通風柵板 crate-detention-grate');
}
console.log(`✅ 找到鬆動的通風柵板於 (${detentionGrate.x}, ${detentionGrate.y})`);

// 檢查暗門原始狀態為 WALL (2)
const secretDoorBefore = getTile(game.map, { x: 36, y: 3 });
if (secretDoorBefore !== 2) {
  throw new Error(`❌ 通風暗門 (36, 3) 初始應為 WALL (2)，目前為 ${secretDoorBefore}`);
}
console.log('✅ 通風暗門 (36, 3) 初始隱藏為實體牆壁');

// 4. 模擬玩家移動並推開通風金屬柵板
console.log('\n4. 特工推開通風柵板露出暗門...');
// 特工從 (35, 5) 移動到 (35, 4)
game.handleKeyDown('ArrowUp');
if (game.player.x !== 35 || game.player.y !== 4) {
  throw new Error(`❌ 特工未能移動到 (35, 4)，目前在 (${game.player.x}, ${game.player.y})`);
}

// 特工在 (35, 4) 向右推動通風柵板 (36, 4)
game.handleKeyDown('ArrowRight');

// 驗證柵板被推至 (37, 4)，特工前進至 (36, 4)
if (detentionGrate.x !== 37 || detentionGrate.y !== 4) {
  throw new Error(`❌ 通風柵板未被推到 (37, 4)，目前在 (${detentionGrate.x}, ${detentionGrate.y})`);
}
if (game.player.x !== 36 || game.player.y !== 4) {
  throw new Error(`❌ 特工未前進至柵板原位置 (36, 4)，目前在 (${game.player.x}, ${game.player.y})`);
}

// 驗證暗門已開啟為 DOOR_OPEN (4)
const secretDoorAfter = getTile(game.map, { x: 36, y: 3 });
if (secretDoorAfter !== 4) {
  throw new Error(`❌ 推開通風柵板後，暗門 (36, 3) 應開啟為 DOOR_OPEN (4)，目前為 ${secretDoorAfter}`);
}
console.log('✅ 通風暗門成功開啟！(36, 3) 變為可通行的開門狀態');

// 5. 特工穿過暗門逃出禁閉室
console.log('\n5. 特工穿過暗門逃向管線維修廊道...');
game.handleKeyDown('ArrowUp'); // 走入暗門 (36, 3)
if (game.player.x !== 36 || game.player.y !== 3) {
  throw new Error(`❌ 特工未能穿過暗門至 (36, 3)，目前在 (${game.player.x}, ${game.player.y})`);
}

game.handleKeyDown('ArrowUp'); // 走出暗門至北側廊道 (36, 2)
if (game.player.x !== 36 || game.player.y !== 2) {
  throw new Error(`❌ 特工未能走出暗門至北側廊道 (36, 2)，目前在 (${game.player.x}, ${game.player.y})`);
}
console.log(`✅ 特工成功穿過暗門脫逃至北側管線廊道 (${game.player.x}, ${game.player.y})！`);

// 6. 沿著廊道前往守衛區 (32, 6) 尋找證物保管箱
console.log('\n6. 前往守衛室調查佐格證物保管箱...');
const locker = game.groundItems.find((it) => it.id === 'item-confiscated-locker');
if (!locker) {
  throw new Error('❌ 未找到證物保管箱 item-confiscated-locker');
}
console.log(`✅ 在守衛室發現證物保管箱於 (${locker.x}, ${locker.y})`);

// 玩家沿著廊道向西移動至 x=32
while (game.player.x > 32) {
  game.handleKeyDown('ArrowLeft');
}
if (game.player.x !== 32 || game.player.y !== 2) {
  throw new Error(`❌ 特工未能抵達 (32, 2)，目前在 (${game.player.x}, ${game.player.y})`);
}

// 玩家南下至 (32, 6) 調查保管箱
while (game.player.y < 6) {
  game.handleKeyDown('ArrowDown');
}
if (game.player.x !== 32 || game.player.y !== 6) {
  throw new Error(`❌ 特工未能抵達保管箱座標 (32, 6)，目前在 (${game.player.x}, ${game.player.y})`);
}

// 7. 驗證裝備奪回
console.log('\n7. 驗證裝備奪回與還原狀態...');
if (game.isGearConfiscated) {
  throw new Error('❌ 踩上保管箱後 isGearConfiscated 應為 false');
}
if (game.player.weapons.length !== 1 || game.player.weapons[0].id !== 'test-blaster') {
  throw new Error('❌ 玩家武器未正確還原');
}
if (game.player.equippedWeapon?.id !== 'test-blaster') {
  throw new Error('❌ 玩家裝備武器未正確還原');
}
if (!(game.player as any).inventory.some((it: any) => it.id === 'test-keycard-alpha')) {
  throw new Error('❌ 玩家背包物品未正確還原');
}
if (game.player.consumables?.medkits !== 3 || game.player.consumables?.batteries !== 2) {
  throw new Error('❌ 玩家補給品未正確還原');
}
console.log(`✅ 裝備完美取回: 武器 [${game.player.equippedWeapon?.name}], 背包 [${(game.player as any).inventory[0].name}], 補給品完整恢復！`);

// 8. 測試存檔與讀檔相容性
console.log('\n8. 測試被俘虜狀態下的存檔與讀檔...');
// 再次擊倒玩家進入扣押狀態測試存檔
game.player.hp = 0;
game.handlePlayerDefeat();

saveGameState(game);
const newGame = new GameEngine(mockCanvas);
loadGameState(newGame);

if (!newGame.isGearConfiscated) {
  throw new Error('❌ 讀檔後 isGearConfiscated 未還原');
}
if (!newGame.confiscatedGear || !newGame.confiscatedGear.weapons) {
  throw new Error('❌ 讀檔後 confiscatedGear 未還原');
}
console.log('✅ 存檔與讀檔成功完整保存被扣押裝備資料');

console.log('\n🎉 特工俘虜、禁閉室暗門脫逃與裝備找回系統全數驗證通過！');
