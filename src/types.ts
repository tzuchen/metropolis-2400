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
  skillPoints?: number;
  checkInTimer?: number;
  isCollarDisarmed?: boolean;
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
  type: GameMessageType;
}

export interface SectorMap {
  width: number;
  height: number;
  name: string;
  tiles: number[][];
  terminals: Record<string, TerminalData>;
  playerStart: Position;
  id?: string;
  elevatorPos?: Position;
  targetSectorId?: string;
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
  itemType: 'MEDKIT' | 'BATTERY' | 'EMP_GRENADE' | 'KEYCARD' | 'CREDIT_CHIP' | 'DATA_SLATE';
  x: number;
  y: number;
  description: string;
  amount?: number;
  iconColor: string;
  storyLogId?: string;
}

export interface MissionObjective {
  id: string;
  title: string;
  titleZh?: string;
  description: string;
  descriptionZh?: string;
  completed: boolean;
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
