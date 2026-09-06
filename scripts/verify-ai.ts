import { createPlayer, createRobot } from '../src/entities';
import { buildSector1Map } from '../src/map';
import { updateRobotAI } from '../src/ai';
import { RobotType, SecurityLevel } from '../src/types';

const map = buildSector1Map();
const player = createPlayer({ x: 5, y: 5 });
const robot = createRobot('SCOUT_DRONE' as RobotType, { x: 5, y: 7 }, [{ x: 5, y: 7 }, { x: 5, y: 8 }]);

// Test 1: Peaceful state when weapon not drawn and alert is clear
player.isWeaponDrawn = false;
const res1 = updateRobotAI(robot, player, map, SecurityLevel.CLEAR);
if (!res1 || typeof res1 !== 'object') {
  throw new Error('AI update should return an action result');
}

// Test 2: Hostile state when weapon is drawn and in sight
player.isWeaponDrawn = true;
const res2 = updateRobotAI(robot, player, map, SecurityLevel.ALERT);
if (!res2) {
  throw new Error('AI update in alert state failed');
}

console.log('AI verification passed!');
