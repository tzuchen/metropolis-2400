import type { Item, NPC, QuestDefinition, QuestState, QuestReward, MissionObjective, StoryLog, GameMessage, SecurityLevel, Language, GroundItem, Position, Robot, SectorMap, PushableBlock, Hazard, DialogueSession, TerminalData, MainStoryQuestDefinition, QuestDiscoverySource } from './types';
import { createQuantumAnnihilator } from './entities';
import { soundFX } from './audio';
import { bgm } from './music';

export interface QuestHost {
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    credits: number;
    inventory: Item[];
    weapons?: Item[];
    equippedWeapon: Item | null;
    equippedShield: Item | null;
    equippedGadget: Item | null;
    isDisguised: boolean;
    isWeaponDrawn: boolean;
    consumables?: {
      medkits: number;
      batteries: number;
      empGrenades: number;
    };
    augments?: Record<string, boolean>;
    currentSectorId?: string;
    level?: number;
    exp?: number;
    expToNext?: number;
    xp?: number;
    xpToNext?: number;
    skillPoints?: number;
    checkInTimer?: number;
    isCollarDisarmed?: boolean;
    facing?: 'up' | 'down' | 'left' | 'right';
    checkInMaxTimer?: number;
    endgameChoice?: string;
    hasDefeatedBoss?: boolean;
    victory?: boolean;
    missionObjectives?: MissionObjective[];
    storyLogs?: StoryLog[];
    critChance?: number;
    graffitiBuffApplied?: boolean;
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

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'side-hiro',
    npcId: 'npc-hiro',
    requiredItemIds: ['item-ramen-recipe'],
    objectiveId: 'side-hiro',
    repeatable: false,
    reward: {
      type: 'HEAL',
      amount: 50,
      message: 'Hiro: Thanks for recovering my ramen recipe! My max HP increased!',
      messageZh: 'Hiro: 多謝你幫我找回拉麵食譜！我的最大生命值提升了！',
    } as any,
  },
  {
    id: 'side-elena',
    npcId: 'npc-elena',
    requiredItemIds: ['item-synth-tape'],
    objectiveId: 'side-elena',
    repeatable: false,
    reward: {
      type: 'ENERGY',
      amount: 20,
      message: 'Elena: Thank you, operative! The analog frequency of this master tape awakened neural resonance. Max energy increased!',
      messageZh: 'Elena: 謝謝你，特工！這捲母帶的類比頻率喚醒了神經共鳴，最大能量提升了！',
    } as any,
  },
  {
    id: 'side-zero-one',
    npcId: 'npc-zero-one',
    requiredItemIds: ['item-quantum-core', 'item-matrix-chip'],
    objectiveId: 'obj-superweapon',
    repeatable: false,
    reward: {
      type: 'CREDITS',
      amount: 100,
      message: 'Zero-One: Quantum Annihilator forged! This will change the game.',
      messageZh: 'Zero-One: 量子殲滅重砲組裝完成！這將改變戰局。',
    } as any,
  },
  {
    id: 'side-vesper',
    npcId: 'npc-vesper',
    requiredItemIds: ['item-chromatic-aerosol'],
    objectiveId: 'side-vesper',
    repeatable: false,
    reward: {
      type: 'HEAL',
      amount: 0,
      message: 'Vesper: Thank you, Raven. This wall now has a soul. Your attack power and crit chance increased!',
      messageZh: 'Vesper: 感謝你，雷文。這面牆現在有了靈魂。你的攻擊力與暴擊率提升了！',
    } as any,
  },
  {
    id: 'side-archie',
    npcId: 'npc-archie',
    requiredItemIds: ['item-unburnt-folio'],
    objectiveId: 'side-archie',
    repeatable: false,
    reward: {
      type: 'ENERGY',
      amount: 0,
      message: 'Archie: Thanks for recovering my poetry folio! My check-in timer limit increased by 25 steps and the timer has been reset.',
      messageZh: 'Archie: 多謝你幫我找回詩集！我的簽到時間上限提升了 25 步，計時器已重置。',
    } as any,
  },
];

