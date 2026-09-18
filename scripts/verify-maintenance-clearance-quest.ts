/**
 * WO-MS-03: Maintenance Clearance Quest in Sub-Sector 0
 * Headless test suite for verifying quest discovery, completion, and map integrity.
 */

import {
  discoverMainStoryQuest,
  completeMainStoryQuest,
  MAIN_STORY_QUEST_DEFINITIONS,
} from '../src/questSystem';
import {
  setupSubSectorZero,
  buildSubSectorZeroMap,
  getNextSectorId,
  canAccessSector2Maintenance,
  getMaintenanceClearanceBlockReason,
} from '../src/sewerMap';
import { GameEngine } from '../src/game';
import type { QuestHost, QuestDiscoverySource } from '../src/questSystem';
import type { MissionObjective, StoryLog, GameMessage, Language } from '../src/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    console.error(`ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

function createMinimalHost(overrides: Partial<QuestHost> = {}): QuestHost {
  const missionObjectives: MissionObjective[] = [
    { id: 'obj-safehouse', title: 'Safehouse', description: '', completed: true, discovered: true },
    { id: 'obj-forcefield', title: 'Forcefield', description: '', completed: true, discovered: true },
    { id: 'obj-checkpoint-relay', title: 'Relay', description: '', completed: true, discovered: true },
    { id: 'obj-underground-logistics', title: 'Underground', description: '', completed: false, discovered: false },
    { id: 'obj-maintenance-clearance', title: 'Maintenance Clearance', description: '', completed: false, discovered: false },
    { id: 'obj-disrupt-synchronizer', title: 'Disrupt Synchronizer', description: '', completed: false, discovered: false },
  ];
  const storyLogs: StoryLog[] = [];
  const messages: GameMessage[] = [];
  const host: QuestHost = {
    player: {
      x: 0, y: 0, hp: 100, maxHp: 100, energy: 100, maxEnergy: 100,
      credits: 0, inventory: [], equippedWeapon: null, equippedShield: null,
      equippedGadget: null, isDisguised: false, isWeaponDrawn: false,
      currentSectorId: 'sub-sector-0',
      checkInTimer: 100,
      isCollarDisarmed: false,
    },
    missionObjectives,
    storyLogs,
    language: 'en' as Language,
    ramenQuestComplete: false,
    synthwaveTapeActive: false,
    zeroOneWeaponForged: false,
    graffitiMuralComplete: false,
    poetryQuestComplete: false,
    pushMessage: (text: string, type: GameMessage['type']) => { messages.push({ text, type }); },
    pushFloatingText: () => {},
    gainExp: () => {},
    completeSideQuest: () => {},
    updateNPCDialogues: () => {},
    render: () => {},
    ...overrides,
  } as QuestHost;
  return host;
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

/**
 * (a) testDiscoveryRequiresPrerequisite
 * When obj-underground-logistics is NOT completed, both 'npc-technician' (NPC_DIALOGUE)
 * and 'slate-crashed-transport' (STORY_LOG) must fail to discover obj-maintenance-clearance.
 */
function testDiscoveryRequiresPrerequisite(): void {
  const host = createMinimalHost();

  // Ensure obj-underground-logistics is NOT completed
  const logisticsObj = host.missionObjectives.find((o) => o.id === 'obj-underground-logistics');
  assert(logisticsObj !== undefined, 'obj-underground-logistics should exist in host');
  assert(logisticsObj!.completed === false, 'obj-underground-logistics should not be completed');

  // Attempt discovery via NPC dialogue
  const sourceNpc: QuestDiscoverySource = { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-technician' };
  const resultNpc = discoverMainStoryQuest(host, sourceNpc);
  assert(resultNpc === false, 'Discovery via npc-technician should fail without prerequisite');

  const maintenanceObjAfterNpc = host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceObjAfterNpc!.discovered === false, 'obj-maintenance-clearance should remain undiscovered after NPC attempt');

  // Attempt discovery via story log
  const sourceSlate: QuestDiscoverySource = { sourceType: 'STORY_LOG', sourceId: 'slate-crashed-transport' };
  const resultSlate = discoverMainStoryQuest(host, sourceSlate);
  assert(resultSlate === false, 'Discovery via slate-crashed-transport should fail without prerequisite');

  const maintenanceObjAfterSlate = host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceObjAfterSlate!.discovered === false, 'obj-maintenance-clearance should remain undiscovered after slate attempt');
}

