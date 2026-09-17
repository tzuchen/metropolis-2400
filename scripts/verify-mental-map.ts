// scripts/verify-mental-map.ts
// 驗證特工心智地圖 (Agent Mental Map) 系統
// 測試項目：
// 1. 全域座標與探索邊界 (Global Coordinates & Bounding Box)
// 2. ASCII 帶尺規心智地圖繪製 (ASCII Mental Grid with Coordinate Rulers)
// 3. 待探索前沿自動偵測演算法 (Frontier Exploration Detection)
// 4. 語意地標與重要實體回憶 (Semantic POI Recall)
// 5. 心智地圖 A* 尋路導航演算法 (Mental Map A* Pathfinding)
// 6. GameEngine 與 window 接口掛載

import { GameEngine } from '../src/game';
import {
  getMentalMapSnapshot,
  detectFrontiers,
  recallObservedPOIs,
  planMentalMapRoute,
  recordAgentFootprint,
} from '../src/mentalMap';
import {
  generateAIPerceptionSnapshot,
  executeAIAction,
} from '../src/aiPerception';

// Ensure window is defined for Node.js environment
if (typeof window === 'undefined') {
  (globalThis as any).window = globalThis;
}

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

console.log('=== 開始驗證特工心智地圖系統 (Agent Mental Map) ===\n');

const game = new GameEngine(mockCanvas);
game.isTitleScreen = false;
game.isIntroBriefingOpen = false;
game.restartGame();

// 初始位置：特工在安全屋內部地板 (5, 4)
game.player.x = 5;
game.player.y = 4;
game.updateFOV();

// 1. 驗證基礎心智快照與全域座標
console.log('1. 驗證特工全域座標與統計數據 (Agent Position & Stats)...');
const snap1 = getMentalMapSnapshot(game);

if (snap1.agent_pos.global_x !== 5 || snap1.agent_pos.global_y !== 4) {
  throw new Error(`Agent position mismatch: expected (5, 4), got (${snap1.agent_pos.global_x}, ${snap1.agent_pos.global_y})`);
}
if (!snap1.sector.id || !snap1.sector.name) {
  throw new Error('Sector information missing in mental map snapshot');
}
if (snap1.bounding_box.width <= 0 || snap1.bounding_box.height <= 0) {
  throw new Error('Bounding box must have positive dimensions');
}
if (snap1.stats.explored_tiles_count <= 0) {
  throw new Error('Explored tiles count must be > 0');
}
console.log(`✅ 特工全域座標正確: (${snap1.agent_pos.global_x}, ${snap1.agent_pos.global_y})，區域: ${snap1.sector.name}，已探索: ${snap1.stats.explored_tiles_count} 格 (${snap1.stats.exploration_percent}%)`);

// 3. 驗證語意地標回憶 (POI Recall)
console.log('\n3. 驗證語意實體回憶 (Recall POIs)...');
const pois = recallObservedPOIs(game);

// 在 (4, 4) 有安全屋終端機，特工在 (5, 4)，距離為 1.0
const safehouseTerminal = pois.terminals.find((t) => t.x === 4 && t.y === 4);
if (!safehouseTerminal) {
  throw new Error('Observed safehouse terminal at (4, 4) should be recalled');
}
if (Math.abs(safehouseTerminal.distance - 1.0) > 0.1) {
  throw new Error(`Terminal distance mismatch: expected ~1.0, got ${safehouseTerminal.distance}`);
}
console.log(`✅ 成功回憶安全屋終端機: ${safehouseTerminal.name} (${safehouseTerminal.x}, ${safehouseTerminal.y})，距離 ${safehouseTerminal.distance}`);

// 2. 驗證 ASCII 帶座標尺規的地圖繪製
console.log('\n2. 驗證 ASCII 視覺心智地圖 (帶座標標尺與圖例)...');
const grid = snap1.ascii_grid;
if (!Array.isArray(grid) || grid.length < 3) {
  throw new Error('ASCII grid must contain rulers and rows');
}
// 第 0 行為 X 軸十位數標尺，第 1 行為 X 軸個位數標尺
console.log('--- 預覽心智地圖 (前 10 行) ---');
for (let i = 0; i < Math.min(10, grid.length); i++) {
  console.log(grid[i]);
}
console.log('----------------------------');

