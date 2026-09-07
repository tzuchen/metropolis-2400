import type { Robot, Position } from './types';

export function createBossExterminator(pos: Position = { x: 32, y: 18 }): Robot {
  return {
    id: 'boss-exterminator-prime',
    name: 'EXTERMINATOR-PRIME',
    x: pos.x,
    y: pos.y,
    hp: 250,
    maxHp: 250,
    isAlive: true,
    robotType: 'EXTERMINATOR',
    aiState: 'patrol',
    patrolPath: [
      { x: 30, y: 18 },
      { x: 35, y: 18 },
      { x: 35, y: 22 },
      { x: 30, y: 22 },
    ],
    currentPatrolIndex: 0,
    targetPos: null,
    alertCooldown: 0,
    attackPower: 22,
    scanRange: 9,
    stunnedTurns: 0,
  };
}

export function isBossRobot(robot: Robot): boolean {
  return robot?.id === 'boss-exterminator-prime' || robot?.robotType === 'EXTERMINATOR';
}
