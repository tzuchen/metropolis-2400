/**
 * scripts/verify-citadel-main-story-keys.ts
 *
 * Deterministic verifier for the Citadel main-story key contracts:
 *   1. Dialogue and StoryLog availability (reversal-key slates exist & are readable).
 *   2. Partial-key Citadel terminal guidance naming the missing area/source.
 *   3. Complete-key guidance.
 *   4. Preservation of legacy ending commands/results.
 *
 * All assertions use real production imports — no mocks.
 */

import { createSectorStoryLogs, createSectorItems, createSector2Items } from '../src/worldBuilder';
import { setupSubSectorZero } from '../src/sewerMap';
import {
  REVERSAL_KEY_DEFINITIONS,
  MAIN_STORY_QUEST_DEFINITIONS,
  getReversalKeyStatuses,
  getAvailableReversalKeys,
  getMissingReversalKeys,
  hasAllReversalKeys,
  completeMainStoryQuest,
  discoverMainStoryQuest,
} from '../src/questSystem';
import { TerminalSession } from '../src/terminal';
import { advanceDialogue } from '../src/dialogueSystem';
import type {
  MissionObjective,
  StoryLog,
  Language,
  GameMessage,
  TerminalData,
  NPC,
  DialogueSession,
} from '../src/types';

// ─────────────────────────────────────────────────────────────────────────────
// Minimal QuestHost / DialogueHost stubs (NOT mocks — structural type-satisfiers)
// ─────────────────────────────────────────────────────────────────────────────