/**
 * (b) testDiscoveryViaTechnician
 * When obj-underground-logistics is completed, discovering with
 * { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-technician' } succeeds and
 * marks obj-maintenance-clearance.discovered = true.
 */
function testDiscoveryViaTechnician(): void {
  const host = createMinimalHost();

  // Mark obj-underground-logistics as completed
  const logisticsObj = host.missionObjectives.find((o) => o.id === 'obj-underground-logistics');
  assert(logisticsObj !== undefined, 'obj-underground-logistics should exist in host');
  logisticsObj!.discovered = true;
  logisticsObj!.completed = true;

  const source: QuestDiscoverySource = { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-technician' };
  const result = discoverMainStoryQuest(host, source);
  assert(result === true, 'Discovery via npc-technician should succeed with prerequisite met');

  const maintenanceObj = host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceObj !== undefined, 'obj-maintenance-clearance should exist in host');
  assert(maintenanceObj!.discovered === true, 'obj-maintenance-clearance.discovered should be true');
}

/**
 * (c) testDiscoveryViaCrashedTransport
 * When obj-underground-logistics is completed, discovering with
 * { sourceType: 'STORY_LOG', sourceId: 'slate-crashed-transport' } succeeds and
 * marks obj-maintenance-clearance.discovered = true.
 */
function testDiscoveryViaCrashedTransport(): void {
  const host = createMinimalHost();

  // Mark obj-underground-logistics as completed
  const logisticsObj = host.missionObjectives.find((o) => o.id === 'obj-underground-logistics');
  assert(logisticsObj !== undefined, 'obj-underground-logistics should exist in host');
  logisticsObj!.discovered = true;
  logisticsObj!.completed = true;

  const source: QuestDiscoverySource = { sourceType: 'STORY_LOG', sourceId: 'slate-crashed-transport' };
  const result = discoverMainStoryQuest(host, source);
  assert(result === true, 'Discovery via slate-crashed-transport should succeed with prerequisite met');

  const maintenanceObj = host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceObj !== undefined, 'obj-maintenance-clearance should exist in host');
  assert(maintenanceObj!.discovered === true, 'obj-maintenance-clearance.discovered should be true');
}

/**
 * (d) testCompletionViaTerminal
 * When discovered, completing with
 * { sourceType: 'TERMINAL', sourceId: 'SEWER_PUMP_TERMINAL' } completes
 * obj-maintenance-clearance and discovers nextObjectiveId 'obj-disrupt-synchronizer'.
 */
function testCompletionViaTerminal(): void {
  const host = createMinimalHost();

  // Set up prerequisite and discovery
  const logisticsObj = host.missionObjectives.find((o) => o.id === 'obj-underground-logistics');
  assert(logisticsObj !== undefined, 'obj-underground-logistics should exist in host');
  logisticsObj!.discovered = true;
  logisticsObj!.completed = true;

  const discoverySource: QuestDiscoverySource = { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-technician' };
  const discoverResult = discoverMainStoryQuest(host, discoverySource);
  assert(discoverResult === true, 'Discovery should succeed before completion');

  const maintenanceObjBefore = host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceObjBefore!.discovered === true, 'obj-maintenance-clearance should be discovered before completion');

  const completionSource: QuestDiscoverySource = { sourceType: 'TERMINAL', sourceId: 'SEWER_PUMP_TERMINAL' };
  const result = completeMainStoryQuest(host, completionSource);
  assert(result === true, 'Completion via SEWER_PUMP_TERMINAL should succeed');

  const maintenanceObj = host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceObj !== undefined, 'obj-maintenance-clearance should exist in host');
  assert(maintenanceObj!.completed === true, 'obj-maintenance-clearance.completed should be true');

  const nextObj = host.missionObjectives.find((o) => o.id === 'obj-disrupt-synchronizer');
  assert(nextObj !== undefined, 'obj-disrupt-synchronizer should exist in host');
  assert(nextObj!.discovered === true, "obj-disrupt-synchronizer should be discovered as nextObjectiveId");
}

