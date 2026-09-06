import { SecurityLevel } from './types';
import type { Position, Player, Robot, SectorMap } from './types';
import * as mapModule from './map';

export interface RobotActionResult {
  action: 'idle' | 'patrol' | 'chase' | 'attack' | 'alarm';
  newPos?: Position;
  damage?: number;
  message?: string;
  triggerAlert?: SecurityLevel;
}

const manhattanDistance = (a: Position, b: Position): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const isBelowAlert = (level: SecurityLevel): boolean => {
  if (level === SecurityLevel.CLEAR) return true;
  if (typeof level === 'number' && typeof SecurityLevel.ALERT === 'number') return level < SecurityLevel.ALERT;
  return false;
};

const isScoutDrone = (robot: Robot): boolean => {
  const r = robot as any;
  return r.type === 'SCOUT_DRONE' || r.kind === 'SCOUT_DRONE' || r.model === 'SCOUT_DRONE';
};

const isAlreadyChasing = (robot: Robot): boolean => {
  const r = robot as any;
  return r.state === 'chase' || r.mode === 'chase' || r.currentAction === 'chase' || r.action === 'chase';
};

const hasLineOfSight = (map: SectorMap, from: Position, to: Position): boolean => {
  const fn = (mapModule as any).hasLineOfSight;
  if (typeof fn === 'function') {
    try {
      const result = fn(map, from, to);
      if (typeof result === 'boolean') return result;
    } catch {}
    try {
      const result = fn(from, to, map);
      if (typeof result === 'boolean') return result;
    } catch {}
  }
  const m = map as any;
  if (typeof m.hasLineOfSight === 'function') {
    try {
      const result = m.hasLineOfSight(from, to);
      if (typeof result === 'boolean') return result;
    } catch {}
    try {
      const result = m.hasLineOfSight({ x: from.x, y: from.y }, { x: to.x, y: to.y });
      if (typeof result === 'boolean') return result;
    } catch {}
  }
  // Fallback: assume visible if both positions are within map bounds.
  return isWithinBounds(map, from) && isWithinBounds(map, to);
};

const isWithinBounds = (map: SectorMap, p: Position): boolean => {
  const m = map as any;
  if (typeof m.width === 'number' && typeof m.height === 'number') {
    return p.x >= 0 && p.y >= 0 && p.x < m.width && p.y < m.height;
  }
  if (Array.isArray(m.tiles)) {
    if (Array.isArray(m.tiles[p.y])) return p.x >= 0 && p.x < m.tiles[p.y].length;
    if (typeof m.width === 'number' && m.width > 0) {
      const index = p.y * m.width + p.x;
      return index >= 0 && index < m.tiles.length;
    }
  }
  return true;
};

const isWalkable = (map: SectorMap, x: number, y: number): boolean => {
  if (!isWithinBounds(map, { x, y })) return false;
  const m = map as any;
  const tryFn = (fn: any): boolean | null => {
    try {
      const a = fn(x, y);
      if (typeof a === 'boolean') return a;
    } catch {}
    try {
      const b = fn({ x, y });
      if (typeof b === 'boolean') return b;
    } catch {}
    return null;
  };
  const candidates = [
    (mapModule as any).isWalkable,
    (mapModule as any).isPassable,
    (mapModule as any).isTraversable,
    (mapModule as any).canMove,
    (mapModule as any).canMoveTo,
    m.isWalkable,
    m.isPassable,
    m.isTraversable,
    m.canMove,
    m.canMoveTo,
  ];
  for (const fn of candidates) {
    if (typeof fn === 'function') {
      const result = tryFn(fn);
      if (result !== null) return result;
    }
  }
  if (Array.isArray(m.tiles)) {
    let tile: any = null;
    if (Array.isArray(m.tiles[y])) {
      tile = m.tiles[y][x];
    } else if (typeof m.width === 'number' && m.width > 0) {
      tile = m.tiles[y * m.width + x];
    }
    if (tile != null) {
      if (typeof tile === 'string') {
        return !['wall', 'blocked', 'obstacle', 'solid', 'barrier'].includes(tile.toLowerCase());
      }
      if (typeof tile.isWalkable === 'boolean') return tile.isWalkable;
      if (typeof tile.walkable === 'boolean') return tile.walkable;
      if (typeof tile.passable === 'boolean') return tile.passable;
      if (typeof tile.traversable === 'boolean') return tile.traversable;
      if (typeof tile.blocked === 'boolean') return !tile.blocked;
      if (typeof tile.solid === 'boolean') return !tile.solid;
      if (typeof tile.type === 'string') {
        return !['wall', 'blocked', 'obstacle', 'solid', 'barrier'].includes(tile.type.toLowerCase());
      }
      if (typeof tile.kind === 'string') {
        return !['wall', 'blocked', 'obstacle', 'solid', 'barrier'].includes(tile.kind.toLowerCase());
      }
    }
  }
  return true;
};

