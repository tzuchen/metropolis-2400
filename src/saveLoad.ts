import type { ConfiscatedGear, GroundItem, Hazard, Item, Language, MissionObjective, NPC, PushableBlock, Robot, SecurityLevel, StoryLog } from './types';
import { createPlayer } from './entities';
import { JournalEntry, loadJournalEntries, JOURNAL_STORAGE_KEY, memoryJournalBackup } from './journalSystem';
import { buildSector1Map } from './map';
import { createSectorRobots, createSectorNPCs, createSectorStoryLogs, createSectorItems, createSectorObjectives } from './worldBuilder';

export interface SaveHost {
  language?: Language;
  player: any;
  map?: any;
  robots?: Robot[];
  hazards?: Hazard[];
  npcs?: NPC[];
  storyLogs?: StoryLog[];
  groundItems?: GroundItem[];
  missionObjectives?: MissionObjective[];
  pushableBlocks?: PushableBlock[];
  sectorGroundItems?: Record<string, GroundItem[]>;
  sectorPushableBlocks?: Record<string, PushableBlock[]>;
  isCollarDisarmed?: boolean;
  checkInAlertActive?: boolean;
  securityLevel?: string;
  switchSector?: (sectorId: string) => void;
  [key: string]: any;
}

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
  confiscatedGear?: ConfiscatedGear | null;
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
  groundItems: GroundItem[];
  pushableBlocks?: PushableBlock[];
  journalEntries?: JournalEntry[];
}

let memoryBackup: SaveData | null = null;

/**
 * Private, safe core-save shape guard.
 *
 * Verifies the minimal core structure required before a save is migrated and
 * applied to a live game. It intentionally only inspects core fields and never
 * throws: any null, primitive, empty object, missing/invalid core value, or
 * malformed core array causes it to return false.
 */
function isCoreSaveShape(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  const player = d.player;
  if (typeof player !== 'object' || player === null) return false;
  const p = player as Record<string, unknown>;

  // Core numeric player fields
  if (typeof p.x !== 'number' || typeof p.y !== 'number') return false;
  if (typeof p.hp !== 'number' || typeof p.maxHp !== 'number') return false;
  if (typeof p.energy !== 'number' || typeof p.maxEnergy !== 'number') return false;
  if (typeof p.credits !== 'number') return false;

  // Core string / boolean player fields
  if (typeof p.clearanceLevel !== 'string') return false;
  if (typeof p.isDisguised !== 'boolean' || typeof p.isWeaponDrawn !== 'boolean') return false;

  // Core collection fields
  if (!Array.isArray(p.inventory)) return false;
  if (p.equippedWeapon !== null && (typeof p.equippedWeapon !== 'object' || p.equippedWeapon === null)) return false;

  // Core top-level arrays
  if (!Array.isArray(d.robots)) return false;
  if (!Array.isArray(d.hazards)) return false;
  if (!Array.isArray(d.npcs)) return false;
  if (!Array.isArray(d.storyLogs)) return false;
  if (!Array.isArray(d.missionObjectives)) return false;
  if (!Array.isArray(d.exploredTiles)) return false;
  if (!Array.isArray(d.groundItems)) return false;
  if (d.pushableBlocks !== undefined && !Array.isArray(d.pushableBlocks)) return false;

  return true;
}

export function validateSaveData(data: unknown): data is SaveData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d.version !== 'number') return false;
  if (typeof d.timestamp !== 'number') return false;
  if (typeof d.language !== 'string') return false;
  if (typeof d.sectorId !== 'string') return false;
  if (typeof d.player !== 'object' || d.player === null) return false;
  const p = d.player as Record<string, unknown>;
  if (typeof p.x !== 'number' || typeof p.y !== 'number') return false;
  if (typeof p.hp !== 'number' || typeof p.maxHp !== 'number') return false;
  if (typeof p.energy !== 'number' || typeof p.maxEnergy !== 'number') return false;
  if (typeof p.credits !== 'number') return false;
  if (typeof p.clearanceLevel !== 'string') return false;
  if (typeof p.isDisguised !== 'boolean' || typeof p.isWeaponDrawn !== 'boolean') return false;
  if (!Array.isArray(p.inventory)) return false;
  if (p.equippedWeapon !== null && (typeof p.equippedWeapon !== 'object' || p.equippedWeapon === null)) return false;
  if (!Array.isArray(d.robots)) return false;
  if (!Array.isArray(d.hazards)) return false;
  if (!Array.isArray(d.npcs)) return false;
  if (!Array.isArray(d.storyLogs)) return false;
  if (!Array.isArray(d.missionObjectives)) return false;
  if (!Array.isArray(d.exploredTiles)) return false;
  if (!Array.isArray(d.groundItems)) return false;
  if (d.pushableBlocks !== undefined && !Array.isArray(d.pushableBlocks)) return false;
  return true;
}

