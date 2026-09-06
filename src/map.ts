import type { TileType, Position, SectorMap, TerminalData, SecurityLevel } from './types';

const FLOOR: TileType = 'FLOOR' as unknown as TileType;
const WALL: TileType = 'WALL' as unknown as TileType;
const DOOR_OPEN: TileType = 'DOOR_OPEN' as unknown as TileType;
const DOOR_CLOSED: TileType = 'DOOR_CLOSED' as unknown as TileType;
const FORCEFIELD: TileType = 'FORCEFIELD' as unknown as TileType;

function getMapWidth(map: SectorMap): number {
  return (map as { width?: number }).width ?? 0;
}

function getMapHeight(map: SectorMap): number {
  return (map as { height?: number }).height ?? 0;
}

function getTiles(map: SectorMap): TileType[][] | undefined {
  return (map as { tiles?: TileType[][] }).tiles;
}

export function isWalkable(tile: TileType): boolean {
  const t = tile as any;
  return t === FLOOR || t === DOOR_OPEN || t === 1 || t === 4 || t === 9 || t === 10 || t === 'ELEVATOR' || t === 'CONVEYOR';
}

export function isTransparent(tile: TileType): boolean {
  const t = tile as any;
  return t === FLOOR || t === DOOR_OPEN || t === FORCEFIELD || t === 1 || t === 4 || t === 5 || t === 9 || t === 10 || t === 11 || t === 'ELEVATOR' || t === 'CONVEYOR' || t === 'TURRET';
}

export function isInBounds(map: SectorMap, position: Position): boolean {
  const width = getMapWidth(map);
  const height = getMapHeight(map);
  return position.x >= 0 && position.y >= 0 && position.x < width && position.y < height;
}

export function getTile(map: SectorMap, position: Position): TileType {
  if (!isInBounds(map, position)) return WALL;
  const tiles = getTiles(map);
  if (!tiles) return WALL;
  const row = tiles[position.y];
  if (!row) return WALL;
  const tile = row[position.x] as TileType | undefined;
  return tile === undefined ? WALL : tile;
}

export function setTile(map: SectorMap, position: Position, tile: TileType): boolean {
  if (!isInBounds(map, position)) return false;
  const tiles = getTiles(map);
  if (!tiles) return false;
  const row = tiles[position.y];
  if (!row) return false;
  row[position.x] = tile;
  return true;
}

export function toggleDoor(map: SectorMap, position: Position): boolean {
  if (!isInBounds(map, position)) return false;
  const tile = getTile(map, position);
  if (tile === DOOR_OPEN) return setTile(map, position, DOOR_CLOSED);
  if (tile === DOOR_CLOSED) return setTile(map, position, DOOR_OPEN);
  return false;
}

export function disableForcefield(map: SectorMap, forcefieldId: string): boolean {
  const meta = (map as { forcefields?: Array<{ id: string; positions: Position[] }> }).forcefields;
  if (meta) {
    const entry = meta.find((item) => item.id === forcefieldId);
    if (entry) {
      let changed = false;
      for (const position of entry.positions) {
        if (isInBounds(map, position) && getTile(map, position) === FORCEFIELD) {
          if (setTile(map, position, FLOOR)) changed = true;
        }
      }
      if (changed) return true;
    }
  }

  const terminals = Object.values(map.terminals);
  const terminal = terminals.find((item) => (item as { forcefieldId?: string }).forcefieldId === forcefieldId);

  if (terminal) {
    const position = (terminal as { position?: Position }).position;
    if (position && isInBounds(map, position) && getTile(map, position) === FORCEFIELD) {
      return setTile(map, position, FLOOR);
    }
  }

  return false;
}

export function hasLineOfSight(map: SectorMap, from: Position, to: Position): boolean {
  if (!isInBounds(map, from) || !isInBounds(map, to)) return false;
  if (!isTransparent(getTile(map, from))) return false;
  if (from.x === to.x && from.y === to.y) return true;

  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  let first = true;

  while (true) {
    if (!first) {
      if (x === x1 && y === y1) break;
      if (!isTransparent(getTile(map, { x, y }))) return false;
    }
    first = false;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return true;
}

export function calculateFOV(map: SectorMap, origin: Position, radius: number): Set<string> {
  const visible = new Set<string>();
  if (radius < 0) return visible;
  if (!isInBounds(map, origin)) return visible;
  if (!isTransparent(getTile(map, origin))) return visible;

  const width = getMapWidth(map);
  const height = getMapHeight(map);
  const r2 = radius * radius;
  const minY = Math.max(0, origin.y - radius);
  const maxY = Math.min(height - 1, origin.y + radius);
  const minX = Math.max(0, origin.x - radius);
  const maxX = Math.min(width - 1, origin.x + radius);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - origin.x;
      const dy = y - origin.y;
      if (dx * dx + dy * dy <= r2) {
        if (hasLineOfSight(map, origin, { x, y })) {
          visible.add(String(x) + ',' + String(y));
        }
      }
    }
  }

  return visible;
}

