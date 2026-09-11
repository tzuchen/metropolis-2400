import { GameEngine } from '../src/game';
import { bgm } from '../src/music';

function createMockCanvas(w = 960, h = 600): any {
  const drawnRects: Array<{ x: number; y: number; w: number; h: number; fill?: any }> = [];
  return {
    width: w,
    height: h,
    drawnRects,
    getContext: () => ({
      save: () => {},
      restore: () => {},
      fillRect: (x: number, y: number, w: number, h: number) => {
        drawnRects.push({ x, y, w, h });
      },
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: () => ({ width: 10 }),
      arc: () => {},
      fill: () => {},
      closePath: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
    }),
    parentElement: {
      style: {},
    },
  };
}

console.log('=== 開始驗證玩家戰敗過場動畫 (Defeat Cinematic Cutscene) ===\n');

const canvas = createMockCanvas(960, 600);
const game = new GameEngine(canvas as any);

// 1. 驗證直接調用 handlePlayerDefeat(true) 或 headless 模式保持向下相容
console.log('1. 測試 headless / instant 模式向下相容...');
game.player.hp = 0;
game.handlePlayerDefeat(true);

if (!game.player.isAlive) {
  throw new Error('❌ Instant 模式下特工應甦醒 (isAlive 應為 true)');
}
if (game.player.x !== 35 || game.player.y !== 5) {
  throw new Error(`❌ Instant 模式下特工未送至禁閉室 (35, 5)，實際為 (${game.player.x}, ${game.player.y})`);
}
if (!game.isGearConfiscated) {
  throw new Error('❌ Instant 模式下裝備應被扣押');
}
console.log('✅ Headless / Instant 模式向下相容完全正常！');

// 2. 測試過場動畫流程 (Cutscene State Machine)
console.log('\n2. 測試過場動畫流程啟動...');
// 重置回非禁閉室位置
game.player.x = 20;
game.player.y = 15;
game.player.hp = 0;
// 強制啟動過場流程 (startDefeatCutscene)
game.startDefeatCutscene();

if (!game.defeatCutscene) {
  throw new Error('❌ startDefeatCutscene() 未正確初始化 defeatCutscene 物件');
}
if (game.defeatCutscene.stage !== 'swarm') {
  throw new Error(`❌ 初始過場階段應為 swarm，實際為 ${game.defeatCutscene.stage}`);
}
console.log('✅ Stage 1 [swarm] 成功啟動，周圍機器人開始圍攻並壓制！');

// 3. 測試過場期間移動鍵被鎖定
console.log('\n3. 測試過場期間特工動作控制鎖定...');
const startX = game.player.x;
const startY = game.player.y;
game.handleKeyDown('ArrowRight');
if (game.player.x !== startX || game.player.y !== startY) {
  throw new Error('❌ 過場動畫期間應鎖定移動');
}
console.log('✅ 過場期間移動輸入已成功鎖定！');

// 4. 測試 Stage 1 -> Stage 2 [blur_out] (畫面漸漸模糊)
console.log('\n4. 測試推進至 Stage 2 [blur_out] (畫面模糊)...');
// 模擬時間推進至 swarm 結束
const t1 = game.defeatCutscene.startTime + (game.defeatCutscene.duration || 2000) + 100;
game.updateDefeatCutscene(t1);

if (!game.defeatCutscene || game.defeatCutscene.stage !== 'blur_out') {
  throw new Error(`❌ 時間超過後應推進至 blur_out 階段，實際為 ${game.defeatCutscene?.stage}`);
}
console.log('✅ 成功進入 Stage 2 [blur_out]，畫面開始模糊與黑屏轉場！');

// 5. 測試 Stage 2 -> Stage 3 [wake_up] (黑屏傳送至禁閉室，再漸漸清楚醒來)
console.log('\n5. 測試推進至 Stage 3 [wake_up] (禁閉室醒來，畫面漸漸由模糊變清楚)...');
// 模擬時間推進至 blur_out 結束
const t2 = game.defeatCutscene.stageStartTime + (game.defeatCutscene.duration || 2000) + 100;
game.updateDefeatCutscene(t2);

if (!game.defeatCutscene || game.defeatCutscene.stage !== 'wake_up') {
  throw new Error(`❌ 模糊黑屏後應進入 wake_up 階段，實際為 ${game.defeatCutscene?.stage}`);
}
if (game.player.x !== 35 || game.player.y !== 5) {
  throw new Error(`❌ wake_up 時特工應已在禁閉室 (35, 5)，實際為 (${game.player.x}, ${game.player.y})`);
}
if (!game.isGearConfiscated) {
  throw new Error('❌ 進入禁閉室時裝備應已扣押至證物箱');
}
if (bgm.currentIntensity !== 'exploration') {
  throw new Error(`❌ wake_up 時 bgm.currentIntensity 應為 'exploration'，實際為 ${bgm.currentIntensity}`);
}
console.log('✅ 特工已在禁閉室醒來 (35, 5)，畫面進入 Stage 3 [wake_up] 逐漸由模糊變清晰！');

