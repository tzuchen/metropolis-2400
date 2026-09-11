import type { Hazard, Item, Language, MissionObjective, NPC, Robot, SecurityLevel, StoryLog } from './types';

export interface SaveData {
  version: number;
  timestamp: number;
  language: Language;
  sectorId: string;
  checkInAlertActive?: boolean;
  securityLevel?: string;
  ramenQuestComplete?: boolean;
  synthwaveTapeActive?: boolean;
  graffitiMuralComplete?: boolean;
  poetryQuestComplete?: boolean;
  isGearConfiscated?: boolean;
  confiscatedGear?: any;
  isCitadelHordeActive?: boolean;
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
    checkInTimer?: number;
    checkInMaxTimer?: number;
    critChance?: number;
    isCollarDisarmed?: boolean;
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
  missionObjectives: Array<{ id: string; completed: boolean; discovered?: boolean }>;
  exploredTiles: string[];
  groundItems: any[];
  pushableBlocks?: any[];
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
        checkInTimer: game.player.checkInTimer ?? 100,
        checkInMaxTimer: game.player.checkInMaxTimer ?? 100,
        critChance: game.player.critChance ?? 0,
        isCollarDisarmed: game.player.isCollarDisarmed ?? game.isCollarDisarmed ?? false,
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
        discovered: (o as any).discovered,
      })),
      exploredTiles: Array.from(game.exploredTiles || []),
      groundItems: game.groundItems || [],
      pushableBlocks: (game.pushableBlocks || []).map((b: any) => ({
        ...b,
        secretDoor: b.secretDoor ? { ...b.secretDoor } : undefined,
      })),
      checkInAlertActive: game.checkInAlertActive ?? false,
      securityLevel: game.securityLevel,
      graffitiMuralComplete: game.graffitiMuralComplete ?? false,
      poetryQuestComplete: game.poetryQuestComplete ?? false,
      isGearConfiscated: game.isGearConfiscated ?? false,
      confiscatedGear: game.confiscatedGear ?? null,
      isCitadelHordeActive: game.isCitadelHordeActive ?? false,
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

    // Restore only known maps; malformed legacy saves must not desynchronize map and player state.
    const validSectorIds = new Set(['sector-1', 'sector-2', 'sub-sector-0', 'sector-citadel']);
    const canRestoreSector = typeof data.sectorId === 'string'
      && validSectorIds.has(data.sectorId)
      && typeof game.switchSector === 'function';
    if (canRestoreSector) game.switchSector(data.sectorId);

    // Restore player state
    Object.assign(game.player, data.player);
    (game.player as any).currentSectorId = canRestoreSector ? data.sectorId : game.map?.id || 'sector-1';
    if (typeof data.player.isCollarDisarmed === 'boolean') {
      game.player.isCollarDisarmed = data.player.isCollarDisarmed;
      game.isCollarDisarmed = data.player.isCollarDisarmed;
    }
    if (typeof data.player.checkInMaxTimer === 'number') {
      game.player.checkInMaxTimer = data.player.checkInMaxTimer;
    }
    if (typeof data.player.critChance === 'number') {
      game.player.critChance = data.player.critChance;
    }

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
        if (obj) {
          obj.completed = so.completed;
          if (typeof so.discovered === 'boolean') obj.discovered = so.discovered;
        }
      });
    }

    // Ensure side-hiro, side-elena, side-vesper, side-archie are marked completed & discovered
    // when their corresponding quest flags are true (backward compatibility).
    const questFlagToObjectiveId: Array<[boolean | undefined, string]> = [
      [data.ramenQuestComplete, 'side-hiro'],
      [data.synthwaveTapeActive, 'side-elena'],
      [data.graffitiMuralComplete, 'side-vesper'],
      [data.poetryQuestComplete, 'side-archie'],
    ];
    for (const [flag, objectiveId] of questFlagToObjectiveId) {
      if (flag === true) {
        const obj = (game.missionObjectives || []).find((o: any) => o.id === objectiveId);
        if (obj) {
          obj.completed = true;
          obj.discovered = true;
        }
      }
    }

    // Restore explored tiles
    if (Array.isArray(data.exploredTiles)) {
      game.exploredTiles = new Set(data.exploredTiles);
    }

    // Restore ground items
    if (Array.isArray(data.groundItems)) {
      game.groundItems = data.groundItems;
    }

    // Restore pushable blocks
    if (Array.isArray(data.pushableBlocks)) {
      game.pushableBlocks = data.pushableBlocks.map((b: any) => ({
        ...b,
        secretDoor: b.secretDoor ? { ...b.secretDoor } : undefined,
      }));
      for (const block of game.pushableBlocks) {
        if (block.revealed && block.secretDoor) {
          const mapData = (game.map as any).tiles || (game.map as any).grid;
          if (Array.isArray(mapData) && Array.isArray(mapData[block.secretDoor.y])) {
            mapData[block.secretDoor.y][block.secretDoor.x] = block.revealedTile ?? 4;
          }
        }
      }
    }

    // Restore language
    if (data.language) {
      game.language = data.language;
    }

    // Restore check-in alert and security level
    if (typeof data.checkInAlertActive === 'boolean') {
      game.checkInAlertActive = data.checkInAlertActive;
    } else if ((game.player.checkInTimer ?? 100) <= 0) {
      game.checkInAlertActive = true;
    }
    if (data.securityLevel) {
      game.securityLevel = data.securityLevel;
    }

    // Restore quest flags
    if (typeof data.graffitiMuralComplete === 'boolean') {
      game.graffitiMuralComplete = data.graffitiMuralComplete;
    }
    if (typeof data.poetryQuestComplete === 'boolean') {
      game.poetryQuestComplete = data.poetryQuestComplete;
    }

    // Restore gear confiscation state
    if (typeof data.isGearConfiscated === 'boolean') {
      game.isGearConfiscated = data.isGearConfiscated;
    }
    if (data.confiscatedGear !== undefined && data.confiscatedGear !== null) {
      game.confiscatedGear = data.confiscatedGear;
    }

    // Restore citadel horde state
    if (typeof data.isCitadelHordeActive === 'boolean') {
      game.isCitadelHordeActive = data.isCitadelHordeActive;
    }

    game.isTitleScreen = false;
    if (typeof game.updateFOV === 'function') game.updateFOV();
    return true;
  } catch (err) {
    console.error('loadGameState error:', err);
    return false;
  }
}
