import assert from 'assert';
import { GameEngine } from '../src/game';
import { updateRobotAI } from '../src/ai';
import { RobotType, SecurityLevel } from '../src/types';

console.log('=== Testing Operative-Robot Physical Collision & Entity Non-Overlapping ===\n');

const mockCanvas = {
  width: 960,
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
    setLineDash: () => {},
    measureText: () => ({ width: 50 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  }),
} as unknown as HTMLCanvasElement;

const game = new GameEngine(mockCanvas);
game.isTitleScreen = false;

// 1. 驗證特工行走時無法穿透相鄰機器人 (Player cannot walk through adjacent robot)
console.log('1. 測試特工未拔槍時走向機器人受阻...');
game.player.x = 12;
game.player.y = 8;
game.player.isWeaponDrawn = false;
const blockerRobot = game.robots[0];
blockerRobot.x = 12;
blockerRobot.y = 7;
blockerRobot.isAlive = true;

// 嘗試往上走進機器人所在的 (12, 7)
game.handleKeyDown('ArrowUp');
assert.strictEqual(game.player.x, 12, 'Player X should remain 12');
assert.strictEqual(game.player.y, 8, 'Player Y should remain 8 (blocked)');
const lastMsg = (game as any).messages.slice(-1)[0];
assert.ok(lastMsg.text.includes('路徑受阻') || lastMsg.text.includes('Path blocked'), 'Should emit path blocked warning');
console.log('✅ 特工正常行走遭遇機器人被完全阻擋，座標未改變！');

// 2. 驗證特工拔槍時朝向機器人按方向鍵為射擊而非穿透走入
console.log('\n2. 測試特工拔槍時朝向機器人方向按鍵為開火而非穿越...');
game.player.isWeaponDrawn = true;
game.player.energy = 50;
const robotHpBefore = blockerRobot.hp;
game.handleKeyDown('ArrowUp'); // 向上朝機器人開火
assert.strictEqual(game.player.x, 12, 'Player X should still be 12');
assert.strictEqual(game.player.y, 8, 'Player Y should still be 8');
assert.ok(blockerRobot.hp < robotHpBefore, 'Robot should have taken weapon damage');
console.log('✅ 拔槍狀態朝向機器人按鍵正確執行射擊，特工未穿越進入機器人！');

// 3. 驗證巡邏機器人巡邏路線被特工擋住時，不會走進特工所在格子
console.log('\n3. 測試巡邏機器人遭遇特工時不與特工重疊...');
const patrolRobot = game.robots[1];
patrolRobot.x = 18;
patrolRobot.y = 8;
patrolRobot.patrolPath = [{ x: 18, y: 8 }, { x: 22, y: 8 }];
patrolRobot.currentPatrolIndex = 1; // 目標 (22, 8)
patrolRobot.aiState = 'patrol';
// 特工擋在巡邏必經之路上 (19, 8)
game.player.x = 19;
game.player.y = 8;
game.player.isWeaponDrawn = false;
game.securityLevel = 'CLEAR' as SecurityLevel;

const patrolRes = updateRobotAI(patrolRobot, game.player, game.map, game.securityLevel, game.robots, game.npcs);
assert.ok(
  patrolRobot.x !== game.player.x || patrolRobot.y !== game.player.y,
  `Patrol robot must NOT step onto player (${game.player.x}, ${game.player.y}), was at (${patrolRobot.x}, ${patrolRobot.y})`
);
console.log('✅ 巡邏機器人遭遇特工時避讓或停步，未重疊進入特工格子！');

// 3b. 驗證在死胡同（無繞行空間）時，巡邏機器人完全停步
console.log('\n3b. 測試無繞行空間時，巡邏機器人完全停步原地等待...');
patrolRobot.x = 12;
patrolRobot.y = 7;
patrolRobot.patrolPath = [{ x: 12, y: 5 }, { x: 12, y: 8 }];
patrolRobot.currentPatrolIndex = 1; // 目標 (12, 8)
game.player.x = 12;
game.player.y = 8;

