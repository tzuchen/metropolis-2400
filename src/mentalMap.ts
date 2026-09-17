// src/mentalMap.ts
// Agent Mental Map (特工心智地圖系統)
// Provides subjective spatial memory, coordinate rulers, frontier exploration detection,
// and A* route planning tailored specifically for LLM agent decision-making.

import type { GameEngine } from './game';
import { getTile, getTileProperties, isWalkable, isInBounds } from './map';
import { TileType } from './types';
import { checkPlayerMovementCollision } from './aiPerception';

export interface MentalMapTile {
  x: number;
  y: number;
  tile: TileType;
  char: string;
  name: string;
  walkable: boolean;
  walked: boolean;
  inFov: boolean;
  lastSeenTurn?: number;
}

export interface FrontierPoint {
  id: string;
  x: number;
  y: number;
  distance: number;
  manhattan: number;
  direction: string;
  hint: string;
  adjacentExploredPos: { x: number; y: number };
}

export interface RecalledPOI {
  id: string;
  type: 'TERMINAL' | 'NPC' | 'DOOR' | 'ITEM' | 'BLOCK' | 'HAZARD';
  name: string;
  x: number;
  y: number;
  distance: number;
  cardinal_direction: string;
  state?: any;
  desc?: string;
}

export interface RoutePlan {
  target: { name: string; x: number; y: number };
  found: boolean;
  total_steps: number;
  action_sequence: string[];
  next_action: string | null;
  waypoints: Array<{ x: number; y: number; action: string; desc?: string }>;
}

export interface MentalMapSnapshot {
  agent_pos: { global_x: number; global_y: number };
  sector: { id: string; name: string; width: number; height: number };
  bounding_box: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
    width: number;
    height: number;
  };
  stats: {
    explored_tiles_count: number;
    walked_tiles_count: number;
    total_map_size: number;
    exploration_percent: number;
    frontiers_count: number;
  };
  ascii_grid: string[];
  ascii_legend: Record<string, string>;
  frontiers: FrontierPoint[];
  recalled_pois: {
    terminals: RecalledPOI[];
    npcs: RecalledPOI[];
    doors: RecalledPOI[];
    items: RecalledPOI[];
    blocks: RecalledPOI[];
  };
}

export const MENTAL_MAP_LEGEND: Record<string, string> = {
  '@': '特工當前絕對位置 (Agent Current Position)',
  '·': '特工走過之足跡 (Walked Footprint)',
  '.': '已探索可行走走道 (Explored Walkable Floor)',
  '#': '已知牆壁障礙 (Known Wall)',
  '+': '已知氣密隔離門[關閉] (Closed Door)',
  '/': '已知氣密隔離門[開啟] (Open Door)',
  '|': '已知高能防禦力場 (Forcefield)',
  'T': '已觀測之電腦終端機 (Observed Terminal)',
  'N': '已觀測之人物 NPC (Observed NPC)',
  '*': '已觀測之地表物資／數據板 (Observed Item / Slate)',
  'O': '已觀測之可推移箱／障礙物 (Pushable Crate / Block)',
  'L': '區域聯絡電梯 (Elevator)',
  '!': '未探索前沿邊界點 (Frontier Exploration Target)',
  ' ': '未探索黑霧／未知區域 (Unexplored Fog of War)',
};

/**
 * Footprints storage across turns per game instance.
 */
const footprintTracker = new WeakMap<GameEngine, Set<string>>();

export function recordAgentFootprint(game: GameEngine): void {
  let set = footprintTracker.get(game);
  if (!set) {
    set = new Set<string>();
    footprintTracker.set(game, set);
  }
  set.add(`${game.player.x},${game.player.y}`);
}

export function getAgentFootprints(game: GameEngine): Set<string> {
  let set = footprintTracker.get(game);
  if (!set) {
    set = new Set<string>();
    footprintTracker.set(game, set);
  }
  // Always include current position
  set.add(`${game.player.x},${game.player.y}`);
  return set;
}

