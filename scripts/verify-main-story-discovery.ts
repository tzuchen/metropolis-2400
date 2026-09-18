/**
 * Headless pure-contract test for main-story quest discovery.
 *
 * Verifies the exported contract of `discoverMainStoryQuest` and
 * `MAIN_STORY_QUEST_DEFINITIONS` without instantiating GameEngine,
 * requiring DOM, or touching audio.
 */

import {
  discoverMainStoryQuest,
  MAIN_STORY_QUEST_DEFINITIONS,
} from '../src/questSystem';
import type {
  MissionObjective,
  StoryLog,
  GameMessage,
  Language,
} from '../src/types';

// ---------------------------------------------------------------------------
// Minimal QuestHost stub
// ---------------------------------------------------------------------------

interface StubHost {
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    credits: number;
    inventory: any[];
    equippedWeapon: any;
    equippedShield: any;
    equippedGadget: any;
    isDisguised: boolean;
    isWeaponDrawn: boolean;
  };
  missionObjectives: MissionObjective[];
  storyLogs: StoryLog[];
  language: Language;
  ramenQuestComplete: boolean;
  synthwaveTapeActive: boolean;
  zeroOneWeaponForged: boolean;
  graffitiMuralComplete: boolean;
  poetryQuestComplete: boolean;
  pushMessage: (text: string, type: GameMessage['type']) => void;
  pushFloatingText: (x: number, y: number, text: string, color: string) => void;
  gainExp: (amount: number, reason?: string) => void;
  completeSideQuest: (questId: string) => void;
  updateNPCDialogues: () => void;
  render: () => void;
}

