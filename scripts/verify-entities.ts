import { createPlayer, createRobot } from '../src/entities';
import { RobotType } from '../src/types';

const p = createPlayer({ x: 5, y: 5 });
if (typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.hp !== 'number' || typeof p.isDisguised !== 'boolean') {
  throw new Error('Player missing required fields');
}

const r = createRobot('SCOUT_DRONE' as RobotType, { x: 10, y: 10 });
if (typeof r.x !== 'number' || typeof r.y !== 'number' || typeof r.hp !== 'number' || typeof r.scanRange !== 'number') {
  throw new Error('Robot missing required fields');
}
console.log('Entities verification passed!');