// 確認圖例中包含特工、足跡、終端機等定義
if (!snap1.ascii_legend['@'] || !snap1.ascii_legend['T'] || !snap1.ascii_legend['!']) {
  throw new Error('Legend missing critical symbol explanations');
}
console.log('✅ ASCII 帶座標標尺心智地圖繪製成功！');

// 4. 驗證待探索前沿偵測演算法 (Frontier Exploration Detection)
console.log('\n4. 驗證待探索前沿偵測演算法 (Frontier Exploration)...');
const frontiers = detectFrontiers(game);
if (!Array.isArray(frontiers) || frontiers.length === 0) {
  throw new Error('Should detect at least one frontier at the edge of safehouse explored FOV');
}

const f1 = frontiers[0];
console.log(`✅ 偵測到 ${frontiers.length} 個待探索前沿點！最近前沿: ${f1.id} 於 (${f1.x}, ${f1.y})，方位 ${f1.direction}，距離 ${f1.distance}，提示: "${f1.hint}"`);
if (typeof f1.x !== 'number' || typeof f1.y !== 'number' || !f1.direction) {
  throw new Error('Invalid frontier point data structure');
}

// 5. 驗證 A* 心智導航與尋路演算法 (A* Route Planning)
console.log('\n5. 測試 A* 心智導航路徑規劃 (Route Planning)...');

// 5a. 規劃到相鄰安全屋終端機 (4, 4)
const routeToTerminal = planMentalMapRoute(game, { x: 4, y: 4 });
if (!routeToTerminal.found) {
  throw new Error('Failed to find path to safehouse terminal (4, 4)');
}
if (routeToTerminal.action_sequence.length === 0) {
  throw new Error('Path should contain action sequence');
}
console.log(`✅ 前往終端機路徑規劃成功：共 ${routeToTerminal.total_steps} 步，動作序列: ${routeToTerminal.action_sequence.join(' -> ')}，下一步: ${routeToTerminal.next_action}`);

// 5b. 規劃到語意別名目標 (使用 terminal id)
const routeById = planMentalMapRoute(game, 'TERMINAL_SAFEHOUSE_LOG');
if (!routeById.found || routeById.target.x !== 4 || routeById.target.y !== 4) {
  throw new Error(`Failed to plan route by terminal ID: got ${JSON.stringify(routeById)}`);
}
console.log('✅ 使用語意別名 "TERMINAL_SAFEHOUSE_LOG" 尋路成功！');

// 5c. 規劃到待探索前沿 (使用 frontier id)
const routeToFrontier = planMentalMapRoute(game, f1.id);
if (!routeToFrontier.found) {
  throw new Error(`Failed to plan route to frontier ${f1.id}`);
}
console.log(`✅ 前往待探索前沿 "${f1.id}" 尋路成功：共 ${routeToFrontier.total_steps} 步，下一步: ${routeToFrontier.next_action}`);

// 5d. 嚴格檢查路徑動作序列 (Strict Path Action Validation)
console.log('\n5d. 嚴格檢查路徑動作序列 (Strict Path Action Validation)...');
const validActions = ['MOVE_N', 'MOVE_S', 'MOVE_E', 'MOVE_W'];
const allActions = [...routeToTerminal.action_sequence, ...routeToFrontier.action_sequence];
for (const action of allActions) {
  if (!validActions.includes(action)) {
    throw new Error(`Invalid action found in path sequence: ${action}. Only cardinal directions (N, S, E, W) are allowed.`);
  }
}
console.log('✅ 嚴格路徑檢查通過：導航動作序列 100% 僅限上下左右 4-方向移動，無任何斜向移動！');

// 6. 測試特工足跡記錄 (Footprints)
console.log('\n6. 測試特工移動後足跡記錄 (Footprints)...');
game.player.x = 6;
game.player.y = 4;
recordAgentFootprint(game);

