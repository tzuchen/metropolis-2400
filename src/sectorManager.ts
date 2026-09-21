/**
 * Metropolis 2400 - Sector Manager & State Hydration System
 *
 * Handles transitions between sectors (Sector 1, Sector 2, Sub-Sector 0, Citadel),
 * coordinates player spawn points, caches and rehydrates ground items and pushable blocks,
 * and initializes sector-specific entities (Robots, Hazards, NPCs).
 */

import {
  SectorMap,
  Player,
  Robot,
  RobotType,
  NPC,
  Hazard,
  GroundItem,
  PushableBlock,
  SecurityLevel,
  LaserBeam,
  GameMessage,
} from './types';
import { buildSector1Map, buildSector2Map, getTile } from './map';
import { setupSubSectorZero } from './sewerMap';
import { setupCitadel } from './citadelMap';
import { createRobot } from './entities';
import { createBossExterminator } from './boss';
import {
  createSectorRobots,
  createSectorNPCs,
  createSector2NPCs,
  createSectorItems,
  createSector2Items,
  createSectorHazards,
  createSectorPushableBlocks,
} from './worldBuilder';
import { soundFX } from './audio';

export interface SectorHost {
  map: SectorMap;
  player: Player;
  securityLevel: SecurityLevel;
  checkInAlertActive: boolean;
  laserBeams: LaserBeam[];
  citadelAirdrops: any[];
  isCitadelHordeActive: boolean;
  sectorGroundItems: Record<string, GroundItem[]>;
  sectorPushableBlocks: Record<string, PushableBlock[]>;
  groundItems: GroundItem[];
  pushableBlocks: PushableBlock[];
  robots: Robot[];
  hazards: Hazard[];
  npcs: NPC[];
  visibleTiles: Set<string>;
  exploredTiles: Set<string>;
  updateFOV(): void;
  updateMusicIntensity(): void;
  pushFloatingText(x: number, y: number, text: string, color?: string): void;
  pushMessage(text: string, type: GameMessage['type']): void;
}

export class SectorManager {
  /**
   * Applies revealed secret door tiles to the map grid for any revealed pushable blocks.
   */
  static applyRevealedPushableBlocks(map: SectorMap, pushableBlocks: PushableBlock[]): void {
    for (const block of pushableBlocks) {
      if (block.revealed && block.secretDoor && block.secretDoor.revealedTile !== undefined) {
        const tile = getTile(map, { x: block.secretDoor.x, y: block.secretDoor.y });
        if (tile !== undefined && tile !== block.secretDoor.revealedTile) {
          const mapData = map.tiles || map.grid;
          if (Array.isArray(mapData)) {
            const row = mapData[block.secretDoor.y];
            if (Array.isArray(row)) {
              row[block.secretDoor.x] = block.secretDoor.revealedTile;
            }
          }
        }
      }
    }
  }