export const MAIN_STORY_QUEST_DEFINITIONS: MainStoryQuestDefinition[] = [
  {
    objectiveId: 'obj-forcefield',
    prerequisiteObjectiveIds: ['obj-safehouse'],
    discoverySources: [{ sourceType: 'NPC_DIALOGUE', sourceId: 'npc-kira' }],
    discoveryMessageEn:
      'MISSION UPDATE: Deactivate Checkpoint 01 — Access terminal CHECKPOINT_FF to lower the plasma barrier.',
    discoveryMessageZh:
      '【任務更新】解除 01 號檢查哨能量屏障 — 操作終端機 CHECKPOINT_FF 解除高能電漿力場。',
  },
  {
    objectiveId: 'obj-checkpoint-relay',
    prerequisiteObjectiveIds: ['obj-forcefield'],
    discoverySources: [{ sourceType: 'TERMINAL', sourceId: 'CHECKPOINT_FF' }],
    discoveryMessageEn:
      'MISSION UPDATE: Infiltrate Checkpoint Relay Annex — Enter the sealed annex and locate the Citadel uplink relay node.',
    discoveryMessageZh:
      '【任務更新】滲透檢查哨中繼附屬區 — 進入封閉的中繼附屬區，尋找堡壘上行鏈路中繼節點。',
  },
  {
    objectiveId: 'obj-underground-logistics',
    prerequisiteObjectiveIds: ['obj-checkpoint-relay'],
    discoverySources: [
      { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-kira' },
      { sourceType: 'STORY_LOG', sourceId: 'slate-checkpoint-relay' },
    ],
    discoveryMessageEn:
      'MISSION UPDATE: Underground Logistics — Trace the subterranean supply routes to secure the Citadel\'s hidden transport corridors.',
    discoveryMessageZh:
      '【任務更新】地下物流 — 追蹤地下補給路線，確保堡壘的隱密運輸通道。',
    completionSources: [
      { sourceType: 'STORY_LOG', sourceId: 'slate-underground-manifest' },
    ],
    nextObjectiveId: 'obj-maintenance-clearance',
    completionMessageEn:
      'MISSION COMPLETE: Underground Logistics — Citadel hidden transport corridors secured.',
    completionMessageZh:
      '【任務完成】地下物流：已確保堡壘隱密運輸通道。',
  },
  {
    objectiveId: 'obj-maintenance-clearance',
    prerequisiteObjectiveIds: ['obj-underground-logistics'],
    discoverySources: [
      { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-technician' },
      { sourceType: 'STORY_LOG', sourceId: 'slate-crashed-transport' },
    ],
    discoveryMessageEn:
      'MISSION UPDATE: Maintenance Clearance — Locate the stranded technician or examine the crashed transport in Sub-Sector 0.',
    discoveryMessageZh:
      '【任務更新】維修許可 — 尋找 Sub-Sector 0 的受困技師或調查失事運輸艇。',
    completionSources: [
      { sourceType: 'TERMINAL', sourceId: 'SEWER_PUMP_TERMINAL' },
      { sourceType: 'STORY_LOG', sourceId: 'slate-maintenance-override' },
    ],
    nextObjectiveId: 'obj-disrupt-synchronizer',
    completionMessageEn:
      'MISSION COMPLETE: Maintenance Clearance — Access to Sector 2 Manufacturing Plant maintenance conduit authorized.',
    completionMessageZh:
      '【任務完成】維修許可：通往第二區製造廠維護通道授權已開啟。',
  },
  {
    objectiveId: 'obj-disrupt-synchronizer',
    prerequisiteObjectiveIds: ['obj-maintenance-clearance'],
    discoverySources: [
      { sourceType: 'NPC_DIALOGUE', sourceId: 'npc-zero-one' },
      { sourceType: 'STORY_LOG', sourceId: 'slate-factory-worker' },
    ],
    discoveryMessageEn:
      'MISSION UPDATE: Disrupt Factory Synchronizer — Infiltrate Sector 2 Manufacturing Plant and disrupt the sub-core synchronizer.',
    discoveryMessageZh:
      '【任務更新】破壞製造廠同步器 — 潛入第二區製造廠並破壞副核心同步器。',
    completionSources: [
      { sourceType: 'TERMINAL', sourceId: 'TERMINAL_SYNCHRONIZER' },
      { sourceType: 'STORY_LOG', sourceId: 'slate-rebel-payload' },
    ],
    nextObjectiveId: 'obj-reversal-keys',
    completionMessageEn:
      'MISSION COMPLETE: Disrupt Factory Synchronizer — Sub-core synchronizer disrupted. Neural collar broadcast reversed for all subjects in the sector.',
    completionMessageZh:
      '【任務完成】破壞製造廠同步器：副核心同步器已破壞。該區域所有受試者的神經項圈廣播已逆轉。',
  },
];

export function discoverMainStoryQuest(
  host: QuestHost,
  source: QuestDiscoverySource
): boolean {
  const matchingDefinitions = MAIN_STORY_QUEST_DEFINITIONS.filter((definition) =>
    definition.discoverySources.some(
      (candidate) => candidate.sourceType === source.sourceType && candidate.sourceId === source.sourceId
    )
  );

  for (const definition of matchingDefinitions) {
    const target = host.missionObjectives.find((objective) => objective.id === definition.objectiveId);
    if (!target || target.completed || target.discovered) continue;

    const prerequisitesMet = definition.prerequisiteObjectiveIds.every((id) => {
      const prerequisite = host.missionObjectives.find((objective) => objective.id === id);
      return prerequisite?.completed === true;
    });
    if (!prerequisitesMet) continue;

    target.discovered = true;
    host.pushMessage(
      host.language === 'zh' ? definition.discoveryMessageZh : definition.discoveryMessageEn,
      'info'
    );
    return true;
  }

  return false;
}

export function completeMainStoryQuest(
  host: QuestHost,
  source: QuestDiscoverySource
): boolean {
  const matchingDefinitions = MAIN_STORY_QUEST_DEFINITIONS.filter((definition) =>
    definition.completionSources?.some(
      (candidate) => candidate.sourceType === source.sourceType && candidate.sourceId === source.sourceId
    )
  );

  for (const definition of matchingDefinitions) {
    const target = host.missionObjectives.find((objective) => objective.id === definition.objectiveId);
    if (!target || target.completed || !target.discovered) continue;

    target.completed = true;
    host.pushMessage(
      host.language === 'zh'
        ? definition.completionMessageZh || '【任務完成】'
        : definition.completionMessageEn || 'MISSION COMPLETE',
      'success'
    );

    if (definition.nextObjectiveId) {
      const nextObjective = host.missionObjectives.find((o) => o.id === definition.nextObjectiveId);
      if (nextObjective && !nextObjective.discovered) {
        nextObjective.discovered = true;
        host.pushMessage(
          host.language === 'zh'
            ? `【任務更新】${nextObjective.titleZh || nextObjective.title}`
            : `MISSION UPDATE: ${nextObjective.title}`,
          'info'
        );
      }
    }

    host.render();
    return true;
  }

  return false;
}

export function getQuestDefinition(questId: string): QuestDefinition | undefined {
  return QUEST_DEFINITIONS.find((q) => q.id === questId);
}

export function getQuestByNpcId(npcId: string): QuestDefinition | undefined {
  return QUEST_DEFINITIONS.find((q) => q.npcId === npcId);
}

export function checkQuestDiscovery(host: QuestHost, npcId: string): void {
  const quest = getQuestByNpcId(npcId);
  if (!quest) return;
  const objective = host.missionObjectives.find((o) => o.id === quest.objectiveId);
  if (objective && !objective.discovered) {
    objective.discovered = true;
    const isZh = host.language === 'zh';
    const questNames: Record<string, { zh: string; en: string }> = {
      'side-hiro': { zh: '拉麵食譜', en: 'Ramen Recipe' },
      'side-elena': { zh: '合成母帶', en: 'Synth Master Tape' },
      'side-vesper': { zh: '色劑塗鴉', en: 'Chromatic Aerosol Mural' },
      'side-archie': { zh: '詩集回收', en: 'Poetry Folio Recovery' },
      'side-zero-one': { zh: '奇點計畫', en: 'Project Singularity' },
    };
    const name = questNames[quest.objectiveId];
    host.pushMessage(
      isZh
        ? `【支線任務發現】新任務：${name ? name.zh : quest.objectiveId}`
        : `[SIDE QUEST DISCOVERED] New quest: ${name ? name.en : quest.objectiveId}`,
      'info'
    );
    host.render();
  }
}

export function checkAndProgress(host: QuestHost, questId: string, context?: { npc?: NPC }): boolean {
  const quest = getQuestDefinition(questId);
  if (!quest) return false;

  const inventory = host.player.inventory;
  if (!Array.isArray(inventory)) return false;

  // Check if all required items are present
  const hasAllItems = quest.requiredItemIds.every((itemId) =>
    inventory.some((it: Item) => it?.id === itemId)
  );
  if (!hasAllItems) return false;

  // Check idempotence flags
  switch (questId) {
    case 'side-hiro':
      if (host.ramenQuestComplete) return false;
      break;
    case 'side-elena':
      if (host.synthwaveTapeActive) return false;
      break;
    case 'side-zero-one':
      if (host.zeroOneWeaponForged) return false;
      break;
    case 'side-vesper':
      if (host.graffitiMuralComplete) return false;
      break;
    case 'side-archie':
      if (host.poetryQuestComplete) return false;
      break;
    default:
      break;
  }

  const isZh = host.language === 'zh';
  const p = host.player;

  // Execute quest-specific effects
  switch (questId) {
    case 'side-hiro': {
      const recipeIndex = inventory.findIndex((it: Item) => it?.id === 'item-ramen-recipe');
      if (recipeIndex !== -1) {
        inventory.splice(recipeIndex, 1);
        p.maxHp += 50;
        p.hp = p.maxHp;
        soundFX.pickup();
        host.pushFloatingText(p.x, p.y, 'MAX HP +50!', '#00ff88');
        host.pushMessage(
          isZh
            ? 'Hiro: 多謝你幫我找回拉麵食譜！我的最大生命值提升了！'
            : 'Hiro: Thanks for recovering my ramen recipe! My max HP increased!',
          'success'
        );
        host.ramenQuestComplete = true;
      }
      break;
    }
    case 'side-elena': {
      const tapeIndex = inventory.findIndex((it: Item) => it?.id === 'item-synth-tape');
      if (tapeIndex !== -1) {
        inventory.splice(tapeIndex, 1);
        p.maxEnergy += 20;
        p.energy = p.maxEnergy;
        soundFX.pickup();
        host.pushFloatingText(p.x, p.y, 'MAX EN +20!', '#00f0ff');
        host.pushMessage(
          isZh
            ? 'Elena: 謝謝你，特工！這捲母帶的類比頻率喚醒了神經共鳴，最大能量提升了！'
            : 'Elena: Thank you, operative! The analog frequency of this master tape awakened neural resonance. Max energy increased!',
          'success'
        );
        bgm.setSynthwaveTapeMode(true);
        host.synthwaveTapeActive = true;
      }
      break;
    }
    case 'side-zero-one': {
      const hasCore = inventory.some((it: Item) => it?.id === 'item-quantum-core');
      const hasChip = inventory.some((it: Item) => it?.id === 'item-matrix-chip');
      const hasWeapon = inventory.some((it: Item) => it?.id === 'quantum-annihilator');

      if (hasCore && hasChip && !hasWeapon) {
        p.inventory = inventory.filter((it: Item) => it?.id !== 'item-quantum-core' && it?.id !== 'item-matrix-chip');

        const superWeapon = createQuantumAnnihilator();
        p.inventory.push(superWeapon);

        let weapons = p.weapons;
        if (!Array.isArray(weapons)) {
          weapons = [];
          p.weapons = weapons;
        }
        weapons.push(superWeapon);
        p.equippedWeapon = superWeapon;

        p.credits += 100;
        host.gainExp(150);

        const superObj = host.missionObjectives.find((o) => o.id === 'obj-superweapon');
        if (superObj && !superObj.completed) {
          superObj.completed = true;
          host.pushMessage(
            isZh
              ? '【任務更新】奇點計畫：量子殲滅砲鍛造完成！'
              : 'MISSION UPDATE: Project Singularity objective complete!',
            'success'
          );
        }

        soundFX.victory();
        host.pushFloatingText(p.x, p.y, 'QUANTUM ANNIHILATOR FORGED!', '#b388ff');
        host.pushMessage(
          isZh
            ? 'Zero-One: 量子殲滅重砲組裝完成！這將改變戰局。'
            : 'Zero-One: Quantum Annihilator forged! This will change the game.',
          'success'
        );
        host.zeroOneWeaponForged = true;
      }
      break;
    }
    case 'side-vesper': {
      const aerosolIndex = inventory.findIndex((it: Item) => it?.id === 'item-chromatic-aerosol');
      if (aerosolIndex !== -1 && !host.graffitiMuralComplete) {
        inventory.splice(aerosolIndex, 1);
        host.graffitiMuralComplete = true;
        if (!p.augments) p.augments = {};
        p.augments['GRAFFITI_POWER_BOOST'] = true;
        if (!p.graffitiBuffApplied) {
          if (p.equippedWeapon) {
            p.equippedWeapon.power = (p.equippedWeapon.power || 0) + 5;
          }
          p.critChance = (p.critChance || 0) + 0.15;
          p.graffitiBuffApplied = true;
        }
        soundFX.pickup();
        host.pushFloatingText(p.x, p.y, 'MURAL COMPLETE!', '#ff00ff');
        host.pushMessage(
          isZh
            ? 'Vesper: 感謝你，雷文。這面牆現在有了靈魂。你的攻擊力與暴擊率提升了！'
            : 'Vesper: Thank you, Raven. This wall now has a soul. Your attack power and crit chance increased!',
          'success'
        );
      }
      break;
    }
    case 'side-archie': {
      const folioIndex = inventory.findIndex((it: Item) => it?.id === 'item-unburnt-folio');
      if (folioIndex !== -1 && !host.poetryQuestComplete) {
        inventory.splice(folioIndex, 1);
        host.poetryQuestComplete = true;
        p.checkInMaxTimer = (p.checkInMaxTimer || 100) + 25;
        p.checkInTimer = p.checkInMaxTimer;
        soundFX.pickup();
        host.pushFloatingText(p.x, p.y, 'POETRY RESTORED!', '#ffea00');
        host.pushMessage(
          isZh
            ? 'Archie: 多謝你幫我找回詩集！我的簽到時間上限提升了 25 步，計時器已重置。'
            : 'Archie: Thanks for recovering my poetry folio! My check-in timer limit increased by 25 steps and the timer has been reset.',
          'success'
        );
      }
      break;
    }
    default:
      break;
  }

  // Complete side quest if applicable
  if (quest.objectiveId.startsWith('side-')) {
    host.completeSideQuest(quest.objectiveId);
  }

  // Update NPC dialogues AFTER all flags/rewards are written
  host.updateNPCDialogues();

  return true;
}

export function isQuestComplete(host: QuestHost, questId: string): boolean {
  switch (questId) {
    case 'side-hiro':
      return host.ramenQuestComplete;
    case 'side-elena':
      return host.synthwaveTapeActive;
    case 'side-zero-one':
      return host.zeroOneWeaponForged;
    case 'side-vesper':
      return host.graffitiMuralComplete;
    case 'side-archie':
      return host.poetryQuestComplete;
    default:
      const objective = host.missionObjectives.find((o) => o.id === questId);
      return objective ? objective.completed : false;
  }
}

export function getQuestProgress(host: QuestHost, questId: string): number {
  const quest = getQuestDefinition(questId);
  if (!quest) return 0;

  const inventory = host.player.inventory;
  if (!Array.isArray(inventory)) return 0;

  const foundCount = quest.requiredItemIds.filter((itemId) =>
    inventory.some((it: Item) => it?.id === itemId)
  ).length;

  return foundCount / quest.requiredItemIds.length;
}

export function canCompleteQuest(host: QuestHost, questId: string): boolean {
  if (isQuestComplete(host, questId)) return false;

  const quest = getQuestDefinition(questId);
  if (!quest) return false;

  const inventory = host.player.inventory;
  if (!Array.isArray(inventory)) return false;

  const hasAllItems = quest.requiredItemIds.every((itemId) =>
    inventory.some((it: Item) => it?.id === itemId)
  );

  return hasAllItems;
}

export function completeQuest(host: QuestHost, questId: string): boolean {
  if (isQuestComplete(host, questId)) return false;
  if (!canCompleteQuest(host, questId)) return false;

  return checkAndProgress(host, questId);
}

export function getActiveQuests(host: QuestHost): QuestDefinition[] {
  return QUEST_DEFINITIONS.filter((quest) => {
    if (isQuestComplete(host, quest.id)) return false;
    const objective = host.missionObjectives.find((o) => o.id === quest.objectiveId);
    return objective ? objective.discovered : false;
  });
}

export function getCompletedQuests(host: QuestHost): QuestDefinition[] {
  return QUEST_DEFINITIONS.filter((quest) => isQuestComplete(host, quest.id));
}

export function getQuestStates(host: QuestHost): QuestState[] {
  return QUEST_DEFINITIONS.map((quest) => ({
    questId: quest.id,
    discovered: host.missionObjectives.find((o) => o.id === quest.objectiveId)?.discovered ?? false,
    completed: isQuestComplete(host, quest.id),
    progress: getQuestProgress(host, quest.id),
  }));
}

export interface ReversalKeyDefinition {
  id: string;
  titleEn: string;
  titleZh: string;
  sourceStoryLogId: string;
  sourceObjectiveId: string;
  sectorHint: string;
  terminalHint: string;
}

export const REVERSAL_KEY_DEFINITIONS: ReversalKeyDefinition[] = [
  {
    id: 'reversal-key-relay',
    titleEn: 'Reversal Key I — Relay Transport Window',
    titleZh: '逆轉金鑰 Ⅰ — 中繼運輸窗口',
    sourceStoryLogId: 'slate-checkpoint-relay',
    sourceObjectiveId: 'obj-checkpoint-relay',
    sectorHint: 'Checkpoint Relay Annex',
    terminalHint: 'CHECKPOINT_FF',
  },
  {
    id: 'reversal-key-maintenance',
    titleEn: 'Reversal Key II — Underground Maintenance Authorization',
    titleZh: '逆轉金鑰 Ⅱ — 地下維護授權',
    sourceStoryLogId: 'slate-maintenance-override',
    sourceObjectiveId: 'obj-maintenance-clearance',
    sectorHint: 'Sub-Sector 0',
    terminalHint: 'SEWER_PUMP_TERMINAL',
  },
  {
    id: 'reversal-key-synchronizer',
    titleEn: 'Reversal Key III — Factory Synchronizer Intelligence',
    titleZh: '逆轉金鑰 Ⅲ — 製造廠同步器情報',
    sourceStoryLogId: 'slate-factory-worker',
    sourceObjectiveId: 'obj-disrupt-synchronizer',
    sectorHint: 'Sector 2',
    terminalHint: 'TERMINAL_SYNCHRONIZER',
  },
];

export interface ReversalKeyStatus {
  keyId: string;
  titleEn: string;
  titleZh: string;
  available: boolean;
  sourceStoryLogId: string;
  sourceObjectiveId: string;
}

export function getReversalKeyStatuses(host: QuestHost): ReversalKeyStatus[] {
  return REVERSAL_KEY_DEFINITIONS.map((def) => {
    const storyLog = host.storyLogs.find((log) => log.id === def.sourceStoryLogId);
    const objective = host.missionObjectives.find((obj) => obj.id === def.sourceObjectiveId);
    const available = storyLog?.read === true && objective?.completed === true;
    return {
      keyId: def.id,
      titleEn: def.titleEn,
      titleZh: def.titleZh,
      available,
      sourceStoryLogId: def.sourceStoryLogId,
      sourceObjectiveId: def.sourceObjectiveId,
    };
  });
}

export function getAvailableReversalKeys(host: QuestHost): ReversalKeyStatus[] {
  return getReversalKeyStatuses(host).filter((key) => key.available);
}

export function getMissingReversalKeys(host: QuestHost): ReversalKeyStatus[] {
  return getReversalKeyStatuses(host).filter((key) => !key.available);
}

export function hasAllReversalKeys(host: QuestHost): boolean {
  return getReversalKeyStatuses(host).every((key) => key.available);
}

export default {
  QUEST_DEFINITIONS,
  MAIN_STORY_QUEST_DEFINITIONS,
  REVERSAL_KEY_DEFINITIONS,
  getQuestDefinition,
  getQuestByNpcId,
  checkQuestDiscovery,
  discoverMainStoryQuest,
  checkAndProgress,
  isQuestComplete,
  getQuestProgress,
  canCompleteQuest,
  completeQuest,
  getActiveQuests,
  getCompletedQuests,
  getQuestStates,
  getReversalKeyStatuses,
  getAvailableReversalKeys,
  getMissingReversalKeys,
  hasAllReversalKeys,
};
