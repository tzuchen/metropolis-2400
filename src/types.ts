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
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

export const RobotType = {
  SCOUT_DRONE: 'SCOUT_DRONE',
  SHOCK_ENFORCER: 'SHOCK_ENFORCER',
  HUNTER_KILLER: 'HUNTER_KILLER',
  EXTERMINATOR: 'EXTERMINATOR',
  SERVICE_BOT: 'SERVICE_BOT',
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
  description: string;
  descriptionZh?: string;
  power: number;
  energyCost: number;
  equipped: boolean;
  clearanceRequired: SecurityLevel;
  weaponId?: string;
  isSuppressed?: boolean;
  range?: number;
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

export interface NPC extends Entity {
  role: string;
  roleZh?: string;
  avatarColor?: string;
  dialogue: string[];
  dialogueZh?: string[];
  currentDialogueIndex?: number;
  questReward?: { type: 'HEAL' | 'ENERGY' | 'CREDITS'; amount: number; message: string };
  rewardClaimed?: boolean;
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

export type EndgameChoice = 'OVERLOAD' | 'SUBVERSION' | 'EVACUATION' | 'AWAKEN' | null;
