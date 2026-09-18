import type {
  NPC,
  Item,
  GameMessage,
  Language,
  MissionObjective,
  StoryLog,
  DialogueSession,
} from './types';
import { checkAndProgress, getQuestByNpcId, discoverMainStoryQuest } from './questSystem';
import { soundFX } from './audio';
import { bgm } from './music';
import { createQuantumAnnihilator } from './entities';

export interface DialogueHost {
  checkSideQuestDiscovery: (npcId: string) => void;
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
  activeDialogue: DialogueSession | null;
  pushMessage: (text: string, type: GameMessage['type']) => void;
  pushFloatingText: (x: number, y: number, text: string, color: string) => void;
  gainExp: (amount: number, reason?: string) => void;
  completeSideQuest: (questId: string) => void;
  updateNPCDialogues: () => void;
  render: () => void;
}

export function advanceDialogue(host: DialogueHost): void {
  const activeDialogue = host.activeDialogue;
  if (!activeDialogue) return;

  const npc = activeDialogue.npc;
  host.checkSideQuestDiscovery(npc.id);

  discoverMainStoryQuest(host, { sourceType: 'NPC_DIALOGUE', sourceId: npc.id });

  const isZh = host.language === 'zh';
  const zhDialogue = npc.dialogueZh;
  const list = isZh && Array.isArray(zhDialogue) && zhDialogue.length > 0 ? zhDialogue : (npc.dialogue || []);
  const nextIndex = activeDialogue.textIndex + 1;

  // Check for unclaimed quest rewards
  if (npc.questReward && !npc.rewardClaimed && nextIndex >= list.length - 1) {
    npc.rewardClaimed = true;
    const r = npc.questReward;
    if (r.type === 'HEAL') {
      host.player.hp = Math.min(host.player.maxHp, host.player.hp + r.amount);
      host.pushFloatingText(npc.x, npc.y, '+' + r.amount + ' HP', '#00ff88');
    } else if (r.type === 'ENERGY') {
      host.player.energy = Math.min(host.player.maxEnergy, host.player.energy + r.amount);
      host.pushFloatingText(npc.x, npc.y, '+' + r.amount + ' EN', '#00f0ff');
    } else if (r.type === 'CREDITS') {
      host.player.credits += r.amount;
      host.pushFloatingText(npc.x, npc.y, '+' + r.amount + ' CR', '#ffea00');
    } else if (r.type === 'ITEM') {
      let inventory = host.player.inventory;
      if (!Array.isArray(inventory)) {
        inventory = [];
        host.player.inventory = inventory;
      }
      if (!inventory.some((it: Item) => it?.id === r.item.id)) {
        inventory.push(r.item);
      }
      host.pushFloatingText(npc.x, npc.y, r.item.name, '#00f0ff');
    }
    soundFX.pickup();
    host.pushMessage(r.message, 'success');

    const safehouseObj = host.missionObjectives.find((o) => o.id === 'obj-safehouse');
    if (safehouseObj && !safehouseObj.completed) {
      safehouseObj.completed = true;
      host.pushMessage(
        host.language === 'zh'
          ? '【任務更新】安全屋偵察整裝任務完成！'
          : 'MISSION UPDATE: Safehouse Recon objective complete!',
        'success'
      );
    }
  }

  // Data-driven special turn-in progression via QuestSystem
  if (nextIndex >= list.length - 1) {
    const quest = getQuestByNpcId(npc.id);
    if (quest) {
      checkAndProgress(host, quest.id, { npc });
    }
  }

  if (nextIndex < list.length) {
    activeDialogue.textIndex = nextIndex;
    soundFX.terminal();
  } else {
    host.activeDialogue = null;
    soundFX.pickup();
  }

  host.render();
}

export default {
  advanceDialogue,
};