/**
 * Calculates 8-direction cardinal direction string.
 */
export function calculateCardinal(dx: number, dy: number): string {
  if (dx === 0 && dy === 0) return 'HERE';
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle >= -22.5 && angle < 22.5) return 'E';
  if (angle >= 22.5 && angle < 67.5) return 'SE';
  if (angle >= 67.5 && angle < 112.5) return 'S';
  if (angle >= 112.5 && angle < 157.5) return 'SW';
  if (angle >= 157.5 || angle < -157.5) return 'W';
  if (angle >= -157.5 && angle < -112.5) return 'NW';
  if (angle >= -112.5 && angle < -67.5) return 'N';
  if (angle >= -67.5 && angle < -22.5) return 'NE';
  return 'HERE';
}

/**
 * Detects exploration frontiers:
 * Explored walkable tiles that have at least one cardinal neighbor in unexplored fog-of-war.
 */
export function detectFrontiers(game: GameEngine): FrontierPoint[] {
  const map = game.map;
  const px = game.player.x;
  const py = game.player.y;
  const explored = game.exploredTiles || new Set<string>();
  const frontierCandidates: Array<{ x: number; y: number; adjacentExplored: { x: number; y: number } }> = [];

  const cardinalDirs = [
    { dx: 0, dy: -1, dirName: 'N' },
    { dx: 0, dy: 1, dirName: 'S' },
    { dx: 1, dy: 0, dirName: 'E' },
    { dx: -1, dy: 0, dirName: 'W' },
  ];

  for (const key of explored) {
    const parts = key.split(',');
    if (parts.length !== 2) continue;
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);
    if (isNaN(x) || isNaN(y)) continue;

    // Check if (x, y) is walkable
    const tile = getTile(map, { x, y });
    const props = getTileProperties(tile);
    if (!props.walkable && tile !== TileType.DOOR_CLOSED && tile !== TileType.DOOR_OPEN) {
      continue;
    }

    // Look at its 4 cardinal neighbors
    for (const { dx, dy } of cardinalDirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
      const nKey = `${nx},${ny}`;
      if (!explored.has(nKey)) {
        // The unexplored neighbor is candidate frontier
        const nTile = getTile(map, { x: nx, y: ny });
        const nProps = getTileProperties(nTile);
        // Only if the neighbor tile could theoretically be walkable or a door
        if (nProps.walkable || nTile === TileType.DOOR_CLOSED || nTile === TileType.DOOR_OPEN || nTile === TileType.FLOOR) {
          frontierCandidates.push({ x: nx, y: ny, adjacentExplored: { x, y } });
        }
      }
    }
  }

  // Deduplicate and cluster candidates
  const uniqueMap = new Map<string, { x: number; y: number; adjacentExplored: { x: number; y: number } }>();
  for (const c of frontierCandidates) {
    const k = `${c.x},${c.y}`;
    if (!uniqueMap.has(k)) {
      uniqueMap.set(k, c);
    }
  }

  // Filter into representative frontiers (cluster points within Manhattan distance 2)
  const clusters: Array<{ x: number; y: number; adjacentExplored: { x: number; y: number }; count: number }> = [];
  for (const item of uniqueMap.values()) {
    let merged = false;
    for (const cl of clusters) {
      if (Math.abs(cl.x - item.x) + Math.abs(cl.y - item.y) <= 2) {
        cl.count++;
        merged = true;
        break;
      }
    }
    if (!merged) {
      clusters.push({ x: item.x, y: item.y, adjacentExplored: item.adjacentExplored, count: 1 });
    }
  }

  // Convert clusters to FrontierPoint
  const result: FrontierPoint[] = clusters.map((cl, idx) => {
    const dx = cl.x - px;
    const dy = cl.y - py;
    const manhattan = Math.abs(dx) + Math.abs(dy);
    const distance = Math.round(Math.hypot(dx, dy) * 10) / 10;
    const direction = calculateCardinal(dx, dy);

    let hint = `${direction}方未探索區域`;
    if (direction === 'N') hint = '北方未知通道或房間';
    else if (direction === 'S') hint = '南方未知走道';
    else if (direction === 'E') hint = '東方延伸通道';
    else if (direction === 'W') hint = '西方隱密區域';
    else if (direction === 'NE') hint = '東北未知防區';
    else if (direction === 'NW') hint = '西北深處';
    else if (direction === 'SE') hint = '東南未知走廊';
    else if (direction === 'SW') hint = '西南邊界';

    return {
      id: `frontier_${idx + 1}`,
      x: cl.x,
      y: cl.y,
      distance,
      manhattan,
      direction,
      hint,
      adjacentExploredPos: cl.adjacentExplored,
    };
  });

  // Sort by distance ascending (closest first)
  result.sort((a, b) => a.distance - b.distance);
  return result;
}

