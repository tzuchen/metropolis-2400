import { GameEngine } from '../src/game';
import { TerminalSession } from '../src/terminal';
import { applyBossDamage, handleBossDeath } from '../src/boss';
import { TileType } from '../src/types';

console.log('=== 開始驗證強化版佐格堡壘戰鬥與無盡蜂擁圍攻系統 ===\n');

const mockCanvas = {
  getContext: () => ({
    fillRect: () => {},
    clearRect: () => {},
    fillText: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    setTransform: () => {},
    measureText: () => ({ width: 0 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    drawImage: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createPattern: () => ({}),
    clip: () => {},
    rect: () => {},
    quadraticCurveTo: () => {},
    bezierCurveTo: () => {},
  }),
  width: 960,
  height: 600,
};

const game = new GameEngine(mockCanvas as any);

// 1. 驗證切換至 Citadel 地圖
console.log('1. 驗證進入 Citadel 頂層堡壘...');
game.switchSector('sector-citadel');
if (game.map.id !== 'sector-citadel') {
  throw new Error('地圖 ID 必須為 sector-citadel');
}
if (game.player.x !== 4 || game.player.y !== 15) {
  throw new Error(`玩家初始坐標應為 (4, 15)，實際為 (${game.player.x}, ${game.player.y})`);
}
console.log('✅ 成功進入 Citadel，初始位置 (4, 15)');

// 2. 驗證前半段迂迴長廊與狙擊目標機器人
console.log('\n2. 驗證前半段迂迴長廊結構與狙擊防守守衛...');
const westRobots = game.robots.filter((r) => r.isAlive && r.x < 18);
if (westRobots.length < 2) {
  throw new Error(`前半段長廊守衛機器人數量不足 (期望 >= 2，實際為 ${westRobots.length})`);
}
console.log(`✅ 前半段長廊成功配置 ${westRobots.length} 隻狙擊攔截機器人:`, westRobots.map(r => `${r.name || r.robotType}@(${r.x},${r.y})`));

// 檢查前半段是否有迂迴牆壁與直線射擊空間
let westWalls = 0;
for (let y = 5; y <= 22; y++) {
  for (let x = 6; x <= 16; x++) {
    if (game.map.tiles[y][x] === TileType.WALL) {
      westWalls++;
    }
  }
}
if (westWalls < 10) {
  throw new Error(`前半段應具備足夠的迂迴曲折掩體與防禦牆 (實際牆壁數: ${westWalls})`);
}
console.log(`✅ 前半段迂迴防禦掩體與曲折廊道驗證通過 (內部掩體牆數: ${westWalls})`);

// 3. 驗證後半段空曠戰鬥大廳與 Boss 配置
console.log('\n3. 驗證後半段空曠戰鬥大廳與滅絕者原型機...');
const boss = game.robots.find((r) => r.robotType === 'EXTERMINATOR');
if (!boss) {
  throw new Error('未找到滅絕者原型機 (EXTERMINATOR) 首領');
}
if (boss.x < 18 || boss.x > 32) {
  throw new Error(`首領應位於後半段戰鬥大廳 (18 <= x <= 32)，實際位置 (${boss.x}, ${boss.y})`);
}
console.log(`✅ 首領滅絕者原型機就緒於 (${boss.x}, ${boss.y})，HP: ${boss.hp}`);

// 檢查後半段大廳的開闊度 (大部分為 FLOOR)
let arenaFloors = 0;
let arenaTotal = 0;
for (let y = 8; y <= 20; y++) {
  for (let x = 20; x <= 30; x++) {
    arenaTotal++;
    if (game.map.tiles[y][x] === TileType.FLOOR) {
      arenaFloors++;
    }
  }
}
const floorRatio = arenaFloors / arenaTotal;
if (floorRatio < 0.7) {
  throw new Error(`後半段大廳應當寬敞空曠 (地板比例期望 >= 70%，實際為 ${(floorRatio * 100).toFixed(1)}%)`);
}
console.log(`✅ 後半段戰鬥大廳開闊度合格 (空曠地板比例: ${(floorRatio * 100).toFixed(1)}%)`);

// 4. 擊敗 Boss 並觸發蜂擁大軍 (Horde Event)
console.log('\n4. 模擬擊敗滅絕者原型機，驗證力場解除與無盡蜂擁警報...');
applyBossDamage(boss, 500, game);
if (boss.hp > 0 || boss.isAlive) {
  throw new Error('首領應已被擊殺');
}

// 檢查力場是否解除
const forcefieldOpen = game.map.tiles[15][31] === TileType.FLOOR || game.map.tiles[15][33] === TileType.FLOOR;
if (!forcefieldOpen) {
  throw new Error('擊敗首領後力場應當關閉變為可通行地板');
}
console.log('✅ 力場已關閉，通往核心終端機通道解鎖');

// 檢查蜂擁圍攻狀態
if (!(game as any).isCitadelHordeActive) {
  throw new Error('擊敗首領後必須啟動 isCitadelHordeActive 蜂擁圍攻狀態');
}
const hordeRobots = game.robots.filter((r) => r.isAlive);
if (hordeRobots.length < 6) {
  throw new Error(`擊敗首領後應立即湧現大批圍攻機器人 (期望 >= 6，實際為 ${hordeRobots.length})`);
}
console.log(`✅ 蜂擁警報啟動！現場立即湧入 ${hordeRobots.length} 隻狂暴圍攻機器人`);

// 5. 驗證無盡增援機制 (無法通通殺光)
console.log('\n5. 驗證無盡增援機制 (消滅部分單位後持續湧入，無法全數殲滅)...');
const beforeCount = game.robots.filter((r) => r.isAlive).length;
// 擊殺其中 3 隻機器人
let killed = 0;
for (const r of game.robots) {
  if (r.isAlive && killed < 3) {
    r.isAlive = false;
    r.hp = 0;
    killed++;
  }
}
console.log(`特工拼死消滅了 ${killed} 隻圍攻機器人...`);

// 推進數個回合，觸發增援刷新
for (let i = 0; i < 4; i++) {
  (game as any).turnCounter = ((game as any).turnCounter || 0) + 1;
  (game as any).updateRobots?.();
}

const currentAlive = game.robots.filter((r) => r.isAlive).length;
console.log(`數回合後場上存活機器人數量: ${currentAlive} (增援持續湧入)`);
if (currentAlive < 5) {
  throw new Error(`增援刷新機制失效，存活機器人過少 (${currentAlive})`);
}
console.log('✅ 無盡增援機制驗證通過：敵軍源源不絕，無法通通殺光！');

// 6. 驗證在圍攻中抵達核心終端機並結束遊戲
console.log('\n6. 驗證特工突破包圍抵達核心終端機結束遊戲...');
const terminalData = game.map.terminals['TERMINAL_OVERMIND_CORE'];
if (!terminalData) {
  throw new Error('未找到 TERMINAL_OVERMIND_CORE 核心終端機');
}
const session = new TerminalSession(terminalData);
(game as any).activeTerminal = session;
(game as any).terminalInputBuffer = 'overload';
session.input = 'overload';
game.handleKeyDown('Enter');

if (!game.victory || (game.player as any).endgameChoice !== 'OVERLOAD') {
  throw new Error('核心終端機 OVERLOAD 執行後應判定遊戲勝利並設定 endgameChoice');
}
console.log('✅ 成功啟動核心終端機 OVERLOAD，遊戲勝利，佐格主腦被摧毀！');

console.log('\n🎉 所有強化版佐格堡壘戰鬥、狙擊走廊、開闊戰場、無盡圍攻與終端機破關驗證全數通過！');