export function migrateSaveData(raw: unknown): SaveData {
  const defaults: SaveData = {
    version: 1,
    timestamp: Date.now(),
    language: 'zh',
    sectorId: 'sector-1',
    checkInAlertActive: false,
    securityLevel: 'CLEAR',
    ramenQuestComplete: false,
    synthwaveTapeActive: false,
    graffitiMuralComplete: false,
    poetryQuestComplete: false,
    isGearConfiscated: false,
    confiscatedGear: null,
    isCitadelHordeActive: false,
    player: {
      x: 0,
      y: 0,
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      credits: 0,
      clearanceLevel: 'CLEAR',
      isDisguised: false,
      isWeaponDrawn: false,
      consumables: { medkits: 0, batteries: 0, empGrenades: 0 },
      augments: {},
      weapons: [],
      equippedWeapon: null,
      inventory: [],
      level: 1,
      exp: 0,
      expToNext: 100,
      skillPoints: 0,
      checkInTimer: 100,
      checkInMaxTimer: 100,
      critChance: 0,
      isCollarDisarmed: false,
    },
    robots: [],
    hazards: [],
    npcs: [],
    storyLogs: [],
    missionObjectives: [],
    exploredTiles: [],
    groundItems: [],
    pushableBlocks: [],
  };

  if (typeof raw !== 'object' || raw === null) return defaults;
  const r = raw as Record<string, unknown>;

  const migrated: SaveData = {
    version: typeof r.version === 'number' ? r.version : 1,
    timestamp: typeof r.timestamp === 'number' ? r.timestamp : Date.now(),
    language: (r.language === 'en' || r.language === 'zh') ? r.language : 'zh',
    sectorId: typeof r.sectorId === 'string' ? r.sectorId : 'sector-1',
    checkInAlertActive: typeof r.checkInAlertActive === 'boolean' ? r.checkInAlertActive : false,
    securityLevel: typeof r.securityLevel === 'string' ? r.securityLevel : 'CLEAR',
    ramenQuestComplete: typeof r.ramenQuestComplete === 'boolean' ? r.ramenQuestComplete : false,
    synthwaveTapeActive: typeof r.synthwaveTapeActive === 'boolean' ? r.synthwaveTapeActive : false,
    graffitiMuralComplete: typeof r.graffitiMuralComplete === 'boolean' ? r.graffitiMuralComplete : false,
    poetryQuestComplete: typeof r.poetryQuestComplete === 'boolean' ? r.poetryQuestComplete : false,
    isGearConfiscated: typeof r.isGearConfiscated === 'boolean' ? r.isGearConfiscated : false,
    confiscatedGear: (r.confiscatedGear && typeof r.confiscatedGear === 'object') ? r.confiscatedGear as ConfiscatedGear : null,
    isCitadelHordeActive: typeof r.isCitadelHordeActive === 'boolean' ? r.isCitadelHordeActive : false,
    player: { ...defaults.player },
    robots: Array.isArray(r.robots) ? r.robots as SaveData['robots'] : [],
    hazards: Array.isArray(r.hazards) ? r.hazards as Hazard[] : [],
    npcs: Array.isArray(r.npcs) ? r.npcs as SaveData['npcs'] : [],
    storyLogs: Array.isArray(r.storyLogs) ? r.storyLogs as SaveData['storyLogs'] : [],
    missionObjectives: Array.isArray(r.missionObjectives) ? r.missionObjectives as SaveData['missionObjectives'] : [],
    exploredTiles: Array.isArray(r.exploredTiles) ? r.exploredTiles as string[] : [],
    groundItems: Array.isArray(r.groundItems) ? r.groundItems as GroundItem[] : [],
    pushableBlocks: Array.isArray(r.pushableBlocks) ? r.pushableBlocks as PushableBlock[] : [],
  };

  if (typeof r.player === 'object' && r.player !== null) {
    const p = r.player as Record<string, unknown>;
    const mp = migrated.player;
    if (typeof p.x === 'number') mp.x = p.x;
    if (typeof p.y === 'number') mp.y = p.y;
    if (typeof p.hp === 'number') mp.hp = p.hp;
    if (typeof p.maxHp === 'number') mp.maxHp = p.maxHp;
    if (typeof p.energy === 'number') mp.energy = p.energy;
    if (typeof p.maxEnergy === 'number') mp.maxEnergy = p.maxEnergy;
    if (typeof p.credits === 'number') mp.credits = p.credits;
    if (typeof p.clearanceLevel === 'string') mp.clearanceLevel = p.clearanceLevel as SecurityLevel;
    if (typeof p.isDisguised === 'boolean') mp.isDisguised = p.isDisguised;
    if (typeof p.isWeaponDrawn === 'boolean') mp.isWeaponDrawn = p.isWeaponDrawn;
    if (p.consumables && typeof p.consumables === 'object') mp.consumables = p.consumables as SaveData['player']['consumables'];
    if (p.augments && typeof p.augments === 'object') mp.augments = p.augments as Record<string, boolean>;
    if (Array.isArray(p.weapons)) mp.weapons = p.weapons as Item[];
    if (p.equippedWeapon === null || (typeof p.equippedWeapon === 'object' && p.equippedWeapon !== null)) mp.equippedWeapon = p.equippedWeapon as Item | null;
    if (Array.isArray(p.inventory)) mp.inventory = p.inventory as Item[];
    if (typeof p.level === 'number') mp.level = p.level;
    if (typeof p.exp === 'number') mp.exp = p.exp;
    if (typeof p.expToNext === 'number') mp.expToNext = p.expToNext;
    if (typeof p.skillPoints === 'number') mp.skillPoints = p.skillPoints;
    if (typeof p.checkInTimer === 'number') mp.checkInTimer = p.checkInTimer;
    if (typeof p.checkInMaxTimer === 'number') mp.checkInMaxTimer = p.checkInMaxTimer;
    if (typeof p.critChance === 'number') mp.critChance = p.critChance;
    if (typeof p.isCollarDisarmed === 'boolean') mp.isCollarDisarmed = p.isCollarDisarmed;
  }

  return migrated;
}