/**
 * Collects all POIs (terminals, npcs, doors, items, blocks) that have been observed by the agent.
 */
export function recallObservedPOIs(game: GameEngine): MentalMapSnapshot['recalled_pois'] {
  const map = game.map;
  const px = game.player.x;
  const py = game.player.y;
  const explored = game.exploredTiles || new Set<string>();
  const visible = game.visibleTiles || new Set<string>();

  const terminals: RecalledPOI[] = [];
  const npcs: RecalledPOI[] = [];
  const doors: RecalledPOI[] = [];
  const items: RecalledPOI[] = [];
  const blocks: RecalledPOI[] = [];

  // 1. Terminals
  if (map.terminals) {
    const termList = Array.isArray(map.terminals)
      ? map.terminals
      : Object.values(map.terminals);

    for (const t of termList) {
      const tx = t.position?.x ?? t.x;
      const ty = t.position?.y ?? t.y;
      if (tx !== undefined && ty !== undefined && explored.has(`${tx},${ty}`)) {
        const dx = tx - px;
        const dy = ty - py;
        terminals.push({
          id: t.id || 'terminal',
          type: 'TERMINAL',
          name: t.name || t.id || 'Terminal',
          x: tx,
          y: ty,
          distance: Math.round(Math.hypot(dx, dy) * 10) / 10,
          cardinal_direction: calculateCardinal(dx, dy),
          state: { isHacked: t.isHacked, clearanceNeeded: t.clearanceNeeded },
          desc: t.name || 'Terminal Interface',
        });
      }
    }
  }

  // 2. NPCs
  if (game.npcs) {
    for (const npc of game.npcs) {
      if (explored.has(`${npc.x},${npc.y}`)) {
        const dx = npc.x - px;
        const dy = npc.y - py;
        npcs.push({
          id: npc.id,
          type: 'NPC',
          name: npc.name,
          x: npc.x,
          y: npc.y,
          distance: Math.round(Math.hypot(dx, dy) * 10) / 10,
          cardinal_direction: calculateCardinal(dx, dy),
          state: { isAlive: npc.isAlive, facing: npc.facing },
          desc: `${npc.name} (${npc.role || 'Resident'})`,
        });
      }
    }
  }

  // 3. Doors
  for (const key of explored) {
    const parts = key.split(',');
    if (parts.length !== 2) continue;
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);
    const tile = getTile(map, { x, y });
    if (tile === TileType.DOOR_CLOSED || tile === TileType.DOOR_OPEN) {
      const dx = x - px;
      const dy = y - py;
      doors.push({
        id: `door_${x}_${y}`,
        type: 'DOOR',
        name: tile === TileType.DOOR_OPEN ? '開啟之隔離門' : '關閉之隔離門',
        x,
        y,
        distance: Math.round(Math.hypot(dx, dy) * 10) / 10,
        cardinal_direction: calculateCardinal(dx, dy),
        state: { state: tile === TileType.DOOR_OPEN ? 'OPEN' : 'CLOSED' },
      });
    }
  }

  // 4. Ground items
  if (game.groundItems) {
    for (const it of game.groundItems) {
      if (explored.has(`${it.x},${it.y}`)) {
        const dx = it.x - px;
        const dy = it.y - py;
        items.push({
          id: it.id || 'ground_item',
          type: 'ITEM',
          name: it.name || 'Item',
          x: it.x,
          y: it.y,
          distance: Math.round(Math.hypot(dx, dy) * 10) / 10,
          cardinal_direction: calculateCardinal(dx, dy),
          state: { itemType: it.itemType },
          desc: it.name,
        });
      }
    }
  }

  // 5. Pushable blocks
  if (game.pushableBlocks) {
    for (const b of game.pushableBlocks) {
      if (explored.has(`${b.x},${b.y}`)) {
        const dx = b.x - px;
        const dy = b.y - py;
        blocks.push({
          id: `block_${b.x}_${b.y}`,
          type: 'BLOCK',
          name: b.name || 'Pushable Crate',
          x: b.x,
          y: b.y,
          distance: Math.round(Math.hypot(dx, dy) * 10) / 10,
          cardinal_direction: calculateCardinal(dx, dy),
          state: { blockType: b.blockType },
        });
      }
    }
  }

  // Sort each list by distance
  terminals.sort((a, b) => a.distance - b.distance);
  npcs.sort((a, b) => a.distance - b.distance);
  doors.sort((a, b) => a.distance - b.distance);
  items.sort((a, b) => a.distance - b.distance);
  blocks.sort((a, b) => a.distance - b.distance);

  return { terminals, npcs, doors, items, blocks };
}

