import assert from 'node:assert';
import { createPlayer, createRobot } from '../src/entities';
import { buildSector1Map } from '../src/map';
import { updateRobotAI } from '../src/ai';
import { RobotType, SecurityLevel } from '../src/types';
import { bgm } from '../src/music';
import { GameEngine } from '../src/game';

console.log('--- Testing Stealth, Holo-Disguise & Dynamic Combat BGM ---');

const map = buildSector1Map();

// 1. Verify Peaceful Civilian Logic in CLEAR security
{
  const player = createPlayer({ x: 10, y: 10 });
  player.isWeaponDrawn = false;
  player.isDisguised = false;

  const drone = createRobot('SCOUT_DRONE' as RobotType, { x: 10, y: 12 }, [{ x: 10, y: 12 }, { x: 10, y: 13 }]);
  const result = updateRobotAI(drone, player, map, SecurityLevel.CLEAR);

  assert.strictEqual(drone.aiState, 'patrol', 'Scout drone should stay in patrol when civilian is unarmed and alert is CLEAR');
  assert.notStrictEqual(result.action, 'alarm', 'Scout drone should not raise alarm against unarmed peaceful civilian');
  assert.notStrictEqual(result.action, 'attack', 'Scout drone should not attack peaceful civilian');
  console.log('✓ Peaceful civilian ignored in CLEAR security level');
}

// 2. Verify Weapon Drawn Triggers Hostility
{
  const player = createPlayer({ x: 10, y: 10 });
  player.isWeaponDrawn = true;
  player.isDisguised = false;

  const enforcer = createRobot('SHOCK_ENFORCER' as RobotType, { x: 10, y: 12 }, [{ x: 10, y: 12 }]);
  const result = updateRobotAI(enforcer, player, map, SecurityLevel.CLEAR);

  assert.ok(enforcer.aiState === 'chase' || enforcer.aiState === 'attack', 'Enforcer should become hostile (chase/attack) when player draws weapon');
  console.log('✓ Armed player correctly triggers hostile state');
}

// 3. Verify Holo-Disguise Evasion in ALERT status and De-escalation
{
  const player = createPlayer({ x: 10, y: 10 });
  player.isWeaponDrawn = false;
  player.isDisguised = true;

  const hunter = createRobot('HUNTER_KILLER' as RobotType, { x: 10, y: 13 }, [{ x: 10, y: 13 }]);
  hunter.aiState = 'chase';
  hunter.targetPos = { x: 10, y: 10 };
  (hunter as any).pursuitTurns = 5;

  const result = updateRobotAI(hunter, player, map, SecurityLevel.ALERT);

  assert.strictEqual(hunter.aiState, 'patrol', 'Disguised unarmed operative should de-escalate chasing robot to patrol');
  assert.strictEqual(hunter.targetPos, null, 'Target pos should be cleared upon disguise de-escalation');
  assert.strictEqual((hunter as any).pursuitTurns, 0, 'Pursuit turns should be reset to 0');
  assert.notStrictEqual(result.action, 'attack', 'Disguised unarmed operative should not be attacked');
  console.log('✓ Holo-disguise successfully de-escalates and evades robots under ALERT');
}

// 4. Verify GameEngine Disguise Toggle Feedback
{
  class MockCanvas {
    getContext() {
      return {
        clearRect: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        fillText: () => {},
        measureText: () => ({ width: 50 }),
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        save: () => {},
        restore: () => {},
        drawImage: () => {},
        setTransform: () => {},
        resetTransform: () => {},
      };
    }
  }

  const game = new GameEngine(new MockCanvas() as any);
  game.isTitleScreen = false;
  game.player.energy = 20;
  game.player.isDisguised = false;

  // Press [C] to activate
  game.handleKeyDown('c');
  assert.strictEqual(game.player.isDisguised, true, 'Disguise should be activated after pressing C');
  const msgs1 = game.messages.map((m: any) => m.text || m.message || m);
  assert.ok(msgs1.some((t: string) => t.includes('Holo-disguise activated')), 'Should output activation message');
  assert.ok(!msgs1.some((t: string) => t.includes('Not enough energy')), 'Should NOT complain of energy lack');

  // Press [C] to deactivate
  game.handleKeyDown('c');
  assert.strictEqual(game.player.isDisguised, false, 'Disguise should be deactivated after pressing C again');
  const msgs2 = game.messages.map((m: any) => m.text || m.message || m);
  assert.ok(msgs2.some((t: string) => t.includes('Holo-disguise deactivated')), 'Should output deactivation message');
  assert.ok(!msgs2.some((t: string) => t.includes('Not enough energy')), 'Should NOT complain of energy lack on deactivation');
  console.log('✓ Holo-disguise toggle UI messaging verified');
}

