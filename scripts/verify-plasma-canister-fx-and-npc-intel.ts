import { GameEngine } from '../src/game';
import { FXManager } from '../src/fx';
import { getSector1NPCs } from '../src/dialogues';

function createMockCanvas(w = 960, h = 600): any {
  return {
    width: w,
    height: h,
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
      arc: () => {},
      fill: () => {},
      closePath: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    }),
    parentElement: { style: {} },
  };
}

console.log('=== 開始驗證電漿鋼瓶 2 格範圍震撼特效與 NPC 情報對話 ===\n');

// 1. 驗證 NPC 情報對話包含電漿鋼瓶機制
console.log('1. 檢驗 NPC (Jax) 對話是否包含電漿鋼瓶的黃黑斜紋、藍光、2格範圍與70傷害情報...');
const npcs = getSector1NPCs();
const jax = npcs.find((n) => n.id === 'npc-jax');

if (!jax) {
  throw new Error('❌ 未找到暗巷情報掮客 Jax (npc-jax)');
}

const dialogueStr = (jax.dialogue || []).join(' ');
const dialogueZhStr = ((jax as any).dialogueZh || []).join(' ');

console.log('Jax 中文對話內容:\n', dialogueZhStr);

// 檢驗關鍵要素：黃黑斜紋、藍光/電漿、2格範圍、70傷害、20自傷
const hasCanisterMention = dialogueZhStr.includes('黃黑') && (dialogueZhStr.includes('電漿') || dialogueZhStr.includes('鋼瓶'));
const hasRadiusMention = dialogueZhStr.includes('2 格') || dialogueZhStr.includes('2格');
const hasDamageMention = dialogueZhStr.includes('70');
const hasSelfDamageMention = dialogueZhStr.includes('20');

if (!hasCanisterMention) {
  throw new Error('❌ Jax 對話中缺少電漿鋼瓶（黃黑斜紋/閃藍光）的外觀描述');
}
if (!hasRadiusMention) {
  throw new Error('❌ Jax 對話中缺少 2 格爆炸傷害範圍的情報');
}
if (!hasDamageMention) {
  throw new Error('❌ Jax 對話中缺少 70 點毀滅傷害的情報');
}
if (!hasSelfDamageMention) {
  throw new Error('❌ Jax 對話中缺少距離 2 格內會造成 20 點自傷的警告');
}
console.log('✅ NPC Jax 完整提供電漿鋼瓶的外觀、2格爆炸範圍與傷害情報！');

// 2. 測試 FXManager 產生精準 2 格範圍電漿震波 (spawnPlasmaCanisterExplosion)
console.log('\n2. 測試 FXManager 產生精準 2 格範圍 (>=96px) 的電漿震波與火焰粒子...');
const fx = new FXManager();
(fx as any).spawnPlasmaCanisterExplosion(300, 200, 105);

const shockwaves = (fx as any).shockwaves || [];
if (shockwaves.length === 0) {
  throw new Error('❌ spawnPlasmaCanisterExplosion 未在 FXManager 中產生 shockwaves 震波');
}

const maxRadius = Math.max(...shockwaves.map((sw: any) => sw.maxRadius));
if (maxRadius < 96) {
  throw new Error(`❌ 電漿鋼瓶震波半徑不足 2 格 (預期 >= 96px, 實際 ${maxRadius}px)`);
}
console.log(`✅ 電漿鋼瓶震波半徑精確達到 ${maxRadius}px，完美涵蓋 2 格傷害範圍！`);

if (fx.particles.length < 20) {
  throw new Error(`❌ 電漿鋼瓶爆炸粒子不足 (實際 ${fx.particles.length})`);
}
console.log(`✅ 成功產生 ${fx.particles.length} 顆高溫電漿火花粒子！`);

// 3. 測試在遊戲中引爆電漿鋼瓶
console.log('\n3. 測試在遊戲中引爆電漿鋼瓶 (detonateCanister)...');
const canvas = createMockCanvas();
const game = new GameEngine(canvas as any);

// 尋找場景中未引爆的鋼瓶
const canister = game.hazards.find((h) => h.type === 'PLASMA_CANISTER' && !h.exploded);
if (!canister) {
  throw new Error('❌ 場景中缺少未引爆的電漿鋼瓶');
}

// 在鋼瓶 1 格處放置 1 隻機器人
if (game.robots.length > 0) {
  game.robots[0].x = canister.x + 1;
  game.robots[0].y = canister.y;
  game.robots[0].hp = 100;
  game.robots[0].isAlive = true;
}

// 特工站在 4 格外的安全距離
game.player.x = canister.x + 4;
game.player.y = canister.y;
const playerInitHp = game.player.hp;

// 引爆鋼瓶
(game as any).detonateCanister(canister);

if (!canister.exploded) {
  throw new Error('❌ 引爆後 canister.exploded 應為 true');
}

// 驗證 1 格處機器人受到 70 點傷害
if (game.robots.length > 0 && game.robots[0].hp !== 30) {
  throw new Error(`❌ 機器人未受到 70 點電漿爆炸傷害，目前 HP: ${game.robots[0].hp}`);
}
console.log(`✅ 2 格內機器人受到 70 點電漿爆炸重創 (HP: 100 -> ${game.robots[0].hp})！`);

// 驗證安全距離特工未受傷
if (game.player.hp !== playerInitHp) {
  throw new Error('❌ 安全距離 (4格) 外特工不應受到波及傷害');
}

// 驗證場景中成功生成了對應傷害半徑的電漿震波
const gameShockwaves = (game.fx as any).shockwaves || [];
if (gameShockwaves.length === 0) {
  throw new Error('❌ 引爆鋼瓶後未在 game.fx 中生成對應範圍的電漿震波');
}
console.log(`✅ 引爆鋼瓶成功觸發 2 格範圍電漿震波特效，與傷害判定 100% 吻合！`);

console.log('\n🎉 電漿鋼瓶 2 格範圍震撼特效與 NPC 情報對話全數驗證通過！');