/**
 * Generates the compact, bounded ASCII grid with top and left coordinate rulers.
 */
export function generateAsciiMentalGrid(
  game: GameEngine,
  frontiers: FrontierPoint[],
  boundingBox?: { min_x: number; max_x: number; min_y: number; max_y: number }
): string[] {
  const map = game.map;
  const px = game.player.x;
  const py = game.player.y;
  const explored = game.exploredTiles || new Set<string>();
  const footprints = getAgentFootprints(game);

  // Compute bounding box of all explored tiles if not provided
  let minX = px;
  let maxX = px;
  let minY = py;
  let maxY = py;

  if (boundingBox) {
    minX = boundingBox.min_x;
    maxX = boundingBox.max_x;
    minY = boundingBox.min_y;
    maxY = boundingBox.max_y;
  } else {
    for (const key of explored) {
      const parts = key.split(',');
      if (parts.length !== 2) continue;
      const x = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      if (!isNaN(x) && !isNaN(y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    // Also include frontier points in bounding box
    for (const f of frontiers) {
      if (f.x < minX) minX = f.x;
      if (f.x > maxX) maxX = f.x;
      if (f.y < minY) minY = f.y;
      if (f.y > maxY) maxY = f.y;
    }
    // Add 1 tile margin if within map bounds
    minX = Math.max(0, minX - 1);
    maxX = Math.min(map.width - 1, maxX + 1);
    minY = Math.max(0, minY - 1);
    maxY = Math.min(map.height - 1, maxY + 1);
  }

  const frontierSet = new Set(frontiers.map((f) => `${f.x},${f.y}`));

  // Fast entity lookup maps for explored area
  const termMap = new Map<string, string>();
  if (map.terminals) {
    const termList = Array.isArray(map.terminals) ? map.terminals : Object.values(map.terminals);
    for (const t of termList) {
      const tx = t.position?.x ?? t.x;
      const ty = t.position?.y ?? t.y;
      if (tx !== undefined && ty !== undefined) termMap.set(`${tx},${ty}`, t.name || t.id || 'T');
    }
  }

  const npcMap = new Map<string, string>();
  if (game.npcs) {
    for (const n of game.npcs) {
      if (n.isAlive !== false) npcMap.set(`${n.x},${n.y}`, n.name);
    }
  }

  const itemMap = new Map<string, string>();
  if (game.groundItems) {
    for (const it of game.groundItems) {
      itemMap.set(`${it.x},${it.y}`, it.name);
    }
  }

  const blockMap = new Map<string, string>();
  if (game.pushableBlocks) {
    for (const b of game.pushableBlocks) {
      blockMap.set(`${b.x},${b.y}`, b.name || 'Block');
    }
  }

  // Construct Coordinate Rulers (X axis tens and units)
  const lines: string[] = [];
  const width = maxX - minX + 1;
  const prefixSpace = '   '; // 3 spaces for Y ruler

  let rulerTens = prefixSpace;
  let rulerUnits = prefixSpace;
  for (let x = minX; x <= maxX; x++) {
    const tens = Math.floor(x / 10);
    rulerTens += tens > 0 ? String(tens % 10) : ' ';
    rulerUnits += String(x % 10);
  }
  lines.push(rulerTens);
  lines.push(rulerUnits);

  // Grid rows
  for (let y = minY; y <= maxY; y++) {
    const yLabel = String(y).padStart(2, '0') + ' ';
    let rowStr = yLabel;

    for (let x = minX; x <= maxX; x++) {
      const keyStr = `${x},${y}`;

      // 1. Player
      if (x === px && y === py) {
        rowStr += '@';
        continue;
      }

      // 2. Frontier Exploration Target
      if (frontierSet.has(keyStr)) {
        rowStr += '!';
        continue;
      }

      // If not explored, render fog
      if (!explored.has(keyStr)) {
        rowStr += ' ';
        continue;
      }

      // 3. Observed Entities
      if (termMap.has(keyStr)) {
        rowStr += 'T';
      } else if (npcMap.has(keyStr)) {
        rowStr += 'N';
      } else if (itemMap.has(keyStr)) {
        rowStr += '*';
      } else if (blockMap.has(keyStr)) {
        rowStr += 'O';
      } else {
        // 4. Terrain tile
        const tile = getTile(map, { x, y });
        if (tile === TileType.WALL) rowStr += '#';
        else if (tile === TileType.DOOR_CLOSED) rowStr += '+';
        else if (tile === TileType.DOOR_OPEN) rowStr += '/';
        else if (tile === TileType.FORCEFIELD) rowStr += '|';
        else if (tile === TileType.ELEVATOR) rowStr += 'L';
        else if (tile === TileType.CONVEYOR) rowStr += '>';
        else if (tile === TileType.STEAM_VENT) rowStr += '~';
        else if (tile === TileType.REBEL_CACHE) rowStr += '$';
        else {
          // Floor / Walkway: differentiate walked footprints
          if (footprints.has(keyStr)) {
            rowStr += '·';
          } else {
            rowStr += '.';
          }
        }
      }
    }
    lines.push(rowStr);
  }

  return lines;
}

/**
 * A* Pathfinding Node
 */
interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
  actionFromParent?: string;
}

/**
 * Plans a route from startPos to targetPos strictly using the agent's known mental map tiles.
 * Supports coordinates or string aliases (frontier id, terminal id, npc id).
 */
export function planMentalMapRoute(
  game: GameEngine,
  target: string | { x: number; y: number },
  startPos?: { x: number; y: number }
): RoutePlan {
  const map = game.map;
  const explored = game.exploredTiles || new Set<string>();
  const px = startPos ? startPos.x : game.player.x;
  const py = startPos ? startPos.y : game.player.y;

  let targetX: number | null = null;
  let targetY: number | null = null;
  let targetName = 'Target';

  // Resolve target
  if (typeof target === 'object' && target !== null && typeof target.x === 'number' && typeof target.y === 'number') {
    targetX = target.x;
    targetY = target.y;
    targetName = `(${target.x}, ${target.y})`;
  } else if (typeof target === 'string') {
    const query = target.trim().toUpperCase();

    // Check frontiers
    const frontiers = detectFrontiers(game);
    const matchedFrontier = frontiers.find((f) => f.id.toUpperCase() === query);
    if (matchedFrontier) {
      // Use the adjacent explored tile as the reachable destination
      targetX = matchedFrontier.adjacentExploredPos.x;
      targetY = matchedFrontier.adjacentExploredPos.y;
      targetName = `${matchedFrontier.id} (${matchedFrontier.hint})`;
    }

    // Check POIs
    if (targetX === null) {
      const pois = recallObservedPOIs(game);
      const allPOIs = [...pois.terminals, ...pois.npcs, ...pois.doors, ...pois.items, ...pois.blocks];
      const matchedPOI = allPOIs.find(
        (p) => p.id.toUpperCase() === query || p.name.toUpperCase().includes(query)
      );
      if (matchedPOI) {
        targetX = matchedPOI.x;
        targetY = matchedPOI.y;
        targetName = matchedPOI.name;
      }
    }

    // Check raw coordinate string like "14,5" or "14 5"
    if (targetX === null) {
      const match = query.match(/^(\d+)[,\s]+(\d+)$/);
      if (match) {
        targetX = parseInt(match[1], 10);
        targetY = parseInt(match[2], 10);
        targetName = `(${targetX}, ${targetY})`;
      }
    }
  }

  if (targetX === null || targetY === null) {
    return {
      target: { name: String(target), x: -1, y: -1 },
      found: false,
      total_steps: 0,
      action_sequence: [],
      next_action: null,
      waypoints: [],
    };
  }

  // If already at target
  if (px === targetX && py === targetY) {
    return {
      target: { name: targetName, x: targetX, y: targetY },
      found: true,
      total_steps: 0,
      action_sequence: [],
      next_action: null,
      waypoints: [{ x: px, y: py, action: 'ARRIVED', desc: 'Already at target' }],
    };
  }

  // A* Algorithm
  const cardinalMoves = [
    { dx: 0, dy: -1, action: 'MOVE_N' },
    { dx: 0, dy: 1, action: 'MOVE_S' },
    { dx: 1, dy: 0, action: 'MOVE_E' },
    { dx: -1, dy: 0, action: 'MOVE_W' },
  ];

  const allMoves = cardinalMoves;

  const heuristic = (x1: number, y1: number, x2: number, y2: number) => {
    // Manhattan distance
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };

  const openSet: Node[] = [];
  const closedSet = new Set<string>();
  const gScoreMap = new Map<string, number>();

  const startNode: Node = {
    x: px,
    y: py,
    g: 0,
    h: heuristic(px, py, targetX, targetY),
    f: heuristic(px, py, targetX, targetY),
    parent: null,
  };

  openSet.push(startNode);
  gScoreMap.set(`${px},${py}`, 0);

  let targetNode: Node | null = null;
  const maxIterations = 3000;
  let iterations = 0;

  while (openSet.length > 0 && iterations++ < maxIterations) {
    // Find node with lowest f
    let lowestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIdx].f) {
        lowestIdx = i;
      }
    }
    const current = openSet.splice(lowestIdx, 1)[0];
    const currentKey = `${current.x},${current.y}`;

    if (current.x === targetX && current.y === targetY) {
      targetNode = current;
      break;
    }

    closedSet.add(currentKey);

    for (const move of allMoves) {
      const nx = current.x + move.dx;
      const ny = current.y + move.dy;
      const nKey = `${nx},${ny}`;

      if (closedSet.has(nKey)) continue;
      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;

      // Mental Map Constraint: Can only navigate through tiles the agent has EXPLORED
      // (or if it's the target tile and adjacent)
      const isTarget = nx === targetX && ny === targetY;
      if (!explored.has(nKey) && !isTarget) continue;

      // Check walkability of tile
      const nTile = getTile(map, { x: nx, y: ny });
      const nProps = getTileProperties(nTile);

      // Doors: open doors and closed doors can be passed (player pushes/interacts)
      const isDoor = nTile === TileType.DOOR_CLOSED || nTile === TileType.DOOR_OPEN;
      const walkable = nProps.walkable || isDoor;

      if (!walkable && !isTarget) continue;

      const tentativeG = current.g + 1.0;
      const existingG = gScoreMap.get(nKey);

      if (existingG === undefined || tentativeG < existingG) {
        gScoreMap.set(nKey, tentativeG);
        const h = heuristic(nx, ny, targetX, targetY);
        const neighborNode: Node = {
          x: nx,
          y: ny,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
          actionFromParent: move.action,
        };

        const inOpen = openSet.find((n) => n.x === nx && n.y === ny);
        if (inOpen) {
          inOpen.g = tentativeG;
          inOpen.f = neighborNode.f;
          inOpen.parent = current;
          inOpen.actionFromParent = move.action;
        } else {
          openSet.push(neighborNode);
        }
      }
    }
  }

  if (!targetNode) {
    return {
      target: { name: targetName, x: targetX, y: targetY },
      found: false,
      total_steps: 0,
      action_sequence: [],
      next_action: null,
      waypoints: [],
    };
  }

  // Reconstruct path
  const pathNodes: Node[] = [];
  let curr: Node | null = targetNode;
  while (curr) {
    pathNodes.unshift(curr);
    curr = curr.parent;
  }

  const actionSequence: string[] = [];
  const waypoints: Array<{ x: number; y: number; action: string; desc?: string }> = [];

  for (let i = 1; i < pathNodes.length; i++) {
    const node = pathNodes[i];
    if (node.actionFromParent) {
      actionSequence.push(node.actionFromParent);
    }
    // Record waypoint for turns or key steps
    waypoints.push({
      x: node.x,
      y: node.y,
      action: node.actionFromParent || '',
      desc: i === pathNodes.length - 1 ? targetName : undefined,
    });
  }

  return {
    target: { name: targetName, x: targetX, y: targetY },
    found: true,
    total_steps: actionSequence.length,
    action_sequence: actionSequence,
    next_action: actionSequence.length > 0 ? actionSequence[0] : null,
    waypoints,
  };
}

