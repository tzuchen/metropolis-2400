import type { SectorMap, TerminalData } from './types';
import { TileType, SecurityLevel } from './types';
import { createRobot } from './entities';
import { createBossExterminator } from './boss';
import { soundFX } from './audio';

export function buildCitadelMap(): SectorMap {
  const width = 40;
  const height = 28;
  const tiles: number[][] = [];

  // Initialize all tiles as FLOOR
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = TileType.FLOOR;
    }
  }

  // Outer walls
  for (let x = 0; x < width; x++) {
    tiles[0][x] = TileType.WALL;
    tiles[height - 1][x] = TileType.WALL;
  }
  for (let y = 0; y < height; y++) {
    tiles[y][0] = TileType.WALL;
    tiles[y][width - 1] = TileType.WALL;
  }

  // West antechamber (x: 2..6, y: 12..18) - already FLOOR
  // Elevator at (3, 15)
  tiles[15][3] = TileType.ELEVATOR;

  // Security gate terminal at (6, 13)
  // Terminal is placed in terminals array, tile remains FLOOR

  // Antechamber wall (x=7, y=10..20)
  for (let y = 10; y <= 20; y++) {
    tiles[y][7] = TileType.WALL;
  }
  // Security gate at (7, 15)
  tiles[15][7] = TileType.DOOR_CLOSED;

  // Central battle platform (x: 9..30, y: 5..23) - already FLOOR
  // Tactical blast columns at (15, 9), (15, 19), (26, 9), (26, 19)
  tiles[9][15] = TileType.WALL;
  tiles[19][15] = TileType.WALL;
  tiles[9][26] = TileType.WALL;
  tiles[19][26] = TileType.WALL;

  // Steam vents at (11, 7), (11, 21), (29, 7), (29, 21)
  tiles[7][11] = TileType.STEAM_VENT;
  tiles[21][11] = TileType.STEAM_VENT;
  tiles[7][29] = TileType.STEAM_VENT;
  tiles[21][29] = TileType.STEAM_VENT;

  // East forcefield gate at x=31, y=14..16
  for (let y = 14; y <= 16; y++) {
    tiles[y][31] = TileType.FORCEFIELD;
  }

  // East core temple platform (x: 32..38, y: 11..17) - already FLOOR
  // Terminal at (36, 15)
  tiles[15][36] = TileType.TERMINAL;

  const terminals: Record<string, TerminalData> = {
    TERMINAL_CITADEL_GATE: {
      id: 'TERMINAL_CITADEL_GATE',
      name: 'CITADEL SECURITY GATE',
      clearanceNeeded: SecurityLevel.CLEAR,
      isHacked: false,
      position: { x: 6, y: 13 },
      logs: [
        'CITADEL SECURITY ANTECHAMBER',
        'DEFENSE GRID ACTIVE',
        'OVERMIND CORE LOCKED BEHIND FORCEFIELD',
      ],
    },
    TERMINAL_OVERMIND_CORE: {
      id: 'TERMINAL_OVERMIND_CORE',
      name: 'TZORG CITADEL CENTRAL OVERMIND',
      clearanceNeeded: SecurityLevel.LOCKDOWN,
      isHacked: false,
      position: { x: 36, y: 15 },
      logs: [
        'TZORG OVERMIND CENTRAL CORE',
        'DIRECT NEURAL UPLINK ACTIVE',
        'COMMANDS: OVERLOAD, SUBVERSION, EVACUATION, AWAKEN',
      ],
    },
  };

  return {
    id: 'sector-citadel',
    name: 'TZORG CITADEL: APEX OVERMIND',
    width,
    height,
    tiles,
    terminals,
    playerStart: { x: 4, y: 15 },
  };
}

export function setupCitadel(game: any): void {
  game.map = buildCitadelMap();
  game.player.x = 4;
  game.player.y = 15;
  (game.player as any).currentSectorId = 'sector-citadel';

  game.robots = [
    createBossExterminator({ x: 22, y: 15 }),
    createRobot('HUNTER_KILLER' as any, { x: 20, y: 8 }, [{ x: 20, y: 8 }, { x: 26, y: 8 }]),
    createRobot('HUNTER_KILLER' as any, { x: 20, y: 20 }, [{ x: 20, y: 20 }, { x: 26, y: 20 }]),
  ];

  game.hazards = [
    { id: 'hazard-citadel-1', x: 18, y: 7, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    { id: 'hazard-citadel-2', x: 24, y: 7, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    { id: 'hazard-citadel-3', x: 18, y: 21, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    { id: 'hazard-citadel-4', x: 24, y: 21, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
  ];

  game.npcs = [];

  game.groundItems = [
    {
      id: 'item-citadel-medkit',
      name: game.language === 'zh' ? '高純度奈米急救包' : 'High-Potency Nanite Medkit',
      itemType: 'MEDKIT',
      x: 4,
      y: 13,
      effect: { type: 'HEAL', amount: 80 },
    },
    {
      id: 'item-citadel-battery',
      name: game.language === 'zh' ? '超導等離子電池' : 'Superconducting Battery',
      itemType: 'BATTERY',
      x: 4,
      y: 17,
      effect: { type: 'ENERGY', amount: 80 },
    },
  ];

  game.visibleTiles.clear();
  game.exploredTiles.clear();
  game.updateFOV();

  soundFX.door();
  game.pushFloatingText(game.player.x, game.player.y, 'TZORG CITADEL: APEX OVERMIND', '#ff0055');
  game.pushMessage(
    game.language === 'zh'
      ? '已抵達佐格都市頂層堡壘（Tzorg Citadel）！消滅終極守護者並接管中央主腦！'
      : 'TRANSIT COMPLETE: Reached Tzorg Citadel Apex!',
    'danger'
  );
}