function createStubHost(
  language: Language = 'en',
  objectives?: MissionObjective[]
): StubHost {
  const messages: { text: string; type: GameMessage['type'] }[] = [];

  const defaultObjectives: MissionObjective[] = [
    {
      id: 'obj-safehouse',
      title: 'Safehouse Recon & Gear',
      description: 'Converse with Commander Kira and Doc Vance in Sector 1 Safehouse.',
      completed: true,
      isSideQuest: false,
      discovered: true,
    },
    {
      id: 'obj-forcefield',
      title: 'Deactivate Checkpoint 01',
      description: 'Access terminal CHECKPOINT_FF to lower the high-energy plasma barrier.',
      completed: false,
      isSideQuest: false,
      discovered: false,
    },
    {
      id: 'obj-checkpoint-relay',
      title: 'Infiltrate Checkpoint Relay Annex',
      description: 'Enter the sealed relay annex and locate the Citadel uplink relay node.',
      completed: false,
      isSideQuest: false,
      discovered: false,
    },
  ];

  return {
    player: {
      x: 0,
      y: 0,
      hp: 100,
      maxHp: 100,
      energy: 50,
      maxEnergy: 50,
      credits: 0,
      inventory: [],
      equippedWeapon: null,
      equippedShield: null,
      equippedGadget: null,
      isDisguised: false,
      isWeaponDrawn: false,
    },
    missionObjectives: objectives ?? defaultObjectives,
    storyLogs: [],
    language,
    ramenQuestComplete: false,
    synthwaveTapeActive: false,
    zeroOneWeaponForged: false,
    graffitiMuralComplete: false,
    poetryQuestComplete: false,
    pushMessage: (text, type) => {
      messages.push({ text, type });
    },
    pushFloatingText: () => {},
    gainExp: () => {},
    completeSideQuest: () => {},
    updateNPCDialogues: () => {},
    render: () => {},
  };
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

let assertionCount = 0;

function assert(condition: boolean, message: string): void {
  assertionCount++;
  if (!condition) {
    console.error(`ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assertionCount++;
  if (actual !== expected) {
    console.error(
      `ASSERTION FAILED: ${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function testDefinitionsIncludeRequiredObjectives(): void {
  const objectiveIds = MAIN_STORY_QUEST_DEFINITIONS.map((d) => d.objectiveId);
  assert(
    objectiveIds.includes('obj-forcefield'),
    'MAIN_STORY_QUEST_DEFINITIONS must include obj-forcefield'
  );
  assert(
    objectiveIds.includes('obj-checkpoint-relay'),
    'MAIN_STORY_QUEST_DEFINITIONS must include obj-checkpoint-relay'
  );
}

function testUnmatchedSourceDoesNothing(): void {
  const host = createStubHost('en');
  const before = host.missionObjectives.map((o) => ({
    id: o.id,
    discovered: o.discovered,
    completed: o.completed,
  }));

  const result = discoverMainStoryQuest(host, {
    sourceType: 'NPC_DIALOGUE',
    sourceId: 'npc-nonexistent',
  });

  assertEqual(result, false, 'Unmatched source should return false');

  const after = host.missionObjectives.map((o) => ({
    id: o.id,
    discovered: o.discovered,
    completed: o.completed,
  }));
  assertEqual(
    JSON.stringify(after),
    JSON.stringify(before),
    'Unmatched source must not mutate any objective'
  );
}

function testMatchingNpcSourceDiscoversForcefield(): void {
  const host = createStubHost('en');
  const forcefieldObj = host.missionObjectives.find(
    (o) => o.id === 'obj-forcefield'
  )!;
  assertEqual(
    forcefieldObj.discovered,
    false,
    'obj-forcefield should start undiscovered'
  );

  const result = discoverMainStoryQuest(host, {
    sourceType: 'NPC_DIALOGUE',
    sourceId: 'npc-kira',
  });

  assertEqual(result, true, 'Matching NPC source should discover obj-forcefield');
  assertEqual(
    forcefieldObj.discovered,
    true,
    'obj-forcefield should be discovered after matching source'
  );
  assertEqual(
    forcefieldObj.completed,
    false,
    'obj-forcefield should not be completed by discovery'
  );
}

function testDuplicateSourceIsIdempotent(): void {
  const host = createStubHost('en');

  const firstResult = discoverMainStoryQuest(host, {
    sourceType: 'NPC_DIALOGUE',
    sourceId: 'npc-kira',
  });
  assertEqual(firstResult, true, 'First discovery should succeed');

  const secondResult = discoverMainStoryQuest(host, {
    sourceType: 'NPC_DIALOGUE',
    sourceId: 'npc-kira',
  });
  assertEqual(
    secondResult,
    false,
    'Duplicate source should return false (idempotent)'
  );

  const forcefieldObj = host.missionObjectives.find(
    (o) => o.id === 'obj-forcefield'
  )!;
  assertEqual(
    forcefieldObj.discovered,
    true,
    'obj-forcefield should remain discovered'
  );
}

function testCheckpointRelayBlockedUntilForcefieldCompletes(): void {
  const host = createStubHost('en');

  // obj-forcefield is not completed yet
  const forcefieldObj = host.missionObjectives.find(
    (o) => o.id === 'obj-forcefield'
  )!;
  assertEqual(
    forcefieldObj.completed,
    false,
    'obj-forcefield should not be completed initially'
  );

  const result = discoverMainStoryQuest(host, {
    sourceType: 'TERMINAL',
    sourceId: 'CHECKPOINT_FF',
  });

  assertEqual(
    result,
    false,
    'obj-checkpoint-relay should be blocked when obj-forcefield is not completed'
  );

  const relayObj = host.missionObjectives.find(
    (o) => o.id === 'obj-checkpoint-relay'
  )!;
  assertEqual(
    relayObj.discovered,
    false,
    'obj-checkpoint-relay should remain undiscovered when prerequisite unmet'
  );
}

function testCheckpointRelayDiscoveredAfterForcefieldCompletes(): void {
  const host = createStubHost('en');

  // Mark obj-forcefield as completed
  const forcefieldObj = host.missionObjectives.find(
    (o) => o.id === 'obj-forcefield'
  )!;
  forcefieldObj.completed = true;

  const result = discoverMainStoryQuest(host, {
    sourceType: 'TERMINAL',
    sourceId: 'CHECKPOINT_FF',
  });

  assertEqual(
    result,
    true,
    'obj-checkpoint-relay should be discovered when obj-forcefield is completed'
  );

  const relayObj = host.missionObjectives.find(
    (o) => o.id === 'obj-checkpoint-relay'
  )!;
  assertEqual(
    relayObj.discovered,
    true,
    'obj-checkpoint-relay should be discovered'
  );
}

function testEnglishHostEmitsCorrectMessage(): void {
  const host = createStubHost('en');
  const messages: { text: string; type: GameMessage['type'] }[] = [];

  // Override pushMessage to capture
  host.pushMessage = (text, type) => {
    messages.push({ text, type });
  };

  discoverMainStoryQuest(host, {
    sourceType: 'NPC_DIALOGUE',
    sourceId: 'npc-kira',
  });

  assertEqual(
    messages.length,
    1,
    'English host should emit exactly one message'
  );
  assertEqual(
    messages[0].type,
    'info',
    'Message type should be info'
  );
  assert(
    messages[0].text.includes('MISSION UPDATE'),
    'English message should contain MISSION UPDATE'
  );
  assert(
    messages[0].text.includes('Deactivate Checkpoint 01'),
    'English message should reference Deactivate Checkpoint 01'
  );
}

function testChineseHostEmitsCorrectMessage(): void {
  const host = createStubHost('zh');
  const messages: { text: string; type: GameMessage['type'] }[] = [];

  host.pushMessage = (text, type) => {
    messages.push({ text, type });
  };

  discoverMainStoryQuest(host, {
    sourceType: 'NPC_DIALOGUE',
    sourceId: 'npc-kira',
  });

  assertEqual(
    messages.length,
    1,
    'Chinese host should emit exactly one message'
  );
  assertEqual(
    messages[0].type,
    'info',
    'Message type should be info'
  );
  assert(
    messages[0].text.includes('【任務更新】'),
    'Chinese message should contain 【任務更新】'
  );
  assert(
    messages[0].text.includes('解除 01 號檢查哨能量屏障'),
    'Chinese message should reference 解除 01 號檢查哨能量屏障'
  );
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------

function runAllTests(): void {
  testDefinitionsIncludeRequiredObjectives();
  testUnmatchedSourceDoesNothing();
  testMatchingNpcSourceDiscoversForcefield();
  testDuplicateSourceIsIdempotent();
  testCheckpointRelayBlockedUntilForcefieldCompletes();
  testCheckpointRelayDiscoveredAfterForcefieldCompletes();
  testEnglishHostEmitsCorrectMessage();
  testChineseHostEmitsCorrectMessage();
}

// Invoke the verifier at module bottom so npx tsx fails on assertion failure
runAllTests();

console.log(`PASS (${assertionCount} assertions)`);
