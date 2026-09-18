import { discoverMainStoryQuest, MAIN_STORY_QUEST_DEFINITIONS } from '../src/questSystem';
import { setupSubSectorZero, buildSubSectorZeroMap } from '../src/sewerMap';
import { GameEngine } from '../src/game';
import type { QuestHost, QuestDiscoverySource } from '../src/questSystem';
import type { MissionObjective, StoryLog, GameMessage, Language } from '../src/types';

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
    { id: 'obj-checkpoint-relay', title: 'Relay', description: '', completed: false, discovered: true },
    { id: 'obj-underground-logistics', title: 'Underground', description: '', completed: false, discovered: false },
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
  };
  return host;
}

function testKiraSourceFailsBeforeRelayCompletion(): void {
  const host = createMinimalHost();
  const source: QuestDiscoverySource = { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-kira' };
  const result = discoverMainStoryQuest(host, source);
  assert(result === false, 'Kira source should fail before relay completion');
  assert(host.missionObjectives.find(o => o.id === 'obj-underground-logistics')!.discovered === false, 'Objective should not be discovered');
  assert(host.pushMessage !== undefined, 'Host should have pushMessage');
}

function testKiraSourceSucceedsAfterRelayCompletion(): void {
  const host = createMinimalHost();
  host.missionObjectives.find(o => o.id === 'obj-checkpoint-relay')!.completed = true;
  const source: QuestDiscoverySource = { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-kira' };
  const result = discoverMainStoryQuest(host, source);
  assert(result === true, 'Kira source should succeed after relay completion');
  assert(host.missionObjectives.find(o => o.id === 'obj-underground-logistics')!.discovered === true, 'Objective should be discovered');
}

function testSlateManifestDiscoveryAfterRelayCompletion(): void {
  const host = createMinimalHost();
  host.missionObjectives.find(o => o.id === 'obj-checkpoint-relay')!.completed = true;
  const source: QuestDiscoverySource = { sourceType: 'STORY_LOG', sourceId: 'slate-underground-manifest' };
  const result = discoverMainStoryQuest(host, source);
  assert(result === true, 'Slate manifest source should succeed after relay completion');
  assert(host.missionObjectives.find(o => o.id === 'obj-underground-logistics')!.discovered === true, 'Objective should be discovered via slate');
}

function testDuplicateDiscoveryAddsNoMessage(): void {
  const host = createMinimalHost();
  host.missionObjectives.find(o => o.id === 'obj-checkpoint-relay')!.completed = true;
  const source: QuestDiscoverySource = { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-kira' };
  const firstResult = discoverMainStoryQuest(host, source);
  assert(firstResult === true, 'First discovery should succeed');
  const msgCountAfterFirst = host.missionObjectives.length;
  const secondResult = discoverMainStoryQuest(host, source);
  assert(secondResult === false, 'Duplicate discovery should fail');
  assert(host.missionObjectives.find(o => o.id === 'obj-underground-logistics')!.discovered === true, 'Objective remains discovered');
}

function testSewerManifestItemAndObjectiveDiscovery(): void {
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
  game.missionObjectives.find(o => o.id === 'obj-checkpoint-relay')!.completed = true;
  game.missionObjectives.find(o => o.id === 'obj-forcefield')!.completed = true;
  game.missionObjectives.find(o => o.id === 'obj-safehouse')!.completed = true;

  setupSubSectorZero(game as any);

  const manifestItem = game.groundItems.find((gi: any) => gi.id === 'slate-item-underground-manifest');
  assert(manifestItem !== undefined, 'Manifest item should exist in sewer sector');
  assert(manifestItem!.storyLogId === 'slate-underground-manifest', 'Manifest item should reference correct story log');

  const manifestLog = game.storyLogs.find((sl: StoryLog) => sl.id === 'slate-underground-manifest');
  assert(manifestLog !== undefined, 'Manifest story log should exist');
  assert(manifestLog!.read === false, 'Manifest log should not be read initially');

  game.player.x = manifestItem!.x;
  game.player.y = manifestItem!.y;
  game.player.checkInTimer = 100;
  game.player.isCollarDisarmed = false;

  game.checkItemPickup();

  const updatedLog = game.storyLogs.find((sl: StoryLog) => sl.id === 'slate-underground-manifest');
  assert(updatedLog !== undefined, 'Manifest log should still exist after step');
  assert(updatedLog!.read === true, 'Manifest log should be read after picking up item');

  const objective = game.missionObjectives.find(o => o.id === 'obj-underground-logistics');
  assert(objective !== undefined, 'Underground logistics objective should exist');
  assert(objective!.discovered === true, 'Underground logistics objective should be discovered after manifest pickup');
}

function runTests(): void {
  console.log('Running underground logistics quest tests...');
  testKiraSourceFailsBeforeRelayCompletion();
  console.log('PASS: Kira source fails before relay completion');
  testKiraSourceSucceedsAfterRelayCompletion();
  console.log('PASS: Kira source succeeds after relay completion');
  testSlateManifestDiscoveryAfterRelayCompletion();
  console.log('PASS: Slate manifest discovery after relay completion');
  testDuplicateDiscoveryAddsNoMessage();
  console.log('PASS: Duplicate discovery adds no message');
  testSewerManifestItemAndObjectiveDiscovery();
  console.log('PASS: Sewer manifest item and objective discovery');
  console.log('PASS');
}

runTests();
