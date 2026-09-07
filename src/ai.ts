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

const manhattanDistance = (a: Position, b: Position): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const isBelowAlert = (level: SecurityLevel): boolean => {
  if (level === SecurityLevel.CLEAR) return true;
  if (typeof level === 'number' && typeof SecurityLevel.ALERT === 'number') {
    return level < SecurityLevel.ALERT;
  }
  return false;
};

const isScoutDrone = (robot: Robot): boolean => {
  const r = robot as any;
  const t = String(r.robotType || r.type || '').toUpperCase();
  return t.includes('SCOUT') || t.includes('DRONE');
};

const isWalkableTile = (map: SectorMap, x: number, y: number): boolean => {
  const m = map as any;
  if (x < 0 || y < 0 || x >= (m.width || 40) || y >= (m.height || 30)) return false;

  let tile: any = null;
  if (typeof (mapModule as any).getTile === 'function') {
    try {
      tile = (mapModule as any).getTile(map, { x, y });
    } catch {}
  }
  if (tile == null && Array.isArray(m.tiles) && m.tiles[y]) {
    tile = m.tiles[y][x];
  }
  if (tile == null) return false;

  const tStr = String(tile?.type ?? tile).toUpperCase();
  return tStr === 'FLOOR' || tStr === '1' || tStr === 'DOOR_OPEN' || tStr === '4';
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
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (x0 !== x1 || y0 !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    if (x0 === x1 && y0 === y1) break;
    if (!isWalkableTile(map, x0, y0)) return false;
  }
  return true;
};

const findNextStep = (map: SectorMap, from: Position, target: Position): Position | null => {
  if (from.x === target.x && from.y === target.y) return null;

  if (manhattanDistance(from, target) === 1) {
    if (isWalkableTile(map, target.x, target.y)) {
      return target;
    }
  }

  const queue: Array<{ pos: Position; firstStep: Position }> = [];
  const visited = new Set<string>();
  visited.add(from.x + ',' + from.y);

  const dirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  dirs.sort((a, b) => {
    const da = manhattanDistance({ x: from.x + a.x, y: from.y + a.y }, target);
    const db = manhattanDistance({x: from.x + b.x, y: from.y + b.y }, target);
    return da - db;
  });

  for (const d of dirs) {
    const nx = from.x + d.x;
    const ny = from.y + d.y;
    if (isWalkableTile(map, nx, ny)) {
      if (nx === target.x && ny === target.y) {
        return { x: nx, y: ny };
      }
      visited.add(nx + ',' + ny);
      queue.push({ pos: { x: nx, y: ny }, firstStep: { x: nx, y: ny } });
    }
  }

  let iterations = 0;
  while (queue.length > 0 && iterations < 80) {
    iterations++;
    const current = queue.shift()!;

    for (const d of dirs) {
      const nx = current.pos.x + d.x;
      const ny = current.pos.y + d.y;
      const key = nx + ',' + ny;

      if (!visited.has(key) && isWalkableTile(map, nx, ny)) {
        if (nx === target.x && ny === target.y) {
          return current.firstStep;
        }
        visited.add(key);
        queue.push({ pos: { x: nx, y: ny }, firstStep: current.firstStep });
      }
    }
  }

  let bestStep: Position | null = null;
  let minDistance = manhattanDistance(from, target);

  for (const d of dirs) {
    const nx = from.x + d.x;
    const ny = from.y + d.y;
    if (isWalkableTile(map, nx, ny)) {
      const dist = manhattanDistance({ x: nx, y: ny }, target);
      if (dist < minDistance) {
        minDistance = dist;
        bestStep = { x: nx, y: ny };
      }
    }
  }

  return bestStep;
};