function createTiles(width: number, height: number): TileType[][] {
  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: TileType[] = [];
    for (let x = 0; x < width; x += 1) {
      row.push(FLOOR);
    }
    tiles.push(row);
  }
  return tiles;
}

function setWall(tiles: TileType[][], x: number, y: number): void {
  const row = tiles[y];
  if (!row || x < 0 || x >= row.length) return;
  row[x] = WALL;
}

function setDoor(tiles: TileType[][], x: number, y: number, open = true): void {
  const row = tiles[y];
  if (!row || x < 0 || x >= row.length) return;
  row[x] = open ? DOOR_OPEN : DOOR_CLOSED;
}

function setForcefield(tiles: TileType[][], x: number, y: number): void {
  const row = tiles[y];
  if (!row || x < 0 || x >= row.length) return;
  row[x] = FORCEFIELD;
}

export function buildSector1Map(): SectorMap {
  const width = 40;
  const height = 30;
  const tiles = createTiles(width, height);

  for (let x = 0; x < width; x += 1) {
    setWall(tiles, x, 0);
    setWall(tiles, x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    setWall(tiles, 0, y);
    setWall(tiles, width - 1, y);
  }

  for (let x = 2; x <= 10; x += 1) {
    setWall(tiles, x, 2);
    setWall(tiles, x, 8);
  }
  for (let y = 2; y <= 8; y += 1) {
    setWall(tiles, 2, y);
    setWall(tiles, 10, y);
  }
  setDoor(tiles, 10, 5, true);

  for (let y = 3; y <= 6; y += 1) setWall(tiles, 14, y);
  for (let y = 8; y <= 11; y += 1) setWall(tiles, 17, y);
  for (let y = 3; y <= 5; y += 1) setWall(tiles, 20, y);
  for (let y = 9; y <= 11; y += 1) setWall(tiles, 22, y);

  for (let x = 25; x <= 31; x += 1) {
    setWall(tiles, x, 3);
    setWall(tiles, x, 11);
  }
  for (let y = 3; y <= 11; y += 1) {
    setWall(tiles, 25, y);
    setWall(tiles, 31, y);
  }
  setDoor(tiles, 25, 7, true);
  for (let y = 4; y <= 10; y += 1) setForcefield(tiles, 27, y);
  setDoor(tiles, 29, 11, true);

  for (let x = 30; x <= 37; x += 1) {
    setWall(tiles, x, 16);
    setWall(tiles, x, 27);
  }
  for (let y = 16; y <= 27; y += 1) {
    setWall(tiles, 30, y);
    setWall(tiles, 37, y);
  }
  setDoor(tiles, 30, 22, true);

  for (let x = 34; x <= 36; x += 1) {
    setWall(tiles, x, 18);
    setWall(tiles, x, 20);
  }
  for (let y = 18; y <= 20; y += 1) {
    setWall(tiles, 34, y);
    setWall(tiles, 36, y);
  }
  setDoor(tiles, 35, 18, true);

  const checkpointForcefieldPositions: Position[] = [];
  for (let y = 4; y <= 10; y += 1) {
    checkpointForcefieldPositions.push({ x: 27, y });
  }

  const terminals = {
    TERMINAL_SAFEHOUSE_LOG: {
      id: 'TERMINAL_SAFEHOUSE_LOG',
      position: { x: 4, y: 4 },
      type: 'LOG',
      securityLevel: 'LOW' as unknown as SecurityLevel,
      log: 'Rebel safehouse log: The checkpoint forcefield can be disabled from the control terminal in the Tzorg checkpoint.',
    },
    TERMINAL_CHECKPOINT_CONTROL: {
      id: 'TERMINAL_CHECKPOINT_CONTROL',
      position: { x: 26, y: 5 },
      type: 'FORCEFIELD',
      securityLevel: 'MEDIUM' as unknown as SecurityLevel,
      forcefieldId: 'CHECKPOINT_FF',
      log: 'Checkpoint control terminal. Authorized access only. Use the rebel ID to disable the checkpoint forcefield.',
    },
    TERMINAL_DATA_HUB: {
      id: 'TERMINAL_DATA_HUB',
      position: { x: 35, y: 19 },
      type: 'DATA',
      securityLevel: 'HIGH' as unknown as SecurityLevel,
      log: 'Tzorg data hub log: Server room contains the central data terminal and sector surveillance archives.',
    },
  } as unknown as Record<string, TerminalData>;

  tiles[25][38] = 9 as any; // ELEVATOR to Sector 2

  const map = {
    id: 'sector-1',
    name: 'Metropolis 2400 - Sector 1',
    width,
    height,
    tiles,
    terminals,
    playerStart: { x: 5, y: 5 },
    elevatorPos: { x: 38, y: 25 },
    targetSectorId: 'sector-2',
    securityLevel: 'MEDIUM' as unknown as SecurityLevel,
    forcefields: [
      {
        id: 'CHECKPOINT_FF',
        positions: checkpointForcefieldPositions,
      },
    ],
  } as unknown as SectorMap;

  return map;
}

export function buildSector2Map(): SectorMap {
  const width = 40;
  const height = 30;
  const tiles = createTiles(width, height);

  // Outer boundary walls
  for (let x = 0; x < width; x++) {
    setWall(tiles, x, 0);
    setWall(tiles, x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    setWall(tiles, 0, y);
    setWall(tiles, width - 1, y);
  }

  // West Entrance Staging Bay (around Elevator)
  for (let y = 2; y <= 8; y++) {
    setWall(tiles, 6, y);
  }
  setDoor(tiles, 6, 5, true);
  tiles[5][2] = 9 as any; // ELEVATOR back to Sector 1

  // Central Assembly Hall with dual conveyor lines
  for (let x = 8; x <= 26; x++) {
    tiles[8][x] = 10 as any;  // Industrial conveyor line 1
    tiles[14][x] = 10 as any; // Industrial conveyor line 2
  }

  // Workstation Partition Walls
  for (let x = 10; x <= 18; x++) {
    setWall(tiles, x, 11);
  }
  setDoor(tiles, 14, 11, true);

  // East Corridor Guard Turrets
  tiles[20][26] = 11 as any; // TURRET 1
  tiles[24][26] = 11 as any; // TURRET 2

  // East Sub-Core Vault
  for (let x = 28; x <= 38; x++) {
    setWall(tiles, x, 17);
    setWall(tiles, x, 27);
  }
  for (let y = 17; y <= 27; y++) {
    setWall(tiles, 28, y);
    setWall(tiles, 38, y);
  }
  // Core Forcefield gate at x=28, y=22
  tiles[22][28] = FORCEFIELD;

  const coreForcefieldPositions: Position[] = [
    { x: 28, y: 22 },
  ];

  const terminals = {
    TERMINAL_FAB_SECURITY: {
      id: 'TERMINAL_FAB_SECURITY',
      position: { x: 15, y: 6 },
      type: 'FORCEFIELD',
      securityLevel: 'MEDIUM' as unknown as SecurityLevel,
      forcefieldId: 'CORE_FF',
      log: 'Fab-Plex Security: Assembly corridor monitoring. Forcefield CORE_FF control subroutine.',
    },
    TERMINAL_COOLANT_OVERRIDE: {
      id: 'TERMINAL_COOLANT_OVERRIDE',
      position: { x: 22, y: 13 },
      type: 'LOG',
      securityLevel: 'MEDIUM' as unknown as SecurityLevel,
      log: 'Cryo-Coolant Terminal: Reactor temperature nominal. Emergency vent clears automated defenses.',
    },
    TERMINAL_OVERMIND_CORE: {
      id: 'TERMINAL_OVERMIND_CORE',
      position: { x: 34, y: 22 },
      type: 'CORE',
      securityLevel: 'HIGH' as unknown as SecurityLevel,
      log: 'TZORG OVERMIND SUB-CORE: Neural broadcast central interface. Command subroutines: OVERLOAD, SUBVERSION, EVACUATION.',
    },
  } as unknown as Record<string, TerminalData>;

  return {
    id: 'sector-2',
    name: 'Metropolis 2400 - Sector 2 (Fab-Plex)',
    width,
    height,
    tiles,
    terminals,
    playerStart: { x: 3, y: 5 },
    elevatorPos: { x: 2, y: 5 },
    targetSectorId: 'sector-1',
    securityLevel: 'ALERT' as unknown as SecurityLevel,
    forcefields: [
      {
        id: 'CORE_FF',
        positions: coreForcefieldPositions,
      },
    ],
  } as unknown as SectorMap;
}

