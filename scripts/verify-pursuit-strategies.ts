import assert from 'node:assert';
import { updateRobotAI } from '../src/ai';
import { createPlayer, createRobot } from '../src/entities';
import { RobotType, SecurityLevel, TileType } from '../src/types';
import type { Player, Robot, SectorMap } from '../src/types';

const openMap = (): SectorMap => ({
  id: 'pursuit-test', name: 'Pursuit Test', width: 20, height: 20,
  tiles: Array.from({ length: 20 }, () => Array<TileType>(20).fill(TileType.FLOOR)),
  terminals: [], pushableBlocks: [], securityLevel: SecurityLevel.CLEAR,
} as unknown as SectorMap);

const hostilePlayer = (): Player => {
  const player = createPlayer({ x: 10, y: 10 });
  player.isWeaponDrawn = true;
  player.facing = 'right';
  return player;
};

const assertCardinalStep = (robot: Robot, before: { x: number; y: number }, player: Player) => {
  assert.equal(Math.abs(robot.x - before.x) + Math.abs(robot.y - before.y), 1, 'chase must move exactly one cardinal tile');
  assert.notDeepEqual({ x: robot.x, y: robot.y }, { x: player.x, y: player.y }, 'robot must never enter player tile');
};

console.log('=== Pursuit Strategy Verification ===');

{
  const map = openMap(); const player = hostilePlayer();
  const hunter = createRobot(RobotType.HUNTER_KILLER, { x: 4, y: 10 }); const before = { x: hunter.x, y: hunter.y };
  const result = updateRobotAI(hunter, player, map, SecurityLevel.ALERT, [hunter]);
  assert.equal(result.action, 'chase'); assert.match(result.message ?? '', /intercepting/); assertCardinalStep(hunter, before, player);
  console.log('✓ Hunter Killer intercepts the projected heading');
}

{
  const map = openMap(); const player = hostilePlayer();
  const enforcer = createRobot(RobotType.SHOCK_ENFORCER, { x: 4, y: 10 }); const before = { x: enforcer.x, y: enforcer.y };
  const result = updateRobotAI(enforcer, player, map, SecurityLevel.ALERT, [enforcer]);
  assert.equal(result.action, 'chase'); assert.match(result.message ?? '', /flanking/); assertCardinalStep(enforcer, before, player);
  console.log('✓ Shock Enforcer begins a flank');
}

{
  const map = openMap(); const player = hostilePlayer();
  const guard = createRobot(RobotType.SECURITY_BOT, { x: 2, y: 10 }); const before = { x: guard.x, y: guard.y };
  const result = updateRobotAI(guard, player, map, SecurityLevel.ALERT, [guard]);
  assert.equal(result.action, 'chase'); assert.match(result.message ?? '', /is pursuing/); assertCardinalStep(guard, before, player);
  console.log('✓ Security Bot retains direct pursuit');
}

{
  const map = openMap(); map.tiles[10][12] = TileType.WALL; const player = hostilePlayer();
  const hunter = createRobot(RobotType.HUNTER_KILLER, { x: 4, y: 10 }); const before = { x: hunter.x, y: hunter.y };
  const result = updateRobotAI(hunter, player, map, SecurityLevel.ALERT, [hunter]);
  assert.equal(result.action, 'chase'); assert.match(result.message ?? '', /is pursuing/); assertCardinalStep(hunter, before, player);
  console.log('✓ Blocked intercept falls back to direct pursuit');
}

{
  const cases: Array<[RobotType, { x: number; y: number }, SecurityLevel, 'attack' | 'alarm']> = [
    [RobotType.SECURITY_BOT, { x: 8, y: 10 }, SecurityLevel.ALERT, 'attack'],
    [RobotType.HUNTER_KILLER, { x: 5, y: 10 }, SecurityLevel.ALERT, 'attack'],
    [RobotType.SCOUT_DRONE, { x: 6, y: 10 }, SecurityLevel.CLEAR, 'alarm'],
  ];
  for (const [type, position, alert, expected] of cases) {
    const map = openMap(); const player = hostilePlayer(); const robot = createRobot(type, position);
    const result = updateRobotAI(robot, player, map, alert, [robot]);
    assert.equal(result.action, expected, `${type} must preserve its existing ${expected} behavior`);
  }
  console.log('✓ Existing attack ranges and Scout alarm remain unchanged');
}

console.log('All pursuit strategy tests passed!');