export function hasSavedGame(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem('metropolis_2400_save');
      if (data) return true;
    }
  } catch {}
  return memoryBackup !== null;
}

export function saveGameState(game: SaveHost): boolean {
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
      pushableBlocks: (game.pushableBlocks || []).map((b: PushableBlock) => ({
        ...b,
        secretDoor: b.secretDoor ? { ...b.secretDoor } : undefined,
      })),
      journalEntries: game.journalEntries && game.journalEntries.length > 0 ? game.journalEntries : loadJournalEntries(),
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

export function loadGameState(game: SaveHost): boolean {
  try {
    let raw: unknown = null;
    try {
      if (typeof localStorage !== 'undefined') {
        const str = localStorage.getItem('metropolis_2400_save');
        if (str) raw = JSON.parse(str);
      }
    } catch {}
    if (!raw) raw = memoryBackup;
    if (!raw) return false;

    // Reject malformed core saves before migration so no game state is mutated.
    if (!isCoreSaveShape(raw)) return false;

    const migrated = migrateSaveData(raw);
    if (!validateSaveData(migrated)) return false;
    const data: SaveData = migrated;

    // Restore only known maps; malformed legacy saves must not desynchronize map and player state.
    const validSectorIds = new Set(['sector-1', 'sector-2', 'sub-sector-0', 'sector-citadel']);
    const canRestoreSector = typeof data.sectorId === 'string'
      && validSectorIds.has(data.sectorId)
      && typeof game.switchSector === 'function';
    if (canRestoreSector && game.switchSector) game.switchSector(data.sectorId);

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
          rob.aiState = sr.aiState as any;
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
            npc.facing = sn.facing as any;
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
            mapData[block.secretDoor.y][block.secretDoor.x] = (block as any).revealedTile ?? block.secretDoor.revealedTile ?? 4;
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

    // Self-healing: repair lost weapons if gear was not confiscated
    if (!game.isGearConfiscated && (!Array.isArray(game.player.weapons) || game.player.weapons.length === 0)) {
      const defaultPlayer = createPlayer({ x: game.player.x, y: game.player.y });
      game.player.weapons = defaultPlayer.weapons;
      game.player.equippedWeapon = defaultPlayer.equippedWeapon;
    }

    // Self-healing: repair lost weapons in confiscated gear
    if (game.isGearConfiscated && game.confiscatedGear && (!Array.isArray(game.confiscatedGear.weapons) || game.confiscatedGear.weapons.length === 0)) {
      const defaultPlayer = createPlayer({ x: game.player.x, y: game.player.y });
      game.confiscatedGear.weapons = defaultPlayer.weapons;
    }

    // Restore citadel horde state
    if (typeof data.isCitadelHordeActive === 'boolean') {
      game.isCitadelHordeActive = data.isCitadelHordeActive;
    }

    // Restore journal entries
    if (Array.isArray(data.journalEntries) && data.journalEntries.length > 0) {
      const current = loadJournalEntries();
      const currentIds = new Set(current.map((e: JournalEntry) => e.id));
      let merged = false;
      for (const entry of data.journalEntries) {
        if (!currentIds.has(entry.id)) {
          current.push(entry);
          merged = true;
        }
      }
      if (merged) {
        current.sort((a, b) => b.timestamp - a.timestamp);
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(current));
          } catch {}
        }
        memoryJournalBackup.length = 0;
        memoryJournalBackup.push(...current);
      }
      game.journalEntries = current;
    } else {
      game.journalEntries = loadJournalEntries();
    }

    game.isTitleScreen = false;
    if (typeof game.updateFOV === 'function') game.updateFOV();
    return true;
  } catch (err) {
    console.error('loadGameState error:', err);
    return false;
  }
}

