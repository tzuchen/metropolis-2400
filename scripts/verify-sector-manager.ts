/**
 * Verification test suite for SectorManager module in isolation.
 */

import { SectorManager, SectorHost } from '../src/sectorManager';
import { SectorMap, Player } from '../src/types';

console.log('Testing SectorManager in isolation...');

// Helper to create mock SectorHost
const createMockSectorHost = (): SectorHost => {
  const map: SectorMap = {
    id: 'sector-1',
    name: 'Sector 1: Metropolis',
    width: 40,
    height: 30,
    tiles: Array.from({ length: 30 }, () => Array(40).fill(1)),
    revealed: Array.from({ length: 30 }, () => Array(40).fill(false)),
  } as any;

  const player: Player = {
    id: 'player',
    name: 'Operative',
    x: 10,
    y: 10,
    hp: 100,
    maxHp: 100,
    energy: 50,
    maxEnergy: 50,
    currentSectorId: 'sector-1',
    inventory: [],
  } as any;

  const messages: any[] = [];
  const floatingTexts: any[] = [];

  return {
    map,
    player,
    securityLevel: 'CLEAR',
    checkInAlertActive: false,
    laserBeams: [],
    citadelAirdrops: [],
    isCitadelHordeActive: false,
    sectorGroundItems: {},
    sectorPushableBlocks: {},
    groundItems: [],
    pushableBlocks: [],
    robots: [],
    hazards: [],
    npcs: [],
    visibleTiles: new Set<string>(),
    exploredTiles: new Set<string>(),
    updateFOV() {},
    updateMusicIntensity() {},
    pushFloatingText(x, y, text, color) {
      floatingTexts.push({ x, y, text, color });
    },
    pushMessage(text, type) {
      messages.push({ text, type });
    },
  };
};

// 1. Initial State
const host = createMockSectorHost();
if (host.map.id !== 'sector-1') {
  throw new Error('Expected initial map to be sector-1');
}

// 2. Switch to Sub-Sector 0
SectorManager.switchSector(host, 'sub-sector-0');
if (host.map.id !== 'sub-sector-0') {
  throw new Error(`Expected map id sub-sector-0, got ${host.map.id}`);
}
if (host.player.x !== 4 || host.player.y !== 5) {
  throw new Error(`Expected player pos (4, 5) upon entering sub-sector-0, got (${host.player.x}, ${host.player.y})`);
}
console.log('✅ SectorManager switched to sub-sector-0 successfully');

// 3. Switch from Sub-Sector 0 to Sector 2
SectorManager.switchSector(host, 'sector-2');
if (host.map.id !== 'sector-2' || host.player.currentSectorId !== 'sector-2') {
  throw new Error(`Expected map id sector-2, got ${host.map.id}`);
}
if (host.player.x !== 3 || host.player.y !== 25) {
  throw new Error(`Expected player pos (3, 25) entering sector-2 from sub-sector-0, got (${host.player.x}, ${host.player.y})`);
}
if (host.robots.length === 0 || host.npcs.length === 0) {
  throw new Error('Expected robots and npcs to be populated in sector-2');
}
console.log('✅ SectorManager switched to sector-2 with correct robots and NPCs');

// 4. Place a unique ground item in Sector 2, then switch away to Sector 1 and back
host.groundItems.push({
  id: 'test-custom-item',
  name: 'Custom Datapad',
  x: 5,
  y: 5,
  category: 'quest',
} as any);

SectorManager.switchSector(host, 'sector-1');
if (host.map.id !== 'sector-1') {
  throw new Error(`Expected map id sector-1, got ${host.map.id}`);
}
// Ground items in sector-1 should not contain custom item
if (host.groundItems.some((it) => it.id === 'test-custom-item')) {
  throw new Error('Sector 1 should not contain custom item from sector 2');
}

// Switch back to Sector 2: ground item should be rehydrated
SectorManager.switchSector(host, 'sector-2');
if (!host.groundItems.some((it) => it.id === 'test-custom-item')) {
  throw new Error('Custom ground item was not preserved/rehydrated in sector-2');
}
console.log('✅ SectorManager groundItems preservation and rehydration verified');

// 5. Test applyRevealedPushableBlocks
const mockBlock = {
  id: 'block-test',
  x: 2,
  y: 2,
  revealed: true,
  secretDoor: { x: 2, y: 3, revealedTile: 4 },
} as any;
const mockMap: SectorMap = {
  id: 'test-map',
  width: 5,
  height: 5,
  tiles: Array.from({ length: 5 }, () => Array(5).fill(1)),
} as any;

SectorManager.applyRevealedPushableBlocks(mockMap, [mockBlock]);
if (mockMap.tiles[3][2] !== 4) {
  throw new Error(`Expected secret door tile to be 4, got ${mockMap.tiles[3][2]}`);
}
console.log('✅ SectorManager.applyRevealedPushableBlocks correctly reveals hidden door tile');

console.log('🎉 All SectorManager isolation tests passed successfully!');
