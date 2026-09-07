import { GameEngine } from '../src/game';
import { GameRenderer } from '../src/renderer';
import { createRobot, createPlayer } from '../src/entities';
import { RobotType } from '../src/types';

// 建立 mockCanvas
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
  })
} as unknown as HTMLCanvasElement;

const game = new GameEngine(mockCanvas);

// 1. 驗證 GameRenderer 繪製方法存在
const renderer = new GameRenderer(mockCanvas);
if (typeof renderer.drawLaserBeam !== 'function') throw new Error('Renderer missing drawLaserBeam');
if (typeof renderer.drawElectricArc !== 'function') throw new Error('Renderer missing drawElectricArc');
if (typeof renderer.drawPlasmaBeam !== 'function') throw new Error('Renderer missing drawPlasmaBeam');
if (typeof renderer.drawNeedleTracer !== 'function') throw new Error('Renderer missing drawNeedleTracer');
console.log('✅ GameRenderer specialized weapon beam renderers verified!');

// 2. 測試 SCOUT_DRONE 攻擊光束
game.player.x = 10;
game.player.y = 10;
const drone = createRobot('SCOUT_DRONE' as RobotType, { x: 10, y: 11 });
game.securityLevel = 'ALERT' as any;
drone.alertCooldown = 5;
game.robots = [drone];
game.laserBeams = [];
game.tick();
const droneBeam = game.laserBeams.find(b => b.beamType === 'NEEDLE');
if (!droneBeam) throw new Error('SCOUT_DRONE attack should generate NEEDLE beam');
if (droneBeam.color !== '#ffea00') throw new Error('SCOUT_DRONE beam should be #ffea00');
console.log('✅ SCOUT_DRONE NEEDLE energy tracer verified!');

// 3. 測試 SHOCK_ENFORCER 攻擊光束
game.player.hp = 100;
game.player.isAlive = true;
game.robots = [createRobot('SHOCK_ENFORCER' as RobotType, { x: 10, y: 11 })];
game.laserBeams = [];
game.tick();
const shockBeam = game.laserBeams.find(b => b.beamType === 'ELEC');
if (!shockBeam) throw new Error('SHOCK_ENFORCER attack should generate ELEC arc');
if (shockBeam.color !== '#00e5ff') throw new Error('SHOCK_ENFORCER arc should be #00e5ff');
console.log('✅ SHOCK_ENFORCER ELEC electric arc discharge verified!');

// 4. 測試 HUNTER_KILLER 遠程攻擊與雷射光束
game.player.hp = 100;
game.player.isAlive = true;
game.robots = [createRobot('HUNTER_KILLER' as RobotType, { x: 10, y: 13 })]; // 距離 3，在射程 4 內
game.laserBeams = [];
game.tick();
const hunterBeam = game.laserBeams.find(b => b.beamType === 'LASER');
if (!hunterBeam) throw new Error('HUNTER_KILLER attack should generate LASER beam');
if (hunterBeam.color !== '#ff1744') throw new Error('HUNTER_KILLER beam should be #ff1744');
console.log('✅ HUNTER_KILLER LASER coherent blaster verified!');

// 5. 測試 EXTERMINATOR 遠程攻擊與電漿光束
game.player.hp = 100;
game.player.isAlive = true;
game.robots = [createRobot('EXTERMINATOR' as RobotType, { x: 10, y: 14 })]; // 距離 4，在射程 5 內
game.laserBeams = [];
game.tick();
const exterminatorBeam = game.laserBeams.find(b => b.beamType === 'PLASMA');
if (!exterminatorBeam) throw new Error('EXTERMINATOR attack should generate PLASMA beam');
if (exterminatorBeam.color !== '#ff0055') throw new Error('EXTERMINATOR beam should be #ff0055');
console.log('✅ EXTERMINATOR PLASMA heavy annihilator beam verified!');

// 6. 測試光束生命週期衰減過濾
game.laserBeams.push({
  from: { x: 0, y: 0 },
  to: { x: 1, y: 1 },
  color: '#ffffff',
  createdAt: Date.now() - 500, // 已超過 350ms
  duration: 350,
});
game.robots = [];
game.tick();
const expiredBeam = game.laserBeams.find(b => b.color === '#ffffff');
if (expiredBeam) throw new Error('Expired beam should be pruned after duration');
console.log('✅ LaserBeam duration lifecycle pruning verified!');

console.log('🎉 All Enemy Weapon Attack FX verification tests passed successfully!');
