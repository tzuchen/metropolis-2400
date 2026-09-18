import {
  completeMainStoryQuest,
  discoverMainStoryQuest,
  type QuestHost,
} from '../src/questSystem';
import { EFFECT_PRESETS } from '../src/effectRegistry';
import { buildSector2Map, isWalkable } from '../src/map';
import { createSector2Items, createSectorStoryLogs } from '../src/worldBuilder';
import { handleTerminalInput } from '../src/terminalRunner';
import type { GameMessage, MissionObjective, QuestDiscoverySource } from '../src/types';

let assertions = 0;
function assert(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}

function createHost(language: 'en' | 'zh' = 'en'): QuestHost {
  const missionObjectives: MissionObjective[] = [
    { id: 'obj-maintenance-clearance', title: 'Maintenance', titleZh: '維修許可', description: '', completed: false, discovered: false },
    { id: 'obj-disrupt-synchronizer', title: 'Disrupt Factory Synchronizer', titleZh: '破壞製造廠同步器', description: '', completed: false, discovered: false },
    { id: 'obj-reversal-keys', title: 'Acquire Overmind Reversal Keys', titleZh: '取得主腦逆轉金鑰', description: '', completed: false, discovered: false },
  ];
  const messages: GameMessage[] = [];
  return {
    player: { x: 0, y: 0, hp: 100, maxHp: 100, energy: 100, maxEnergy: 100, credits: 0, inventory: [], equippedWeapon: null, equippedShield: null, equippedGadget: null, isDisguised: false, isWeaponDrawn: false },
    missionObjectives,
    storyLogs: [],
    language,
    ramenQuestComplete: false,
    synthwaveTapeActive: false,
    zeroOneWeaponForged: false,
    graffitiMuralComplete: false,
    poetryQuestComplete: false,
    pushMessage: (text, type) => messages.push({ text, type }),
    pushFloatingText: () => {},
    gainExp: () => {},
    completeSideQuest: () => {},
    updateNPCDialogues: () => {},
    render: () => {},
    __messages: messages,
  } as unknown as QuestHost;
}

const npc: QuestDiscoverySource = { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-zero-one' };
const worker: QuestDiscoverySource = { sourceType: 'STORY_LOG', sourceId: 'slate-factory-worker' };
const terminal: QuestDiscoverySource = { sourceType: 'TERMINAL', sourceId: 'TERMINAL_SYNCHRONIZER' };
const payload: QuestDiscoverySource = { sourceType: 'STORY_LOG', sourceId: 'slate-rebel-payload' };
function objective(host: QuestHost, id: string): MissionObjective {
  const found = host.missionObjectives.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing objective ${id}`);
  return found;
}
function authorize(host: QuestHost): void { objective(host, 'obj-maintenance-clearance').completed = true; }
function messages(host: QuestHost): GameMessage[] { return (host as unknown as { __messages: GameMessage[] }).__messages; }

function testQuestContract(): void {
  const locked = createHost();
  assert(discoverMainStoryQuest(locked, npc) === false, 'Zero-One must not reveal before maintenance clearance');
  assert(discoverMainStoryQuest(locked, worker) === false, 'Worker slate must not reveal before maintenance clearance');

  for (const source of [npc, worker]) {
    const host = createHost(); authorize(host);
    assert(discoverMainStoryQuest(host, source) === true, `${source.sourceId} must reveal synchronizer quest`);
    assert(objective(host, 'obj-disrupt-synchronizer').discovered, 'Synchronizer quest must be discovered');
    const before = messages(host).length;
    assert(discoverMainStoryQuest(host, source) === false, 'Discovery must be idempotent');
    assert(messages(host).length === before, 'Duplicate discovery must not broadcast');
  }

  for (const source of [terminal, payload]) {
    const host = createHost(); authorize(host); discoverMainStoryQuest(host, npc);
    assert(completeMainStoryQuest(host, source) === true, `${source.sourceId} must complete synchronizer quest`);
    assert(objective(host, 'obj-disrupt-synchronizer').completed, 'Synchronizer quest must complete');
    assert(objective(host, 'obj-reversal-keys').discovered, 'Completion must reveal reversal keys');
    const before = messages(host).length;
    assert(completeMainStoryQuest(host, source) === false, 'Completion must be idempotent');
    assert(messages(host).length === before, 'Duplicate completion must not broadcast');
  }

  const zh = createHost('zh'); authorize(zh);
  discoverMainStoryQuest(zh, npc);
  completeMainStoryQuest(zh, payload);
  assert(messages(zh).some((entry) => entry.text.startsWith('【任務更新】')), 'Chinese discovery message must be bilingual');
  assert(messages(zh).some((entry) => entry.text.startsWith('【任務完成】')), 'Chinese completion message must be bilingual');
}

function testWorldData(): void {
  const logs = createSectorStoryLogs();
  assert(logs.some((log) => log.id === 'slate-factory-worker'), 'Factory worker log must exist');
  assert(logs.some((log) => log.id === 'slate-rebel-payload'), 'Rebel payload log must exist');
  assert(EFFECT_PRESETS.SYNCHRONIZER_SABOTAGE?.id === 'SYNCHRONIZER_SABOTAGE', 'Sabotage preset must exist');
  assert(EFFECT_PRESETS.SYNCHRONIZER_SUBVERSION?.id === 'SYNCHRONIZER_SUBVERSION', 'Subversion preset must exist');

  const map = buildSector2Map();
  const syncTerminal = map.terminals.TERMINAL_SYNCHRONIZER;
  assert(Boolean(syncTerminal), 'Synchronizer terminal must exist');
  assert(isWalkable(map.tiles[syncTerminal.position.y][syncTerminal.position.x]), 'Synchronizer terminal must be on a walkable tile');
  const slates = createSector2Items().filter((item) => item.storyLogId === 'slate-factory-worker' || item.storyLogId === 'slate-rebel-payload');
  assert(slates.length === 2, 'Both synchronizer slates must be physical Sector 2 items');
  const occupied = new Set<string>();
  for (const slate of slates) {
    const key = `${slate.x},${slate.y}`;
    assert(!occupied.has(key), 'Synchronizer slate coordinates must not overlap');
    occupied.add(key);
    assert(isWalkable(map.tiles[slate.y][slate.x]), `${slate.id} must be on a walkable tile`);
    assert(key !== `${syncTerminal.position.x},${syncTerminal.position.y}`, `${slate.id} must not overlap terminal`);
  }
}

function testTerminalDispatch(): void {
  const host = createHost(); authorize(host); discoverMainStoryQuest(host, npc);
  const game = Object.assign(host, {
    activeTerminal: { terminal: { id: 'TERMINAL_SYNCHRONIZER' }, input: '', history: [] as string[] },
    terminalInputBuffer: 'SUBVERSION',
  });
  handleTerminalInput(game as never, 'Enter');
  assert(objective(game, 'obj-disrupt-synchronizer').completed, 'SUBVERSION terminal command must use real completion path');
  assert(objective(game, 'obj-reversal-keys').discovered, 'Terminal completion must reveal reversal keys');
  const before = messages(game).length;
  game.terminalInputBuffer = 'SUBVERSION';
  handleTerminalInput(game as never, 'Enter');
  assert(messages(game).length === before, 'Repeated terminal command must not rebroadcast completion');
}

testQuestContract();
testWorldData();
testTerminalDispatch();
console.log(`PASS (${assertions} assertions)`);