const snapFootprints = getMentalMapSnapshot(game);
if (snapFootprints.stats.walked_tiles_count < 2) {
  throw new Error('Footprints count should be at least 2 after moving');
}
console.log(`✅ 特工足跡成功記錄: 已踏足 ${snapFootprints.stats.walked_tiles_count} 個格子！`);

// 7. 驗證 GameEngine 方法掛載
console.log('\n7. 驗證 GameEngine 方法掛載...');
if (typeof game.getMentalMap !== 'function') {
  throw new Error('GameEngine.getMentalMap is not a function');
}
if (typeof game.planMentalMapRoute !== 'function') {
  throw new Error('GameEngine.planMentalMapRoute is not a function');
}
const engineSnap = game.getMentalMap();
if (!engineSnap || !engineSnap.agent_pos) {
  throw new Error('game.getMentalMap() returned invalid snapshot');
}
const engineRoute = game.planMentalMapRoute({ x: 4, y: 4 });
if (!engineRoute || typeof engineRoute.found !== 'boolean') {
  throw new Error('game.planMentalMapRoute() returned invalid route');
}
console.log('✅ GameEngine 方法 getMentalMap() 與 planMentalMapRoute() 驗證通過');

// 8. 驗證 window 接口掛載
console.log('\n8. 驗證 window 接口掛載...');
if (typeof (window as any).getMentalMap !== 'function') {
  throw new Error('window.getMentalMap is not a function');
}
if (typeof (window as any).planMentalMapRoute !== 'function') {
  throw new Error('window.planMentalMapRoute is not a function');
}
const windowSnap = (window as any).getMentalMap();
if (!windowSnap || !windowSnap.agent_pos) {
  throw new Error('window.getMentalMap() returned invalid snapshot');
}
const windowRoute = (window as any).planMentalMapRoute('TERMINAL_SAFEHOUSE_LOG');
if (!windowRoute || typeof windowRoute.found !== 'boolean') {
  throw new Error('window.planMentalMapRoute() returned invalid route');
}
console.log('✅ window 接口 getMentalMap() 與 planMentalMapRoute() 驗證通過');

// 9. 驗證 generateAIPerceptionSnapshot 的 mental_map_summary
console.log('\n9. 驗證 generateAIPerceptionSnapshot 的 mental_map_summary...');
const aiSnapshot = generateAIPerceptionSnapshot(game);
if (!aiSnapshot.mental_map_summary) {
  throw new Error('AI perception snapshot missing mental_map_summary');
}
if (typeof aiSnapshot.mental_map_summary.explored_percentage !== 'number') {
  throw new Error('mental_map_summary missing explored_percentage');
}
if (typeof aiSnapshot.mental_map_summary.frontiers_count !== 'number') {
  throw new Error('mental_map_summary missing frontiers_count');
}
if (typeof aiSnapshot.mental_map_summary.recalled_pois_count !== 'number') {
  throw new Error('mental_map_summary missing recalled_pois_count');
}
console.log(`✅ generateAIPerceptionSnapshot mental_map_summary 驗證通過 (explored: ${aiSnapshot.mental_map_summary.explored_percentage}%, frontiers: ${aiSnapshot.mental_map_summary.frontiers_count}, POIs: ${aiSnapshot.mental_map_summary.recalled_pois_count})`);

// 10. 驗證 executeAIAction
console.log('\n10. 驗證 executeAIAction...');
const aiResult1 = executeAIAction(game, 'GET_MENTAL_MAP');
if (!aiResult1 || aiResult1.accepted !== true) {
  throw new Error('executeAIAction GET_MENTAL_MAP accepted should be true');
}
console.log('✅ executeAIAction GET_MENTAL_MAP 驗證通過');

const aiResult2 = executeAIAction(game, 'PLAN_ROUTE:4,4');
if (!aiResult2 || aiResult2.accepted !== true) {
  throw new Error('executeAIAction PLAN_ROUTE:4,4 accepted should be true');
}
console.log('✅ executeAIAction PLAN_ROUTE:4,4 驗證通過');

console.log('\n🎉 特工心智地圖系統 (Agent Mental Map) 全套演算法與驗證 100% 通過！');
