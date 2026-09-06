export const SecurityLevel = {
  CLEAR: 'CLEAR',
  SUSPICIOUS: 'SUSPICIOUS',
  ALERT: 'ALERT',
  LOCKDOWN: 'LOCKDOWN',
} as const;

export type SecurityLevel = (typeof SecurityLevel)[keyof typeof SecurityLevel];

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
  type: ItemType;
  description: string;
  power: number;
  energyCost: number;
  equipped: boolean;
  clearanceRequired: SecurityLevel;
}

export interface Player extends Entity {
  energy: number;
  maxEnergy: number;
  credits: number;
  clearanceLevel: SecurityLevel;
  inventory: Item[];
  equippedWeapon: Item | null;
  equippedShield: Item | null;
  equippedGadget: Item | null;
  isDisguised: boolean;
  isWeaponDrawn: boolean;
}

export type RobotAIState = 'patrol' | 'investigate' | 'chase' | 'attack';

export interface Robot extends Entity {
  robotType: RobotType;
  aiState: RobotAIState;
  patrolPath: Position[];
  currentPatrolIndex: number;
  targetPos: Position | null;
  alertCooldown: number;
  attackPower: number;
  scanRange: number;
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
}
