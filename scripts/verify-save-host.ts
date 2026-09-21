/**
 * Verification test suite for SaveHost contract and resetGameSession in isolation.
 */

import { saveGameState, loadGameState, resetGameSession, SaveHost, hasSavedGame } from '../src/saveLoad';
import { Player, SectorMap, SecurityLevel } from '../src/types';

console.log('Testing SaveHost contract and resetGameSession in isolation...');

// Helper to create mock SaveHost
const createMockSaveHost = (): SaveHost & Record<string, any> => {
  const map: SectorMap = {
    id: 'sector-1',
    name: 'Sector 1: Metropolis',
    width: 40,
    height: 30,
    tiles: Array.from({ length: 30 }, () => Array(40).fill(1)),
    revealed: Array.from({ length: 30 }, () => Array(40).fill(false)),
    playerStart: { x: 5, y: 5 },
  } as any;

  const player: Player = {
    id: 'player',
    name: 'Raven',
    x: 10,
    y: 12,
    hp: 85,
    maxHp: 100,
    energy: 40,
    maxEnergy: 50,
    credits: 150,
    clearanceLevel: 'LEVEL_1' as SecurityLevel,
    isDisguised: false,
    isWeaponDrawn: true,
    currentSectorId: 'sector-1',
    inventory: [],
    equippedWeapon: null,
    level: 2,
    exp: 120,
    expToNext: 200,
    skillPoints: 1,
    checkInTimer: 75,
    checkInMaxTimer: 100,
    critChance: 5,
    isCollarDisarmed: false,
  } as any;

  const messages: any[] = [];
  const floatingTexts: any[] = [];

  return {
    language: 'en',
    player,
    map,
    robots: [],
    hazards: [],
    npcs: [],
    storyLogs: [],
    groundItems: [],
    missionObjectives: [],
    pushableBlocks: [],
    sectorGroundItems: {},
    sectorPushableBlocks: {},
    isCollarDisarmed: false,
    checkInAlertActive: false,
    securityLevel: 'CLEAR' as SecurityLevel,
    messages,
    floatingTexts,
    pushMessage(text: string, type: any) {
      this.messages.push({ text, type });
    },
    pushFloatingText(x: number, y: number, text: string, color?: string) {
      floatingTexts.push({ x, y, text, color });
    },
  };
};

// 1. Save state
const host = createMockSaveHost();
const saveOk = saveGameState(host);
if (!saveOk) {
  throw new Error('saveGameState failed for mock SaveHost');
}
console.log('✅ saveGameState succeeded with SaveHost');

// 2. Modify in-memory state
host.player.x = 99;
host.player.hp = 20;
host.player.credits = 9999;

// 3. Load state
const loadOk = loadGameState(host);
if (!loadOk) {
  throw new Error('loadGameState failed for mock SaveHost');
}
if (host.player.x !== 10 || host.player.hp !== 85 || host.player.credits !== 150) {
  throw new Error(`Restored player state mismatch: x=${host.player.x}, hp=${host.player.hp}, credits=${host.player.credits}`);
}
console.log('✅ loadGameState restored player state accurately');

// 4. Test resetGameSession
resetGameSession(host);
if (host.player.x !== 5 || host.player.y !== 5) {
  throw new Error(`resetGameSession should reset player to playerStart (5, 5), got (${host.player.x}, ${host.player.y})`);
}
if (host.isInventoryOpen !== false || host.isJournalOpen !== false) {
  throw new Error('resetGameSession should reset UI modal states to closed');
}
if (!host.messages.some((m: any) => m.text && m.text.includes('OPERATION PROMETHEUS'))) {
  throw new Error('resetGameSession should push OPERATION PROMETHEUS restart message');
}
console.log('✅ resetGameSession successfully resets player, world entities, and UI state');

console.log('🎉 All SaveHost contract verification tests passed successfully!');