export function updateRobotAI(
  robot: Robot,
  player: Player,
  map: SectorMap,
  globalAlert: SecurityLevel
): RobotActionResult {
  if (!robot.isAlive) {
    return { action: 'idle', message: 'Robot is decommissioned.' };
  }

  // EMP Stun check
  if ((robot.stunnedTurns ?? 0) > 0) {
    robot.stunnedTurns! -= 1;
    return {
      action: 'idle',
      message: `${robot.name} EMP circuits overloaded! (${robot.stunnedTurns} turns left)`,
    };
  }

  const robotPos: Position = { x: robot.x, y: robot.y };
  const playerPos: Position = { x: player.x, y: player.y };
  const distance = manhattanDistance(robotPos, playerPos);
  const isGlobalAlert =
    globalAlert === SecurityLevel.ALERT || globalAlert === SecurityLevel.LOCKDOWN;
  const scanRange = (Number(robot.scanRange) || 8) + (isGlobalAlert ? 3 : 0);

  const canSeePlayer = distance <= scanRange && hasLineOfSight(map, robotPos, playerPos);
  const inAlertProximity = isGlobalAlert && distance <= scanRange;

  const isCivilian =
    globalAlert === SecurityLevel.CLEAR && player.isWeaponDrawn === false;
  const isDisguisedOperative =
    player.isDisguised === true && player.isWeaponDrawn === false;

  // If the robot detects a target it should ignore, de-escalate any hostile state.
  if ((canSeePlayer || inAlertProximity) && (isCivilian || isDisguisedOperative)) {
    if (
      robot.aiState !== 'patrol' ||
      robot.targetPos != null ||
      ((robot as any).pursuitTurns ?? 0) > 0
    ) {
      robot.aiState = 'patrol';
      robot.targetPos = null;
      (robot as any).pursuitTurns = 0;
    }
  }

  const isPeacefulCivilian = isCivilian && robot.aiState !== 'chase';
  const isIgnored = isPeacefulCivilian || isDisguisedOperative;

  if ((canSeePlayer || inAlertProximity) && !isIgnored) {
    robot.targetPos = { x: player.x, y: player.y };
    robot.aiState = 'chase';
    (robot as any).pursuitTurns = 6;

    if (isScoutDrone(robot) && isBelowAlert(globalAlert) && robot.alertCooldown <= 0) {
      robot.alertCooldown = 3;
      return {
        action: 'alarm',
        triggerAlert: SecurityLevel.ALERT,
        message: 'Scout Drone detected intruder! Security network ALARM triggered!',
      };
    }

    const effectiveAttackRange = Math.max(1, robot.attackRange ?? 1);
    if (
      distance <= effectiveAttackRange &&
      (effectiveAttackRange === 1 || hasLineOfSight(map, robotPos, playerPos))
    ) {
      robot.aiState = 'attack';
      const weaponDesc =
        robot.robotType === 'HUNTER_KILLER'
          ? 'coherent laser blasters'
          : robot.robotType === 'EXTERMINATOR'
          ? 'heavy plasma annihilator cannon'
          : robot.robotType === 'SHOCK_ENFORCER'
          ? 'high-voltage stun baton'
          : 'energy dart';
      return {
        action: 'attack',
        damage: robot.attackPower || 15,
        message: `${robot.name} attacks operative with ${weaponDesc}!`,
      };
    }

    const nextStep = findNextStep(map, robotPos, playerPos);
    if (nextStep) {
      robot.x = nextStep.x;
      robot.y = nextStep.y;
      return {
        action: 'chase',
        newPos: { x: robot.x, y: robot.y },
        message: robot.name + ' is pursuing target.',
      };
    }

    return {
      action: 'chase',
      message: robot.name + ' path blocked during pursuit.',
    };
  }

  // Pursuit persistence: keep chasing the last known position for a few turns
  // after losing sight of the player before falling back to investigate/patrol.
  if (!canSeePlayer && (robot as any).pursuitTurns > 0 && robot.targetPos) {
    (robot as any).pursuitTurns -= 1;
    robot.aiState = 'chase';
    const step = findNextStep(map, robotPos, robot.targetPos);
    if (step) {
      robot.x = step.x;
      robot.y = step.y;
      return {
        action: 'chase',
        newPos: { x: robot.x, y: robot.y },
        message: robot.name + ' pursuing target (lost sight).',
      };
    }
    return {
      action: 'chase',
      message: robot.name + ' searching for lost target.',
    };
  }

  if (robot.aiState === 'chase' && robot.targetPos) {
    robot.aiState = 'investigate';
  }

  if (robot.aiState === 'investigate' && robot.targetPos) {
    const distToTarget = manhattanDistance(robotPos, robot.targetPos);
    if (distToTarget > 0) {
      const step = findNextStep(map, robotPos, robot.targetPos);
      if (step) {
        robot.x = step.x;
        robot.y = step.y;
        return {
          action: 'chase',
          newPos: { x: robot.x, y: robot.y },
          message: robot.name + ' investigating last known position.',
        };
      }
    }

    robot.targetPos = null;
    robot.aiState = 'patrol';
  }

  const path = Array.isArray(robot.patrolPath) ? robot.patrolPath : [];
  if (path.length > 0) {
    let pIndex = typeof robot.currentPatrolIndex === 'number' ? robot.currentPatrolIndex : 0;
    if (pIndex < 0 || pIndex >= path.length) pIndex = 0;

    let targetWaypoint = path[pIndex];

    if (robot.x === targetWaypoint.x && robot.y === targetWaypoint.y) {
      pIndex = (pIndex + 1) % path.length;
      robot.currentPatrolIndex = pIndex;
      (robot as any).patrolIndex = pIndex;
      targetWaypoint = path[pIndex];
    }

    const step = findNextStep(map, robotPos, targetWaypoint);
    if (step) {
      robot.x = step.x;
      robot.y = step.y;
      robot.aiState = 'patrol';

      if (robot.x === targetWaypoint.x && robot.y === targetWaypoint.y) {
        robot.currentPatrolIndex = (pIndex + 1) % path.length;
        (robot as any).patrolIndex = robot.currentPatrolIndex;
      }

      return {
        action: 'patrol',
        newPos: { x: robot.x, y: robot.y },
        message: robot.name + ' on patrol route.',
      };
    }
  }

  robot.aiState = 'patrol';
  return {
    action: 'patrol',
    message: robot.name + ' standing watch.',
  };
}
