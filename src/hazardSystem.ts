import type { Player, Robot } from './types';

export type ConveyorDirection = { dx: number; dy: number };

export interface ConveyorContext {
  player: Player;
  robots: Robot[];
  isConveyorTile(x: number, y: number): boolean;
  getDirection(x: number, y: number): ConveyorDirection;
  isWalkableAt(x: number, y: number): boolean;
  onPlayerMoved(direction: ConveyorDirection): void;
}

export interface CanisterResult {
  damagedRobots: Robot[];
  destroyedRobots: Robot[];
  playerDamaged: boolean;
}

export function processConveyors(context: ConveyorContext): void {
  const { player, robots } = context;
  if (player.isAlive && context.isConveyorTile(player.x, player.y)) {
    const direction = context.getDirection(player.x, player.y);
    const x = player.x + direction.dx;
    const y = player.y + direction.dy;
    const blocked = robots.some((robot) => robot.isAlive && robot.x === x && robot.y === y);
    if (context.isWalkableAt(x, y) && !blocked) {
      player.x = x;
      player.y = y;
      if (direction.dx === 1) player.facing = 'right';
      else if (direction.dx === -1) player.facing = 'left';
      else if (direction.dy === 1) player.facing = 'down';
      else if (direction.dy === -1) player.facing = 'up';
      context.onPlayerMoved(direction);
    }
  }
  for (const robot of robots) {
    if (!robot.isAlive || !context.isConveyorTile(robot.x, robot.y)) continue;
    const direction = context.getDirection(robot.x, robot.y);
    const x = robot.x + direction.dx;
    const y = robot.y + direction.dy;
    const playerBlocking = player.isAlive && player.x === x && player.y === y;
    const robotBlocking = robots.some((other) => other.isAlive && other !== robot && other.x === x && other.y === y);
    if (context.isWalkableAt(x, y) && !playerBlocking && !robotBlocking) { robot.x = x; robot.y = y; }
  }
}

export function detonateCanister(canister: { x: number; y: number; hp: number; exploded?: boolean }, player: Player, robots: Robot[]): CanisterResult {
  if (canister.exploded) return { damagedRobots: [], destroyedRobots: [], playerDamaged: false };
  canister.exploded = true;
  canister.hp = 0;
  const damagedRobots: Robot[] = [];
  const destroyedRobots: Robot[] = [];
  for (const robot of robots) {
    if (!robot.isAlive || Math.abs(robot.x - canister.x) + Math.abs(robot.y - canister.y) > 2) continue;
    robot.hp -= 70;
    damagedRobots.push(robot);
    if (robot.hp <= 0) { robot.isAlive = false; destroyedRobots.push(robot); }
  }
  const playerDamaged = Math.abs(player.x - canister.x) + Math.abs(player.y - canister.y) <= 2;
  if (playerDamaged) player.hp = Math.max(0, player.hp - 20);
  return { damagedRobots, destroyedRobots, playerDamaged };
}
