import assert from 'assert';
import { GameEngine } from '../src/game';
import { createRobot, createPlayer } from '../src/entities';
import { updateRobotAI } from '../src/ai';
import { buildSector1Map } from '../src/map';
import { RobotType, SecurityLevel } from '../src/types';

console.log('Testing Robot Durability, Enhanced Stats, and Attack Ranges...');

// 1. 驗證基礎數值與射程提升
const scout = createRobot('SCOUT_DRONE' as RobotType, { x: 10, y: 10 });
assert(scout.hp === 55, `SCOUT_DRONE HP must be 55, got ${scout.hp}`);
assert(scout.attackPower === 12, `SCOUT_DRONE attackPower must be 12, got ${scout.attackPower}`);
assert(scout.attackRange === 3, `SCOUT_DRONE attackRange must be 3, got ${scout.attackRange}`);

const enforcer = createRobot('SHOCK_ENFORCER' as RobotType, { x: 10, y: 10 });
assert(enforcer.hp === 120, `SHOCK_ENFORCER HP must be 120, got ${enforcer.hp}`);
assert(enforcer.attackPower === 22, `SHOCK_ENFORCER attackPower must be 22, got ${enforcer.attackPower}`);
assert(enforcer.attackRange === 2, `SHOCK_ENFORCER attackRange must be 2, got ${enforcer.attackRange}`);

const hunter = createRobot('HUNTER_KILLER' as RobotType, { x: 10, y: 10 });
assert(hunter.hp === 180, `HUNTER_KILLER HP must be 180, got ${hunter.hp}`);
assert(hunter.attackPower === 32, `HUNTER_KILLER attackPower must be 32, got ${hunter.attackPower}`);
assert(hunter.attackRange === 5, `HUNTER_KILLER attackRange must be 5, got ${hunter.attackRange}`);

console.log('✅ Robot durability and tactical attack ranges verified!');

// 2. 測試 SCOUT_DRONE 射程 3 遠距攻擊
const map = buildSector1Map();
const player = createPlayer({ x: 10, y: 10 });
player.isWeaponDrawn = true;
const testDrone = createRobot('SCOUT_DRONE' as RobotType, { x: 10, y: 13 }); // 距離 3
testDrone.alertCooldown = 5;
const attackRes = updateRobotAI(testDrone, player, map, SecurityLevel.ALERT);
assert(attackRes.action === 'attack', `SCOUT_DRONE at range 3 must attack, got ${attackRes.action}`);
assert(attackRes.damage === 12, `SCOUT_DRONE attack damage must be 12, got ${attackRes.damage}`);
console.log('✅ SCOUT_DRONE range 3 needle attack verified!');

// 3. 測試受擊即時鎖定追擊 (Retaliation on Hit)
const mockCanvas = {
  width: 960,
  height: 600,
  getContext: () => ({
    save: () => {}, restore: () => {}, clearRect: () => {}, fillRect: () => {},
    strokeRect: () => {}, fillText: () => {}, beginPath: () => {}, closePath: () => {},
    moveTo: () => {}, lineTo: () => {}, arc: () => {}, fill: () => {}, stroke: () => {},
    setLineDash: () => {}, measureText: () => ({ width: 50 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  })
} as unknown as HTMLCanvasElement;

const game = new GameEngine(mockCanvas);
game.player.x = 5;
game.player.y = 5;
game.player.isWeaponDrawn = true;
const targetRobot = createRobot('SHOCK_ENFORCER' as RobotType, { x: 5, y: 7 });
targetRobot.aiState = 'patrol';
game.robots = [targetRobot];

// 模擬玩家對目標射擊
game.handleKeyDown('ArrowDown'); // 朝下開火
assert(targetRobot.hp < 120, 'Robot should have taken damage');
assert(targetRobot.isAlive === true, 'Robot should survive initial shot due to 120 HP');
assert(targetRobot.aiState === 'chase' || targetRobot.aiState === 'attack', `Robot should enter chase state after being hit, got ${targetRobot.aiState}`);
assert((targetRobot as any).pursuitTurns > 0, 'Robot should have pursuitTurns initialized');
console.log('✅ Retaliation on hit and pursuit memory verified!');

// 4. 測試脫離視線持續追擊記憶 (Pursuit Persistence)
const hiddenPlayer = createPlayer({ x: 1, y: 1 });
const chaserRobot = createRobot('SHOCK_ENFORCER' as RobotType, { x: 15, y: 15 });
chaserRobot.aiState = 'chase';
chaserRobot.targetPos = { x: 14, y: 15 };
(chaserRobot as any).pursuitTurns = 3;

const chaseRes = updateRobotAI(chaserRobot, hiddenPlayer, map, SecurityLevel.CLEAR);
assert(chaseRes.action === 'chase', `Robot with pursuit memory should keep chasing, got ${chaseRes.action}`);
assert((chaserRobot as any).pursuitTurns === 2, `pursuitTurns should decrement from 3 to 2, got ${(chaserRobot as any).pursuitTurns}`);
console.log('✅ Pursuit persistence across blind spots verified!');

console.log('🎉 All Robot Durability, Pursuit AI, and Combat Engagement tests passed successfully!');