// 6. 測試 Stage 3 結束，玩家恢復控制
console.log('\n6. 測試過場結束並恢復控制...');
const t3 = game.defeatCutscene.stageStartTime + (game.defeatCutscene.duration || 2200) + 100;
game.updateDefeatCutscene(t3);

if (game.defeatCutscene !== null) {
  throw new Error('❌ wake_up 完成後 defeatCutscene 應為 null');
}
console.log('✅ 過場完全結束，特工完全甦醒並恢復正常遊戲控制！');

// 7. 測試跳過過場功能 (Space / Escape)
console.log('\n7. 測試 [Escape] 跳過過場功能...');
game.player.hp = 0;
game.startDefeatCutscene();
if (!game.defeatCutscene) throw new Error('過場未啟動');
game.handleKeyDown('Escape');
if (game.defeatCutscene !== null) {
  throw new Error('❌ 按下 Escape 應能直接跳過過場');
}
if (game.player.x !== 35 || game.player.y !== 5) {
  throw new Error('❌ 跳過過場後應正確傳送到禁閉室 (35, 5)');
}
console.log('✅ [Escape] 快捷跳過過場功能正常！');

// 8. 測試 Renderer 繪製過場無異常
console.log('\n8. 測試 Renderer 繪製各階段過場畫面...');
game.startDefeatCutscene();
game.render(); // swarm
game.updateDefeatCutscene(game.defeatCutscene!.startTime + game.defeatCutscene!.duration + 100);
game.render(); // blur_out
game.updateDefeatCutscene(game.defeatCutscene!.stageStartTime + game.defeatCutscene!.duration + 100);
game.render(); // wake_up
console.log('✅ 各階段過場畫面 Renderer 繪製正常，無拋出異常！');

// 9. 測試重複調用 handlePlayerDefeat(false) 不會重置或覆蓋現有過場動畫 (Regression)
console.log('\n9. 測試重複調用 handlePlayerDefeat(false) 的冪等性與狀態保持...');
const freshGame = new GameEngine(createMockCanvas(960, 600) as any);
freshGame.player.hp = 0;
freshGame.handlePlayerDefeat(false);

if (!freshGame.defeatCutscene) {
  throw new Error('❌ 首次調用 handlePlayerDefeat(false) 後應初始化 defeatCutscene');
}

const retainedCutscene = freshGame.defeatCutscene;
const retainedStageStartTime = retainedCutscene.stageStartTime;

// 再次調用，不應重置或覆蓋
freshGame.handlePlayerDefeat(false);

if (freshGame.defeatCutscene !== retainedCutscene) {
  throw new Error('❌ 重複調用 handlePlayerDefeat(false) 不應重新建立 defeatCutscene 物件');
}
if (freshGame.defeatCutscene.stageStartTime !== retainedStageStartTime) {
  throw new Error(`❌ 重複調用不應改變 stageStartTime，實際為 ${freshGame.defeatCutscene.stageStartTime}，預期為 ${retainedStageStartTime}`);
}
console.log('✅ 重複調用 handlePlayerDefeat(false) 未重置過場狀態，物件引用與 stageStartTime 保持不變！');

// 驅動過場動畫至 wake_up 階段
const freshSwarmEnd = retainedCutscene.stageStartTime + retainedCutscene.duration + 100;
freshGame.updateDefeatCutscene(freshSwarmEnd);

if (freshGame.defeatCutscene?.stage !== 'blur_out') {
  throw new Error(`❌ 推進 swarm 後應進入 blur_out，實際為 ${freshGame.defeatCutscene?.stage}`);
}

const blurEnd = freshGame.defeatCutscene.stageStartTime + freshGame.defeatCutscene.duration + 100;
freshGame.updateDefeatCutscene(blurEnd);

if (freshGame.defeatCutscene?.stage !== 'wake_up') {
  throw new Error(`❌ 推進 blur_out 後應進入 wake_up，實際為 ${freshGame.defeatCutscene?.stage}`);
}
if (freshGame.player.x !== 35 || freshGame.player.y !== 5) {
  throw new Error(`❌ wake_up 時特工應在禁閉室 (35, 5)，實際為 (${freshGame.player.x}, ${freshGame.player.y})`);
}
if (!freshGame.isGearConfiscated) {
  throw new Error('❌ 進入 wake_up 時裝備應已被扣押');
}
if (!freshGame.player.isAlive) {
  throw new Error('❌ wake_up 時特工應已甦醒 (isAlive 應為 true)');
}
console.log('✅ 重複調用後過場動畫正確推進至 wake_up，特工在禁閉室甦醒且裝備已扣押！');