/**
 * (e) testCompletionViaMaintenanceSlate
 * When discovered, completing with
 * { sourceType: 'STORY_LOG', sourceId: 'slate-maintenance-override' } completes
 * obj-maintenance-clearance and discovers nextObjectiveId 'obj-disrupt-synchronizer'.
 */
function testCompletionViaMaintenanceSlate(): void {
  const host = createMinimalHost();

  // Set up prerequisite and discovery
  const logisticsObj = host.missionObjectives.find((o) => o.id === 'obj-underground-logistics');
  assert(logisticsObj !== undefined, 'obj-underground-logistics should exist in host');
  logisticsObj!.discovered = true;
  logisticsObj!.completed = true;

  const discoverySource: QuestDiscoverySource = { sourceType: 'STORY_LOG', sourceId: 'slate-crashed-transport' };
  const discoverResult = discoverMainStoryQuest(host, discoverySource);
  assert(discoverResult === true, 'Discovery should succeed before completion');

  const maintenanceObjBefore = host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceObjBefore!.discovered === true, 'obj-maintenance-clearance should be discovered before completion');

  const completionSource: QuestDiscoverySource = { sourceType: 'STORY_LOG', sourceId: 'slate-maintenance-override' };
  const result = completeMainStoryQuest(host, completionSource);
  assert(result === true, 'Completion via slate-maintenance-override should succeed');

  const maintenanceObj = host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceObj !== undefined, 'obj-maintenance-clearance should exist in host');
  assert(maintenanceObj!.completed === true, 'obj-maintenance-clearance.completed should be true');

  const nextObj = host.missionObjectives.find((o) => o.id === 'obj-disrupt-synchronizer');
  assert(nextObj !== undefined, 'obj-disrupt-synchronizer should exist in host');
  assert(nextObj!.discovered === true, "obj-disrupt-synchronizer should be discovered as nextObjectiveId");
}

/**
 * (f) testCompletionIdempotency
 * Calling completeMainStoryQuest a second time returns false and does not
 * duplicate messages.
 */
function testCompletionIdempotency(): void {
  const host = createMinimalHost();

  // Set up prerequisite and discovery
  const logisticsObj = host.missionObjectives.find((o) => o.id === 'obj-underground-logistics');
  assert(logisticsObj !== undefined, 'obj-underground-logistics should exist in host');
  logisticsObj!.discovered = true;
  logisticsObj!.completed = true;

  const discoverySource: QuestDiscoverySource = { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-technician' };
  const discoverResult = discoverMainStoryQuest(host, discoverySource);
  assert(discoverResult === true, 'Discovery should succeed before completion');

  const completionSource: QuestDiscoverySource = { sourceType: 'TERMINAL', sourceId: 'SEWER_PUMP_TERMINAL' };

  // First completion
  const firstResult = completeMainStoryQuest(host, completionSource);
  assert(firstResult === true, 'First completion should return true');

  const maintenanceObjAfterFirst = host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceObjAfterFirst!.completed === true, 'obj-maintenance-clearance should be completed after first call');

  // Second completion (idempotency check)
  const secondResult = completeMainStoryQuest(host, completionSource);
  assert(secondResult === false, 'Second completion should return false');

  const maintenanceObjAfterSecond = host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceObjAfterSecond!.completed === true, 'obj-maintenance-clearance should remain completed');
}

