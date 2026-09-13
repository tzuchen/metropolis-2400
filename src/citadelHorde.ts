import { createRobot } from './entities';
import type { Player, Position, Robot, RobotType, CitadelAirdrop } from './types';

export type HordeMessage = (text: string, type: 'info' | 'warning' | 'danger' | 'success') => void;

const HORDE_POSITIONS: Position[] = [
  { x: 19, y: 7 }, { x: 19, y: 21 }, { x: 25, y: 6 }, { x: 25, y: 22 },
  { x: 31, y: 7 }, { x: 31, y: 21 }, { x: 18, y: 14 }, { x: 32, y: 13 },
];
const HORDE_TYPES: RobotType[] = ['HUNTER_KILLER', 'SHOCK_ENFORCER', 'SCOUT_DRONE'];
const AIRDROP_DURATION_MS = 1500;
const MIN_PLAYER_DISTANCE = 6;

let internalPendingDrops: CitadelAirdrop[] = [];

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

function isSafeSpawnPos(x: number, y: number, player: Player, robots: Robot[]): boolean {
  if (isPositionOccupied(x, y, player, robots)) return false;
  const dist = Math.hypot(x - player.x, y - player.y);
  return dist >= MIN_PLAYER_DISTANCE;
}

function getSafeSpawnPos(basePos: Position, player: Player, robots: Robot[]): Position | null {
  if (isSafeSpawnPos(basePos.x, basePos.y, player, robots)) {
    return basePos;
  }
  const offsets = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
  ];
  for (const { dx, dy } of offsets) {
    const nx = basePos.x + dx;
    const ny = basePos.y + dy;
    if (isSafeSpawnPos(nx, ny, player, robots)) {
      return { x: nx, y: ny };
    }
  }
  return null;
}

function processLandedDrops(
  robots: Robot[],
  player: Player,
  pendingDrops: CitadelAirdrop[],
  currentTime: number
): void {
  const remaining: CitadelAirdrop[] = [];
  for (const drop of pendingDrops) {
    if (currentTime - drop.startTimestamp >= drop.duration) {
      const pos = getSafeSpawnPos({ x: drop.x, y: drop.y }, player, robots);
      if (pos) {
        const robot = createRobot(drop.robotType, pos, [pos]);
        prepareRobot(robot, player);
        robots.push(robot);
      } else {
        remaining.push(drop);
      }
    } else {
      remaining.push(drop);
    }
  }
  pendingDrops.length = 0;
  pendingDrops.push(...remaining);
}

export function triggerCitadelHorde(
  robots: Robot[],
  player: Player,
  addMessage: HordeMessage,
  pendingDrops: CitadelAirdrop[] = internalPendingDrops
): void {
  const count = 8 + Math.floor(Math.random() * 3);
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const basePos = HORDE_POSITIONS[i % HORDE_POSITIONS.length];
    const pos = getSafeSpawnPos(basePos, player, robots);
    if (!pos) continue;
    const robotType = HORDE_TYPES[i % HORDE_TYPES.length];
    pendingDrops.push({
      x: pos.x,
      y: pos.y,
      robotType,
      startTimestamp: now,
      duration: AIRDROP_DURATION_MS,
    });
  }

  addMessage('CITADEL HORDE: Reinforcements swarming the arena!', 'danger');
}

export function updateCitadelHorde(
  robots: Robot[],
  player: Player,
  turnCounter: number,
  pendingDrops: CitadelAirdrop[] = internalPendingDrops,
  currentTime: number = Date.now()
): void {
  for (const robot of robots) {
    if (!robot.isAlive) continue;
    robot.aiState = 'chase';
    robot.targetPos = { x: player.x, y: player.y };
  }

  processLandedDrops(robots, player, pendingDrops, currentTime);

  const aliveCount = robots.filter((robot) => robot.isAlive).length;
  const shouldSpawn = aliveCount < 8 || (turnCounter % 2 === 0 && aliveCount < 14);
  if (shouldSpawn) {
    const basePos = HORDE_POSITIONS[Math.floor(Math.random() * HORDE_POSITIONS.length)];
    const pos = getSafeSpawnPos(basePos, player, robots);
    if (pos) {
      const robotType = HORDE_TYPES[Math.floor(Math.random() * HORDE_TYPES.length)];
      pendingDrops.push({
        x: pos.x,
        y: pos.y,
        robotType,
        startTimestamp: currentTime,
        duration: AIRDROP_DURATION_MS,
      });
    }
  }
}
