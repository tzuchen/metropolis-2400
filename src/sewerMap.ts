import type { SectorMap } from './types';
import { TileType } from './types';
import { createRobot } from './entities';
import { soundFX } from './audio';

export function buildSubSectorZeroMap(): SectorMap {
  const width = 40;
  const height = 28;
  const tiles: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        row.push(TileType.WALL);
      } else {
        row.push(TileType.FLOOR);
      }
    }
    tiles.push(row);
  }

  // 1. 下水道毒素污水暗流溝渠 (Toxic Slime Canals)
  for (let x = 4; x < 36; x++) {
    tiles[10][x] = TileType.PARK_WATER;
    tiles[11][x] = TileType.PARK_WATER;
    tiles[18][x] = TileType.PARK_WATER;
    tiles[19][x] = TileType.PARK_WATER;
  }

  // 2. 跨河步道金屬天橋 (Maintenance Catwalk Bridges)
  for (let y = 9; y <= 12; y++) {
    tiles[y][10] = TileType.FLOOR;
    tiles[y][20] = TileType.FLOOR;
    tiles[y][30] = TileType.FLOOR;
  }
  for (let y = 17; y <= 20; y++) {
    tiles[y][12] = TileType.FLOOR;
    tiles[y][24] = TileType.FLOOR;
  }

  // 3. 散落的高壓蒸氣格柵 (Steam Grates)
  const vents = [
    { x: 8, y: 6 },
    { x: 15, y: 7 },
    { x: 22, y: 14 },
    { x: 28, y: 15 },
    { x: 16, y: 22 },
    { x: 32, y: 8 },
  ];
  vents.forEach((v) => {
    tiles[v.y][v.x] = TileType.STEAM_VENT;
  });

  // 4. 下水道內部隔牆與儲藏室 (Sewer Maintenance Vault)
  for (let y = 3; y <= 8; y++) {
    tiles[y][18] = TileType.WALL;
  }
  for (let x = 18; x <= 26; x++) {
    tiles[3][x] = TileType.WALL;
    tiles[8][x] = TileType.WALL;
  }
  tiles[6][18] = TileType.DOOR_CLOSED;
  tiles[5][23] = TileType.REBEL_CACHE;

  // 5. 東側下水道安全屏障 (Sewer Forcefield)
  tiles[22][28] = TileType.FORCEFIELD;
  tiles[23][28] = TileType.FORCEFIELD;

  // 6. 走私者暗室結構 (Smuggler's Hidden Room)
  for (let x = 30; x <= 34; x++) {
    tiles[3][x] = TileType.WALL;
    tiles[6][x] = TileType.WALL;
  }
  for (let y = 3; y <= 6; y++) {
    tiles[y][30] = TileType.WALL;
    tiles[y][34] = TileType.WALL;
  }

  // 6. 下水道排污主控終端機 (Sewer Pump Terminal)
  tiles[14][14] = TileType.TERMINAL;

  // 7. 出入口梯子 (Ladders / Elevators)
  tiles[5][3] = TileType.ELEVATOR;
  tiles[22][36] = TileType.ELEVATOR;

  return {
    id: 'sub-sector-0',
    name: 'SUB-SECTOR ZERO: ABANDONED SEWERS',
    width,
    height,
    tiles,
    terminals: {
      SEWER_PUMP_TERMINAL: {
        id: 'SEWER_PUMP_TERMINAL',
        name: 'DRAINAGE PUMP CONTROLLER',
        clearanceNeeded: 'CLEAR',
        isHacked: false,
        position: { x: 14, y: 14 },
        logs: [
          'SUB-METROPOLIS OVERFLOW RELAY 00',
          'DRAINAGE VALVE: LOCKED. HIGH PRESSURE DETECTED.',
          'TYPE "OVERRIDE" OR "BREACH" TO DEACTIVATE SEWER DRAINAGE BARRIER.',
        ],
        forcefieldToDisable: 'SEWER_FF',
      },
    },
    playerStart: { x: 4, y: 5 },
  };
}

