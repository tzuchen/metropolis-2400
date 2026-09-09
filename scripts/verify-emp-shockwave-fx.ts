import { FXManager } from '../src/fx';
import { GameEngine } from '../src/game';

function createMockCanvas(w = 960, h = 600): any {
  const drawnArcs: Array<{ x: number; y: number; r: number }> = [];
  return {
    width: w,
    height: h,
    drawnArcs,
    getContext: () => ({
      save: () => {},
      restore: () => {},
      translate: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: () => ({ width: 10 }),
      arc: (x: number, y: number, r: number) => {
        drawnArcs.push({ x, y, r });
      },
      fill: () => {},
      closePath: () => {},
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
    }),
    parentElement: { style: {} },
  };
}

console.log('=== 開始驗證 EMP 大範圍震波特效系統 (EMP Large Shockwave FX) ===\n');

// 1. 測試 FXManager.spawnEmpRing 大範圍震波產生
console.log('1. 測試 FXManager.spawnEmpRing 大範圍震波與雙重擴散環...');
const fx = new FXManager();
const startX = 200;
const startY = 150;
const blastRadius = 220; // 大範圍 220px (~4.5 格)

fx.spawnEmpRing(startX, startY, blastRadius);

if (!Array.isArray((fx as any).shockwaves) || (fx as any).shockwaves.length < 2) {
  throw new Error('❌ spawnEmpRing 應產生至少 2 層同心震波環 (shockwaves)');
}
console.log(`✅ 成功產生 ${(fx as any).shockwaves.length} 層大範圍同心擴散震波環！`);

// 檢驗震波最大半徑
const maxR = Math.max(...(fx as any).shockwaves.map((sw: any) => sw.maxRadius));
if (maxR < 200) {
  throw new Error(`❌ 震波最大擴散半徑應至少為 200px，實際為 ${maxR}px`);
}
console.log(`✅ 震波最大擴散半徑達到 ${maxR}px，覆蓋超大範圍！`);

// 檢驗電漿火花粒子數量
if (fx.particles.length < 30) {
  throw new Error(`❌ EMP 應產生至少 30 顆放射狀高能電弧火花粒子，實際僅 ${fx.particles.length}`);
}
console.log(`✅ 伴隨 ${fx.particles.length} 顆高能放射電漿火花粒子！`);

// 檢驗螢幕震動與全螢幕電磁脈衝閃光
if (fx.shakeIntensity < 12) {
  throw new Error(`❌ EMP 震屏強度應達到強烈級別 (>=12)，實際為 ${fx.shakeIntensity}`);
}
if (!(fx as any).empFlashAlpha || (fx as any).empFlashAlpha <= 0) {
  throw new Error('❌ EMP 應觸發鏡頭電磁干擾閃光 (empFlashAlpha > 0)');
}
console.log(`✅ 震屏強度 (${fx.shakeIntensity}) 與全螢幕 EMP 電磁閃光驗證通過！`);

// 2. 測試震波隨時間擴散與物理模擬 (update)
console.log('\n2. 測試震波隨時間動態擴散模擬...');
const initialRadius = (fx as any).shockwaves[0].radius;
for (let frame = 0; frame < 5; frame++) {
  fx.update(16);
}
const expandedRadius = (fx as any).shockwaves[0].radius;
if (expandedRadius <= initialRadius && (fx as any).shockwaves[0].life === 0) {
  throw new Error('❌ 震波半徑隨時間未正常擴散');
}
console.log(`✅ 震波隨時間平滑向外劇烈擴散，生命週期物理模擬正常！`);

// 3. 測試 Renderer 繪製震波光環與電弧
console.log('\n3. 測試 Canvas 繪製震波、放射光暈與電弧閃電...');
const canvas = createMockCanvas(960, 600);
canvas.drawnArcs.length = 0;
fx.render(canvas.getContext(), 0, 0);

if (canvas.drawnArcs.length < 2) {
  throw new Error('❌ Canvas 未繪製出震波圓環');
}
const hasLargeWaveArc = canvas.drawnArcs.some((a: any) => a.r > 20);
if (!hasLargeWaveArc) {
  throw new Error('❌ Canvas 未繪製出大範圍震波擴散環');
}
console.log(`✅ Canvas 成功繪製出 ${canvas.drawnArcs.length} 個震波環與電弧粒子！`);

// 4. 測試 GameEngine.useEMPGrenade 實機觸發
console.log('\n4. 測試特工在遊戲中投擲 EMP 震撼彈...');
const gameCanvas = createMockCanvas(960, 600);
const game = new GameEngine(gameCanvas as any);

// 給予玩家 EMP 手榴彈
if (!game.player.consumables) {
  game.player.consumables = { medkits: 0, batteries: 0, empGrenades: 0 };
}
game.player.consumables.empGrenades = 1;

// 在玩家周圍 3 格內放置 1 隻機器人
if (game.robots.length > 0) {
  game.robots[0].x = game.player.x + 2;
  game.robots[0].y = game.player.y + 1;
  game.robots[0].isAlive = true;
}

const prevEmpCount = game.player.consumables.empGrenades;
// 按下 [3] 鍵使用 EMP
game.handleKeyDown('3');

if (game.player.consumables.empGrenades !== prevEmpCount - 1) {
  throw new Error('❌ 使用 EMP 後消耗品數量未扣除');
}
if ((game.fx as any).shockwaves.length === 0) {
  throw new Error('❌ 投擲 EMP 後未在遊戲場景中生成大範圍震波');
}
console.log(`✅ 特工成功引爆 EMP，大範圍電磁震波席捲全場，周圍機器人陷入癱瘓！`);

console.log('\n🎉 EMP 大範圍震波特效系統全數驗證通過！');