const tightRes = updateRobotAI(patrolRobot, game.player, game.map, game.securityLevel, game.robots, game.npcs);
assert.strictEqual(patrolRobot.x, 12, 'Patrol robot should remain at X: 12');
assert.strictEqual(patrolRobot.y, 7, 'Patrol robot should remain at Y: 7');
assert.strictEqual(tightRes.action, 'patrol');
console.log('✅ 狹窄廊道中巡邏機器人完全停步原地等待，未重疊進入特工格子！');

// 4. 驗證戰鬥追擊機器人在相鄰距離 (dist=1) 時發動攻擊，不會走上特工格子
console.log('\n4. 測試戰鬥追擊機器人與特工相鄰時攻擊，不會踩入特工格子...');
const chaserRobot = game.robots[2];
chaserRobot.x = 24;
chaserRobot.y = 7;
game.player.x = 24;
game.player.y = 8; // 距離 1
chaserRobot.aiState = 'chase';
chaserRobot.attackRange = 1;
game.securityLevel = 'ALERT' as SecurityLevel;

const chaseRes = updateRobotAI(chaserRobot, game.player, game.map, game.securityLevel, game.robots, game.npcs);
assert.strictEqual(chaseRes.action, 'attack', 'Adjacent chaser robot should attack');
assert.strictEqual(chaserRobot.x, 24, 'Chaser robot must remain at (24, 7)');
assert.strictEqual(chaserRobot.y, 7, 'Chaser robot must remain at (24, 7)');
assert.ok(chaserRobot.x !== game.player.x || chaserRobot.y !== game.player.y, 'Chaser robot must not occupy same tile as player');
console.log('✅ 追擊機器人相鄰時正確攻擊，未重疊進入特工格子！');

// 5. 驗證機器人之間不會互相走入重疊
console.log('\n5. 測試兩隻機器人不會互相走入同一格子重疊...');
const rA = game.robots[3];
const rB = game.robots[4];
rA.x = 32;
rA.y = 19;
rB.x = 32;
rB.y = 18;
rB.patrolPath = [{ x: 32, y: 22 }];
rB.currentPatrolIndex = 0;
rB.aiState = 'patrol';

const rBRes = updateRobotAI(rB, game.player, game.map, game.securityLevel, game.robots, game.npcs);
assert.ok(rB.x !== rA.x || rB.y !== rA.y, 'Robot B must NOT step onto Robot A');
console.log('✅ 機器人之間物理碰撞正確生效，不會相互穿透重疊！');

// 6. 驗證戰術滑鏟 [J] 正對機器人時被完全阻擋，無法穿過機器人
console.log('\n6. 測試戰術滑鏟 [J] 無法穿透機器人...');
game.player.x = 10;
game.player.y = 10;
game.player.energy = 50;
game.player.facing = 'right';
const dashBlocker = game.robots[0];
dashBlocker.x = 11;
dashBlocker.y = 10;
dashBlocker.isAlive = true;

const dashSuccess = game.performTacticalDash();
assert.strictEqual(dashSuccess, false, 'Dash should fail when blocked by robot');
assert.strictEqual(game.player.x, 10, 'Player position should remain 10');
assert.strictEqual(game.player.y, 10, 'Player position should remain 10');
console.log('✅ 戰術滑鏟正對機器人時被完全阻擋，特工未穿越機器人！');

// 7. 驗證已摧毀的機器人殘骸 (isAlive === false) 可以正常通過
console.log('\n7. 測試已摧毀機器人殘骸 (Wreckage) 允許通行...');
dashBlocker.isAlive = false;
game.handleKeyDown('ArrowRight'); // 走向殘骸格子 (11, 10)
assert.strictEqual(game.player.x, 11, 'Player should be able to walk over destroyed robot wreckage');
assert.strictEqual(game.player.y, 10, 'Player Y should be 10');
console.log('✅ 已摧毀機器人金屬殘骸允許特工踏過！');

console.log('\n🎉 所有機器人實體碰撞、巡邏停步、追擊攻擊與防穿越驗證全數通過！');
