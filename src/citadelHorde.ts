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

export function triggerCitadelHorde(robots: Robot[], player: Player, addMessage: HordeMessage): void {
  const count = 8 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const pos = HORDE_POSITIONS[i % HORDE_POSITIONS.length];
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
  const pos = HORDE_POSITIONS[Math.floor(Math.random() * HORDE_POSITIONS.length)];
  const robot = createRobot(HORDE_TYPES[Math.floor(Math.random() * HORDE_TYPES.length)], pos, [pos]);
  prepareRobot(robot, player);
  robots.push(robot);
}