// 5. Verify Dynamic Combat BGM Intensity
{
  class MockCanvas {
    getContext() {
      return {
        clearRect: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        fillText: () => {},
        measureText: () => ({ width: 50 }),
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        save: () => {},
        restore: () => {},
        drawImage: () => {},
        setTransform: () => {},
        resetTransform: () => {},
      };
    }
  }

  const game = new GameEngine(new MockCanvas() as any);
  game.isTitleScreen = false;
  game.securityLevel = SecurityLevel.CLEAR;
  game.robots.forEach((r) => { r.isAlive = false; }); // clear all robots

  game.render();
  assert.strictEqual(bgm.currentIntensity, 'exploration', 'BGM intensity should be exploration when clear');

  // Add a hostile chasing robot
  const chaser = createRobot('SHOCK_ENFORCER' as RobotType, { x: 5, y: 5 }, []);
  chaser.aiState = 'chase';
  (chaser as any).pursuitTurns = 3;
  chaser.isAlive = true;
  game.robots.push(chaser);

  game.render();
  assert.strictEqual(bgm.currentIntensity, 'combat', 'BGM intensity should be combat when a robot is chasing');

  // Pacify robot
  chaser.aiState = 'patrol';
  (chaser as any).pursuitTurns = 0;
  game.render();
  assert.strictEqual(bgm.currentIntensity, 'exploration', 'BGM intensity should revert to exploration once de-escalated');

  console.log('✓ Dynamic BGM intensity switching verified');
}

// 6. Verify Combat Mode and Alert De-escalation upon Eliminating Hostile Robots
{
  class MockCanvas {
    getContext() {
      return {
        clearRect: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        fillText: () => {},
        measureText: () => ({ width: 50 }),
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        save: () => {},
        restore: () => {},
        drawImage: () => {},
        setTransform: () => {},
        resetTransform: () => {},
      };
    }
  }

  const game = new GameEngine(new MockCanvas() as any);
  game.isTitleScreen = false;
  game.player.x = 10;
  game.player.y = 10;
  game.securityLevel = SecurityLevel.ALERT;
  game.robots.forEach((r) => { r.isAlive = false; });

  const hostile = createRobot('SCOUT_DRONE' as RobotType, { x: 10, y: 11 }, []);
  hostile.aiState = 'chase';
  (hostile as any).pursuitTurns = 4;
  hostile.isAlive = true;
  game.robots.push(hostile);

  game.render();
  assert.strictEqual(bgm.currentIntensity, 'combat', 'Should be combat mode while hostile is alive');

  // Eliminate hostile
  hostile.isAlive = false;
  hostile.hp = 0;
  game.tick();

  assert.strictEqual(game.securityLevel, SecurityLevel.CLEAR, 'Security level should de-escalate to CLEAR after eliminating hostile');
  game.render();
  assert.strictEqual(bgm.currentIntensity, 'exploration', 'Music should return to exploration mode after eliminating hostile');
  console.log('✓ Combat mode and alert de-escalation upon enemy destruction verified');
}

// 7. Verify Sector Switch (Elevator Transit) Clears Combat State
{
  class MockCanvas {
    getContext() {
      return {
        clearRect: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        fillText: () => {},
        measureText: () => ({ width: 50 }),
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        save: () => {},
        restore: () => {},
        drawImage: () => {},
        setTransform: () => {},
        resetTransform: () => {},
      };
    }
  }

  const game = new GameEngine(new MockCanvas() as any);
  game.isTitleScreen = false;
  game.securityLevel = SecurityLevel.ALERT;
  bgm.setIntensity('combat');
  game.laserBeams = [{ from: { x: 1, y: 1 }, to: { x: 2, y: 2 }, color: '#fff', createdAt: Date.now() } as any];

  // Ride elevator to Sector 2
  game.switchSector('sector-2');

  assert.strictEqual(game.securityLevel, SecurityLevel.CLEAR, 'Security level must reset to CLEAR after transit');
  assert.strictEqual(bgm.currentIntensity, 'exploration', 'BGM must return to exploration after transit');
  assert.strictEqual(game.laserBeams.length, 0, 'Residual laser beams must be cleared after transit');
  console.log('✓ Sector transit de-escalation to CLEAR verified');
}

console.log('All Stealth, Disguise & BGM tests PASSED!');
