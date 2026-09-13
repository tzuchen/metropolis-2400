import { createRobot } from './entities';
import type { Player, Position, Robot, RobotType } from './types';

export type HordeMessage = (text: string, type: 'info' | 'warning' | 'danger' | 'success') => void;

const HORDE_POSITIONS: Position[] = [
  { x: 19, y: 7 }, { x: 19, y: 21 }, { x: 25, y: 6 }, { x: 25, y: 22 },
  { x: 31, y: 7 }, { x: 31, y: 21 }, { x: 18, y: 14 }, { x: 32, y: 13 },
];
const HORDE_TYPES: RobotType[] = ['HUNTER_KILLER', 'SHOCK_ENFORCER', 'SCOUT_DRONE'];

function prepareRobot(robot: Robot, player: Player): void {
  robot.aiState = 'chase';
  robot.targetPos = { x: player.x, y: player.y };
  robot.alertCooldown = 999;
}

function isPositionOccupied(x: number, y: number, player: Player, robots: Robot[]): boolean {
  if (player.x === x && player.y === y) return true;
  for (const r of robots) {
    if (r.isAlive && r.x === x && r.y === y) return true;
  }
  return false;
}

function getSafeSpawnPos(basePos: Position, player: Player, robots: Robot[]): Position {
  if (!isPositionOccupied(basePos.x, basePos.y, player, robots)) {
    return basePos;
  }
  const offsets = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
  ];
  for (const { dx, dy } of offsets) {
    const nx = basePos.x + dx;
    const ny = basePos.y + dy;
    if (!isPositionOccupied(nx, ny, player, robots)) {
      return { x: nx, y: ny };
    }
  }
  return basePos;
}

export function triggerCitadelHorde(robots: Robot[], player: Player, addMessage: HordeMessage): void {
  const count = 8 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const basePos = HORDE_POSITIONS[i % HORDE_POSITIONS.length];
    const pos = getSafeSpawnPos(basePos, player, robots);
    const robot = createRobot(HORDE_TYPES[i % HORDE_TYPES.length], pos, [pos]);
    prepareRobot(robot, player);
    robots.push(robot);
  }
  addMessage('CITADEL HORDE: Reinforcements swarming the arena!', 'danger');
}

export function updateCitadelHorde(robots: Robot[], player: Player, turnCounter: number): void {
  for (const robot of robots) {
    if (!robot.isAlive) continue;
    robot.aiState = 'chase';
    robot.targetPos = { x: player.x, y: player.y };
  }
  const aliveCount = robots.filter((robot) => robot.isAlive).length;
  const shouldSpawn = aliveCount < 8 || (turnCounter % 2 === 0 && aliveCount < 14);
  if (!shouldSpawn) return;
  const basePos = HORDE_POSITIONS[Math.floor(Math.random() * HORDE_POSITIONS.length)];
  const pos = getSafeSpawnPos(basePos, player, robots);
  const robot = createRobot(HORDE_TYPES[Math.floor(Math.random() * HORDE_TYPES.length)], pos, [pos]);
  prepareRobot(robot, player);
  robots.push(robot);
}
