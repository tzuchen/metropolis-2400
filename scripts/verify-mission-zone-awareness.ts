import { resolveZoneLocation } from '../src/zoneRegistry';
import { GameEngine } from '../src/game';
import { executeDetentionRelocation } from '../src/defeatCutscene';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

function createMockCanvas(width = 960, height = 600) {
  return {
    width,
    height,
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      resetTransform: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: () => ({ width: 10 }),
      arc: () => {},
      fill: () => {},
      closePath: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
    }),
    parentElement: { style: {} },
  };
}

console.log('=== Verifying Mission-Driven & Spatial Zone Awareness ===\n');

// 1. Zone Registry tests
console.log('1. Testing resolveZoneLocation across sectors...');
const cellZone = resolveZoneLocation('sector-1', 35, 5);
assert(cellZone.zone_id === 'detention_cell', 'Sector 1 (35, 5) resolves to detention_cell');
assert(cellZone.is_restricted === true, 'detention_cell is marked as restricted');
assert(cellZone.name_zh.length > 0 && cellZone.name_en.length > 0, 'detention_cell has bilingual names');

const guardZone = resolveZoneLocation('sector-1', 32, 6);
assert(guardZone.zone_id === 'detention_guard_post', 'Sector 1 (32, 6) resolves to detention_guard_post');
assert(guardZone.is_restricted === true, 'detention_guard_post is marked as restricted');

const safehouseZone = resolveZoneLocation('sector-1', 4, 4);
assert(safehouseZone.zone_id === 'rebel_safehouse', 'Sector 1 (4, 4) resolves to rebel_safehouse');
assert(safehouseZone.is_restricted === false, 'rebel_safehouse is not restricted');

const parkZone = resolveZoneLocation('sector-1', 20, 11);
assert(parkZone.zone_id === 'cyber_park', 'Sector 1 (20, 11) resolves to cyber_park');

const relayAnnexZone = resolveZoneLocation('sector-1', 29, 6);
assert(relayAnnexZone.zone_id === 'checkpoint_relay_annex', 'Sector 1 (29, 6) resolves to checkpoint_relay_annex');
assert(relayAnnexZone.is_restricted === true, 'checkpoint_relay_annex is restricted');

const pumpZone = resolveZoneLocation('sub-sector-0', 14, 14);
assert(pumpZone.zone_id === 'sludge_pump_station', 'Sub-Sector 0 (14, 14) resolves to sludge_pump_station');

const syncZone = resolveZoneLocation('sector-2', 25, 5);
assert(syncZone.zone_id === 'synchronizer_chamber', 'Sector 2 (25, 5) resolves to synchronizer_chamber');

const coreZone = resolveZoneLocation('citadel', 35, 15);
assert(coreZone.zone_id === 'overmind_core', 'Citadel (35, 15) resolves to overmind_core');

// 2. GameEngine Perception tests
console.log('\n2. Testing AIPerceptionSnapshot current_location and mission priority...');
const canvas = createMockCanvas();
const game = new GameEngine(canvas as any);
const snapInitial = game.getAIPerceptionSnapshot();
assert(Boolean(snapInitial.current_location), 'AIPerceptionSnapshot contains current_location');
assert(snapInitial.current_location.zone_id === 'rebel_safehouse', 'Initial player location in safehouse');

// 3. Detention event lifecycle
console.log('\n3. Testing Detention Event and Objective insertion...');
const initialCheckInMax = game.player.checkInMaxTimer || 100;
executeDetentionRelocation(game, false);

assert(game.player.x === 35 && game.player.y === 5, 'Player relocated to detention cell (35, 5)');
assert(game.player.checkInTimer === initialCheckInMax, 'Player collar checkInTimer reset to max timer');

const snapDetained = game.getAIPerceptionSnapshot();
assert(snapDetained.current_location.zone_id === 'detention_cell', 'Perception recognizes current_location as detention_cell');
assert(snapDetained.current_location.is_restricted === true, 'Perception recognizes restricted detention zone');

const topMission = snapDetained.active_missions[0];
assert(Boolean(topMission), 'Active missions list is not empty');
assert(topMission.id === 'obj-detention-escape', 'obj-detention-escape is prioritized at top of active missions');
assert(topMission.priority === 'CRITICAL', 'obj-detention-escape has priority CRITICAL');
assert(topMission.completed === false, 'obj-detention-escape is not completed');

// 4. Confiscated locker recovery lifecycle
console.log('\n4. Testing Evidence Locker recovery and objective completion...');
game.recoverConfiscatedGear();

const escapeMission = game.missionObjectives.find((o) => o.id === 'obj-detention-escape');
assert(Boolean(escapeMission && escapeMission.completed === true), 'obj-detention-escape marked as completed');

const snapRecovered = game.getAIPerceptionSnapshot();
const snapEscapeMission = snapRecovered.active_missions.find((o) => o.id === 'obj-detention-escape');
assert(Boolean(snapEscapeMission && snapEscapeMission.completed === true), 'Snapshot reflects completed escape mission');

// 5. Re-detention (Second Capture) test
console.log('\n5. Testing Second Detention Capture (Mission Reset & Re-prioritization)...');
executeDetentionRelocation(game, false);
const secondDetentionObj = game.missionObjectives.find((o) => o.id === 'obj-detention-escape');
assert(Boolean(secondDetentionObj && secondDetentionObj.completed === false), 'Second detention resets completed to false');
assert(secondDetentionObj?.priority === 'CRITICAL', 'Second detention maintains CRITICAL priority');
assert(game.missionObjectives[0].id === 'obj-detention-escape', 'Second detention moves escape objective back to top');

game.recoverConfiscatedGear();
assert(secondDetentionObj?.completed === true, 'Second recovery completes objective again');

console.log('\n🎉 ALL MISSION-DRIVEN & ZONE AWARENESS TESTS PASSED PERFECTLY!\n');