function buildHost(overrides?: {
  storyLogs?: StoryLog[];
  missionObjectives?: MissionObjective[];
  language?: Language;
}) {
  const messages: GameMessage[] = [];
  const host = {
    player: {
      x: 0,
      y: 0,
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      credits: 0,
      inventory: [] as any[],
      equippedWeapon: null,
      equippedShield: null,
      equippedGadget: null,
      isDisguised: false,
      isWeaponDrawn: false,
      currentSectorId: 'sector-citadel',
      level: 1,
      checkInTimer: 100,
      checkInMaxTimer: 100,
      isCollarDisarmed: false,
      hasDefeatedBoss: true,
      endgameChoice: undefined as string | undefined,
      victory: false,
      missionObjectives: undefined as MissionObjective[] | undefined,
      storyLogs: undefined as StoryLog[] | undefined,
      critChance: 0,
      graffitiBuffApplied: false,
    },
    missionObjectives: (overrides?.missionObjectives ?? []) as MissionObjective[],
    storyLogs: (overrides?.storyLogs ?? []) as StoryLog[],
    language: (overrides?.language ?? 'en') as Language,
    ramenQuestComplete: false,
    synthwaveTapeActive: false,
    zeroOneWeaponForged: false,
    graffitiMuralComplete: false,
    poetryQuestComplete: false,
    pushMessage: (text: string, type: GameMessage['type']) => {
      messages.push({ text, type });
    },
    pushFloatingText: (_x: number, _y: number, _text: string, _color: string) => {},
    gainExp: (_amount: number, _reason?: string) => {},
    completeSideQuest: (_questId: string) => {},
    updateNPCDialogues: () => {},
    render: () => {},
  };
  return { host, messages };
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertion helpers
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  const found = haystack.includes(needle);
  assert(found, `${label} — expected to include "${needle}"`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. StoryLog availability — all three reversal-key slates exist in world data
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══ 1. StoryLog Availability ═══');

// Verify the three reversal-key slates are physical Data Slate pickups in sector builders
// and that their storyLogId exactly matches REVERSAL_KEY_DEFINITIONS sourceStoryLogId.

const sector1Items = createSectorItems();
const sector2Items = createSector2Items();

// Build a minimal game object to extract Sub-Sector 0 ground items
const sewerGameStub: any = {
  language: 'en',
  map: null,
  player: { x: 4, y: 5 },
  robots: [],
  hazards: [],
  groundItems: [],
  npcs: [],
  visibleTiles: new Set<string>(),
  exploredTiles: new Set<string>(),
  updateFOV: () => {},
  pushFloatingText: () => {},
  pushMessage: () => {},
};
setupSubSectorZero(sewerGameStub);
const sewerItems: any[] = sewerGameStub.groundItems || [];

// Map: expected storyLogId → which sector builder should contain it
const expectedSlateSources: Array<{
  storyLogId: string;
  items: any[];
  label: string;
}> = [
  { storyLogId: 'slate-checkpoint-relay', items: sector1Items, label: 'Sector 1 (createSectorItems)' },
  { storyLogId: 'slate-maintenance-override', items: sewerItems, label: 'Sub-Sector 0 (setupSubSectorZero)' },
  { storyLogId: 'slate-factory-worker', items: sector2Items, label: 'Sector 2 (createSector2Items)' },
];

for (const { storyLogId, items, label } of expectedSlateSources) {
  const matchingItem = items.find(
    (it: any) => it?.itemType === 'DATA_SLATE' && it?.storyLogId === storyLogId
  );
  assert(
    matchingItem !== undefined,
    `Physical Data Slate pickup for "${storyLogId}" exists in ${label}`
  );
  if (matchingItem) {
    assert(
      matchingItem.storyLogId === storyLogId,
      `Data Slate "${matchingItem.id}" storyLogId exactly matches "${storyLogId}"`
    );
  }
}

// Cross-check: each REVERSAL_KEY_DEFINITIONS sourceStoryLogId has a matching physical pickup
for (const def of REVERSAL_KEY_DEFINITIONS) {
  const allItems = [...sector1Items, ...sector2Items, ...sewerItems];
  const matchingItem = allItems.find(
    (it: any) => it?.itemType === 'DATA_SLATE' && it?.storyLogId === def.sourceStoryLogId
  );
  assert(
    matchingItem !== undefined,
    `REVERSAL_KEY_DEFINITIONS "${def.id}" sourceStoryLogId "${def.sourceStoryLogId}" has a physical Data Slate pickup`
  );
}

const allStoryLogs = createSectorStoryLogs();
const logIds = new Set(allStoryLogs.map((l) => l.id));

for (const def of REVERSAL_KEY_DEFINITIONS) {
  assert(
    logIds.has(def.sourceStoryLogId),
    `StoryLog "${def.sourceStoryLogId}" exists in world data`
  );
}

// Verify each log has required fields
for (const def of REVERSAL_KEY_DEFINITIONS) {
  const log = allStoryLogs.find((l) => l.id === def.sourceStoryLogId);
  assert(log !== undefined, `StoryLog "${def.sourceStoryLogId}" is retrievable`);
  if (log) {
    assert(typeof log.title === 'string' && log.title.length > 0, `StoryLog "${def.sourceStoryLogId}" has a title`);
    assert(Array.isArray(log.content) && log.content.length > 0, `StoryLog "${def.sourceStoryLogId}" has content`);
    assert(log.read === false, `StoryLog "${def.sourceStoryLogId}" starts unread`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Partial-key Citadel terminal guidance — names missing area/source
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══ 2. Partial-Key Terminal Guidance ═══');

// Simulate: only Key I is available (relay log read + objective completed)
// Keys II and III are missing.

const partialHost = buildHost({
  storyLogs: [
    {
      id: 'slate-checkpoint-relay',
      title: 'Reversal Key I — Relay Transport Window',
      author: 'Checkpoint Relay Annex',
      timestamp: '2400-03-15T07:00:00Z',
      read: true,
      content: ['REVERSAL KEY I content'],
    },
    {
      id: 'slate-maintenance-override',
      title: 'Reversal Key II — Underground Maintenance Authorization',
      author: 'Sub-Sector 0 Maintenance',
      timestamp: '2400-03-15T07:30:00Z',
      read: false,
      content: ['REVERSAL KEY II content'],
    },
    {
      id: 'slate-factory-worker',
      title: 'Reversal Key III — Factory Synchronizer Intelligence',
      author: 'Anonymous Sector 2 Worker',
      timestamp: '2400-03-15T08:00:00Z',
      read: false,
      content: ['REVERSAL KEY III content'],
    },
  ],
  missionObjectives: [
    {
      id: 'obj-checkpoint-relay',
      title: 'Infiltrate Checkpoint Relay Annex',
      description: 'desc',
      completed: true,
      discovered: true,
    },
    {
      id: 'obj-maintenance-clearance',
      title: 'Maintenance Clearance',
      description: 'desc',
      completed: false,
      discovered: true,
    },
    {
      id: 'obj-disrupt-synchronizer',
      title: 'Disrupt Factory Synchronizer',
      description: 'desc',
      completed: false,
      discovered: true,
    },
  ],
});

const partialStatuses = getReversalKeyStatuses(partialHost.host as any);
assert(partialStatuses.length === 3, 'getReversalKeyStatuses returns 3 keys');
assert(
  partialStatuses.find((s) => s.keyId === 'reversal-key-relay')?.available === true,
  'Key I is available (log read + objective completed)'
);
assert(
  partialStatuses.find((s) => s.keyId === 'reversal-key-maintenance')?.available === false,
  'Key II is NOT available'
);
assert(
  partialStatuses.find((s) => s.keyId === 'reversal-key-synchronizer')?.available === false,
  'Key III is NOT available'
);

// Verify sourceStoryLogId and sourceObjectiveId are correctly set
assert(
  partialStatuses.find((s) => s.keyId === 'reversal-key-relay')?.sourceStoryLogId === 'slate-checkpoint-relay',
  'Key I sourceStoryLogId is slate-checkpoint-relay'
);
assert(
  partialStatuses.find((s) => s.keyId === 'reversal-key-maintenance')?.sourceStoryLogId === 'slate-maintenance-override',
  'Key II sourceStoryLogId is slate-maintenance-override'
);
assert(
  partialStatuses.find((s) => s.keyId === 'reversal-key-synchronizer')?.sourceStoryLogId === 'slate-factory-worker',
  'Key III sourceStoryLogId is slate-factory-worker'
);

assert(
  getAvailableReversalKeys(partialHost.host as any).length === 1,
  'getAvailableReversalKeys returns 1 for partial state'
);
assert(
  getMissingReversalKeys(partialHost.host as any).length === 2,
  'getMissingReversalKeys returns 2 for partial state'
);
assert(
  hasAllReversalKeys(partialHost.host as any) === false,
  'hasAllReversalKeys is false for partial state'
);

// Now test the terminal KEYS command output with partial state
const citadelTerminal: TerminalData = {
  id: 'CITADEL_CORE',
  name: 'Citadel Core Terminal',
  clearanceNeeded: 'LOCKDOWN',
  isHacked: false,
  logs: ['Citadel core log'],
};

const partialSession = new TerminalSession(citadelTerminal);
const partialContext = {
  hasDefeatedBoss: true,
  items: [] as string[],
  level: 1,
  decryptedSlates: ['slate-checkpoint-relay'],
};
const partialResult = partialSession.executeCommand('KEYS', partialContext as any);
const partialOutput = partialResult.output;

assertIncludes(partialOutput, 'REVERSAL KEY STATUS', 'Partial-key output has header');
assertIncludes(partialOutput, 'AVAILABLE', 'Partial-key output marks available keys');
assertIncludes(partialOutput, 'MISSING', 'Partial-key output marks missing keys');
assertIncludes(partialOutput, 'slate-maintenance-override', 'Partial-key output names missing Key II source');
assertIncludes(partialOutput, 'slate-factory-worker', 'Partial-key output names missing Key III source');
assertIncludes(partialOutput, 'obj-maintenance-clearance', 'Partial-key output names Key II objective');
assertIncludes(partialOutput, 'obj-disrupt-synchronizer', 'Partial-key output names Key III objective');
assertIncludes(partialOutput, '1/3', 'Partial-key output shows 1/3 available');
assertIncludes(partialOutput, 'Sub-Sector 0', 'Partial-key output names Key II sector location');
assertIncludes(partialOutput, 'SEWER_PUMP_TERMINAL', 'Partial-key output names Key II terminal location');
assertIncludes(partialOutput, 'Sector 2', 'Partial-key output names Key III sector location');
assertIncludes(partialOutput, 'TERMINAL_SYNCHRONIZER', 'Partial-key output names Key III terminal location');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Complete-key guidance
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══ 3. Complete-Key Guidance ═══');

const completeHost = buildHost({
  storyLogs: [
    {
      id: 'slate-checkpoint-relay',
      title: 'Reversal Key I',
      author: 'Checkpoint Relay Annex',
      timestamp: '2400-03-15T07:00:00Z',
      read: true,
      content: ['content'],
    },
    {
      id: 'slate-maintenance-override',
      title: 'Reversal Key II',
      author: 'Sub-Sector 0 Maintenance',
      timestamp: '2400-03-15T07:30:00Z',
      read: true,
      content: ['content'],
    },
    {
      id: 'slate-factory-worker',
      title: 'Reversal Key III',
      author: 'Anonymous Sector 2 Worker',
      timestamp: '2400-03-15T08:00:00Z',
      read: true,
      content: ['content'],
    },
  ],
  missionObjectives: [
    {
      id: 'obj-checkpoint-relay',
      title: 'Infiltrate Checkpoint Relay Annex',
      description: 'desc',
      completed: true,
      discovered: true,
    },
    {
      id: 'obj-maintenance-clearance',
      title: 'Maintenance Clearance',
      description: 'desc',
      completed: true,
      discovered: true,
    },
    {
      id: 'obj-disrupt-synchronizer',
      title: 'Disrupt Factory Synchronizer',
      description: 'desc',
      completed: true,
      discovered: true,
    },
  ],
});

assert(
  getAvailableReversalKeys(completeHost.host as any).length === 3,
  'getAvailableReversalKeys returns 3 for complete state'
);
assert(
  getMissingReversalKeys(completeHost.host as any).length === 0,
  'getMissingReversalKeys returns 0 for complete state'
);
assert(
  hasAllReversalKeys(completeHost.host as any) === true,
  'hasAllReversalKeys is true for complete state'
);

const completeSession = new TerminalSession({
  id: 'CITADEL_CORE',
  name: 'Citadel Core Terminal',
  clearanceNeeded: 'LOCKDOWN',
  isHacked: false,
  logs: ['Citadel core log'],
});
const completeContext = {
  hasDefeatedBoss: true,
  items: [] as string[],
  level: 1,
  decryptedSlates: ['slate-checkpoint-relay', 'slate-maintenance-override', 'slate-factory-worker'],
};
const completeResult = completeSession.executeCommand('KEYS', completeContext as any);
const completeOutput = completeResult.output;

assertIncludes(completeOutput, 'ALL REVERSAL KEYS AVAILABLE', 'Complete-key output confirms all keys available');
assertIncludes(completeOutput, 'neural lattice reversal ready', 'Complete-key output confirms reversal readiness');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Preservation of legacy ending commands/results
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══ 4. Legacy Ending Commands ═══');

const endingCommands: Array<{ cmd: string; expectedChoice: string }> = [
  { cmd: 'OVERLOAD', expectedChoice: 'OVERLOAD' },
  { cmd: 'SUBVERSION', expectedChoice: 'SUBVERSION' },
  { cmd: 'EVACUATION', expectedChoice: 'EVACUATION' },
  { cmd: 'AWAKEN', expectedChoice: 'AWAKEN' },
];

for (const { cmd, expectedChoice } of endingCommands) {
  const session = new TerminalSession({
    id: 'CITADEL_CORE',
    name: 'Citadel Core Terminal',
    clearanceNeeded: 'LOCKDOWN',
    isHacked: false,
    logs: ['Citadel core log'],
  });
  const ctx = {
    hasDefeatedBoss: true,
    items: [] as string[],
    level: 1,
    decryptedSlates: [] as string[],
  };
  const result = session.executeCommand(cmd, ctx as any);
  assert(
    result.endgameChoice === expectedChoice,
    `Command "${cmd}" returns endgameChoice "${expectedChoice}"`
  );
  assert(
    result.shouldExit === true,
    `Command "${cmd}" sets shouldExit to true`
  );
  assert(
    typeof result.output === 'string' && result.output.length > 0,
    `Command "${cmd}" produces output`
  );
}

// Verify that KEYS command does NOT interfere with ending commands
const keysThenEndingSession = new TerminalSession({
  id: 'CITADEL_CORE',
  name: 'Citadel Core Terminal',
  clearanceNeeded: 'LOCKDOWN',
  isHacked: false,
  logs: ['Citadel core log'],
});
keysThenEndingSession.executeCommand('KEYS', {
  hasDefeatedBoss: true,
  items: [] as string[],
  level: 1,
  decryptedSlates: [] as string[],
} as any);
const endingAfterKeys = keysThenEndingSession.executeCommand('AWAKEN', {
  hasDefeatedBoss: true,
  items: [] as string[],
  level: 1,
  decryptedSlates: [] as string[],
} as any);
assert(
  endingAfterKeys.endgameChoice === 'AWAKEN',
  'AWAKEN still works after KEYS command (no interference)'
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Main-story quest discovery & completion via real questSystem
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══ 5. Main-Story Quest Discovery & Completion ═══');

// Test discovery of obj-checkpoint-relay via CHECKPOINT_FF terminal
const discoveryHost = buildHost({
  missionObjectives: [
    {
      id: 'obj-safehouse',
      title: 'Safehouse',
      description: 'desc',
      completed: true,
      discovered: true,
    },
    {
      id: 'obj-forcefield',
      title: 'Forcefield',
      description: 'desc',
      completed: true,
      discovered: true,
    },
    {
      id: 'obj-checkpoint-relay',
      title: 'Checkpoint Relay',
      description: 'desc',
      completed: false,
      discovered: false,
    },
  ],
});

const discovered = discoverMainStoryQuest(discoveryHost.host as any, {
  sourceType: 'TERMINAL',
  sourceId: 'CHECKPOINT_FF',
});
assert(discovered === true, 'obj-checkpoint-relay discovered via CHECKPOINT_FF terminal');
const relayObj = discoveryHost.host.missionObjectives.find((o) => o.id === 'obj-checkpoint-relay');
assert(relayObj?.discovered === true, 'obj-checkpoint-relay marked as discovered');

// Test completion of obj-maintenance-clearance via SEWER_PUMP_TERMINAL
const completionHost = buildHost({
  missionObjectives: [
    {
      id: 'obj-underground-logistics',
      title: 'Underground Logistics',
      description: 'desc',
      completed: true,
      discovered: true,
    },
    {
      id: 'obj-maintenance-clearance',
      title: 'Maintenance Clearance',
      description: 'desc',
      completed: false,
      discovered: true,
    },
    {
      id: 'obj-disrupt-synchronizer',
      title: 'Disrupt Synchronizer',
      description: 'desc',
      completed: false,
      discovered: false,
    },
  ],
});

const completed = completeMainStoryQuest(completionHost.host as any, {
  sourceType: 'TERMINAL',
  sourceId: 'SEWER_PUMP_TERMINAL',
});
assert(completed === true, 'obj-maintenance-clearance completed via SEWER_PUMP_TERMINAL');
const maintObj = completionHost.host.missionObjectives.find((o) => o.id === 'obj-maintenance-clearance');
assert(maintObj?.completed === true, 'obj-maintenance-clearance marked as completed');
const syncObj = completionHost.host.missionObjectives.find((o) => o.id === 'obj-disrupt-synchronizer');
assert(syncObj?.discovered === true, 'obj-disrupt-synchronizer auto-discovered after maintenance clearance');

// ─────────────────────────────────────────────────────────────────────────────
// 6. Dialogue narrative clue delivery (NPC dialogue → quest discovery)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══ 6. Dialogue Narrative Clue Delivery ═══');

// Verify KEYS command uses the correct sourceStoryLogIds from REVERSAL_KEY_DEFINITIONS
// by confirming the terminal output references the exact slate IDs
const keysVerificationHost = buildHost({
  storyLogs: [
    {
      id: 'slate-checkpoint-relay',
      title: 'Citadel Transport Windows',
      author: 'Checkpoint Relay Annex',
      timestamp: '2400-03-15T02:00:00Z',
      read: true,
      content: ['content'],
    },
    {
      id: 'slate-maintenance-override',
      title: 'Maintenance Bypass Credential',
      author: 'Sub-Sector 0 Maintenance',
      timestamp: '2400-03-15T05:30:00Z',
      read: false,
      content: ['content'],
    },
    {
      id: 'slate-factory-worker',
      title: 'Factory Worker Testimony',
      author: 'Anonymous Sector 2 Worker',
      timestamp: '2400-03-15T06:00:00Z',
      read: false,
      content: ['content'],
    },
  ],
  missionObjectives: [
    {
      id: 'obj-checkpoint-relay',
      title: 'Infiltrate Checkpoint Relay Annex',
      description: 'desc',
      completed: true,
      discovered: true,
    },
    {
      id: 'obj-maintenance-clearance',
      title: 'Maintenance Clearance',
      description: 'desc',
      completed: false,
      discovered: true,
    },
    {
      id: 'obj-disrupt-synchronizer',
      title: 'Disrupt Factory Synchronizer',
      description: 'desc',
      completed: false,
      discovered: true,
    },
  ],
});

const keysVerificationSession = new TerminalSession({
  id: 'CITADEL_CORE',
  name: 'Citadel Core Terminal',
  clearanceNeeded: 'LOCKDOWN',
  isHacked: false,
  logs: ['Citadel core log'],
});
const keysVerificationContext = {
  hasDefeatedBoss: true,
  items: [] as string[],
  level: 1,
  decryptedSlates: [] as string[],
};
const keysVerificationResult = keysVerificationSession.executeCommand('KEYS', keysVerificationContext as any);
const keysVerificationOutput = keysVerificationResult.output;

// KEYS output should reference the exact sourceStoryLogId values
assertIncludes(keysVerificationOutput, 'slate-checkpoint-relay', 'KEYS output references slate-checkpoint-relay');
assertIncludes(keysVerificationOutput, 'slate-maintenance-override', 'KEYS output references slate-maintenance-override');
assertIncludes(keysVerificationOutput, 'slate-factory-worker', 'KEYS output references slate-factory-worker');

// Verify ending commands still work after KEYS on the same session
const endingAfterKeysVerification = keysVerificationSession.executeCommand('OVERLOAD', keysVerificationContext as any);
assert(
  endingAfterKeysVerification.endgameChoice === 'OVERLOAD',
  'OVERLOAD still works after KEYS command (no interference)'
);

// Verify that NPC dialogue sources in MAIN_STORY_QUEST_DEFINITIONS are valid
for (const def of MAIN_STORY_QUEST_DEFINITIONS) {
  for (const source of def.discoverySources) {
    if (source.sourceType === 'NPC_DIALOGUE') {
      assert(
        typeof source.sourceId === 'string' && source.sourceId.startsWith('npc-'),
        `NPC dialogue source "${source.sourceId}" for "${def.objectiveId}" is valid`
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. One-time first-discovery clue delivery via dialogue system
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══ 7. One-Time First-Discovery Clue Delivery ═══');

// Build a minimal NPC for npc-kira (checkpoint relay quest)
const kiraNpc: NPC = {
  id: 'npc-kira',
  name: 'Kira',
  x: 10,
  y: 10,
  hp: 100,
  maxHp: 100,
  isAlive: true,
  role: 'Rebel Contact',
  dialogue: ['Hello there.', 'The checkpoint relay annex holds the key.'],
  dialogueZh: ['你好。', '檢查哨中繼附屬區持有關鍵。'],
};

// Build a host where obj-forcefield is NOT yet discovered (Kira can discover it via dialogue)
// Prerequisites: obj-safehouse must be completed
// obj-checkpoint-relay is NOT completed, so the narrative clue will be delivered
const clueHost = buildHost({
  missionObjectives: [
    {
      id: 'obj-safehouse',
      title: 'Safehouse',
      description: 'desc',
      completed: true,
      discovered: true,
    },
    {
      id: 'obj-forcefield',
      title: 'Forcefield',
      description: 'desc',
      completed: false,
      discovered: false,
    },
    {
      id: 'obj-checkpoint-relay',
      title: 'Checkpoint Relay',
      description: 'desc',
      completed: false,
      discovered: false,
    },
  ],
});

// Set up active dialogue with Kira
const clueHostAny = clueHost.host as any;
clueHostAny.activeDialogue = { npc: kiraNpc, textIndex: 0 } as DialogueSession;
clueHostAny.checkSideQuestDiscovery = (_npcId: string) => {};

// First dialogue advance: should discover obj-forcefield and deliver Kira's narrative clue
const messagesBefore = clueHost.messages.length;
advanceDialogue(clueHostAny);
const messagesAfter = clueHost.messages.length;

assert(
  messagesAfter > messagesBefore,
  'First dialogue advance produces new messages (clue delivery)'
);

const forcefieldObjAfterFirst = clueHostAny.missionObjectives.find((o: MissionObjective) => o.id === 'obj-forcefield');
assert(
  forcefieldObjAfterFirst?.discovered === true,
  'obj-forcefield discovered after first dialogue advance'
);

// Verify the clue message was delivered (contains Kira's clue text about checkpoint relay annex)
const clueMessages = clueHost.messages.slice(messagesBefore);
const hasClue = clueMessages.some(
  (m) => m.text.includes('checkpoint relay annex') || m.text.includes('transport window')
);
assert(hasClue, 'First-discovery clue message contains narrative clue text');

// Second dialogue advance: obj-forcefield already discovered, Kira can now try obj-underground-logistics
// but obj-checkpoint-relay is not completed, so obj-underground-logistics cannot be discovered
// No new quest discovery → no clue delivered again
const messagesBeforeSecond = clueHost.messages.length;
advanceDialogue(clueHostAny);
const messagesAfterSecond = clueHost.messages.length;

// The clue should not be repeated — no new quest discovery on second advance
const secondMessages = clueHost.messages.slice(messagesBeforeSecond);
const hasRepeatedClue = secondMessages.some(
  (m) => m.text.includes('checkpoint relay annex') || m.text.includes('transport window')
);
assert(
  !hasRepeatedClue,
  'Clue NOT repeated on second dialogue advance (one-time delivery)'
);

// Verify with a different NPC: npc-technician for maintenance clearance
const technicianNpc: NPC = {
  id: 'npc-technician',
  name: 'Technician',
  x: 20,
  y: 20,
  hp: 100,
  maxHp: 100,
  isAlive: true,
  role: 'Stranded Technician',
  dialogue: ['Help me out here.', 'The sewer pump terminal can override the conduit.'],
  dialogueZh: ['幫我脫困。', '排污主控終端機可以覆寫通道。'],
};

const maintHost = buildHost({
  missionObjectives: [
    {
      id: 'obj-checkpoint-relay',
      title: 'Checkpoint Relay',
      description: 'desc',
      completed: true,
      discovered: true,
    },
    {
      id: 'obj-underground-logistics',
      title: 'Underground Logistics',
      description: 'desc',
      completed: true,
      discovered: true,
    },
    {
      id: 'obj-maintenance-clearance',
      title: 'Maintenance Clearance',
      description: 'desc',
      completed: false,
      discovered: false,
    },
  ],
});

const maintHostAny = maintHost.host as any;
maintHostAny.activeDialogue = { npc: technicianNpc, textIndex: 0 } as DialogueSession;
maintHostAny.checkSideQuestDiscovery = (_npcId: string) => {};

const maintMessagesBefore = maintHost.messages.length;
advanceDialogue(maintHostAny);
const maintMessagesAfter = maintHost.messages.length;

assert(
  maintMessagesAfter > maintMessagesBefore,
  'Technician dialogue advance produces new messages'
);

const maintObjAfter = maintHostAny.missionObjectives.find((o: MissionObjective) => o.id === 'obj-maintenance-clearance');
assert(
  maintObjAfter?.discovered === true,
  'obj-maintenance-clearance discovered after technician dialogue'
);

const maintClueMessages = maintHost.messages.slice(maintMessagesBefore);
const hasMaintClue = maintClueMessages.some(
  (m) => m.text.includes('maintenance conduit') || m.text.includes('sewer pump terminal')
);
assert(hasMaintClue, 'Technician clue message contains narrative clue text');

// ─────────────────────────────────────────────────────────────────────────────
// 8. Canonical sector & terminal hints — every key definition owns nonempty hints
//    and the KEYS command surfaces them for missing keys
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══ 8. Canonical Sector & Terminal Hints ═══');

// 8a. Structural contract: every REVERSAL_KEY_DEFINITIONS entry owns a
//     non-empty, canonical sectorHint and terminalHint.
for (const def of REVERSAL_KEY_DEFINITIONS) {
  assert(
    typeof def.sectorHint === 'string' && def.sectorHint.trim().length > 0,
    `Key "${def.id}" owns a nonempty canonical sectorHint ("${def.sectorHint}")`
  );
  assert(
    typeof def.terminalHint === 'string' && def.terminalHint.trim().length > 0,
    `Key "${def.id}" owns a nonempty canonical terminalHint ("${def.terminalHint}")`
  );
  // Canonical hints are stable identifiers: sector hints name a location,
  // terminal hints name a terminal node.
  assert(
    def.sectorHint.trim() !== def.terminalHint.trim(),
    `Key "${def.id}" sectorHint and terminalHint are distinct canonical values`
  );
}

// 8b. Behavioral contract: the KEYS command output surfaces each missing key's
//     canonical sectorHint and terminalHint verbatim.
// Build a host where ONLY Key I is available; Keys II & III are missing so the
// KEYS output must emit their sector/terminal hints.
const hintHost = buildHost({
  storyLogs: [
    {
      id: 'slate-checkpoint-relay',
      title: 'Reversal Key I',
      author: 'Checkpoint Relay Annex',
      timestamp: '2400-03-15T07:00:00Z',
      read: true,
      content: ['content'],
    },
    {
      id: 'slate-maintenance-override',
      title: 'Reversal Key II',
      author: 'Sub-Sector 0 Maintenance',
      timestamp: '2400-03-15T07:30:00Z',
      read: false,
      content: ['content'],
    },
    {
      id: 'slate-factory-worker',
      title: 'Reversal Key III',
      author: 'Anonymous Sector 2 Worker',
      timestamp: '2400-03-15T08:00:00Z',
      read: false,
      content: ['content'],
    },
  ],
  missionObjectives: [
    {
      id: 'obj-checkpoint-relay',
      title: 'Infiltrate Checkpoint Relay Annex',
      description: 'desc',
      completed: true,
      discovered: true,
    },
    {
      id: 'obj-maintenance-clearance',
      title: 'Maintenance Clearance',
      description: 'desc',
      completed: false,
      discovered: true,
    },
    {
      id: 'obj-disrupt-synchronizer',
      title: 'Disrupt Factory Synchronizer',
      description: 'desc',
      completed: false,
      discovered: true,
    },
  ],
});

const hintSession = new TerminalSession({
  id: 'CITADEL_CORE',
  name: 'Citadel Core Terminal',
  clearanceNeeded: 'LOCKDOWN',
  isHacked: false,
  logs: ['Citadel core log'],
});
const hintContext = {
  hasDefeatedBoss: true,
  items: [] as string[],
  level: 1,
  // Only Key I's slate is decrypted → Keys II & III are missing.
  decryptedSlates: ['slate-checkpoint-relay'],
};
const hintResult = hintSession.executeCommand('KEYS', hintContext as any);
const hintOutput = hintResult.output;

// For each key, assert its canonical hints are emitted exactly when the key is
// missing, and that the available key's hints are NOT emitted as missing-source
// guidance (the available key is only listed as AVAILABLE).
for (const def of REVERSAL_KEY_DEFINITIONS) {
  const isAvailable = def.sourceStoryLogId === 'slate-checkpoint-relay';
  if (isAvailable) {
    // Available key: its sector/terminal hints should NOT appear in the
    // "missing source" guidance block.
    assert(
      !hintOutput.includes(`Sector: ${def.sectorHint}`),
      `KEYS output does NOT emit missing-source sector hint for available key "${def.id}"`
    );
    assert(
      !hintOutput.includes(`Terminal: ${def.terminalHint}`),
      `KEYS output does NOT emit missing-source terminal hint for available key "${def.id}"`
    );
  } else {
    // Missing key: its canonical sector/terminal hints MUST be emitted.
    assertIncludes(
      hintOutput,
      `Sector: ${def.sectorHint}`,
      `KEYS output surfaces canonical sectorHint for missing key "${def.id}"`
    );
    assertIncludes(
      hintOutput,
      `Terminal: ${def.terminalHint}`,
      `KEYS output surfaces canonical terminalHint for missing key "${def.id}"`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n═══ VERIFICATION COMPLETE: ${passed} passed, ${failed} failed ═══\n`);

if (failed > 0) {
  process.exit(1);
}
