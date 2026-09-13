export const SecurityLevel = {
  CLEAR: 'CLEAR',
  SUSPICIOUS: 'SUSPICIOUS',
  ALERT: 'ALERT',
  LOCKDOWN: 'LOCKDOWN',
} as const;

export type SecurityLevel = (typeof SecurityLevel)[keyof typeof SecurityLevel];

export type Language = 'en' | 'zh';

export const TileType = {
  EMPTY: 0,
  FLOOR: 1,
  WALL: 2,
  DOOR_CLOSED: 3,
  DOOR_OPEN: 4,
  FORCEFIELD: 5,
  TERMINAL: 6,
  REBEL_CACHE: 7,
  EXIT: 8,
  ELEVATOR: 9,
  CONVEYOR: 10,
  TURRET: 11,
  BIO_TREE: 12,
  PARK_WATER: 13,
  VENDOR_STALL: 14,
  SERVER_RACK: 15,
  STEAM_VENT: 16,
  REBEL_BARRICADE: 17,
  LETTER_A: 101,
  LETTER_B: 102,
  LETTER_C: 103,
  LETTER_D: 104,
  LETTER_E: 105,
  LETTER_F: 106,
  LETTER_G: 107,
  LETTER_H: 108,
  LETTER_I: 109,
  LETTER_J: 110,
  LETTER_K: 111,
  LETTER_L: 112,
  LETTER_M: 113,
  LETTER_N: 114,
  LETTER_O: 115,
  LETTER_P: 116,
  LETTER_Q: 117,
  LETTER_R: 118,
  LETTER_S: 119,
  LETTER_T: 120,
  LETTER_U: 121,
  LETTER_V: 122,
  LETTER_W: 123,
  LETTER_X: 124,
  LETTER_Y: 125,
  LETTER_Z: 126,
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

export interface TileProperties {
  walkable: boolean;
  transparent: boolean;
  name: string;
}

export const TileProperties: Record<TileType, TileProperties> = {
  [TileType.EMPTY]: { walkable: false, transparent: false, name: 'EMPTY' },
  [TileType.FLOOR]: { walkable: true, transparent: true, name: 'FLOOR' },
  [TileType.WALL]: { walkable: false, transparent: false, name: 'WALL' },
  [TileType.DOOR_CLOSED]: { walkable: false, transparent: false, name: 'DOOR_CLOSED' },
  [TileType.DOOR_OPEN]: { walkable: true, transparent: true, name: 'DOOR_OPEN' },
  [TileType.FORCEFIELD]: { walkable: false, transparent: true, name: 'FORCEFIELD' },
  [TileType.TERMINAL]: { walkable: false, transparent: false, name: 'TERMINAL' },
  [TileType.REBEL_CACHE]: { walkable: true, transparent: true, name: 'REBEL_CACHE' },
  [TileType.EXIT]: { walkable: false, transparent: true, name: 'EXIT' },
  [TileType.ELEVATOR]: { walkable: true, transparent: true, name: 'ELEVATOR' },
  [TileType.CONVEYOR]: { walkable: true, transparent: true, name: 'CONVEYOR' },
  [TileType.TURRET]: { walkable: false, transparent: true, name: 'TURRET' },
  [TileType.BIO_TREE]: { walkable: false, transparent: false, name: 'BIO_TREE' },
  [TileType.PARK_WATER]: { walkable: false, transparent: true, name: 'PARK_WATER' },
  [TileType.VENDOR_STALL]: { walkable: false, transparent: false, name: 'VENDOR_STALL' },
  [TileType.SERVER_RACK]: { walkable: false, transparent: false, name: 'SERVER_RACK' },
  [TileType.STEAM_VENT]: { walkable: true, transparent: true, name: 'STEAM_VENT' },
  [TileType.REBEL_BARRICADE]: { walkable: false, transparent: true, name: 'REBEL_BARRICADE' },
  [TileType.LETTER_A]: { walkable: false, transparent: true, name: 'LETTER_A' },
  [TileType.LETTER_B]: { walkable: false, transparent: true, name: 'LETTER_B' },
  [TileType.LETTER_C]: { walkable: false, transparent: true, name: 'LETTER_C' },
  [TileType.LETTER_D]: { walkable: false, transparent: true, name: 'LETTER_D' },
  [TileType.LETTER_E]: { walkable: false, transparent: true, name: 'LETTER_E' },
  [TileType.LETTER_F]: { walkable: false, transparent: true, name: 'LETTER_F' },
  [TileType.LETTER_G]: { walkable: false, transparent: true, name: 'LETTER_G' },
  [TileType.LETTER_H]: { walkable: false, transparent: true, name: 'LETTER_H' },
  [TileType.LETTER_I]: { walkable: false, transparent: true, name: 'LETTER_I' },
  [TileType.LETTER_J]: { walkable: false, transparent: true, name: 'LETTER_J' },
  [TileType.LETTER_K]: { walkable: false, transparent: true, name: 'LETTER_K' },
  [TileType.LETTER_L]: { walkable: false, transparent: true, name: 'LETTER_L' },
  [TileType.LETTER_M]: { walkable: false, transparent: true, name: 'LETTER_M' },
  [TileType.LETTER_N]: { walkable: false, transparent: true, name: 'LETTER_N' },
  [TileType.LETTER_O]: { walkable: false, transparent: true, name: 'LETTER_O' },
  [TileType.LETTER_P]: { walkable: false, transparent: true, name: 'LETTER_P' },
  [TileType.LETTER_Q]: { walkable: false, transparent: true, name: 'LETTER_Q' },
  [TileType.LETTER_R]: { walkable: false, transparent: true, name: 'LETTER_R' },
  [TileType.LETTER_S]: { walkable: false, transparent: true, name: 'LETTER_S' },
  [TileType.LETTER_T]: { walkable: false, transparent: true, name: 'LETTER_T' },
  [TileType.LETTER_U]: { walkable: false, transparent: true, name: 'LETTER_U' },
  [TileType.LETTER_V]: { walkable: false, transparent: true, name: 'LETTER_V' },
  [TileType.LETTER_W]: { walkable: false, transparent: true, name: 'LETTER_W' },
  [TileType.LETTER_X]: { walkable: false, transparent: true, name: 'LETTER_X' },
  [TileType.LETTER_Y]: { walkable: false, transparent: true, name: 'LETTER_Y' },
  [TileType.LETTER_Z]: { walkable: false, transparent: true, name: 'LETTER_Z' },
};

export const RobotType = {
  SCOUT_DRONE: 'SCOUT_DRONE',
  SHOCK_ENFORCER: 'SHOCK_ENFORCER',
  HUNTER_KILLER: 'HUNTER_KILLER',
  EXTERMINATOR: 'EXTERMINATOR',
  SERVICE_BOT: 'SERVICE_BOT',
  SECURITY_BOT: 'SECURITY_BOT',
} as const;

export type RobotType = (typeof RobotType)[keyof typeof RobotType];

export const ItemType = {
  WEAPON: 'WEAPON',
  SHIELD: 'SHIELD',
  GADGET: 'GADGET',
  KEYCARD: 'KEYCARD',
  CONSUMABLE: 'CONSUMABLE',
  CYBERWARE: 'CYBERWARE',
} as const;

export type ItemType = (typeof ItemType)[keyof typeof ItemType];

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isAlive: boolean;
}

