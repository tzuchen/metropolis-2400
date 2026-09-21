// scripts/verify-combat-reflexes.ts
// 驗證特工戰術即時拔槍開火 (Auto-Draw on Fire) 與交戰反射強化
// 涵蓋收槍狀態下的開火能力、valid_actions 動作掩碼、以及杜絕誤走進敵人 (moved_instead_of_fired)

import { GameEngine } from '../src/game';
import { generateAIPerceptionSnapshot } from '../src/aiPerception';
import { executeAIAction } from '../src/actionExecutor';
import { createRobot } from '../src/entities';
import { RobotType } from '../src/types';

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

console.log('=== 開始驗證特工戰術即時拔槍開火 (Auto-Draw on Fire) ===\n');

const game = new GameEngine(mockCanvas);
game.isTitleScreen = false;
game.isIntroBriefingActive = false;

// 1. 驗證收槍狀態下 valid_actions 恆常包含 FIRE_* 戰術動作
console.log('1. 驗證收槍狀態下的知覺快照 valid_actions...');
game.player.isWeaponDrawn = false;
game.player.energy = 50;
const snapHolstered = generateAIPerceptionSnapshot(game);

if (!snapHolstered.valid_actions.includes('DRAW_WEAPON')) {
  throw new Error('收槍狀態下 valid_actions 應包含 DRAW_WEAPON');
}
if (snapHolstered.valid_actions.includes('HOLSTER_WEAPON')) {
  throw new Error('收槍狀態下 valid_actions 不應包含 HOLSTER_WEAPON');
}
for (const fireAction of ['FIRE_FACING', 'FIRE_N', 'FIRE_S', 'FIRE_E', 'FIRE_W']) {
  if (!snapHolstered.valid_actions.includes(fireAction)) {
    throw new Error(`裝備武器且能量充足時，收槍狀態亦應包含 ${fireAction}`);
  }
}
console.log('✅ 收槍狀態下有效動作正確開放 FIRE_* 選項');

// 2. 驗證拔槍狀態下 valid_actions 切換
console.log('2. 驗證拔槍狀態下的知覺快照 valid_actions...');
game.player.isWeaponDrawn = true;
const snapDrawn = generateAIPerceptionSnapshot(game);

if (!snapDrawn.valid_actions.includes('HOLSTER_WEAPON')) {
  throw new Error('拔槍狀態下 valid_actions 應包含 HOLSTER_WEAPON');
}
if (snapDrawn.valid_actions.includes('DRAW_WEAPON')) {
  throw new Error('拔槍狀態下 valid_actions 不應包含 DRAW_WEAPON');
}
for (const fireAction of ['FIRE_FACING', 'FIRE_N', 'FIRE_S', 'FIRE_E', 'FIRE_W']) {
  if (!snapDrawn.valid_actions.includes(fireAction)) {
    throw new Error(`拔槍狀態應包含 ${fireAction}`);
  }
}
console.log('✅ 拔槍狀態下有效動作正確開放 HOLSTER_WEAPON 與 FIRE_*');

// 3. 驗證特工收槍時執行 FIRE_* 自動拔槍並射擊（杜絕誤走進敵人）
console.log('3. 驗證收槍狀態下調用 executeAIAction("FIRE_E") 自動拔槍並擊中目標...');
game.player.isWeaponDrawn = false;
const px = 10;
const py = 10;
game.player.x = px;
game.player.y = py;
game.player.energy = 50;

// 在東方 2 格處放置敵對巡邏機器人
const testRobot = createRobot(RobotType.PATROL, { x: px + 2, y: py });
testRobot.hp = 10;
game.robots = [testRobot];

const outcome = executeAIAction(game, 'FIRE_E');

// 驗證特工自動拔槍
if (!game.player.isWeaponDrawn) {
  throw new Error('執行 FIRE_E 後，特工應自動處於拔槍狀態 (Auto-Draw on Fire)');
}
// 驗證特工沒有向前移動（原本收槍按右鍵會前進）
if (game.player.x !== px || game.player.y !== py) {
  throw new Error(`特工不應移動！預期座標 (${px}, ${py})，實際座標 (${game.player.x}, ${game.player.y})`);
}
// 驗證開火成功判定
if (!outcome.fired) {
  throw new Error(`預期 outcome.fired === true，實際為 ${outcome.fired}`);
}
if (outcome.reason !== 'weapon_fired') {
  throw new Error(`預期 outcome.reason === 'weapon_fired'，實際為 ${outcome.reason}`);
}
if (outcome.moved) {
  throw new Error('開火動作 outcome.moved 不應為 true');
}
// 驗證機器人受到傷害或被擊毀
if (testRobot.isAlive !== false && testRobot.hp >= 10) {
  throw new Error('東方機器人應受到雷射射擊傷害');
}
console.log('✅ 收槍即時開火 (Auto-Draw) 成功命中目標，未發生座標位移');

// 4. 驗證無能量時不開火且不誤位移
console.log('4. 驗證能量耗盡時拒絕開火且不誤位移...');
game.player.isWeaponDrawn = false;
game.player.energy = 0;
const outcomeNoEnergy = executeAIAction(game, 'FIRE_E');

if (outcomeNoEnergy.fired) {
  throw new Error('無能量時 outcome.fired 應為 false');
}
if (outcomeNoEnergy.reason !== 'insufficient_energy') {
  throw new Error(`無能量時 outcome.reason 應為 'insufficient_energy'，實際為 ${outcomeNoEnergy.reason}`);
}
if (game.player.x !== px || game.player.y !== py) {
  throw new Error('無能量開火時不應向前位移走進敵軍');
}
console.log('✅ 無能量開火安全防護驗證通過');

// 5. 驗證無武器裝備時的處置
console.log('5. 驗證無武器裝備時的處置...');
const backupWeapon = game.player.equippedWeapon;
game.player.equippedWeapon = null as any;
const outcomeNoWeapon = executeAIAction(game, 'FIRE_E');
if (outcomeNoWeapon.fired) {
  throw new Error('無武器裝備時 outcome.fired 應為 false');
}
if (outcomeNoWeapon.reason !== 'no_weapon_equipped') {
  throw new Error(`無武器裝備時 outcome.reason 應為 'no_weapon_equipped'，實際為 ${outcomeNoWeapon.reason}`);
}
game.player.equippedWeapon = backupWeapon;
console.log('✅ 無武器裝備安全處置驗證通過');

console.log('\n🎉 所有特工交戰反射與 Auto-Draw 測試 100% 通過！');
