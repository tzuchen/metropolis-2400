import type { Player, Position, Robot } from './types';

export type PursuitStrategyId = 'DIRECT' | 'INTERCEPT' | 'FLANK';

export interface PursuitGoal {
  position: Position;
  /** True only for the live player position, which pathfinding must approach but never occupy. */
  isPlayerEntity: boolean;
  isSpecial: boolean;
}

export interface PursuitPlan {
  id: PursuitStrategyId;
  verb: string;
  goals: PursuitGoal[];
}

const directGoal = (player: Player): PursuitGoal => ({
  position: { x: player.x, y: player.y },
  isPlayerEntity: true,
  isSpecial: false,
});

export function getPursuitStrategyId(robot: Robot): PursuitStrategyId {
  switch (robot.robotType) {
    case 'HUNTER_KILLER':
    case 'EXTERMINATOR':
      return 'INTERCEPT';
    case 'SHOCK_ENFORCER':
      return 'FLANK';
    default:
      return 'DIRECT';
  }
}

function interceptGoal(player: Player): Position | null {
  const direction = player.facing;
  const offset = direction === 'up' ? { x: 0, y: -2 }
    : direction === 'down' ? { x: 0, y: 2 }
    : direction === 'left' ? { x: -2, y: 0 }
    : direction === 'right' ? { x: 2, y: 0 }
    : null;
  return offset ? { x: player.x + offset.x, y: player.y + offset.y } : null;
}

function flankGoal(robot: Robot, player: Player): Position {
  const dx = player.x - robot.x;
  const dy = player.y - robot.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: player.x, y: player.y + (robot.y <= player.y ? 1 : -1) };
  }
  return { x: player.x + (robot.x <= player.x ? 1 : -1), y: player.y };
}

/**
 * Returns ordered, immutable pursuit goals. AI owns path feasibility and falls back
 * through this list, keeping strategy selection independent from map and engine state.
 */
export function createPursuitPlan(robot: Robot, player: Player): PursuitPlan {
  const direct = directGoal(player);
  const id = getPursuitStrategyId(robot);
  if (id === 'INTERCEPT') {
    const goal = interceptGoal(player);
    return {
      id,
      verb: 'intercepting',
      goals: goal ? [{ position: goal, isPlayerEntity: false, isSpecial: true }, direct] : [direct],
    };
  }
  if (id === 'FLANK') {
    return {
      id,
      verb: 'flanking',
      goals: [{ position: flankGoal(robot, player), isPlayerEntity: false, isSpecial: true }, direct],
    };
  }
  return { id, verb: 'pursuing', goals: [direct] };
}