const getAdjacentPositions = (x: number, y: number): Position[] => [
  { x: x + 1, y },
  { x: x - 1, y },
  { x, y: y + 1 },
  { x, y: y - 1 },
];

const findStepToward = (map: SectorMap, from: Position, target: Position): Position | null => {
  const currentDistance = manhattanDistance(from, target);
  if (currentDistance === 0) return null;

  const dx = Math.sign(target.x - from.x);
  const dy = Math.sign(target.y - from.y);
  const preferred: Position[] = [];
  if (dx !== 0) preferred.push({ x: from.x + dx, y: from.y });
  if (dy !== 0) preferred.push({ x: from.x, y: from.y + dy });

  for (const candidate of preferred) {
    if (isWalkable(map, candidate.x, candidate.y)) {
      return candidate;
    }
  }

  const adjacent = getAdjacentPositions(from.x, from.y)
    .filter((p) => isWalkable(map, p.x, p.y))
    .filter((p) => manhattanDistance(p, target) < currentDistance)
    .sort((a, b) => manhattanDistance(a, target) - manhattanDistance(b, target));

  return adjacent[0] ?? null;
};

const getPatrolTarget = (robot: Robot, path: Position[]): Position => {
  if (!path || path.length === 0) {
    return { x: robot.x, y: robot.y };
  }

  let index = -1;
  const r = robot as any;
  if (typeof r.patrolIndex === 'number' && Number.isInteger(r.patrolIndex) && r.patrolIndex >= 0 && r.patrolIndex < path.length) {
    index = r.patrolIndex;
  } else {
    index = path.findIndex((p) => p.x === robot.x && p.y === robot.y);
    if (index === -1) {
      let bestDistance = Infinity;
      path.forEach((p, i) => {
        const d = manhattanDistance(robot, p);
        if (d < bestDistance) {
          bestDistance = d;
          index = i;
        }
      });
    }
  }

  if (index < 0 || index >= path.length) {
    index = 0;
  }

  if (path[index].x === robot.x && path[index].y === robot.y) {
    index = (index + 1) % path.length;
  }

  return path[index];
};

export function updateRobotAI(robot: Robot, player: Player, map: SectorMap, globalAlert: SecurityLevel): RobotActionResult {
  if (!robot.isAlive) {
    return { action: 'idle', message: 'Robot is not alive.' };
  }

  const robotPosition: Position = { x: robot.x, y: robot.y };
  const playerPosition: Position = { x: player.x, y: player.y };
  const distance = manhattanDistance(robotPosition, playerPosition);
  const scanRange = typeof robot.scanRange === 'number' ? robot.scanRange : 0;
  const canSeePlayer = distance <= scanRange && hasLineOfSight(map, robotPosition, playerPosition);

  const isCivilian =
    player.isDisguised === true &&
    player.isWeaponDrawn === false &&
    globalAlert === SecurityLevel.CLEAR &&
    !isAlreadyChasing(robot);

  if (canSeePlayer && !isCivilian) {
    if (isScoutDrone(robot) && isBelowAlert(globalAlert)) {
      return {
        action: 'alarm',
        triggerAlert: SecurityLevel.ALERT,
        message: 'Scout drone detected a threat and raised an alert.',
      };
    }

    if (distance <= 1) {
      return {
        action: 'attack',
        damage: robot.attackPower,
        message: 'Robot attacked the player.',
      };
    }

    const step = findStepToward(map, robotPosition, playerPosition);
    if (step) {
      robot.x = step.x;
      robot.y = step.y;
      return {
        action: 'chase',
        newPos: { x: robot.x, y: robot.y },
        message: 'Robot is chasing the player.',
      };
    }

    return {
      action: 'chase',
      message: 'Robot cannot move toward the player.',
    };
  }

  const patrolPath = Array.isArray(robot.patrolPath) ? robot.patrolPath : [];
  if (patrolPath.length === 0) {
    return { action: 'idle', message: 'Robot has no patrol path.' };
  }

  const target = getPatrolTarget(robot, patrolPath);
  const step = findStepToward(map, robotPosition, target);
  if (step) {
    robot.x = step.x;
    robot.y = step.y;
    return {
      action: 'patrol',
      newPos: { x: robot.x, y: robot.y },
      message: 'Robot is patrolling.',
    };
  }

  return {
    action: 'patrol',
    message: 'Robot is waiting at patrol point.',
  };
}