// 10. 測試從 Sector-2 戰敗後過場動畫正確傳送至 Sector-1 禁閉室
console.log('\n10. 測試從 Sector-2 戰敗後過場動畫正確傳送至 Sector-1 禁閉室...');
const sector2Game = new GameEngine(createMockCanvas(960, 600) as any);
sector2Game.switchSector('sector-2');

if (sector2Game.map.id !== 'sector-2') {
  throw new Error(`❌ switchSector('sector-2') 後 map.id 應為 sector-2，實際為 ${sector2Game.map.id}`);
}
if (sector2Game.player.currentSectorId !== 'sector-2') {
  throw new Error(`❌ switchSector('sector-2') 後 player.currentSectorId 應為 sector-2，實際為 ${sector2Game.player.currentSectorId}`);
}

sector2Game.player.hp = 0;
sector2Game.handlePlayerDefeat(false);

if (!sector2Game.defeatCutscene) {
  throw new Error('❌ handlePlayerDefeat(false) 後應初始化 defeatCutscene');
}
if (sector2Game.defeatCutscene.stage !== 'swarm') {
  throw new Error(`❌ 初始過場階段應為 swarm，實際為 ${sector2Game.defeatCutscene.stage}`);
}

// 推進 swarm -> blur_out
const s2SwarmEnd = sector2Game.defeatCutscene.stageStartTime + sector2Game.defeatCutscene.duration + 100;
sector2Game.updateDefeatCutscene(s2SwarmEnd);

if (sector2Game.defeatCutscene?.stage !== 'blur_out') {
  throw new Error(`❌ 推進 swarm 後應進入 blur_out，實際為 ${sector2Game.defeatCutscene?.stage}`);
}

// 推進 blur_out -> wake_up
const s2BlurEnd = sector2Game.defeatCutscene.stageStartTime + sector2Game.defeatCutscene.duration + 100;
sector2Game.updateDefeatCutscene(s2BlurEnd);

if (sector2Game.defeatCutscene?.stage !== 'wake_up') {
  throw new Error(`❌ 推進 blur_out 後應進入 wake_up，實際為 ${sector2Game.defeatCutscene?.stage}`);
}
if (sector2Game.map.id !== 'sector-1') {
  throw new Error(`❌ wake_up 時 map.id 應為 sector-1，實際為 ${sector2Game.map.id}`);
}
if (sector2Game.player.currentSectorId !== 'sector-1') {
  throw new Error(`❌ wake_up 時 player.currentSectorId 應為 sector-1，實際為 ${sector2Game.player.currentSectorId}`);
}
if (sector2Game.player.x !== 35 || sector2Game.player.y !== 5) {
  throw new Error(`❌ wake_up 時特工應在禁閉室 (35, 5)，實際為 (${sector2Game.player.x}, ${sector2Game.player.y})`);
}
if (!sector2Game.player.isAlive) {
  throw new Error('❌ wake_up 時特工應已甦醒 (isAlive 應為 true)');
}
if (!sector2Game.isGearConfiscated) {
  throw new Error('❌ wake_up 時裝備應已被扣押');
}
if (bgm.currentIntensity !== 'exploration') {
  throw new Error(`❌ Sector-2 wake_up 時 bgm.currentIntensity 應為 'exploration'，實際為 ${bgm.currentIntensity}`);
}
console.log('✅ 從 Sector-2 戰敗後過場動畫正確傳送至 Sector-1 禁閉室 (35, 5)，特工甦醒且裝備已扣押！');

// 11. 測試從 Sector-2 戰敗後 Instant 模式直接傳送至 Sector-1 禁閉室
console.log('\n11. 測試從 Sector-2 戰敗後 Instant 模式直接傳送至 Sector-1 禁閉室...');
const sector2InstantGame = new GameEngine(createMockCanvas(960, 600) as any);
sector2InstantGame.switchSector('sector-2');

if (sector2InstantGame.map.id !== 'sector-2') {
  throw new Error(`❌ switchSector('sector-2') 後 map.id 應為 sector-2，實際為 ${sector2InstantGame.map.id}`);
}
if (sector2InstantGame.player.currentSectorId !== 'sector-2') {
  throw new Error(`❌ switchSector('sector-2') 後 player.currentSectorId 應為 sector-2，實際為 ${sector2InstantGame.player.currentSectorId}`);
}

