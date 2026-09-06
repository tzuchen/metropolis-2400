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

function mediumSecurity(): SecurityLevel {
  return 'medium' as unknown as SecurityLevel;
}

function highSecurity(): SecurityLevel {
  return 'high' as unknown as SecurityLevel;
}

export function createPlayer(startPos: Position): Player {
  return {
    id: 'player',
    position: clonePosition(startPos),
    health: 100,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    inventory: [
      createItem(LASER_PISTOL_ID, 'Laser Pistol', 'weapon' as unknown as ItemType, {
        power: 20,
        energyCost: 5,
        equipped: true,
        description: 'A futuristic pistol that fires concentrated laser beams.',
      }),
      createItem(PERSONAL_SHIELD_ID, 'Personal Shield', 'shield' as unknown as ItemType, {
        power: 15,
        energyCost: 10,
        equipped: true,
        description: 'A small personal energy shield that absorbs damage.',
      }),
      createItem(HOLO_DISGUISE_ID, 'Holo Disguise', 'tool' as unknown as ItemType, {
        power: 10,
        energyCost: 8,
        equipped: false,
        description: 'Projects a holographic disguise to blend into crowds.',
      }),
      createItem(HACKER_ID, 'Hacker ID', 'tool' as unknown as ItemType, {
        power: 5,
        energyCost: 0,
        equipped: false,
        description: 'An identification badge that grants access to hacking terminals.',
      }),
    ],
    securityLevel: lowSecurity(),
  } as unknown as Player;
}

export function createRobot(type: RobotType, startPos: Position): Robot {
  const securityByType: Record<string, SecurityLevel> = {
    guard: highSecurity(),
    scout: lowSecurity(),
    drone: mediumSecurity(),
  };

  const key = String(type).toLowerCase();
  const security = securityByType[key] ?? mediumSecurity();

  return {
    id: 'robot-' + String(type),
    type,
    position: clonePosition(startPos),
    health: 50,
    maxHealth: 50,
    energy: 50,
    maxEnergy: 50,
    securityLevel: security,
  } as unknown as Robot;
}