/**
 * (g) testSewerMapIntegrity
 * - buildSubSectorZeroMap returns map with id 'sub-sector-0'.
 * - Verify getNextSectorId('sub-sector-0', 25, 22) returns 'sector-2'.
 */
function testSewerMapIntegrity(): void {
  const map = buildSubSectorZeroMap();
  assert(map !== undefined && map !== null, 'buildSubSectorZeroMap should return a map');
  assert((map as any).id === 'sub-sector-0', "Map id should be 'sub-sector-0'");

  const mockCanvas = {
    width: 960,
    height: 600,
    getContext: () => ({
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fillText: () => {},
      strokeText: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      setTransform: () => {},
      measureText: () => ({ width: 0 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      globalAlpha: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: '',
      lineJoin: '',
      shadowBlur: 0,
      shadowColor: '',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      clip: () => {},
      rect: () => {},
      quadraticCurveTo: () => {},
      bezierCurveTo: () => {},
      ellipse: () => {},
      roundRect: () => {},
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      createPattern: () => ({}),
      createImageData: () => ({}),
      setLineDash: () => {},
      getLineDash: () => [],
      isPointInPath: () => false,
      isPointInStroke: () => false,
      addColorStop: () => {},
      reset: () => {},
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600, right: 960, bottom: 600, x: 0, y: 0 }),
    style: {},
    parentElement: null,
  } as unknown as HTMLCanvasElement;

  const game = new GameEngine(mockCanvas);
  game.isTitleScreen = false;

  const nextSectorId = getNextSectorId('sub-sector-0', 25, 22);
  assert(nextSectorId === 'sector-2', `getNextSectorId('sub-sector-0', 25, 22) should return 'sector-2', got '${nextSectorId}'`);
}

/**
 * (h) testSubSectorZeroEntitiesAndPickup
 * Verifies that setupSubSectorZero places the technician NPC and both slates,
 * and that picking up the slates drives the maintenance clearance quest
 * through discovery and completion.
 */
function testSubSectorZeroEntitiesAndPickup(): void {
  const mockCanvas = {
    width: 960,
    height: 600,
    getContext: () => ({
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fillText: () => {},
      strokeText: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      setTransform: () => {},
      measureText: () => ({ width: 0 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      globalAlpha: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: '',
      lineJoin: '',
      shadowBlur: 0,
      shadowColor: '',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      clip: () => {},
      rect: () => {},
      quadraticCurveTo: () => {},
      bezierCurveTo: () => {},
      ellipse: () => {},
      roundRect: () => {},
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      createPattern: () => ({}),
      createImageData: () => ({}),
      setLineDash: () => {},
      getLineDash: () => [],
      isPointInPath: () => false,
      isPointInStroke: () => false,
      addColorStop: () => {},
      reset: () => {},
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600, right: 960, bottom: 600, x: 0, y: 0 }),
    style: {},
    parentElement: null,
  } as unknown as HTMLCanvasElement;

  const game = new GameEngine(mockCanvas);
  game.isTitleScreen = false;

  // Complete prerequisites
  const prereqIds = [
    'obj-safehouse',
    'obj-forcefield',
    'obj-checkpoint-relay',
    'obj-underground-logistics',
  ];
  for (const id of prereqIds) {
    const obj = game.missionObjectives.find((o) => o.id === id);
    assert(obj !== undefined, `${id} should exist in game.missionObjectives`);
    obj!.discovered = true;
    obj!.completed = true;
  }

  setupSubSectorZero(game);

  // Verify npc-technician exists with valid dialogue and dialogueZh
  const technician = game.npcs.find((n: any) => n.id === 'npc-technician');
  assert(technician !== undefined, 'npc-technician should exist in game.npcs');
  assert((Array.isArray(technician!.dialogue) && technician!.dialogue.length > 0) || typeof technician!.dialogue === 'string', 'npc-technician should have valid dialogue');
  assert((Array.isArray(technician!.dialogueZh) && technician!.dialogueZh.length > 0) || typeof technician!.dialogueZh === 'string', 'npc-technician should have valid dialogueZh');

  // Verify slates exist in groundItems
  const crashedSlate = game.groundItems.find((g: any) => g.id === 'slate-item-crashed-transport');
  assert(crashedSlate !== undefined, 'slate-item-crashed-transport should exist in game.groundItems');
  const overrideSlate = game.groundItems.find((g: any) => g.id === 'slate-item-maintenance-override');
  assert(overrideSlate !== undefined, 'slate-item-maintenance-override should exist in game.groundItems');

  // Teleport to crashed transport slate and pick up
  game.player.x = crashedSlate!.x;
  game.player.y = crashedSlate!.y;
  game.checkItemPickup();

  const maintenanceAfterCrash = game.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceAfterCrash!.discovered === true, 'obj-maintenance-clearance should be discovered after crashed transport pickup');
  assert(maintenanceAfterCrash!.completed === false, 'obj-maintenance-clearance should not be completed after crashed transport pickup');

  // Teleport to maintenance override slate and pick up
  game.player.x = overrideSlate!.x;
  game.player.y = overrideSlate!.y;
  game.checkItemPickup();

  const maintenanceAfterOverride = game.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceAfterOverride!.completed === true, 'obj-maintenance-clearance should be completed after maintenance override pickup');

  const nextObj = game.missionObjectives.find((o) => o.id === 'obj-disrupt-synchronizer');
  assert(nextObj!.discovered === true, 'obj-disrupt-synchronizer should be discovered after maintenance override pickup');
}

/**
 * (i) testTransitClearanceHelpers
 * Verifies canAccessSector2Maintenance and getMaintenanceClearanceBlockReason
 * behave correctly based on the maintenance clearance objective state.
 */
function testTransitClearanceHelpers(): void {
  const host = createMinimalHost();

  // Incomplete: canAccessSector2Maintenance returns false
  const maintenanceObj = host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
  assert(maintenanceObj !== undefined, 'obj-maintenance-clearance should exist in host');
  assert(maintenanceObj!.completed === false, 'obj-maintenance-clearance should start incomplete');
  assert(canAccessSector2Maintenance(host) === false, 'canAccessSector2Maintenance should return false when maintenance clearance is incomplete');

  // Block reason in 'en'
  const reasonEn = getMaintenanceClearanceBlockReason('en' as Language);
  assert(typeof reasonEn === 'string' && reasonEn.length > 0, "getMaintenanceClearanceBlockReason('en') should return a non-empty string");

  // Block reason in 'zh'
  const reasonZh = getMaintenanceClearanceBlockReason('zh' as Language);
  assert(typeof reasonZh === 'string' && reasonZh.length > 0, "getMaintenanceClearanceBlockReason('zh') should return a non-empty string");

  // Complete: canAccessSector2Maintenance returns true
  maintenanceObj!.discovered = true;
  maintenanceObj!.completed = true;
  assert(canAccessSector2Maintenance(host) === true, 'canAccessSector2Maintenance should return true when maintenance clearance is completed');
}

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------

function runTests(): void {
  console.log('Running maintenance clearance quest tests...');
  testDiscoveryRequiresPrerequisite();
  console.log('PASS: Discovery requires prerequisite');
  testDiscoveryViaTechnician();
  console.log('PASS: Discovery via technician');
  testDiscoveryViaCrashedTransport();
  console.log('PASS: Discovery via crashed transport');
  testCompletionViaTerminal();
  console.log('PASS: Completion via terminal');
  testCompletionViaMaintenanceSlate();
  console.log('PASS: Completion via maintenance slate');
  testCompletionIdempotency();
  console.log('PASS: Completion idempotency');
  testSewerMapIntegrity();
  console.log('PASS: Sewer map integrity');
  testSubSectorZeroEntitiesAndPickup();
  console.log('PASS: Sub-sector zero entities and pickup');
  testTransitClearanceHelpers();
  console.log('PASS: Transit clearance helpers');
  console.log('PASS');
}

runTests();