export function setupSubSectorZero(game: any): void {
  game.map = buildSubSectorZeroMap();
  game.player.x = 4;
  game.player.y = 5;
  (game.player as any).currentSectorId = 'sub-sector-0';
  game.robots = [
    createRobot('SCOUT_DRONE' as any, { x: 10, y: 7 }, [{ x: 10, y: 7 }, { x: 15, y: 7 }]),
    createRobot('SERVICE_BOT' as any, { x: 20, y: 14 }, [{ x: 20, y: 14 }, { x: 26, y: 14 }]),
    createRobot('SCOUT_DRONE' as any, { x: 30, y: 22 }, [{ x: 30, y: 22 }, { x: 34, y: 22 }]),
  ];
  game.hazards = [
    { id: 'hazard-sewer-1', x: 15, y: 7, type: 'STEAM_VENT', hp: 1, exploded: false },
    { id: 'hazard-sewer-2', x: 22, y: 14, type: 'STEAM_VENT', hp: 1, exploded: false },
  ];
  game.groundItems = [
    {
      id: 'item-ramen-recipe',
      name: game.language === 'zh' ? '失落的拉麵鮮味秘方' : 'Synthesized Umami Recipe',
      itemType: 'KEYCARD',
      x: 23,
      y: 5,
      description: game.language === 'zh' ? 'Hiro 朝思暮想的合成鮮味高湯配方。交給 Hiro 可獲得最大生命提升！' : 'Hiro secret umami recipe.',
      iconColor: '#ffaa00',
    },
    {
      id: 'item-matrix-chip',
      name: game.language === 'zh' ? '主機矩陣覆寫晶片' : 'Tzorg Matrix Override Chip',
      itemType: 'KEYCARD',
      x: 15,
      y: 14,
      description: game.language === 'zh' ? '佐格軍用級解密晶片。能與量子約束核心合成為【量子殲滅重砲】。' : 'Military-grade decrypter chip. Component for Quantum Annihilator.',
      iconColor: '#00f0ff',
    },
    {
      id: 'item-synth-tape',
      name: game.language === 'zh' ? '失落的 1984 合成波卡帶' : '1984 Synthwave Master Tape',
      itemType: 'KEYCARD',
      x: 6,
      y: 12,
      description: game.language === 'zh' ? 'Elena 朝思暮想的磁帶，記錄著舊時代合成波音樂。' : 'Elena\'s long-lost tape, recording old-era synthwave music.',
      iconColor: '#ff4081',
    },
  ];
  game.npcs = [];
  game.visibleTiles.clear();
  game.exploredTiles.clear();
  game.updateFOV();
  soundFX.door();
  game.pushFloatingText(game.player.x, game.player.y, 'SUB-SECTOR ZERO: SEWERS', '#00ffaa');
  game.pushMessage(game.language === 'zh' ? '已潛入舊城廢棄下水道（Sub-Sector Zero）。小心毒素廢水與暗巷巡邏！' : 'TRANSIT COMPLETE: Entered Sub-Sector Zero Sewers.', 'warning');
}

export function getNextSectorId(currentMapId: string, playerX: number, playerY: number): string {
  if (currentMapId === 'sub-sector-0') {
    return playerX <= 10 ? 'sector-1' : 'sector-2';
  } else if (currentMapId === 'sector-1') {
    return (playerX <= 10 && playerY >= 20) ? 'sub-sector-0' : 'sector-2';
  } else if (currentMapId === 'sector-2') {
    if (playerX >= 30) return 'sector-citadel';
    return (playerX <= 5 && playerY >= 20) ? 'sub-sector-0' : 'sector-1';
  } else if (currentMapId === 'sector-citadel') {
    return 'sector-2';
  } else {
    return 'sector-1';
  }
}
