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

  // === FRONT SECTION: Serpentine Tactical Corridor (x: 2..17, y: 3..24) ===
  // Elevator at (3, 15)
  tiles[15][3] = TileType.ELEVATOR;

  // Player start at (4, 15) - keep as FLOOR

  // Serpentine wall structure creating winding corridors
  // Wall segment 1: horizontal wall at y=8, x=6..12
  for (let x = 6; x <= 12; x++) {
    tiles[8][x] = TileType.WALL;
  }

  // Wall segment 2: vertical wall at x=12, y=9..14
  for (let y = 9; y <= 14; y++) {
    tiles[y][12] = TileType.WALL;
  }

  // Wall segment 3: horizontal wall at y=14, x=13..16
  for (let x = 13; x <= 16; x++) {
    tiles[14][x] = TileType.WALL;
  }

  // Wall segment 4: vertical wall at x=16, y=15..20
  for (let y = 15; y <= 20; y++) {
    tiles[y][16] = TileType.WALL;
  }

  // Wall segment 5: horizontal wall at y=20, x=10..15
  for (let x = 10; x <= 15; x++) {
    tiles[20][x] = TileType.WALL;
  }

  // Wall segment 6: vertical wall at x=10, y=15..19
  for (let y = 15; y <= 19; y++) {
    tiles[y][10] = TileType.WALL;
  }

  // Wall segment 7: horizontal wall at y=10, x=6..9
  for (let x = 6; x <= 9; x++) {
    tiles[10][x] = TileType.WALL;
  }

  // Wall segment 8: vertical wall at x=6, y=11..13
  for (let y = 11; y <= 13; y++) {
    tiles[y][6] = TileType.WALL;
  }

  // Wall segment 9: horizontal wall at y=18, x=6..9
  for (let x = 6; x <= 9; x++) {
    tiles[18][x] = TileType.WALL;
  }

  // Wall segment 10: vertical wall at x=14, y=9..13
  for (let y = 9; y <= 13; y++) {
    tiles[y][14] = TileType.WALL;
  }

  // Wall segment 11: horizontal wall at y=12, x=15..17
  for (let x = 15; x <= 17; x++) {
    tiles[12][x] = TileType.WALL;
  }

  // Wall segment 12: vertical wall at x=17, y=13..16
  for (let y = 13; y <= 16; y++) {
    tiles[y][17] = TileType.WALL;
  }

  // Wall segment 13: horizontal wall at y=16, x=15..17
  for (let x = 15; x <= 17; x++) {
    tiles[16][x] = TileType.WALL;
  }

  // Wall segment 14: vertical wall at x=8, y=11..17
  for (let y = 11; y <= 17; y++) {
    tiles[y][8] = TileType.WALL;
  }

  // Wall segment 15: horizontal wall at y=22, x=6..12
  for (let x = 6; x <= 12; x++) {
    tiles[22][x] = TileType.WALL;
  }

  // Wall segment 16: vertical wall at x=12, y=21..24
  for (let y = 21; y <= 24; y++) {
    tiles[y][12] = TileType.WALL;
  }

  // Wall segment 17: horizontal wall at y=6, x=8..14
  for (let x = 8; x <= 14; x++) {
    tiles[6][x] = TileType.WALL;
  }

  // Wall segment 18: vertical wall at x=14, y=7..9
  for (let y = 7; y <= 9; y++) {
    tiles[y][14] = TileType.WALL;
  }

  // Wall segment 19: horizontal wall at y=24, x=13..17
  for (let x = 13; x <= 17; x++) {
    tiles[24][x] = TileType.WALL;
  }

  // Wall segment 20: vertical wall at x=17, y=21..23
  for (let y = 21; y <= 23; y++) {
    tiles[y][17] = TileType.WALL;
  }

  // Ensure TERMINAL_CITADEL_GATE position (6, 13) is FLOOR
  tiles[13][6] = TileType.FLOOR;

  // Security gate at x=18, y=15 (connecting front corridor to rear arena)
  tiles[15][18] = TileType.DOOR_CLOSED;

  // === REAR SECTION: Citadel Apex Arena (x: 19..32, y: 4..23) ===
  // Keep mostly open floor for wide combat space

  // Tactical blast columns at arena edges
  tiles[5][22] = TileType.WALL;
  tiles[5][28] = TileType.WALL;
  tiles[22][22] = TileType.WALL;
  tiles[22][28] = TileType.WALL;

  // Steam vents at arena corners
  tiles[5][20] = TileType.STEAM_VENT;
  tiles[5][30] = TileType.STEAM_VENT;
  tiles[22][20] = TileType.STEAM_VENT;
  tiles[22][30] = TileType.STEAM_VENT;

  // Additional steam vents along arena edges
  tiles[14][19] = TileType.STEAM_VENT;
  tiles[14][32] = TileType.STEAM_VENT;

  // East forcefield gate at x=33, y=14..16
  for (let y = 14; y <= 16; y++) {
    tiles[y][33] = TileType.FORCEFIELD;
  }

  // East core temple platform (x: 34..38, y: 11..17) - already FLOOR
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

  // Robots: Boss in arena center, patrol bots in front corridor
  game.robots = [
    createBossExterminator({ x: 25, y: 14 }),
    createRobot('HUNTER_KILLER' as any, { x: 7, y: 7 }, [{ x: 7, y: 7 }, { x: 11, y: 7 }]),
    createRobot('HUNTER_KILLER' as any, { x: 7, y: 21 }, [{ x: 7, y: 21 }, { x: 11, y: 21 }]),
    createRobot('SECURITY_BOT' as any, { x: 13, y: 11 }, [{ x: 13, y: 11 }, { x: 15, y: 11 }]),
    createRobot('SECURITY_BOT' as any, { x: 13, y: 19 }, [{ x: 13, y: 19 }, { x: 15, y: 19 }]),
  ];

  // Hazards: Plasma canisters in arena, steam vents already placed in map
  game.hazards = [
    { id: 'hazard-citadel-1', x: 21, y: 6, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    { id: 'hazard-citadel-2', x: 29, y: 6, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    { id: 'hazard-citadel-3', x: 21, y: 21, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    { id: 'hazard-citadel-4', x: 29, y: 21, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    { id: 'hazard-citadel-5', x: 25, y: 8, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    { id: 'hazard-citadel-6', x: 25, y: 20, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
  ];

  game.npcs = [];

  // Ground items in front corridor
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
    {
      id: 'item-citadel-armor',
      name: game.language === 'zh' ? '戰術護甲模組' : 'Tactical Armor Module',
      itemType: 'ARMOR',
      x: 9,
      y: 15,
      effect: { type: 'ARMOR', amount: 30 },
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