export interface Item {
  id: string;
  name: string;
  nameZh?: string;
  type: ItemType;
  itemType?: string;
  description: string;
  descriptionZh?: string;
  power: number;
  energyCost: number;
  equipped: boolean;
  clearanceRequired: SecurityLevel;
  weaponId?: string;
  isSuppressed?: boolean;
  range?: number;
  iconColor?: string;
  overclockLevel?: number;
  damage?: number;
}

export interface Player extends Entity {
  energy: number;
  maxEnergy: number;
  credits: number;
  clearanceLevel: SecurityLevel;
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
}

export type RobotAIState = 'idle' | 'patrol' | 'investigate' | 'chase' | 'attack';

export interface Robot extends Entity {
  robotType: RobotType;
  aiState: RobotAIState;
  patrolPath: Position[];
  currentPatrolIndex: number;
  targetPos: Position | null;
  alertCooldown: number;
  attackPower: number;
  scanRange: number;
  attackRange?: number;
  stunnedTurns?: number;
  pursuitTurns?: number;
  phase2Overclock?: boolean;
}

export interface TerminalData {
  id: string;
  name: string;
  clearanceNeeded: SecurityLevel;
  isHacked: boolean;
  logs: string[];
  forcefieldToDisable?: string;
  doorToUnlock?: string;
  position?: Position;
  x?: number;
  y?: number;
}

