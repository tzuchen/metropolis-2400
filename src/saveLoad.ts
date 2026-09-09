import type { Hazard, Item, Language, MissionObjective, NPC, Robot, SecurityLevel, StoryLog } from './types';

export interface SaveData {
  version: number;
  timestamp: number;
  language: Language;
  sectorId: string;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    credits: number;
    clearanceLevel: SecurityLevel;
    isDisguised: boolean;
    isWeaponDrawn: boolean;
    consumables?: { medkits: number; batteries: number; empGrenades: number };
    augments?: Record<string, boolean>;
    weapons?: Item[];
    equippedWeapon: Item | null;
    inventory: Item[];
    level?: number;
    exp?: number;
    expToNext?: number;
    skillPoints?: number;
  };
  robots: Array<{
    id: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    isAlive: boolean;
    aiState: string;
    currentPatrolIndex: number;
    stunnedTurns?: number;
  }>;
  hazards: Hazard[];
  npcs: Array<{
    id: string;
    hp: number;
    maxHp: number;
    isAlive: boolean;
    currentDialogueIndex?: number;
    rewardClaimed?: boolean;
    x?: number;
    y?: number;
    homeX?: number;
    homeY?: number;
    wanderRadius?: number;
    facing?: string;
    actionState?: string;
    actionStateZh?: string;
  }>;
  storyLogs: Array<{ id: string; read: boolean }>;
  missionObjectives: Array<{ id: string; completed: boolean }>;
  exploredTiles: string[];
  groundItems: any[];
}

let memoryBackup: SaveData | null = null;

export function hasSavedGame(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem('metropolis_2400_save');
      if (data) return true;
    }
  } catch {}
  return memoryBackup !== null;
}

export function saveGameState(game: any): boolean {
  try {
    const saveData: SaveData = {
      version: 1,
      timestamp: Date.now(),
      language: game.language || 'zh',
      sectorId: (game.player as any)?.currentSectorId || 'sector-1',
      player: {
        x: game.player.x,
        y: game.player.y,
        hp: game.player.hp,
        maxHp: game.player.maxHp,
        energy: game.player.energy,
        maxEnergy: game.player.maxEnergy,
        credits: game.player.credits,
        clearanceLevel: game.player.clearanceLevel,
        isDisguised: game.player.isDisguised,
        isWeaponDrawn: game.player.isWeaponDrawn,
        consumables: game.player.consumables,
        augments: game.player.augments,
        weapons: game.player.weapons,
        equippedWeapon: game.player.equippedWeapon,
        inventory: game.player.inventory,
        level: game.player.level ?? 1,
        exp: game.player.exp ?? 0,
        expToNext: game.player.expToNext ?? 100,
        skillPoints: game.player.skillPoints ?? 0,
      },
      robots: (game.robots || []).map((r: Robot) => ({
        id: r.id,
        x: r.x,
        y: r.y,
        hp: r.hp,
        maxHp: r.maxHp,
        isAlive: r.isAlive,
        aiState: r.aiState,
        currentPatrolIndex: r.currentPatrolIndex,
        stunnedTurns: r.stunnedTurns,
      })),
      hazards: game.hazards || [],
      npcs: (game.npcs || []).map((n: NPC) => ({
        id: n.id,
        hp: n.hp,
        maxHp: n.maxHp,
        isAlive: n.isAlive,
        currentDialogueIndex: n.currentDialogueIndex,
        rewardClaimed: n.rewardClaimed,
        x: n.x,
        y: n.y,
        homeX: n.homeX,
        homeY: n.homeY,
        wanderRadius: n.wanderRadius,
        facing: n.facing,
        actionState: n.actionState,
        actionStateZh: n.actionStateZh,
      })),
      storyLogs: (game.storyLogs || []).map((l: StoryLog) => ({
        id: l.id,
        read: l.read,
      })),
      missionObjectives: (game.missionObjectives || []).map((o: MissionObjective) => ({
        id: o.id,
        completed: o.completed,
      })),
      exploredTiles: Array.from(game.exploredTiles || []),
      groundItems: game.groundItems || [],
    };

    memoryBackup = saveData;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('metropolis_2400_save', JSON.stringify(saveData));
      }
    } catch {}
    return true;
  } catch (err) {
    console.error('saveGameState error:', err);
    return false;
  }
}

export function loadGameState(game: any): boolean {
  try {
    let data: SaveData | null = null;
    try {
      if (typeof localStorage !== 'undefined') {
        const str = localStorage.getItem('metropolis_2400_save');
        if (str) data = JSON.parse(str);
      }
    } catch {}
    if (!data) data = memoryBackup;
    if (!data) return false;

    // Restore sector
    if (data.sectorId === 'sector-2' && typeof game.switchSector === 'function') {
      game.switchSector('sector-2');
    } else if (data.sectorId === 'sector-1' && typeof game.switchSector === 'function') {
      game.switchSector('sector-1');
    }

    // Restore player state
    Object.assign(game.player, data.player);
    (game.player as any).currentSectorId = data.sectorId;

    // Restore robots
    if (Array.isArray(data.robots)) {
      data.robots.forEach((sr) => {
        const rob = (game.robots || []).find((r: any) => r.id === sr.id);
        if (rob) {
          rob.x = sr.x;
          rob.y = sr.y;
          rob.hp = sr.hp;
          rob.maxHp = sr.maxHp;
          rob.isAlive = sr.isAlive;
          rob.aiState = sr.aiState;
          rob.currentPatrolIndex = sr.currentPatrolIndex;
          rob.stunnedTurns = sr.stunnedTurns;
        }
      });
    }

    // Restore hazards
    if (Array.isArray(data.hazards)) {
      game.hazards = data.hazards;
    }

    // Restore NPCs
    if (Array.isArray(data.npcs)) {
      data.npcs.forEach((sn) => {
        const npc = (game.npcs || []).find((n: any) => n.id === sn.id);
        if (npc) {
          npc.hp = sn.hp;
          npc.isAlive = sn.isAlive;
          npc.currentDialogueIndex = sn.currentDialogueIndex;
          npc.rewardClaimed = sn.rewardClaimed;
          if (typeof sn.x === 'number' && typeof sn.y === 'number') {
            npc.x = sn.x;
            npc.y = sn.y;
            npc.homeX = sn.homeX;
            npc.homeY = sn.homeY;
            npc.wanderRadius = sn.wanderRadius;
            npc.facing = sn.facing;
            npc.actionState = sn.actionState;
            npc.actionStateZh = sn.actionStateZh;
          }
        }
      });
    }

    // Restore story logs
    if (Array.isArray(data.storyLogs)) {
      data.storyLogs.forEach((sl) => {
        const log = (game.storyLogs || []).find((l: any) => l.id === sl.id);
        if (log) log.read = sl.read;
      });
    }

    // Restore mission objectives
    if (Array.isArray(data.missionObjectives)) {
      data.missionObjectives.forEach((so) => {
        const obj = (game.missionObjectives || []).find((o: any) => o.id === so.id);
        if (obj) obj.completed = so.completed;
      });
    }

    // Restore explored tiles
    if (Array.isArray(data.exploredTiles)) {
      game.exploredTiles = new Set(data.exploredTiles);
    }

    // Restore ground items
    if (Array.isArray(data.groundItems)) {
      game.groundItems = data.groundItems;
    }

    // Restore language
    if (data.language) {
      game.language = data.language;
    }

    game.isTitleScreen = false;
    if (typeof game.updateFOV === 'function') game.updateFOV();
    return true;
  } catch (err) {
    console.error('loadGameState error:', err);
    return false;
  }
}