sector2InstantGame.player.hp = 0;
sector2InstantGame.handlePlayerDefeat(true);

if (sector2InstantGame.map.id !== 'sector-1') {
  throw new Error(`❌ Instant 模式下 map.id 應為 sector-1，實際為 ${sector2InstantGame.map.id}`);
}
if (sector2InstantGame.player.currentSectorId !== 'sector-1') {
  throw new Error(`❌ Instant 模式下 player.currentSectorId 應為 sector-1，實際為 ${sector2InstantGame.player.currentSectorId}`);
}
if (sector2InstantGame.player.x !== 35 || sector2InstantGame.player.y !== 5) {
  throw new Error(`❌ Instant 模式下特工應在禁閉室 (35, 5)，實際為 (${sector2InstantGame.player.x}, ${sector2InstantGame.player.y})`);
}
if (!sector2InstantGame.player.isAlive) {
  throw new Error('❌ Instant 模式下特工應已甦醒 (isAlive 應為 true)');
}
if (!sector2InstantGame.isGearConfiscated) {
  throw new Error('❌ Instant 模式下裝備應已被扣押');
}
console.log('✅ 從 Sector-2 戰敗後 Instant 模式直接傳送至 Sector-1 禁閉室 (35, 5)，特工甦醒且裝備已扣押！');

// 12. 測試 blur_out 邊界條件：確定性回歸測試
console.log('\n12. 測試 blur_out 邊界條件 (確定性回歸測試)...');
const boundaryGame = new GameEngine(createMockCanvas(960, 600) as any);
boundaryGame.player.hp = 0;
boundaryGame.startDefeatCutscene();

if (!boundaryGame.defeatCutscene || boundaryGame.defeatCutscene.stage !== 'swarm') {
  throw new Error('❌ 初始階段應為 swarm');
}

// 推進至 blur_out
const swarmEnd = boundaryGame.defeatCutscene.stageStartTime + boundaryGame.defeatCutscene.duration + 100;
boundaryGame.updateDefeatCutscene(swarmEnd);

if (!boundaryGame.defeatCutscene || boundaryGame.defeatCutscene.stage !== 'blur_out') {
  throw new Error(`❌ 推進 swarm 後應進入 blur_out，實際為 ${boundaryGame.defeatCutscene?.stage}`);
}

const blurOutStartTime = boundaryGame.defeatCutscene.stageStartTime;
const blurOutDuration = boundaryGame.defeatCutscene.duration;

// 在 blur_out 期間調用 updateDefeatCutscene，時間戳超過階段期限
const blurOutEnd = blurOutStartTime + blurOutDuration + 50;
boundaryGame.updateDefeatCutscene(blurOutEnd);

if (!boundaryGame.defeatCutscene || boundaryGame.defeatCutscene.stage !== 'wake_up') {
  throw new Error(`❌ 推進 blur_out 後應進入 wake_up，實際為 ${boundaryGame.defeatCutscene?.stage}`);
}

// 驗證玩家位置
if (boundaryGame.player.x !== 35 || boundaryGame.player.y !== 5) {
  throw new Error(`❌ wake_up 時特工應在禁閉室 (35, 5)，實際為 (${boundaryGame.player.x}, ${boundaryGame.player.y})`);
}

// 驗證 BGM 強度
if (bgm.currentIntensity !== 'exploration') {
  throw new Error(`❌ wake_up 時 bgm.currentIntensity 應為 'exploration'，實際為 ${bgm.currentIntensity}`);
}

// 驗證玩家存活
if (!boundaryGame.player.isAlive) {
  throw new Error('❌ wake_up 時特工應已甦醒 (isAlive 應為 true)');
}

// 驗證裝備扣押
if (!boundaryGame.isGearConfiscated) {
  throw new Error('❌ wake_up 時裝備應已被扣押');
}

// 再次調用 updateDefeatCutscene 確保不會重複觸發或卡住
const wakeUpStartTime = boundaryGame.defeatCutscene.stageStartTime;
const wakeUpDuration = boundaryGame.defeatCutscene.duration;
const wakeUpEnd = wakeUpStartTime + wakeUpDuration + 100;
boundaryGame.updateDefeatCutscene(wakeUpEnd);

if (boundaryGame.defeatCutscene !== null) {
  throw new Error('❌ wake_up 完成後 defeatCutscene 應為 null');
}

console.log('✅ blur_out 邊界條件測試通過：確定性推進至 wake_up，玩家位置正確，BGM 恢復，過場正常結束！');

console.log('\n🎉 所有玩家戰敗圍捕、模糊轉場與禁閉室甦醒測試全數通過！');