/**
 * Creates the complete MentalMapSnapshot tailored for LLM agents.
 */
export function getMentalMapSnapshot(
  game: GameEngine,
  options?: { bounding_box?: { min_x: number; max_x: number; min_y: number; max_y: number } }
): MentalMapSnapshot {
  recordAgentFootprint(game);

  const map = game.map;
  const explored = game.exploredTiles || new Set<string>();
  const footprints = getAgentFootprints(game);
  const frontiers = detectFrontiers(game);
  const recalledPOIs = recallObservedPOIs(game);

  // Compute explored bounding box
  let minX = game.player.x;
  let maxX = game.player.x;
  let minY = game.player.y;
  let maxY = game.player.y;

  for (const key of explored) {
    const parts = key.split(',');
    if (parts.length !== 2) continue;
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);
    if (!isNaN(x) && !isNaN(y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const box = {
    min_x: minX,
    max_x: maxX,
    min_y: minY,
    max_y: maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  const asciiGrid = generateAsciiMentalGrid(game, frontiers, options?.bounding_box || box);
  const totalMapSize = map.width * map.height;
  const exploredCount = explored.size;
  const walkedCount = footprints.size;
  const explorationPercent = totalMapSize > 0 ? Math.round((exploredCount / totalMapSize) * 1000) / 10 : 0;

  return {
    agent_pos: { global_x: game.player.x, global_y: game.player.y },
    sector: {
      id: map.id || 'sector-1',
      name: map.name || 'Metropolis Sector',
      width: map.width,
      height: map.height,
    },
    bounding_box: box,
    stats: {
      explored_tiles_count: exploredCount,
      walked_tiles_count: walkedCount,
      total_map_size: totalMapSize,
      exploration_percent: explorationPercent,
      frontiers_count: frontiers.length,
    },
    ascii_grid: asciiGrid,
    ascii_legend: MENTAL_MAP_LEGEND,
    frontiers,
    recalled_pois: recalledPOIs,
  };
}