export type GameMessageType = 'info' | 'warning' | 'danger' | 'success';

export interface GameMessage {
  text: string;
  message?: string;
  type: GameMessageType;
}

export interface SectorMap {
  width: number;
  height: number;
  name: string;
  tiles: number[][];
  grid?: number[][];
  terminals: Record<string, TerminalData>;
  playerStart: Position;
  id?: string;
  elevatorPos?: Position;
  targetSectorId?: string;
  pushableBlocks?: PushableBlock[];
}

export type QuestReward = { type: 'HEAL' | 'ENERGY' | 'CREDITS'; amount: number; message: string; item?: any; } | { type: 'ITEM'; amount?: number; message: string; item: any; };

export interface NPC extends Entity {
  role: string;
  roleZh?: string;
  avatarColor?: string;
  dialogue: string[];
  dialogueZh?: string[];
  currentDialogueIndex?: number;
  questReward?: QuestReward;
  rewardClaimed?: boolean;
  homeX?: number;
  homeY?: number;
  wanderRadius?: number;
  facing?: 'up' | 'down' | 'left' | 'right';
  actionState?: string;
  actionStateZh?: string;
  ambientBarks?: { en: string; zh: string }[];
  currentBark?: { en: string; zh: string; expiresAt?: number };
  barkTimer?: number;
  lastMoveTurn?: number;
}

export interface DialogueSession {
  npc: NPC;
  textIndex: number;
}

export interface GroundItem {
  id: string;
  name: string;
  itemType: 'MEDKIT' | 'BATTERY' | 'EMP_GRENADE' | 'KEYCARD' | 'CREDIT_CHIP' | 'DATA_SLATE' | 'WEAPON';
  x: number;
  y: number;
  description: string;
  amount?: number;
  iconColor: string;
  storyLogId?: string;
  weaponId?: string;
  power?: number;
}

export interface MissionObjective {
  id: string;
  title: string;
  titleZh?: string;
  description: string;
  descriptionZh?: string;
  completed: boolean;
  isSideQuest?: boolean;
  discovered?: boolean;
}

export interface StoryLog {
  id: string;
  title: string;
  titleZh?: string;
  author: string;
  timestamp: string;
  content: string[];
  contentZh?: string[];
  read: boolean;
}

export interface CyberwareAugment {
  id: string;
  name: string;
  cost: number;
  description: string;
  installed: boolean;
}

export interface FloatingText {
  id: string;
  text: string;
  message?: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  dy: number;
}

export interface Hazard {
  id: string;
  x: number;
  y: number;
  type: 'PLASMA_CANISTER' | 'STEAM_VENT';
  hp: number;
  exploded: boolean;
}

export interface TerminalCommandResult {
  success?: boolean;
  message?: string;
  checkedIn?: boolean;
  disarmCollar?: boolean;
  output?: string;
  disabledForcefield?: string;
  endgameChoice?: string;
  shouldExit?: boolean;
  victory?: boolean;
  clearedAlert?: boolean;
  energyGain?: number;
}

export type EndgameChoice = 'OVERLOAD' | 'SUBVERSION' | 'EVACUATION' | 'AWAKEN' | null;

export interface LaserBeam {
  from: Position;
  to: Position;
  color: string;
  width?: number;
  beamType?: 'LASER' | 'ELEC' | 'PLASMA' | 'NEEDLE' | string;
  createdAt?: number;
  duration?: number;
  targetRobot?: Robot;
}

export interface PushableBlock {
  id: string;
  x: number;
  y: number;
  initialX: number;
  initialY: number;
  name: string;
  nameZh: string;
  sectorId: string;
  revealed?: boolean;
  color?: string;
  blockType?: 'disguised_wall' | 'crate' | 'server_rack';
  secretSurprise?: {
    type: 'item' | 'credits' | 'energy';
    amount?: number;
    item?: GroundItem;
    claimed?: boolean;
    messageZh?: string;
    messageEn?: string;
  };
  hp?: number;
  maxHp?: number;
  secretDoor?: {
    x: number;
    y: number;
    revealedTile: TileType;
    originalTile?: TileType;
    messageZh?: string;
    messageEn?: string;
  };
}