export function resetGameSession(host: any): void {
  host.journalEntries = loadJournalEntries();
  host.isTitleStoryOpen = false;
  host.titleStoryScrollOffset = 0;
  host.defeatCutscene = null;
  host.isGearConfiscated = false;
  host.confiscatedGear = null;
  host.map = buildSector1Map();
  host.player = createPlayer(host.map.playerStart);
  host.robots = createSectorRobots();
  host.npcs = createSectorNPCs();
  host.storyLogs = createSectorStoryLogs();
  host.groundItems = createSectorItems();
  host.missionObjectives = createSectorObjectives();
  host.isInventoryOpen = false;
  host.isMissionLogOpen = false;
  host.isStoryArchiveOpen = false;
  host.activeStoryLog = null;
  host.isManualOpen = false;
  host.isAugmentShopOpen = false;
  host.isBigMapOpen = false;
  host.isJournalOpen = false;
  host.activeBreachSession = null;
  host.securityLevel = 'CLEAR' as SecurityLevel;
  host.messages = [];
  host.floatingTexts = [];
  if (typeof host.pushMessage === 'function') {
    host.pushMessage('OPERATION PROMETHEUS: Protocol restarted. Operative Raven deployed.', 'info');
    host.pushMessage(
      host.language === 'zh'
        ? '【系統提示】神經視覺尚未校準，請移動一步以同步光學感測器。'
        : 'SYSTEM: Neural vision not yet calibrated. Move one step to synchronize optical sensors.',
      'info'
    );
  }
  host.activeTerminal = null;
  host.activeDialogue = null;
  host.laserBeams = [];
  host.terminalInputBuffer = '';
  host.victory = false;
  host.endgameChoice = null;
  if (Array.isArray(host.citadelAirdrops)) host.citadelAirdrops.length = 0;
  host.isCitadelHordeActive = false;
  host.isIntroBriefingOpen = false;
  host.introBriefingScrollOffset = 0;
  if (host.renderer) {
    host.renderer.isTitleStoryOpen = false;
    host.renderer.isManualOpen = false;
    host.renderer.isBigMapOpen = false;
    host.renderer.activeBreachSession = null;
    host.renderer.storyArchiveSelectedIndex = 0;
    host.renderer.defeatCutscene = null;
  }
}