  /**
   * Performs full transition from current sector to targetSectorId.
   */
  static switchSector(host: SectorHost, targetSectorId: string): void {
    const prevMapId = host.map?.id;
    host.securityLevel = host.checkInAlertActive
      ? ('ALERT' as SecurityLevel)
      : ('CLEAR' as SecurityLevel);
    host.laserBeams = [];

    if (prevMapId === 'sector-citadel' && targetSectorId !== 'sector-citadel') {
      host.citadelAirdrops.length = 0;
      host.isCitadelHordeActive = false;
    }

    // Save current sector's ground items and pushable blocks before switching
    if (prevMapId) {
      host.sectorGroundItems[prevMapId] = host.groundItems;
      host.sectorPushableBlocks[prevMapId] = host.pushableBlocks;
    }

    if (targetSectorId === 'sector-citadel') {
      setupCitadel(host as any);
      if (host.sectorGroundItems['sector-citadel']) {
        host.groundItems = host.sectorGroundItems['sector-citadel'];
      }
      host.pushableBlocks =
        host.sectorPushableBlocks['sector-citadel'] ||
        createSectorPushableBlocks('sector-citadel');
      SectorManager.applyRevealedPushableBlocks(host.map, host.pushableBlocks);
      host.updateMusicIntensity();
      return;
    }

    if (targetSectorId === 'sub-sector-0') {
      setupSubSectorZero(host as any);
      if (prevMapId === 'sector-2') {
        host.player.x = 35;
        host.player.y = 22;
      } else {
        host.player.x = 4;
        host.player.y = 5;
      }
      // Restore sub-sector-0 items if previously visited
      if (host.sectorGroundItems['sub-sector-0']) {
        host.groundItems = host.sectorGroundItems['sub-sector-0'];
      }
      host.pushableBlocks =
        host.sectorPushableBlocks['sub-sector-0'] ||
        createSectorPushableBlocks('sub-sector-0');
      SectorManager.applyRevealedPushableBlocks(host.map, host.pushableBlocks);
      host.updateMusicIntensity();
      return;
    }

    if (targetSectorId === 'sector-2') {
      host.map = buildSector2Map();
      if (prevMapId === 'sub-sector-0') {
        host.player.x = 3;
        host.player.y = 25;
      } else if (prevMapId === 'sector-citadel') {
        host.player.x = 35;
        host.player.y = 22;
      } else {
        host.player.x = 3;
        host.player.y = 5;
      }
      host.player.currentSectorId = 'sector-2';
      host.robots = [
        createRobot('SCOUT_DRONE' as RobotType, { x: 12, y: 5 }, [
          { x: 12, y: 5 },
          { x: 20, y: 5 },
        ]),
        createRobot('SHOCK_ENFORCER' as RobotType, { x: 20, y: 15 }, [
          { x: 20, y: 15 },
          { x: 20, y: 22 },
        ]),
        createRobot('HUNTER_KILLER' as RobotType, { x: 30, y: 22 }, [
          { x: 30, y: 22 },
          { x: 35, y: 22 },
        ]),
        createBossExterminator({ x: 32, y: 18 }),
      ];
      host.hazards = [
        { id: 'hazard-sec2-1', x: 16, y: 8, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
        { id: 'hazard-sec2-2', x: 25, y: 14, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
      ];
      host.npcs = createSector2NPCs();
      host.groundItems = host.sectorGroundItems['sector-2'] || createSector2Items();
      host.pushableBlocks =
        host.sectorPushableBlocks['sector-2'] || createSectorPushableBlocks('sector-2');
      SectorManager.applyRevealedPushableBlocks(host.map, host.pushableBlocks);
      host.visibleTiles.clear();
      host.exploredTiles.clear();
      host.updateFOV();
      soundFX.door();
      host.pushFloatingText(host.player.x, host.player.y, 'SECTOR 2: FAB-PLEX', '#00f0ff');
      host.pushMessage(
        'TRANSIT COMPLETE: Arrived at Sector 2 (Fab-Plex). Central Overmind core located to East!',
        'warning'
      );
      host.updateMusicIntensity();
    } else if (targetSectorId === 'sector-1') {
      host.map = buildSector1Map();
      if (prevMapId === 'sub-sector-0') {
        host.player.x = 4;
        host.player.y = 21;
      } else {
        host.player.x = 37;
        host.player.y = 25;
      }
      host.player.currentSectorId = 'sector-1';
      host.robots = createSectorRobots();
      host.hazards = createSectorHazards();
      host.npcs = createSectorNPCs();
      host.groundItems = host.sectorGroundItems['sector-1'] || createSectorItems();
      host.pushableBlocks =
        host.sectorPushableBlocks['sector-1'] || createSectorPushableBlocks('sector-1');
      SectorManager.applyRevealedPushableBlocks(host.map, host.pushableBlocks);
      host.visibleTiles.clear();
      host.exploredTiles.clear();
      host.updateFOV();
      soundFX.door();
      host.pushFloatingText(host.player.x, host.player.y, 'SECTOR 1: STREETS', '#00f0ff');
      host.pushMessage('TRANSIT COMPLETE: Returned to Sector 1 Metropolis.', 'info');
      host.updateMusicIntensity();
    }
  }
}
