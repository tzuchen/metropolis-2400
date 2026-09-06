import type {
  Player,
  Robot,
  RobotType,
  Item,
  ItemType,
  Position,
  SecurityLevel,
} from './types';

const LASER_PISTOL_ID = 'laser-pistol';
const PERSONAL_SHIELD_ID = 'personal-shield';
const HOLO_DISGUISE_ID = 'holo-disguise';
const HACKER_ID = 'hacker-id';

const WEAPON_TYPE = 'weapon' as unknown as ItemType;
const SHIELD_TYPE = 'shield' as unknown as ItemType;
const GADGET_TYPE = 'gadget' as unknown as ItemType;

function clonePosition(pos: Position): Position {
  return { ...pos } as Position;
}

function createItem(
  id: string,
  name: string,
  type: ItemType,
  options: { power?: number; energyCost?: number; equipped?: boolean; description?: string } = {}
): Item {
  return {
    id,
    name,
    type,
    power: options.power ?? 0,
    energyCost: options.energyCost ?? 0,
    equipped: options.equipped ?? false,
    description: options.description ?? '',
  } as unknown as Item;
}

function lowSecurity(): SecurityLevel {
  return 'low' as unknown as SecurityLevel;
}

export function createPlayer(startPos: Position): Player {
  const laserPistol = createItem(
    LASER_PISTOL_ID,
    'Laser Pistol',
    WEAPON_TYPE,
    {
      power: 20,
      energyCost: 5,
      equipped: true,
      description: 'A futuristic pistol that fires concentrated laser beams.',
    }
  );

  const personalShield = createItem(
    PERSONAL_SHIELD_ID,
    'Personal Shield',
    SHIELD_TYPE,
    {
      power: 15,
      energyCost: 10,
      equipped: true,
      description: 'A small personal energy shield that absorbs damage.',
    }
  );

  const holoDisguise = createItem(
    HOLO_DISGUISE_ID,
    'Holo Disguise',
    GADGET_TYPE,
    {
      power: 10,
      energyCost: 8,
      equipped: true,
      description: 'Projects a holographic disguise to blend into crowds.',
    }
  );

  const hackerId = createItem(
    HACKER_ID,
    'Hacker ID',
    GADGET_TYPE,
    {
      power: 5,
      energyCost: 0,
      equipped: false,
      description: 'An identification badge that grants access to hacking terminals.',
    }
  );

  return {
    id: 'player',
    name: 'Player',
    x: startPos.x,
    y: startPos.y,
    hp: 100,
    maxHp: 100,
    isAlive: true,
    energy: 100,
    maxEnergy: 100,
    credits: 0,
    clearanceLevel: lowSecurity(),
    inventory: [laserPistol, personalShield, holoDisguise, hackerId],
    equippedWeapon: laserPistol,
    equippedShield: personalShield,
    equippedGadget: holoDisguise,
    isDisguised: false,
    isWeaponDrawn: false,
    consumables: {
      medkits: 1,
      batteries: 1,
      empGrenades: 1,
    },
  } as unknown as Player;
}

export function createRobot(type: RobotType, startPos: Position, patrolPath?: Position[]): Robot {
  const statsByType: Record<string, { hp: number; attackPower: number; scanRange: number }> = {
    SCOUT_DRONE: { hp: 30, attackPower: 5, scanRange: 6 },
    SHOCK_ENFORCER: { hp: 60, attackPower: 15, scanRange: 5 },
    HUNTER_KILLER: { hp: 100, attackPower: 25, scanRange: 8 },
    EXTERMINATOR: { hp: 200, attackPower: 40, scanRange: 7 },
    SERVICE_BOT: { hp: 20, attackPower: 0, scanRange: 2 },
  };

  const key = String(type).toUpperCase();
  const stats = statsByType[key] ?? { hp: 50, attackPower: 10, scanRange: 5 };
  const path = (patrolPath ?? []).map(clonePosition);
  const targetPos = path.length > 0 ? clonePosition(path[0]) : null;

  return {
    id: `robot-${String(type)}`,
    name: String(type),
    x: startPos.x,
    y: startPos.y,
    hp: stats.hp,
    maxHp: stats.hp,
    isAlive: true,
    robotType: type,
    aiState: 'patrol' as Robot['aiState'],
    patrolPath: path,
    currentPatrolIndex: 0,
    targetPos,
    alertCooldown: 0,
    attackPower: stats.attackPower,
    scanRange: stats.scanRange,
    stunnedTurns: 0,
  } as unknown as Robot;
}

export function toggleWeaponDraw(player: Player): boolean {
  player.isWeaponDrawn = !player.isWeaponDrawn;
  return player.isWeaponDrawn;
}

export function toggleDisguise(player: Player): boolean {
  player.isDisguised = !player.isDisguised;
  return player.isDisguised;
}

export function damageEntity(entity: { hp: number; isAlive: boolean }, amount: number): number {
  if (!entity.isAlive || !Number.isFinite(amount) || amount <= 0) {
    return entity.hp;
  }

  entity.hp = Math.max(0, entity.hp - amount);
  entity.isAlive = entity.hp > 0;
  return entity.hp;
}

export function consumeEnergy(player: Player, amount: number): boolean {
  if (!Number.isFinite(amount) || amount < 0) {
    return false;
  }

  if (player.energy < amount) {
    return false;
  }

  player.energy -= amount;
  return true;
}
